import React, { useState } from 'react';
import {
  MousePointerClick,
  Columns,
  Rows,
  Table,
  Check,
  X,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface ExcelRangeSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  headers: string[];
  totalRows: number;
  onApplySelection: (selection: {
    mode: 'cell' | 'row' | 'column' | 'all';
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
  }) => void;
  getColLetter: (colIdx: number) => string;
}

export default function ExcelRangeSelectModal({
  isOpen,
  onClose,
  headers,
  totalRows,
  onApplySelection,
  getColLetter
}: ExcelRangeSelectModalProps) {
  if (!isOpen) return null;

  const [tab, setTab] = useState<'range' | 'rows' | 'columns' | 'quick'>('range');

  // Range by Coordinate
  const [rangeCoordinate, setRangeCoordinate] = useState('A:E');

  // Row selection
  const [fromRow, setFromRow] = useState<number>(1);
  const [toRow, setToRow] = useState<number>(Math.min(20, totalRows || 20));

  // Column selection
  const [fromColIdx, setFromColIdx] = useState<number>(0);
  const [toColIdx, setToColIdx] = useState<number>(Math.min(4, Math.max(0, headers.length - 1)));
  const [selectedColIndices, setSelectedColIndices] = useState<Set<number>>(
    new Set([0, 1, 2, 3, 4])
  );

  const colLetterToIndex = (letter: string): number => {
    let index = 0;
    const str = letter.toUpperCase().trim();
    for (let i = 0; i < str.length; i++) {
      index = index * 26 + (str.charCodeAt(i) - 64);
    }
    return Math.max(0, index - 1);
  };

  const handleApplyRangeCoordinate = () => {
    const raw = rangeCoordinate.trim().toUpperCase();
    if (!raw) return;

    if (raw === 'ALL' || raw === 'ALL (SHEET)' || raw === '*') {
      onApplySelection({
        mode: 'all',
        startRow: 0,
        endRow: Math.max(0, totalRows - 1),
        startCol: 0,
        endCol: Math.max(0, headers.length - 1)
      });
      onClose();
      return;
    }

    // Column range like A:E or COL A:E or A TO E or A-E
    const colRangeMatch = raw.match(/^(?:COL\s*)?([A-Z]+)\s*(?::|TO|-)\s*([A-Z]+)$/);
    if (colRangeMatch) {
      const c1 = colLetterToIndex(colRangeMatch[1]);
      const c2 = colLetterToIndex(colRangeMatch[2]);
      const sC = Math.max(0, Math.min(c1, c2));
      const eC = Math.min(headers.length - 1, Math.max(c1, c2));

      onApplySelection({
        mode: 'column',
        startRow: 0,
        endRow: Math.max(0, totalRows - 1),
        startCol: sC,
        endCol: eC
      });
      onClose();
      return;
    }

    // Cell Range like A1:E100 or A1 TO E100 or A1-E100
    const rangeMatch = raw.match(/^([A-Z]+)(\d+)\s*(?::|TO|-)\s*([A-Z]+)(\d+)$/);
    if (rangeMatch) {
      const c1 = colLetterToIndex(rangeMatch[1]);
      const r1 = parseInt(rangeMatch[2], 10) - 1;
      const c2 = colLetterToIndex(rangeMatch[3]);
      const r2 = parseInt(rangeMatch[4], 10) - 1;

      onApplySelection({
        mode: 'cell',
        startRow: Math.max(0, Math.min(r1, r2)),
        endRow: Math.min(totalRows - 1, Math.max(r1, r2)),
        startCol: Math.max(0, Math.min(c1, c2)),
        endCol: Math.min(headers.length - 1, Math.max(c1, c2))
      });
      onClose();
      return;
    }

    // Row range like 1:50 or ROW 1:50 or 1 TO 50
    const rowRangeMatch = raw.match(/^(?:ROW\s*)?(\d+)\s*(?::|TO|-)\s*(\d+)$/);
    if (rowRangeMatch) {
      const r1 = parseInt(rowRangeMatch[1], 10) - 1;
      const r2 = parseInt(rowRangeMatch[2], 10) - 1;
      onApplySelection({
        mode: 'row',
        startRow: Math.max(0, Math.min(r1, r2)),
        endRow: Math.min(totalRows - 1, Math.max(r1, r2)),
        startCol: 0,
        endCol: Math.max(0, headers.length - 1)
      });
      onClose();
      return;
    }

    // Single column like COL A or COL E
    const singleColMatch = raw.match(/^(?:COL\s*)([A-Z]+)$/);
    if (singleColMatch) {
      const c = colLetterToIndex(singleColMatch[1]);
      const sC = Math.max(0, Math.min(c, headers.length - 1));
      onApplySelection({
        mode: 'column',
        startRow: 0,
        endRow: Math.max(0, totalRows - 1),
        startCol: sC,
        endCol: sC
      });
      onClose();
      return;
    }

    // Single cell e.g. B5
    const singleMatch = raw.match(/^([A-Z]+)(\d+)$/);
    if (singleMatch) {
      const c = colLetterToIndex(singleMatch[1]);
      const r = parseInt(singleMatch[2], 10) - 1;
      onApplySelection({
        mode: 'cell',
        startRow: Math.max(0, Math.min(r, totalRows - 1)),
        endRow: Math.max(0, Math.min(r, totalRows - 1)),
        startCol: Math.max(0, Math.min(c, headers.length - 1)),
        endCol: Math.max(0, Math.min(c, headers.length - 1))
      });
      onClose();
    }
  };

  const handleApplyRows = () => {
    const sR = Math.max(0, Math.min(fromRow, toRow) - 1);
    const eR = Math.min(totalRows - 1, Math.max(fromRow, toRow) - 1);
    onApplySelection({
      mode: 'row',
      startRow: sR,
      endRow: eR,
      startCol: 0,
      endCol: Math.max(0, headers.length - 1)
    });
    onClose();
  };

  const handleApplyColumns = () => {
    const sC = Math.max(0, Math.min(fromColIdx, toColIdx));
    const eC = Math.min(headers.length - 1, Math.max(fromColIdx, toColIdx));
    onApplySelection({
      mode: 'column',
      startRow: 0,
      endRow: Math.max(0, totalRows - 1),
      startCol: sC,
      endCol: eC
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-zinc-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5 text-slate-800 dark:text-zinc-100 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <MousePointerClick className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Select Rows &amp; Columns (Apne Hisab Se)
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Pick custom ranges, specific rows, or multiple columns across the dataset
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-zinc-900 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setTab('range')}
            className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              tab === 'range'
                ? 'bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-300 shadow-xs font-bold'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
            }`}
          >
            <Table className="h-3.5 w-3.5" />
            <span>Cell Range</span>
          </button>
          <button
            onClick={() => setTab('rows')}
            className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              tab === 'rows'
                ? 'bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-300 shadow-xs font-bold'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
            }`}
          >
            <Rows className="h-3.5 w-3.5" />
            <span>Select Rows</span>
          </button>
          <button
            onClick={() => setTab('columns')}
            className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              tab === 'columns'
                ? 'bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-300 shadow-xs font-bold'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
            }`}
          >
            <Columns className="h-3.5 w-3.5" />
            <span>Columns</span>
          </button>
          <button
            onClick={() => setTab('quick')}
            className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              tab === 'quick'
                ? 'bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-300 shadow-xs font-bold'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Presets</span>
          </button>
        </div>

        {/* TAB 1: Cell Range by Coordinate */}
        {tab === 'range' && (
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">
                Enter Coordinate Range (e.g. A1:D20 or B2:F15):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={rangeCoordinate}
                  onChange={(e) => setRangeCoordinate(e.target.value.toUpperCase())}
                  placeholder="e.g. A1:E10"
                  className="flex-1 p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl font-mono text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="text-slate-400 text-[11px] self-center">Quick picks:</span>
              {['A:E', 'A1:E20', 'A1:D10', 'A1:J10', 'A:J', '1:50'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setRangeCoordinate(preset)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-xs font-semibold transition-colors ${
                    rangeCoordinate === preset
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-zinc-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-slate-700 dark:text-zinc-300'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <button
              onClick={handleApplyRangeCoordinate}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Check className="h-4 w-4" />
              <span>Highlight &amp; Select Range</span>
            </button>
          </div>
        )}

        {/* TAB 2: Specific Rows */}
        {tab === 'rows' && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400 block mb-1">
                  From Row #:
                </label>
                <input
                  type="number"
                  min={1}
                  max={totalRows}
                  value={fromRow}
                  onChange={(e) => setFromRow(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl font-mono text-sm font-bold text-slate-900 dark:text-white outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400 block mb-1">
                  To Row #:
                </label>
                <input
                  type="number"
                  min={1}
                  max={totalRows}
                  value={toRow}
                  onChange={(e) => setToRow(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl font-mono text-sm font-bold text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
              <span>Will select entire rows:</span>
              <strong className="font-mono">
                Rows {Math.min(fromRow, toRow)} to {Math.max(fromRow, toRow)} ({Math.abs(toRow - fromRow) + 1} Rows total)
              </strong>
            </div>

            <button
              onClick={handleApplyRows}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Check className="h-4 w-4" />
              <span>Select Selected Rows</span>
            </button>
          </div>
        )}

        {/* TAB 3: Specific Columns */}
        {tab === 'columns' && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400 block mb-1">
                  From Column:
                </label>
                <select
                  value={fromColIdx}
                  onChange={(e) => setFromColIdx(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none"
                >
                  {headers.map((h, idx) => (
                    <option key={idx} value={idx}>
                      {getColLetter(idx)}: {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400 block mb-1">
                  To Column:
                </label>
                <select
                  value={toColIdx}
                  onChange={(e) => setToColIdx(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none"
                >
                  {headers.map((h, idx) => (
                    <option key={idx} value={idx}>
                      {getColLetter(idx)}: {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl text-xs text-indigo-800 dark:text-indigo-300 flex items-center justify-between">
              <span>Will select columns:</span>
              <strong className="font-mono">
                {getColLetter(Math.min(fromColIdx, toColIdx))} ({headers[Math.min(fromColIdx, toColIdx)]}) to {getColLetter(Math.max(fromColIdx, toColIdx))} ({headers[Math.max(fromColIdx, toColIdx)]})
              </strong>
            </div>

            <button
              onClick={handleApplyColumns}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Check className="h-4 w-4" />
              <span>Select Selected Columns</span>
            </button>
          </div>
        )}

        {/* TAB 4: Quick Presets */}
        {tab === 'quick' && (
          <div className="grid grid-cols-2 gap-2.5 py-1">
            <button
              onClick={() => {
                onApplySelection({
                  mode: 'column',
                  startRow: 0,
                  endRow: totalRows - 1,
                  startCol: 0,
                  endCol: Math.min(4, headers.length - 1)
                });
                onClose();
              }}
              className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-left transition-all group bg-emerald-50/50 dark:bg-emerald-950/20"
            >
              <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-emerald-600 flex items-center justify-between">
                <span>Columns A to E (A:E)</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-600 text-white font-mono font-bold">5 Cols</span>
              </div>
              <div className="text-[11px] text-slate-400">All data across Columns A, B, C, D, and E</div>
            </button>

            <button
              onClick={() => {
                onApplySelection({
                  mode: 'all',
                  startRow: 0,
                  endRow: totalRows - 1,
                  startCol: 0,
                  endCol: headers.length - 1
                });
                onClose();
              }}
              className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-left transition-all group"
            >
              <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-emerald-600">
                Select Entire Sheet (All)
              </div>
              <div className="text-[11px] text-slate-400">All {totalRows.toLocaleString()} rows &amp; all columns</div>
            </button>

            <button
              onClick={() => {
                onApplySelection({
                  mode: 'row',
                  startRow: 0,
                  endRow: Math.min(9, totalRows - 1),
                  startCol: 0,
                  endCol: headers.length - 1
                });
                onClose();
              }}
              className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-left transition-all group"
            >
              <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-emerald-600">
                Top 10 Rows
              </div>
              <div className="text-[11px] text-slate-400">Rows #1 through #10</div>
            </button>

            <button
              onClick={() => {
                onApplySelection({
                  mode: 'row',
                  startRow: 0,
                  endRow: Math.min(99, totalRows - 1),
                  startCol: 0,
                  endCol: headers.length - 1
                });
                onClose();
              }}
              className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-left transition-all group"
            >
              <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-emerald-600">
                Top 100 Rows
              </div>
              <div className="text-[11px] text-slate-400">Rows #1 through #100</div>
            </button>

            <button
              onClick={() => {
                onApplySelection({
                  mode: 'column',
                  startRow: 0,
                  endRow: totalRows - 1,
                  startCol: 0,
                  endCol: Math.min(2, headers.length - 1)
                });
                onClose();
              }}
              className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-left transition-all group"
            >
              <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-emerald-600">
                First 3 Key Columns
              </div>
              <div className="text-[11px] text-slate-400">Columns A, B, and C</div>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
