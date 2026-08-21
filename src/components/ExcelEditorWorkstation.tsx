import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { SpreadsheetWorkerService } from '../services/spreadsheetWorkerService';
import ExcelColumnFilterMenu, { ColumnFilterState } from './ExcelColumnFilterMenu';
import ExcelRangeSelectModal from './ExcelRangeSelectModal';
import ExcelShortcutsModal from './ExcelShortcutsModal';
import { ExcelFindReplaceModal } from './ExcelFindReplaceModal';
import ExcelContextMenu, { ContextMenuPosition } from './ExcelContextMenu';
import { evaluateExcelFormula } from '../utils/excelFormulaEngine';
import {
  FileSpreadsheet,
  FilePlus,
  Upload,
  Download,
  Search,
  Plus,
  Trash2,
  Table as TableIcon,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Sliders,
  Filter,
  ArrowUpDown,
  RefreshCw,
  Sparkles,
  ChevronDown,
  Check,
  X,
  ArrowLeft,
  Copy,
  Scissors,
  Clipboard,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Calculator,
  Sigma,
  Layers,
  Eye,
  Maximize2,
  Minimize2,
  FileText,
  FileCode,
  FileArchive,
  FolderOpen,
  Save,
  HelpCircle,
  Cpu,
  Zap,
  Activity,
  Grid,
  CheckSquare,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Database,
  Share2,
  MessageSquare,
  Printer,
  Edit3,
  MousePointerClick,
  Columns,
  Rows,
  SlidersHorizontal,
  RotateCcw,
  Palette,
  PaintBucket,
  Type,
  Undo,
  Redo,
  Percent,
  DollarSign,
  Keyboard,
  TableProperties,
  ClipboardList,
  Image as ImageIcon,
  Shapes,
  LineChart,
  BarChart,
  BarChart2,
  Link as LinkIcon,
  MessageSquarePlus,
  Square,
  Clock,
  Tag,
  MoreHorizontal,
  Cloud
} from 'lucide-react';

interface ExcelEditorWorkstationProps {
  onAddRecentFile?: (file: { name: string; size: string; type: string; toolUsed: string }) => void;
  user?: any;
  onBackToTools?: () => void;
}

export interface MergeInfo {
  startRow: number;
  startCol: number;
  rowSpan: number;
  colSpan: number;
}

interface SheetData {
  id: string;
  name: string;
  columns: string[]; // e.g. ['A', 'B', 'C', ...]
  headers: string[]; // Custom header names
  rows: (string | number)[][]; // Matrix of cell values
  columnWidths: number[];
  rowHeights?: number[];
  cellStyles: Record<string, CellStyle>; // key: 'row_col'
  mergedCells?: Record<string, MergeInfo>; // key: 'startRow_startCol'
}

interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  align?: 'left' | 'center' | 'right';
  bg?: string;
  backgroundColor?: string;
  color?: string;
  textColor?: string;
  format?: 'general' | 'currency_usd' | 'currency_inr' | 'percent' | 'number' | 'date';
  border?: boolean;
  borderTop?: boolean;
  borderBottom?: boolean | 'double' | 'thick';
  borderLeft?: boolean;
  borderRight?: boolean;
  borderStyle?: 'all' | 'outside' | 'thick_outside' | 'bottom' | 'top' | 'left' | 'right' | 'top_bottom' | 'double_bottom' | 'none';
  comment?: string;
}

const ROW_HEIGHT = 28;
const HEADER_HEIGHT = 34;
const DEFAULT_COL_WIDTH = 120;
const VISIBLE_OVERSCAN = 14;

const COLORS = ['#107c41', '#2563eb', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

const AUTOSAVE_STORAGE_KEY = 'excel_pro_workstation_autosave_v2';

interface AutoSaveData {
  version: number;
  timestamp: number;
  sheets: SheetData[];
  activeSheetIndex: number;
  namedRanges?: Array<{ name: string; range: string; sheet: string; value: string }>;
  sheetTheme?: 'excel_green' | 'dark' | 'slate' | 'blue';
}

function loadAutoSavedSpreadsheet(): AutoSaveData | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.sheets) && parsed.sheets.length > 0) {
      return parsed as AutoSaveData;
    }
  } catch (e) {
    console.warn('Failed to load auto-saved spreadsheet from localStorage:', e);
  }
  return null;
}

export default function ExcelEditorWorkstation({
  onAddRecentFile,
  user,
  onBackToTools
}: ExcelEditorWorkstationProps) {
  // Restore initial AutoSave data if available in localStorage
  const initialAutoSave = useMemo(() => loadAutoSavedSpreadsheet(), []);

  // Ribbon Tab
  const [activeRibbonTab, setActiveRibbonTab] = useState<'home' | 'insert' | 'formulas' | 'data' | 'view' | 'file'>('home');
  
  // Worksheets - Default blank spreadsheet or restored from localStorage auto-save
  const [sheets, setSheets] = useState<SheetData[]>(() => {
    if (initialAutoSave?.sheets && initialAutoSave.sheets.length > 0) {
      return initialAutoSave.sheets;
    }
    return [
      {
        id: 'sheet_1',
        name: 'Sheet1',
        columns: Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)),
        headers: Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)),
        rows: Array.from({ length: 100 }, () => Array(26).fill('')),
        columnWidths: Array(26).fill(DEFAULT_COL_WIDTH),
        cellStyles: {}
      }
    ];
  });

  const [activeSheetIndex, setActiveSheetIndex] = useState<number>(() => {
    if (initialAutoSave && typeof initialAutoSave.activeSheetIndex === 'number') {
      return Math.max(0, Math.min(initialAutoSave.activeSheetIndex, (initialAutoSave.sheets?.length || 1) - 1));
    }
    return 0;
  });

  // Auto-Save Management State
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(true);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error' | 'disabled'>('saved');
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<Date | null>(() => initialAutoSave ? new Date(initialAutoSave.timestamp) : new Date());
  const currentSheet = sheets[activeSheetIndex] || sheets[0];

  const commitCellValueRef = useRef<(val: string) => void>(() => {});
  const exportXLSXRef = useRef<() => void>(() => {});
  const addSheetRef = useRef<() => void>(() => {});

  // Selection & Editing - Real Excel Range & Mode Selection
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  const [selectionRange, setSelectionRange] = useState<{
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
  }>({ startRow: 0, endRow: 0, startCol: 0, endCol: 0 });
  const [selectionMode, setSelectionMode] = useState<'cell' | 'row' | 'column' | 'all'>('cell');
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  const [selectionOrigin, setSelectionOrigin] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  const [isFilling, setIsFilling] = useState<boolean>(false);
  const fillSourceRangeRef = useRef<{ startRow: number; endRow: number; startCol: number; endCol: number }>({ startRow: 0, endRow: 0, startCol: 0, endCol: 0 });

  // Custom Coordinate Input inside Name Box
  const [isEditingCoordinate, setIsEditingCoordinate] = useState<boolean>(false);
  const [coordinateInputValue, setCoordinateInputValue] = useState<string>('A1');

  // Custom Range Select Modal State
  const [showRangeSelectModal, setShowRangeSelectModal] = useState<boolean>(false);

  // Right-Click Spreadsheet Context Menu State
  const [contextMenuPos, setContextMenuPos] = useState<ContextMenuPosition | null>(null);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editValue, setEditValue] = useState<string>('');
  const [formulaInput, setFormulaInput] = useState<string>('');
  const [jumpToRowInput, setJumpToRowInput] = useState<string>('');

  // Scroll Viewport Virtualization
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [viewportHeight, setViewportHeight] = useState<number>(500);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dedicated Web Worker Service
  const workerServiceRef = useRef<SpreadsheetWorkerService | null>(null);

  useEffect(() => {
    workerServiceRef.current = new SpreadsheetWorkerService();
    return () => {
      workerServiceRef.current?.terminate();
      workerServiceRef.current = null;
    };
  }, []);

  // Big Data Generation & Processing State
  const [isGeneratingData, setIsGeneratingData] = useState<boolean>(false);
  const [genProgress, setGenProgress] = useState<number>(0);
  const [genStatusText, setGenStatusText] = useState<string>('');
  
  // Sheet-Wide Interactive Filtering System
  const [isFilterActive, setIsFilterActive] = useState<boolean>(true); // Active filter mode
  const [activeFilterCol, setActiveFilterCol] = useState<number | null>(null); // Which header dropdown is open
  const [columnFilters, setColumnFilters] = useState<Record<number, ColumnFilterState>>({});
  
  // Global Search & Sort
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Styling options for Home tab
  const [fontSize, setFontSize] = useState<number>(11);
  const [fontFamily, setFontFamily] = useState<string>('Calibri');
  const [currentFormat, setCurrentFormat] = useState<'general' | 'currency_inr' | 'currency_usd' | 'percent' | 'number'>('general');
  const [fillColor, setFillColor] = useState<string>('#e2e8f0');
  const [textColor, setTextColor] = useState<string>('#0f172a');
  const [showBorderDropdown, setShowBorderDropdown] = useState<boolean>(false);

  const handleSetCellBackground = (color: string) => {
    pushUndoState();
    const { startRow, endRow, startCol, endCol } = selectionRange;
    const minR = Math.min(startRow, endRow);
    const maxR = Math.max(startRow, endRow);
    const minC = Math.min(startCol, endCol);
    const maxC = Math.max(startCol, endCol);

    setSheets(prev => {
      const next = [...prev];
      const sh = { ...next[activeSheetIndex] };
      const newStyles = { ...(sh.cellStyles || {}) };

      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const key = `${r}_${c}`;
          newStyles[key] = {
            ...(newStyles[key] || {}),
            backgroundColor: color
          };
        }
      }

      sh.cellStyles = newStyles;
      next[activeSheetIndex] = sh;
      return next;
    });
    setStatusMessage(`Applied background color to selected range.`);
  };

  // Chart & Analytics modal
  const [showChartModal, setShowChartModal] = useState<boolean>(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [showCommentModal, setShowCommentModal] = useState<boolean>(false);
  const [activeCommentText, setActiveCommentText] = useState<string>('');
  const [commentTargetCell, setCommentTargetCell] = useState<{ row: number; col: number } | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'area'>('bar');
  const [chartXCol, setChartXCol] = useState<number>(2); // e.g. Region
  const [chartYCol, setChartYCol] = useState<number>(8); // e.g. Total_Amount

  // Insert Tab Options State & Modals
  const [openInsertDropdown, setOpenInsertDropdown] = useState<'pivottable' | 'forms' | 'pictures' | 'shapes' | null>(null);
  const [showPivotModal, setShowPivotModal] = useState<boolean>(false);
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [formInputRow, setFormInputRow] = useState<Record<string, string>>({});

  // Formulas Tab Options State & Modals
  const [openFormulasDropdown, setOpenFormulasDropdown] = useState<
    'autosum' | 'financial' | 'logical' | 'text' | 'datetime' | 'lookup' | 'math' | 'more' | 'calcOptions' | null
  >(null);
  const [showInsertFunctionModal, setShowInsertFunctionModal] = useState<boolean>(false);
  const [showNameManagerModal, setShowNameManagerModal] = useState<boolean>(false);
  const [showFormulae, setShowFormulae] = useState<boolean>(false);
  const [calcMode, setCalcMode] = useState<'Automatic' | 'Automatic Except Data Tables' | 'Manual'>('Automatic');
  const [functionSearchQuery, setFunctionSearchQuery] = useState<string>('');
  const [selectedFunctionCategory, setSelectedFunctionCategory] = useState<string>('All');

  const [namedRanges, setNamedRanges] = useState<Array<{ name: string; range: string; sheet: string; value: string }>>(() => {
    if (initialAutoSave?.namedRanges && Array.isArray(initialAutoSave.namedRanges) && initialAutoSave.namedRanges.length > 0) {
      return initialAutoSave.namedRanges;
    }
    return [
      { name: 'Total_Sales', range: 'I2:I100', sheet: 'Sheet1', value: '₹1,250,400' },
      { name: 'Tax_Percentage', range: 'B1', sheet: 'Sheet1', value: '18%' },
      { name: 'Average_Price', range: 'H2:H100', sheet: 'Sheet1', value: '₹14,250' }
    ];
  });
  const [newRangeName, setNewRangeName] = useState<string>('');
  const [newRangeRef, setNewRangeRef] = useState<string>('');

  const handleInsertFunctionFormula = (funcName: string, defaultArgs?: string) => {
    pushUndoState();
    const { row, col } = selectedCell;
    const { startRow, endRow, startCol, endCol } = selectionRange;

    let formulaStr = '';
    if (defaultArgs) {
      formulaStr = `=${funcName}(${defaultArgs})`;
    } else {
      const minR = Math.min(startRow, endRow);
      const maxR = Math.max(startRow, endRow);
      const minC = Math.min(startCol, endCol);
      const maxC = Math.max(startCol, endCol);

      if (minR !== maxR || minC !== maxC) {
        const rangeStr = `${getColLetter(minC)}${minR + 1}:${getColLetter(maxC)}${maxR + 1}`;
        formulaStr = `=${funcName}(${rangeStr})`;
      } else {
        if (row > 0) {
          const topRange = `${getColLetter(col)}1:${getColLetter(col)}${row}`;
          formulaStr = `=${funcName}(${topRange})`;
        } else {
          formulaStr = `=${funcName}()`;
        }
      }
    }

    setSheets(prev => {
      const next = [...prev];
      const sh = { ...next[activeSheetIndex] };
      const newRows = sh.rows.map(r => [...r]);
      newRows[row][col] = formulaStr;
      sh.rows = newRows;
      next[activeSheetIndex] = sh;
      return next;
    });

    setFormulaInput(formulaStr);
    setStatusMessage(`Inserted ${formulaStr} into cell ${getColLetter(col)}${row + 1}`);
    setOpenFormulasDropdown(null);
    setShowInsertFunctionModal(false);
  };

  const handleInsertTable = () => {
    pushUndoState();
    const { startRow, endRow, startCol, endCol } = selectionRange;
    const minR = Math.min(startRow, endRow);
    const maxR = Math.max(startRow, endRow);
    const minC = Math.min(startCol, endCol);
    const maxC = Math.max(startCol, endCol);

    setSheets(prev => {
      const next = [...prev];
      const sh = { ...next[activeSheetIndex] };
      const newStyles = { ...(sh.cellStyles || {}) };

      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const key = `${r}_${c}`;
          if (r === minR) {
            newStyles[key] = {
              ...(newStyles[key] || {}),
              bg: '#1d4ed8',
              color: '#ffffff',
              bold: true,
              align: 'center'
            };
          } else {
            newStyles[key] = {
              ...(newStyles[key] || {}),
              bg: (r % 2 === 0) ? '#f8fafc' : '#ffffff',
              border: true
            };
          }
        }
      }

      sh.cellStyles = newStyles;
      next[activeSheetIndex] = sh;
      return next;
    });

    setIsFilterActive(true);
    setStatusMessage(`Formatted range ${getColLetter(minC)}${minR + 1}:${getColLetter(maxC)}${maxR + 1} as Table.`);
  };

  const handleInsertCheckbox = () => {
    pushUndoState();
    const { row, col } = selectedCell;
    setSheets(prev => {
      const next = [...prev];
      const sh = { ...next[activeSheetIndex] };
      const newRows = sh.rows.map(r => [...r]);
      const currentVal = String(newRows[row][col] || '');
      newRows[row][col] = currentVal.includes('☑') ? '☐' : '☑';
      sh.rows = newRows;
      next[activeSheetIndex] = sh;
      return next;
    });
    setStatusMessage(`Inserted checkbox into cell ${getColLetter(col)}${row + 1}`);
  };

  const handleInsertSlicer = () => {
    setIsFilterActive(prev => !prev);
    setStatusMessage(`Slicer Filter toggled ${!isFilterActive ? 'ON' : 'OFF'}.`);
  };

  const handleInsertLink = () => {
    const url = prompt('Enter link URL (e.g., https://example.com or sheet reference):', 'https://');
    if (!url) return;
    pushUndoState();
    const { row, col } = selectedCell;
    setSheets(prev => {
      const next = [...prev];
      const sh = { ...next[activeSheetIndex] };
      const newRows = sh.rows.map(r => [...r]);
      const newStyles = { ...(sh.cellStyles || {}) };
      const key = `${row}_${col}`;

      if (!newRows[row][col]) {
        newRows[row][col] = url;
      }
      newStyles[key] = {
        ...(newStyles[key] || {}),
        color: '#2563eb',
        underline: true
      };

      sh.rows = newRows;
      sh.cellStyles = newStyles;
      next[activeSheetIndex] = sh;
      return next;
    });
    setStatusMessage(`Inserted hyperlink into cell ${getColLetter(col)}${row + 1}`);
  };

  const handleInsertTextBox = () => {
    const txt = prompt('Enter Text Box note:', 'Note / Text Box');
    if (!txt) return;
    pushUndoState();
    const { row, col } = selectedCell;
    setSheets(prev => {
      const next = [...prev];
      const sh = { ...next[activeSheetIndex] };
      const newRows = sh.rows.map(r => [...r]);
      const newStyles = { ...(sh.cellStyles || {}) };
      const key = `${row}_${col}`;

      newRows[row][col] = `🔲 ${txt}`;
      newStyles[key] = {
        ...(newStyles[key] || {}),
        bg: '#fef3c7',
        color: '#78350f',
        border: true,
        bold: true
      };

      sh.rows = newRows;
      sh.cellStyles = newStyles;
      next[activeSheetIndex] = sh;
      return next;
    });
    setStatusMessage(`Inserted Text Box note into cell ${getColLetter(col)}${row + 1}`);
  };

  const handleInsertShape = (shapeName: string) => {
    pushUndoState();
    const { row, col } = selectedCell;
    setSheets(prev => {
      const next = [...prev];
      const sh = { ...next[activeSheetIndex] };
      const newRows = sh.rows.map(r => [...r]);
      const newStyles = { ...(sh.cellStyles || {}) };
      const key = `${row}_${col}`;

      const symbol = shapeName === 'Circle' ? '⭕' : shapeName === 'Right Arrow' ? '➔' : shapeName === 'Callout Box' ? '💬' : '🟦';
      newRows[row][col] = `${symbol} ${shapeName}`;
      newStyles[key] = {
        ...(newStyles[key] || {}),
        bg: '#e0f2fe',
        color: '#0369a1',
        bold: true,
        align: 'center'
      };

      sh.rows = newRows;
      sh.cellStyles = newStyles;
      next[activeSheetIndex] = sh;
      return next;
    });
    setStatusMessage(`Inserted ${shapeName} into cell ${getColLetter(col)}${row + 1}`);
  };

  const handleGeneratePivotTable = () => {
    pushUndoState();
    const newSheetName = `Pivot_Summary_${sheets.length + 1}`;
    
    const categoryMap: Record<string, number> = {};
    currentSheet.rows.forEach(r => {
      const cat = String(r[0] || 'Uncategorized').trim();
      if (!cat) return;
      const num = parseFloat(String(r[1] || r[2] || r[8] || '0').replace(/[^0-9.-]/g, '')) || 0;
      categoryMap[cat] = (categoryMap[cat] || 0) + num;
    });

    const pivotRows: string[][] = [
      ['Row Labels', 'Sum of Values']
    ];
    let grandTotal = 0;
    Object.entries(categoryMap).forEach(([cat, val]) => {
      pivotRows.push([cat, val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })]);
      grandTotal += val;
    });
    pivotRows.push(['Grand Total', grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })]);

    const newPivotSheet: SheetData = {
      id: `sheet_pivot_${Date.now()}`,
      name: newSheetName,
      columns: ['A', 'B', 'C', 'D'],
      headers: ['A', 'B', 'C', 'D'],
      rows: pivotRows,
      columnWidths: [200, 160, 100, 100],
      cellStyles: {
        '0_0': { bg: '#0f766e', color: '#ffffff', bold: true },
        '0_1': { bg: '#0f766e', color: '#ffffff', bold: true },
        [`${pivotRows.length - 1}_0`]: { bg: '#f1f5f9', bold: true },
        [`${pivotRows.length - 1}_1`]: { bg: '#f1f5f9', bold: true }
      }
    };

    setSheets(prev => [...prev, newPivotSheet]);
    setActiveSheetIndex(sheets.length);
    setShowPivotModal(false);
    setStatusMessage(`Created PivotTable sheet '${newSheetName}'!`);
  };

  // View Settings
  const [showGridlines, setShowGridlines] = useState<boolean>(true);
  const [showFormulaBar, setShowFormulaBar] = useState<boolean>(true);
  const [showHeadings, setShowHeadings] = useState<boolean>(true);
  const [freezeHeader, setFreezeHeader] = useState<boolean>(true);
  const [freezeFirstColumn, setFreezeFirstColumn] = useState<boolean>(false);
  const [sheetTheme, setSheetTheme] = useState<'excel_green' | 'dark' | 'slate' | 'blue'>(() => {
    return initialAutoSave?.sheetTheme || 'excel_green';
  });
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Fullscreen Viewport Mode Management
  const workstationRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        if (workstationRef.current?.requestFullscreen) {
          await workstationRef.current.requestFullscreen();
        } else if ((workstationRef.current as any)?.webkitRequestFullscreen) {
          await (workstationRef.current as any).webkitRequestFullscreen();
        }
        setIsFullscreen(true);
        setStatusMessage('Expanded spreadsheet to Fullscreen (Press Esc to exit).');
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any)?.webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
        setStatusMessage('Exited Fullscreen mode.');
      }
    } catch (err) {
      // Graceful fallback for iframe sandbox or browser security restrictions
      setIsFullscreen(prev => {
        const next = !prev;
        setStatusMessage(next ? 'Expanded spreadsheet to full browser viewport (Press Esc to exit).' : 'Restored normal spreadsheet view.');
        return next;
      });
    }
  }, []);

  // Listen for browser fullscreen events and Escape key
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNative = !!document.fullscreenElement;
      setIsFullscreen(isNative);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        setIsFullscreen(false);
        setStatusMessage('Exited Fullscreen mode.');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  // Auto-Save Execution Engine
  const performSaveToStorage = useCallback((
    currentSheets: SheetData[],
    currentActiveIndex: number,
    currentNamedRanges: Array<{ name: string; range: string; sheet: string; value: string }>,
    currentTheme: 'excel_green' | 'dark' | 'slate' | 'blue'
  ): boolean => {
    try {
      // Keep payload safely within localStorage limits by capping excessive data generation if needed
      const safeSheets = currentSheets.map(sh => {
        if (sh.rows.length > 5000) {
          return {
            ...sh,
            rows: sh.rows.slice(0, 5000)
          };
        }
        return sh;
      });

      const payload: AutoSaveData = {
        version: 2,
        timestamp: Date.now(),
        sheets: safeSheets,
        activeSheetIndex: currentActiveIndex,
        namedRanges: currentNamedRanges,
        sheetTheme: currentTheme
      };

      localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(payload));
      setAutoSaveStatus('saved');
      setLastAutoSavedAt(new Date());
      return true;
    } catch (err) {
      console.warn('Auto-save to localStorage failed:', err);
      setAutoSaveStatus('error');
      return false;
    }
  }, []);

  // Periodic / Debounced Auto-Save
  const isAutoSaveFirstMount = useRef(true);
  useEffect(() => {
    if (isAutoSaveFirstMount.current) {
      isAutoSaveFirstMount.current = false;
      return;
    }

    if (!autoSaveEnabled) {
      setAutoSaveStatus('disabled');
      return;
    }

    setAutoSaveStatus('saving');
    const timer = setTimeout(() => {
      performSaveToStorage(sheets, activeSheetIndex, namedRanges, sheetTheme);
    }, 1000);

    return () => clearTimeout(timer);
  }, [sheets, activeSheetIndex, namedRanges, sheetTheme, autoSaveEnabled, performSaveToStorage]);

  // Synchronous auto-save immediately before browser tab closes or navigates away
  useEffect(() => {
    const handleTabUnload = () => {
      if (autoSaveEnabled) {
        performSaveToStorage(sheets, activeSheetIndex, namedRanges, sheetTheme);
      }
    };

    window.addEventListener('beforeunload', handleTabUnload);
    window.addEventListener('pagehide', handleTabUnload);
    return () => {
      window.removeEventListener('beforeunload', handleTabUnload);
      window.removeEventListener('pagehide', handleTabUnload);
    };
  }, [sheets, activeSheetIndex, namedRanges, sheetTheme, autoSaveEnabled, performSaveToStorage]);

  // Find & Replace Modal State
  const [showFindReplaceModal, setShowFindReplaceModal] = useState<boolean>(false);
  const [findReplaceTab, setFindReplaceTab] = useState<'find' | 'replace'>('find');

  // Notification / Status messages
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Convert Column Index to Excel Letter (0 -> A, 25 -> Z, 26 -> AA)
  const getColLetter = useCallback((index: number) => {
    let letter = '';
    let temp = index;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  }, []);

  const getCellCoordinate = useCallback((row: number, col: number) => {
    return `${getColLetter(col)}${row + 1}`;
  }, [getColLetter]);

  const colLetterToIndex = useCallback((letterStr: string): number => {
    let index = 0;
    const clean = letterStr.toUpperCase().trim();
    for (let i = 0; i < clean.length; i++) {
      index = index * 26 + (clean.charCodeAt(i) - 64);
    }
    return Math.max(0, index - 1);
  }, []);

  // Update formula bar & coordinate input when selected cell / range changes
  useEffect(() => {
    if (currentSheet && currentSheet.rows[selectedCell.row]) {
      const val = currentSheet.rows[selectedCell.row][selectedCell.col] ?? '';
      setFormulaInput(String(val));
      setEditValue(String(val));
    }

    const { startRow, endRow, startCol, endCol } = selectionRange;
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);

    if (selectionMode === 'all') {
      setCoordinateInputValue('ALL');
    } else if (selectionMode === 'column') {
      if (minCol === maxCol) {
        setCoordinateInputValue(`Col ${getColLetter(minCol)}`);
      } else {
        setCoordinateInputValue(`${getColLetter(minCol)}:${getColLetter(maxCol)}`);
      }
    } else if (selectionMode === 'row') {
      if (minRow === maxRow) {
        setCoordinateInputValue(`Row ${minRow + 1}`);
      } else {
        setCoordinateInputValue(`${minRow + 1}:${maxRow + 1}`);
      }
    } else if (minRow === maxRow && minCol === maxCol) {
      setCoordinateInputValue(getCellCoordinate(minRow, minCol));
    } else {
      setCoordinateInputValue(`${getCellCoordinate(minRow, minCol)}:${getCellCoordinate(maxRow, maxCol)}`);
    }
  }, [selectedCell, selectionRange, selectionMode, currentSheet, getCellCoordinate, getColLetter]);

  // Auto-scroll interval reference for drag selection
  const autoScrollTimerRef = useRef<number | null>(null);

  // Global mousemove and mouseup listeners for click-and-drag range selection & auto-scrolling
  useEffect(() => {
    if (!isSelecting) {
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
        autoScrollTimerRef.current = null;
      }
      return;
    }

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      // Auto-scrolling when dragging mouse near the grid container edges
      const scrollSpeed = 16;
      let scrollXDelta = 0;
      let scrollYDelta = 0;

      if (e.clientY < rect.top + 45) {
        scrollYDelta = -scrollSpeed;
      } else if (e.clientY > rect.bottom - 45) {
        scrollYDelta = scrollSpeed;
      }

      if (e.clientX < rect.left + 75) {
        scrollXDelta = -scrollSpeed;
      } else if (e.clientX > rect.right - 45) {
        scrollXDelta = scrollSpeed;
      }

      if (scrollXDelta !== 0 || scrollYDelta !== 0) {
        if (!autoScrollTimerRef.current) {
          autoScrollTimerRef.current = window.setInterval(() => {
            if (containerRef.current) {
              if (scrollYDelta !== 0) containerRef.current.scrollTop += scrollYDelta;
              if (scrollXDelta !== 0) containerRef.current.scrollLeft += scrollXDelta;
            }
          }, 25);
        }
      } else {
        if (autoScrollTimerRef.current) {
          clearInterval(autoScrollTimerRef.current);
          autoScrollTimerRef.current = null;
        }
      }

      // Calculate row and column indices based on cursor position relative to grid
      const relY = e.clientY - rect.top + containerRef.current.scrollTop - HEADER_HEIGHT;
      const targetRow = Math.max(0, Math.min(currentSheet.rows.length - 1, Math.floor(relY / ROW_HEIGHT)));

      const relX = e.clientX - rect.left + containerRef.current.scrollLeft - 56; // 56px row index column width
      let accumulatedWidth = 0;
      let targetCol = 0;
      for (let c = 0; c < currentSheet.headers.length; c++) {
        const w = currentSheet.columnWidths[c] || DEFAULT_COL_WIDTH;
        if (relX < accumulatedWidth + w || c === currentSheet.headers.length - 1) {
          targetCol = c;
          break;
        }
        accumulatedWidth += w;
      }

      if (selectionMode === 'cell') {
        const minRow = Math.min(selectionOrigin.row, targetRow);
        const maxRow = Math.max(selectionOrigin.row, targetRow);
        const minCol = Math.min(selectionOrigin.col, targetCol);
        const maxCol = Math.max(selectionOrigin.col, targetCol);

        setSelectionRange({
          startRow: minRow,
          endRow: maxRow,
          startCol: minCol,
          endCol: maxCol
        });
      } else if (selectionMode === 'row') {
        const minRow = Math.min(selectionOrigin.row, targetRow);
        const maxRow = Math.max(selectionOrigin.row, targetRow);
        setSelectionRange({
          startRow: minRow,
          endRow: maxRow,
          startCol: 0,
          endCol: Math.max(0, currentSheet.headers.length - 1)
        });
      } else if (selectionMode === 'column') {
        const minCol = Math.min(selectionOrigin.col, targetCol);
        const maxCol = Math.max(selectionOrigin.col, targetCol);
        setSelectionRange({
          startRow: 0,
          endRow: Math.max(0, currentSheet.rows.length - 1),
          startCol: minCol,
          endCol: maxCol
        });
      }
    };

    const handleGlobalMouseUp = () => {
      setIsSelecting(false);
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
        autoScrollTimerRef.current = null;
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
        autoScrollTimerRef.current = null;
      }
    };
  }, [isSelecting, selectionMode, selectionOrigin, currentSheet.rows.length, currentSheet.headers.length, currentSheet.columnWidths]);

  // Undo / Redo History Management
  const undoStackRef = useRef<SheetData[][]>([]);
  const redoStackRef = useRef<SheetData[][]>([]);
  const clipboardMemoryRef = useRef<string>('');

  const pushUndoState = useCallback(() => {
    try {
      undoStackRef.current.push(JSON.parse(JSON.stringify(sheets)));
      if (undoStackRef.current.length > 60) {
        undoStackRef.current.shift();
      }
      redoStackRef.current = [];
    } catch (e) {
      console.error('Error saving undo state', e);
    }
  }, [sheets]);

  const handleFillHandleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsFilling(true);
    fillSourceRangeRef.current = { ...selectionRange };
  };

  const executeAutofill = useCallback((targetRange: { startRow: number; endRow: number; startCol: number; endCol: number }) => {
    pushUndoState();
    setSheets(prev => {
      const next = [...prev];
      const sh = { ...next[activeSheetIndex] };
      const newRows = sh.rows.map(r => [...r]);

      const src = fillSourceRangeRef.current;
      const minR = Math.min(src.startRow, src.endRow);
      const maxR = Math.max(src.startRow, src.endRow);
      const minC = Math.min(src.startCol, src.endCol);
      const maxC = Math.max(src.startCol, src.endCol);

      const tMinR = Math.min(targetRange.startRow, targetRange.endRow);
      const tMaxR = Math.max(targetRange.startRow, targetRange.endRow);
      const tMinC = Math.min(targetRange.startCol, targetRange.endCol);
      const tMaxC = Math.max(targetRange.startCol, targetRange.endCol);

      while (newRows.length <= tMaxR) {
        newRows.push(new Array(sh.headers.length).fill(''));
      }

      if (tMaxR > maxR) {
        for (let c = minC; c <= maxC; c++) {
          const sourceVals = [];
          for (let r = minR; r <= maxR; r++) {
            sourceVals.push(newRows[r]?.[c] ?? '');
          }
          let step = 1;
          let isNumericSeries = sourceVals.length >= 1 && !isNaN(Number(sourceVals[0])) && sourceVals[0] !== '';
          if (sourceVals.length >= 2 && !isNaN(Number(sourceVals[1]))) {
            step = Number(sourceVals[1]) - Number(sourceVals[0]);
          }

          for (let r = maxR + 1; r <= tMaxR; r++) {
            if (!newRows[r]) newRows[r] = new Array(sh.headers.length).fill('');
            const offset = r - minR;
            if (isNumericSeries) {
              const firstNum = Number(sourceVals[0]);
              newRows[r][c] = firstNum + step * offset;
            } else {
              newRows[r][c] = sourceVals[offset % sourceVals.length];
            }
          }
        }
      } else if (tMinR < minR) {
        for (let c = minC; c <= maxC; c++) {
          const sourceVals = [];
          for (let r = minR; r <= maxR; r++) {
            sourceVals.push(newRows[r]?.[c] ?? '');
          }
          let step = 1;
          let isNumericSeries = sourceVals.length >= 1 && !isNaN(Number(sourceVals[0])) && sourceVals[0] !== '';
          if (sourceVals.length >= 2 && !isNaN(Number(sourceVals[1]))) {
            step = Number(sourceVals[1]) - Number(sourceVals[0]);
          }
          for (let r = tMinR; r < minR; r++) {
            if (!newRows[r]) newRows[r] = new Array(sh.headers.length).fill('');
            const revOffset = minR - r;
            if (isNumericSeries) {
              const firstNum = Number(sourceVals[0]);
              newRows[r][c] = firstNum - step * revOffset;
            } else {
              newRows[r][c] = sourceVals[(sourceVals.length - (revOffset % sourceVals.length)) % sourceVals.length];
            }
          }
        }
      } else if (tMaxC > maxC) {
        for (let r = minR; r <= maxR; r++) {
          const sourceVals = [];
          for (let c = minC; c <= maxC; c++) {
            sourceVals.push(newRows[r]?.[c] ?? '');
          }
          let step = 1;
          let isNumericSeries = sourceVals.length >= 1 && !isNaN(Number(sourceVals[0])) && sourceVals[0] !== '';
          if (sourceVals.length >= 2 && !isNaN(Number(sourceVals[1]))) {
            step = Number(sourceVals[1]) - Number(sourceVals[0]);
          }
          for (let c = maxC + 1; c <= tMaxC; c++) {
            const offset = c - minC;
            if (!newRows[r]) newRows[r] = new Array(sh.headers.length).fill('');
            if (isNumericSeries) {
              const firstNum = Number(sourceVals[0]);
              newRows[r][c] = firstNum + step * offset;
            } else {
              newRows[r][c] = sourceVals[offset % sourceVals.length];
            }
          }
        }
      } else if (tMinC < minC) {
        for (let r = minR; r <= maxR; r++) {
          const sourceVals = [];
          for (let c = minC; c <= maxC; c++) {
            sourceVals.push(newRows[r]?.[c] ?? '');
          }
          let step = 1;
          let isNumericSeries = sourceVals.length >= 1 && !isNaN(Number(sourceVals[0])) && sourceVals[0] !== '';
          if (sourceVals.length >= 2 && !isNaN(Number(sourceVals[1]))) {
            step = Number(sourceVals[1]) - Number(sourceVals[0]);
          }
          for (let c = tMinC; c < minC; c++) {
            const revOffset = minC - c;
            if (!newRows[r]) newRows[r] = new Array(sh.headers.length).fill('');
            if (isNumericSeries) {
              const firstNum = Number(sourceVals[0]);
              newRows[r][c] = firstNum - step * revOffset;
            } else {
              newRows[r][c] = sourceVals[(sourceVals.length - (revOffset % sourceVals.length)) % sourceVals.length];
            }
          }
        }
      }

      sh.rows = newRows;
      next[activeSheetIndex] = sh;
      return next;
    });

    setSelectionRange(targetRange);
    setStatusMessage('Auto-filled range successfully.');
  }, [activeSheetIndex, pushUndoState]);

  useEffect(() => {
    if (!isFilling) return;

    const handleFillMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relY = e.clientY - rect.top + containerRef.current.scrollTop - HEADER_HEIGHT;
      const targetRow = Math.max(0, Math.min(currentSheet.rows.length - 1, Math.floor(relY / ROW_HEIGHT)));

      const relX = e.clientX - rect.left + containerRef.current.scrollLeft - 56;
      let accumulatedWidth = 0;
      let targetCol = 0;
      for (let c = 0; c < currentSheet.headers.length; c++) {
        const w = currentSheet.columnWidths[c] || DEFAULT_COL_WIDTH;
        if (relX < accumulatedWidth + w || c === currentSheet.headers.length - 1) {
          targetCol = c;
          break;
        }
        accumulatedWidth += w;
      }

      const src = fillSourceRangeRef.current;
      const minR = Math.min(src.startRow, src.endRow);
      const maxR = Math.max(src.startRow, src.endRow);
      const minC = Math.min(src.startCol, src.endCol);
      const maxC = Math.max(src.startCol, src.endCol);

      let newEndRow = maxR;
      let newEndCol = maxC;
      let newStartRow = minR;
      let newStartCol = minC;

      if (targetRow > maxR) {
        newEndRow = targetRow;
      } else if (targetRow < minR) {
        newStartRow = targetRow;
      } else if (targetCol > maxC) {
        newEndCol = targetCol;
      } else if (targetCol < minC) {
        newStartCol = targetCol;
      }

      setSelectionRange({
        startRow: newStartRow,
        endRow: newEndRow,
        startCol: newStartCol,
        endCol: newEndCol
      });
    };

    const handleFillMouseUp = () => {
      setIsFilling(false);
      const src = fillSourceRangeRef.current;
      const currentTarget = { ...selectionRange };
      if (
        currentTarget.startRow !== src.startRow ||
        currentTarget.endRow !== src.endRow ||
        currentTarget.startCol !== src.startCol ||
        currentTarget.endCol !== src.endCol
      ) {
        executeAutofill(currentTarget);
      }
    };

    window.addEventListener('mousemove', handleFillMouseMove);
    window.addEventListener('mouseup', handleFillMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleFillMouseMove);
      window.removeEventListener('mouseup', handleFillMouseUp);
    };
  }, [isFilling, selectionRange, currentSheet.rows.length, currentSheet.headers.length, currentSheet.columnWidths, executeAutofill]);

  // Undo / Redo History Management moved above

  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) {
      setStatusMessage('Nothing to undo.');
      return;
    }
    const prevSheets = undoStackRef.current.pop();
    if (prevSheets) {
      redoStackRef.current.push(JSON.parse(JSON.stringify(sheets)));
      setSheets(prevSheets);
      setStatusMessage('Undo successful (Ctrl+Z).');
    }
  }, [sheets]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) {
      setStatusMessage('Nothing to redo.');
      return;
    }
    const nextSheets = redoStackRef.current.pop();
    if (nextSheets) {
      undoStackRef.current.push(JSON.parse(JSON.stringify(sheets)));
      setSheets(nextSheets);
      setStatusMessage('Redo successful (Ctrl+Y).');
    }
  }, [sheets]);

  // Clear Selected Cells (Delete / Backspace)
  const handleClearSelectedCells = useCallback(() => {
    const { startRow, endRow, startCol, endCol } = selectionRange;
    const minR = Math.min(startRow, endRow);
    const maxR = Math.max(startRow, endRow);
    const minC = Math.min(startCol, endCol);
    const maxC = Math.max(startCol, endCol);

    pushUndoState();

    setSheets(prev => {
      const next = [...prev];
      const sh = { ...next[activeSheetIndex] };
      const newRows = sh.rows.map((row, rIdx) => {
        if (rIdx < minR || rIdx > maxR) return row;
        const updated = [...row];
        for (let c = minC; c <= maxC; c++) {
          updated[c] = '';
        }
        return updated;
      });
      sh.rows = newRows;
      next[activeSheetIndex] = sh;
      return next;
    });

    setFormulaInput('');
    setEditValue('');
    const cellCount = (maxR - minR + 1) * (maxC - minC + 1);
    setStatusMessage(`Cleared contents of ${cellCount} selected cell(s). Press Ctrl+Z to undo.`);
  }, [selectionRange, activeSheetIndex, pushUndoState]);

  // Copy / Cut / Paste Handlers
  const handleCopy = useCallback(() => {
    const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
    const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
    const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
    const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);

    const lines: string[] = [];
    for (let r = minR; r <= maxR; r++) {
      const rowVals: string[] = [];
      for (let c = minC; c <= maxC; c++) {
        const v = currentSheet.rows[r]?.[c] ?? '';
        rowVals.push(String(v));
      }
      lines.push(rowVals.join('\t'));
    }
    const tsv = lines.join('\n');
    clipboardMemoryRef.current = tsv;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tsv).catch(() => {});
    }
    const rCount = maxR - minR + 1;
    const cCount = maxC - minC + 1;
    setStatusMessage(`Copied ${rCount}x${cCount} cell(s) to clipboard (Ctrl+V to paste).`);
  }, [selectionRange, currentSheet.rows]);

  const handleCut = useCallback(() => {
    handleCopy();
    handleClearSelectedCells();
    setStatusMessage('Cut selected cells to clipboard.');
  }, [handleCopy, handleClearSelectedCells]);

  const handlePaste = useCallback(async () => {
    let text = '';
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        text = await navigator.clipboard.readText();
      }
    } catch {
      text = clipboardMemoryRef.current;
    }
    if (!text) {
      text = clipboardMemoryRef.current;
    }
    if (!text) {
      setStatusMessage('Clipboard is empty.');
      return;
    }

    const rawRows = text.split(/\r?\n/).map(line => line.split('\t'));
    if (rawRows.length === 0 || (rawRows.length === 1 && rawRows[0].length === 1 && rawRows[0][0] === '')) {
      return;
    }

    pushUndoState();

    const startR = selectedCell.row;
    const startC = selectedCell.col;

    setSheets(prev => {
      const next = [...prev];
      const sh = { ...next[activeSheetIndex] };
      const newRows = sh.rows.map(r => [...r]);

      const neededRows = startR + rawRows.length;
      while (newRows.length < neededRows) {
        newRows.push(new Array(sh.headers.length).fill(''));
      }

      rawRows.forEach((rowVals, rOffset) => {
        const targetR = startR + rOffset;
        if (!newRows[targetR]) {
          newRows[targetR] = new Array(sh.headers.length).fill('');
        }
        rowVals.forEach((val, cOffset) => {
          const targetC = startC + cOffset;
          if (targetC < sh.headers.length) {
            let parsedVal: string | number = val;
            if (!isNaN(Number(val)) && val.trim() !== '') {
              parsedVal = Number(val);
            }
            newRows[targetR][targetC] = parsedVal;
          }
        });
      });

      sh.rows = newRows;
      next[activeSheetIndex] = sh;
      return next;
    });

    const endR = startR + rawRows.length - 1;
    const endC = Math.min(currentSheet.headers.length - 1, startC + (rawRows[0]?.length || 1) - 1);
    setSelectionRange({ startRow: startR, endRow: endR, startCol: startC, endCol: endC });
    setStatusMessage(`Pasted ${rawRows.length}x${rawRows[0]?.length || 1} cell(s).`);
  }, [selectedCell, activeSheetIndex, currentSheet.headers.length, pushUndoState]);

  // Toggle Text Formatting Style (Bold, Italic, Underline, Strikethrough)
  const handleToggleStyle = useCallback((styleProp: 'bold' | 'italic' | 'underline' | 'strikethrough') => {
    const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
    const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
    const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
    const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);

    pushUndoState();

    setSheets(prev => {
      const next = [...prev];
      const sh = { ...next[activeSheetIndex] };
      const newStyles = { ...(sh.cellStyles || {}) };

      const firstKey = `${minR}_${minC}`;
      const curVal = newStyles[firstKey]?.[styleProp];
      const targetVal = !curVal;

      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const k = `${r}_${c}`;
          newStyles[k] = {
            ...(newStyles[k] || {}),
            [styleProp]: targetVal
          };
        }
      }

      sh.cellStyles = newStyles;
      next[activeSheetIndex] = sh;
      return next;
    });

    setStatusMessage(`Toggled ${styleProp} formatting.`);
  }, [selectionRange, activeSheetIndex, pushUndoState]);

  // Apply specific MS Excel border style
  const handleApplyBorder = useCallback((type: 'all' | 'outside' | 'thick_outside' | 'bottom' | 'top' | 'left' | 'right' | 'top_bottom' | 'double_bottom' | 'none' = 'all') => {
    const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
    const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
    const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
    const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);

    pushUndoState();

    setSheets(prev => {
      const next = [...prev];
      const sh = { ...next[activeSheetIndex] };
      const newStyles = { ...(sh.cellStyles || {}) };

      if (type === 'none') {
        for (let r = minR; r <= maxR; r++) {
          for (let c = minC; c <= maxC; c++) {
            const k = `${r}_${c}`;
            if (newStyles[k]) {
              const { border, borderTop, borderBottom, borderLeft, borderRight, borderStyle, ...rest } = newStyles[k];
              newStyles[k] = rest;
            }
          }
        }
        sh.cellStyles = newStyles;
        next[activeSheetIndex] = sh;
        return next;
      }

      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const k = `${r}_${c}`;
          const existing = newStyles[k] || {};

          if (type === 'all') {
            newStyles[k] = {
              ...existing,
              border: true,
              borderTop: true,
              borderBottom: true,
              borderLeft: true,
              borderRight: true,
              borderStyle: 'all'
            };
          } else if (type === 'outside') {
            newStyles[k] = {
              ...existing,
              border: true,
              borderTop: r === minR,
              borderBottom: r === maxR,
              borderLeft: c === minC,
              borderRight: c === maxC,
              borderStyle: 'outside'
            };
          } else if (type === 'thick_outside') {
            newStyles[k] = {
              ...existing,
              border: true,
              borderTop: r === minR,
              borderBottom: r === maxR ? ('thick' as any) : undefined,
              borderLeft: c === minC,
              borderRight: c === maxC,
              borderStyle: 'thick_outside'
            };
          } else if (type === 'bottom') {
            if (r === maxR) {
              newStyles[k] = {
                ...existing,
                border: true,
                borderBottom: true,
                borderStyle: 'bottom'
              };
            }
          } else if (type === 'top') {
            if (r === minR) {
              newStyles[k] = {
                ...existing,
                border: true,
                borderTop: true,
                borderStyle: 'top'
              };
            }
          } else if (type === 'left') {
            if (c === minC) {
              newStyles[k] = {
                ...existing,
                border: true,
                borderLeft: true,
                borderStyle: 'left'
              };
            }
          } else if (type === 'right') {
            if (c === maxC) {
              newStyles[k] = {
                ...existing,
                border: true,
                borderRight: true,
                borderStyle: 'right'
              };
            }
          } else if (type === 'top_bottom') {
            newStyles[k] = {
              ...existing,
              border: true,
              borderTop: r === minR,
              borderBottom: r === maxR,
              borderStyle: 'top_bottom'
            };
          } else if (type === 'double_bottom') {
            if (r === maxR) {
              newStyles[k] = {
                ...existing,
                border: true,
                borderBottom: 'double' as any,
                borderStyle: 'double_bottom'
              };
            }
          }
        }
      }

      sh.cellStyles = newStyles;
      next[activeSheetIndex] = sh;
      return next;
    });

    setStatusMessage(`Applied ${type.replace(/_/g, ' ')} border.`);
  }, [selectionRange, activeSheetIndex, pushUndoState]);

  // Toggle Cell Borders (MS Excel All Borders Toggle)
  const handleToggleBorder = useCallback(() => {
    const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
    const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
    const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
    const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);

    let hasAnyBorder = false;
    const currentSheetStyles = sheets[activeSheetIndex]?.cellStyles || {};
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (currentSheetStyles[`${r}_${c}`]?.border) {
          hasAnyBorder = true;
          break;
        }
      }
      if (hasAnyBorder) break;
    }

    if (hasAnyBorder) {
      handleApplyBorder('none');
    } else {
      handleApplyBorder('all');
    }
  }, [selectionRange, activeSheetIndex, sheets, handleApplyBorder]);

  // Set Text Alignment (Left, Center, Right)
  const handleSetAlignment = useCallback((align: 'left' | 'center' | 'right') => {
    const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
    const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
    const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
    const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);

    pushUndoState();

    setSheets(prev => {
      const next = [...prev];
      const sh = { ...next[activeSheetIndex] };
      const newStyles = { ...(sh.cellStyles || {}) };

      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const k = `${r}_${c}`;
          newStyles[k] = {
            ...(newStyles[k] || {}),
            align
          };
        }
      }

      sh.cellStyles = newStyles;
      next[activeSheetIndex] = sh;
      return next;
    });

    setStatusMessage(`Applied text alignment (${align}).`);
  }, [selectionRange, activeSheetIndex, pushUndoState]);

  // Auto-scroll Viewport to make active cell visible
  const scrollToCell = useCallback((row: number, col: number) => {
    if (!containerRef.current) return;
    const targetTop = row * ROW_HEIGHT;
    const curTop = containerRef.current.scrollTop;
    const viewH = containerRef.current.clientHeight;

    if (targetTop < curTop) {
      containerRef.current.scrollTop = targetTop;
    } else if (targetTop + ROW_HEIGHT + HEADER_HEIGHT > curTop + viewH) {
      containerRef.current.scrollTop = targetTop - viewH + ROW_HEIGHT + HEADER_HEIGHT + 24;
    }

    let colLeft = 56;
    for (let c = 0; c < col; c++) {
      colLeft += currentSheet.columnWidths[c] || DEFAULT_COL_WIDTH;
    }
    const curLeft = containerRef.current.scrollLeft;
    const viewW = containerRef.current.clientWidth;
    const colW = currentSheet.columnWidths[col] || DEFAULT_COL_WIDTH;

    if (colLeft < curLeft + 56) {
      containerRef.current.scrollLeft = Math.max(0, colLeft - 56);
    } else if (colLeft + colW > curLeft + viewW) {
      containerRef.current.scrollLeft = colLeft + colW - viewW + 30;
    }
  }, [currentSheet.columnWidths]);

  // Comprehensive MS Excel Keyboard Shortcuts and Navigation Engine
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputActive = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.getAttribute('contenteditable') === 'true'
      );

      // F1 or Ctrl+/ -> Open Shortcuts Guide Modal
      if (e.key === 'F1' || (e.ctrlKey && e.key === '/')) {
        e.preventDefault();
        setShowShortcutsModal(true);
        return;
      }

      // If any modal is open, let modal handle Escape
      if (showRangeSelectModal || showChartModal || showShortcutsModal) {
        if (e.key === 'Escape') {
          setShowRangeSelectModal(false);
          setShowChartModal(false);
          setShowShortcutsModal(false);
        }
        return;
      }

      // If user is focused on the search bar, name box, or jump to row input, don't intercept standard typing
      const isInsideGridCellEditor = activeEl && activeEl.id === 'grid-cell-editor';
      if (isInputActive && !isInsideGridCellEditor) {
        if (e.key === 'Escape') {
          (activeEl as HTMLElement).blur();
        }
        return;
      }

      const maxR = Math.max(0, currentSheet.rows.length - 1);
      const maxC = Math.max(0, currentSheet.headers.length - 1);

      // Ctrl + A -> Select entire worksheet
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        if (!isEditing) {
          e.preventDefault();
          setSelectedCell({ row: 0, col: 0 });
          setSelectionMode('all');
          setSelectionRange({
            startRow: 0,
            endRow: maxR,
            startCol: 0,
            endCol: maxC
          });
          setStatusMessage(`Selected entire worksheet (${currentSheet.rows.length.toLocaleString()} rows)`);
          return;
        }
      }

      // Ctrl + Z -> Undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Ctrl + Y or Ctrl + Shift + Z -> Redo
      if (((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
          ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Ctrl + C -> Copy
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        if (!isEditing) {
          e.preventDefault();
          handleCopy();
          return;
        }
      }

      // Ctrl + X -> Cut
      if ((e.ctrlKey || e.metaKey) && (e.key === 'x' || e.key === 'X')) {
        if (!isEditing) {
          e.preventDefault();
          handleCut();
          return;
        }
      }

      // Ctrl + V -> Paste
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        if (!isEditing) {
          e.preventDefault();
          handlePaste();
          return;
        }
      }

      // Ctrl + S -> Save Workbook (.xlsx)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        exportXLSXRef.current();
        setStatusMessage('Saving spreadsheet workbook as .xlsx...');
        return;
      }

      // Ctrl + P -> Print Workbook
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        window.print();
        return;
      }

      // Ctrl + B -> Bold
      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        handleToggleStyle('bold');
        return;
      }

      // Ctrl + I -> Italic
      if ((e.ctrlKey || e.metaKey) && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        handleToggleStyle('italic');
        return;
      }

      // Ctrl + U -> Underline
      if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        handleToggleStyle('underline');
        return;
      }

      // Ctrl + 5 -> Strikethrough
      if ((e.ctrlKey || e.metaKey) && e.key === '5') {
        e.preventDefault();
        handleToggleStyle('strikethrough');
        return;
      }

      // Ctrl + D -> Fill Down
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        if (!isEditing && selectedCell.row > 0) {
          e.preventDefault();
          const aboveVal = currentSheet.rows[selectedCell.row - 1]?.[selectedCell.col] ?? '';
          commitCellValueRef.current(String(aboveVal));
          setStatusMessage(`Filled down value from row #${selectedCell.row}`);
          return;
        }
      }

      // Ctrl + R -> Fill Right
      if ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R')) {
        if (!isEditing && selectedCell.col > 0) {
          e.preventDefault();
          const leftVal = currentSheet.rows[selectedCell.row]?.[selectedCell.col - 1] ?? '';
          commitCellValueRef.current(String(leftVal));
          setStatusMessage(`Filled right value from column ${getColLetter(selectedCell.col - 1)}`);
          return;
        }
      }

      // Ctrl + ; -> Insert Current Date
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === ';') {
        e.preventDefault();
        const today = new Date().toISOString().split('T')[0];
        if (isEditing) {
          setEditValue(prev => prev + today);
          setFormulaInput(prev => prev + today);
        } else {
          commitCellValueRef.current(today);
        }
        setStatusMessage(`Inserted current date: ${today}`);
        return;
      }

      // Ctrl + Shift + ; or Ctrl + : -> Insert Current Time
      if ((e.ctrlKey || e.metaKey) && ((e.shiftKey && e.key === ';') || e.key === ':')) {
        e.preventDefault();
        const time = new Date().toLocaleTimeString();
        if (isEditing) {
          setEditValue(prev => prev + time);
          setFormulaInput(prev => prev + time);
        } else {
          commitCellValueRef.current(time);
        }
        setStatusMessage(`Inserted current time: ${time}`);
        return;
      }

      // Alt + = -> AutoSum Formula
      if (e.altKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        const r = selectedCell.row;
        const c = selectedCell.col;
        const colLetter = getColLetter(c);
        const startRow = 1;
        const endRow = Math.max(1, r);
        const autoSumFormula = `=SUM(${colLetter}${startRow}:${colLetter}${endRow})`;
        setIsEditing(true);
        setEditValue(autoSumFormula);
        setFormulaInput(autoSumFormula);
        setStatusMessage(`AutoSum inserted: ${autoSumFormula}`);
        return;
      }

      // Shift + F11 -> Add New Worksheet
      if (e.shiftKey && e.key === 'F11') {
        e.preventDefault();
        addSheetRef.current();
        setStatusMessage('Added new worksheet tab');
        return;
      }

      // Shift + F2 -> Insert / Edit Note or Comment
      if (e.shiftKey && e.key === 'F2') {
        e.preventDefault();
        setCommentTargetCell({ row: selectedCell.row, col: selectedCell.col });
        const cellKey = `${selectedCell.row}_${selectedCell.col}`;
        const existing = currentSheet.comments?.[cellKey];
        setActiveCommentText(existing ? existing.text : '');
        setShowCommentModal(true);
        return;
      }

      // Ctrl + PageDown -> Next Worksheet Tab
      if ((e.ctrlKey || e.metaKey) && e.key === 'PageDown' && !isEditing) {
        if (activeSheetIndex < sheets.length - 1) {
          e.preventDefault();
          setActiveSheetIndex(activeSheetIndex + 1);
          setStatusMessage(`Switched to sheet: ${sheets[activeSheetIndex + 1]?.name}`);
          return;
        }
      }

      // Ctrl + PageUp -> Previous Worksheet Tab
      if ((e.ctrlKey || e.metaKey) && e.key === 'PageUp' && !isEditing) {
        if (activeSheetIndex > 0) {
          e.preventDefault();
          setActiveSheetIndex(activeSheetIndex - 1);
          setStatusMessage(`Switched to sheet: ${sheets[activeSheetIndex - 1]?.name}`);
          return;
        }
      }

      // Ctrl + F -> Open Find Modal
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        setFindReplaceTab('find');
        setShowFindReplaceModal(true);
        return;
      }

      // Ctrl + H -> Open Replace Modal
      if ((e.ctrlKey || e.metaKey) && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        setFindReplaceTab('replace');
        setShowFindReplaceModal(true);
        return;
      }

      // Shift + Space -> Select Entire Row
      if (e.shiftKey && e.key === ' ') {
        if (!isEditing) {
          e.preventDefault();
          const r = selectedCell.row;
          setSelectionMode('row');
          setSelectionOrigin({ row: r, col: 0 });
          setSelectionRange({ startRow: r, endRow: r, startCol: 0, endCol: maxC });
          setStatusMessage(`Selected Row #${r + 1}`);
          return;
        }
      }

      // Ctrl + Space -> Select Entire Column
      if ((e.ctrlKey || e.metaKey) && e.key === ' ') {
        if (!isEditing) {
          e.preventDefault();
          const c = selectedCell.col;
          setSelectionMode('column');
          setSelectionOrigin({ row: 0, col: c });
          setSelectionRange({ startRow: 0, endRow: maxR, startCol: c, endCol: c });
          setStatusMessage(`Selected Column ${getColLetter(c)}`);
          return;
        }
      }

      // F2 -> Enter In-Cell Edit Mode
      if (e.key === 'F2') {
        e.preventDefault();
        setIsEditing(true);
        return;
      }

      // Escape Key Handler
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isEditing) {
          setIsEditing(false);
          const originalVal = currentSheet.rows[selectedCell.row]?.[selectedCell.col] ?? '';
          setEditValue(String(originalVal));
          setFormulaInput(String(originalVal));
        } else {
          setSelectionRange({
            startRow: selectedCell.row,
            endRow: selectedCell.row,
            startCol: selectedCell.col,
            endCol: selectedCell.col
          });
          setSelectionMode('cell');
          setActiveFilterCol(null);
          setIsEditingCoordinate(false);
        }
        return;
      }

      // Delete / Backspace (Clear cell content when not editing text)
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditing) {
        e.preventDefault();
        handleClearSelectedCells();
        return;
      }

      // Enter & Shift + Enter
      if (e.key === 'Enter') {
        e.preventDefault();
        if (isEditing) {
          handleCommitCellValue(editValue);
        }
        const nextR = e.shiftKey ? Math.max(0, selectedCell.row - 1) : Math.min(maxR, selectedCell.row + 1);
        setSelectedCell(prev => ({ ...prev, row: nextR }));
        setSelectionOrigin(prev => ({ ...prev, row: nextR }));
        setSelectionRange({ startRow: nextR, endRow: nextR, startCol: selectedCell.col, endCol: selectedCell.col });
        setSelectionMode('cell');
        scrollToCell(nextR, selectedCell.col);
        return;
      }

      // Tab & Shift + Tab
      if (e.key === 'Tab') {
        e.preventDefault();
        if (isEditing) {
          handleCommitCellValue(editValue);
        }
        const nextC = e.shiftKey ? Math.max(0, selectedCell.col - 1) : Math.min(maxC, selectedCell.col + 1);
        setSelectedCell(prev => ({ ...prev, col: nextC }));
        setSelectionOrigin(prev => ({ ...prev, col: nextC }));
        setSelectionRange({ startRow: selectedCell.row, endRow: selectedCell.row, startCol: nextC, endCol: nextC });
        setSelectionMode('cell');
        scrollToCell(selectedCell.row, nextC);
        return;
      }

      // Home / Ctrl+Home / Ctrl+End / PageUp / PageDown
      if (e.key === 'Home') {
        e.preventDefault();
        if (isEditing) return;
        const targetR = (e.ctrlKey || e.metaKey) ? 0 : selectedCell.row;
        const targetC = 0;
        setSelectedCell({ row: targetR, col: targetC });
        setSelectionOrigin({ row: targetR, col: targetC });
        setSelectionRange({ startRow: targetR, endRow: targetR, startCol: targetC, endCol: targetC });
        setSelectionMode('cell');
        scrollToCell(targetR, targetC);
        return;
      }

      if (e.key === 'End' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (isEditing) return;
        const targetR = maxR;
        const targetC = maxC;
        setSelectedCell({ row: targetR, col: targetC });
        setSelectionOrigin({ row: targetR, col: targetC });
        setSelectionRange({ startRow: targetR, endRow: targetR, startCol: targetC, endCol: targetC });
        setSelectionMode('cell');
        scrollToCell(targetR, targetC);
        return;
      }

      if (e.key === 'PageUp' || e.key === 'PageDown') {
        e.preventDefault();
        if (isEditing) return;
        const delta = e.key === 'PageUp' ? -20 : 20;
        const targetR = Math.max(0, Math.min(maxR, selectedCell.row + delta));
        setSelectedCell(prev => ({ ...prev, row: targetR }));
        setSelectionOrigin(prev => ({ ...prev, row: targetR }));
        setSelectionRange({ startRow: targetR, endRow: targetR, startCol: selectedCell.col, endCol: selectedCell.col });
        setSelectionMode('cell');
        scrollToCell(targetR, selectedCell.col);
        return;
      }

      // Arrow Keys Navigation (Up, Down, Left, Right)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (isEditing) return;
        e.preventDefault();

        let dR = 0;
        let dC = 0;
        if (e.key === 'ArrowUp') dR = -1;
        if (e.key === 'ArrowDown') dR = 1;
        if (e.key === 'ArrowLeft') dC = -1;
        if (e.key === 'ArrowRight') dC = 1;

        if (e.ctrlKey || e.metaKey) {
          if (e.key === 'ArrowUp') dR = -selectedCell.row;
          if (e.key === 'ArrowDown') dR = maxR - selectedCell.row;
          if (e.key === 'ArrowLeft') dC = -selectedCell.col;
          if (e.key === 'ArrowRight') dC = maxC - selectedCell.col;
        }

        const nextR = Math.max(0, Math.min(maxR, selectedCell.row + dR));
        const nextC = Math.max(0, Math.min(maxC, selectedCell.col + dC));

        if (e.shiftKey) {
          const originR = selectionOrigin.row ?? selectedCell.row;
          const originC = selectionOrigin.col ?? selectedCell.col;
          setSelectedCell({ row: nextR, col: nextC });
          setSelectionMode('cell');
          setSelectionRange({
            startRow: Math.min(originR, nextR),
            endRow: Math.max(originR, nextR),
            startCol: Math.min(originC, nextC),
            endCol: Math.max(originC, nextC)
          });
        } else {
          setSelectedCell({ row: nextR, col: nextC });
          setSelectionOrigin({ row: nextR, col: nextC });
          setSelectionRange({ startRow: nextR, endRow: nextR, startCol: nextC, endCol: nextC });
          setSelectionMode('cell');
        }

        scrollToCell(nextR, nextC);
        return;
      }

      // Direct In-Cell Typing: If a cell is focused and user types an alphanumeric or symbol character
      if (!isEditing && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
        setIsEditing(true);
        setEditValue(e.key);
        setFormulaInput(e.key);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    selectedCell,
    selectionRange,
    selectionOrigin,
    selectionMode,
    isEditing,
    editValue,
    currentSheet,
    showRangeSelectModal,
    showChartModal,
    showShortcutsModal,
    scrollToCell,
    getColLetter,
    handleUndo,
    handleRedo,
    handleCopy,
    handleCut,
    handlePaste,
    handleToggleStyle,
    handleClearSelectedCells,
    activeSheetIndex,
    sheets
  ]);

  // Parse and Apply Range Typed into Name Box
  const handleApplyTypedCoordinate = (inputStr: string) => {
    const raw = inputStr.trim().toUpperCase();
    if (!raw) {
      setIsEditingCoordinate(false);
      return;
    }

    if (raw === 'ALL' || raw === 'ALL (SHEET)' || raw === '*') {
      handleSelectAll();
      setIsEditingCoordinate(false);
      return;
    }

    // Column Range like A:E or COL A:E or A TO E or A-E
    const colRangeMatch = raw.match(/^(?:COL\s*)?([A-Z]+)\s*(?::|TO|-)\s*([A-Z]+)$/);
    if (colRangeMatch) {
      const c1 = colLetterToIndex(colRangeMatch[1]);
      const c2 = colLetterToIndex(colRangeMatch[2]);
      const sC = Math.max(0, Math.min(c1, c2));
      const eC = Math.min(currentSheet.headers.length - 1, Math.max(c1, c2));

      setSelectedCell({ row: 0, col: sC });
      setSelectionOrigin({ row: 0, col: sC });
      setSelectionMode('column');
      setSelectionRange({
        startRow: 0,
        endRow: Math.max(0, currentSheet.rows.length - 1),
        startCol: sC,
        endCol: eC
      });
      setStatusMessage(`Selected Columns ${getColLetter(sC)} to ${getColLetter(eC)}`);
      setIsEditingCoordinate(false);
      return;
    }

    // Cell Range like A1:E100 or A1 TO E100 or A1-E100
    const rangeMatch = raw.match(/^([A-Z]+)(\d+)\s*(?::|TO|-)\s*([A-Z]+)(\d+)$/);
    if (rangeMatch) {
      const c1 = colLetterToIndex(rangeMatch[1]);
      const r1 = parseInt(rangeMatch[2], 10) - 1;
      const c2 = colLetterToIndex(rangeMatch[3]);
      const r2 = parseInt(rangeMatch[4], 10) - 1;

      const sR = Math.max(0, Math.min(r1, r2));
      const eR = Math.min(currentSheet.rows.length - 1, Math.max(r1, r2));
      const sC = Math.max(0, Math.min(c1, c2));
      const eC = Math.min(currentSheet.headers.length - 1, Math.max(c1, c2));

      setSelectedCell({ row: sR, col: sC });
      setSelectionOrigin({ row: sR, col: sC });
      setSelectionMode('cell');
      setSelectionRange({ startRow: sR, endRow: eR, startCol: sC, endCol: eC });
      setStatusMessage(`Selected range ${getColLetter(sC)}${sR + 1}:${getColLetter(eC)}${eR + 1}`);
      setIsEditingCoordinate(false);
      return;
    }

    // Row Range like 2:10 or ROW 2:10 or 2 TO 10
    const rowRangeMatch = raw.match(/^(?:ROW\s*)?(\d+)\s*(?::|TO|-)\s*(\d+)$/);
    if (rowRangeMatch) {
      const r1 = parseInt(rowRangeMatch[1], 10) - 1;
      const r2 = parseInt(rowRangeMatch[2], 10) - 1;
      const sR = Math.max(0, Math.min(r1, r2));
      const eR = Math.min(currentSheet.rows.length - 1, Math.max(r1, r2));

      setSelectedCell({ row: sR, col: 0 });
      setSelectionOrigin({ row: sR, col: 0 });
      setSelectionMode('row');
      setSelectionRange({
        startRow: sR,
        endRow: eR,
        startCol: 0,
        endCol: Math.max(0, currentSheet.headers.length - 1)
      });
      setStatusMessage(`Selected Rows ${sR + 1} to ${eR + 1}`);
      setIsEditingCoordinate(false);
      return;
    }

    // Single column like COL A or COL E
    const singleColMatch = raw.match(/^(?:COL\s*)([A-Z]+)$/);
    if (singleColMatch) {
      const c = colLetterToIndex(singleColMatch[1]);
      const sC = Math.max(0, Math.min(c, currentSheet.headers.length - 1));
      setSelectedCell({ row: 0, col: sC });
      setSelectionOrigin({ row: 0, col: sC });
      setSelectionMode('column');
      setSelectionRange({
        startRow: 0,
        endRow: Math.max(0, currentSheet.rows.length - 1),
        startCol: sC,
        endCol: sC
      });
      setStatusMessage(`Selected Column ${getColLetter(sC)}`);
      setIsEditingCoordinate(false);
      return;
    }

    // Single Cell like B5 or A1
    const singleMatch = raw.match(/^([A-Z]+)(\d+)$/);
    if (singleMatch) {
      const c = colLetterToIndex(singleMatch[1]);
      const r = parseInt(singleMatch[2], 10) - 1;
      const sR = Math.max(0, Math.min(r, currentSheet.rows.length - 1));
      const sC = Math.max(0, Math.min(c, currentSheet.headers.length - 1));

      setSelectedCell({ row: sR, col: sC });
      setSelectionOrigin({ row: sR, col: sC });
      setSelectionMode('cell');
      setSelectionRange({ startRow: sR, endRow: sR, startCol: sC, endCol: sC });
      setStatusMessage(`Selected cell ${getColLetter(sC)}${sR + 1}`);
      setIsEditingCoordinate(false);
      return;
    }

    setIsEditingCoordinate(false);
  };

  // Cell Selection Handlers (with Shift+Click and drag support)
  const handleCellMouseDown = (row: number, col: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();

    if (contextMenuPos) {
      setContextMenuPos(null);
    }

    if (e.shiftKey) {
      const originRow = selectionOrigin.row ?? selectedCell.row ?? 0;
      const originCol = selectionOrigin.col ?? selectedCell.col ?? 0;
      const minRow = Math.min(originRow, row);
      const maxRow = Math.max(originRow, row);
      const minCol = Math.min(originCol, col);
      const maxCol = Math.max(originCol, col);

      setSelectionMode('cell');
      setSelectionRange({
        startRow: minRow,
        endRow: maxRow,
        startCol: minCol,
        endCol: maxCol
      });
      setStatusMessage(`Selected Range ${getCellCoordinate(minRow, minCol)}:${getCellCoordinate(maxRow, maxCol)} (${maxRow - minRow + 1}R × ${maxCol - minCol + 1}C)`);
      return;
    }

    setIsSelecting(true);
    setSelectedCell({ row, col });
    setSelectionOrigin({ row, col });
    setSelectionMode('cell');
    setSelectionRange({
      startRow: row,
      endRow: row,
      startCol: col,
      endCol: col
    });
    if (isEditing) {
      handleCommitCellValue(editValue);
    }
  };

  const handleCellMouseEnter = (row: number, col: number) => {
    if (!isSelecting) return;
    if (selectionMode === 'cell') {
      const minRow = Math.min(selectionOrigin.row, row);
      const maxRow = Math.max(selectionOrigin.row, row);
      const minCol = Math.min(selectionOrigin.col, col);
      const maxCol = Math.max(selectionOrigin.col, col);

      setSelectionRange({
        startRow: minRow,
        endRow: maxRow,
        startCol: minCol,
        endCol: maxCol
      });
    } else if (selectionMode === 'row') {
      const minRow = Math.min(selectionOrigin.row, row);
      const maxRow = Math.max(selectionOrigin.row, row);
      setSelectionRange({
        startRow: minRow,
        endRow: maxRow,
        startCol: 0,
        endCol: Math.max(0, currentSheet.headers.length - 1)
      });
    } else if (selectionMode === 'column') {
      const minCol = Math.min(selectionOrigin.col, col);
      const maxCol = Math.max(selectionOrigin.col, col);
      setSelectionRange({
        startRow: 0,
        endRow: Math.max(0, currentSheet.rows.length - 1),
        startCol: minCol,
        endCol: maxCol
      });
    }
  };

  // Row Header Selection Handlers (with Shift+Click and drag support)
  const handleRowHeaderMouseDown = (rowIdx: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();

    if (e.shiftKey) {
      const originRow = selectionOrigin.row ?? selectedCell.row ?? 0;
      const minRow = Math.min(originRow, rowIdx);
      const maxRow = Math.max(originRow, rowIdx);
      setSelectionMode('row');
      setSelectionRange({
        startRow: minRow,
        endRow: maxRow,
        startCol: 0,
        endCol: Math.max(0, currentSheet.headers.length - 1)
      });
      setStatusMessage(`Selected Rows ${minRow + 1} to ${maxRow + 1}`);
      return;
    }

    setIsSelecting(true);
    setSelectedCell({ row: rowIdx, col: 0 });
    setSelectionOrigin({ row: rowIdx, col: 0 });
    setSelectionMode('row');
    setSelectionRange({
      startRow: rowIdx,
      endRow: rowIdx,
      startCol: 0,
      endCol: Math.max(0, currentSheet.headers.length - 1)
    });
    setStatusMessage(`Selected Row ${rowIdx + 1}`);
  };

  const handleRowHeaderMouseEnter = (rowIdx: number) => {
    if (!isSelecting || selectionMode !== 'row') return;
    const minRow = Math.min(selectionOrigin.row, rowIdx);
    const maxRow = Math.max(selectionOrigin.row, rowIdx);
    setSelectionRange({
      startRow: minRow,
      endRow: maxRow,
      startCol: 0,
      endCol: Math.max(0, currentSheet.headers.length - 1)
    });
    setStatusMessage(`Selected Rows ${minRow + 1} to ${maxRow + 1}`);
  };

  // Column Header Selection Handlers (with Shift+Click and drag support across A to E)
  const handleColHeaderMouseDown = (colIdx: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();

    if (e.shiftKey) {
      const originCol = selectionOrigin.col ?? selectedCell.col ?? 0;
      const minCol = Math.min(originCol, colIdx);
      const maxCol = Math.max(originCol, colIdx);
      setSelectionMode('column');
      setSelectionRange({
        startRow: 0,
        endRow: Math.max(0, currentSheet.rows.length - 1),
        startCol: minCol,
        endCol: maxCol
      });
      setStatusMessage(`Selected Columns ${getColLetter(minCol)} to ${getColLetter(maxCol)}`);
      return;
    }

    setIsSelecting(true);
    setSelectedCell({ row: 0, col: colIdx });
    setSelectionOrigin({ row: 0, col: colIdx });
    setSelectionMode('column');
    setSelectionRange({
      startRow: 0,
      endRow: Math.max(0, currentSheet.rows.length - 1),
      startCol: colIdx,
      endCol: colIdx
    });
    setStatusMessage(`Selected Column ${getColLetter(colIdx)}`);
  };

  const handleColHeaderMouseEnter = (colIdx: number) => {
    if (!isSelecting || selectionMode !== 'column') return;
    const minCol = Math.min(selectionOrigin.col, colIdx);
    const maxCol = Math.max(selectionOrigin.col, colIdx);
    setSelectionRange({
      startRow: 0,
      endRow: Math.max(0, currentSheet.rows.length - 1),
      startCol: minCol,
      endCol: maxCol
    });
    setStatusMessage(`Selected Columns ${getColLetter(minCol)} to ${getColLetter(maxCol)}`);
  };

  // Select All Corner Button Handler
  const handleSelectAll = () => {
    setSelectedCell({ row: 0, col: 0 });
    setSelectionMode('all');
    setSelectionRange({
      startRow: 0,
      endRow: Math.max(0, currentSheet.rows.length - 1),
      startCol: 0,
      endCol: Math.max(0, currentSheet.headers.length - 1)
    });
    setStatusMessage(`Selected entire sheet (${currentSheet.rows.length.toLocaleString()} rows)`);
  };

  // Right-Click Context Menu Handlers (Cells, Row Numbers, Column Headers)
  const handleCellContextMenu = (row: number, col: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
    const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
    const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
    const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);

    const isInsideSelection =
      row >= minR &&
      row <= maxR &&
      col >= minC &&
      col <= maxC;

    if (!isInsideSelection) {
      setSelectedCell({ row, col });
      setSelectionOrigin({ row, col });
      setSelectionMode('cell');
      setSelectionRange({
        startRow: row,
        endRow: row,
        startCol: col,
        endCol: col
      });
    }

    setContextMenuPos({
      x: e.clientX,
      y: e.clientY,
      row,
      col
    });
  };

  const handleRowHeaderContextMenu = (rowIdx: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
    const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);

    if (selectionMode !== 'row' || rowIdx < minR || rowIdx > maxR) {
      setSelectedCell({ row: rowIdx, col: 0 });
      setSelectionOrigin({ row: rowIdx, col: 0 });
      setSelectionMode('row');
      setSelectionRange({
        startRow: rowIdx,
        endRow: rowIdx,
        startCol: 0,
        endCol: Math.max(0, currentSheet.headers.length - 1)
      });
    }

    setContextMenuPos({
      x: e.clientX,
      y: e.clientY,
      row: rowIdx,
      col: 0
    });
  };

  const handleColHeaderContextMenu = (colIdx: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
    const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);

    if (selectionMode !== 'column' || colIdx < minC || colIdx > maxC) {
      setSelectedCell({ row: 0, col: colIdx });
      setSelectionOrigin({ row: 0, col: colIdx });
      setSelectionMode('column');
      setSelectionRange({
        startRow: 0,
        endRow: Math.max(0, currentSheet.rows.length - 1),
        startCol: colIdx,
        endCol: colIdx
      });
    }

    setContextMenuPos({
      x: e.clientX,
      y: e.clientY,
      row: 0,
      col: colIdx
    });
  };

  // Update viewport height dynamically with ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportHeight(entry.contentRect.height);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Filter Management Handlers
  const handleApplyColumnFilter = (colIdx: number, filterState: ColumnFilterState | null) => {
    setColumnFilters(prev => {
      const next = { ...prev };
      if (!filterState) {
        delete next[colIdx];
      } else {
        next[colIdx] = filterState;
      }
      return next;
    });

    if (filterState) {
      setStatusMessage(`Filter applied to Column "${currentSheet.headers[colIdx] || getColLetter(colIdx)}"`);
    } else {
      setStatusMessage(`Cleared filter for Column "${currentSheet.headers[colIdx] || getColLetter(colIdx)}"`);
    }
  };

  const handleClearAllFilters = () => {
    setColumnFilters({});
    setSearchQuery('');
    setStatusMessage('Cleared all filters across active worksheet.');
  };

  // Count active column filters
  const activeFiltersCount = Object.keys(columnFilters).length;

  // Filtered & Sorted Rows Calculation - Optimized for 500k rows
  const processedRowIndices = useMemo(() => {
    const total = currentSheet.rows.length;
    const activeFilterEntries = (Object.entries(columnFilters) as [string, ColumnFilterState][]).map(([colStr, filter]) => ({
      colIdx: parseInt(colStr, 10),
      filter
    }));

    const hasFilters = activeFilterEntries.length > 0;
    const hasSearch = !!searchQuery.trim();

    // Fast-path: 0 filter overhead
    if (!hasFilters && !hasSearch && sortColumn === null) {
      const indices = new Array(total);
      for (let i = 0; i < total; i++) indices[i] = i;
      return indices;
    }

    const query = searchQuery.toLowerCase().trim();
    let indices: number[] = [];

    for (let i = 0; i < total; i++) {
      const row = currentSheet.rows[i];
      if (!row) continue;

      // 1. Column Filter Checks
      if (hasFilters) {
        let passAllFilters = true;
        for (const { colIdx, filter } of activeFilterEntries) {
          const rawCell = row[colIdx];
          const cellStr = rawCell === undefined || rawCell === null || rawCell === '' ? '(Blanks)' : String(rawCell);

          // Value checkboxes check
          if (filter.selectedValues && filter.selectedValues.length > 0) {
            if (!filter.selectedValues.includes(cellStr)) {
              passAllFilters = false;
              break;
            }
          }

          // Condition filter check
          if (filter.conditionType && filter.conditionType !== 'none') {
            const condVal = (filter.conditionValue || '').toLowerCase().trim();
            const lowerCell = cellStr.toLowerCase();

            switch (filter.conditionType) {
              case 'is_empty':
                if (rawCell !== '' && rawCell !== null && rawCell !== undefined) passAllFilters = false;
                break;
              case 'is_not_empty':
                if (rawCell === '' || rawCell === null || rawCell === undefined) passAllFilters = false;
                break;
              case 'contains':
                if (!lowerCell.includes(condVal)) passAllFilters = false;
                break;
              case 'not_contains':
                if (lowerCell.includes(condVal)) passAllFilters = false;
                break;
              case 'starts_with':
                if (!lowerCell.startsWith(condVal)) passAllFilters = false;
                break;
              case 'ends_with':
                if (!lowerCell.endsWith(condVal)) passAllFilters = false;
                break;
              case 'equals':
                if (lowerCell !== condVal) passAllFilters = false;
                break;
              case 'not_equals':
                if (lowerCell === condVal) passAllFilters = false;
                break;
              case 'greater_than':
                if (Number(rawCell) <= Number(condVal) || isNaN(Number(rawCell))) passAllFilters = false;
                break;
              case 'less_than':
                if (Number(rawCell) >= Number(condVal) || isNaN(Number(rawCell))) passAllFilters = false;
                break;
            }

            if (!passAllFilters) break;
          }
        }

        if (!passAllFilters) continue;
      }

      // 2. Global Search Query Check
      if (hasSearch) {
        let match = false;
        for (let c = 0; c < row.length; c++) {
          if (String(row[c] ?? '').toLowerCase().includes(query)) {
            match = true;
            break;
          }
        }
        if (!match) continue;
      }

      indices.push(i);
    }

    // 3. Sort if requested
    if (sortColumn !== null) {
      const colIdx = sortColumn;
      const isAsc = sortDirection === 'asc';
      indices.sort((a, b) => {
        const valA = currentSheet.rows[a][colIdx];
        const valB = currentSheet.rows[b][colIdx];

        if (typeof valA === 'number' && typeof valB === 'number') {
          return isAsc ? valA - valB : valB - valA;
        }
        const strA = String(valA ?? '');
        const strB = String(valB ?? '');
        return isAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    return indices;
  }, [currentSheet.rows, columnFilters, searchQuery, sortColumn, sortDirection]);

  // Virtual Window Calculation
  const totalDisplayRows = processedRowIndices.length;
  const totalVirtualHeight = totalDisplayRows * ROW_HEIGHT;

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - VISIBLE_OVERSCAN);
  const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + VISIBLE_OVERSCAN * 2;
  const endIndex = Math.min(totalDisplayRows, startIndex + visibleCount);

  const visibleIndices = useMemo(() => {
    return processedRowIndices.slice(startIndex, endIndex);
  }, [processedRowIndices, startIndex, endIndex]);

  const offsetY = startIndex * ROW_HEIGHT;

  // Handle Scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
    if (contextMenuPos) {
      setContextMenuPos(null);
    }
  };

  // Cell Commit Update
  const handleCommitCellValue = (newVal: string) => {
    commitCellValueRef.current = handleCommitCellValue;
    const r = selectedCell.row;
    const c = selectedCell.col;
    
    let evaluatedVal: string | number = newVal;
    if (newVal.startsWith('=')) {
      evaluatedVal = evaluateExcelFormula(newVal, currentSheet.rows, r, c);
    } else if (!isNaN(Number(newVal)) && newVal.trim() !== '') {
      evaluatedVal = Number(newVal);
    }

    pushUndoState();

    setSheets(prev => {
      const next = [...prev];
      const sheet = { ...next[activeSheetIndex] };
      const newRows = [...sheet.rows];
      
      if (!newRows[r]) newRows[r] = [];
      const rowArr = [...newRows[r]];
      rowArr[c] = evaluatedVal;
      newRows[r] = rowArr;

      sheet.rows = newRows;
      next[activeSheetIndex] = sheet;
      return next;
    });

    setIsEditing(false);
  };

  // Toggle Merge & Center / Merge Cells for selected range
  const handleToggleMergeCells = useCallback(() => {
    const { startRow, endRow, startCol, endCol } = selectionRange;
    const minR = Math.min(startRow, endRow);
    const maxR = Math.max(startRow, endRow);
    const minC = Math.min(startCol, endCol);
    const maxC = Math.max(startCol, endCol);

    if (minR === maxR && minC === maxC) {
      setStatusMessage('Please select 2 or more cells to merge.');
      return;
    }

    pushUndoState();

    setSheets(prev => {
      const next = [...prev];
      const sh = { ...next[activeSheetIndex] };
      const merges = { ...(sh.mergedCells || {}) };
      const key = `${minR}_${minC}`;

      // If already merged at this origin, unmerge
      if (merges[key]) {
        delete merges[key];
        sh.mergedCells = merges;
        setStatusMessage(`Unmerged cells ${getColLetter(minC)}${minR + 1}:${getColLetter(maxC)}${maxR + 1}`);
      } else {
        // Clear any overlapping sub-merges
        Object.keys(merges).forEach(k => {
          const m = merges[k];
          if (m.startRow >= minR && m.startRow <= maxR && m.startCol >= minC && m.startCol <= maxC) {
            delete merges[k];
          }
        });

        merges[key] = {
          startRow: minR,
          startCol: minC,
          rowSpan: maxR - minR + 1,
          colSpan: maxC - minC + 1
        };

        // Align center for merged cell
        const newStyles = { ...(sh.cellStyles || {}) };
        newStyles[key] = {
          ...(newStyles[key] || {}),
          align: 'center'
        };

        sh.cellStyles = newStyles;
        sh.mergedCells = merges;
        setStatusMessage(`Merged & Centered cells ${getColLetter(minC)}${minR + 1}:${getColLetter(maxC)}${maxR + 1}`);
      }

      next[activeSheetIndex] = sh;
      return next;
    });
  }, [selectionRange, activeSheetIndex, getColLetter, pushUndoState]);

  // Unmerge selected cells specifically
  const handleUnmergeCells = useCallback(() => {
    const { startRow, endRow, startCol, endCol } = selectionRange;
    const minR = Math.min(startRow, endRow);
    const maxR = Math.max(startRow, endRow);
    const minC = Math.min(startCol, endCol);
    const maxC = Math.max(startCol, endCol);

    pushUndoState();

    setSheets(prev => {
      const next = [...prev];
      const sh = { ...next[activeSheetIndex] };
      const merges = { ...(sh.mergedCells || {}) };
      let removed = 0;

      Object.keys(merges).forEach(k => {
        const m = merges[k];
        if (
          (m.startRow >= minR && m.startRow <= maxR && m.startCol >= minC && m.startCol <= maxC) ||
          (minR >= m.startRow && minR <= m.startRow + m.rowSpan - 1 && minC >= m.startCol && minC <= m.startCol + m.colSpan - 1)
        ) {
          delete merges[k];
          removed++;
        }
      });

      sh.mergedCells = merges;
      next[activeSheetIndex] = sh;
      return next;
    });

    setStatusMessage(`Unmerged selected cells.`);
  }, [selectionRange, activeSheetIndex, pushUndoState]);

  // Interactive Column Drag Resize Handler
  const handleStartColResize = useCallback((colIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const initialWidth = currentSheet.columnWidths[colIdx] || DEFAULT_COL_WIDTH;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(45, initialWidth + deltaX);
      setSheets(prev => {
        const next = [...prev];
        const sh = { ...next[activeSheetIndex] };
        const newWidths = [...sh.columnWidths];
        newWidths[colIdx] = newWidth;
        sh.columnWidths = newWidths;
        next[activeSheetIndex] = sh;
        return next;
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setStatusMessage(`Resized Column ${getColLetter(colIdx)}.`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [currentSheet.columnWidths, activeSheetIndex, getColLetter]);

  // Double-click to auto-fit Column Width to Content
  const handleAutoFitColumn = useCallback((colIdx: number) => {
    let maxChars = (currentSheet.headers[colIdx] || '').length;
    const scanRows = Math.min(1000, currentSheet.rows.length);
    for (let r = 0; r < scanRows; r++) {
      const val = String(currentSheet.rows[r]?.[colIdx] || '');
      if (val.length > maxChars) maxChars = val.length;
    }
    const autoWidth = Math.min(420, Math.max(65, maxChars * 9 + 36));
    pushUndoState();
    setSheets(prev => {
      const next = [...prev];
      const sh = { ...next[activeSheetIndex] };
      const newWidths = [...sh.columnWidths];
      newWidths[colIdx] = autoWidth;
      sh.columnWidths = newWidths;
      next[activeSheetIndex] = sh;
      return next;
    });
    setStatusMessage(`Auto-fitted Column ${getColLetter(colIdx)} to ${autoWidth}px.`);
  }, [currentSheet.headers, currentSheet.rows, activeSheetIndex, getColLetter, pushUndoState]);

  // Replace All Matches Helper for Find & Replace Modal
  const handleReplaceAll = useCallback((findText: string, replaceText: string, matchCase: boolean, matchEntire: boolean): number => {
    pushUndoState();
    let totalCount = 0;
    const query = matchCase ? findText : findText.toLowerCase();

    setSheets(prev => {
      const next = [...prev];
      const sh = { ...next[activeSheetIndex] };
      const newRows = sh.rows.map(row => {
        return row.map(cellVal => {
          if (cellVal === null || cellVal === undefined || cellVal === '') return cellVal;
          const strVal = String(cellVal);
          const targetVal = matchCase ? strVal : strVal.toLowerCase();

          if (matchEntire) {
            if (targetVal === query) {
              totalCount++;
              return replaceText;
            }
          } else {
            if (targetVal.includes(query)) {
              const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase ? 'g' : 'gi');
              const replaced = strVal.replace(regex, replaceText);
              if (replaced !== strVal) {
                totalCount++;
                return replaced;
              }
            }
          }
          return cellVal;
        });
      });

      sh.rows = newRows;
      next[activeSheetIndex] = sh;
      return next;
    });

    setStatusMessage(`Replaced ${totalCount.toLocaleString()} occurrence(s).`);
    return totalCount;
  }, [activeSheetIndex, pushUndoState]);

  // Jump to specific Row
  const handleJumpToRow = () => {
    const target = parseInt(jumpToRowInput, 10);
    if (isNaN(target) || target < 1 || target > totalDisplayRows) {
      setStatusMessage(`Please enter a valid row number between 1 and ${totalDisplayRows.toLocaleString()}`);
      return;
    }
    const targetScroll = (target - 1) * ROW_HEIGHT;
    if (containerRef.current) {
      containerRef.current.scrollTop = targetScroll;
    }
    setSelectedCell({ row: target - 1, col: 0 });
    setStatusMessage(`Jumped to Row #${target.toLocaleString()}`);
  };

  // Big Data Generator (3 Lakh to 5 Lakh rows) - Web Worker
  const handleGenerateBigData = async (targetRows: number, datasetType: 'sales' | 'ecommerce' | 'financial' | 'telemetry') => {
    setIsGeneratingData(true);
    setGenProgress(0);
    setStatusMessage(null);

    const lakhLabel = (targetRows / 100000).toFixed(1);
    setGenStatusText(`Starting Web Worker background thread for ${targetRows.toLocaleString()} rows (${lakhLabel} Lakhs)...`);

    try {
      if (workerServiceRef.current?.isAvailable()) {
        const res = await workerServiceRef.current.postMessage(
          {
            type: 'GENERATE_BIG_DATA',
            payload: { targetRows, datasetType }
          },
          (progress, status) => {
            setGenProgress(progress);
            setGenStatusText(`⚡ [Web Worker] ${status}`);
          }
        );

        if (res?.sheet) {
          setSheets(prev => {
            const next = [...prev];
            next[activeSheetIndex] = {
              ...next[activeSheetIndex],
              headers: res.sheet.headers,
              rows: res.sheet.rows,
              columnWidths: res.sheet.columnWidths
            };
            return next;
          });
        }
      } else {
        const regions = ['North India', 'South India', 'West India', 'East India', 'Central India'];
        const categories = ['Electronics', 'Office Supplies', 'Furniture', 'Software & Cloud'];
        const names = ['Amit Sharma', 'Priya Patel', 'Rajesh Kumar', 'Sneha Reddy', 'Vikram Singh', 'Ananya Roy', 'Karan Verma'];
        const CHUNK_SIZE = 50000;
        const generatedRows: (string | number)[][] = [];

        for (let chunkStart = 0; chunkStart < targetRows; chunkStart += CHUNK_SIZE) {
          const currentChunkEnd = Math.min(chunkStart + CHUNK_SIZE, targetRows);
          for (let i = chunkStart; i < currentChunkEnd; i++) {
            generatedRows.push([
              `ORD-${1000000 + i}`,
              names[i % names.length],
              regions[i % regions.length],
              categories[i % categories.length],
              `SKU-${100 + (i % 900)}`,
              (i % 15) + 1,
              (i % 500) * 100 + 499,
              `${(i % 15)}%`,
              ((i % 15) + 1) * ((i % 500) * 100 + 499),
              i % 3 === 0 ? 'Delivered' : i % 3 === 1 ? 'Shipped' : 'Processing'
            ]);
          }
        }

        setSheets(prev => {
          const next = [...prev];
          next[activeSheetIndex] = {
            ...next[activeSheetIndex],
            rows: generatedRows
          };
          return next;
        });
      }

      setIsGeneratingData(false);
      setColumnFilters({});
      setStatusMessage(`⚡ Generated ${targetRows.toLocaleString()} rows (${lakhLabel} Lakhs) with 0 UI freeze!`);
    } catch (err: any) {
      console.error('Data generation failed:', err);
      setIsGeneratingData(false);
      setStatusMessage('Data generation error.');
    }
  };

  // Import Spreadsheet File (.xlsx, .csv)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsGeneratingData(true);
    setGenProgress(10);
    setGenStatusText(`⚡ [Web Worker] Reading file "${file.name}"...`);

    try {
      const buffer = await file.arrayBuffer();

      if (workerServiceRef.current?.isAvailable()) {
        const response = await workerServiceRef.current.postMessage(
          {
            type: 'PARSE_FILE',
            payload: {
              fileData: buffer,
              fileName: file.name,
              fileType: file.type
            }
          },
          (progress, status) => {
            setGenProgress(progress);
            setGenStatusText(`⚡ [Web Worker] ${status}`);
          },
          [buffer]
        );

        if (response.type === 'PARSE_SUCCESS' && response.sheets && response.sheets.length > 0) {
          setSheets(response.sheets.map((sh: any) => ({
            ...sh,
            cellStyles: {}
          })));
          setActiveSheetIndex(0);
          setColumnFilters({});
          setIsGeneratingData(false);
          setStatusMessage(`⚡ Loaded "${file.name}" (${response.totalRows.toLocaleString()} rows) successfully!`);

          if (onAddRecentFile) {
            onAddRecentFile({
              name: file.name,
              size: `${(file.size / 1024).toFixed(1)} KB`,
              type: 'Spreadsheet',
              toolUsed: 'MS Excel Importer'
            });
          }
        }
      } else {
        const data = new Uint8Array(buffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const newSheets: SheetData[] = workbook.SheetNames.map((sheetName, idx) => {
          const ws = workbook.Sheets[sheetName];
          const rawMatrix: (string | number)[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          
          let headers: string[] = [];
          let dataRows: (string | number)[][] = [];

          if (rawMatrix.length > 0) {
            headers = rawMatrix[0].map(h => String(h || 'Column'));
            dataRows = rawMatrix.slice(1);
          } else {
            headers = ['A', 'B', 'C', 'D', 'E'];
            dataRows = [];
          }

          return {
            id: `sheet_${idx + 1}`,
            name: sheetName,
            columns: headers.map((_, cIdx) => getColLetter(cIdx)),
            headers: headers,
            rows: dataRows,
            columnWidths: headers.map(() => DEFAULT_COL_WIDTH),
            cellStyles: {}
          };
        });

        if (newSheets.length > 0) {
          setSheets(newSheets);
          setActiveSheetIndex(0);
          setColumnFilters({});
          setIsGeneratingData(false);
          setStatusMessage(`Loaded "${file.name}" with ${newSheets[0].rows.length.toLocaleString()} rows!`);
        }
      }
    } catch (err: any) {
      console.error('Failed to parse spreadsheet:', err);
      setIsGeneratingData(false);
      setStatusMessage(`Failed to read file: ${err.message}`);
    }

    e.target.value = '';
  };

  // Sort current column
  const handleSortCurrentColumn = (direction: 'asc' | 'desc') => {
    setSortColumn(selectedCell.col);
    setSortDirection(direction);
    setStatusMessage(`Sorted Column ${getColLetter(selectedCell.col)} (${direction === 'asc' ? 'A to Z' : 'Z to A'}).`);
  };

  // Remove duplicates
  const handleRemoveDuplicates = () => {
    const targetCol = selectedCell.col;
    pushUndoState();
    setSheets(prev => {
      const next = [...prev];
      const sh = { ...next[activeSheetIndex] };
      const seen = new Set<string>();
      const uniqueRows: string[][] = [];
      for (const r of sh.rows) {
        const val = (r[targetCol] || '').toString().trim();
        if (!val || !seen.has(val)) {
          if (val) seen.add(val);
          uniqueRows.push(r);
        }
      }
      sh.rows = uniqueRows;
      next[activeSheetIndex] = sh;
      return next;
    });
    setStatusMessage(`Removed duplicate entries based on Column ${getColLetter(selectedCell.col)}.`);
  };

  // Reset current sheet
  const handleResetSheet = () => {
    pushUndoState();
    setSheets(prev => {
      const next = [...prev];
      const sh = { ...next[activeSheetIndex] };
      sh.rows = Array.from({ length: 50 }, () => Array(26).fill(''));
      next[activeSheetIndex] = sh;
      return next;
    });
    setStatusMessage(`Sheet "${currentSheet.name}" reset to blank state.`);
  };

  // Export to .XLSX using Web Worker
  const handleExportXLSX = async () => {
    exportXLSXRef.current = handleExportXLSX;
    setIsGeneratingData(true);
    setGenProgress(20);
    setGenStatusText('⚡ [Web Worker] Exporting sheets to XLSX binary...');

    const fileName = `${currentSheet.name}_${currentSheet.rows.length}_Rows.xlsx`;

    try {
      if (workerServiceRef.current?.isAvailable()) {
        const payloadSheets = sheets.map(s => ({
          name: s.name,
          headers: s.headers,
          rows: s.rows
        }));

        const res = await workerServiceRef.current.postMessage(
          {
            type: 'EXPORT_SHEET',
            payload: {
              format: 'xlsx',
              sheets: payloadSheets,
              fileName
            }
          },
          (progress, status) => {
            setGenProgress(progress);
            setGenStatusText(`⚡ [Web Worker] ${status}`);
          }
        );

        if (res?.buffer) {
          const blob = new Blob([res.buffer], { type: res.mimeType });
          saveAs(blob, res.fileName || fileName);
          setIsGeneratingData(false);
          setStatusMessage(`⚡ Exported "${fileName}" via Web Worker!`);
        }
      } else {
        const wb = XLSX.utils.book_new();
        sheets.forEach((sh) => {
          const fullData = [sh.headers, ...sh.rows];
          const ws = XLSX.utils.aoa_to_sheet(fullData);
          XLSX.utils.book_append_sheet(wb, ws, sh.name);
        });

        XLSX.writeFile(wb, fileName);
        setIsGeneratingData(false);
        setStatusMessage(`Exported "${fileName}" successfully!`);
      }
    } catch (err: any) {
      console.error('Export failed:', err);
      setIsGeneratingData(false);
      setStatusMessage(`Export error: ${err.message}`);
    }
  };

  // Export to CSV using Web Worker
  const handleExportCSV = async () => {
    setIsGeneratingData(true);
    setGenProgress(25);
    setGenStatusText('⚡ [Web Worker] Generating CSV in background thread...');

    const fileName = `${currentSheet.name}_Export.csv`;

    try {
      if (workerServiceRef.current?.isAvailable()) {
        const res = await workerServiceRef.current.postMessage(
          {
            type: 'EXPORT_SHEET',
            payload: {
              format: 'csv',
              sheets: [{
                name: currentSheet.name,
                headers: currentSheet.headers,
                rows: currentSheet.rows
              }],
              fileName
            }
          },
          (progress, status) => {
            setGenProgress(progress);
            setGenStatusText(`⚡ [Web Worker] ${status}`);
          }
        );

        if (res?.buffer) {
          const blob = new Blob([res.buffer], { type: res.mimeType });
          saveAs(blob, res.fileName || fileName);
          setIsGeneratingData(false);
          setStatusMessage(`⚡ Exported CSV successfully!`);
        }
      } else {
        const fullData = [currentSheet.headers, ...currentSheet.rows];
        const ws = XLSX.utils.aoa_to_sheet(fullData);
        const csvStr = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, fileName);
        setIsGeneratingData(false);
        setStatusMessage(`Exported CSV successfully!`);
      }
    } catch (err: any) {
      console.error('CSV Export failed:', err);
      setIsGeneratingData(false);
      setStatusMessage('CSV Export failed.');
    }
  };

  // Quick AutoSum Calculation for selected column
  const handleAutoSum = (func: 'SUM' | 'AVERAGE' | 'COUNT' | 'MAX' | 'MIN') => {
    const c = selectedCell.col;
    let sum = 0;
    let count = 0;
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < currentSheet.rows.length; i++) {
      const val = Number(currentSheet.rows[i]?.[c]);
      if (!isNaN(val)) {
        sum += val;
        count++;
        if (val < min) min = val;
        if (val > max) max = val;
      }
    }

    if (count === 0) {
      setStatusMessage(`Column "${currentSheet.headers[c] || getColLetter(c)}" has no numeric data.`);
      return;
    }

    let result = 0;
    if (func === 'SUM') result = sum;
    if (func === 'AVERAGE') result = parseFloat((sum / count).toFixed(2));
    if (func === 'COUNT') result = count;
    if (func === 'MAX') result = max;
    if (func === 'MIN') result = min;

    setStatusMessage(`📊 ${func} of Column ${currentSheet.headers[c] || getColLetter(c)}: ${result.toLocaleString()}`);
  };

  // Sheet Row & Column Manipulation Actions
  const handleInsertRowAbove = () => {
    pushUndoState();
    const targetIdx = selectedCell.row;
    setSheets(prev => {
      const next = [...prev];
      const sh = { ...next[activeSheetIndex] };
      const emptyRow = new Array(sh.headers.length).fill('');
      const newRows = [...sh.rows];
      newRows.splice(targetIdx, 0, emptyRow);
      sh.rows = newRows;
      next[activeSheetIndex] = sh;
      return next;
    });
    setStatusMessage(`Inserted new row above Row #${targetIdx + 1}`);
  };

  const handleInsertRowBelow = () => {
    pushUndoState();
    const targetIdx = selectedCell.row + 1;
    setSheets(prev => {
      const next = [...prev];
      const sh = { ...next[activeSheetIndex] };
      const emptyRow = new Array(sh.headers.length).fill('');
      const newRows = [...sh.rows];
      newRows.splice(targetIdx, 0, emptyRow);
      sh.rows = newRows;
      next[activeSheetIndex] = sh;
      return next;
    });
    setStatusMessage(`Inserted new row below Row #${targetIdx}`);
  };

  const handleDeleteSelectedRows = () => {
    const { startRow, endRow } = selectionRange;
    const minR = Math.min(startRow, endRow);
    const maxR = Math.max(startRow, endRow);

    pushUndoState();

    setSheets(prev => {
      const next = [...prev];
      const sh = { ...next[activeSheetIndex] };
      const newRows = sh.rows.filter((_, idx) => idx < minR || idx > maxR);
      sh.rows = newRows.length > 0 ? newRows : [new Array(sh.headers.length).fill('')];
      next[activeSheetIndex] = sh;
      return next;
    });

    setSelectedCell({ row: Math.max(0, minR - 1), col: 0 });
    setSelectionRange({ startRow: Math.max(0, minR - 1), endRow: Math.max(0, minR - 1), startCol: 0, endCol: 0 });
    setStatusMessage(`Deleted ${maxR - minR + 1} row(s).`);
  };

  const handleExportCommentsJSON = () => {
    let allComments: Array<{ sheet: string; coordinate: string; row: number; col: string; comment: string }> = [];

    sheets.forEach(sh => {
      const styles = sh.cellStyles || {};
      Object.entries(styles).forEach(([key, st]) => {
        const style = st as CellStyle;
        if (style && style.comment) {
          const parts = key.split('_');
          const r = parseInt(parts[0], 10);
          const c = parseInt(parts[1], 10);
          const coord = `${getColLetter(c)}${r + 1}`;
          allComments.push({
            sheet: sh.name,
            coordinate: coord,
            row: r + 1,
            col: getColLetter(c),
            comment: style.comment
          });
        }
      });
    });

    if (allComments.length === 0) {
      setStatusMessage('No comments found in any worksheet to export.');
      return;
    }

    const jsonStr = JSON.stringify(allComments, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    saveAs(blob, `Spreadsheet_Comments_Report_${Date.now()}.json`);
    setStatusMessage(`Exported ${allComments.length} comments to JSON report successfully!`);
  };

  const handleExportCommentsCSV = () => {
    let rows: string[][] = [['Sheet Name', 'Cell Coordinate', 'Row', 'Column', 'Comment Text']];

    sheets.forEach(sh => {
      const styles = sh.cellStyles || {};
      Object.entries(styles).forEach(([key, st]) => {
        const style = st as CellStyle;
        if (style && style.comment) {
          const parts = key.split('_');
          const r = parseInt(parts[0], 10);
          const c = parseInt(parts[1], 10);
          const coord = `${getColLetter(c)}${r + 1}`;
          rows.push([
            sh.name,
            coord,
            String(r + 1),
            getColLetter(c),
            `"${style.comment.replace(/"/g, '""')}"`
          ]);
        }
      });
    });

    if (rows.length <= 1) {
      setStatusMessage('No comments found in any worksheet to export.');
      return;
    }

    const csvContent = rows.map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `Spreadsheet_Comments_Report_${Date.now()}.csv`);
    setStatusMessage(`Exported comments to CSV report successfully!`);
  };

  const handleOpenCommentModal = (row: number, col: number) => {
    setCommentTargetCell({ row, col });
    const cellKey = `${row}_${col}`;
    const existingComment = currentSheet.cellStyles?.[cellKey]?.comment || '';
    setActiveCommentText(existingComment);
    setShowCommentModal(true);
  };

  const handleSaveComment = () => {
    if (!commentTargetCell) return;
    pushUndoState();
    const { row, col } = commentTargetCell;
    const cellKey = `${row}_${col}`;

    setSheets(prev => {
      const next = [...prev];
      const sh = { ...next[activeSheetIndex] };
      const newStyles = { ...(sh.cellStyles || {}) };
      const currentCellStyle = newStyles[cellKey] || {};

      if (activeCommentText.trim() === '') {
        delete currentCellStyle.comment;
      } else {
        currentCellStyle.comment = activeCommentText.trim();
      }

      newStyles[cellKey] = currentCellStyle;
      sh.cellStyles = newStyles;
      next[activeSheetIndex] = sh;
      return next;
    });

    setShowCommentModal(false);
    setStatusMessage(`Saved comment on cell ${getColLetter(col)}${row + 1}`);
  };

  const handleInsertColumn = (position: 'left' | 'right') => {
    pushUndoState();
    const targetCol = position === 'left' ? selectedCell.col : selectedCell.col + 1;
    setSheets(prev => {
      const next = [...prev];
      const sh = { ...next[activeSheetIndex] };
      const newColLetter = getColLetter(sh.headers.length);
      const newHeaders = [...sh.headers];
      newHeaders.splice(targetCol, 0, `Col_${newColLetter}`);
      
      const newWidths = [...sh.columnWidths];
      newWidths.splice(targetCol, 0, DEFAULT_COL_WIDTH);

      const newRows = sh.rows.map(r => {
        const rowCopy = [...r];
        rowCopy.splice(targetCol, 0, '');
        return rowCopy;
      });

      sh.headers = newHeaders;
      sh.columnWidths = newWidths;
      sh.columns = newHeaders.map((_, i) => getColLetter(i));
      sh.rows = newRows;
      next[activeSheetIndex] = sh;
      return next;
    });
    setStatusMessage(`Inserted new column at position ${getColLetter(targetCol)}`);
  };

  const handleDeleteSelectedColumns = () => {
    const { startCol, endCol } = selectionRange;
    const minC = Math.min(startCol, endCol);
    const maxC = Math.max(startCol, endCol);

    if (currentSheet.headers.length <= 1) {
      setStatusMessage('Cannot delete the only column in sheet.');
      return;
    }

    pushUndoState();

    setSheets(prev => {
      const next = [...prev];
      const sh = { ...next[activeSheetIndex] };
      const newHeaders = sh.headers.filter((_, idx) => idx < minC || idx > maxC);
      const newWidths = sh.columnWidths.filter((_, idx) => idx < minC || idx > maxC);
      const newRows = sh.rows.map(r => r.filter((_, idx) => idx < minC || idx > maxC));

      sh.headers = newHeaders;
      sh.columnWidths = newWidths;
      sh.columns = newHeaders.map((_, i) => getColLetter(i));
      sh.rows = newRows;
      next[activeSheetIndex] = sh;
      return next;
    });

    setSelectedCell({ row: 0, col: Math.max(0, minC - 1) });
    setSelectionRange({ startRow: 0, endRow: 0, startCol: Math.max(0, minC - 1), endCol: Math.max(0, minC - 1) });
    setStatusMessage(`Deleted ${maxC - minC + 1} column(s).`);
  };

  // Sheet Management & Auto-Save Reset
  const handleClearAutoSave = useCallback(() => {
    try {
      localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear auto-save from localStorage:', e);
    }
    const blankSheet: SheetData = {
      id: `sheet_${Date.now()}`,
      name: 'Sheet1',
      columns: Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)),
      headers: Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)),
      rows: Array.from({ length: 100 }, () => Array(26).fill('')),
      columnWidths: Array(26).fill(DEFAULT_COL_WIDTH),
      cellStyles: {}
    };
    setSheets([blankSheet]);
    setActiveSheetIndex(0);
    setColumnFilters({});
    setSelectedCell({ row: 0, col: 0 });
    setSelectionRange({ startRow: 0, endRow: 0, startCol: 0, endCol: 0 });
    setSelectionMode('cell');
    setAutoSaveStatus('saved');
    setLastAutoSavedAt(new Date());
    setStatusMessage('Auto-saved browser data cleared and reset to fresh blank spreadsheet.');
  }, []);

  const handleNewBlankSpreadsheet = () => {
    const blankSheet: SheetData = {
      id: `sheet_${Date.now()}`,
      name: 'Sheet1',
      columns: Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)),
      headers: Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)),
      rows: Array.from({ length: 100 }, () => Array(26).fill('')),
      columnWidths: Array(26).fill(DEFAULT_COL_WIDTH),
      cellStyles: {}
    };
    setSheets([blankSheet]);
    setActiveSheetIndex(0);
    setColumnFilters({});
    setSelectedCell({ row: 0, col: 0 });
    setSelectionRange({ startRow: 0, endRow: 0, startCol: 0, endCol: 0 });
    setSelectionMode('cell');
    setStatusMessage('Created new completely blank Excel spreadsheet.');
  };

  const handleAddSheet = () => {
    addSheetRef.current = handleAddSheet;
    const newIdx = sheets.length + 1;
    const newSheet: SheetData = {
      id: `sheet_${Date.now()}`,
      name: `Sheet${newIdx}`,
      columns: Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)),
      headers: Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)),
      rows: Array.from({ length: 100 }, () => Array(26).fill('')),
      columnWidths: Array(26).fill(DEFAULT_COL_WIDTH),
      cellStyles: {}
    };
    setSheets([...sheets, newSheet]);
    setActiveSheetIndex(sheets.length);
    setColumnFilters({});
    setStatusMessage(`Created new blank worksheet "Sheet${newIdx}"`);
  };

  const handleRenameSheet = (idx: number) => {
    const currentName = sheets[idx].name;
    const newName = window.prompt(`Rename worksheet "${currentName}" to:`, currentName);
    if (newName && newName.trim() !== '') {
      pushUndoState();
      setSheets(prev => {
        const next = [...prev];
        next[idx] = { ...next[idx], name: newName.trim() };
        return next;
      });
      setStatusMessage(`Renamed worksheet to "${newName.trim()}"`);
    }
  };

  const handleDeleteSheet = (idx: number) => {
    if (sheets.length <= 1) {
      setStatusMessage('Cannot delete the last remaining worksheet.');
      return;
    }
    const sheetName = sheets[idx].name;
    if (window.confirm(`Are you sure you want to delete worksheet "${sheetName}"?`)) {
      pushUndoState();
      setSheets(prev => {
        const next = prev.filter((_, i) => i !== idx);
        return next;
      });
      setActiveSheetIndex(prev => Math.max(0, prev >= idx ? prev - 1 : prev));
      setStatusMessage(`Deleted worksheet "${sheetName}"`);
    }
  };

  // Format Cell Helper
  const formatCellValue = (val: string | number | undefined, colIdx: number): string => {
    if (val === undefined || val === null || val === '') return '';
    if (typeof val === 'number') {
      const header = currentSheet.headers[colIdx]?.toLowerCase() || '';
      if (header.includes('price') || header.includes('amount') || header.includes('salary') || header.includes('total')) {
        return `₹${val.toLocaleString()}`;
      }
      return val.toLocaleString();
    }
    return String(val);
  };

  // Analytics Selection Aggregates - Multi-Cell Aware
  const selectionMetrics = useMemo(() => {
    let sum = 0;
    let count = 0;
    let numCount = 0;
    let min = Infinity;
    let max = -Infinity;

    const { startRow, endRow, startCol, endCol } = selectionRange;
    const rStart = Math.max(0, Math.min(startRow, endRow));
    const rEnd = Math.min(currentSheet.rows.length - 1, Math.max(startRow, endRow));
    const cStart = Math.max(0, Math.min(startCol, endCol));
    const cEnd = Math.min(currentSheet.headers.length - 1, Math.max(startCol, endCol));

    const maxScanRows = Math.min(rEnd, rStart + 10000);
    const totalSelectedCells = (rEnd - rStart + 1) * (cEnd - cStart + 1);

    for (let r = rStart; r <= maxScanRows; r++) {
      const row = currentSheet.rows[r];
      if (!row) continue;
      for (let c = cStart; c <= cEnd; c++) {
        count++;
        const rawVal = row[c];
        const v = Number(rawVal);
        if (!isNaN(v) && rawVal !== '' && rawVal !== null && rawVal !== undefined) {
          sum += v;
          numCount++;
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
    }

    const avg = numCount > 0 ? (sum / numCount).toFixed(2) : 0;

    return {
      count: totalSelectedCells,
      numericCount: numCount,
      sum: sum.toLocaleString(),
      avg: Number(avg).toLocaleString(),
      min: min === Infinity ? 0 : min.toLocaleString(),
      max: max === -Infinity ? 0 : max.toLocaleString()
    };
  }, [selectionRange, currentSheet.rows, currentSheet.headers.length]);

  // Dynamic Chart Data Generator
  const chartData = useMemo(() => {
    if (currentSheet.rows.length === 0) return [];
    const map = new Map<string, number>();
    const limit = Math.min(5000, currentSheet.rows.length);

    for (let i = 0; i < limit; i++) {
      const xKey = String(currentSheet.rows[i]?.[chartXCol] || 'Other');
      const yVal = Number(currentSheet.rows[i]?.[chartYCol]) || 0;
      map.set(xKey, (map.get(xKey) || 0) + yVal);
    }

    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).slice(0, 10);
  }, [currentSheet.rows, chartXCol, chartYCol]);

  return (
    <div 
      ref={workstationRef}
      id="excel-editor-workstation" 
      className={`flex flex-col bg-slate-100 dark:bg-[#070b14] overflow-hidden animate-fade-in font-sans select-none relative transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen rounded-none border-0 shadow-none m-0'
          : 'h-[calc(100vh-130px)] min-h-[660px] border border-slate-300 dark:border-white/10 rounded-2xl shadow-2xl'
      }`}
    >
      
      {/* Top Application Header Bar */}
      <div id="excel-title-bar" className="bg-[#107c41] text-white px-4 py-2 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          {onBackToTools && (
            <button
              onClick={onBackToTools}
              className="p-1 rounded-lg hover:bg-white/20 transition-colors text-white cursor-pointer"
              title="Back to Tools"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-1.5 rounded-lg shadow-xs">
              <FileSpreadsheet className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-white">Excel Pro</span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-emerald-700 text-emerald-100 flex items-center gap-1 border border-emerald-500/40">
                  <Cpu className="h-3 w-3 text-emerald-300" />
                  Web Worker Active
                </span>
                {isFullscreen && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-amber-400 text-slate-950 flex items-center gap-1 shadow-xs animate-fade-in">
                    <Maximize2 className="h-2.5 w-2.5" />
                    Fullscreen View
                  </span>
                )}
              </div>
              <span className="text-[11px] text-emerald-100 font-medium hidden sm:inline">
                {currentSheet.name} • {currentSheet.rows.length.toLocaleString()} Rows in Memory ({ (currentSheet.rows.length / 100000).toFixed(2) } Lakhs)
              </span>
            </div>
          </div>
        </div>

        {/* Top Quick Actions */}
        <div className="flex items-center gap-2">
          {/* Fullscreen Viewport Mode Toggle */}
          <button
            id="excel-fullscreen-toggle-btn"
            onClick={toggleFullscreen}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
              isFullscreen
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold border border-amber-300'
                : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Expand to Fullscreen Viewport for better data entry focus'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5 text-slate-950" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5 text-white" />
            )}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>

          {/* AutoSave Status Pill */}
          <div className="flex items-center gap-1.5 bg-black/20 dark:bg-black/40 border border-white/20 px-2 py-1 rounded-lg text-xs font-semibold select-none shadow-xs">
            <button
              onClick={() => {
                const nextState = !autoSaveEnabled;
                setAutoSaveEnabled(nextState);
                if (nextState) {
                  performSaveToStorage(sheets, activeSheetIndex, namedRanges, sheetTheme);
                }
                setStatusMessage(`Auto-save ${nextState ? 'enabled & saved to browser storage' : 'disabled'}.`);
              }}
              className="flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
              title={
                autoSaveEnabled
                  ? `AutoSave is Active (saving all changes to browser localStorage). Last saved: ${
                      lastAutoSavedAt ? lastAutoSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'just now'
                    }. Click to toggle.`
                  : 'AutoSave is OFF. Click to enable.'
              }
            >
              {autoSaveStatus === 'saving' ? (
                <RefreshCw className="h-3.5 w-3.5 text-amber-300 animate-spin" />
              ) : autoSaveStatus === 'saved' ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
              ) : autoSaveStatus === 'error' ? (
                <AlertCircle className="h-3.5 w-3.5 text-rose-300" />
              ) : (
                <Cloud className="h-3.5 w-3.5 text-slate-300 opacity-60" />
              )}

              <span className="text-white text-[11px] font-medium tracking-tight flex items-center gap-1">
                <span>AutoSave:</span>
                <span
                  className={`font-bold ${
                    autoSaveEnabled
                      ? autoSaveStatus === 'saving'
                        ? 'text-amber-200'
                        : 'text-emerald-200'
                      : 'text-slate-300'
                  }`}
                >
                  {autoSaveEnabled ? (autoSaveStatus === 'saving' ? 'Saving...' : 'On') : 'Off'}
                </span>
              </span>
            </button>

            <div className="w-px h-3.5 bg-white/20 mx-0.5" />

            <button
              onClick={() => {
                const success = performSaveToStorage(sheets, activeSheetIndex, namedRanges, sheetTheme);
                if (success) {
                  setStatusMessage(`Saved spreadsheet to browser storage at ${new Date().toLocaleTimeString()}!`);
                }
              }}
              className="text-white/80 hover:text-white hover:bg-white/20 p-1 rounded transition-colors cursor-pointer"
              title="Force Save to Browser Storage Now"
            >
              <Save className="h-3 w-3" />
            </button>
          </div>

          <button
            onClick={() => {
              const r = selectedCell.row;
              const c = selectedCell.col;
              handleOpenCommentModal(r, c);
            }}
            className="px-2.5 py-1 rounded-md bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Comments"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Comments</span>
          </button>

          <button
            onClick={() => setStatusMessage('💡 Catch up: All sheet changes and formulas are synchronized in real-time.')}
            className="px-2.5 py-1 rounded-md bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Catch up"
          >
            <Activity className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Catch up</span>
          </button>

          <button
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              setStatusMessage('📋 Spreadsheet link copied to clipboard for sharing!');
            }}
            className="px-3 py-1 rounded-md bg-white text-[#107c41] hover:bg-emerald-50 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            title="Share"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Share</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.tsv"
            className="hidden"
            onChange={handleFileUpload}
          />

          <button
            onClick={handleNewBlankSpreadsheet}
            className="px-2.5 py-1 rounded-md bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Create a fresh blank spreadsheet"
          >
            <FilePlus className="h-3.5 w-3.5" />
            <span className="hidden md:inline">New</span>
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 rounded-md bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Open</span>
          </button>

          <button
            onClick={handleExportXLSX}
            className="px-2.5 py-1 rounded-md bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Save</span>
          </button>

          <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-md border border-white/20">
            <button
              onClick={handleExportCommentsJSON}
              className="px-1.5 py-0.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[10px] transition-colors"
              title="Export Comments JSON"
            >
              JSON
            </button>
            <button
              onClick={handleExportCommentsCSV}
              className="px-1.5 py-0.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[10px] transition-colors"
              title="Export Comments CSV"
            >
              CSV
            </button>
          </div>
        </div>
      </div>

      {/* MS Excel / Google Sheets Menu Bar */}
      <div id="excel-menu-bar" className="bg-[#107c41] text-white px-2 flex items-center gap-0.5 text-xs font-semibold shrink-0 border-t border-emerald-600">
        {(['home', 'insert', 'formulas', 'data', 'view', 'file'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveRibbonTab(tab)}
            className={`px-3 py-1.5 rounded-t-md capitalize transition-colors cursor-pointer ${
              activeRibbonTab === tab
                ? 'bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white font-bold shadow-xs'
                : 'text-emerald-100 hover:bg-white/10'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* MS Excel / Google Sheets Quick Actions Toolbar (as shown in user's image) */}
      <div id="excel-ribbon-toolbar" className="relative z-30 bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-white/10 px-3 py-1.5 shrink-0 flex items-center gap-2 text-xs overflow-visible">
        
        {/* Backdrop to close active dropdowns on click outside */}
        {(openFormulasDropdown !== null || openInsertDropdown !== null) && (
          <div
            className="fixed inset-0 z-40 bg-transparent cursor-default"
            onClick={() => {
              setOpenFormulasDropdown(null);
              setOpenInsertDropdown(null);
            }}
          />
        )}
        
        {activeRibbonTab === 'insert' ? (
          /* INSERT TAB RIBBON TOOLBAR (Matching MS Excel 365 / Screenshot) */
          <div className="flex items-center gap-3 py-0.5 text-xs select-none w-full shrink-0 overflow-visible flex-wrap sm:flex-nowrap">
            {/* 1. PivotTable (with dropdown) */}
            <div className="relative z-50">
              <button
                onClick={() => setOpenInsertDropdown(prev => prev === 'pivottable' ? null : 'pivottable')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold transition-colors cursor-pointer"
                title="Insert PivotTable"
              >
                <TableProperties className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>PivotTable</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {openInsertDropdown === 'pivottable' && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl z-50 py-1 text-xs">
                  <button
                    onClick={() => {
                      setOpenInsertDropdown(null);
                      setShowPivotModal(true);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 font-medium text-slate-700 dark:text-zinc-200 cursor-pointer"
                  >
                    From Table / Range
                  </button>
                  <button
                    onClick={() => {
                      setOpenInsertDropdown(null);
                      setShowPivotModal(true);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 font-medium text-slate-700 dark:text-zinc-200 cursor-pointer"
                  >
                    Recommended PivotTables
                  </button>
                </div>
              )}
            </div>

            {/* 2. Table */}
            <button
              onClick={handleInsertTable}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold transition-colors cursor-pointer"
              title="Create / format selected range as Table (Ctrl+T)"
            >
              <TableIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Table</span>
            </button>

            {/* 3. Forms (with dropdown) */}
            <div className="relative">
              <button
                onClick={() => setOpenInsertDropdown(prev => prev === 'forms' ? null : 'forms')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold transition-colors cursor-pointer"
                title="Forms"
              >
                <ClipboardList className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <span>Forms</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {openInsertDropdown === 'forms' && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 py-1 text-xs">
                  <button
                    onClick={() => {
                      setOpenInsertDropdown(null);
                      setShowFormModal(true);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 font-medium text-slate-700 dark:text-zinc-200 cursor-pointer"
                  >
                    New Entry Form
                  </button>
                </div>
              )}
            </div>

            {/* 4. Pictures (with dropdown) */}
            <div className="relative">
              <button
                onClick={() => setOpenInsertDropdown(prev => prev === 'pictures' ? null : 'pictures')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold transition-colors cursor-pointer"
                title="Insert Pictures"
              >
                <ImageIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Pictures</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {openInsertDropdown === 'pictures' && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 py-1 text-xs">
                  <button
                    onClick={() => {
                      setOpenInsertDropdown(null);
                      fileInputRef.current?.click();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 font-medium text-slate-700 dark:text-zinc-200 cursor-pointer"
                  >
                    This Device...
                  </button>
                </div>
              )}
            </div>

            {/* 5. Shapes (with dropdown) */}
            <div className="relative">
              <button
                onClick={() => setOpenInsertDropdown(prev => prev === 'shapes' ? null : 'shapes')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold transition-colors cursor-pointer"
                title="Insert Shapes"
              >
                <Shapes className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                <span>Shapes</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {openInsertDropdown === 'shapes' && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 py-1 text-xs">
                  {['Rectangle', 'Rounded Rectangle', 'Circle', 'Right Arrow', 'Callout Box'].map(shape => (
                    <button
                      key={shape}
                      onClick={() => {
                        setOpenInsertDropdown(null);
                        handleInsertShape(shape);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 font-medium text-slate-700 dark:text-zinc-200 cursor-pointer"
                    >
                      {shape}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 6. Checkbox */}
            <button
              onClick={handleInsertCheckbox}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold transition-colors cursor-pointer"
              title="Insert Checkbox into cell"
            >
              <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Checkbox</span>
            </button>

            {/* 7. Chart Group (Framed Container matching screenshot) */}
            <div className="flex items-center border border-slate-200 dark:border-zinc-700 rounded-xl bg-slate-50/80 dark:bg-zinc-800/60 p-1 gap-1">
              <button
                onClick={() => { setChartType('bar'); setShowChartModal(true); }}
                className="p-1 rounded hover:bg-white dark:hover:bg-zinc-700 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                title="Column Chart"
              >
                <BarChart3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setChartType('line'); setShowChartModal(true); }}
                className="p-1 rounded hover:bg-white dark:hover:bg-zinc-700 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                title="Line Chart"
              >
                <LineChart className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setChartType('area'); setShowChartModal(true); }}
                className="p-1 rounded hover:bg-white dark:hover:bg-zinc-700 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                title="Scatter / Dot Plot"
              >
                <Sparkles className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setChartType('pie'); setShowChartModal(true); }}
                className="p-1 rounded hover:bg-white dark:hover:bg-zinc-700 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                title="Pie Chart"
              >
                <PieChartIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setChartType('bar'); setShowChartModal(true); }}
                className="p-1 rounded hover:bg-white dark:hover:bg-zinc-700 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                title="Horizontal Bar Chart"
              >
                <BarChart2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setChartType('bar'); setShowChartModal(true); }}
                className="p-1 rounded hover:bg-white dark:hover:bg-zinc-700 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                title="Clustered Column Chart"
              >
                <BarChart className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setChartType('line'); setShowChartModal(true); }}
                className="p-1 rounded hover:bg-white dark:hover:bg-zinc-700 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                title="Combo Chart"
              >
                <TrendingUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowChartModal(true)}
                className="p-1 rounded hover:bg-white dark:hover:bg-zinc-700 text-slate-500 transition-colors cursor-pointer"
                title="Chart Options Dropdown"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>

            {/* 8. Slicer */}
            <button
              onClick={handleInsertSlicer}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold transition-colors cursor-pointer"
              title="Insert Data Slicer"
            >
              <Sliders className="h-4 w-4 text-slate-500 dark:text-zinc-400" />
              <span>Slicer</span>
            </button>

            {/* 9. Link */}
            <button
              onClick={handleInsertLink}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold transition-colors cursor-pointer"
              title="Insert Hyperlink"
            >
              <LinkIcon className="h-4 w-4 text-slate-600 dark:text-zinc-300" />
              <span>Link</span>
            </button>

            {/* 10. New Comment */}
            <button
              onClick={() => handleOpenCommentModal(selectedCell.row, selectedCell.col)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold transition-colors cursor-pointer"
              title="Insert New Comment or Note"
            >
              <MessageSquarePlus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>New Comment</span>
            </button>

            {/* 11. Text Box */}
            <button
              onClick={handleInsertTextBox}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold transition-colors cursor-pointer"
              title="Insert Text Box Note"
            >
              <Type className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Text Box</span>
            </button>
          </div>
        ) : activeRibbonTab === 'formulas' ? (
          /* FORMULAS TAB RIBBON TOOLBAR (Matching MS Excel 365 / Screenshot) */
          <div className="flex items-center gap-2.5 py-0.5 text-xs select-none w-full shrink-0 overflow-visible flex-wrap sm:flex-nowrap">
            {/* 1. Insert Function */}
            <button
              onClick={() => setShowInsertFunctionModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold transition-colors cursor-pointer"
              title="Insert Function (Shift+F3)"
            >
              <span className="font-serif italic font-bold text-sm text-emerald-700 dark:text-emerald-400">fₓ</span>
              <span>Insert Function</span>
            </button>

            {/* 2. AutoSum (Dropdown) */}
            <div className="relative z-50">
              <button
                onClick={() => setOpenFormulasDropdown(prev => prev === 'autosum' ? null : 'autosum')}
                className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold transition-colors cursor-pointer"
                title="AutoSum"
              >
                <Sigma className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {openFormulasDropdown === 'autosum' && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md shadow-2xl z-50 py-1 text-xs max-h-96 overflow-y-auto font-sans">
                  {[
                    { name: 'Sum', code: 'SUM' },
                    { name: 'Average', code: 'AVERAGE' },
                    { name: 'Count Numbers', code: 'COUNT' },
                    { name: 'Max', code: 'MAX' },
                    { name: 'Min', code: 'MIN' },
                  ].map(item => (
                    <button
                      key={item.code}
                      onClick={() => {
                        handleInsertFunctionFormula(item.code);
                        setOpenFormulasDropdown(null);
                      }}
                      className="w-full text-left px-3.5 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 font-medium text-slate-800 dark:text-zinc-100 cursor-pointer flex items-center justify-between"
                    >
                      <span className="uppercase tracking-wide">{item.name}</span>
                      <span className="font-mono text-[10px] text-slate-400">{item.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Financial Dropdown [$] */}
            <div className="relative z-50">
              <button
                onClick={() => setOpenFormulasDropdown(prev => prev === 'financial' ? null : 'financial')}
                className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold transition-colors cursor-pointer"
                title="Financial Functions"
              >
                <div className="w-5 h-5 rounded bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center font-bold text-emerald-700 dark:text-emerald-300 text-xs">
                  $
                </div>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {openFormulasDropdown === 'financial' && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md shadow-2xl z-50 py-1 text-xs max-h-96 overflow-y-auto font-sans">
                  {[
                    'ACCRINT', 'ACCRINTM', 'AMORLINC', 'COUPDAYBS', 'COUPDAYS', 'COUPDAYSNC',
                    'COUPNCD', 'COUPNUM', 'COUPPCD', 'CUMIPMT', 'CUMPRINC', 'DB', 'DDB', 'DISC',
                    'DOLLARDE', 'DOLLARFR', 'DURATION', 'EFFECT', 'FV', 'IPMT', 'IRR', 'MIRR',
                    'NPER', 'NPV', 'PMT', 'PPMT', 'PV', 'RATE', 'SLN', 'SYD', 'VDB', 'XIRR', 'XNPV', 'YIELD'
                  ].map(fn => (
                    <button
                      key={fn}
                      onClick={() => {
                        handleInsertFunctionFormula(fn);
                        setOpenFormulasDropdown(null);
                      }}
                      className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 font-medium text-slate-800 dark:text-zinc-100 uppercase tracking-wide cursor-pointer flex items-center justify-between"
                    >
                      <span>{fn}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Logical Dropdown [?] */}
            <div className="relative z-50">
              <button
                onClick={() => setOpenFormulasDropdown(prev => prev === 'logical' ? null : 'logical')}
                className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold transition-colors cursor-pointer"
                title="Logical Functions"
              >
                <div className="w-5 h-5 rounded bg-purple-100 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-700 flex items-center justify-center font-bold text-purple-700 dark:text-purple-300 text-xs">
                  ?
                </div>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {openFormulasDropdown === 'logical' && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md shadow-2xl z-50 py-1 text-xs max-h-96 overflow-y-auto font-sans">
                  {['AND', 'BYROW', 'BYCOL', 'FALSE', 'IF', 'IFERROR', 'IFNA', 'IFS', 'MAP', 'NOT', 'OR', 'REDUCE', 'SCAN', 'SWITCH', 'TRUE', 'XOR'].map(fn => (
                    <button
                      key={fn}
                      onClick={() => {
                        handleInsertFunctionFormula(fn);
                        setOpenFormulasDropdown(null);
                      }}
                      className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 font-medium text-slate-800 dark:text-zinc-100 uppercase tracking-wide cursor-pointer flex items-center justify-between"
                    >
                      <span>{fn}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 5. Text Dropdown [A] */}
            <div className="relative z-50">
              <button
                onClick={() => setOpenFormulasDropdown(prev => prev === 'text' ? null : 'text')}
                className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold transition-colors cursor-pointer"
                title="Text Functions"
              >
                <div className="w-5 h-5 rounded bg-blue-100 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-700 flex items-center justify-center font-bold text-blue-700 dark:text-blue-300 text-xs">
                  A
                </div>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {openFormulasDropdown === 'text' && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md shadow-2xl z-50 py-1 text-xs max-h-96 overflow-y-auto font-sans">
                  {[
                    'ASC', 'CHAR', 'CLEAN', 'CODE', 'CONCAT', 'CONCATENATE', 'DOLLAR', 'EXACT',
                    'FIND', 'FIXED', 'LEFT', 'LEN', 'LOWER', 'MID', 'NUMBERVALUE', 'PROPER',
                    'REPLACE', 'REPT', 'RIGHT', 'SEARCH', 'SUBSTITUTE', 'TEXT', 'TEXTBEFORE', 'TEXTAFTER', 'TEXTJOIN', 'TEXTSPLIT', 'TRIM', 'UPPER', 'VALUE'
                  ].map(fn => (
                    <button
                      key={fn}
                      onClick={() => {
                        handleInsertFunctionFormula(fn);
                        setOpenFormulasDropdown(null);
                      }}
                      className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 font-medium text-slate-800 dark:text-zinc-100 uppercase tracking-wide cursor-pointer flex items-center justify-between"
                    >
                      <span>{fn}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 6. Date & Time Dropdown [🕒] */}
            <div className="relative z-50">
              <button
                onClick={() => setOpenFormulasDropdown(prev => prev === 'datetime' ? null : 'datetime')}
                className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold transition-colors cursor-pointer"
                title="Date & Time Functions"
              >
                <div className="w-5 h-5 rounded bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 flex items-center justify-center font-bold text-amber-700 dark:text-amber-300 text-xs">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {openFormulasDropdown === 'datetime' && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md shadow-2xl z-50 py-1 text-xs max-h-96 overflow-y-auto font-sans">
                  {[
                    'DATE', 'DATEVALUE', 'DAY', 'DAYS', 'DAYS360', 'EDATE', 'EOMONTH', 'HOUR',
                    'ISOWEEKNUM', 'MINUTE', 'MONTH', 'NETWORKDAYS', 'NOW', 'SECOND', 'TIME', 'TIMEVALUE', 'TODAY', 'WEEKDAY', 'WEEKNUM', 'WORKDAY', 'YEAR', 'YEARFRAC'
                  ].map(fn => (
                    <button
                      key={fn}
                      onClick={() => {
                        handleInsertFunctionFormula(fn);
                        setOpenFormulasDropdown(null);
                      }}
                      className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 font-medium text-slate-800 dark:text-zinc-100 uppercase tracking-wide cursor-pointer flex items-center justify-between"
                    >
                      <span>{fn}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 7. Lookup & Reference Dropdown [🔍] */}
            <div className="relative z-50">
              <button
                onClick={() => setOpenFormulasDropdown(prev => prev === 'lookup' ? null : 'lookup')}
                className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold transition-colors cursor-pointer"
                title="Lookup & Reference Functions"
              >
                <div className="w-5 h-5 rounded bg-cyan-100 dark:bg-cyan-950/60 border border-cyan-300 dark:border-cyan-700 flex items-center justify-center font-bold text-cyan-700 dark:text-cyan-300 text-xs">
                  <Search className="h-3.5 w-3.5" />
                </div>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {openFormulasDropdown === 'lookup' && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md shadow-2xl z-50 py-1 text-xs max-h-96 overflow-y-auto font-sans">
                  {[
                    'ADDRESS', 'CHOOSE', 'CHOOSECOLS', 'CHOOSEROWS', 'COLUMN', 'COLUMNS', 'DROP',
                    'HLOOKUP', 'HYPERLINK', 'INDEX', 'INDIRECT', 'LOOKUP', 'MATCH', 'OFFSET',
                    'ROW', 'ROWS', 'SORT', 'SORTBY', 'TAKE', 'TRANSPOSE', 'UNIQUE', 'VLOOKUP', 'XLOOKUP', 'XMATCH'
                  ].map(fn => (
                    <button
                      key={fn}
                      onClick={() => {
                        handleInsertFunctionFormula(fn);
                        setOpenFormulasDropdown(null);
                      }}
                      className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 font-medium text-slate-800 dark:text-zinc-100 uppercase tracking-wide cursor-pointer flex items-center justify-between"
                    >
                      <span>{fn}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 8. Math & Trig Dropdown [θ] */}
            <div className="relative z-50">
              <button
                onClick={() => setOpenFormulasDropdown(prev => prev === 'math' ? null : 'math')}
                className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold transition-colors cursor-pointer"
                title="Math & Trig Functions"
              >
                <div className="w-5 h-5 rounded bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center font-bold text-emerald-700 dark:text-emerald-300 text-xs">
                  θ
                </div>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {openFormulasDropdown === 'math' && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md shadow-2xl z-50 py-1 text-xs max-h-96 overflow-y-auto font-sans">
                  {[
                    'ABS', 'ACOS', 'ACOSH', 'ASIN', 'ASINH', 'ATAN', 'ATAN2', 'ATANH', 'CEILING',
                    'COMBIN', 'COS', 'COSH', 'DEGREES', 'EVEN', 'EXP', 'FACT', 'FLOOR', 'INT',
                    'LN', 'LOG', 'LOG10', 'MOD', 'MROUND', 'ODD', 'PI', 'POWER', 'PRODUCT', 'RADIANS',
                    'RAND', 'RANDBETWEEN', 'ROUND', 'ROUNDDOWN', 'ROUNDUP', 'SIGN', 'SIN', 'SINH', 'SQRT',
                    'SUM', 'SUMIF', 'SUMIFS', 'SUMPRODUCT', 'TAN', 'TANH', 'TRUNC'
                  ].map(fn => (
                    <button
                      key={fn}
                      onClick={() => {
                        handleInsertFunctionFormula(fn);
                        setOpenFormulasDropdown(null);
                      }}
                      className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 font-medium text-slate-800 dark:text-zinc-100 uppercase tracking-wide cursor-pointer flex items-center justify-between"
                    >
                      <span>{fn}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 9. More Functions Dropdown [...] */}
            <div className="relative z-50">
              <button
                onClick={() => setOpenFormulasDropdown(prev => prev === 'more' ? null : 'more')}
                className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold transition-colors cursor-pointer"
                title="More Functions"
              >
                <div className="w-5 h-5 rounded bg-slate-100 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 flex items-center justify-center font-bold text-slate-700 dark:text-zinc-300 text-xs">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </div>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {openFormulasDropdown === 'more' && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md shadow-2xl z-50 py-1 text-xs max-h-96 overflow-y-auto font-sans">
                  <div className="px-3 py-1 font-bold text-slate-400 text-[10px] uppercase">Statistical</div>
                  {['AVERAGE', 'AVERAGEIF', 'AVERAGEIFS', 'COUNT', 'COUNTA', 'COUNTBLANK', 'COUNTIF', 'COUNTIFS', 'MAX', 'MIN', 'MEDIAN', 'MODE', 'STDEV', 'VAR'].map(fn => (
                    <button
                      key={fn}
                      onClick={() => {
                        handleInsertFunctionFormula(fn);
                        setOpenFormulasDropdown(null);
                      }}
                      className="w-full text-left px-4 py-1 hover:bg-slate-100 dark:hover:bg-zinc-800 font-medium text-slate-800 dark:text-zinc-100 uppercase cursor-pointer"
                    >
                      {fn}
                    </button>
                  ))}
                  <div className="px-3 py-1 font-bold text-slate-400 text-[10px] uppercase border-t border-slate-100 dark:border-zinc-800 mt-1">Information</div>
                  {['CELL', 'ERROR.TYPE', 'INFO', 'ISBLANK', 'ISERR', 'ISERROR', 'ISEVEN', 'ISLOGICAL', 'ISNA', 'ISNONTEXT', 'ISNUMBER', 'ISODD', 'ISREF', 'ISTEXT', 'TYPE'].map(fn => (
                    <button
                      key={fn}
                      onClick={() => {
                        handleInsertFunctionFormula(fn);
                        setOpenFormulasDropdown(null);
                      }}
                      className="w-full text-left px-4 py-1 hover:bg-slate-100 dark:hover:bg-zinc-800 font-medium text-slate-800 dark:text-zinc-100 uppercase cursor-pointer"
                    >
                      {fn}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="h-5 w-px bg-slate-200 dark:bg-zinc-800 mx-0.5" />

            {/* 10. Name Manager */}
            <button
              onClick={() => setShowNameManagerModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold transition-colors cursor-pointer"
              title="Name Manager (Ctrl+F3)"
            >
              <Tag className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              <span>Name Manager</span>
            </button>

            {/* Divider */}
            <div className="h-5 w-px bg-slate-200 dark:bg-zinc-800 mx-0.5" />

            {/* 11. Show Formulae */}
            <button
              onClick={() => {
                setShowFormulae(prev => !prev);
                setStatusMessage(`Show Formulae mode toggled ${!showFormulae ? 'ON' : 'OFF'}.`);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                showFormulae
                  ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                  : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200'
              }`}
              title="Show Formulae (Ctrl+`)"
            >
              <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Show formulae</span>
            </button>

            {/* Divider */}
            <div className="h-5 w-px bg-slate-200 dark:bg-zinc-800 mx-0.5" />

            {/* 12. Calculation Options Dropdown */}
            <div className="relative z-50 flex items-center gap-1">
              <button
                onClick={() => setOpenFormulasDropdown(prev => prev === 'calcOptions' ? null : 'calcOptions')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-zinc-700"
                title="Calculation Options"
              >
                <Calculator className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Calculation Options</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                  {calcMode}
                </span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {openFormulasDropdown === 'calcOptions' && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md shadow-2xl z-50 py-1 text-xs">
                  {(['Automatic', 'Automatic Except Data Tables', 'Manual'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => {
                        setCalcMode(mode);
                        setOpenFormulasDropdown(null);
                        setStatusMessage(`Calculation options set to "${mode}"`);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 font-medium text-slate-700 dark:text-zinc-200 cursor-pointer flex items-center justify-between"
                    >
                      <span>{mode}</span>
                      {calcMode === mode && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 13. Calculate Workbook */}
            <button
              onClick={() => {
                setStatusMessage(`Recalculated full workbook across ${sheets.length} sheets!`);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold transition-colors cursor-pointer"
              title="Calculate Workbook (F9)"
            >
              <Calculator className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Calculate Workbook</span>
            </button>

            {/* 14. Calculate Sheet */}
            <button
              onClick={() => {
                setStatusMessage(`Recalculated active sheet "${currentSheet.name}" (${currentSheet.rows.length} rows)`);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold transition-colors cursor-pointer"
              title="Calculate Sheet (Shift+F9)"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Calculate Sheet</span>
            </button>
          </div>
        ) : activeRibbonTab === 'view' ? (
          /* VIEW TAB RIBBON TOOLBAR */
          <div className="flex items-center gap-3 py-0.5 text-xs select-none w-full shrink-0 overflow-visible flex-wrap sm:flex-nowrap">
            {/* 1. Show / Hide Group */}
            <div className="flex items-center gap-2 pr-3 border-r border-slate-200 dark:border-zinc-800">
              <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mr-1">Show:</span>
              
              {/* Grid Lines Toggle Switch */}
              <button
                onClick={() => {
                  setShowGridlines(prev => !prev);
                  setStatusMessage(`Spreadsheet grid lines ${!showGridlines ? 'enabled' : 'hidden'}.`);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer select-none ${
                  showGridlines
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700/80 text-emerald-900 dark:text-emerald-200 shadow-xs'
                    : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400'
                }`}
                title="Toggle switch to show or hide spreadsheet grid lines for better data visibility"
              >
                <Grid className={`h-4 w-4 ${showGridlines ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                <span>Gridlines</span>
                
                {/* Switch Toggle Control */}
                <div className={`w-7 h-4 rounded-full p-0.5 transition-colors relative flex items-center ${showGridlines ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-zinc-700'}`}>
                  <div className={`w-3 h-3 rounded-full bg-white shadow-xs transition-transform transform ${showGridlines ? 'translate-x-3' : 'translate-x-0'}`} />
                </div>
              </button>

              {/* Formula Bar Toggle Switch */}
              <button
                onClick={() => {
                  setShowFormulaBar(prev => !prev);
                  setStatusMessage(`Formula bar ${!showFormulaBar ? 'shown' : 'hidden'}.`);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer select-none ${
                  showFormulaBar
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700/80 text-blue-900 dark:text-blue-200 shadow-xs'
                    : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400'
                }`}
                title="Show or hide the formula bar"
              >
                <Sliders className={`h-4 w-4 ${showFormulaBar ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                <span>Formula Bar</span>
                <div className={`w-7 h-4 rounded-full p-0.5 transition-colors relative flex items-center ${showFormulaBar ? 'bg-blue-600' : 'bg-slate-300 dark:bg-zinc-700'}`}>
                  <div className={`w-3 h-3 rounded-full bg-white shadow-xs transition-transform transform ${showFormulaBar ? 'translate-x-3' : 'translate-x-0'}`} />
                </div>
              </button>

              {/* Headings Toggle Switch */}
              <button
                onClick={() => {
                  setShowHeadings(prev => !prev);
                  setStatusMessage(`Row numbers & Column letters ${!showHeadings ? 'shown' : 'hidden'}.`);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer select-none ${
                  showHeadings
                    ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-700/80 text-purple-900 dark:text-purple-200 shadow-xs'
                    : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400'
                }`}
                title="Show or hide row numbers and column letters"
              >
                <TableProperties className={`h-4 w-4 ${showHeadings ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`} />
                <span>Headings</span>
                <div className={`w-7 h-4 rounded-full p-0.5 transition-colors relative flex items-center ${showHeadings ? 'bg-purple-600' : 'bg-slate-300 dark:bg-zinc-700'}`}>
                  <div className={`w-3 h-3 rounded-full bg-white shadow-xs transition-transform transform ${showHeadings ? 'translate-x-3' : 'translate-x-0'}`} />
                </div>
              </button>

              {/* Freeze Top Row Toggle Switch */}
              <button
                onClick={() => {
                  setFreezeHeader(prev => !prev);
                  setStatusMessage(`Freeze top row ${!freezeHeader ? 'enabled' : 'disabled'}.`);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer select-none ${
                  freezeHeader
                    ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700/80 text-amber-900 dark:text-amber-200 shadow-xs'
                    : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400'
                }`}
                title="Freeze or unfreeze top header row"
              >
                <Layers className={`h-4 w-4 ${freezeHeader ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
                <span>Freeze Top Row</span>
                <div className={`w-7 h-4 rounded-full p-0.5 transition-colors relative flex items-center ${freezeHeader ? 'bg-amber-600' : 'bg-slate-300 dark:bg-zinc-700'}`}>
                  <div className={`w-3 h-3 rounded-full bg-white shadow-xs transition-transform transform ${freezeHeader ? 'translate-x-3' : 'translate-x-0'}`} />
                </div>
              </button>

              {/* Freeze First Column Toggle Switch */}
              <button
                onClick={() => {
                  setFreezeFirstColumn(prev => !prev);
                  setStatusMessage(`Freeze first column ${!freezeFirstColumn ? 'enabled' : 'disabled'}.`);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer select-none ${
                  freezeFirstColumn
                    ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700/80 text-amber-900 dark:text-amber-200 shadow-xs'
                    : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400'
                }`}
                title="Freeze or unfreeze first column (Column A)"
              >
                <Columns className={`h-4 w-4 ${freezeFirstColumn ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
                <span>Freeze First Col</span>
                <div className={`w-7 h-4 rounded-full p-0.5 transition-colors relative flex items-center ${freezeFirstColumn ? 'bg-amber-600' : 'bg-slate-300 dark:bg-zinc-700'}`}>
                  <div className={`w-3 h-3 rounded-full bg-white shadow-xs transition-transform transform ${freezeFirstColumn ? 'translate-x-3' : 'translate-x-0'}`} />
                </div>
              </button>
            </div>

            {/* 2. Zoom Level Group */}
            <div className="flex items-center gap-2 pr-3 border-r border-slate-200 dark:border-zinc-800">
              <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Zoom:</span>
              <select
                value={zoomLevel}
                onChange={(e) => {
                  setZoomLevel(Number(e.target.value));
                  setStatusMessage(`Zoom level set to ${e.target.value}%.`);
                }}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg font-semibold text-slate-800 dark:text-zinc-200 outline-none cursor-pointer"
              >
                <option value={75}>75%</option>
                <option value={90}>90%</option>
                <option value={100}>100% (Normal)</option>
                <option value={125}>125%</option>
                <option value={150}>150%</option>
                <option value={200}>200%</option>
              </select>

              <button
                onClick={() => {
                  setZoomLevel(100);
                  setStatusMessage('Zoom reset to 100%.');
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-bold transition-colors cursor-pointer"
              >
                100%
              </button>
            </div>

            {/* 3. Formulae View */}
            <div className="flex items-center gap-2 pr-3 border-r border-slate-200 dark:border-zinc-800">
              <button
                onClick={() => {
                  setShowFormulae(prev => !prev);
                  setStatusMessage(`Show Formulae mode toggled ${!showFormulae ? 'ON' : 'OFF'}.`);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer ${
                  showFormulae
                    ? 'bg-blue-100 dark:bg-blue-950/80 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 shadow-xs'
                    : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100'
                }`}
                title="Show raw formula text in cells instead of evaluated results"
              >
                <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Show Formulae</span>
              </button>
            </div>

            {/* 4. Workbook Theme Selector */}
            <div className="flex items-center gap-1.5 pr-3 border-r border-slate-200 dark:border-zinc-800">
              <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Theme:</span>
              <select
                value={sheetTheme}
                onChange={(e) => {
                  setSheetTheme(e.target.value as any);
                  setStatusMessage(`Workbook theme changed to ${e.target.value}.`);
                }}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg font-semibold text-slate-800 dark:text-zinc-200 outline-none cursor-pointer"
              >
                <option value="excel_green">Excel Classic Green</option>
                <option value="dark">Dark Slate</option>
                <option value="slate">Classic Silver</option>
                <option value="blue">Ocean Blue</option>
              </select>
            </div>

            {/* 5. Fullscreen Viewport Mode Toggle */}
            <div className="flex items-center gap-1.5">
              <button
                id="ribbon-view-fullscreen-btn"
                onClick={toggleFullscreen}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer ${
                  isFullscreen
                    ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 shadow-xs'
                    : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100'
                }`}
                title="Toggle Fullscreen Viewport Mode for maximum data entry focus"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                ) : (
                  <Maximize2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                )}
                <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
              </button>
            </div>
          </div>
        ) : activeRibbonTab === 'data' ? (
          /* DATA TAB RIBBON TOOLBAR */
          <div className="flex items-center gap-3 py-0.5 text-xs select-none w-full shrink-0 overflow-visible flex-wrap sm:flex-nowrap">
            <button
              onClick={() => {
                setIsFilterActive(prev => !prev);
                if (isFilterActive) setColumnFilters({});
                setStatusMessage(isFilterActive ? 'Filters disabled.' : 'Filter enabled on column headers.');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                isFilterActive
                  ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200'
              }`}
            >
              <Filter className="h-4 w-4" />
              <span>Filter {isFilterActive ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => handleSortCurrentColumn('asc')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 font-bold cursor-pointer"
              title="Sort selected column Ascending (A to Z)"
            >
              <ArrowUpDown className="h-4 w-4 text-emerald-600" />
              <span>Sort A &rarr; Z</span>
            </button>

            <button
              onClick={() => handleSortCurrentColumn('desc')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 font-bold cursor-pointer"
              title="Sort selected column Descending (Z to A)"
            >
              <ArrowUpDown className="h-4 w-4 text-emerald-600 rotate-180" />
              <span>Sort Z &rarr; A</span>
            </button>

            <button
              onClick={handleRemoveDuplicates}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 font-bold cursor-pointer"
              title="Remove duplicate rows based on unique cell values"
            >
              <Trash2 className="h-4 w-4 text-rose-600" />
              <span>Remove Duplicates</span>
            </button>

            <button
              onClick={() => setShowRangeSelectModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-bold cursor-pointer"
              title="Select custom ranges & data validation"
            >
              <MousePointerClick className="h-4 w-4 text-indigo-600" />
              <span>Select Rows &amp; Cols</span>
            </button>
          </div>
        ) : activeRibbonTab === 'file' ? (
          /* FILE TAB RIBBON TOOLBAR */
          <div className="flex items-center gap-2.5 py-0.5 text-xs select-none w-full shrink-0 overflow-visible flex-wrap sm:flex-nowrap">
            <button
              onClick={handleExportXLSX}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer shadow-xs"
            >
              <Download className="h-4 w-4" />
              <span>Save / Download (.xlsx)</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-semibold cursor-pointer"
            >
              <FileText className="h-4 w-4 text-sky-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportCommentsJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-semibold cursor-pointer"
            >
              <FileCode className="h-4 w-4 text-amber-600" />
              <span>Export JSON</span>
            </button>

            <div className="w-px h-5 bg-slate-300 dark:bg-zinc-700 mx-1" />

            {/* AutoSave Browser Persistence Controls */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-lg border border-slate-200 dark:border-zinc-700">
              <button
                onClick={() => {
                  const success = performSaveToStorage(sheets, activeSheetIndex, namedRanges, sheetTheme);
                  if (success) {
                    setStatusMessage(`Spreadsheet saved to browser storage at ${new Date().toLocaleTimeString()}!`);
                  }
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-600 text-slate-800 dark:text-zinc-200 font-semibold cursor-pointer shadow-xs border border-slate-200 dark:border-zinc-600"
                title="Force auto-save current state to localStorage"
              >
                <Save className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Save to Storage Now</span>
              </button>

              <button
                onClick={handleClearAutoSave}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-zinc-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold cursor-pointer shadow-xs border border-slate-200 dark:border-zinc-600"
                title="Clear browser auto-saved state and reset"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                <span>Clear AutoSave &amp; Reset</span>
              </button>
            </div>

            <button
              onClick={() => handleResetSheet()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 font-bold cursor-pointer"
            >
              <RotateCcw className="h-4 w-4 text-rose-600" />
              <span>Reset Sheet</span>
            </button>
          </div>
        ) : (
          /* HOME TAB RIBBON TOOLBAR */
          <div className="flex items-center gap-2 w-full shrink-0">
            {/* Undo / Redo / Print */}
            <div className="flex items-center gap-0.5 pr-2 border-r border-slate-200 dark:border-zinc-800">
          <button
            onClick={handleUndo}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleRedo}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <Redo className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 cursor-pointer"
            title="Copy (Ctrl+C)"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleCut}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 cursor-pointer"
            title="Cut (Ctrl+X)"
          >
            <Scissors className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handlePaste}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 cursor-pointer"
            title="Paste (Ctrl+V)"
          >
            <Clipboard className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => window.print()}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 cursor-pointer"
            title="Print sheet (Ctrl+P)"
          >
            <Printer className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Zoom Level */}
        <div className="flex items-center gap-1 pr-2 border-r border-slate-200 dark:border-zinc-800">
          <select
            value={zoomLevel}
            onChange={(e) => setZoomLevel(Number(e.target.value))}
            className="px-1.5 py-1 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded text-xs font-semibold text-slate-700 dark:text-zinc-300 outline-none"
          >
            <option value={75}>75%</option>
            <option value={90}>90%</option>
            <option value={100}>100%</option>
            <option value={125}>125%</option>
            <option value={150}>150%</option>
          </select>
        </div>

        {/* Number Formats: Currency, Percent, Decimals */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-slate-200 dark:border-zinc-800">
          <button
            onClick={() => setCurrentFormat('currency_inr')}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold"
            title="Format as Rupee (₹)"
          >
            ₹
          </button>
          <button
            onClick={() => setCurrentFormat('currency_usd')}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold"
            title="Format as Dollar ($)"
          >
            <DollarSign className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setCurrentFormat('percent')}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold"
            title="Format as Percent (%)"
          >
            <Percent className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setCurrentFormat('number')}
            className="px-1.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-mono text-[11px] font-bold"
            title="Format as 123 Number"
          >
            123
          </button>
        </div>

        {/* Font Family & Size */}
        <div className="flex items-center gap-1 pr-2 border-r border-slate-200 dark:border-zinc-800">
          <select 
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="px-2 py-1 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded text-xs outline-none w-24"
          >
            <option value="Calibri">Calibri</option>
            <option value="Aptos">Aptos</option>
            <option value="Segoe UI">Segoe UI</option>
            <option value="Arial">Arial</option>
            <option value="Roboto">Roboto</option>
            <option value="Consolas">Consolas</option>
          </select>

          <div className="flex items-center gap-0.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded">
            <button
              onClick={() => setFontSize(prev => Math.max(8, prev - 1))}
              className="px-1 py-0.5 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 font-bold"
            >
              -
            </button>
            <span className="w-5 text-center font-mono text-xs">{fontSize}</span>
            <button
              onClick={() => setFontSize(prev => Math.min(32, prev + 1))}
              className="px-1 py-0.5 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 font-bold"
            >
              +
            </button>
          </div>
        </div>

        {/* Cell Background & Text Color Picker */}
        <div className="flex items-center gap-1 pr-2 border-r border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded px-1.5 py-0.5" title="Cell Background Color">
            <PaintBucket className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <input
              type="color"
              value={fillColor}
              onChange={(e) => {
                setFillColor(e.target.value);
                handleSetCellBackground(e.target.value);
              }}
              className="w-5 h-5 bg-transparent border-0 cursor-pointer rounded"
              title="Select cell fill background color"
            />
          </div>
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded px-1.5 py-0.5" title="Text Color">
            <Palette className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <input
              type="color"
              value={textColor}
              onChange={(e) => {
                setTextColor(e.target.value);
                pushUndoState();
                const { startRow, endRow, startCol, endCol } = selectionRange;
                const minR = Math.min(startRow, endRow);
                const maxR = Math.max(startRow, endRow);
                const minC = Math.min(startCol, endCol);
                const maxC = Math.max(startCol, endCol);
                setSheets(prev => {
                  const next = [...prev];
                  const sh = { ...next[activeSheetIndex] };
                  const newStyles = { ...(sh.cellStyles || {}) };
                  for (let r = minR; r <= maxR; r++) {
                    for (let c = minC; c <= maxC; c++) {
                      const key = `${r}_${c}`;
                      newStyles[key] = { ...(newStyles[key] || {}), textColor: e.target.value };
                    }
                  }
                  sh.cellStyles = newStyles;
                  next[activeSheetIndex] = sh;
                  return next;
                });
                setStatusMessage('Applied text color to selected range.');
              }}
              className="w-5 h-5 bg-transparent border-0 cursor-pointer rounded"
              title="Select text color"
            />
          </div>
        </div>
        <div className="flex items-center gap-0.5 pr-2 border-r border-slate-200 dark:border-zinc-800">
          <button
            onClick={() => handleToggleStyle('bold')}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 font-bold text-slate-700 dark:text-zinc-300 cursor-pointer"
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleToggleStyle('italic')}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 italic text-slate-700 dark:text-zinc-300 cursor-pointer"
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleToggleStyle('strikethrough')}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 line-through text-slate-700 dark:text-zinc-300 cursor-pointer"
            title="Strikethrough"
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleToggleStyle('underline')}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 underline text-slate-700 dark:text-zinc-300 cursor-pointer"
            title="Underline (Ctrl+U)"
          >
            <Underline className="h-3.5 w-3.5" />
          </button>
          {/* Cell Borders with MS Excel Dropdown */}
          <div className="relative inline-flex items-center">
            <button
              onClick={handleToggleBorder}
              className="p-1.5 rounded-l hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 cursor-pointer"
              title="Toggle All Borders (MS Excel)"
            >
              <Grid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setShowBorderDropdown(prev => !prev)}
              className="p-1 rounded-r hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 cursor-pointer"
              title="Select Border Style"
            >
              <ChevronDown className="h-2.5 w-2.5" />
            </button>

            {showBorderDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowBorderDropdown(false)} 
                />
                <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg shadow-xl py-1.5 z-50 text-xs text-slate-700 dark:text-zinc-200">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Cell Borders (MS Excel)
                  </div>
                  <button
                    onClick={() => { handleApplyBorder('all'); setShowBorderDropdown(false); }}
                    className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-left font-semibold cursor-pointer"
                  >
                    <Grid className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>All Borders</span>
                  </button>
                  <button
                    onClick={() => { handleApplyBorder('outside'); setShowBorderDropdown(false); }}
                    className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-left cursor-pointer"
                  >
                    <div className="w-4 h-4 border border-slate-700 dark:border-zinc-300" />
                    <span>Outside Borders</span>
                  </button>
                  <button
                    onClick={() => { handleApplyBorder('thick_outside'); setShowBorderDropdown(false); }}
                    className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-left font-semibold cursor-pointer"
                  >
                    <div className="w-4 h-4 border-2 border-slate-800 dark:border-zinc-200" />
                    <span>Thick Outside Border</span>
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-zinc-800 my-1" />
                  <button
                    onClick={() => { handleApplyBorder('bottom'); setShowBorderDropdown(false); }}
                    className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-left cursor-pointer"
                  >
                    <div className="w-4 h-4 border-b-2 border-slate-700 dark:border-zinc-300" />
                    <span>Bottom Border</span>
                  </button>
                  <button
                    onClick={() => { handleApplyBorder('top'); setShowBorderDropdown(false); }}
                    className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-left cursor-pointer"
                  >
                    <div className="w-4 h-4 border-t-2 border-slate-700 dark:border-zinc-300" />
                    <span>Top Border</span>
                  </button>
                  <button
                    onClick={() => { handleApplyBorder('left'); setShowBorderDropdown(false); }}
                    className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-left cursor-pointer"
                  >
                    <div className="w-4 h-4 border-l-2 border-slate-700 dark:border-zinc-300" />
                    <span>Left Border</span>
                  </button>
                  <button
                    onClick={() => { handleApplyBorder('right'); setShowBorderDropdown(false); }}
                    className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-left cursor-pointer"
                  >
                    <div className="w-4 h-4 border-r-2 border-slate-700 dark:border-zinc-300" />
                    <span>Right Border</span>
                  </button>
                  <button
                    onClick={() => { handleApplyBorder('top_bottom'); setShowBorderDropdown(false); }}
                    className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-left cursor-pointer"
                  >
                    <div className="w-4 h-4 border-t border-b-2 border-slate-700 dark:border-zinc-300" />
                    <span>Top and Bottom Border</span>
                  </button>
                  <button
                    onClick={() => { handleApplyBorder('double_bottom'); setShowBorderDropdown(false); }}
                    className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-left cursor-pointer"
                  >
                    <div className="w-4 h-4 border-b-4 border-b-double border-slate-700 dark:border-zinc-300" />
                    <span>Double Bottom Border</span>
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-zinc-800 my-1" />
                  <button
                    onClick={() => { handleApplyBorder('none'); setShowBorderDropdown(false); }}
                    className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-left font-semibold cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>No Border (Clear)</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Alignment & Merge */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-slate-200 dark:border-zinc-800">
          <button
            onClick={() => handleSetAlignment('left')}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 cursor-pointer"
            title="Align Left"
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleSetAlignment('center')}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 cursor-pointer"
            title="Align Center"
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleSetAlignment('right')}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 cursor-pointer"
            title="Align Right"
          >
            <AlignRight className="h-3.5 w-3.5" />
          </button>

          {/* Merge & Center */}
          <div className="flex items-center gap-0.5 ml-1 pl-1 border-l border-slate-200 dark:border-zinc-700">
            <button
              onClick={handleToggleMergeCells}
              className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-semibold cursor-pointer"
              title="Merge & Center selected cells"
            >
              <TableProperties className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Merge &amp; Center</span>
            </button>
          </div>
        </div>

        {/* Find & Replace */}
        <div className="flex items-center gap-1 pr-2 border-r border-slate-200 dark:border-zinc-800">
          <button
            onClick={() => {
              setFindReplaceTab('find');
              setShowFindReplaceModal(true);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-medium cursor-pointer"
            title="Find & Replace (Ctrl+F / Ctrl+H)"
          >
            <Search className="h-3.5 w-3.5 text-indigo-500" />
            <span>Find &amp; Replace</span>
          </button>
        </div>

        {/* Highlight Feature 1: Filter Toggle Button */}
        <div className="flex items-center gap-1 pr-2 border-r border-slate-200 dark:border-zinc-800">
          <button
            onClick={() => {
              setIsFilterActive(prev => !prev);
              if (isFilterActive) {
                setColumnFilters({});
                setStatusMessage('Sheet Filters disabled.');
              } else {
                setStatusMessage('Sheet Filters enabled on all column headers.');
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isFilterActive
                ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200'
            }`}
            title="Create / Toggle Sheet Filter"
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Filter {isFilterActive ? 'ON' : 'OFF'}</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Highlight Feature 2: Select Row & Column "Apne Hisab Se" */}
        <div className="flex items-center gap-1 pr-2 border-r border-slate-200 dark:border-zinc-800">
          <button
            onClick={() => setShowRangeSelectModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-bold transition-colors cursor-pointer"
            title="Select Custom Rows and Columns (Apne Hisab Se)"
          >
            <MousePointerClick className="h-3.5 w-3.5" />
            <span>Select Rows &amp; Cols</span>
          </button>
        </div>

        {/* Highlight Feature 3: MS Excel Keyboard Shortcuts (F1) */}
        <div className="flex items-center gap-1 pr-2 border-r border-slate-200 dark:border-zinc-800">
          <button
            onClick={() => setShowShortcutsModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 font-bold transition-colors cursor-pointer"
            title="MS Excel Keyboard Shortcuts Guide (Press F1 or Ctrl+/)"
          >
            <Keyboard className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Shortcuts (F1)</span>
          </button>
        </div>

        {/* Row & Column Actions Menu */}
        <div className="flex items-center gap-1 pr-2 border-r border-slate-200 dark:border-zinc-800">
          <button
            onClick={handleInsertRowAbove}
            className="px-2 py-1 rounded bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 text-[11px] font-semibold"
            title="Insert row above"
          >
            + Row
          </button>
          <button
            onClick={() => handleInsertColumn('right')}
            className="px-2 py-1 rounded bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 text-[11px] font-semibold"
            title="Insert column to right"
          >
            + Col
          </button>
          <button
            onClick={handleDeleteSelectedRows}
            className="p-1.5 rounded hover:bg-red-50 text-slate-500 hover:text-red-600"
            title="Delete selected row(s)"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* AutoSum & Charts */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleAutoSum('SUM')}
            className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold"
            title="AutoSum Column"
          >
            <Sigma className="h-3.5 w-3.5" />
            <span>AutoSum</span>
          </button>

          <button
            onClick={() => setShowChartModal(true)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
            title="Insert Chart"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Chart</span>
          </button>
        </div>
      </div>
        )}

      </div>

      {/* Formula Bar & Coordinate Tracker (with editable Name Box) */}
      {showFormulaBar && (
        <div id="excel-formula-bar" className="bg-slate-50 dark:bg-[#0c1220] border-b border-slate-200 dark:border-white/10 px-3 py-1.5 flex items-center gap-2 text-xs shrink-0">
          
          {/* Active Cell Coordinate Box / Name Box - Editable for custom range selection */}
          <div className="flex items-center gap-1.5">
            <div className="relative">
              {isEditingCoordinate ? (
                <input
                  type="text"
                  autoFocus
                  value={coordinateInputValue}
                  onChange={(e) => setCoordinateInputValue(e.target.value)}
                  onBlur={() => handleApplyTypedCoordinate(coordinateInputValue)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleApplyTypedCoordinate(coordinateInputValue);
                    if (e.key === 'Escape') setIsEditingCoordinate(false);
                  }}
                  className="w-24 px-2 py-1 bg-white dark:bg-zinc-900 border-2 border-emerald-500 rounded font-mono font-bold text-center text-slate-900 dark:text-white outline-none"
                />
              ) : (
                <div 
                  onClick={() => setIsEditingCoordinate(true)}
                  title="Click to type custom range (e.g. A1:D10, 2:5, B:F) and hit Enter"
                  className="min-w-20 px-2 py-1 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded font-mono font-bold text-center text-slate-800 dark:text-zinc-200 hover:border-emerald-500 cursor-text select-none transition-colors"
                >
                  {coordinateInputValue}
                </div>
              )}
            </div>

            {/* Live Dimensions Indicator Badge (e.g. 5R × 5C) */}
            {selectionRange && (Math.abs(selectionRange.endRow - selectionRange.startRow) > 0 || Math.abs(selectionRange.endCol - selectionRange.startCol) > 0) && (
              <div 
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-mono text-[10px] font-bold shrink-0 animate-fade-in shadow-xs"
                title="Selection Range Dimensions (Rows × Columns)"
              >
                <Layers className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                <span>{Math.abs(selectionRange.endRow - selectionRange.startRow) + 1}R × {Math.abs(selectionRange.endCol - selectionRange.startCol) + 1}C</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 text-slate-400 font-serif italic text-sm select-none px-1">
            <span className="font-bold">fx</span>
          </div>

          {/* Formula / Cell Content Input */}
          <input
            type="text"
            value={formulaInput}
            onChange={(e) => setFormulaInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCommitCellValue(formulaInput);
              }
            }}
            placeholder="Type value or formula (e.g. =SUM(G1:G100), =AVERAGE(G), =F1*G1)..."
            className="flex-1 px-2.5 py-1 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded font-mono text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />

          {/* Big Data Quick Search Box */}
          <div className="relative w-44 sm:w-52">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2 top-2" />
            <input
              type="text"
              placeholder={`Search in ${currentSheet.rows.length.toLocaleString()} rows...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-6 py-1 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded text-xs outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Jump To Row Box */}
          <div className="hidden md:flex items-center gap-1">
            <input
              type="number"
              placeholder="Row #"
              value={jumpToRowInput}
              onChange={(e) => setJumpToRowInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleJumpToRow();
              }}
              className="w-18 px-2 py-1 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded text-xs font-mono"
            />
            <button
              onClick={handleJumpToRow}
              className="px-2 py-1 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 rounded font-semibold text-[11px]"
            >
              Jump
            </button>
          </div>
        </div>
      )}

      {/* Active Filter Summary Bar (if filters are active and restricting rows) */}
      {activeFiltersCount > 0 && (
        <div id="active-filters-banner" className="bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800/80 px-4 py-1.5 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200 shrink-0">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold">
              Filter Active: Showing <strong>{processedRowIndices.length.toLocaleString()}</strong> of {currentSheet.rows.length.toLocaleString()} rows
            </span>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono hidden sm:inline">
              ({currentSheet.rows.length - processedRowIndices.length} rows hidden by filter)
            </span>
          </div>

          <button
            onClick={handleClearAllFilters}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-200/80 dark:bg-emerald-900 hover:bg-emerald-300 dark:hover:bg-emerald-800 text-emerald-950 dark:text-white font-bold text-[11px] transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Clear All Filters</span>
          </button>
        </div>
      )}

      {/* Generation Progress Indicator Banner */}
      {isGeneratingData && (
        <div id="bigdata-progress-banner" className="bg-gradient-to-r from-emerald-900 to-indigo-950 text-white px-4 py-2 flex items-center justify-between text-xs animate-pulse border-b border-emerald-700">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" />
            <span className="font-bold">{genStatusText}</span>
          </div>
          <span className="font-mono font-extrabold text-emerald-300 text-sm">{genProgress}%</span>
        </div>
      )}

      {/* Main Grid Viewport with Virtualized Scrolling Engine */}
      <div 
        ref={containerRef}
        id="excel-grid-viewport"
        onScroll={handleScroll}
        className="flex-1 overflow-auto relative bg-white dark:bg-[#070b14] no-scrollbar focus:outline-none"
        tabIndex={0}
      >
        {/* Total Virtual Height Spacer for 500k Rows */}
        <div style={{ height: `${totalVirtualHeight + HEADER_HEIGHT}px`, width: '100%', position: 'relative' }}>
          
          {/* Sticky Column Headers Row */}
          <div 
            style={{
              position: 'sticky',
              top: 0,
              left: 0,
              zIndex: 30,
              height: showHeadings ? `${HEADER_HEIGHT}px` : '0px',
              display: showHeadings ? 'flex' : 'none',
              backgroundColor: sheetTheme === 'excel_green' ? '#f8fafc' : '#0f172a',
              borderBottom: showHeadings ? '2px solid #cbd5e1' : 'none'
            }}
          >
            {/* Top-Left Corner Cell - Select All */}
            <div 
              onClick={handleSelectAll}
              title="Click to Select All cells"
              className={`w-14 shrink-0 border-r border-b border-slate-300 dark:border-zinc-700 flex items-center justify-center font-bold text-[10px] cursor-pointer transition-colors ${
                selectionMode === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 dark:bg-zinc-800 text-slate-500 hover:bg-slate-300 dark:hover:bg-zinc-700'
              }`}
            >
              ◢
            </div>

            {/* Column Letter / Header Name Boxes with Interactive Filter Popover */}
            {currentSheet.headers.map((headerText, colIdx) => {
              const colWidth = currentSheet.columnWidths[colIdx] || DEFAULT_COL_WIDTH;
              const isColInRange = 
                (selectionMode === 'column' || selectionMode === 'all' || isSelecting) &&
                colIdx >= Math.min(selectionRange.startCol, selectionRange.endCol) &&
                colIdx <= Math.max(selectionRange.startCol, selectionRange.endCol);
              const isLeadCol = selectedCell.col === colIdx;
              const isFiltered = !!columnFilters[colIdx];
              const isPopoverOpen = activeFilterCol === colIdx;
              const isFrozenCol = freezeFirstColumn && colIdx === 0;

              return (
                <div
                  key={colIdx}
                  style={{
                    width: `${colWidth}px`,
                    position: isFrozenCol ? 'sticky' : undefined,
                    left: isFrozenCol ? (showHeadings ? 56 : 0) : undefined,
                    zIndex: isFrozenCol ? 35 : 10
                  }}
                  onMouseDown={(e) => handleColHeaderMouseDown(colIdx, e)}
                  onMouseEnter={() => handleColHeaderMouseEnter(colIdx)}
                  onContextMenu={(e) => handleColHeaderContextMenu(colIdx, e)}
                  className={`shrink-0 px-2 py-1 border-r border-b border-slate-300 dark:border-zinc-700 flex flex-col justify-center text-left cursor-pointer transition-colors select-none relative group ${
                    isColInRange || isLeadCol
                      ? 'bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-950 dark:text-emerald-100 font-bold border-b-2 border-b-emerald-600'
                      : 'bg-slate-100 dark:bg-zinc-900/90 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className={isColInRange || isLeadCol ? 'text-emerald-800 dark:text-emerald-300 font-bold' : 'text-slate-700 dark:text-zinc-300 font-bold'}>
                      {getColLetter(colIdx)}
                    </span>

                    {/* Interactive Filter Button */}
                    {isFilterActive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFilterCol(prev => prev === colIdx ? null : colIdx);
                        }}
                        className={`p-0.5 rounded transition-colors ${
                          isFiltered
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400'
                        }`}
                        title={`Filter on Column ${getColLetter(colIdx)}${headerText && headerText !== getColLetter(colIdx) ? ` (${headerText})` : ''}`}
                      >
                        <Filter className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {headerText && headerText !== getColLetter(colIdx) && (
                    <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 truncate leading-tight mt-0.5">
                      {headerText}
                    </span>
                  )}

                  {/* Interactive Column Resize Handle */}
                  <div
                    onMouseDown={(e) => handleStartColResize(colIdx, e)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleAutoFitColumn(colIdx);
                    }}
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-emerald-500 active:bg-emerald-600 z-30 transition-colors"
                    title="Drag to resize column, double-click to auto-fit"
                  />

                  {/* Filter Dropdown Popover Menu */}
                  {isPopoverOpen && (
                    <ExcelColumnFilterMenu
                      colIdx={colIdx}
                      colName={headerText}
                      colLetter={getColLetter(colIdx)}
                      currentFilter={columnFilters[colIdx]}
                      allRows={currentSheet.rows}
                      onApplyFilter={handleApplyColumnFilter}
                      onSortColumn={(cIdx, dir) => {
                        setSortColumn(cIdx);
                        setSortDirection(dir);
                        setStatusMessage(`Sorted Column ${headerText} (${dir.toUpperCase()})`);
                      }}
                      onClose={() => setActiveFilterCol(null)}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Virtual Window Data Rows Container */}
          <div
            style={{
              position: 'absolute',
              top: `${offsetY + HEADER_HEIGHT}px`,
              left: 0,
              right: 0
            }}
          >
            {visibleIndices.map((realRowIdx, offsetIdx) => {
              const displayRowNum = realRowIdx + 1;
              const rowData = currentSheet.rows[realRowIdx] || [];
              const minSelectedRow = Math.min(selectionRange.startRow, selectionRange.endRow);
              const maxSelectedRow = Math.max(selectionRange.startRow, selectionRange.endRow);
              const isRowInRange = 
                (selectionMode === 'row' || selectionMode === 'all' || isSelecting) &&
                realRowIdx >= minSelectedRow &&
                realRowIdx <= maxSelectedRow;
              const isLeadRow = selectedCell.row === realRowIdx;

              return (
                <div
                  key={realRowIdx}
                  style={{ height: `${ROW_HEIGHT}px`, display: 'flex' }}
                  className={`border-b ${
                    showGridlines ? 'border-slate-200 dark:border-zinc-800/80' : 'border-transparent'
                  } ${
                    isRowInRange
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40'
                      : offsetIdx % 2 === 1 ? 'bg-slate-50/40 dark:bg-zinc-900/20' : 'bg-transparent'
                  }`}
                >
                  {/* Row Number Index Cell */}
                  <div 
                    onMouseDown={(e) => handleRowHeaderMouseDown(realRowIdx, e)}
                    onMouseEnter={() => handleRowHeaderMouseEnter(realRowIdx)}
                    onContextMenu={(e) => handleRowHeaderContextMenu(realRowIdx, e)}
                    className={`w-14 shrink-0 px-1 border-r border-slate-200 dark:border-zinc-800 ${showHeadings ? 'flex' : 'hidden'} items-center justify-center font-mono text-[10px] cursor-pointer select-none transition-colors ${
                      isRowInRange || isLeadRow
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-slate-100/70 dark:bg-zinc-900/60 text-slate-500 hover:bg-slate-200 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {displayRowNum.toLocaleString()}
                  </div>

                  {/* Cell Columns */}
                  {currentSheet.headers.map((_, colIdx) => {
                    const cellVal = rowData[colIdx];
                    const colWidth = currentSheet.columnWidths[colIdx] || DEFAULT_COL_WIDTH;
                    const isCellLead = selectedCell.row === realRowIdx && selectedCell.col === colIdx;
                    
                    const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
                    const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
                    const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
                    const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);

                    const isCellInRange = 
                      realRowIdx >= minR && 
                      realRowIdx <= maxR && 
                      colIdx >= minC && 
                      colIdx <= maxC;

                    const isMultiCell = (minR !== maxR) || (minC !== maxC);

                    const isTopEdge = isCellInRange && realRowIdx === minR;
                    const isBottomEdge = isCellInRange && realRowIdx === maxR;
                    const isLeftEdge = isCellInRange && colIdx === minC;
                    const isRightEdge = isCellInRange && colIdx === maxC;
                    const isBottomRightCorner = isCellInRange && realRowIdx === maxR && colIdx === maxC;

                    const formatted = formatCellValue(cellVal, colIdx);
                    const displayCellVal = showFormulae ? (cellVal !== undefined && cellVal !== null ? String(cellVal) : '') : formatted;
                    const cellKey = `${realRowIdx}_${colIdx}`;
                    const customStyle = currentSheet.cellStyles?.[cellKey];

                    // Merge Cells calculation
                    const merges = currentSheet.mergedCells || {};
                    let isCoveredByOtherMerge = false;
                    let activeMergeOrigin: MergeInfo | null = null;

                    if (merges[cellKey]) {
                      activeMergeOrigin = merges[cellKey];
                    } else {
                      for (const k of Object.keys(merges)) {
                        const m = merges[k];
                        if (
                          realRowIdx >= m.startRow &&
                          realRowIdx <= m.startRow + m.rowSpan - 1 &&
                          colIdx >= m.startCol &&
                          colIdx <= m.startCol + m.colSpan - 1
                        ) {
                          if (realRowIdx !== m.startRow || colIdx !== m.startCol) {
                            isCoveredByOtherMerge = true;
                          }
                          break;
                        }
                      }
                    }

                    if (isCoveredByOtherMerge) {
                      return <div key={colIdx} style={{ width: `${colWidth}px`, display: 'none' }} />;
                    }

                    let renderedWidth = colWidth;
                    let renderedHeight: number | undefined = undefined;
                    let mergeZIndex: number | undefined = undefined;

                    if (activeMergeOrigin) {
                      renderedWidth = 0;
                      for (let c = activeMergeOrigin.startCol; c < activeMergeOrigin.startCol + activeMergeOrigin.colSpan; c++) {
                        renderedWidth += currentSheet.columnWidths[c] || DEFAULT_COL_WIDTH;
                      }
                      renderedHeight = activeMergeOrigin.rowSpan * ROW_HEIGHT;
                      mergeZIndex = 25;
                    }

                    const isFrozenCol = freezeFirstColumn && colIdx === 0;

                    let alignClass = 'text-left justify-start';
                    if (customStyle?.align === 'center') alignClass = 'text-center justify-center';
                    if (customStyle?.align === 'right') alignClass = 'text-right justify-end';

                    let borderClasses = '';
                    if (customStyle?.border) {
                      if (customStyle.borderStyle === 'thick_outside') {
                        const t = customStyle.borderTop ? 'border-t-2 border-t-slate-800 dark:border-t-zinc-200 ' : '';
                        const b = customStyle.borderBottom ? 'border-b-2 border-b-slate-800 dark:border-b-zinc-200 ' : '';
                        const l = customStyle.borderLeft ? 'border-l-2 border-l-slate-800 dark:border-l-zinc-200 ' : '';
                        const r = customStyle.borderRight ? 'border-r-2 border-r-slate-800 dark:border-r-zinc-200 ' : '';
                        borderClasses = `${t}${b}${l}${r} z-10`;
                      } else if (customStyle.borderStyle === 'double_bottom' || customStyle.borderBottom === 'double') {
                        borderClasses = 'border-b-[3px] border-b-double border-b-slate-800 dark:border-b-zinc-200 z-10';
                      } else if (customStyle.borderTop || customStyle.borderBottom || customStyle.borderLeft || customStyle.borderRight) {
                        const t = customStyle.borderTop ? 'border-t border-t-slate-700 dark:border-t-zinc-300 ' : '';
                        const b = customStyle.borderBottom ? 'border-b border-b-slate-700 dark:border-b-zinc-300 ' : '';
                        const l = customStyle.borderLeft ? 'border-l border-l-slate-700 dark:border-l-zinc-300 ' : '';
                        const r = customStyle.borderRight ? 'border-r border-r-slate-700 dark:border-r-zinc-300 ' : '';
                        borderClasses = `${t}${b}${l}${r} z-10`;
                      } else {
                        // Standard MS Excel crisp 1px border
                        borderClasses = 'border border-slate-700 dark:border-zinc-300 z-10';
                      }
                    }

                    return (
                      <div
                        key={colIdx}
                        style={{
                          width: `${renderedWidth}px`,
                          height: renderedHeight ? `${renderedHeight}px` : undefined,
                          fontSize: `${fontSize}px`,
                          fontFamily: fontFamily,
                          backgroundColor: customStyle?.backgroundColor,
                          color: customStyle?.textColor,
                          position: isFrozenCol ? 'sticky' : (activeMergeOrigin ? 'relative' : undefined),
                          left: isFrozenCol ? (showHeadings ? 56 : 0) : undefined,
                          zIndex: isFrozenCol ? 28 : (activeMergeOrigin ? mergeZIndex : undefined)
                        }}
                        onMouseDown={(e) => handleCellMouseDown(realRowIdx, colIdx, e)}
                        onMouseEnter={() => handleCellMouseEnter(realRowIdx, colIdx)}
                        onContextMenu={(e) => handleCellContextMenu(realRowIdx, colIdx, e)}
                        onDoubleClick={() => {
                          setSelectedCell({ row: realRowIdx, col: colIdx });
                          setSelectionRange({ startRow: realRowIdx, endRow: realRowIdx, startCol: colIdx, endCol: colIdx });
                          setIsEditing(true);
                        }}
                        className={`shrink-0 px-2 flex items-center text-xs truncate cursor-cell border-r transition-colors select-none relative ${alignClass} ${
                          customStyle?.bold ? 'font-bold' : ''
                        } ${
                          customStyle?.italic ? 'italic' : ''
                        } ${
                          customStyle?.underline ? 'underline' : ''
                        } ${
                          customStyle?.strikethrough ? 'line-through' : ''
                        } ${
                          borderClasses ? borderClasses : (showGridlines ? 'border-slate-200 dark:border-zinc-800/80' : 'border-transparent')
                        } ${
                          isCellLead && !isMultiCell
                            ? 'bg-emerald-100/90 dark:bg-emerald-900/60 ring-2 ring-emerald-600 dark:ring-emerald-400 ring-inset z-20 font-semibold text-slate-900 dark:text-white'
                            : isCellLead && isMultiCell
                            ? 'bg-white dark:bg-zinc-950 ring-2 ring-emerald-600 dark:ring-emerald-400 ring-inset z-20 font-semibold text-slate-900 dark:text-white'
                            : isCellInRange
                            ? 'bg-emerald-500/15 dark:bg-emerald-500/25 text-slate-900 dark:text-emerald-100'
                            : 'text-slate-800 dark:text-zinc-200'
                        } ${
                          isTopEdge ? 'border-t-2 border-t-emerald-600 dark:border-t-emerald-400' : ''
                        } ${
                          isBottomEdge ? 'border-b-2 border-b-emerald-600 dark:border-b-emerald-400' : ''
                        } ${
                          isLeftEdge ? 'border-l-2 border-l-emerald-600 dark:border-l-emerald-400' : ''
                        } ${
                          isRightEdge ? 'border-r-2 border-r-emerald-600 dark:border-r-emerald-400' : ''
                        }`}
                      >
                        {isEditing && isCellLead ? (
                          <input
                            id="grid-cell-editor"
                            type="text"
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleCommitCellValue(editValue)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCommitCellValue(editValue);
                              if (e.key === 'Escape') setIsEditing(false);
                            }}
                            className="w-full h-full bg-white dark:bg-zinc-950 text-slate-900 dark:text-white px-1 outline-none text-xs font-mono"
                          />
                        ) : (
                          <span className={`truncate w-full ${alignClass}`}>{displayCellVal}</span>
                        )}

                        {/* Comment Indicator Triangle (top-right corner) & Tooltip */}
                        {customStyle?.comment && (
                          <div 
                            title={`Comment: ${customStyle.comment}`}
                            className="absolute top-0 right-0 w-0 h-0 border-t-[6px] border-t-red-600 border-l-[6px] border-l-transparent z-30 cursor-pointer pointer-events-auto"
                          />
                        )}

                        {/* Excel Auto-Fill Handle (bottom-right corner) */}
                        {isBottomRightCorner && !isEditing && (
                          <div 
                            onMouseDown={handleFillHandleMouseDown}
                            className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-emerald-700 dark:bg-emerald-400 border border-white dark:border-zinc-950 z-30 cursor-crosshair rounded-[0.5px] hover:scale-125 transition-transform"
                            title="Auto-fill handle (drag to expand series)"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Excel Bottom Worksheet Tabs Bar */}
      <div id="excel-bottom-bar" className="bg-slate-200 dark:bg-[#0f172a] border-t border-slate-300 dark:border-white/10 px-3 py-1 flex items-center justify-between text-xs shrink-0 select-none">
        
        {/* Sheet Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={handleAddSheet}
            className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors cursor-pointer shadow-2xs"
            title="Add New Worksheet"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Sheet</span>
          </button>

          <div className="h-4 w-px bg-slate-300 dark:bg-zinc-700 mx-1" />

          {sheets.map((sh, idx) => (
            <div
              key={sh.id}
              onClick={() => {
                setActiveSheetIndex(idx);
                setColumnFilters({});
              }}
              onDoubleClick={() => handleRenameSheet(idx)}
              className={`group relative flex items-center gap-1.5 px-3 py-1 rounded-t-md font-semibold text-xs transition-colors cursor-pointer border-t-2 ${
                activeSheetIndex === idx
                  ? 'bg-white dark:bg-[#070b14] text-emerald-700 dark:text-emerald-400 border-emerald-600 shadow-2xs'
                  : 'bg-slate-300/60 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-transparent hover:bg-slate-300 dark:hover:bg-zinc-700'
              }`}
              title="Click to select, Double-click to rename"
            >
              <span>{sh.name}</span>

              <div className="flex items-center opacity-60 group-hover:opacity-100 transition-opacity gap-0.5 ml-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRenameSheet(idx);
                  }}
                  className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400"
                  title="Rename Sheet"
                >
                  <Edit3 className="h-3 w-3" />
                </button>
                {sheets.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSheet(idx);
                    }}
                    className="p-0.5 rounded hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-500"
                    title="Delete Sheet"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Live Aggregation Analytics Metrics Widget & Fullscreen Shortcut */}
        <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono text-slate-600 dark:text-zinc-400">
          {statusMessage && (
            <span className="text-emerald-700 dark:text-emerald-400 font-sans font-semibold truncate max-w-xs">
              {statusMessage}
            </span>
          )}
          <span>COUNT: <strong className="text-slate-900 dark:text-white">{selectionMetrics.count.toLocaleString()}</strong></span>
          <span>SUM: <strong className="text-emerald-600 dark:text-emerald-400">₹{selectionMetrics.sum}</strong></span>
          <span>AVG: <strong className="text-slate-900 dark:text-white">{selectionMetrics.avg}</strong></span>
          <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold">
            60 FPS Engine
          </span>

          <button
            onClick={toggleFullscreen}
            className={`flex items-center gap-1 px-2 py-0.5 rounded font-bold transition-colors cursor-pointer border ${
              isFullscreen
                ? 'bg-amber-400 text-slate-950 border-amber-500'
                : 'bg-slate-300 dark:bg-zinc-800 hover:bg-slate-400 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-zinc-700'
            }`}
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Expand to Fullscreen Viewport'}
          >
            {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            <span className="text-[10px] hidden md:inline">{isFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
          </button>
        </div>
      </div>

      {/* Custom Row & Column Selection Modal ("Apne Hisab Se Select Krna") */}
      <ExcelRangeSelectModal
        isOpen={showRangeSelectModal}
        onClose={() => setShowRangeSelectModal(false)}
        headers={currentSheet.headers}
        totalRows={currentSheet.rows.length}
        getColLetter={getColLetter}
        onApplySelection={(selection) => {
          setSelectedCell({ row: selection.startRow, col: selection.startCol });
          setSelectionOrigin({ row: selection.startRow, col: selection.startCol });
          setSelectionMode(selection.mode);
          setSelectionRange({
            startRow: selection.startRow,
            endRow: selection.endRow,
            startCol: selection.startCol,
            endCol: selection.endCol
          });

          // Scroll selected start row into view
          if (containerRef.current) {
            containerRef.current.scrollTop = selection.startRow * ROW_HEIGHT;
          }

          setStatusMessage(`Selected range (${selection.mode}): ${getColLetter(selection.startCol)}${selection.startRow + 1} to ${getColLetter(selection.endCol)}${selection.endRow + 1}`);
        }}
      />

      {/* Chart Visualization Modal */}
      {showChartModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl p-6 max-w-3xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-500" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Dynamic Visual Chart Generator</h3>
              </div>
              <button onClick={() => setShowChartModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Chart Type</label>
                <select 
                  value={chartType} 
                  onChange={(e: any) => setChartType(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-zinc-900 border rounded-lg"
                >
                  <option value="bar">Bar Chart</option>
                  <option value="line">Line Trend</option>
                  <option value="area">Area Chart</option>
                  <option value="pie">Pie Chart</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Category (X-Axis)</label>
                <select 
                  value={chartXCol} 
                  onChange={(e) => setChartXCol(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 dark:bg-zinc-900 border rounded-lg"
                >
                  {currentSheet.headers.map((h, idx) => (
                    <option key={idx} value={idx}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Aggregate Metric (Y-Axis)</label>
                <select 
                  value={chartYCol} 
                  onChange={(e) => setChartYCol(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 dark:bg-zinc-900 border rounded-lg"
                >
                  {currentSheet.headers.map((h, idx) => (
                    <option key={idx} value={idx}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Chart Canvas */}
            <div className="h-72 w-full pt-4 flex items-center justify-center bg-slate-50 dark:bg-zinc-900/50 rounded-xl p-3 border border-slate-200 dark:border-white/5">
              {chartData.length === 0 ? (
                <div className="text-slate-400 text-xs font-medium">No numerical data found for the selected columns.</div>
              ) : chartType === 'bar' ? (
                <div className="w-full h-full flex flex-col">
                  <div className="flex-1 flex items-end gap-3 px-4 pb-4 border-b border-slate-200 dark:border-zinc-700">
                    {(() => {
                      const maxVal = Math.max(...chartData.map(d => d.value), 1);
                      return chartData.map((d, idx) => {
                        const heightPct = Math.max(8, (d.value / maxVal) * 100);
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                            <span className="text-[9px] font-mono text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {d.value.toLocaleString()}
                            </span>
                            <div 
                              style={{ height: `${heightPct}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                              className="w-full max-w-[48px] rounded-t-md transition-all group-hover:brightness-110 shadow-xs"
                            />
                            <span className="text-[10px] font-semibold text-slate-700 dark:text-zinc-300 truncate w-full text-center mt-1">
                              {d.name}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  <div className="pt-2 flex items-center justify-center gap-4 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#107c41]" />
                      Total {currentSheet.headers[chartYCol] || 'Metric'} by {currentSheet.headers[chartXCol] || 'Category'}
                    </span>
                  </div>
                </div>
              ) : chartType === 'line' || chartType === 'area' ? (
                <div className="w-full h-full flex flex-col">
                  {(() => {
                    const maxVal = Math.max(...chartData.map(d => d.value), 1);
                    const width = 600;
                    const height = 180;
                    const pts = chartData.map((d, idx) => {
                      const x = (idx / (chartData.length - 1 || 1)) * (width - 60) + 30;
                      const y = height - (d.value / maxVal) * (height - 30) - 15;
                      return { x, y, ...d };
                    });
                    const pathStr = pts.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
                    const areaPathStr = `${pathStr} L ${pts[pts.length - 1]?.x || 0} ${height} L ${pts[0]?.x || 0} ${height} Z`;

                    return (
                      <div className="w-full h-full flex flex-col">
                        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                          <defs>
                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.5" />
                              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          {[0.25, 0.5, 0.75, 1].map((pct, i) => (
                            <line key={i} x1="20" y1={height * pct} x2={width - 20} y2={height * pct} stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth="1" opacity="0.3" />
                          ))}
                          {chartType === 'area' && <path d={areaPathStr} fill="url(#areaGrad)" />}
                          <path d={pathStr} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
                          {pts.map((pt, idx) => (
                            <g key={idx} className="cursor-pointer">
                              <circle cx={pt.x} cy={pt.y} r="5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                              <text x={pt.x} y={height - 2} fontSize="9" textAnchor="middle" fill="#64748b" fontWeight="600">
                                {pt.name}
                              </text>
                            </g>
                          ))}
                        </svg>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-around gap-4">
                  {(() => {
                    const totalVal = chartData.reduce((acc, d) => acc + d.value, 0) || 1;
                    let cumulativeAngle = 0;
                    const slices = chartData.map((d, idx) => {
                      const fraction = d.value / totalVal;
                      const angle = fraction * 360;
                      const startAngle = cumulativeAngle;
                      cumulativeAngle += angle;
                      return { ...d, fraction, startAngle, angle, color: COLORS[idx % COLORS.length] };
                    });

                    return (
                      <>
                        <svg viewBox="0 0 160 160" className="w-44 h-44 -rotate-90">
                          {slices.map((slice, idx) => {
                            const x1 = 80 + 70 * Math.cos((Math.PI * slice.startAngle) / 180);
                            const y1 = 80 + 70 * Math.sin((Math.PI * slice.startAngle) / 180);
                            const x2 = 80 + 70 * Math.cos((Math.PI * (slice.startAngle + slice.angle)) / 180);
                            const y2 = 80 + 70 * Math.sin((Math.PI * (slice.startAngle + slice.angle)) / 180);
                            const largeArc = slice.angle > 180 ? 1 : 0;
                            const path = `M 80 80 L ${x1} ${y1} A 70 70 0 ${largeArc} 1 ${x2} ${y2} Z`;

                            return (
                              <path key={idx} d={path} fill={slice.color} stroke="#ffffff" strokeWidth="1.5" className="transition-all hover:opacity-90" />
                            );
                          })}
                        </svg>

                        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto no-scrollbar text-[11px]">
                          {slices.map((slice, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                              <span className="font-semibold text-slate-700 dark:text-zinc-300">{slice.name}</span>
                              <span className="text-slate-400 font-mono">({(slice.fraction * 100).toFixed(1)}%)</span>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
              <button 
                onClick={() => setShowChartModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MS Excel Keyboard Shortcuts Help Modal (F1 / Ctrl+/) */}
      <ExcelShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* Right-Click Spreadsheet Context Menu */}
      <ExcelContextMenu
        position={contextMenuPos}
        onClose={() => setContextMenuPos(null)}
        onCopy={handleCopy}
        onCut={handleCut}
        onPaste={handlePaste}
        onClearContents={handleClearSelectedCells}
        onSelectAll={handleSelectAll}
        onInsertRowAbove={handleInsertRowAbove}
        onInsertRowBelow={handleInsertRowBelow}
        onDeleteRows={handleDeleteSelectedRows}
        onInsertColLeft={() => handleInsertColumn('left')}
        onInsertColRight={() => handleInsertColumn('right')}
        onDeleteCols={handleDeleteSelectedColumns}
        onToggleBold={() => handleToggleStyle('bold')}
        onToggleItalic={() => handleToggleStyle('italic')}
        onToggleUnderline={() => handleToggleStyle('underline')}
        onSetAlign={handleSetAlignment}
        onAutoSum={handleAutoSum}
        onOpenChart={() => setShowChartModal(true)}
        onAddComment={() => handleOpenCommentModal(selectedCell.row, selectedCell.col)}
        rangeLabel={coordinateInputValue}
      />

      {/* Add / Edit Comment Modal */}
      {showCommentModal && commentTargetCell && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Cell Comment</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Target: {getColLetter(commentTargetCell.col)}{commentTargetCell.row + 1}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCommentModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1.5">
                Note / Comment Content (leave blank to delete):
              </label>
              <textarea
                value={activeCommentText}
                onChange={(e) => setActiveCommentText(e.target.value)}
                rows={4}
                placeholder="Type your comment or note here..."
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 resize-none font-sans"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <button
                onClick={() => {
                  setActiveCommentText('');
                  handleSaveComment();
                }}
                className="px-4 py-2 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-semibold hover:bg-red-200 transition-colors cursor-pointer"
              >
                Remove Comment
              </button>
              <button
                onClick={() => setShowCommentModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveComment}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
              >
                Save Comment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PivotTable Creation Modal */}
      {showPivotModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-zinc-100 text-base">
                <TableProperties className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span>Create PivotTable</span>
              </div>
              <button
                onClick={() => setShowPivotModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-zinc-300">
              <p>
                Choose the data that you want to analyze. Highlighting active sheet range: <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{currentSheet.name}!A1:Z100</span>
              </p>
              
              <div className="p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-200 dark:border-zinc-700 space-y-2">
                <div className="font-semibold text-slate-800 dark:text-zinc-200">Destination:</div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="pivotDest" defaultChecked className="accent-emerald-600" />
                  <span>New Worksheet tab (e.g. Pivot_Summary)</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <button
                onClick={() => setShowPivotModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleGeneratePivotTable}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Create PivotTable
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forms Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-zinc-100 text-base">
                <ClipboardList className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                <span>Data Entry Form</span>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {currentSheet.headers.slice(0, 10).map((hdr, idx) => (
                <div key={idx}>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                    {hdr || `Column ${getColLetter(idx)}`}:
                  </label>
                  <input
                    type="text"
                    value={formInputRow[idx] || ''}
                    onChange={(e) => setFormInputRow(prev => ({ ...prev, [idx]: e.target.value }))}
                    placeholder={`Enter ${hdr || `value for column ${getColLetter(idx)}`}...`}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <button
                onClick={() => setShowFormModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  pushUndoState();
                  const newRow = currentSheet.columns.map((_, colIdx) => formInputRow[colIdx] || '');
                  setSheets(prev => {
                    const next = [...prev];
                    const sh = { ...next[activeSheetIndex] };
                    sh.rows = [...sh.rows, newRow];
                    next[activeSheetIndex] = sh;
                    return next;
                  });
                  setFormInputRow({});
                  setShowFormModal(false);
                  setStatusMessage('New row added via Data Entry Form!');
                }}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer shadow-md"
              >
                Add Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insert Function Modal */}
      {showInsertFunctionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-zinc-100 text-base">
                <span className="font-serif italic text-emerald-600 dark:text-emerald-400 font-bold text-lg">fₓ</span>
                <span>Insert Function</span>
              </div>
              <button
                onClick={() => setShowInsertFunctionModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Search Function Box */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Search for a function:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={functionSearchQuery}
                    onChange={(e) => setFunctionSearchQuery(e.target.value)}
                    placeholder="Type a brief description of what you want to do (e.g., vlookup, sum, average)..."
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                  />
                  {functionSearchQuery && (
                    <button
                      onClick={() => setFunctionSearchQuery('')}
                      className="px-2 py-1 bg-slate-100 dark:bg-zinc-800 rounded text-slate-500 hover:text-slate-700 font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Or select a category:
                </label>
                <select
                  value={selectedFunctionCategory}
                  onChange={(e) => setSelectedFunctionCategory(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg outline-none font-medium"
                >
                  {['All', 'Math & Trig', 'Lookup & Reference', 'Logical', 'Financial', 'Text', 'Date & Time', 'Statistical', 'Information'].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Function List */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Select a function:
                </label>
                <div className="h-44 overflow-y-auto border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50/50 dark:bg-zinc-950/50 divide-y divide-slate-100 dark:divide-zinc-800/80">
                  {[
                    { name: 'SUM', category: 'Math & Trig', syntax: 'SUM(number1, [number2], ...)', desc: 'Adds all the numbers in a range of cells.' },
                    { name: 'AVERAGE', category: 'Statistical', syntax: 'AVERAGE(number1, [number2], ...)', desc: 'Returns the average (arithmetic mean) of its arguments.' },
                    { name: 'VLOOKUP', category: 'Lookup & Reference', syntax: 'VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])', desc: 'Looks for a value in the leftmost column of a table, and then returns a value in the same row from a column you specify.' },
                    { name: 'XLOOKUP', category: 'Lookup & Reference', syntax: 'XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found])', desc: 'Searches a range or an array for a match and returns the corresponding item.' },
                    { name: 'IF', category: 'Logical', syntax: 'IF(logical_test, [value_if_true], [value_if_false])', desc: 'Checks whether a condition is met, and returns one value if TRUE, and another value if FALSE.' },
                    { name: 'COUNT', category: 'Statistical', syntax: 'COUNT(value1, [value2], ...)', desc: 'Counts how many numbers are in the list of arguments.' },
                    { name: 'MAX', category: 'Statistical', syntax: 'MAX(number1, [number2], ...)', desc: 'Returns the largest value in a set of values.' },
                    { name: 'MIN', category: 'Statistical', syntax: 'MIN(number1, [number2], ...)', desc: 'Returns the smallest number in a set of values.' },
                    { name: 'CONCAT', category: 'Text', syntax: 'CONCAT(text1, [text2], ...)', desc: 'Combines the text from multiple ranges and/or strings.' },
                    { name: 'TODAY', category: 'Date & Time', syntax: 'TODAY()', desc: 'Returns the current date formatted as a date.' },
                    { name: 'PMT', category: 'Financial', syntax: 'PMT(rate, nper, pv, [fv], [type])', desc: 'Calculates the payment for a loan based on constant payments and a constant interest rate.' },
                    { name: 'ROUND', category: 'Math & Trig', syntax: 'ROUND(number, num_digits)', desc: 'Rounds a number to a specified number of digits.' },
                    { name: 'INDEX', category: 'Lookup & Reference', syntax: 'INDEX(array, row_num, [column_num])', desc: 'Returns a value or reference of the cell at the intersection of a particular row and column.' },
                    { name: 'MATCH', category: 'Lookup & Reference', syntax: 'MATCH(lookup_value, lookup_array, [match_type])', desc: 'Returns the relative position of an item in an array that matches a specified value.' },
                    { name: 'IFERROR', category: 'Logical', syntax: 'IFERROR(value, value_if_error)', desc: 'Returns value_if_error if expression is an error and the value of the expression itself otherwise.' }
                  ]
                    .filter(fn => {
                      const matchesCategory = selectedFunctionCategory === 'All' || fn.category === selectedFunctionCategory;
                      const matchesQuery = !functionSearchQuery || fn.name.toLowerCase().includes(functionSearchQuery.toLowerCase()) || fn.desc.toLowerCase().includes(functionSearchQuery.toLowerCase());
                      return matchesCategory && matchesQuery;
                    })
                    .map(fn => (
                      <div
                        key={fn.name}
                        onClick={() => handleInsertFunctionFormula(fn.name)}
                        className="p-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-zinc-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                            {fn.name}
                          </span>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                            {fn.category}
                          </span>
                        </div>
                        <div className="font-mono text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                          {fn.syntax}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                          {fn.desc}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <button
                onClick={() => setShowInsertFunctionModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Name Manager Modal */}
      {showNameManagerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-zinc-100 text-base">
                <Tag className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                <span>Name Manager</span>
              </div>
              <button
                onClick={() => setShowNameManagerModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Add New Range Form */}
            <div className="p-3 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 rounded-xl space-y-2">
              <div className="font-semibold text-xs text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5 text-sky-600" />
                <span>Create New Named Range:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newRangeName}
                  onChange={(e) => setNewRangeName(e.target.value)}
                  placeholder="Name (e.g. Total_Sales)"
                  className="px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg outline-none focus:ring-2 focus:ring-sky-500"
                />
                <input
                  type="text"
                  value={newRangeRef}
                  onChange={(e) => setNewRangeRef(e.target.value)}
                  placeholder={`Refers to (e.g. ${getColLetter(selectedCell.col)}${selectedCell.row + 1} or A1:C20)`}
                  className="px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    if (!newRangeName.trim()) return;
                    const cleanName = newRangeName.trim().replace(/\s+/g, '_');
                    const cleanRef = newRangeRef.trim() || `${getColLetter(selectedCell.col)}${selectedCell.row + 1}`;
                    setNamedRanges(prev => [
                      ...prev,
                      { name: cleanName, range: cleanRef, sheet: currentSheet.name, value: 'Cell Value' }
                    ]);
                    setNewRangeName('');
                    setNewRangeRef('');
                    setStatusMessage(`Added Named Range "${cleanName}" -> ${cleanRef}`);
                  }}
                  className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer"
                >
                  Add Name
                </button>
              </div>
            </div>

            {/* Existing Named Ranges List */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Defined Names:</div>
              <div className="h-44 overflow-y-auto border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50/50 dark:bg-zinc-950/50 divide-y divide-slate-100 dark:divide-zinc-800">
                {namedRanges.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No named ranges defined yet.</div>
                ) : (
                  namedRanges.map(item => (
                    <div key={item.name} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-100 dark:hover:bg-zinc-800/60 transition-colors">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-zinc-100 font-mono">{item.name}</span>
                        <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono mt-0.5">
                          Refers to: <span className="text-sky-600 dark:text-sky-400 font-bold">{item.sheet}!{item.range}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setNamedRanges(prev => prev.filter(r => r.name !== item.name));
                          setStatusMessage(`Deleted Named Range "${item.name}"`);
                        }}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Delete Name"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <button
                onClick={() => setShowNameManagerModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Find and Replace Modal (Ctrl+F / Ctrl+H) */}
      <ExcelFindReplaceModal
        isOpen={showFindReplaceModal}
        onClose={() => setShowFindReplaceModal(false)}
        initialTab={findReplaceTab}
        allRows={currentSheet.rows}
        headers={currentSheet.headers}
        selectedCell={selectedCell}
        onSelectCell={(row, col) => {
          setSelectedCell({ row, col });
          setSelectionOrigin({ row, col });
          setSelectionRange({ startRow: row, endRow: row, startCol: col, endCol: col });
          setSelectionMode('cell');
          scrollToCell(row, col);
        }}
        onReplaceCell={(row, col, newVal) => {
          pushUndoState();
          setSheets(prev => {
            const next = [...prev];
            const sh = { ...next[activeSheetIndex] };
            const newRows = [...sh.rows];
            if (!newRows[row]) newRows[row] = [];
            const rArr = [...newRows[row]];
            rArr[col] = newVal;
            newRows[row] = rArr;
            sh.rows = newRows;
            next[activeSheetIndex] = sh;
            return next;
          });
          setStatusMessage(`Replaced value at ${getColLetter(col)}${row + 1}`);
        }}
        onReplaceAll={handleReplaceAll}
      />

    </div>
  );
}
