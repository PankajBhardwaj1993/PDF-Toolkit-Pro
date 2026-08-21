import React, { useEffect, useRef } from 'react';
import {
  Copy,
  Scissors,
  Clipboard,
  Trash2,
  CheckSquare,
  Plus,
  Rows,
  Columns,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sigma,
  Calculator,
  BarChart3,
  Sparkles,
  MessageSquare
} from 'lucide-react';

export interface ContextMenuPosition {
  x: number;
  y: number;
  row: number;
  col: number;
}

export interface ExcelContextMenuProps {
  position: ContextMenuPosition | null;
  onClose: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onClearContents: () => void;
  onSelectAll: () => void;
  onInsertRowAbove?: () => void;
  onInsertRowBelow?: () => void;
  onDeleteRows?: () => void;
  onInsertColLeft?: () => void;
  onInsertColRight?: () => void;
  onDeleteCols?: () => void;
  onToggleBold?: () => void;
  onToggleItalic?: () => void;
  onToggleUnderline?: () => void;
  onSetAlign?: (align: 'left' | 'center' | 'right') => void;
  onAutoSum?: (type: 'SUM' | 'AVERAGE' | 'COUNT') => void;
  onOpenChart?: () => void;
  onAddComment?: () => void;
  rangeLabel?: string;
}

export const ExcelContextMenu: React.FC<ExcelContextMenuProps> = ({
  position,
  onClose,
  onCopy,
  onCut,
  onPaste,
  onClearContents,
  onSelectAll,
  onInsertRowAbove,
  onInsertRowBelow,
  onDeleteRows,
  onInsertColLeft,
  onInsertColRight,
  onDeleteCols,
  onToggleBold,
  onToggleItalic,
  onToggleUnderline,
  onSetAlign,
  onAutoSum,
  onOpenChart,
  onAddComment,
  rangeLabel
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click or escape
  useEffect(() => {
    if (!position) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [position, onClose]);

  if (!position) return null;

  // Calculate adjusted viewport bounds to avoid cutting off
  const menuWidth = 240;
  const menuHeight = 440;
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;

  const left = position.x + menuWidth > screenW ? Math.max(10, screenW - menuWidth - 16) : position.x;
  const top = position.y + menuHeight > screenH ? Math.max(10, screenH - menuHeight - 16) : position.y;

  return (
    <div
      ref={menuRef}
      id="excel-context-menu"
      style={{
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        zIndex: 9999
      }}
      className="w-60 bg-white/95 dark:bg-[#0d1527]/95 backdrop-blur-md rounded-xl border border-slate-200 dark:border-white/15 shadow-2xl py-1.5 text-xs text-slate-800 dark:text-zinc-200 animate-fade-in select-none font-sans"
    >
      {/* Header with Range Info */}
      {rangeLabel && (
        <div className="px-3 py-1.5 mb-1 border-b border-slate-100 dark:border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-zinc-400 bg-slate-50/50 dark:bg-zinc-900/30">
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">{rangeLabel}</span>
          <span className="text-[10px] text-slate-400">Context Menu</span>
        </div>
      )}

      {/* Group 1: Clipboard Actions */}
      <div className="px-1 space-y-0.5">
        <button
          onClick={() => {
            onCut();
            onClose();
          }}
          className="w-full px-2.5 py-1.5 flex items-center justify-between rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-900 dark:hover:text-emerald-200 transition-colors text-left group"
        >
          <div className="flex items-center gap-2.5">
            <Scissors className="h-3.5 w-3.5 text-slate-500 group-hover:text-emerald-600 dark:text-zinc-400" />
            <span>Cut</span>
          </div>
          <kbd className="text-[10px] font-mono text-slate-400 group-hover:text-emerald-700 dark:text-zinc-500">Ctrl+X</kbd>
        </button>

        <button
          onClick={() => {
            onCopy();
            onClose();
          }}
          className="w-full px-2.5 py-1.5 flex items-center justify-between rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-900 dark:hover:text-emerald-200 transition-colors text-left group"
        >
          <div className="flex items-center gap-2.5">
            <Copy className="h-3.5 w-3.5 text-slate-500 group-hover:text-emerald-600 dark:text-zinc-400" />
            <span>Copy</span>
          </div>
          <kbd className="text-[10px] font-mono text-slate-400 group-hover:text-emerald-700 dark:text-zinc-500">Ctrl+C</kbd>
        </button>

        <button
          onClick={() => {
            onPaste();
            onClose();
          }}
          className="w-full px-2.5 py-1.5 flex items-center justify-between rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-900 dark:hover:text-emerald-200 transition-colors text-left group"
        >
          <div className="flex items-center gap-2.5">
            <Clipboard className="h-3.5 w-3.5 text-slate-500 group-hover:text-emerald-600 dark:text-zinc-400" />
            <span>Paste</span>
          </div>
          <kbd className="text-[10px] font-mono text-slate-400 group-hover:text-emerald-700 dark:text-zinc-500">Ctrl+V</kbd>
        </button>
      </div>

      <div className="my-1 border-t border-slate-100 dark:border-white/10" />

      {/* Group 2: Clear & Select All */}
      <div className="px-1 space-y-0.5">
        <button
          onClick={() => {
            onClearContents();
            onClose();
          }}
          className="w-full px-2.5 py-1.5 flex items-center justify-between rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-700 dark:text-zinc-300 hover:text-red-700 dark:hover:text-red-300 transition-colors text-left group"
        >
          <div className="flex items-center gap-2.5">
            <Trash2 className="h-3.5 w-3.5 text-slate-500 group-hover:text-red-600 dark:text-zinc-400" />
            <span className="font-medium">Clear Contents</span>
          </div>
          <kbd className="text-[10px] font-mono text-slate-400 group-hover:text-red-600 dark:text-zinc-500">Del</kbd>
        </button>

        <button
          onClick={() => {
            onSelectAll();
            onClose();
          }}
          className="w-full px-2.5 py-1.5 flex items-center justify-between rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-900 dark:hover:text-emerald-200 transition-colors text-left group"
        >
          <div className="flex items-center gap-2.5">
            <CheckSquare className="h-3.5 w-3.5 text-slate-500 group-hover:text-emerald-600 dark:text-zinc-400" />
            <span>Select All</span>
          </div>
          <kbd className="text-[10px] font-mono text-slate-400 group-hover:text-emerald-700 dark:text-zinc-500">Ctrl+A</kbd>
        </button>
      </div>

      <div className="my-1 border-t border-slate-100 dark:border-white/10" />

      {/* Group 3: Quick Formatting Bar */}
      <div className="px-2 py-1 flex items-center justify-between bg-slate-50/70 dark:bg-zinc-900/40 rounded-lg mx-1 my-0.5">
        <div className="flex items-center gap-1">
          {onToggleBold && (
            <button
              onClick={() => {
                onToggleBold();
                onClose();
              }}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-bold"
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-3.5 w-3.5" />
            </button>
          )}
          {onToggleItalic && (
            <button
              onClick={() => {
                onToggleItalic();
                onClose();
              }}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300"
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-3.5 w-3.5" />
            </button>
          )}
          {onToggleUnderline && (
            <button
              onClick={() => {
                onToggleUnderline();
                onClose();
              }}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300"
              title="Underline (Ctrl+U)"
            >
              <Underline className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="h-3.5 w-[1px] bg-slate-300 dark:bg-zinc-700 mx-1" />

        <div className="flex items-center gap-1">
          {onSetAlign && (
            <>
              <button
                onClick={() => {
                  onSetAlign('left');
                  onClose();
                }}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300"
                title="Align Left"
              >
                <AlignLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  onSetAlign('center');
                  onClose();
                }}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300"
                title="Align Center"
              >
                <AlignCenter className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  onSetAlign('right');
                  onClose();
                }}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300"
                title="Align Right"
              >
                <AlignRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="my-1 border-t border-slate-100 dark:border-white/10" />

      {/* Group 4: Row & Column Structure Operations */}
      <div className="px-1 space-y-0.5">
        {onInsertRowAbove && (
          <button
            onClick={() => {
              onInsertRowAbove();
              onClose();
            }}
            className="w-full px-2.5 py-1.5 flex items-center justify-between rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <Rows className="h-3.5 w-3.5 text-emerald-600" />
              <span>Insert Row Above</span>
            </div>
            <Plus className="h-3 w-3 text-slate-400" />
          </button>
        )}

        {onInsertRowBelow && (
          <button
            onClick={() => {
              onInsertRowBelow();
              onClose();
            }}
            className="w-full px-2.5 py-1.5 flex items-center justify-between rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <Rows className="h-3.5 w-3.5 text-emerald-600" />
              <span>Insert Row Below</span>
            </div>
            <Plus className="h-3 w-3 text-slate-400" />
          </button>
        )}

        {onInsertColLeft && (
          <button
            onClick={() => {
              onInsertColLeft();
              onClose();
            }}
            className="w-full px-2.5 py-1.5 flex items-center justify-between rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <Columns className="h-3.5 w-3.5 text-indigo-600" />
              <span>Insert Column Left</span>
            </div>
            <Plus className="h-3 w-3 text-slate-400" />
          </button>
        )}

        {onDeleteRows && (
          <button
            onClick={() => {
              onDeleteRows();
              onClose();
            }}
            className="w-full px-2.5 py-1.5 flex items-center justify-between rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-700 dark:text-red-400 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <Trash2 className="h-3.5 w-3.5 text-red-600" />
              <span>Delete Row(s)</span>
            </div>
          </button>
        )}
      </div>

      <div className="my-1 border-t border-slate-100 dark:border-white/10" />

      {/* Group 5: Calculations & Analytics */}
      <div className="px-1 space-y-0.5">
        {onAddComment && (
          <button
            onClick={() => {
              onAddComment();
              onClose();
            }}
            className="w-full px-2.5 py-1.5 flex items-center justify-between rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-900 dark:text-amber-200 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
              <span className="font-semibold">Add / Edit Comment</span>
            </div>
          </button>
        )}

        {onAutoSum && (
          <button
            onClick={() => {
              onAutoSum('SUM');
              onClose();
            }}
            className="w-full px-2.5 py-1.5 flex items-center justify-between rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <Sigma className="h-3.5 w-3.5 text-emerald-600" />
              <span className="font-semibold">AutoSum (SUM)</span>
            </div>
          </button>
        )}

        {onOpenChart && (
          <button
            onClick={() => {
              onOpenChart();
              onClose();
            }}
            className="w-full px-2.5 py-1.5 flex items-center justify-between rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <BarChart3 className="h-3.5 w-3.5 text-indigo-600" />
              <span>Insert Visual Chart</span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};

export default ExcelContextMenu;
