import React, { useState, useMemo } from 'react';
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Search,
  Check,
  X,
  RotateCcw,
  SlidersHorizontal,
  Filter
} from 'lucide-react';

export interface ColumnFilterState {
  selectedValues?: string[]; // list of allowed values
  conditionType?: 'none' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  conditionValue?: string;
}

interface ExcelColumnFilterMenuProps {
  colIdx: number;
  colName: string;
  colLetter: string;
  currentFilter?: ColumnFilterState;
  allRows: (string | number)[][];
  onApplyFilter: (colIdx: number, filter: ColumnFilterState | null) => void;
  onSortColumn: (colIdx: number, direction: 'asc' | 'desc') => void;
  onClose: () => void;
}

export default function ExcelColumnFilterMenu({
  colIdx,
  colName,
  colLetter,
  currentFilter,
  allRows,
  onApplyFilter,
  onSortColumn,
  onClose
}: ExcelColumnFilterMenuProps) {
  // Extract unique values with occurrence counts (sampling up to 20,000 rows for 5 lakh safety)
  const uniqueItems = useMemo(() => {
    const counts = new Map<string, number>();
    const maxSample = Math.min(20000, allRows.length);
    for (let i = 0; i < maxSample; i++) {
      const row = allRows[i];
      if (!row) continue;
      const rawVal = row[colIdx];
      const valStr = rawVal === undefined || rawVal === null || rawVal === '' ? '(Blanks)' : String(rawVal);
      counts.set(valStr, (counts.get(valStr) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [allRows, colIdx]);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'values' | 'condition'>('values');
  
  // Selected values set
  const [selectedSet, setSelectedSet] = useState<Set<string>>(() => {
    if (currentFilter?.selectedValues && currentFilter.selectedValues.length > 0) {
      return new Set(currentFilter.selectedValues);
    }
    // Default all selected
    return new Set(uniqueItems.map(u => u.value));
  });

  // Condition filter states
  const [condType, setCondType] = useState<ColumnFilterState['conditionType']>(
    currentFilter?.conditionType || 'none'
  );
  const [condVal, setCondVal] = useState<string>(currentFilter?.conditionValue || '');

  // Filtered distinct items by search term
  const displayedItems = useMemo(() => {
    if (!searchTerm.trim()) return uniqueItems;
    const term = searchTerm.toLowerCase();
    return uniqueItems.filter(item => item.value.toLowerCase().includes(term));
  }, [uniqueItems, searchTerm]);

  const handleSelectAll = () => {
    const next = new Set(selectedSet);
    displayedItems.forEach(item => next.add(item.value));
    setSelectedSet(next);
  };

  const handleClearAll = () => {
    const next = new Set(selectedSet);
    displayedItems.forEach(item => next.delete(item.value));
    setSelectedSet(next);
  };

  const handleToggleItem = (val: string) => {
    const next = new Set(selectedSet);
    if (next.has(val)) {
      next.delete(val);
    } else {
      next.add(val);
    }
    setSelectedSet(next);
  };

  const handleApply = () => {
    const isAllSelected = uniqueItems.every(u => selectedSet.has(u.value));
    const hasCondition = condType && condType !== 'none';

    if (isAllSelected && !hasCondition) {
      // Clear filter
      onApplyFilter(colIdx, null);
    } else {
      onApplyFilter(colIdx, {
        selectedValues: Array.from(selectedSet),
        conditionType: condType,
        conditionValue: condVal
      });
    }
    onClose();
  };

  const handleClearColumnFilter = () => {
    onApplyFilter(colIdx, null);
    onClose();
  };

  return (
    <div 
      className="absolute top-full left-0 mt-1 z-50 w-72 bg-white dark:bg-[#0f172a] rounded-xl shadow-2xl border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 p-3 space-y-3 select-none text-xs font-sans animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2">
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="font-bold text-slate-900 dark:text-white truncate max-w-[170px]" title={colName}>
            {colLetter}: {colName}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Quick Sort Options */}
      <div className="space-y-1 pb-2 border-b border-slate-100 dark:border-zinc-800">
        <button
          onClick={() => {
            onSortColumn(colIdx, 'asc');
            onClose();
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-zinc-300 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors text-left"
        >
          <ArrowDownAZ className="h-4 w-4 text-emerald-600" />
          <span>Sort Ascending (A to Z / 0 to 9)</span>
        </button>
        <button
          onClick={() => {
            onSortColumn(colIdx, 'desc');
            onClose();
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-zinc-300 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors text-left"
        >
          <ArrowUpAZ className="h-4 w-4 text-emerald-600" />
          <span>Sort Descending (Z to A / 9 to 0)</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-200 dark:border-zinc-800 text-[11px] font-semibold">
        <button
          onClick={() => setActiveTab('values')}
          className={`flex-1 py-1.5 text-center border-b-2 transition-colors ${
            activeTab === 'values'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Filter by Values
        </button>
        <button
          onClick={() => setActiveTab('condition')}
          className={`flex-1 py-1.5 text-center border-b-2 transition-colors flex items-center justify-center gap-1 ${
            activeTab === 'condition'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <SlidersHorizontal className="h-3 w-3" />
          <span>By Condition</span>
        </button>
      </div>

      {/* TAB 1: Filter By Values */}
      {activeTab === 'values' && (
        <div className="space-y-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2 top-2" />
            <input
              type="text"
              placeholder="Search distinct values..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-7 pr-6 py-1 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs outline-none focus:border-emerald-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Select / Clear All controls */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 font-medium">
            <button
              onClick={handleSelectAll}
              className="text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Select All
            </button>
            <button
              onClick={handleClearAll}
              className="text-slate-400 hover:text-slate-600 hover:underline"
            >
              Clear All
            </button>
          </div>

          {/* List of distinct checkboxes */}
          <div className="max-h-44 overflow-y-auto space-y-1 pr-1 border border-slate-100 dark:border-zinc-800/80 rounded-lg p-1.5 bg-slate-50/50 dark:bg-zinc-900/40">
            {displayedItems.length === 0 ? (
              <div className="py-4 text-center text-slate-400 text-xs italic">
                No matching values
              </div>
            ) : (
              displayedItems.map((item) => {
                const isChecked = selectedSet.has(item.value);
                return (
                  <label
                    key={item.value}
                    onClick={() => handleToggleItem(item.value)}
                    className="flex items-center justify-between px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by label onClick
                        className="rounded text-emerald-600 cursor-pointer h-3.5 w-3.5"
                      />
                      <span className={`truncate ${item.value === '(Blanks)' ? 'italic text-slate-400' : 'text-slate-800 dark:text-zinc-200'}`}>
                        {item.value}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {item.count}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Filter By Condition */}
      {activeTab === 'condition' && (
        <div className="space-y-2.5 py-1">
          <div>
            <label className="text-[11px] font-semibold block mb-1 text-slate-600 dark:text-zinc-400">
              Filter Rule:
            </label>
            <select
              value={condType}
              onChange={(e: any) => setCondType(e.target.value)}
              className="w-full p-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs outline-none"
            >
              <option value="none">None (Show All)</option>
              <option value="is_empty">Is Empty / Blank</option>
              <option value="is_not_empty">Is Not Empty</option>
              <option value="contains">Text Contains</option>
              <option value="not_contains">Text Does Not Contain</option>
              <option value="starts_with">Text Starts With</option>
              <option value="ends_with">Text Ends With</option>
              <option value="equals">Exact Equals</option>
              <option value="not_equals">Does Not Equal</option>
              <option value="greater_than">Greater Than (&gt;)</option>
              <option value="less_than">Less Than (&lt;)</option>
            </select>
          </div>

          {condType !== 'none' && condType !== 'is_empty' && condType !== 'is_not_empty' && (
            <div>
              <label className="text-[11px] font-semibold block mb-1 text-slate-600 dark:text-zinc-400">
                Value:
              </label>
              <input
                type="text"
                value={condVal}
                onChange={(e) => setCondVal(e.target.value)}
                placeholder="Enter search value..."
                className="w-full p-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs outline-none focus:border-emerald-500"
              />
            </div>
          )}
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800">
        <button
          onClick={handleClearColumnFilter}
          className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-red-500 transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Clear Filter</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-medium text-xs"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
}
