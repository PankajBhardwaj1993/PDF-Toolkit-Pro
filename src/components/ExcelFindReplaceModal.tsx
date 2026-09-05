import React, { useState, useEffect, useRef } from 'react';
import { Search, Replace, X, ChevronDown, ChevronUp, Check, AlertCircle } from 'lucide-react';

interface ExcelFindReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'find' | 'replace';
  rows: (string | number)[][];
  activeSheetName: string;
  selectedCell: { row: number; col: number };
  onSelectCell: (row: number, col: number) => void;
  onReplaceCell: (row: number, col: number, newValue: string) => void;
  onReplaceAll: (findText: string, replaceText: string, matchCase: boolean, matchEntire: boolean) => number;
  totalColumns: number;
}

export const ExcelFindReplaceModal: React.FC<ExcelFindReplaceModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'find',
  rows,
  activeSheetName,
  selectedCell,
  onSelectCell,
  onReplaceCell,
  onReplaceAll,
  totalColumns
}) => {
  const [activeTab, setActiveTab] = useState<'find' | 'replace'>(initialTab);
  const [findText, setFindText] = useState<string>('');
  const [replaceText, setReplaceText] = useState<string>('');
  const [matchCase, setMatchCase] = useState<boolean>(false);
  const [matchEntire, setMatchEntire] = useState<boolean>(false);
  const [searchScope, setSearchScope] = useState<'sheet' | 'workbook'>('sheet');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [matchCount, setMatchCount] = useState<number>(0);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);

  const findInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        findInputRef.current?.focus();
        findInputRef.current?.select();
      }, 50);
    } else {
      setStatusMsg(null);
    }
  }, [isOpen]);

  // Find all matches in current sheet
  const getAllMatches = () => {
    if (!findText.trim()) return [];
    const matches: Array<{ row: number; col: number; val: string }> = [];
    const query = matchCase ? findText : findText.toLowerCase();

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (!row) continue;
      for (let c = 0; c < Math.min(row.length, totalColumns); c++) {
        const rawVal = row[c];
        if (rawVal === null || rawVal === undefined || rawVal === '') continue;
        const strVal = String(rawVal);
        const targetVal = matchCase ? strVal : strVal.toLowerCase();

        if (matchEntire) {
          if (targetVal === query) {
            matches.push({ row: r, col: c, val: strVal });
          }
        } else {
          if (targetVal.includes(query)) {
            matches.push({ row: r, col: c, val: strVal });
          }
        }
      }
    }
    return matches;
  };

  const handleFindNext = () => {
    if (!findText.trim()) {
      setStatusMsg('Please enter search text.');
      return;
    }
    const matches = getAllMatches();
    if (matches.length === 0) {
      setStatusMsg(`Microsoft Excel cannot find the data you're searching for.`);
      setMatchCount(0);
      return;
    }

    setMatchCount(matches.length);

    // Find next match after currently selected cell
    let nextIdx = matches.findIndex(
      m => m.row > selectedCell.row || (m.row === selectedCell.row && m.col > selectedCell.col)
    );

    if (nextIdx === -1) {
      nextIdx = 0; // wrap around
    }

    setCurrentMatchIndex(nextIdx + 1);
    const target = matches[nextIdx];
    onSelectCell(target.row, target.col);
    setStatusMsg(`Found ${nextIdx + 1} of ${matches.length} matches.`);
  };

  const handleFindPrevious = () => {
    if (!findText.trim()) return;
    const matches = getAllMatches();
    if (matches.length === 0) {
      setStatusMsg(`Cannot find '${findText}' in sheet.`);
      setMatchCount(0);
      return;
    }

    setMatchCount(matches.length);

    let prevIdx = -1;
    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i];
      if (m.row < selectedCell.row || (m.row === selectedCell.row && m.col < selectedCell.col)) {
        prevIdx = i;
        break;
      }
    }

    if (prevIdx === -1) {
      prevIdx = matches.length - 1; // wrap around
    }

    setCurrentMatchIndex(prevIdx + 1);
    const target = matches[prevIdx];
    onSelectCell(target.row, target.col);
    setStatusMsg(`Found ${prevIdx + 1} of ${matches.length} matches.`);
  };

  const handleReplace = () => {
    if (!findText.trim()) return;
    const cellVal = String(rows[selectedCell.row]?.[selectedCell.col] || '');
    const query = matchCase ? findText : findText.toLowerCase();
    const targetVal = matchCase ? cellVal : cellVal.toLowerCase();

    let isMatch = false;
    if (matchEntire) {
      isMatch = targetVal === query;
    } else {
      isMatch = targetVal.includes(query);
    }

    if (isMatch) {
      let newVal = cellVal;
      if (matchEntire) {
        newVal = replaceText;
      } else {
        const regex = new RegExp(escapeRegExp(findText), matchCase ? 'g' : 'gi');
        newVal = cellVal.replace(regex, replaceText);
      }
      onReplaceCell(selectedCell.row, selectedCell.col, newVal);
      setStatusMsg(`Replaced in cell.`);
    }

    // Move to next match
    handleFindNext();
  };

  const handleReplaceAllClick = () => {
    if (!findText.trim()) {
      setStatusMsg('Please enter search text to replace.');
      return;
    }
    const count = onReplaceAll(findText, replaceText, matchCase, matchEntire);
    setStatusMsg(`All done. We made ${count.toLocaleString()} replacement(s).`);
  };

  function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div 
        className="w-full max-w-md bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-150"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleFindNext();
          }
        }}
      >
        {/* Header with MS Excel Tabs */}
        <div className="flex items-center justify-between px-4 pt-3 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('find')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-t-lg transition-colors cursor-pointer border-b-2 ${
                activeTab === 'find'
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-[#0f172a]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-zinc-400'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Find</span>
            </button>
            <button
              onClick={() => setActiveTab('replace')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-t-lg transition-colors cursor-pointer border-b-2 ${
                activeTab === 'replace'
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-[#0f172a]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-zinc-400'
              }`}
            >
              <Replace className="w-3.5 h-3.5" />
              <span>Replace</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4">
          {/* Find input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
              Find what:
            </label>
            <div className="relative">
              <input
                ref={findInputRef}
                type="text"
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                placeholder="Search text, number, or formula..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Replace input (if in replace tab) */}
          {activeTab === 'replace' && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-150">
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Replace with:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  placeholder="Replacement value..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
                />
                <Replace className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>
          )}

          {/* Match Options */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={matchCase}
                onChange={(e) => setMatchCase(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-zinc-700 cursor-pointer"
              />
              <span>Match case</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={matchEntire}
                onChange={(e) => setMatchEntire(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-zinc-700 cursor-pointer"
              />
              <span>Match entire cell</span>
            </label>
          </div>

          {/* Status Message */}
          {statusMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">{statusMsg}</span>
            </div>
          )}
        </div>

        {/* Footer Action Buttons */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-zinc-900/50 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleFindPrevious}
              disabled={!findText.trim()}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-zinc-700 disabled:opacity-40 cursor-pointer"
              title="Find Previous (Shift+Enter)"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={handleFindNext}
              disabled={!findText.trim()}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs disabled:opacity-40 cursor-pointer flex items-center gap-1"
              title="Find Next (Enter)"
            >
              <span>Find Next</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'replace' && (
              <>
                <button
                  onClick={handleReplace}
                  disabled={!findText.trim()}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-zinc-700 disabled:opacity-40 cursor-pointer"
                >
                  Replace
                </button>
                <button
                  onClick={handleReplaceAllClick}
                  disabled={!findText.trim()}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  Replace All
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-zinc-700 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
