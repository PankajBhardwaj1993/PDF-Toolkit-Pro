/**
 * Excel & CSV Web Worker
 * Offloads heavy parsing, big-data generation, filtering, sorting, and export computation
 * from the main UI thread to prevent "Browser not responding" warnings on massive datasets (300k - 500k+ rows).
 */

import * as XLSX from 'xlsx';

export interface WorkerParseRequest {
  type: 'PARSE_FILE';
  payload: {
    fileData: ArrayBuffer;
    fileName: string;
    fileType: string;
  };
}

export interface WorkerGenerateRequest {
  type: 'GENERATE_BIG_DATA';
  payload: {
    targetRows: number;
    datasetType: 'sales' | 'ecommerce' | 'financial' | 'telemetry';
  };
}

export interface WorkerExportRequest {
  type: 'EXPORT_SHEET';
  payload: {
    format: 'xlsx' | 'csv' | 'json';
    sheets: Array<{
      name: string;
      headers: string[];
      rows: (string | number)[][];
    }>;
    fileName: string;
  };
}

export interface WorkerFilterSortRequest {
  type: 'FILTER_SORT';
  payload: {
    rows: (string | number)[][];
    query: string;
    filterColumn: number | 'all';
    sortColumn: number | null;
    sortDirection: 'asc' | 'desc';
  };
}

export type WorkerMessageRequest =
  | WorkerParseRequest
  | WorkerGenerateRequest
  | WorkerExportRequest
  | WorkerFilterSortRequest;

export interface SheetResult {
  id: string;
  name: string;
  columns: string[];
  headers: string[];
  rows: (string | number)[][];
  columnWidths: number[];
}

function getColLetter(index: number): string {
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

// Fast CSV Parser supporting quotes, commas, escapes without freezing UI
function parseCSVInWorker(csvText: string, onProgress?: (pct: number) => void): (string | number)[][] {
  const rows: (string | number)[][] = [];
  let currentRow: (string | number)[] = [];
  let currentVal = '';
  let insideQuotes = false;
  const len = csvText.length;
  let lastReport = 0;

  for (let i = 0; i < len; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      const num = Number(currentVal.trim());
      currentRow.push(currentVal.trim() !== '' && !isNaN(num) ? num : currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \r\n
      }
      const num = Number(currentVal.trim());
      currentRow.push(currentVal.trim() !== '' && !isNaN(num) ? num : currentVal.trim());
      if (currentRow.length > 0 && currentRow.some(c => c !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';

      if (onProgress && i - lastReport > 200000) {
        lastReport = i;
        onProgress(Math.round((i / len) * 100));
      }
    } else {
      currentVal += char;
    }
  }

  if (currentVal.length > 0 || currentRow.length > 0) {
    const num = Number(currentVal.trim());
    currentRow.push(currentVal.trim() !== '' && !isNaN(num) ? num : currentVal.trim());
    if (currentRow.some(c => c !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

self.onmessage = (event: MessageEvent<WorkerMessageRequest>) => {
  const { type, payload } = event.data;

  try {
    if (type === 'PARSE_FILE') {
      const { fileData, fileName } = payload;
      const isCsv = fileName.toLowerCase().endsWith('.csv') || fileName.toLowerCase().endsWith('.tsv');

      if (isCsv) {
        self.postMessage({ type: 'PROGRESS', progress: 20, status: 'Decoding text data in background worker...' });
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(fileData);

        self.postMessage({ type: 'PROGRESS', progress: 40, status: 'Streaming CSV rows into memory...' });
        const rawMatrix = parseCSVInWorker(text, (pct) => {
          self.postMessage({ type: 'PROGRESS', progress: 40 + Math.round(pct * 0.5), status: `Parsing CSV (${pct}%)...` });
        });

        let headers: string[] = [];
        let dataRows: (string | number)[][] = [];

        if (rawMatrix.length > 0) {
          headers = rawMatrix[0].map((h, i) => String(h || `Column_${i + 1}`));
          dataRows = rawMatrix.slice(1);
        } else {
          headers = ['Column_A', 'Column_B', 'Column_C', 'Column_D'];
          dataRows = [];
        }

        const cols = headers.map((_, idx) => getColLetter(idx));
        const sheetResult: SheetResult = {
          id: 'sheet_1',
          name: fileName.replace(/\.[^/.]+$/, '').substring(0, 31) || 'Sheet1',
          columns: cols,
          headers,
          rows: dataRows,
          columnWidths: headers.map(() => 120)
        };

        self.postMessage({
          type: 'PARSE_SUCCESS',
          sheets: [sheetResult],
          totalRows: dataRows.length,
          fileName
        });
        return;
      }

      // XLSX / XLS / Binary spreadsheet
      self.postMessage({ type: 'PROGRESS', progress: 25, status: 'Worker unzipping and parsing XLSX workbook streams...' });
      const uint8 = new Uint8Array(fileData);
      const workbook = XLSX.read(uint8, { type: 'array', cellDates: true, dense: true });

      self.postMessage({ type: 'PROGRESS', progress: 65, status: 'Extracting spreadsheet sheets & matrices...' });

      const sheets: SheetResult[] = workbook.SheetNames.map((sheetName, idx) => {
        const ws = workbook.Sheets[sheetName];
        const rawMatrix: (string | number)[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        let headers: string[] = [];
        let dataRows: (string | number)[][] = [];

        if (rawMatrix.length > 0) {
          headers = rawMatrix[0].map((h, i) => String(h || `Col_${getColLetter(i)}`));
          dataRows = rawMatrix.slice(1);
        } else {
          headers = ['A', 'B', 'C', 'D', 'E'];
          dataRows = [];
        }

        const cols = headers.map((_, colIdx) => getColLetter(colIdx));

        return {
          id: `sheet_${idx + 1}`,
          name: sheetName,
          columns: cols,
          headers,
          rows: dataRows,
          columnWidths: headers.map(() => 120)
        };
      });

      self.postMessage({
        type: 'PARSE_SUCCESS',
        sheets,
        totalRows: sheets.reduce((acc, s) => acc + s.rows.length, 0),
        fileName
      });
      return;
    }

    if (type === 'GENERATE_BIG_DATA') {
      const { targetRows } = payload;
      const regions = ['North India', 'South India', 'West India', 'East India', 'Central India', 'North America', 'EMEA', 'APAC'];
      const categories = ['Electronics', 'Office Supplies', 'Furniture', 'Software & Cloud', 'Hardware', 'Networking', 'Security'];
      const statuses = ['Delivered', 'Shipped', 'Processing', 'In-Transit', 'Verified', 'Completed'];
      const names = [
        'Amit Sharma', 'Priya Patel', 'Rajesh Kumar', 'Sneha Reddy', 'Vikram Singh',
        'Ananya Roy', 'Karan Verma', 'Deepak Mehta', 'Pooja Iyer', 'Rahul Deshmukh',
        'Suresh Nair', 'Neha Gupta', 'Rohan Das', 'Kavita Joshi', 'Manoj Bajpayee',
        'Sunil Gavaskar', 'Ritu Menon', 'Arjun Kapoor', 'Geeta Phogat', 'Naveen Jindal'
      ];

      const CHUNK_SIZE = 50000;
      const generatedRows: (string | number)[][] = [];

      for (let chunkStart = 0; chunkStart < targetRows; chunkStart += CHUNK_SIZE) {
        const currentChunkEnd = Math.min(chunkStart + CHUNK_SIZE, targetRows);

        for (let i = chunkStart; i < currentChunkEnd; i++) {
          const orderId = `ORD-${(1000000 + i).toString()}`;
          const name = names[i % names.length];
          const region = regions[(i * 3 + 1) % regions.length];
          const category = categories[(i * 7 + 2) % categories.length];
          const sku = `SKU-${category.substring(0, 3).toUpperCase()}-${(100 + (i % 899))}`;
          const qty = (i % 20) + 1;
          const unitPrice = ((((i * 137) % 5000) + 20) * 10);
          const discountPct = `${((i % 6) * 5)}%`;
          const totalAmount = Math.round(qty * unitPrice * (1 - (((i % 6) * 5) / 100)));
          const status = statuses[i % statuses.length];

          generatedRows.push([orderId, name, region, category, sku, qty, unitPrice, discountPct, totalAmount, status]);
        }

        const progressPct = Math.round((currentChunkEnd / targetRows) * 100);
        self.postMessage({
          type: 'PROGRESS',
          progress: progressPct,
          status: `Worker generated ${currentChunkEnd.toLocaleString()} of ${targetRows.toLocaleString()} rows (${progressPct}%)...`
        });
      }

      const headers = ['Order_ID', 'Customer_Name', 'Region', 'Category', 'Item_SKU', 'Qty', 'Unit_Price', 'Discount_Pct', 'Total_Amount', 'Status'];
      const cols = headers.map((_, i) => getColLetter(i));

      self.postMessage({
        type: 'GENERATE_SUCCESS',
        sheet: {
          id: 'sheet_big_data',
          name: 'BigData_Sheet',
          columns: cols,
          headers,
          rows: generatedRows,
          columnWidths: [120, 150, 130, 140, 110, 80, 110, 100, 130, 110]
        },
        totalRows: generatedRows.length
      });
      return;
    }

    if (type === 'EXPORT_SHEET') {
      const { format, sheets: exportSheets, fileName } = payload;

      self.postMessage({ type: 'PROGRESS', progress: 30, status: `Compiling ${format.toUpperCase()} binary payload in background...` });

      if (format === 'csv') {
        const active = exportSheets[0];
        const fullData = [active.headers, ...active.rows];
        const ws = XLSX.utils.aoa_to_sheet(fullData);
        const csvStr = XLSX.utils.sheet_to_csv(ws);
        const encoder = new TextEncoder();
        const buffer = encoder.encode(csvStr).buffer;

        (self as any).postMessage({
          type: 'EXPORT_SUCCESS',
          buffer,
          fileName: fileName.endsWith('.csv') ? fileName : `${fileName}.csv`,
          mimeType: 'text/csv;charset=utf-8;'
        }, [buffer]);
        return;
      }

      // XLSX Workbook
      const wb = XLSX.utils.book_new();
      exportSheets.forEach((sh, idx) => {
        (self as any).postMessage({
          type: 'PROGRESS',
          progress: 30 + Math.round((idx / exportSheets.length) * 50),
          status: `Writing Sheet "${sh.name}" (${sh.rows.length.toLocaleString()} rows)...`
        });
        const fullData = [sh.headers, ...sh.rows];
        const ws = XLSX.utils.aoa_to_sheet(fullData);
        XLSX.utils.book_append_sheet(wb, ws, sh.name);
      });

      (self as any).postMessage({ type: 'PROGRESS', progress: 85, status: 'Finalizing compressed XLSX archive...' });
      const outArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

      (self as any).postMessage({
        type: 'EXPORT_SUCCESS',
        buffer: outArray,
        fileName: fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      return;
    }

    if (type === 'FILTER_SORT') {
      const { rows, query, filterColumn, sortColumn, sortDirection } = payload;
      const total = rows.length;
      let indices: number[] = [];

      const cleanQuery = query ? query.toLowerCase().trim() : '';

      for (let i = 0; i < total; i++) {
        const row = rows[i];
        if (!cleanQuery) {
          indices.push(i);
          continue;
        }

        if (filterColumn === 'all') {
          let match = false;
          for (let c = 0; c < row.length; c++) {
            if (String(row[c]).toLowerCase().includes(cleanQuery)) {
              match = true;
              break;
            }
          }
          if (match) indices.push(i);
        } else {
          const val = String(row[filterColumn] ?? '').toLowerCase();
          if (val.includes(cleanQuery)) {
            indices.push(i);
          }
        }
      }

      if (sortColumn !== null) {
        const colIdx = sortColumn;
        const isAsc = sortDirection === 'asc';
        indices.sort((a, b) => {
          const valA = rows[a][colIdx];
          const valB = rows[b][colIdx];

          if (typeof valA === 'number' && typeof valB === 'number') {
            return isAsc ? valA - valB : valB - valA;
          }
          const strA = String(valA ?? '');
          const strB = String(valB ?? '');
          return isAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
        });
      }

      self.postMessage({
        type: 'FILTER_SORT_SUCCESS',
        indices
      });
      return;
    }
  } catch (err: any) {
    self.postMessage({
      type: 'ERROR',
      message: err?.message || 'Unknown Web Worker error occurred'
    });
  }
};
