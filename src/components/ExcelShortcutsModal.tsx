import React, { useState, useMemo } from 'react';
import { 
  X, Keyboard, Search, Sparkles, Copy, Check, Star, 
  Layers, Table, Hash, FileSpreadsheet, Eye, Printer, 
  Code, Sliders, ArrowUpDown, Filter, BarChart3, HelpCircle 
} from 'lucide-react';

interface ExcelShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface ShortcutItem {
  keys: string[];
  desc: string;
  category: 
    | 'important'
    | 'basic'
    | 'editing'
    | 'selection'
    | 'navigation'
    | 'formatting'
    | 'rows_cols'
    | 'formulas'
    | 'paste_special'
    | 'data_filter'
    | 'worksheets'
    | 'charts'
    | 'pivottable'
    | 'search_replace'
    | 'comments'
    | 'macros'
    | 'window_view'
    | 'workbook'
    | 'printing'
    | 'special';
  isTop?: boolean;
}

export const EXCEL_SHORTCUTS: ShortcutItem[] = [
  // MOST IMPORTANT SHORTCUTS
  { keys: ['Ctrl', 'C'], desc: 'Copy selected cells / range', category: 'important', isTop: true },
  { keys: ['Ctrl', 'V'], desc: 'Paste copied clipboard contents', category: 'important', isTop: true },
  { keys: ['Ctrl', 'X'], desc: 'Cut selected cells', category: 'important', isTop: true },
  { keys: ['Ctrl', 'Z'], desc: 'Undo last action', category: 'important', isTop: true },
  { keys: ['Ctrl', 'Y'], desc: 'Redo previously undone action', category: 'important', isTop: true },
  { keys: ['Ctrl', 'S'], desc: 'Save Workbook / Spreadsheet', category: 'important', isTop: true },
  { keys: ['Ctrl', 'A'], desc: 'Select All / Entire Worksheet', category: 'important', isTop: true },
  { keys: ['Ctrl', 'F'], desc: 'Find in Worksheet', category: 'important', isTop: true },
  { keys: ['Ctrl', 'H'], desc: 'Find & Replace data', category: 'important', isTop: true },
  { keys: ['Ctrl', 'T'], desc: 'Create Excel Table', category: 'important', isTop: true },
  { keys: ['Ctrl', 'Shift', 'L'], desc: 'Turn Filter On / Off', category: 'important', isTop: true },
  { keys: ['Ctrl', 'Arrow'], desc: 'Jump To Edge Of Data Region', category: 'important', isTop: true },
  { keys: ['Ctrl', 'Shift', 'Arrow'], desc: 'Select to edge of data region', category: 'important', isTop: true },
  { keys: ['Ctrl', 'D'], desc: 'Fill Down (duplicate top cell contents)', category: 'important', isTop: true },
  { keys: ['Ctrl', 'R'], desc: 'Fill Right (duplicate left cell contents)', category: 'important', isTop: true },
  { keys: ['Alt', '='], desc: 'AutoSum selected range / column', category: 'important', isTop: true },
  { keys: ['F2'], desc: 'Edit Active Cell inline', category: 'important', isTop: true },
  { keys: ['F4'], desc: 'Toggle Absolute/Mixed Cell Reference ($A$1)', category: 'important', isTop: true },
  { keys: ['Ctrl', '1'], desc: 'Format Cells dialog', category: 'important', isTop: true },
  { keys: ['Ctrl', ';'], desc: 'Insert Current Date', category: 'important', isTop: true },
  { keys: ['Ctrl', 'Shift', ';'], desc: 'Insert Current Time', category: 'important', isTop: true },
  { keys: ['Alt', 'Enter'], desc: 'New Line Inside Cell (wrap text)', category: 'important', isTop: true },
  { keys: ['Ctrl', 'E'], desc: 'Flash Fill pattern prediction', category: 'important', isTop: true },
  { keys: ['Ctrl', 'Home'], desc: 'Jump to top-left cell (A1)', category: 'important', isTop: true },
  { keys: ['Ctrl', 'End'], desc: 'Jump to Last Used Cell', category: 'important', isTop: true },
  { keys: ['Ctrl', 'Page Up'], desc: 'Switch To Previous Worksheet', category: 'important', isTop: true },
  { keys: ['Ctrl', 'Page Down'], desc: 'Switch To Next Worksheet', category: 'important', isTop: true },
  { keys: ['Shift', 'F11'], desc: 'Insert New Worksheet Tab', category: 'important', isTop: true },
  { keys: ['Alt', 'F1'], desc: 'Create Quick Chart in current sheet', category: 'important', isTop: true },
  { keys: ['F11'], desc: 'Create Chart on separate Chart Sheet', category: 'important', isTop: true },
  { keys: ['Alt', 'F8'], desc: 'Open Macro Dialog', category: 'important', isTop: true },
  { keys: ['Alt', 'F11'], desc: 'Open VBA / Code Editor', category: 'important', isTop: true },

  // BASIC
  { keys: ['Ctrl', 'N'], desc: 'New Workbook', category: 'basic' },
  { keys: ['Ctrl', 'O'], desc: 'Open Workbook', category: 'basic' },
  { keys: ['Ctrl', 'S'], desc: 'Save Workbook', category: 'basic' },
  { keys: ['F12'], desc: 'Save As (Export to new filename/format)', category: 'basic' },
  { keys: ['Ctrl', 'P'], desc: 'Print Spreadsheet', category: 'basic' },
  { keys: ['Ctrl', 'W'], desc: 'Close Current Workbook', category: 'basic' },
  { keys: ['Alt', 'F4'], desc: 'Close Excel Application', category: 'basic' },
  { keys: ['Ctrl', 'Z'], desc: 'Undo last change', category: 'basic' },
  { keys: ['Ctrl', 'Y'], desc: 'Redo change', category: 'basic' },
  { keys: ['Ctrl', 'X'], desc: 'Cut selected cells', category: 'basic' },
  { keys: ['Ctrl', 'C'], desc: 'Copy selected cells', category: 'basic' },
  { keys: ['Ctrl', 'V'], desc: 'Paste copied cells', category: 'basic' },
  { keys: ['Delete'], desc: 'Delete Cell Contents', category: 'basic' },
  { keys: ['Ctrl', 'F'], desc: 'Find text or numbers in sheet', category: 'basic' },
  { keys: ['Ctrl', 'H'], desc: 'Find & Replace values', category: 'basic' },
  { keys: ['Ctrl', 'K'], desc: 'Insert / Edit Hyperlink', category: 'basic' },
  { keys: ['F1'], desc: 'Help / Keyboard Shortcuts Guide', category: 'basic' },

  // CELL & EDITING
  { keys: ['F2'], desc: 'Edit Active Cell with cursor placed at end', category: 'editing' },
  { keys: ['Esc'], desc: 'Cancel Entry / discard active cell edit', category: 'editing' },
  { keys: ['Enter'], desc: 'Complete Entry / Move 1 Cell Down', category: 'editing' },
  { keys: ['Shift', 'Enter'], desc: 'Complete Entry / Move 1 Cell Up', category: 'editing' },
  { keys: ['Tab'], desc: 'Complete Entry / Move 1 Cell Right', category: 'editing' },
  { keys: ['Shift', 'Tab'], desc: 'Complete Entry / Move 1 Cell Left', category: 'editing' },
  { keys: ['Alt', 'Enter'], desc: 'New Line Inside Cell (multi-line text)', category: 'editing' },
  { keys: ['Ctrl', 'Enter'], desc: 'Fill Selected Cells With Same Entry simultaneously', category: 'editing' },
  { keys: ['Ctrl', 'D'], desc: 'Fill Down (copy cell value/formula from top)', category: 'editing' },
  { keys: ['Ctrl', 'R'], desc: 'Fill Right (copy cell value/formula from left)', category: 'editing' },
  { keys: ['Ctrl', "'"], desc: 'Copy Exact Formula From Cell Above', category: 'editing' },
  { keys: ['Ctrl', 'Shift', '"'], desc: 'Copy Exact Value From Cell Above', category: 'editing' },
  { keys: ['Ctrl', ';'], desc: 'Insert Current Date (YYYY-MM-DD)', category: 'editing' },
  { keys: ['Ctrl', 'Shift', ';'], desc: 'Insert Current Time (HH:MM:SS)', category: 'editing' },
  { keys: ['Ctrl', 'E'], desc: 'Flash Fill (pattern recognition fill)', category: 'editing' },
  { keys: ['Ctrl', 'Q'], desc: 'Quick Analysis Lens (Totals, Charts, Sparklines)', category: 'editing' },

  // SELECTION
  { keys: ['Ctrl', 'A'], desc: 'Select Current Data Region', category: 'selection' },
  { keys: ['Ctrl', 'A', '(Twice)'], desc: 'Select Entire Worksheet (All rows & columns)', category: 'selection' },
  { keys: ['Shift', 'Arrow Keys'], desc: 'Extend Selection by 1 cell', category: 'selection' },
  { keys: ['Ctrl', 'Shift', 'Arrow Keys'], desc: 'Select To End Of Data in arrow direction', category: 'selection' },
  { keys: ['Ctrl', 'Space'], desc: 'Select Entire Column', category: 'selection' },
  { keys: ['Shift', 'Space'], desc: 'Select Entire Row', category: 'selection' },
  { keys: ['Ctrl', 'Shift', 'Space'], desc: 'Select Current Region / Entire Table', category: 'selection' },
  { keys: ['Ctrl', 'Click'], desc: 'Select Multiple Discontinuous Cells/Objects', category: 'selection' },

  // NAVIGATION
  { keys: ['Arrow Keys'], desc: 'Move active cell by 1 step', category: 'navigation' },
  { keys: ['Ctrl', 'Arrow Keys'], desc: 'Jump To Edge Of Data Region in sheet', category: 'navigation' },
  { keys: ['Home'], desc: 'Beginning Of Current Row (Column A)', category: 'navigation' },
  { keys: ['Ctrl', 'Home'], desc: 'Go To Top-Left Cell (A1)', category: 'navigation' },
  { keys: ['Ctrl', 'End'], desc: 'Go To Last Used Bottom-Right Cell', category: 'navigation' },
  { keys: ['Page Up'], desc: 'Move One Screen Up (20+ rows)', category: 'navigation' },
  { keys: ['Page Down'], desc: 'Move One Screen Down (20+ rows)', category: 'navigation' },
  { keys: ['Alt', 'Page Up'], desc: 'Move One Screen Left', category: 'navigation' },
  { keys: ['Alt', 'Page Down'], desc: 'Move One Screen Right', category: 'navigation' },
  { keys: ['Ctrl', 'Page Up'], desc: 'Switch to Previous Worksheet Tab', category: 'navigation' },
  { keys: ['Ctrl', 'Page Down'], desc: 'Switch to Next Worksheet Tab', category: 'navigation' },
  { keys: ['F5'], desc: 'Go To Cell Dialog (jump to specific coordinates)', category: 'navigation' },
  { keys: ['Ctrl', 'G'], desc: 'Go To Coordinate / Named Range', category: 'navigation' },

  // FORMATTING
  { keys: ['Ctrl', 'B'], desc: 'Toggle Bold text formatting', category: 'formatting' },
  { keys: ['Ctrl', 'I'], desc: 'Toggle Italic text formatting', category: 'formatting' },
  { keys: ['Ctrl', 'U'], desc: 'Toggle Underline formatting', category: 'formatting' },
  { keys: ['Ctrl', '5'], desc: 'Toggle Strikethrough formatting', category: 'formatting' },
  { keys: ['Ctrl', '1'], desc: 'Open Format Cells Dialog (Numbers, Fonts, Borders)', category: 'formatting' },
  { keys: ['Ctrl', 'Shift', '~'], desc: 'Apply General Number Format', category: 'formatting' },
  { keys: ['Ctrl', 'Shift', '$'], desc: 'Apply Currency Format ($#,##0.00)', category: 'formatting' },
  { keys: ['Ctrl', 'Shift', '%'], desc: 'Apply Percentage Format (0%)', category: 'formatting' },
  { keys: ['Ctrl', 'Shift', '#'], desc: 'Apply Date Format (DD-MMM-YY)', category: 'formatting' },
  { keys: ['Ctrl', 'Shift', '@'], desc: 'Apply Time Format (HH:MM AM/PM)', category: 'formatting' },
  { keys: ['Ctrl', 'Shift', '!'], desc: 'Apply Standard Number Format (#,##0.00)', category: 'formatting' },
  { keys: ['Ctrl', 'Shift', '&'], desc: 'Apply Outline Border to selected range', category: 'formatting' },
  { keys: ['Ctrl', 'Shift', '_'], desc: 'Remove All Borders from selected range', category: 'formatting' },
  { keys: ['Alt', 'H', 'H'], desc: 'Fill Color Picker (Background Highlight)', category: 'formatting' },
  { keys: ['Alt', 'H', 'F', 'C'], desc: 'Font Color Palette', category: 'formatting' },
  { keys: ['Alt', 'H', 'B'], desc: 'Borders Dropdown Menu', category: 'formatting' },
  { keys: ['Alt', 'H', 'A', 'L'], desc: 'Align Left', category: 'formatting' },
  { keys: ['Alt', 'H', 'A', 'C'], desc: 'Align Center', category: 'formatting' },
  { keys: ['Alt', 'H', 'A', 'R'], desc: 'Align Right', category: 'formatting' },

  // ROWS & COLUMNS
  { keys: ['Ctrl', '+'], desc: 'Insert Cells / Rows / Columns', category: 'rows_cols' },
  { keys: ['Ctrl', '-'], desc: 'Delete Selected Cells / Rows / Columns', category: 'rows_cols' },
  { keys: ['Ctrl', '9'], desc: 'Hide Selected Row(s)', category: 'rows_cols' },
  { keys: ['Ctrl', '0'], desc: 'Hide Selected Column(s)', category: 'rows_cols' },
  { keys: ['Ctrl', 'Shift', '9'], desc: 'Unhide Rows in selection', category: 'rows_cols' },
  { keys: ['Ctrl', 'Shift', '0'], desc: 'Unhide Columns in selection', category: 'rows_cols' },
  { keys: ['Alt', 'H', 'O', 'I'], desc: 'AutoFit Column Width to text length', category: 'rows_cols' },
  { keys: ['Alt', 'H', 'O', 'A'], desc: 'AutoFit Row Height to largest font', category: 'rows_cols' },
  { keys: ['Alt', 'H', 'O', 'W'], desc: 'Set Custom Column Width', category: 'rows_cols' },
  { keys: ['Alt', 'H', 'O', 'H'], desc: 'Set Custom Row Height', category: 'rows_cols' },

  // FORMULAS
  { keys: ['='], desc: 'Start Formula Entry', category: 'formulas' },
  { keys: ['Alt', '='], desc: 'AutoSum automatically suggests =SUM(...) range', category: 'formulas' },
  { keys: ['F4'], desc: 'Toggle Absolute/Mixed Cell Reference ($A$1 -> A$1 -> $A1 -> A1)', category: 'formulas' },
  { keys: ['Shift', 'F3'], desc: 'Insert Function Dialog / Function Wizard', category: 'formulas' },
  { keys: ['F9'], desc: 'Calculate / Evaluate All Formulas in Workbook', category: 'formulas' },
  { keys: ['Shift', 'F9'], desc: 'Calculate Formulas in Active Worksheet Only', category: 'formulas' },
  { keys: ['Ctrl', 'Alt', 'F9'], desc: 'Force Full Calculation across entire sheet structure', category: 'formulas' },
  { keys: ['Ctrl', 'Shift', 'Alt', 'F9'], desc: 'Rebuild Formula Dependencies And Recalculate', category: 'formulas' },
  { keys: ['Ctrl', '`'], desc: 'Toggle Show / Hide Formulas View across entire sheet', category: 'formulas' },
  { keys: ['F2'], desc: 'Edit Formula in Active Cell with color-coded range highlights', category: 'formulas' },
  { keys: ['Ctrl', '['], desc: 'Select Precedent Cells Referenced By Formula', category: 'formulas' },
  { keys: ['Ctrl', ']'], desc: 'Select Dependent Cells That Reference Active Cell', category: 'formulas' },

  // PASTE SPECIAL
  { keys: ['Ctrl', 'Alt', 'V'], desc: 'Open Paste Special Dialog', category: 'paste_special' },
  { keys: ['Ctrl', 'Alt', 'V', 'V'], desc: 'Paste Values Only (strip formulas & formats)', category: 'paste_special' },
  { keys: ['Ctrl', 'Alt', 'V', 'F'], desc: 'Paste Formulas Only', category: 'paste_special' },
  { keys: ['Ctrl', 'Alt', 'V', 'T'], desc: 'Paste Formats & Styles Only', category: 'paste_special' },
  { keys: ['Ctrl', 'Alt', 'V', 'W'], desc: 'Paste Column Widths', category: 'paste_special' },
  { keys: ['Ctrl', 'Alt', 'V', 'R'], desc: 'Paste Formulas + Number Formats', category: 'paste_special' },
  { keys: ['Ctrl', 'Alt', 'V', 'E'], desc: 'Transpose (flip rows to columns & vice-versa)', category: 'paste_special' },
  { keys: ['Ctrl', 'Alt', 'V', 'A'], desc: 'Paste Special: Add to existing numbers', category: 'paste_special' },
  { keys: ['Ctrl', 'Alt', 'V', 'S'], desc: 'Paste Special: Subtract from existing numbers', category: 'paste_special' },
  { keys: ['Ctrl', 'Alt', 'V', 'M'], desc: 'Paste Special: Multiply by existing numbers', category: 'paste_special' },
  { keys: ['Ctrl', 'Alt', 'V', 'D'], desc: 'Paste Special: Divide existing numbers', category: 'paste_special' },

  // DATA & FILTER
  { keys: ['Ctrl', 'T'], desc: 'Create Excel Table with banded rows & header filters', category: 'data_filter' },
  { keys: ['Ctrl', 'Shift', 'L'], desc: 'Turn AutoFilter On / Off on headers', category: 'data_filter' },
  { keys: ['Alt', 'Down Arrow'], desc: 'Open Filter / Dropdown Menu on active header', category: 'data_filter' },
  { keys: ['Ctrl', 'Alt', 'L'], desc: 'Reapply Current Filter & Sort settings', category: 'data_filter' },
  { keys: ['Alt', 'A', 'S', 'A'], desc: 'Sort Ascending (A To Z / 0 To 9)', category: 'data_filter' },
  { keys: ['Alt', 'A', 'S', 'D'], desc: 'Sort Descending (Z To A / 9 To 0)', category: 'data_filter' },
  { keys: ['Alt', 'A', 'S', 'S'], desc: 'Open Multi-Level Sort Dialog', category: 'data_filter' },
  { keys: ['Ctrl', 'E'], desc: 'Flash Fill (extract & transform data automatically)', category: 'data_filter' },
  { keys: ['Alt', 'A', 'E'], desc: 'Text To Columns (delimit text by comma/space/tab)', category: 'data_filter' },
  { keys: ['Alt', 'A', 'M'], desc: 'Remove Duplicate Rows from selected columns', category: 'data_filter' },
  { keys: ['Alt', 'A', 'V'], desc: 'Data Validation Dialog (dropdowns & criteria)', category: 'data_filter' },

  // WORKSHEETS
  { keys: ['Shift', 'F11'], desc: 'Insert New Blank Worksheet', category: 'worksheets' },
  { keys: ['Ctrl', 'Page Up'], desc: 'Switch To Previous Worksheet', category: 'worksheets' },
  { keys: ['Ctrl', 'Page Down'], desc: 'Switch To Next Worksheet', category: 'worksheets' },
  { keys: ['Alt', 'H', 'O', 'R'], desc: 'Rename Current Worksheet Tab', category: 'worksheets' },
  { keys: ['Alt', 'H', 'D', 'S'], desc: 'Delete Active Worksheet', category: 'worksheets' },
  { keys: ['Alt', 'H', 'O', 'M'], desc: 'Move / Copy Worksheet Dialog', category: 'worksheets' },

  // CHARTS
  { keys: ['Alt', 'F1'], desc: 'Create Quick 2D Chart In Current Worksheet', category: 'charts' },
  { keys: ['F11'], desc: 'Create Chart On A Dedicated New Chart Sheet', category: 'charts' },
  { keys: ['Alt', 'N', 'R'], desc: 'Recommended Charts Dialog', category: 'charts' },
  { keys: ['Alt', 'N', 'C'], desc: 'Insert Column / Bar Chart', category: 'charts' },
  { keys: ['Alt', 'N', 'P'], desc: 'Insert PivotChart Visualizer', category: 'charts' },

  // PIVOTTABLE
  { keys: ['Alt', 'N', 'V'], desc: 'Insert PivotTable from current range', category: 'pivottable' },
  { keys: ['Alt', 'J', 'T', 'R'], desc: 'Refresh Selected PivotTable Data', category: 'pivottable' },
  { keys: ['Alt', 'J', 'T', 'A'], desc: 'Open PivotTable Analyze Tab', category: 'pivottable' },
  { keys: ['Alt', 'Down Arrow'], desc: 'Open Pivot Field Filter / Sort Menu', category: 'pivottable' },
  { keys: ['Alt', 'F5'], desc: 'Refresh Current PivotTable', category: 'pivottable' },
  { keys: ['Ctrl', 'Alt', 'F5'], desc: 'Refresh All PivotTables & Data Queries', category: 'pivottable' },

  // SEARCH & REPLACE
  { keys: ['Ctrl', 'F'], desc: 'Find text, numbers, or formulas', category: 'search_replace' },
  { keys: ['Ctrl', 'H'], desc: 'Find & Replace text across Sheet or Workbook', category: 'search_replace' },
  { keys: ['Shift', 'F4'], desc: 'Find Next Occurrence of search term', category: 'search_replace' },
  { keys: ['Ctrl', 'Shift', 'F'], desc: 'Advanced Find / Open Font Properties', category: 'search_replace' },

  // COMMENTS & NOTES
  { keys: ['Shift', 'F2'], desc: 'Insert / Edit Cell Note (yellow tooltip)', category: 'comments' },
  { keys: ['Ctrl', 'Alt', 'M'], desc: 'Insert Threaded Discussion Comment', category: 'comments' },

  // MACROS & VBA
  { keys: ['Alt', 'F8'], desc: 'Open Macro Dialog (run, record, or edit macros)', category: 'macros' },
  { keys: ['Alt', 'F11'], desc: 'Open Visual Basic for Applications (VBA) Editor', category: 'macros' },
  { keys: ['F5'], desc: 'Run Macro or Procedure in Code Editor', category: 'macros' },
  { keys: ['F8'], desc: 'Step Into / Debug Code line by line', category: 'macros' },
  { keys: ['Ctrl', 'Break'], desc: 'Halt / Stop Macro execution immediately', category: 'macros' },

  // WINDOW & VIEW
  { keys: ['Ctrl', 'F1'], desc: 'Show / Collapse Ribbon Toolbar', category: 'window_view' },
  { keys: ['Alt'], desc: 'Show Ribbon KeyTips for keyboard navigation', category: 'window_view' },
  { keys: ['Ctrl', 'Shift', 'F1'], desc: 'Toggle Full Screen Workspace Mode', category: 'window_view' },
  { keys: ['Ctrl', 'Mouse Wheel'], desc: 'Zoom In / Zoom Out on spreadsheet grid', category: 'window_view' },
  { keys: ['Alt', 'W', 'F', 'F'], desc: 'Freeze Panes (lock both rows & columns)', category: 'window_view' },
  { keys: ['Alt', 'W', 'F', 'R'], desc: 'Freeze Top Header Row', category: 'window_view' },
  { keys: ['Alt', 'W', 'F', 'C'], desc: 'Freeze First Column', category: 'window_view' },
  { keys: ['Alt', 'W', 'S'], desc: 'Split Window into 4 synchronized viewports', category: 'window_view' },
  { keys: ['Alt', 'W', 'Q'], desc: 'Open Custom Zoom Dialog', category: 'window_view' },

  // WORKBOOK
  { keys: ['Ctrl', 'Tab'], desc: 'Switch Between Open Workbooks', category: 'workbook' },
  { keys: ['Ctrl', 'Shift', 'Tab'], desc: 'Switch to Previous Open Workbook', category: 'workbook' },
  { keys: ['Ctrl', 'W'], desc: 'Close Current Active Workbook', category: 'workbook' },
  { keys: ['Ctrl', 'S'], desc: 'Save Active Workbook (.xlsx)', category: 'workbook' },
  { keys: ['F12'], desc: 'Save As / Export to different format', category: 'workbook' },
  { keys: ['Ctrl', 'P'], desc: 'Print Workbook or export to print layout', category: 'workbook' },
  { keys: ['Alt', 'F'], desc: 'Open File Menu (Backstage View)', category: 'workbook' },

  // PRINTING
  { keys: ['Ctrl', 'P'], desc: 'Print Spreadsheet / Selection', category: 'printing' },
  { keys: ['Ctrl', 'F2'], desc: 'Open Print Preview Mode with margins & page breaks', category: 'printing' },
  { keys: ['Alt', 'F', 'P'], desc: 'Print Setup & Page Configuration Menu', category: 'printing' },
  { keys: ['Ctrl', 'Shift', 'P'], desc: 'Font Size & Printer Font Settings', category: 'printing' },

  // SPECIAL
  { keys: ['Shift', 'F10'], desc: 'Open Right-Click Cell Context Menu', category: 'special' },
  { keys: ['F4'], desc: 'Repeat Last Action or Formatting Command', category: 'special' },
  { keys: ['F7'], desc: 'Run Spell Check on worksheet contents', category: 'special' },
  { keys: ['F9'], desc: 'Recalculate All Formulas in sheet', category: 'special' },
  { keys: ['Shift', 'F9'], desc: 'Recalculate Active Sheet only', category: 'special' },
  { keys: ['Ctrl', 'Shift', 'G'], desc: 'Display Workbook Statistics (word/cell counts)', category: 'special' },
  { keys: ['Ctrl', 'F3'], desc: 'Open Name Manager (define named ranges)', category: 'special' },
  { keys: ['Ctrl', 'Shift', 'F3'], desc: 'Create Named Ranges from row/column headers', category: 'special' },
  { keys: ['Alt', 'F8'], desc: 'Manage & Run Macros', category: 'special' },
  { keys: ['Alt', 'F11'], desc: 'Open VBA Automation Editor', category: 'special' },
  { keys: ['Ctrl', 'K'], desc: 'Insert or Edit Hyperlink / Web Link', category: 'special' },
  { keys: ['Ctrl', 'L'], desc: 'Create Table / Focus Address Range', category: 'special' },
];

const CATEGORIES: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'all', label: 'All Shortcuts', icon: Keyboard },
  { id: 'important', label: '★ Most Important', icon: Star },
  { id: 'basic', label: 'Basic', icon: FileSpreadsheet },
  { id: 'editing', label: 'Cell & Editing', icon: Sparkles },
  { id: 'selection', label: 'Selection', icon: Layers },
  { id: 'navigation', label: 'Navigation', icon: ArrowUpDown },
  { id: 'formatting', label: 'Formatting', icon: Sliders },
  { id: 'rows_cols', label: 'Rows & Columns', icon: Table },
  { id: 'formulas', label: 'Formulas & Math', icon: Hash },
  { id: 'paste_special', label: 'Paste Special', icon: Copy },
  { id: 'data_filter', label: 'Data & Filter', icon: Filter },
  { id: 'worksheets', label: 'Worksheets', icon: Layers },
  { id: 'charts', label: 'Charts & Graphs', icon: BarChart3 },
  { id: 'pivottable', label: 'PivotTable', icon: Table },
  { id: 'search_replace', label: 'Search & Replace', icon: Search },
  { id: 'comments', label: 'Comments & Notes', icon: HelpCircle },
  { id: 'macros', label: 'Macros & VBA', icon: Code },
  { id: 'window_view', label: 'Window & View', icon: Eye },
  { id: 'workbook', label: 'Workbook', icon: FileSpreadsheet },
  { id: 'printing', label: 'Printing', icon: Printer },
  { id: 'special', label: 'Special Keys', icon: Sparkles }
];

export default function ExcelShortcutsModal({ isOpen, onClose }: ExcelShortcutsModalProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const filteredShortcuts = useMemo(() => {
    return EXCEL_SHORTCUTS.filter(item => {
      // Category match
      const categoryMatch = 
        activeCategory === 'all' ? true :
        activeCategory === 'important' ? (item.category === 'important' || item.isTop) :
        item.category === activeCategory;

      if (!categoryMatch) return false;

      // Search match
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const keysText = item.keys.join(' + ').toLowerCase();
      const descText = item.desc.toLowerCase();
      const catText = item.category.toLowerCase();
      return keysText.includes(q) || descText.includes(q) || catText.includes(q);
    });
  }, [activeCategory, searchQuery]);

  const handleCopy = (keys: string[], desc: string) => {
    const text = `${keys.join(' + ')} : ${desc}`;
    navigator.clipboard?.writeText(text);
    setCopiedKey(keys.join('+'));
    setTimeout(() => {
      setCopiedKey(null);
    }, 1800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-900 dark:text-zinc-100"
      >
        {/* Top Header */}
        <div className="bg-[#107c41] text-white px-6 py-4 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-xs shadow-inner">
              <Keyboard className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg font-display tracking-tight">
                  MS Excel Keyboard Shortcuts
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-white/20 font-mono font-semibold">
                  Complete Reference Guide
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                Official Microsoft Excel hotkeys for high-speed navigation, formulas, formatting, and data analysis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shortcuts (e.g., Save, AutoSum, Filter, Bold, Table, F4)..."
              className="w-full pl-9.5 pr-8 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-zinc-400 font-medium whitespace-nowrap self-center">
            Showing <strong className="text-emerald-600 dark:text-emerald-400">{filteredShortcuts.length}</strong> of {EXCEL_SHORTCUTS.length} shortcuts
          </div>
        </div>

        {/* Category Tabs Scrollable Ribbon */}
        <div className="px-4 py-2.5 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const count = cat.id === 'all' 
              ? EXCEL_SHORTCUTS.length 
              : cat.id === 'important'
              ? EXCEL_SHORTCUTS.filter(s => s.category === 'important' || s.isTop).length
              : EXCEL_SHORTCUTS.filter(s => s.category === cat.id).length;

            const isActive = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#107c41] text-white shadow-sm shadow-emerald-700/20'
                    : 'bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-slate-400 dark:text-zinc-400'}`} />
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isActive ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-zinc-700 text-slate-500 dark:text-zinc-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Shortcuts List Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-zinc-800/80">
          {filteredShortcuts.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-10 w-10 text-slate-300 dark:text-zinc-600 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-700 dark:text-zinc-300">No matching shortcuts found</h4>
              <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">Try searching with a different keyword like "Date", "Format", "Insert", or "Row".</p>
              <button
                onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
                className="mt-4 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Reset Search Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              {filteredShortcuts.map((item, idx) => {
                const keyStr = item.keys.join('+');
                const isCopied = copiedKey === keyStr;

                return (
                  <div 
                    key={idx} 
                    className="py-2.5 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 flex items-center justify-between gap-3 group transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-800"
                  >
                    {/* Keys Badge */}
                    <div className="flex items-center gap-1 shrink-0 flex-wrap">
                      {item.keys.map((k, kIdx) => (
                        <React.Fragment key={kIdx}>
                          <kbd className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-mono text-[11px] font-bold text-slate-800 dark:text-zinc-200 shadow-2xs min-w-5 text-center">
                            {k}
                          </kbd>
                          {kIdx < item.keys.length - 1 && (
                            <span className="text-slate-400 dark:text-zinc-500 text-[10px] font-bold">+</span>
                          )}
                        </React.Fragment>
                      ))}
                      {item.isTop && (
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500 ml-1 shrink-0" title="Most Important Shortcut" />
                      )}
                    </div>

                    {/* Description & Quick Copy */}
                    <div className="flex items-center gap-2 text-right">
                      <span className="text-xs text-slate-700 dark:text-zinc-300 font-medium line-clamp-2">
                        {item.desc}
                      </span>
                      <button
                        onClick={() => handleCopy(item.keys, item.desc)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-all cursor-pointer shrink-0"
                        title="Copy shortcut text"
                      >
                        {isCopied ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-zinc-950/70 border-t border-slate-200 dark:border-zinc-800 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-xs text-slate-500 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 font-mono text-[11px] font-bold text-slate-700 dark:text-zinc-300">F1</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 font-mono text-[11px] font-bold text-slate-700 dark:text-zinc-300">Ctrl + /</kbd> anytime inside Excel Pro to view this cheatsheet
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Guide</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-1.5 rounded-lg bg-[#107c41] hover:bg-emerald-700 text-white font-bold transition-colors cursor-pointer shadow-sm"
            >
              Got It
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
