/**
 * Advanced Excel Formula Engine
 * Supports standard MS Excel syntax, functions, ranges, and arithmetic expressions.
 */

// Helper to convert Column Letter to 0-based Index (A -> 0, Z -> 25, AA -> 26, etc.)
export function colLetterToIndex(colStr: string): number {
  let index = 0;
  const upper = colStr.trim().toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    index = index * 26 + (upper.charCodeAt(i) - 64);
  }
  return Math.max(0, index - 1);
}

// Helper to convert 0-based Index to Column Letter (0 -> A, 25 -> Z, 26 -> AA, etc.)
export function indexToColLetter(index: number): string {
  let temp = index + 1;
  let letter = '';
  while (temp > 0) {
    const rem = (temp - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    temp = Math.floor((temp - 1) / 26);
  }
  return letter || 'A';
}

// Extract numeric or raw value from cell
function getCellValue(rows: (string | number)[][], r: number, c: number): string | number {
  if (r < 0 || r >= rows.length) return '';
  const row = rows[r];
  if (!row || c < 0 || c >= row.length) return '';
  const val = row[c];
  return val === null || val === undefined ? '' : val;
}

// Get array of values from a range string like "A1:B10" or single cell "A1"
function getRangeValues(rangeStr: string, rows: (string | number)[][]): (string | number)[] {
  const values: (string | number)[] = [];
  const parts = rangeStr.split(':');

  if (parts.length === 1) {
    // Single cell coordinate like "A1" or "C5"
    const coordMatch = parts[0].trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
    if (coordMatch) {
      const col = colLetterToIndex(coordMatch[1]);
      const row = parseInt(coordMatch[2], 10) - 1;
      values.push(getCellValue(rows, row, col));
    }
    return values;
  }

  // Range like "A1:B10" or "A:A"
  const startMatch = parts[0].trim().toUpperCase().match(/^([A-Z]+)(\d*)$/);
  const endMatch = parts[1].trim().toUpperCase().match(/^([A-Z]+)(\d*)$/);

  if (!startMatch || !endMatch) return values;

  const startCol = colLetterToIndex(startMatch[1]);
  const endCol = colLetterToIndex(endMatch[1]);
  const minC = Math.min(startCol, endCol);
  const maxC = Math.max(startCol, endCol);

  const startRow = startMatch[2] ? parseInt(startMatch[2], 10) - 1 : 0;
  const endRow = endMatch[2] ? parseInt(endMatch[2], 10) - 1 : rows.length - 1;
  const minR = Math.max(0, Math.min(startRow, endRow));
  const maxR = Math.min(rows.length - 1, Math.max(startRow, endRow));

  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      values.push(getCellValue(rows, r, c));
    }
  }

  return values;
}

// Convert values to numbers filtering out empty/non-numbers
function getNumericValues(values: (string | number)[]): number[] {
  const nums: number[] = [];
  for (const v of values) {
    if (typeof v === 'number' && !isNaN(v)) {
      nums.push(v);
    } else if (typeof v === 'string' && v.trim() !== '') {
      const parsed = Number(v.replace(/,/g, ''));
      if (!isNaN(parsed)) {
        nums.push(parsed);
      }
    }
  }
  return nums;
}

/**
 * Main evaluateExcelFormula function
 */
export function evaluateExcelFormula(
  formulaStr: string,
  rows: (string | number)[][],
  currentRow?: number,
  currentCol?: number
): string | number {
  if (!formulaStr || typeof formulaStr !== 'string') return formulaStr;
  const trimmed = formulaStr.trim();
  if (!trimmed.startsWith('=')) return formulaStr;

  const expr = trimmed.substring(1).trim();
  if (!expr) return '';

  const upperExpr = expr.toUpperCase();

  try {
    // 1. Check Function Call: e.g. SUM(...), AVERAGE(...), IF(...), etc.
    const funcMatch = expr.match(/^([A-Za-z]+)\(([\s\S]*)\)$/);
    if (funcMatch) {
      const funcName = funcMatch[1].toUpperCase();
      const rawArgs = funcMatch[2];

      // Parse argument strings separated by commas (taking care of quotes)
      const args = splitArgs(rawArgs);

      switch (funcName) {
        // SUM
        case 'SUM': {
          let sum = 0;
          for (const arg of args) {
            const vals = getRangeOrEvaluated(arg, rows);
            for (const n of getNumericValues(vals)) sum += n;
          }
          return sum;
        }

        // AVERAGE / AVG
        case 'AVERAGE':
        case 'AVG': {
          let sum = 0;
          let count = 0;
          for (const arg of args) {
            const vals = getRangeOrEvaluated(arg, rows);
            for (const n of getNumericValues(vals)) {
              sum += n;
              count++;
            }
          }
          return count > 0 ? parseFloat((sum / count).toFixed(4)) : 0;
        }

        // COUNT (numeric cells only)
        case 'COUNT': {
          let count = 0;
          for (const arg of args) {
            const vals = getRangeOrEvaluated(arg, rows);
            count += getNumericValues(vals).length;
          }
          return count;
        }

        // COUNTA (non-empty cells)
        case 'COUNTA': {
          let count = 0;
          for (const arg of args) {
            const vals = getRangeOrEvaluated(arg, rows);
            for (const v of vals) {
              if (v !== '' && v !== null && v !== undefined) count++;
            }
          }
          return count;
        }

        // MIN
        case 'MIN': {
          let min = Infinity;
          for (const arg of args) {
            const vals = getRangeOrEvaluated(arg, rows);
            for (const n of getNumericValues(vals)) {
              if (n < min) min = n;
            }
          }
          return min === Infinity ? 0 : min;
        }

        // MAX
        case 'MAX': {
          let max = -Infinity;
          for (const arg of args) {
            const vals = getRangeOrEvaluated(arg, rows);
            for (const n of getNumericValues(vals)) {
              if (n > max) max = n;
            }
          }
          return max === -Infinity ? 0 : max;
        }

        // PRODUCT / MULTIPLY
        case 'PRODUCT': {
          let prod = 1;
          let hasAny = false;
          for (const arg of args) {
            const vals = getRangeOrEvaluated(arg, rows);
            for (const n of getNumericValues(vals)) {
              prod *= n;
              hasAny = true;
            }
          }
          return hasAny ? prod : 0;
        }

        // MEDIAN
        case 'MEDIAN': {
          const nums: number[] = [];
          for (const arg of args) {
            const vals = getRangeOrEvaluated(arg, rows);
            nums.push(...getNumericValues(vals));
          }
          if (nums.length === 0) return 0;
          nums.sort((a, b) => a - b);
          const mid = Math.floor(nums.length / 2);
          return nums.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
        }

        // ROUND
        case 'ROUND': {
          const val = Number(evaluateExcelFormula('=' + args[0], rows));
          const decimals = args[1] ? Number(evaluateExcelFormula('=' + args[1], rows)) : 0;
          if (isNaN(val)) return 0;
          const factor = Math.pow(10, isNaN(decimals) ? 0 : decimals);
          return Math.round(val * factor) / factor;
        }

        // INT / FLOOR
        case 'INT': {
          const val = Number(evaluateExcelFormula('=' + args[0], rows));
          return isNaN(val) ? 0 : Math.floor(val);
        }

        // ABS
        case 'ABS': {
          const val = Number(evaluateExcelFormula('=' + args[0], rows));
          return isNaN(val) ? 0 : Math.abs(val);
        }

        // SQRT
        case 'SQRT': {
          const val = Number(evaluateExcelFormula('=' + args[0], rows));
          return isNaN(val) || val < 0 ? '#NUM!' : Math.sqrt(val);
        }

        // POWER
        case 'POWER': {
          const base = Number(evaluateExcelFormula('=' + args[0], rows));
          const exp = Number(evaluateExcelFormula('=' + (args[1] || '1'), rows));
          return Math.pow(base, exp);
        }

        // MOD
        case 'MOD': {
          const n = Number(evaluateExcelFormula('=' + args[0], rows));
          const d = Number(evaluateExcelFormula('=' + args[1], rows));
          return d === 0 ? '#DIV/0!' : n % d;
        }

        // IF
        case 'IF': {
          const conditionStr = args[0] || 'FALSE';
          const trueVal = args[1] !== undefined ? evaluateExcelFormula('=' + args[1], rows) : 'TRUE';
          const falseVal = args[2] !== undefined ? evaluateExcelFormula('=' + args[2], rows) : 'FALSE';

          const isConditionTrue = evaluateCondition(conditionStr, rows);
          return isConditionTrue ? stripQuotes(trueVal) : stripQuotes(falseVal);
        }

        // CONCAT / CONCATENATE
        case 'CONCAT':
        case 'CONCATENATE': {
          let str = '';
          for (const arg of args) {
            const vals = getRangeOrEvaluated(arg, rows);
            for (const v of vals) str += String(v);
          }
          return str;
        }

        // TRIM
        case 'TRIM': {
          const val = String(evaluateExcelFormula('=' + args[0], rows));
          return val.trim();
        }

        // UPPER
        case 'UPPER': {
          const val = String(evaluateExcelFormula('=' + args[0], rows));
          return val.toUpperCase();
        }

        // LOWER
        case 'LOWER': {
          const val = String(evaluateExcelFormula('=' + args[0], rows));
          return val.toLowerCase();
        }

        // PROPER
        case 'PROPER': {
          const val = String(evaluateExcelFormula('=' + args[0], rows));
          return val.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
        }

        // LEN
        case 'LEN': {
          const val = String(evaluateExcelFormula('=' + args[0], rows));
          return val.length;
        }

        // LEFT
        case 'LEFT': {
          const val = String(evaluateExcelFormula('=' + args[0], rows));
          const count = args[1] ? Number(evaluateExcelFormula('=' + args[1], rows)) : 1;
          return val.substring(0, Math.max(0, count));
        }

        // RIGHT
        case 'RIGHT': {
          const val = String(evaluateExcelFormula('=' + args[0], rows));
          const count = args[1] ? Number(evaluateExcelFormula('=' + args[1], rows)) : 1;
          return val.substring(Math.max(0, val.length - count));
        }

        // MID
        case 'MID': {
          const val = String(evaluateExcelFormula('=' + args[0], rows));
          const start = args[1] ? Number(evaluateExcelFormula('=' + args[1], rows)) : 1;
          const length = args[2] ? Number(evaluateExcelFormula('=' + args[2], rows)) : val.length;
          return val.substring(Math.max(0, start - 1), Math.max(0, start - 1) + length);
        }

        // TODAY / NOW
        case 'TODAY': {
          return new Date().toISOString().split('T')[0];
        }
        case 'NOW': {
          const now = new Date();
          return now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
        }
      }
    }

    // 2. Direct Cell Reference: e.g. =A1, =B5
    const directCellMatch = expr.match(/^([A-Za-z]+)(\d+)$/);
    if (directCellMatch) {
      const col = colLetterToIndex(directCellMatch[1]);
      const row = parseInt(directCellMatch[2], 10) - 1;
      return getCellValue(rows, row, col);
    }

    // 3. Mathematical / Arithmetic Expression with Cell References: e.g. =A1+B1, =(A1*2)+C3
    // Replace cell references (like A1, B2, AA10) with their evaluated numeric or string values
    const sanitizedExpr = expr.replace(/\b([A-Za-z]+)(\d+)\b/g, (_, colStr, rowStr) => {
      const c = colLetterToIndex(colStr);
      const r = parseInt(rowStr, 10) - 1;
      const v = getCellValue(rows, r, c);
      const num = Number(v);
      return isNaN(num) ? '0' : String(num);
    });

    // Replace '^' with '**' for powers
    const powerAdjusted = sanitizedExpr.replace(/\^/g, '**');

    // Safely evaluate simple math expression
    if (/^[0-9+\-*/().%*\s]+$/.test(powerAdjusted)) {
      // Handle percentage e.g. 50% -> 0.5
      const pctAdjusted = powerAdjusted.replace(/(\d+(\.\d+)?)%/g, '($1/100)');
      // eslint-disable-next-line no-new-func
      const result = Function(`'use strict'; return (${pctAdjusted})`)();
      if (typeof result === 'number') {
        return isNaN(result) || !isFinite(result) ? '#DIV/0!' : parseFloat(result.toFixed(6));
      }
    }

    return formulaStr;
  } catch (err) {
    return '#ERROR!';
  }
}

// Split arguments by comma while respecting quotes
function splitArgs(raw: string): string[] {
  const args: string[] = [];
  let current = '';
  let inQuotes = false;
  let depth = 0;

  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (char === '"') inQuotes = !inQuotes;
    if (!inQuotes) {
      if (char === '(') depth++;
      else if (char === ')') depth--;
      else if (char === ',' && depth === 0) {
        args.push(current.trim());
        current = '';
        continue;
      }
    }
    current += char;
  }
  if (current.trim()) args.push(current.trim());
  return args;
}

// Extract range or single value from argument
function getRangeOrEvaluated(arg: string, rows: (string | number)[][]): (string | number)[] {
  const trimmed = arg.trim();
  if (trimmed.includes(':')) {
    return getRangeValues(trimmed, rows);
  }
  const singleCell = trimmed.match(/^([A-Za-z]+)(\d+)$/);
  if (singleCell) {
    const col = colLetterToIndex(singleCell[1]);
    const row = parseInt(singleCell[2], 10) - 1;
    return [getCellValue(rows, row, col)];
  }
  const evalResult = evaluateExcelFormula('=' + trimmed, rows);
  return [evalResult];
}

// Evaluate condition for IF formula e.g. "A1 > 10" or "B2 == 'Passed'"
function evaluateCondition(conditionStr: string, rows: (string | number)[][]): boolean {
  try {
    const resolved = conditionStr.replace(/\b([A-Za-z]+)(\d+)\b/g, (_, colStr, rowStr) => {
      const c = colLetterToIndex(colStr);
      const r = parseInt(rowStr, 10) - 1;
      const v = getCellValue(rows, r, c);
      if (typeof v === 'string') {
        const num = Number(v);
        return isNaN(num) ? JSON.stringify(v) : String(num);
      }
      return String(v);
    });

    // Replace single '=' with '===' if not part of '<=', '>=', '!=', '<>'
    let jsCond = resolved
      .replace(/<>/g, '!==')
      .replace(/(?<![<>=!])=(?![=])/g, '===');

    // eslint-disable-next-line no-new-func
    return Boolean(Function(`'use strict'; return (${jsCond})`)());
  } catch {
    return false;
  }
}

function stripQuotes(val: any): string | number {
  if (typeof val === 'string') {
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      return val.substring(1, val.length - 1);
    }
  }
  return val;
}
