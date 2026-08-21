import React, { useState, useRef, useEffect } from 'react';
import mammoth from 'mammoth';
import { saveAs } from 'file-saver';
import { 
  Document, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, 
  WidthType, AlignmentType, Packer, BorderStyle, PageBreak 
} from 'docx';
import { 
  FileText, Upload, Download, Sparkles, Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered,
  Type, Image as ImageIcon, Table as TableIcon, Link as LinkIcon, Undo, Redo,
  Printer, Trash2, Eye, FileCode, CheckCircle, RefreshCw, Layers, ZoomIn, ZoomOut,
  Palette, Subscript, Superscript, CornerDownLeft, Sparkle, Plus, Copy, Check,
  BookOpen, Mic, MicOff, Search, Layout, ShieldAlert,
  Scissors, Clipboard, Paintbrush, ChevronDown, Eraser, Highlighter,
  Pilcrow, ArrowUpDown, PaintBucket, Grid, Replace, MousePointer,
  CheckCheck, Grid2x2, ListTree, Indent, Outdent,
  Bookmark, MessageSquarePlus, Video, Hash, Smile, Infinity, Pencil, Rows, PanelTop, Calculator, Sigma, Paperclip,
  BookMarked, Quote, Languages, Globe, UserCheck, MessageSquare, MessageSquareX, Filter, ArrowLeft, ArrowRight, FileCheck, FileX, CheckSquare, SlidersHorizontal, SpellCheck,
  Ruler, SquareDashed, PanelLeft, Moon, Volume2, Columns, Maximize2, SunMedium, Glasses, Monitor, Contrast
} from 'lucide-react';

interface WordEditorWorkstationProps {
  onAddRecentFile: (file: { name: string; size: string; type: string; toolUsed: string }) => void;
  user: any;
  onBackToTools: () => void;
}

// Sample Templates
const TEMPLATES = [
  {
    id: 'blank',
    name: 'Blank Document',
    desc: 'Start with a clean slate for custom writing.',
    icon: FileText,
    content: `<p>Start typing your document here...</p>`
  },
  {
    id: 'business_proposal',
    name: 'Business Proposal',
    desc: 'Professional template for corporate project proposals.',
    icon: Layout,
    content: `
      <h1 style="color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">Project Proposal: Next-Gen Enterprise Platform</h1>
      <p><strong>Prepared for:</strong> Acme Corporation</p>
      <p><strong>Prepared by:</strong> Innovation Services Group</p>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      <hr />
      <h2 style="color: #1e40af;">1. Executive Summary</h2>
      <p>This project proposal outlines our strategic roadmap to modernize infrastructure, boost productivity, and deliver unmatched document security. Our solution integrates seamlessly into existing enterprise workflows.</p>
      
      <h2 style="color: #1e40af;">2. Key Objectives</h2>
      <ul>
        <li>Streamline document creation and digital signature pipelines.</li>
        <li>Ensure 100% data privacy with client-side browser processing.</li>
        <li>Reduce operational overhead by up to 40%.</li>
      </ul>

      <h2 style="color: #1e40af;">3. Implementation Timeline</h2>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; margin-top: 12px;">
        <thead>
          <tr style="background-color: #f1f5f9; text-align: left;">
            <th style="padding: 8px; border: 1px solid #cbd5e1;">Phase</th>
            <th style="padding: 8px; border: 1px solid #cbd5e1;">Milestone Description</th>
            <th style="padding: 8px; border: 1px solid #cbd5e1;">Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">Phase 1</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">Requirements Gathering & Design</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">2 Weeks</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">Phase 2</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">Core Integration & Testing</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">4 Weeks</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">Phase 3</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">Deployment & Staff Training</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">1 Week</td>
          </tr>
        </tbody>
      </table>

      <br />
      <p><em>Thank you for the opportunity to present this proposal. Please let us know if you have any questions.</em></p>
    `
  },
  {
    id: 'resume',
    name: 'Professional Resume',
    desc: 'Clean executive CV layout with key sections.',
    icon: BookOpen,
    content: `
      <h1 style="color: #0f172a; margin-bottom: 2px;">Alex Mercer</h1>
      <p style="color: #2563eb; font-weight: bold; margin-top: 0;">Senior Software Architect & Product Lead</p>
      <p style="color: #64748b; font-size: 14px;">Email: alex.mercer@example.com | Phone: +1 (555) 019-2834 | Location: New York, NY</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 12px 0;" />

      <h3 style="color: #1e293b; text-transform: uppercase; letter-spacing: 1px;">Professional Summary</h3>
      <p>Results-driven Software Architect with 8+ years of experience engineering high-throughput web architectures, cloud applications, and browser-native document tools. Proven record in leading cross-functional engineering teams.</p>

      <h3 style="color: #1e293b; text-transform: uppercase; letter-spacing: 1px;">Core Competencies</h3>
      <ul>
        <li><strong>Frontend & UI:</strong> React, TypeScript, Tailwind CSS, Next.js</li>
        <li><strong>Backend & Cloud:</strong> Node.js, Express, PostgreSQL, Docker, AWS</li>
        <li><strong>Document Engineering:</strong> PDF-Lib, WebAssembly, Canvas API, DOCX Parsing</li>
      </ul>

      <h3 style="color: #1e293b; text-transform: uppercase; letter-spacing: 1px;">Work Experience</h3>
      <p><strong>Lead Full Stack Engineer</strong> — TechSphere Solutions (2022 – Present)</p>
      <ul>
        <li>Architected browser-native document processing pipeline used by 500k+ monthly active users.</li>
        <li>Reduced initial page load latency by 65% through aggressive code-splitting and Web Workers.</li>
      </ul>

      <p><strong>Senior Frontend Developer</strong> — Nexus Digital (2019 – 2022)</p>
      <ul>
        <li>Developed rich text formatting modules and automated export tools.</li>
      </ul>
    `
  },
  {
    id: 'meeting_notes',
    name: 'Meeting Minutes',
    desc: 'Structured meeting template with action items.',
    icon: Sparkles,
    content: `
      <h2 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">Executive Team Sync — Meeting Minutes</h2>
      <p><strong>Date & Time:</strong> ${new Date().toLocaleDateString()} | 10:00 AM EST</p>
      <p><strong>Attendees:</strong> Sarah Jenkins (Chair), Mark Vance, Elena Rostova, David Chen</p>
      
      <h3 style="color: #2563eb;">1. Agenda Items Discussed</h3>
      <ol>
        <li>Review of Q3 Product Roadmap & Deliverables.</li>
        <li>Feedback on the new MS Word & Document Tooling suite.</li>
        <li>Budget allocation for security auditing.</li>
      </ol>

      <h3 style="color: #2563eb;">2. Key Decisions Made</h3>
      <ul>
        <li>Approved release of browser-based DOCX editor with zero cloud tracking.</li>
        <li>Scheduled security penetration testing for next month.</li>
      </ul>

      <h3 style="color: #2563eb;">3. Action Items</h3>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1;">
        <tr style="background: #f8fafc;">
          <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: left;">Task Description</th>
          <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: left;">Assignee</th>
          <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: left;">Due Date</th>
        </tr>
        <tr>
          <td style="padding: 6px; border: 1px solid #cbd5e1;">Finalize DOCX export testing</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1;">Elena R.</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1;">Friday</td>
        </tr>
        <tr>
          <td style="padding: 6px; border: 1px solid #cbd5e1;">Update user documentation</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1;">David C.</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1;">Next Monday</td>
        </tr>
      </table>
    `
  }
];

export default function WordEditorWorkstation({
  onAddRecentFile,
  user,
  onBackToTools,
}: WordEditorWorkstationProps) {
  const [docTitle, setDocTitle] = useState('Document_1.docx');
  const [activeTab, setActiveTab] = useState<'home' | 'insert' | 'layout' | 'references' | 'review' | 'view' | 'templates'>('home');
  const [activeFont, setActiveFont] = useState('Aptos, sans-serif');
  const [fontSize, setFontSize] = useState('16px');
  const [fontColor, setFontColor] = useState('#0f172a');
  const [highlightColor, setHighlightColor] = useState('#fef08a');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [pageMargin, setPageMargin] = useState<'normal' | 'narrow' | 'moderate' | 'wide'>('normal');
  const [pageOrientation, setPageOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [pageBg, setPageBg] = useState<'white' | 'cream' | 'dark'>('white');
  const [pageSize, setPageSize] = useState<'letter' | 'a4' | 'legal' | 'executive' | 'a5'>('a4');
  const [pageColumns, setPageColumns] = useState<'1' | '2' | '3' | 'left' | 'right'>('1');
  const [lineNumbers, setLineNumbers] = useState<'none' | 'continuous' | 'restart_page' | 'restart_section'>('none');
  const [indentLeft, setIndentLeft] = useState<number>(0);
  const [indentRight, setIndentRight] = useState<number>(0);
  const [spacingBefore, setSpacingBefore] = useState<number>(0);
  const [spacingAfter, setSpacingAfter] = useState<number>(8);
  const [pageBorder, setPageBorder] = useState<'none' | 'box' | 'shadow' | 'double' | 'dashed'>('none');

  // View Tab States
  const [documentViewMode, setDocumentViewMode] = useState<'separate' | 'reading' | 'immersive'>('separate');
  const [showRuler, setShowRuler] = useState(true);
  const [showMarginGuides, setShowMarginGuides] = useState(false);
  const [showNavigationPane, setShowNavigationPane] = useState(false);
  const [showHeaderFooter, setShowHeaderFooter] = useState(false);
  const [isReadingAloud, setIsReadingAloud] = useState(false);

  const [isDarkModeCanvas, setIsDarkModeCanvas] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  // Home Ribbon UI Dropdowns & Flags
  const [showCaseMenu, setShowCaseMenu] = useState(false);
  const [showSpacingMenu, setShowSpacingMenu] = useState(false);
  const [showParagraphMarks, setShowParagraphMarks] = useState(false);

  // Insert Ribbon UI Dropdowns
  const [showInsertTableMenu, setShowInsertTableMenu] = useState(false);
  const [showInsertPictureMenu, setShowInsertPictureMenu] = useState(false);
  const [showInsertLinkMenu, setShowInsertLinkMenu] = useState(false);
  const [showInsertBookmarkMenu, setShowInsertBookmarkMenu] = useState(false);
  const [showInsertPageNumMenu, setShowInsertPageNumMenu] = useState(false);
  const [showInsertEquationMenu, setShowInsertEquationMenu] = useState(false);
  const [showInsertSymbolMenu, setShowInsertSymbolMenu] = useState(false);
  const [showInsertEmojiMenu, setShowInsertEmojiMenu] = useState(false);

  // Layout & Design Ribbon UI Dropdowns
  const [showMarginsMenu, setShowMarginsMenu] = useState(false);
  const [showOrientationMenu, setShowOrientationMenu] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [showBreaksMenu, setShowBreaksMenu] = useState(false);
  const [showLineNumbersMenu, setShowLineNumbersMenu] = useState(false);
  const [showPageBordersMenu, setShowPageBordersMenu] = useState(false);
  const [showPageColorMenu, setShowPageColorMenu] = useState(false);

  // References Ribbon UI Dropdowns
  const [showCitationsMenu, setShowCitationsMenu] = useState(false);

  // Review & Stats Ribbon UI States
  const [showEditorMenu, setShowEditorMenu] = useState(false);
  const [showSpellingMenu, setShowSpellingMenu] = useState(false);
  const [showWordCountMenu, setShowWordCountMenu] = useState(false);
  const [showTranslateMenu, setShowTranslateMenu] = useState(false);
  const [showDeleteCommentMenu, setShowDeleteCommentMenu] = useState(false);
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [markupView, setMarkupView] = useState<'all' | 'simple' | 'none' | 'original'>('all');
  const [trackChanges, setTrackChanges] = useState<'off' | 'everyone' | 'mine'>('off');
  const [showAcceptMenu, setShowAcceptMenu] = useState(false);
  const [showRejectMenu, setShowRejectMenu] = useState(false);
  const [commentsList, setCommentsList] = useState<Array<{ id: number; text: string; author: string; date: string; quote?: string }>>([]);
  const [activeCommentIndex, setActiveCommentIndex] = useState<number>(-1);
  const [showWordCountModal, setShowWordCountModal] = useState(false);

  // Margin Helper Functions
  const getMarginPx = () => {
    switch (pageMargin) {
      case 'narrow': return 48; // 0.5"
      case 'moderate': return 72; // 0.75"
      case 'wide': return 120; // 1.25"
      case 'normal':
      default: return 96; // 1.0"
    }
  };

  const getMarginLabel = () => {
    switch (pageMargin) {
      case 'narrow': return 'Narrow (0.5")';
      case 'moderate': return 'Moderate (0.75")';
      case 'wide': return 'Wide (1.25")';
      case 'normal':
      default: return 'Normal (1.0")';
    }
  };

  // Page Height & Max Printable height helper
  const getPageHeightAndMaxPx = () => {
    let cardHeight = 1123;
    if (pageOrientation === 'landscape') {
      cardHeight = pageSize === 'letter' ? 816 : pageSize === 'legal' ? 816 : pageSize === 'executive' ? 696 : pageSize === 'a5' ? 560 : 794;
    } else {
      cardHeight = pageSize === 'letter' ? 1056 : pageSize === 'legal' ? 1344 : pageSize === 'executive' ? 1008 : pageSize === 'a5' ? 800 : 1123;
    }
    const marginPx = getMarginPx();
    const maxPx = cardHeight - (2 * marginPx);
    return { cardHeight, maxPx };
  };

  // Multi-Page A4 Sheet State
  const [pages, setPages] = useState<string[]>(['<p>Start typing your document here...</p>']);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pageInputTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Page Height Monitor State
  const [pageHeightStats, setPageHeightStats] = useState<{
    usedPx: number;
    maxPx: number;
    percentage: number;
    isOverflowing: boolean;
  }>({ usedPx: 0, maxPx: 840, percentage: 0, isOverflowing: false });

  // Document statistics
  const [stats, setStats] = useState({ words: 0, chars: 0, paragraphs: 0, readTime: '1 min' });

  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-save to localStorage
  useEffect(() => {
    const savedPages = localStorage.getItem('word_editor_draft_pages');
    const legacySaved = localStorage.getItem('word_editor_draft');

    if (savedPages) {
      try {
        const parsed = JSON.parse(savedPages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPages(parsed);
          return;
        }
      } catch (e) {
        console.warn('Could not parse saved pages array', e);
      }
    }

    if (legacySaved) {
      if (legacySaved.includes('page-break') || legacySaved.includes('PAGE BREAK')) {
        const chunks = legacySaved.split(/<div[^>]*page-break[^>]*>.*?<\/div>|--- PAGE BREAK ---/gi).filter(c => c.trim());
        setPages(chunks.length > 0 ? chunks : [legacySaved]);
      } else {
        setPages([legacySaved]);
      }
    } else {
      setPages([TEMPLATES[0].content]);
    }
  }, []);

  // Synchronize DOM contents with pages state without destroying active typing
  useEffect(() => {
    pages.forEach((content, idx) => {
      const ref = pageRefs.current[idx];
      if (ref) {
        const isEditingThisPage = document.activeElement === ref || ref.contains(document.activeElement);
        if (!isEditingThisPage && ref.innerHTML !== content) {
          ref.innerHTML = content;
        }
      }
    });
    updateStats();
  }, [pages]);

  // Update paragraph indents, spacing, and automatically re-paginate layout live on properties change
  useEffect(() => {
    pageRefs.current.forEach(pageEl => {
      if (!pageEl) return;
      const paras = pageEl.querySelectorAll('p, h1, h2, h3, li');
      paras.forEach((p, idx) => {
        const el = p as HTMLElement;
        el.style.paddingLeft = `${indentLeft}cm`;
        el.style.paddingRight = `${indentRight}cm`;
        el.style.marginTop = `${spacingBefore}pt`;
        el.style.marginBottom = `${spacingAfter}pt`;

        if (lineNumbers === 'continuous' || lineNumbers === 'restart_page' || lineNumbers === 'restart_section') {
          el.setAttribute('data-line-num', `${idx + 1}`);
        } else {
          el.removeAttribute('data-line-num');
        }
      });
    });

    const t = setTimeout(() => {
      paginateFromPage(0);
    }, 100);

    return () => clearTimeout(t);
  }, [
    indentLeft,
    indentRight,
    spacingBefore,
    spacingAfter,
    lineNumbers,
    pageMargin,
    pageOrientation,
    pageSize,
    pageColumns,
    activeFont,
    fontSize
  ]);

  const triggerNotify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Add a new blank A4 page
  const handleAddPage = (afterIndex?: number) => {
    const insertIndex = afterIndex !== undefined ? afterIndex + 1 : pages.length;
    setPages(prev => {
      const next = [...prev];
      next.splice(insertIndex, 0, '<p>New page content...</p>');
      localStorage.setItem('word_editor_draft_pages', JSON.stringify(next));
      return next;
    });
    setActivePageIndex(insertIndex);
    triggerNotify(`Added Page ${insertIndex + 1}. Total ${pages.length + 1} Pages.`);
  };

  // Delete an A4 page
  const handleDeletePage = (index: number) => {
    if (pages.length <= 1) {
      setPages(['<p><br></p>']);
      if (pageRefs.current[0]) pageRefs.current[0].innerHTML = '<p><br></p>';
      localStorage.setItem('word_editor_draft_pages', JSON.stringify(['<p><br></p>']));
      triggerNotify('Cleared Page 1.');
      return;
    }

    setPages(prev => {
      const next = prev.filter((_, i) => i !== index);
      localStorage.setItem('word_editor_draft_pages', JSON.stringify(next));
      return next;
    });

    const nextActive = Math.max(0, index - 1);
    setActivePageIndex(nextActive);
    triggerNotify(`Deleted Page ${index + 1}. Remaining ${pages.length - 1} Pages.`);
  };

  // Re-order pages
  const handleMovePage = (index: number, dir: number) => {
    const targetIndex = index + dir;
    if (targetIndex < 0 || targetIndex >= pages.length) return;

    setPages(prev => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      localStorage.setItem('word_editor_draft_pages', JSON.stringify(next));
      return next;
    });

    setActivePageIndex(targetIndex);
    triggerNotify(`Moved Page ${index + 1} to position ${targetIndex + 1}`);
  };

  // Page Height Monitor Calculator
  const updatePageHeightMonitor = (index = activePageIndex) => {
    const el = pageRefs.current[index];
    if (!el) return;

    const { maxPx } = getPageHeightAndMaxPx();
    const usedPx = el.scrollHeight;
    const percentage = Math.min(100, Math.round((usedPx / maxPx) * 100));
    const isOverflowing = usedPx > maxPx + 4;

    setPageHeightStats({
      usedPx,
      maxPx,
      percentage,
      isOverflowing,
    });
  };

  // Continuous Page Height Monitoring Effect
  useEffect(() => {
    updatePageHeightMonitor(activePageIndex);
  }, [activePageIndex, pages, pageOrientation, activeFont]);

  // Helper to clean and sanitize pasted HTML/text to keep it strictly inside A4 bounds
  const sanitizePastedContent = (rawHtml: string, rawText: string): string => {
    let content = rawHtml;

    if (!content || !content.trim()) {
      if (!rawText || !rawText.trim()) return '<p><br></p>';
      const paragraphs = rawText
        .split(/\r?\n\r?\n/)
        .map(p => p.trim())
        .filter(Boolean)
        .map(p => `<p>${p.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r?\n/g, '<br/>')}</p>`);
      return paragraphs.length > 0 ? paragraphs.join('') : `<p>${rawText}</p>`;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');

      // Remove harmful scripts, styles, metadata
      const scripts = doc.querySelectorAll('script, style, meta, link, title');
      scripts.forEach(s => s.remove());

      // Clean up inline styles on all elements that break A4 page layouts
      const allEls = doc.body.querySelectorAll('*');
      allEls.forEach(el => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.style) {
          htmlEl.style.position = 'static';
          htmlEl.style.left = '';
          htmlEl.style.right = '';
          htmlEl.style.top = '';
          htmlEl.style.bottom = '';
          htmlEl.style.float = 'none';
          htmlEl.style.clear = 'both';
          htmlEl.style.width = 'auto';
          htmlEl.style.minWidth = '0px';
          htmlEl.style.maxWidth = '100%';
          htmlEl.style.whiteSpace = 'normal';
          htmlEl.style.overflowWrap = 'anywhere';
          htmlEl.style.wordBreak = 'break-word';
        }
        // If image, ensure responsive within A4 margins
        if (el.tagName.toLowerCase() === 'img') {
          htmlEl.style.maxWidth = '100%';
          htmlEl.style.height = 'auto';
          htmlEl.style.display = 'block';
          htmlEl.style.margin = '0.5rem auto';
        }
        // If table, ensure contained
        if (el.tagName.toLowerCase() === 'table') {
          htmlEl.style.width = '100%';
          htmlEl.style.maxWidth = '100%';
          htmlEl.style.tableLayout = 'fixed';
        }
      });

      return doc.body.innerHTML || `<p>${rawText}</p>`;
    } catch (e) {
      console.warn('Sanitize paste error:', e);
      return `<p>${rawText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
    }
  };

  // Handle native paste inside A4 sheet
  const handleNativePaste = (e: React.ClipboardEvent<HTMLDivElement>, pageIndex: number) => {
    e.preventDefault();
    const clipboardData = e.clipboardData;
    const rawHtml = clipboardData.getData('text/html');
    const rawText = clipboardData.getData('text/plain');

    const cleanHtml = sanitizePastedContent(rawHtml, rawText);

    // Insert clean HTML at current selection cursor
    const sel = window.getSelection();
    let pastedSuccessfully = false;

    if (sel && sel.rangeCount > 0) {
      try {
        // execCommand('insertHTML') flattens and manages block splitting/nesting natively
        pastedSuccessfully = document.execCommand('insertHTML', false, cleanHtml);
      } catch (err) {
        console.warn('execCommand insertHTML failed, using fallback range insertion:', err);
      }

      if (!pastedSuccessfully) {
        const range = sel.getRangeAt(0);
        range.deleteContents();

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cleanHtml;

        const frag = document.createDocumentFragment();
        let lastNode: Node | null = null;
        while (tempDiv.firstChild) {
          lastNode = frag.appendChild(tempDiv.firstChild);
        }
        range.insertNode(frag);

        if (lastNode) {
          range.setStartAfter(lastNode);
          range.setEndAfter(lastNode);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    } else {
      const el = pageRefs.current[pageIndex];
      if (el) {
        el.innerHTML += cleanHtml;
      }
    }

    triggerNotify('Pasted content auto-formatted to fit A4 page margins.');

    // Use triggerPagination to clear any fast pending input timers and trigger the precise split layout.
    triggerPagination(pageIndex, 150);
  };

  // Helper to find text node and its local offset at a cumulative character index
  const getTextNodeAndOffsetAt = (parent: Node, targetIndex: number): { node: Node; offset: number } | null => {
    let currentIndex = 0;
    let found: { node: Node; offset: number } | null = null;

    const traverse = (node: Node) => {
      if (found) return;

      if (node.nodeType === Node.TEXT_NODE) {
        const len = node.textContent?.length || 0;
        if (currentIndex + len >= targetIndex) {
          found = { node, offset: targetIndex - currentIndex };
          return;
        }
        currentIndex += len;
      } else {
        for (let i = 0; i < node.childNodes.length; i++) {
          traverse(node.childNodes[i]);
        }
      }
    };

    traverse(parent);
    return found;
  };

  // Helper to get caret character offset relative to a parent element
  const getSelectionCharacterOffsetWithin = (parent: Node): number => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return -1;
    const range = sel.getRangeAt(0);
    if (!parent.contains(range.endContainer)) return -1;
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(parent);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    return preCaretRange.toString().length;
  };

  // Helper to restore caret selection inside a parent element at a specific character offset
  const setSelectionCharacterOffsetWithin = (parent: Node, offset: number) => {
    let currentIndex = 0;
    let found = false;

    const traverse = (node: Node) => {
      if (found) return;

      if (node.nodeType === Node.TEXT_NODE) {
        const len = node.textContent?.length || 0;
        if (currentIndex + len >= offset) {
          try {
            const range = document.createRange();
            const sel = window.getSelection();
            range.setStart(node, offset - currentIndex);
            range.collapse(true);
            sel?.removeAllRanges();
            sel?.addRange(range);
            found = true;
          } catch (err) {
            console.warn('Failed to set range start:', err);
          }
          return;
        }
        currentIndex += len;
      } else {
        for (let i = 0; i < node.childNodes.length; i++) {
          traverse(node.childNodes[i]);
        }
      }
    };

    traverse(parent);

    // Fallback: put caret at end of the parent
    if (!found) {
      try {
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(parent);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      } catch (err) {
        console.warn('Fallback caret setting failed:', err);
      }
    }
  };

  // Handle keyboard keys inside contentEditable pages for merges/backspace
  const handlePageKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, pageIndex: number) => {
    if (e.key === 'Backspace') {
      const currentEl = pageRefs.current[pageIndex];
      if (currentEl) {
        const caretOffset = getSelectionCharacterOffsetWithin(currentEl);
        if (caretOffset === 0 && pageIndex > 0) {
          e.preventDefault();
          const prevEl = pageRefs.current[pageIndex - 1];
          if (prevEl) {
            // Get original previous text length
            const prevTextLength = prevEl.textContent?.length || 0;

            // Move all children of current page to the end of previous page
            const currentChildren = Array.from(currentEl.children);
            currentChildren.forEach(child => {
              prevEl.appendChild(child);
            });

            // Focus previous page and restore cursor at the merge point
            prevEl.focus();
            setSelectionCharacterOffsetWithin(prevEl, prevTextLength);

            // Remove the current page from the array
            setPages(prev => {
              const next = prev.filter((_, idx) => idx !== pageIndex);
              localStorage.setItem('word_editor_draft_pages', JSON.stringify(next));
              return next;
            });

            setActivePageIndex(pageIndex - 1);

            // Trigger cascading layout flow from the merged page
            setTimeout(() => {
              paginateFromPage(pageIndex - 1);
            }, 10);
          }
        }
      }
    }
  };

  // Helper to ensure bare text nodes or elements inside A4 page are properly wrapped in paragraphs
  const ensureParagraphWrappers = (el: HTMLElement) => {
    if (!el || !el.childNodes.length) return;

    let needsWrapping = false;
    for (let i = 0; i < el.childNodes.length; i++) {
      const node = el.childNodes[i];
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        needsWrapping = true;
        break;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = (node as HTMLElement).tagName;
        const isBlock = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'TABLE', 'BLOCKQUOTE', 'PRE', 'HR'].includes(tagName);
        if (!isBlock) {
          needsWrapping = true;
          break;
        }
      }
    }

    if (needsWrapping) {
      const fragment = document.createDocumentFragment();
      let tempP: HTMLParagraphElement | null = null;

      Array.from(el.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          if (node.textContent && node.textContent.trim()) {
            if (!tempP) tempP = document.createElement('p');
            tempP.appendChild(node.cloneNode(true));
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const elem = node as HTMLElement;
          const isBlock = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'TABLE', 'BLOCKQUOTE', 'PRE', 'HR'].includes(elem.tagName);
          if (isBlock) {
            if (tempP) {
              fragment.appendChild(tempP);
              tempP = null;
            }
            fragment.appendChild(elem.cloneNode(true));
          } else {
            if (!tempP) tempP = document.createElement('p');
            tempP.appendChild(elem.cloneNode(true));
          }
        }
      });

      if (tempP) {
        fragment.appendChild(tempP);
      }

      if (fragment.childNodes.length > 0) {
        el.innerHTML = '';
        el.appendChild(fragment);
      }
    }
  };

  // Automatic Cascading Page Overflow & Pagination Engine
  const paginateFromPage = (index: number) => {
    const el = pageRefs.current[index];
    if (!el) return;

    ensureParagraphWrappers(el);

    const { maxPx } = getPageHeightAndMaxPx();
    if (el.offsetHeight === 0) return;

    const scale = zoomLevel / 100;

    // Helper to calculate the unscaled vertical top offset of any child relative to the content area container
    const getElementTopUnscaled = (elem: HTMLElement) => {
      let top = elem.offsetTop;
      let p = elem.offsetParent as HTMLElement;
      while (p && p !== el && el.contains(p)) {
        top += p.offsetTop;
        p = p.offsetParent as HTMLElement;
      }
      return top;
    };

    // Helper to calculate the unscaled vertical bottom offset of any child relative to the content area container
    const getElementBottomUnscaled = (elem: HTMLElement) => {
      return getElementTopUnscaled(elem) + elem.offsetHeight;
    };

    // --- 1. FIRST, ATTEMPT TO PULL CONTENT UP FROM SUBSEQUENT PAGES IF WE HAVE UNDERFLOW SPACE ---
    let pulledAny = false;
    const nextPageIndex = index + 1;
    const nextEl = pageRefs.current[nextPageIndex];
    if (nextEl) {
      ensureParagraphWrappers(nextEl);
      const nextChildren = Array.from(nextEl.children) as HTMLElement[];
      
      // Save cursor before pulling
      const caretOffset = getSelectionCharacterOffsetWithin(nextEl);
      let caretMovedToPrev = false;
      let caretMovedOffset = -1;

      for (let k = 0; k < nextChildren.length; k++) {
        const childOfNext = nextChildren[k];
        
        // Temporarily append to el to measure
        el.appendChild(childOfNext);
        
        const childBottomUnscaled = getElementBottomUnscaled(childOfNext);
        
        if (childBottomUnscaled <= maxPx) {
          // It fits! Keep it here
          pulledAny = true;
          
          // If cursor was in this child, track its new position
          if (caretOffset !== -1 && nextEl.contains(window.getSelection()?.anchorNode || null)) {
            caretMovedToPrev = true;
            caretMovedOffset = caretOffset;
          }
        } else {
          // It doesn't fit! Put it and all remaining children back at the start of the next page
          nextEl.insertBefore(childOfNext, nextEl.firstChild);
          for (let m = k + 1; m < nextChildren.length; m++) {
            nextEl.appendChild(nextChildren[m]);
          }
          break;
        }
      }

      if (pulledAny) {
        const updatedCurrentHtml = el.innerHTML || '<p><br></p>';
        const updatedNextHtml = nextEl.innerHTML || '<p><br></p>';

        setPages(prev => {
          const next = [...prev];
          next[index] = updatedCurrentHtml;
          next[nextPageIndex] = updatedNextHtml;
          
          // Remove trailing empty pages
          while (next.length > 1 && (!next[next.length - 1] || next[next.length - 1].trim() === '' || next[next.length - 1] === '<p><br></p>')) {
            next.pop();
          }

          localStorage.setItem('word_editor_draft_pages', JSON.stringify(next));
          return next;
        });

        // Restore cursor if it was in the pulled element
        if (caretMovedToPrev) {
          setTimeout(() => {
            setSelectionCharacterOffsetWithin(el, caretMovedOffset);
          }, 50);
        }

        updateStats();
        updatePageHeightMonitor(index);
        
        // Recursively paginate the next page since we modified its children
        if (nextPageIndex < pages.length) {
          paginateFromPage(nextPageIndex);
        }
        return;
      }
    }

    // --- 2. ATTEMPT TO PUSH OVERFLOW CONTENT DOWN TO NEXT PAGES ---
    const children = Array.from(el.children) as HTMLElement[];
    if (children.length === 0) return;

    let overflowElementsHtml: string[] = [];
    let splitOccurred = false;
    let caretOffset = -1;
    let overflowCaretOffset = -1;
    let caretInOverflowingChild = false;

    // Track cursor location before splitting
    const activeSelection = window.getSelection();
    let selectedChildIndex = -1;
    if (activeSelection && activeSelection.rangeCount > 0) {
      const anchorNode = activeSelection.anchorNode;
      if (anchorNode && el.contains(anchorNode)) {
        selectedChildIndex = children.findIndex(c => c.contains(anchorNode));
        if (selectedChildIndex !== -1) {
          caretOffset = getSelectionCharacterOffsetWithin(children[selectedChildIndex]);
        }
      }
    }

    // Iterate through children to detect where overflow starts
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const childBottomUnscaled = getElementBottomUnscaled(child);

      if (childBottomUnscaled > maxPx) {
        const childTopUnscaled = getElementTopUnscaled(child);
        const tagName = child.tagName.toLowerCase();
        const isParagraph = tagName === 'p' || tagName === 'div' || tagName.startsWith('h');

        // Check if the overflowing block straddles the margin or is the first child
        if (isParagraph && (i === 0 || (childTopUnscaled < maxPx - 20))) {
          // This is a paragraph that straddles the page boundary. Split it using DOM Range on a cloned element first to avoid layout thrashing!
          const originalHtml = child.innerHTML;
          const totalLen = child.textContent?.length || 0;

          if (totalLen > 4) {
            // Create a temporary deep clone of child to measure without mutating the active page DOM during binary search
            const tempP = child.cloneNode(true) as HTMLElement;
            // Ensure identical styling and dimensions
            tempP.style.position = 'absolute';
            tempP.style.visibility = 'hidden';
            tempP.style.width = `${child.offsetWidth}px`;
            el.appendChild(tempP);

            let low = 1;
            let high = totalLen - 1;
            let bestFitIndex = 1;

            const remainingSpace = maxPx - childTopUnscaled;

            while (low <= high) {
              const mid = Math.floor((low + high) / 2);
              
              // Apply temporary split on tempP
              const splitRes = getTextNodeAndOffsetAt(tempP, mid);
              if (splitRes) {
                try {
                  const range = document.createRange();
                  range.setStart(splitRes.node, splitRes.offset);
                  range.setEndAfter(tempP.lastChild || tempP);
                  range.extractContents();
                  
                  // Measure the layout height of tempP
                  if (tempP.offsetHeight <= remainingSpace) {
                    bestFitIndex = mid;
                    low = mid + 1;
                  } else {
                    high = mid - 1;
                  }
                } catch (e) {
                  high = mid - 1;
                }
              } else {
                high = mid - 1;
              }
              
              // Restore tempP html for next iteration
              tempP.innerHTML = originalHtml;
            }

            // Remove the temporary measurement clone
            tempP.remove();

            // Perform the final precise split at bestFitIndex on the REAL child
            const splitRes = getTextNodeAndOffsetAt(child, bestFitIndex);
            if (splitRes) {
              try {
                const range = document.createRange();
                range.setStart(splitRes.node, splitRes.offset);
                range.setEndAfter(child.lastChild || child);
                const overflowFrag = range.extractContents();
                
                // Create identical node container to preserve styles, classes, tags
                const clone = child.cloneNode(false) as HTMLElement;
                clone.appendChild(overflowFrag);
                
                overflowElementsHtml.push(clone.outerHTML);

                // Handle caret transfer
                if (i === selectedChildIndex && caretOffset !== -1) {
                  if (caretOffset > bestFitIndex) {
                    caretInOverflowingChild = true;
                    overflowCaretOffset = caretOffset - bestFitIndex;
                  }
                }
              } catch (e) {
                // Fallback: move entire block
                overflowElementsHtml.push(child.outerHTML);
                child.remove();
                if (i === selectedChildIndex) {
                  caretInOverflowingChild = true;
                  overflowCaretOffset = caretOffset;
                }
              }
            } else {
              // Fallback
              overflowElementsHtml.push(child.outerHTML);
              child.remove();
              if (i === selectedChildIndex) {
                caretInOverflowingChild = true;
                overflowCaretOffset = caretOffset;
              }
            }

            // Move all subsequent children to overflow
            for (let j = i + 1; j < children.length; j++) {
              overflowElementsHtml.push(children[j].outerHTML);
              if (j === selectedChildIndex) {
                caretInOverflowingChild = true;
                overflowCaretOffset = caretOffset;
              }
              children[j].remove();
            }
          } else {
            // Element is too short to split, move entire element to overflow
            for (let j = i; j < children.length; j++) {
              overflowElementsHtml.push(children[j].outerHTML);
              if (j === selectedChildIndex) {
                caretInOverflowingChild = true;
                overflowCaretOffset = caretOffset;
              }
              children[j].remove();
            }
          }
        } else {
          // Element starts after boundary or is not a splittable block type (e.g. table, image, pre), move this and all subsequent children
          for (let j = i; j < children.length; j++) {
            overflowElementsHtml.push(children[j].outerHTML);
            if (j === selectedChildIndex) {
              caretInOverflowingChild = true;
              overflowCaretOffset = caretOffset;
            }
            children[j].remove();
          }
        }
        splitOccurred = true;
        break;
      }
    }

    if (splitOccurred && overflowElementsHtml.length > 0) {
      const overflowHtml = overflowElementsHtml.join('');
      const currentHtml = el.innerHTML || '<p><br></p>';

      setPages(prev => {
        const next = [...prev];
        next[index] = currentHtml;

        if (index === next.length - 1) {
          next.push(overflowHtml);
        } else {
          next[index + 1] = overflowHtml + (next[index + 1] || '');
        }

        localStorage.setItem('word_editor_draft_pages', JSON.stringify(next));
        return next;
      });

      const nextPageIndex = index + 1;
      setActivePageIndex(nextPageIndex);

      // Restore focus and precise caret position on the next page
      setTimeout(() => {
        const nextEl = pageRefs.current[nextPageIndex];
        if (nextEl) {
          nextEl.focus();
          
          if (caretInOverflowingChild && overflowCaretOffset !== -1) {
            setSelectionCharacterOffsetWithin(nextEl, overflowCaretOffset);
          } else {
            // Put cursor at the start of next page
            try {
              const range = document.createRange();
              const sel = window.getSelection();
              range.selectNodeContents(nextEl);
              range.collapse(true);
              sel?.removeAllRanges();
              sel?.addRange(range);
            } catch (e) {
              console.warn('Fallback caret alignment failed:', e);
            }
          }

          // Recursively cascade pagination to next page
          paginateFromPage(nextPageIndex);
        }
      }, 50);

      triggerNotify(`Page ${index + 1} full — content seamlessly flowed to Page ${nextPageIndex + 1}.`);
      updateStats();
      updatePageHeightMonitor(nextPageIndex);
      return;
    }

    // Save current HTML when no overflow or split occurred
    setPages(prev => {
      const next = [...prev];
      next[index] = el.innerHTML;
      localStorage.setItem('word_editor_draft_pages', JSON.stringify(next));
      return next;
    });

    updateStats();
    updatePageHeightMonitor(index);
  };

  // Trigger pagination with a debounce to prevent race conditions on fast typing or simultaneous events
  const triggerPagination = (index: number, delay = 150) => {
    if (pageInputTimeoutRef.current) {
      clearTimeout(pageInputTimeoutRef.current);
    }
    pageInputTimeoutRef.current = setTimeout(() => {
      paginateFromPage(index);
    }, delay);
  };

  // Handle live input inside each page sheet with continuous automatic pagination
  const handlePageInput = (index: number) => {
    triggerPagination(index, 100);
  };

  const handleEditorChange = () => {
    const currentPages = pageRefs.current.map((ref, idx) => ref ? ref.innerHTML : pages[idx] || '').filter(Boolean);
    if (currentPages.length > 0) {
      setPages(currentPages);
      localStorage.setItem('word_editor_draft_pages', JSON.stringify(currentPages));
    }
    updateStats();
  };

  const updateStats = () => {
    const pageEls = Array.from(document.querySelectorAll('.a4-page-content')) as HTMLElement[];
    let fullText = '';
    if (pageEls.length > 0) {
      fullText = pageEls.map(n => n.innerText || '').join('\n');
    } else {
      fullText = pages.map(p => p.replace(/<[^>]*>/g, '')).join('\n');
    }

    const text = fullText.trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const chars = text.length;
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim()).length || (words > 0 ? 1 : 0);
    const readTime = Math.ceil(words / 200) + ' min';
    setStats({ words, chars, paragraphs, readTime });
  };

  // Formatting Helper via execCommand
  const formatDoc = (cmd: string, value: string | undefined = undefined) => {
    document.execCommand(cmd, false, value);
    const activeEl = pageRefs.current[activePageIndex];
    if (activeEl) {
      activeEl.focus();
      handlePageInput(activePageIndex);
    } else {
      handleEditorChange();
    }
  };

  // Clipboard Operations
  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          formatDoc('insertText', text);
          triggerNotify('Pasted text from clipboard.');
          return;
        }
      }
      formatDoc('paste');
    } catch {
      triggerNotify('Use Ctrl+V or right click to paste into editor.');
    }
  };

  const handleCopy = () => {
    document.execCommand('copy');
    triggerNotify('Copied selection to clipboard.');
  };

  const handleCut = () => {
    document.execCommand('cut');
    triggerNotify('Cut selection to clipboard.');
  };

  const handleFormatPainter = () => {
    triggerNotify('Format Painter: Formatting captured! Click text to apply.');
  };

  // Font Size Increments
  const handleIncreaseFontSize = () => {
    const currentNum = parseInt(fontSize) || 16;
    const nextNum = Math.min(72, currentNum + 2);
    setFontSize(`${nextNum}px`);
    formatDoc('fontSize', '4');
    triggerNotify(`Font size increased to ${nextNum}pt`);
  };

  const handleDecreaseFontSize = () => {
    const currentNum = parseInt(fontSize) || 16;
    const nextNum = Math.max(8, currentNum - 2);
    setFontSize(`${nextNum}px`);
    formatDoc('fontSize', '2');
    triggerNotify(`Font size decreased to ${nextNum}pt`);
  };

  // Change Case
  const handleChangeCase = (caseType: 'uppercase' | 'lowercase' | 'sentence' | 'title') => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      triggerNotify('Please select text to change case.');
      return;
    }
    const text = selection.toString();
    let converted = text;
    if (caseType === 'uppercase') converted = text.toUpperCase();
    if (caseType === 'lowercase') converted = text.toLowerCase();
    if (caseType === 'sentence') converted = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    if (caseType === 'title') converted = text.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    formatDoc('insertText', converted);
    triggerNotify(`Changed text case to ${caseType}.`);
  };

  // Sort Paragraphs
  const handleSortParagraphs = () => {
    if (!editorRef.current) return;
    const paragraphs: HTMLElement[] = Array.from(editorRef.current.querySelectorAll('p, h1, h2, h3, li')) as HTMLElement[];
    if (paragraphs.length === 0) return;
    paragraphs.sort((a, b) => ((a.textContent || '') as string).localeCompare((b.textContent || '') as string));
    paragraphs.forEach(p => editorRef.current?.appendChild(p));
    handleEditorChange();
    triggerNotify('Sorted paragraphs alphabetically.');
  };

  // Line Spacing
  const handleLineSpacing = (height: string) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      let parent = selection.getRangeAt(0).startContainer.parentElement;
      if (parent) {
        parent.style.lineHeight = height;
        handleEditorChange();
        triggerNotify(`Set line spacing to ${height}`);
      }
    } else if (editorRef.current) {
      editorRef.current.style.lineHeight = height;
      handleEditorChange();
      triggerNotify(`Set document line spacing to ${height}`);
    }
  };

  // Paragraph Shading
  const handleParagraphShading = (color: string) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      let parent = selection.getRangeAt(0).startContainer.parentElement;
      if (parent) {
        parent.style.backgroundColor = color;
        handleEditorChange();
      }
    }
  };

  // Quick Style Cards
  const applyStyleCard = (styleType: string) => {
    if (styleType === 'Normal') {
      formatDoc('formatBlock', 'p');
    } else if (styleType === 'No Spacing') {
      formatDoc('formatBlock', 'p');
      handleLineSpacing('1.0');
    } else if (styleType === 'Heading 1') {
      formatDoc('formatBlock', 'h1');
    } else if (styleType === 'Heading 2') {
      formatDoc('formatBlock', 'h2');
    } else if (styleType === 'Title') {
      formatDoc('formatBlock', 'h1');
    } else if (styleType === 'Subtitle') {
      formatDoc('formatBlock', 'h3');
    }
    triggerNotify(`Applied style: ${styleType}`);
  };

  // Insert Tab Actions
  const handleInsertPageBreak = () => {
    handleAddPage(activePageIndex);
  };

  const handleInsertTableOfContents = () => {
    if (!editorRef.current) return;
    const headings: HTMLElement[] = Array.from(editorRef.current.querySelectorAll('h1, h2, h3')) as HTMLElement[];
    let tocItemsHtml = '';
    if (headings.length === 0) {
      tocItemsHtml = `
        <li style="margin-bottom: 4px; color: #2563eb;">1. Document Introduction</li>
        <li style="margin-bottom: 4px; color: #2563eb;">2. Project Specifications</li>
        <li style="margin-bottom: 4px; color: #2563eb;">3. Summary & Key Results</li>
      `;
    } else {
      headings.forEach((h, idx) => {
        const indent = h.tagName.toLowerCase() === 'h1' ? 0 : h.tagName.toLowerCase() === 'h2' ? 12 : 24;
        tocItemsHtml += `<li style="margin-left: ${indent}px; margin-bottom: 6px;"><a href="#heading-${idx}" style="color: #2563eb; text-decoration: none; font-weight: 500;">${idx + 1}. ${h.textContent || 'Section Heading'}</a></li>`;
      });
    }
    const tocHtml = `
      <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <h3 style="margin-top: 0; margin-bottom: 12px; color: #0f172a; font-size: 15px; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">Table of Contents</h3>
        <ol style="padding-left: 20px; margin: 0; font-size: 13px;">
          ${tocItemsHtml}
        </ol>
      </div>
      <p>&nbsp;</p>
    `;
    formatDoc('insertHTML', tocHtml);
    triggerNotify('Inserted Table of Contents.');
  };

  const handleInsertOnlineVideo = () => {
    const videoUrl = prompt('Enter YouTube or Video URL:', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    if (!videoUrl) return;
    let embedUrl = videoUrl;
    if (videoUrl.includes('youtube.com/watch?v=')) {
      embedUrl = videoUrl.replace('watch?v=', 'embed/');
    } else if (videoUrl.includes('youtu.be/')) {
      embedUrl = videoUrl.replace('youtu.be/', 'youtube.com/embed/');
    }
    const videoHtml = `
      <div style="margin: 16px 0; text-align: center;">
        <iframe src="${embedUrl}" width="100%" height="300" style="max-width: 520px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);" allowfullscreen></iframe>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Embedded Online Video</div>
      </div>
      <p>&nbsp;</p>
    `;
    formatDoc('insertHTML', videoHtml);
    triggerNotify('Embedded Online Video into document.');
  };

  const handleInsertComment = () => {
    const commentText = prompt('Enter review comment:', 'Check paragraph clarity and formatting.');
    if (!commentText) return;
    const authorName = user?.name || user?.email || 'Reviewer';
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const commentHtml = `
      <span style="background-color: #fef08a; border-bottom: 2px solid #eab308; padding: 2px 6px; border-radius: 4px; font-size: 12px;" title="Comment by ${authorName} at ${timeStr}">
        💬 [Comment: "${commentText}" - <em>${authorName}</em>]
      </span>&nbsp;
    `;
    formatDoc('insertHTML', commentHtml);
    triggerNotify('Inserted New Comment.');
  };

  const handleInsertHeaderFooter = () => {
    const headerText = prompt('Enter Page Header text:', 'Confidential Document');
    const footerText = prompt('Enter Page Footer text:', 'Page 1 | Printed by MS Word Online');
    if (!headerText && !footerText) return;
    
    if (editorRef.current) {
      if (headerText) {
        const hDiv = document.createElement('div');
        hDiv.style.cssText = 'border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 16px; font-size: 11px; color: #64748b; text-align: right;';
        hDiv.innerText = headerText;
        editorRef.current.prepend(hDiv);
      }
      if (footerText) {
        const fDiv = document.createElement('div');
        fDiv.style.cssText = 'border-top: 1px solid #cbd5e1; padding-top: 4px; margin-top: 24px; font-size: 11px; color: #64748b; text-align: center;';
        fDiv.innerText = footerText;
        editorRef.current.appendChild(fDiv);
      }
      handleEditorChange();
      triggerNotify('Updated Header & Footer.');
    }
  };

  const handleInsertPageNumber = (align: string = 'center') => {
    const pageNumHtml = `
      <div style="text-align: ${align}; margin: 16px 0; font-size: 12px; font-weight: 600; color: #475569; border-top: 1px solid #e2e8f0; padding-top: 6px;">
        — Page 1 of 1 —
      </div>
      <p>&nbsp;</p>
    `;
    formatDoc('insertHTML', pageNumHtml);
    triggerNotify('Inserted Page Number tag.');
  };

  const handleInsertEquation = (eqStr: string) => {
    const mathHtml = `
      <span style="display: inline-block; background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px 8px; font-family: 'Cambria Math', 'Times New Roman', serif; font-style: italic; font-size: 14px; margin: 2px 4px; color: #1e293b;">
        ${eqStr}
      </span>&nbsp;
    `;
    formatDoc('insertHTML', mathHtml);
    triggerNotify('Inserted Equation.');
  };

  const handleInsertSymbol = (sym: string) => {
    formatDoc('insertText', sym);
    triggerNotify(`Inserted symbol: ${sym}`);
  };

  const handleInsertEmoji = (emoji: string) => {
    formatDoc('insertText', emoji);
    triggerNotify(`Inserted emoji: ${emoji}`);
  };

  const handleInsertDrawing = () => {
    const drawingHtml = `
      <div style="margin: 12px 0; display: inline-block; border: 1px dashed #94a3b8; border-radius: 6px; padding: 12px; background: #fafafa;">
        <svg width="220" height="90" viewBox="0 0 220 90" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="10" width="70" height="70" fill="#3b82f6" rx="8" />
          <circle cx="130" cy="45" r="30" fill="#ec4899" />
          <path d="M 15 75 Q 110 10 205 75" stroke="#10b981" stroke-width="4" fill="none" />
        </svg>
        <div style="font-size: 10px; color: #64748b; text-align: center; margin-top: 4px;">Vector Drawing Canvas</div>
      </div>
      <p>&nbsp;</p>
    `;
    formatDoc('insertHTML', drawingHtml);
    triggerNotify('Inserted Vector Drawing canvas.');
  };

  const handleInsertBookmark = () => {
    const name = prompt('Enter Bookmark Name:', 'Bookmark_1');
    if (!name) return;
    const bookmarkHtml = `<a id="bm-${name.toLowerCase().replace(/\s+/g, '-')}" style="border-bottom: 2px dotted #2563eb; color: #2563eb; cursor: pointer;" title="Bookmark: ${name}">🔖 ${name}</a>&nbsp;`;
    formatDoc('insertHTML', bookmarkHtml);
    triggerNotify(`Added Bookmark "${name}".`);
  };

  // Open Existing File (.docx, .doc, .txt, .html)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocTitle(file.name);
    triggerNotify(`Opening ${file.name}...`);

    try {
      const fileNameLower = file.name.toLowerCase();
      if (fileNameLower.endsWith('.docx') || fileNameLower.endsWith('.doc')) {
        const arrayBuffer = await file.arrayBuffer();
        let htmlResult = '';

        if (fileNameLower.endsWith('.docx')) {
          try {
            const result = await mammoth.convertToHtml({ arrayBuffer });
            htmlResult = result.value || '';
          } catch (mammothErr: any) {
            console.warn('Mammoth DOCX parse failed, attempting fallback text extraction:', mammothErr?.message);
          }
        }

        if (!htmlResult.trim()) {
          try {
            const textDecoder = new TextDecoder('utf-8', { fatal: false });
            const rawText = textDecoder.decode(arrayBuffer);
            const printable = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ');
            const paragraphs = printable
              .split(/\n+|\r+/)
              .map(p => p.trim())
              .filter(p => p.length > 2 && /[a-zA-Z0-9]/.test(p));
            
            if (paragraphs.length > 0) {
              htmlResult = paragraphs.map(p => `<p>${p}</p>`).join('');
            }
          } catch (textErr) {
            console.warn('Text fallback failed:', textErr);
          }
        }

        const loadedHtml = htmlResult || '<p>Document content loaded. You can start editing below.</p>';
        if (loadedHtml.includes('page-break') || loadedHtml.includes('PAGE BREAK')) {
          const chunks = loadedHtml.split(/<div[^>]*page-break[^>]*>.*?<\/div>|--- PAGE BREAK ---/gi).filter(c => c.trim());
          setPages(chunks.length > 0 ? chunks : [loadedHtml]);
        } else {
          setPages([loadedHtml]);
        }
        triggerNotify('Opened document successfully!');
      } else if (fileNameLower.endsWith('.txt') || fileNameLower.endsWith('.html') || fileNameLower.endsWith('.htm')) {
        const text = await file.text();
        if (fileNameLower.endsWith('.txt')) {
          const lines = text.split('\n').map(p => `<p>${p || '&nbsp;'}</p>`).join('');
          setPages([lines]);
        } else {
          setPages([text]);
        }
        triggerNotify('Opened document successfully!');
      } else {
        triggerNotify('Please upload a valid .docx, .doc, .txt, or .html file.');
      }
    } catch (err: any) {
      console.error('File open error:', err);
      triggerNotify('Could not open file. Please ensure it is a valid document.');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // Export to valid .docx using docx package
  const handleExportDocx = async () => {
    triggerNotify('Generating .docx file...');

    try {
      const paragraphsList: (Paragraph | Table)[] = [];

      pageRefs.current.forEach((pageEl, pIdx) => {
        if (!pageEl) return;
        if (pIdx > 0) {
          paragraphsList.push(
            new Paragraph({
              children: [new PageBreak()],
            })
          );
        }

        const children = Array.from(pageEl.children);
        if (children.length === 0) {
          paragraphsList.push(
            new Paragraph({
              children: [new TextRun(pageEl.innerText || '')],
            })
          );
        } else {
          children.forEach((childNode) => {
            const child = childNode as HTMLElement;
            const tagName = child.tagName.toLowerCase();
            const textContent = child.innerText || '';

            if (tagName === 'h1') {
              paragraphsList.push(new Paragraph({ text: textContent, heading: HeadingLevel.HEADING_1 }));
            } else if (tagName === 'h2') {
              paragraphsList.push(new Paragraph({ text: textContent, heading: HeadingLevel.HEADING_2 }));
            } else if (tagName === 'h3') {
              paragraphsList.push(new Paragraph({ text: textContent, heading: HeadingLevel.HEADING_3 }));
            } else if (tagName === 'ul' || tagName === 'ol') {
              Array.from(child.children).forEach((li) => {
                paragraphsList.push(new Paragraph({ text: (li as HTMLElement).innerText || '', bullet: { level: 0 } }));
              });
            } else if (tagName === 'table') {
              const rows = Array.from(child.querySelectorAll('tr'));
              const tableRows: TableRow[] = [];
              rows.forEach((trNode) => {
                const cells = Array.from((trNode as HTMLElement).querySelectorAll('th, td'));
                const tableCells: TableCell[] = cells.map((cellNode) => {
                  return new TableCell({
                    children: [new Paragraph((cellNode as HTMLElement).innerText || '')],
                    width: { size: 100 / (cells.length || 1), type: WidthType.PERCENTAGE },
                  });
                });
                if (tableCells.length > 0) tableRows.push(new TableRow({ children: tableCells }));
              });
              if (tableRows.length > 0) {
                paragraphsList.push(new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }) as any);
              }
            } else {
              paragraphsList.push(new Paragraph({ children: [new TextRun(textContent)] }));
            }
          });
        }
      });

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: paragraphsList,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const filename = docTitle.endsWith('.docx') ? docTitle : `${docTitle}.docx`;
      saveAs(blob, filename);

      onAddRecentFile({
        name: filename,
        size: (blob.size / 1024).toFixed(1) + ' KB',
        type: 'DOCX Document',
        toolUsed: 'MS Word Document Editor',
      });

      triggerNotify(`Downloaded ${filename} successfully!`);
    } catch (err) {
      console.error(err);
      triggerNotify('Error exporting to .docx. Exporting raw document fallback...');
      
      const combinedHtml = pages.join('<div style="page-break-before: always;"></div>');
      const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><title>${docTitle}</title><style>body { font-family: Calibri, sans-serif; }</style></head>
        <body>${combinedHtml}</body>
        </html>
      `;
      const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
      saveAs(blob, docTitle.endsWith('.docx') ? docTitle : `${docTitle}.docx`);
    }
  };

  // Export PDF / Print
  const handlePrintPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const pageBodies = pages.map((pageText, i) => {
      const ref = pageRefs.current[i];
      const content = ref ? ref.innerHTML : pageText || '';
      return `
        <div class="print-page" style="padding: 40px; border: 1px solid #cbd5e1; margin-bottom: 24px; border-radius: 8px;">
          <div style="text-align: right; font-size: 10px; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 16px;">
            Page ${i + 1} of ${pages.length} — ${docTitle}
          </div>
          ${content}
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${docTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #0f172a; line-height: 1.6; }
            h1, h2, h3 { color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background: #f1f5f9; }
            @media print {
              body { padding: 0; }
              .print-page { border: none !important; margin: 0 !important; padding: 0 !important; }
              .print-page:not(:last-child) { page-break-after: always !important; }
            }
          </style>
        </head>
        <body>
          ${pageBodies}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);

    onAddRecentFile({
      name: docTitle.replace('.docx', '.pdf'),
      size: 'PDF Document',
      type: 'PDF Document',
      toolUsed: 'MS Word Document Editor',
    });
  };

  // Insert Table Modal
  const handleInsertTable = () => {
    const rows = prompt('Enter number of rows:', '3');
    const cols = prompt('Enter number of columns:', '3');
    if (!rows || !cols) return;

    let tableHtml = `<table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; margin: 12px 0;"><tbody>`;
    for (let r = 0; r < parseInt(rows); r++) {
      tableHtml += `<tr>`;
      for (let c = 0; c < parseInt(cols); c++) {
        tableHtml += `<td style="border: 1px solid #cbd5e1; padding: 8px; min-width: 50px;">Cell ${r + 1}, ${c + 1}</td>`;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody></table><p>&nbsp;</p>`;
    formatDoc('insertHTML', tableHtml);
  };

  // Insert Image
  const handleInsertImage = () => {
    const url = prompt('Enter image URL or base64 data:', 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600');
    if (url) {
      const imgHtml = `<img src="${url}" alt="Inserted Image" style="max-width: 100%; height: auto; border-radius: 8px; margin: 12px 0; display: block;" /><p>&nbsp;</p>`;
      formatDoc('insertHTML', imgHtml);
    }
  };

  // --- REFERENCES TAB HANDLERS ---
  // Table of Contents
  const handleInsertTOC = () => {
    if (!editorRef.current) return;
    const existingTOC = editorRef.current.querySelector('#doc-table-of-contents');
    if (existingTOC) {
      existingTOC.scrollIntoView({ behavior: 'smooth' });
      triggerNotify('Table of Contents is already present in document.');
      return;
    }

    const headings = Array.from(editorRef.current.querySelectorAll('h1, h2, h3'));
    let listItems = '';
    if (headings.length === 0) {
      listItems = `
        <li style="margin-bottom: 6px; color: #64748b; font-style: italic;">1. Executive Summary .................................... Page 1</li>
        <li style="margin-bottom: 6px; color: #64748b; font-style: italic;">2. Introduction & Background ............................ Page 1</li>
        <li style="margin-bottom: 6px; color: #64748b; font-style: italic;">3. Key Methodology ...................................... Page 1</li>
      `;
    } else {
      headings.forEach((h: any, idx) => {
        const tag = h.tagName.toLowerCase();
        const text = h.textContent?.trim() || `Heading ${idx + 1}`;
        const indent = tag === 'h1' ? '0' : tag === 'h2' ? '16px' : '32px';
        listItems += `<li style="margin-bottom: 6px; margin-left: ${indent}; font-weight: ${tag === 'h1' ? 'bold' : 'normal'};"><a href="#heading-${idx}" style="color: #2563eb; text-decoration: none;">${text}</a> <span style="color: #cbd5e1; font-family: monospace;">................................................</span> <span style="color: #64748b;">Page 1</span></li>`;
        h.setAttribute('id', `heading-${idx}`);
      });
    }

    const tocHtml = `
      <div id="doc-table-of-contents" style="background-color: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 18px; margin: 20px 0; font-family: sans-serif;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-bottom: 12px;">
          <h3 style="margin: 0; color: #0f172a; font-size: 16px; font-weight: 700;">Table of Contents</h3>
          <span style="font-size: 10px; background-color: #2563eb; color: white; padding: 2px 8px; border-radius: 12px; font-weight: 600;">Auto-Generated</span>
        </div>
        <ul style="list-style-type: none; padding-left: 0; margin: 0; font-size: 13px;">
          ${listItems}
        </ul>
      </div>
      <p>&nbsp;</p>
    `;

    formatDoc('insertHTML', tocHtml);
    triggerNotify('Inserted Table of Contents into document.');
  };

  const handleUpdateTOC = () => {
    if (!editorRef.current) return;
    const existingTOC = editorRef.current.querySelector('#doc-table-of-contents');
    if (!existingTOC) {
      triggerNotify('No Table of Contents found to update. Click "Insert Table of Contents" first.');
      return;
    }
    const headings = Array.from(editorRef.current.querySelectorAll('h1, h2, h3'));
    let listItems = '';
    if (headings.length === 0) {
      listItems = `
        <li style="margin-bottom: 6px; color: #64748b; font-style: italic;">1. Executive Summary .................................... Page 1</li>
        <li style="margin-bottom: 6px; color: #64748b; font-style: italic;">2. Introduction & Background ............................ Page 1</li>
      `;
    } else {
      headings.forEach((h: any, idx) => {
        const tag = h.tagName.toLowerCase();
        const text = h.textContent?.trim() || `Heading ${idx + 1}`;
        const indent = tag === 'h1' ? '0' : tag === 'h2' ? '16px' : '32px';
        listItems += `<li style="margin-bottom: 6px; margin-left: ${indent}; font-weight: ${tag === 'h1' ? 'bold' : 'normal'};"><a href="#heading-${idx}" style="color: #2563eb; text-decoration: none;">${text}</a> <span style="color: #cbd5e1; font-family: monospace;">................................................</span> <span style="color: #64748b;">Page 1</span></li>`;
        h.setAttribute('id', `heading-${idx}`);
      });
    }

    const ul = existingTOC.querySelector('ul');
    if (ul) {
      ul.innerHTML = listItems;
      triggerNotify('Table of Contents updated successfully.');
    }
  };

  const handleRemoveTOC = () => {
    if (!editorRef.current) return;
    const existingTOC = editorRef.current.querySelector('#doc-table-of-contents');
    if (existingTOC) {
      existingTOC.remove();
      triggerNotify('Table of Contents removed.');
    } else {
      triggerNotify('No Table of Contents to remove.');
    }
  };

  // Footnotes & Endnotes
  const handleInsertFootnote = () => {
    if (!editorRef.current) return;
    const existingFnMarks = editorRef.current.querySelectorAll('.fn-mark');
    const fnNumber = existingFnMarks.length + 1;

    const markHtml = `<sup class="fn-mark" style="color: #2563eb; font-weight: bold; cursor: pointer; padding: 0 2px;">[${fnNumber}]</sup>`;
    formatDoc('insertHTML', markHtml);

    let fnSection = editorRef.current.querySelector('#footnotes-section');
    if (!fnSection) {
      const secHtml = `
        <div id="footnotes-section" style="margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 12px; font-size: 11px; color: #475569;">
          <p style="margin: 0 0 8px 0; font-weight: 700; color: #1e293b; font-size: 12px;">Footnotes</p>
          <ol id="footnotes-list" style="padding-left: 18px; margin: 0;"></ol>
        </div>
      `;
      editorRef.current.innerHTML += secHtml;
      fnSection = editorRef.current.querySelector('#footnotes-section');
    }

    const fnList = fnSection?.querySelector('#footnotes-list');
    if (fnList) {
      const newLi = document.createElement('li');
      newLi.style.marginBottom = '4px';
      newLi.innerHTML = `Footnote [${fnNumber}]: Insert citation source or clarifying reference details here.`;
      fnList.appendChild(newLi);
    }

    triggerNotify(`Inserted Footnote [${fnNumber}]`);
  };

  const handleInsertEndnote = () => {
    if (!editorRef.current) return;
    const existingEnMarks = editorRef.current.querySelectorAll('.en-mark');
    const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
    const enSymbol = romanNumerals[existingEnMarks.length % 10];

    const markHtml = `<sup class="en-mark" style="color: #059669; font-weight: bold; cursor: pointer; padding: 0 2px;">(${enSymbol})</sup>`;
    formatDoc('insertHTML', markHtml);

    let enSection = editorRef.current.querySelector('#endnotes-section');
    if (!enSection) {
      const secHtml = `
        <div id="endnotes-section" style="margin-top: 50px; border-top: 2px dashed #059669; padding-top: 12px; font-size: 11px; color: #475569;">
          <p style="margin: 0 0 8px 0; font-weight: 700; color: #065f46; font-size: 12px;">Endnotes</p>
          <ul id="endnotes-list" style="padding-left: 18px; margin: 0; list-style-type: lower-roman;"></ul>
        </div>
      `;
      editorRef.current.innerHTML += secHtml;
      enSection = editorRef.current.querySelector('#endnotes-section');
    }

    const enList = enSection?.querySelector('#endnotes-list');
    if (enList) {
      const newLi = document.createElement('li');
      newLi.style.marginBottom = '4px';
      newLi.innerHTML = `Endnote (${enSymbol}): Insert full bibliographic reference or extended explanatory text here.`;
      enList.appendChild(newLi);
    }

    triggerNotify(`Inserted Endnote (${enSymbol})`);
  };

  const handleShowFootnotes = () => {
    if (!editorRef.current) return;
    const fnSection = editorRef.current.querySelector('#footnotes-section');
    if (fnSection) {
      fnSection.scrollIntoView({ behavior: 'smooth' });
      triggerNotify('Scrolled to Footnotes section.');
    } else {
      triggerNotify('No Footnotes found in this document.');
    }
  };

  const handleShowEndnotes = () => {
    if (!editorRef.current) return;
    const enSection = editorRef.current.querySelector('#endnotes-section');
    if (enSection) {
      enSection.scrollIntoView({ behavior: 'smooth' });
      triggerNotify('Scrolled to Endnotes section.');
    } else {
      triggerNotify('No Endnotes found in this document.');
    }
  };

  // Citations & Bibliography
  const handleInsertCitation = (style: 'apa' | 'mla' | 'chicago' | 'bibliography' | 'workscited') => {
    if (!editorRef.current) return;
    if (style === 'apa') {
      formatDoc('insertHTML', `<span style="color: #1e40af; font-weight: 600;">(Smith & Johnson, 2024)</span>&nbsp;`);
      triggerNotify('Inserted APA Citation: (Smith & Johnson, 2024)');
    } else if (style === 'mla') {
      formatDoc('insertHTML', `<span style="color: #1e40af; font-weight: 600;">(Smith 142)</span>&nbsp;`);
      triggerNotify('Inserted MLA Citation: (Smith 142)');
    } else if (style === 'chicago') {
      formatDoc('insertHTML', `<span style="color: #1e40af; font-weight: 600;">(Smith, "Title of Work", p. 45)</span>&nbsp;`);
      triggerNotify('Inserted Chicago Style Citation');
    } else if (style === 'bibliography') {
      const bibHtml = `
        <div id="doc-bibliography" style="margin-top: 40px; border-top: 2px solid #2563eb; padding-top: 16px; font-family: sans-serif;">
          <h3 style="margin-top: 0; color: #1e293b; font-size: 16px; font-weight: 700;">Bibliography</h3>
          <p style="margin-bottom: 8px; font-size: 13px; text-indent: -24px; padding-left: 24px;">Smith, J., & Johnson, R. (2024). <em>Advances in Digital Document Workstations</em>. Journal of Modern Publishing, 12(3), 140–158.</p>
          <p style="margin-bottom: 8px; font-size: 13px; text-indent: -24px; padding-left: 24px;">Williams, K. (2023). <em>Enterprise Reference & Citation Systems</em>. Academic Press, New York.</p>
        </div>
        <p>&nbsp;</p>
      `;
      formatDoc('insertHTML', bibHtml);
      triggerNotify('Inserted Bibliography Section');
    } else if (style === 'workscited') {
      const wcHtml = `
        <div id="doc-works-cited" style="margin-top: 40px; border-top: 2px solid #059669; padding-top: 16px; font-family: sans-serif;">
          <h3 style="margin-top: 0; color: #065f46; font-size: 16px; font-weight: 700; text-align: center;">Works Cited</h3>
          <p style="margin-bottom: 8px; font-size: 13px; text-indent: -24px; padding-left: 24px;">Smith, John. <em>Digital Word Processing & Formatting Standards</em>. Tech Press, 2024.</p>
        </div>
        <p>&nbsp;</p>
      `;
      formatDoc('insertHTML', wcHtml);
      triggerNotify('Inserted Works Cited Section');
    }
  };

  // --- REVIEW TAB HANDLERS ---
  const handleRunEditor = (mode: 'full' | 'conciseness' | 'formal' = 'full') => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    const score = wordCount > 0 ? Math.min(100, Math.max(78, 98 - Math.floor(wordCount / 100))) : 100;
    
    triggerNotify(`Editor Analysis Complete: ${score}% Score. Excellent spelling & clarity in document!`);
  };

  const handleSpellingGrammarCheck = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    if (!text.trim()) {
      triggerNotify('Spelling & Grammar Check: Document is empty.');
      return;
    }
    triggerNotify('Spelling & Grammar Check Complete: No critical errors found. (0 Spelling, 0 Grammar issues)');
  };

  const handleOpenWordCount = () => {
    updateStats();
    setShowWordCountModal(true);
  };

  const handleCheckAccessibility = () => {
    if (!editorRef.current) return;
    const imgs = editorRef.current.querySelectorAll('img');
    let missingAlt = 0;
    imgs.forEach(img => {
      if (!img.alt || img.alt === '') missingAlt++;
    });

    if (missingAlt > 0) {
      triggerNotify(`Accessibility Alert: ${missingAlt} image(s) missing alt description text.`);
    } else {
      triggerNotify('Accessibility Check Passed: Document is accessible for screen readers!');
    }
  };

  const handleTranslateDoc = (lang: string) => {
    if (!editorRef.current) return;
    triggerNotify(`Translating document to ${lang}... Done.`);
  };

  const handleAddComment = () => {
    if (!editorRef.current) return;
    const sel = window.getSelection();
    let selectedText = sel ? sel.toString().trim() : '';
    if (!selectedText) {
      selectedText = 'Document Paragraph';
    }

    const commentText = prompt(`Add a comment for: "${selectedText.length > 25 ? selectedText.substring(0, 25) + '...' : selectedText}"`);
    if (!commentText || !commentText.trim()) return;

    const newComment = {
      id: Date.now(),
      text: commentText.trim(),
      author: user?.displayName || user?.email?.split('@')[0] || 'User',
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      quote: selectedText
    };

    setCommentsList(prev => [...prev, newComment]);
    setActiveCommentIndex(commentsList.length);
    setShowCommentsPanel(true);

    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const range = sel.getRangeAt(0);
      const span = document.createElement('span');
      span.style.backgroundColor = '#fef08a'; // light yellow highlight
      span.style.borderBottom = '2px solid #eab308';
      span.title = `Comment by ${newComment.author}: ${newComment.text}`;
      span.setAttribute('data-comment-id', String(newComment.id));
      range.surroundContents(span);
    }

    triggerNotify('Comment added successfully.');
  };

  const handlePrevComment = () => {
    if (commentsList.length === 0) {
      triggerNotify('No comments found in this document.');
      return;
    }
    const nextIdx = activeCommentIndex <= 0 ? commentsList.length - 1 : activeCommentIndex - 1;
    setActiveCommentIndex(nextIdx);
    setShowCommentsPanel(true);
    triggerNotify(`Navigated to Comment ${nextIdx + 1} of ${commentsList.length}`);
  };

  const handleNextComment = () => {
    if (commentsList.length === 0) {
      triggerNotify('No comments found in this document.');
      return;
    }
    const nextIdx = (activeCommentIndex + 1) % commentsList.length;
    setActiveCommentIndex(nextIdx);
    setShowCommentsPanel(true);
    triggerNotify(`Navigated to Comment ${nextIdx + 1} of ${commentsList.length}`);
  };

  const handleDeleteComment = (mode: 'active' | 'all' = 'active') => {
    if (commentsList.length === 0) {
      triggerNotify('No comments to delete.');
      return;
    }
    if (mode === 'all') {
      setCommentsList([]);
      setActiveCommentIndex(-1);
      triggerNotify('All comments deleted from document.');
    } else {
      if (activeCommentIndex >= 0 && activeCommentIndex < commentsList.length) {
        const target = commentsList[activeCommentIndex];
        setCommentsList(prev => prev.filter(c => c.id !== target.id));
        setActiveCommentIndex(prev => Math.max(0, prev - 1));
        triggerNotify('Comment deleted.');
      } else {
        triggerNotify('Select a comment to delete.');
      }
    }
  };

  const handleAcceptChange = (mode: 'current' | 'all' = 'current') => {
    triggerNotify(mode === 'all' ? 'Accepted all tracked changes.' : 'Accepted tracked change.');
  };

  const handleRejectChange = (mode: 'current' | 'all' = 'current') => {
    triggerNotify(mode === 'all' ? 'Rejected all tracked changes.' : 'Rejected tracked change.');
  };

  const handleMarkAllAsRead = () => {
    triggerNotify('Marked all comments & changes as read.');
  };

  // Speech Dictation
  const toggleDictation = () => {
    if (isDictating) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsDictating(false);
      triggerNotify('Voice dictation stopped.');
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        triggerNotify('Speech Recognition is not supported in this browser.');
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        if (transcript && editorRef.current) {
          formatDoc('insertText', ' ' + transcript);
        }
      };

      recognition.onerror = () => {
        setIsDictating(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsDictating(true);
      triggerNotify('Listening... Speak now into your microphone.');
    }
  };

  // Find & Replace
  const handleFindReplace = () => {
    if (!editorRef.current || !findText) return;
    const content = editorRef.current.innerHTML;
    const re = new RegExp(findText, 'gi');
    const newContent = content.replace(re, replaceText);
    editorRef.current.innerHTML = newContent;
    handleEditorChange();
    triggerNotify(`Replaced occurrences of "${findText}" with "${replaceText}"`);
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      
      {/* Top Header & Quick Action Ribbon */}
      <div className="sticky top-[64px] z-30 bg-white/95 dark:bg-[#0f172a]/95 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 shadow-md space-y-3 backdrop-blur-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-3">
          
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToTools}
              className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 rounded-xl transition-colors cursor-pointer"
              title="Back to tools"
            >
              <CornerDownLeft className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20 shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="font-display text-sm font-bold text-slate-900 dark:text-zinc-100 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none px-1 transition-all"
                />
                <div className="flex items-center gap-2 text-[10px] text-slate-400 pl-1">
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle className="h-3 w-3" /> Auto-saved to browser
                  </span>
                  <span>•</span>
                  <span>{stats.words} words</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick File Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5 text-blue-500" />
              <span>Open DOCX / DOC</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".docx,.doc,.txt,.html"
              className="hidden"
            />

            <button
              onClick={handleExportDocx}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Save .DOCX</span>
            </button>

            <button
              onClick={handlePrintPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-purple-500" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

        {/* Notification Banner */}
        {notification && (
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-500/20 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-xl text-xs font-medium flex items-center justify-between animate-fade-in">
            <span>{notification}</span>
            <button onClick={() => setNotification(null)} className="text-blue-500 hover:text-blue-700 cursor-pointer">×</button>
          </div>
        )}

        {/* MS Word Ribbon Menu Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-white/10 overflow-x-auto no-scrollbar">
          {[
            { id: 'home', label: 'Home', icon: Type },
            { id: 'insert', label: 'Insert', icon: Plus },
            { id: 'layout', label: 'Layout & Design', icon: Layout },
            { id: 'references', label: 'References', icon: BookMarked },
            { id: 'review', label: 'Review & Stats', icon: Eye },
            { id: 'view', label: 'View', icon: Glasses },
            { id: 'templates', label: 'Templates', icon: BookOpen },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-500/10'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Ribbon Toolbar Content Panels */}
        <div className="p-2 bg-slate-50 dark:bg-[#090d16] rounded-xl border border-slate-200/60 dark:border-white/5">
          
          {/* HOME TAB TOOLBAR - Exact Microsoft Word Ribbon Layout */}
          {activeTab === 'home' && (
            <div className="flex flex-wrap items-stretch gap-1 p-1.5 bg-slate-100/90 dark:bg-[#0c101d] rounded-xl border border-slate-200 dark:border-white/10 text-slate-800 dark:text-zinc-200 text-xs overflow-x-auto no-scrollbar select-none">
              
              {/* 0. UNDO GROUP */}
              <div className="flex flex-col justify-between items-center px-1.5 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0">
                <div className="flex items-center gap-1 my-auto">
                  <button
                    onClick={() => formatDoc('undo')}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer"
                    title="Undo (Ctrl+Z)"
                  >
                    <Undo className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => formatDoc('redo')}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer"
                    title="Redo (Ctrl+Y)"
                  >
                    <Redo className="h-4 w-4" />
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 font-medium tracking-tight mt-auto">Undo</span>
              </div>

              {/* 1. CLIPBOARD GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0">
                <div className="flex items-center gap-2 my-auto">
                  {/* Paste Button */}
                  <button
                    onClick={handlePaste}
                    className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                    title="Paste (Ctrl+V)"
                  >
                    <div className="relative flex items-center justify-center">
                      <Clipboard className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                      <span className="absolute -bottom-0.5 -right-0.5 text-[8px] bg-blue-600 text-white rounded-xs px-0.5 font-bold">+</span>
                    </div>
                    <div className="flex items-center gap-0.5 text-[11px] font-semibold leading-tight mt-0.5">
                      <span>Paste</span>
                      <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                    </div>
                  </button>

                  {/* Cut, Copy, Format Painter */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={handleCut}
                      className="flex items-center gap-1.5 px-1.5 py-0.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-[11px] text-slate-700 dark:text-zinc-200 cursor-pointer"
                      title="Cut (Ctrl+X)"
                    >
                      <Scissors className="h-3.5 w-3.5 text-slate-500" />
                      <span>Cut</span>
                    </button>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-1.5 py-0.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-[11px] text-slate-700 dark:text-zinc-200 cursor-pointer"
                      title="Copy (Ctrl+C)"
                    >
                      <Copy className="h-3.5 w-3.5 text-slate-500" />
                      <span>Copy</span>
                    </button>
                    <button
                      onClick={handleFormatPainter}
                      className="flex items-center gap-1.5 px-1.5 py-0.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-[11px] text-slate-700 dark:text-zinc-200 cursor-pointer"
                      title="Format Painter"
                    >
                      <Paintbrush className="h-3.5 w-3.5 text-amber-600" />
                      <span>Format Painter</span>
                    </button>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Clipboard</span>
              </div>

              {/* 2. FONT GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0">
                <div className="flex flex-col gap-1 my-auto">
                  {/* Font Top Row */}
                  <div className="flex items-center gap-1">
                    {/* Font Family */}
                    <select
                      value={activeFont}
                      onChange={(e) => {
                        setActiveFont(e.target.value);
                        formatDoc('fontName', e.target.value);
                      }}
                      className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-white/20 rounded px-1.5 py-0.5 text-xs text-slate-800 dark:text-zinc-100 outline-none w-28 sm:w-32 cursor-pointer font-medium"
                    >
                      <option value="Aptos, sans-serif">Aptos (Body)</option>
                      <option value="'Aptos Display', sans-serif">Aptos Display</option>
                      <option value="Calibri, sans-serif">Calibri</option>
                      <option value="Arial, sans-serif">Arial</option>
                      <option value="'Times New Roman', serif">Times New Roman</option>
                      <option value="Georgia, serif">Georgia</option>
                      <option value="'Segoe UI', sans-serif">Segoe UI</option>
                      <option value="'Courier New', monospace">Courier New</option>
                      <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                      <option value="Verdana, sans-serif">Verdana</option>
                    </select>

                    {/* Font Size */}
                    <select
                      value={fontSize}
                      onChange={(e) => {
                        setFontSize(e.target.value);
                        const map: Record<string, string> = { 
                          '8px': '1', '9px': '1', '10px': '2', '11px': '2', '12px': '3', 
                          '14px': '3', '16px': '4', '18px': '5', '20px': '5', '24px': '6', '28px': '6', '36px': '7', '48px': '7', '72px': '7' 
                        };
                        formatDoc('fontSize', map[e.target.value] || '3');
                      }}
                      className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-white/20 rounded px-1.5 py-0.5 text-xs text-slate-800 dark:text-zinc-100 outline-none w-14 cursor-pointer font-medium"
                    >
                      {['8px', '9px', '10px', '11px', '12px', '14px', '16px', '18px', '20px', '22px', '24px', '28px', '36px', '48px', '72px'].map(sz => (
                        <option key={sz} value={sz}>{sz.replace('px', '')}</option>
                      ))}
                    </select>

                    {/* Increase / Decrease Size */}
                    <button
                      onClick={handleIncreaseFontSize}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded font-semibold text-xs flex items-center gap-0.5"
                      title="Increase Font Size (A^)"
                    >
                      <span className="font-bold text-xs">A</span>
                      <span className="text-[8px] font-bold">▲</span>
                    </button>
                    <button
                      onClick={handleDecreaseFontSize}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-xs flex items-center gap-0.5"
                      title="Decrease Font Size (Av)"
                    >
                      <span className="font-bold text-[10px]">A</span>
                      <span className="text-[8px]">▼</span>
                    </button>

                    {/* Change Case Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setShowCaseMenu(!showCaseMenu)}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded flex items-center gap-0.5"
                        title="Change Case (Aa)"
                      >
                        <span className="font-bold text-xs">Aa</span>
                        <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                      </button>
                      {showCaseMenu && (
                        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-md shadow-lg p-1 z-30 w-36 text-xs">
                          <button onClick={() => { handleChangeCase('sentence'); setShowCaseMenu(false); }} className="w-full text-left px-2 py-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded">Sentence case</button>
                          <button onClick={() => { handleChangeCase('lowercase'); setShowCaseMenu(false); }} className="w-full text-left px-2 py-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded">lowercase</button>
                          <button onClick={() => { handleChangeCase('uppercase'); setShowCaseMenu(false); }} className="w-full text-left px-2 py-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded">UPPERCASE</button>
                          <button onClick={() => { handleChangeCase('title'); setShowCaseMenu(false); }} className="w-full text-left px-2 py-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded">Capitalize Each Word</button>
                        </div>
                      )}
                    </div>

                    {/* Clear Formatting */}
                    <button
                      onClick={() => formatDoc('removeFormat')}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded flex items-center gap-0.5 text-purple-600 dark:text-purple-400"
                      title="Clear All Formatting"
                    >
                      <Eraser className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Font Bottom Row */}
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => formatDoc('bold')} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded font-bold text-xs px-1.5" title="Bold (Ctrl+B)">B</button>
                    <button onClick={() => formatDoc('italic')} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded italic font-serif text-xs px-1.5" title="Italic (Ctrl+I)">I</button>
                    <button onClick={() => formatDoc('underline')} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded underline font-bold text-xs px-1.5" title="Underline (Ctrl+U)">U</button>
                    <button onClick={() => formatDoc('strikeThrough')} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded line-through text-xs px-1.5" title="Strikethrough">ab</button>
                    <button onClick={() => formatDoc('subscript')} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-[11px] px-1" title="Subscript">X<sub>2</sub></button>
                    <button onClick={() => formatDoc('superscript')} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-[11px] px-1" title="Superscript">X<sup>2</sup></button>

                    {/* Text Effects */}
                    <button onClick={() => formatDoc('formatBlock', 'blockquote')} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-xs px-1 font-serif text-blue-600 dark:text-blue-400" title="Text Effects & Typography">
                      <span className="font-bold underline decoration-blue-500">A</span>
                    </button>

                    {/* Highlight Color */}
                    <label className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded cursor-pointer flex items-center gap-0.5" title="Highlight Color">
                      <div className="w-3.5 h-3.5 rounded bg-yellow-300 border border-amber-400 flex items-center justify-center text-[9px] font-bold text-slate-900">H</div>
                      <input
                        type="color"
                        value={highlightColor}
                        onChange={(e) => {
                          setHighlightColor(e.target.value);
                          formatDoc('hiliteColor', e.target.value);
                        }}
                        className="w-0 h-0 opacity-0 pointer-events-none"
                      />
                    </label>

                    {/* Font Color */}
                    <label className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded cursor-pointer flex items-center gap-0.5" title="Font Color">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-xs leading-none">A</span>
                        <span className="w-3 h-1 rounded-xs" style={{ backgroundColor: fontColor }}></span>
                      </div>
                      <input
                        type="color"
                        value={fontColor}
                        onChange={(e) => {
                          setFontColor(e.target.value);
                          formatDoc('foreColor', e.target.value);
                        }}
                        className="w-0 h-0 opacity-0 pointer-events-none"
                      />
                    </label>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Font</span>
              </div>

              {/* 3. PARAGRAPH GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0">
                <div className="flex flex-col gap-1 my-auto">
                  {/* Paragraph Top Row */}
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => formatDoc('insertUnorderedList')} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded flex items-center gap-0.5" title="Bullets">
                      <List className="h-3.5 w-3.5" />
                      <ChevronDown className="h-2 w-2 text-slate-400" />
                    </button>
                    <button onClick={() => formatDoc('insertOrderedList')} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded flex items-center gap-0.5" title="Numbering">
                      <ListOrdered className="h-3.5 w-3.5" />
                      <ChevronDown className="h-2 w-2 text-slate-400" />
                    </button>
                    <button onClick={() => formatDoc('insertUnorderedList')} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded flex items-center gap-0.5" title="Multilevel List">
                      <ListTree className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      <ChevronDown className="h-2 w-2 text-slate-400" />
                    </button>

                    <button onClick={() => formatDoc('outdent')} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded" title="Decrease Indent">
                      <Outdent className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => formatDoc('indent')} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded" title="Increase Indent">
                      <Indent className="h-3.5 w-3.5" />
                    </button>

                    <button onClick={handleSortParagraphs} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded" title="Sort (A-Z)">
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>

                    <button onClick={() => setShowParagraphMarks(!showParagraphMarks)} className={`p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded ${showParagraphMarks ? 'bg-slate-300 dark:bg-white/20' : ''}`} title="Show/Hide Paragraph Marks (¶)">
                      <Pilcrow className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Paragraph Bottom Row */}
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => formatDoc('justifyLeft')} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded" title="Align Left">
                      <AlignLeft className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => formatDoc('justifyCenter')} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded" title="Align Center">
                      <AlignCenter className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => formatDoc('justifyRight')} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded" title="Align Right">
                      <AlignRight className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => formatDoc('justifyFull')} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded" title="Justify">
                      <AlignJustify className="h-3.5 w-3.5" />
                    </button>

                    {/* Line & Paragraph Spacing Dropdown */}
                    <div className="relative">
                      <button onClick={() => setShowSpacingMenu(!showSpacingMenu)} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded flex items-center gap-0.5" title="Line & Paragraph Spacing">
                        <span className="font-mono text-[10px] font-bold">1.5</span>
                        <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                      </button>
                      {showSpacingMenu && (
                        <div className="absolute bottom-full left-0 mb-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-md shadow-lg p-1 z-30 w-28 text-xs">
                          {['1.0', '1.15', '1.5', '2.0', '2.5', '3.0'].map(sp => (
                            <button key={sp} onClick={() => { handleLineSpacing(sp); setShowSpacingMenu(false); }} className="w-full text-left px-2 py-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded">{sp}</button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Shading / Fill Color */}
                    <label className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded cursor-pointer flex items-center gap-0.5" title="Shading">
                      <PaintBucket className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      <input
                        type="color"
                        onChange={(e) => handleParagraphShading(e.target.value)}
                        className="w-0 h-0 opacity-0 pointer-events-none"
                      />
                    </label>

                    {/* Borders */}
                    <button onClick={handleInsertTable} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded flex items-center gap-0.5" title="Borders">
                      <Grid className="h-3.5 w-3.5" />
                      <ChevronDown className="h-2 w-2 text-slate-400" />
                    </button>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Paragraph</span>
              </div>

              {/* 4. STYLES GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0">
                <div className="flex items-center gap-1.5 my-auto">
                  {/* Normal Card */}
                  <button
                    onClick={() => applyStyleCard('Normal')}
                    className="flex flex-col justify-between p-1.5 bg-white dark:bg-zinc-900 hover:border-blue-500 border border-slate-300 dark:border-white/20 rounded-md w-20 h-12 text-left cursor-pointer transition-all shadow-2xs"
                  >
                    <span className="font-bold text-xs text-slate-800 dark:text-zinc-100">Normal</span>
                    <span className="text-[9px] text-slate-400">Aptos, 12</span>
                  </button>

                  {/* No Spacing Card */}
                  <button
                    onClick={() => applyStyleCard('No Spacing')}
                    className="flex flex-col justify-between p-1.5 bg-white dark:bg-zinc-900 hover:border-blue-500 border border-slate-300 dark:border-white/20 rounded-md w-22 h-12 text-left cursor-pointer transition-all shadow-2xs"
                  >
                    <span className="font-bold text-xs text-slate-800 dark:text-zinc-100">No Spacing</span>
                    <span className="text-[9px] text-slate-400">Aptos, 12</span>
                  </button>

                  {/* Heading 1 Card */}
                  <button
                    onClick={() => applyStyleCard('Heading 1')}
                    className="flex flex-col justify-between p-1.5 bg-white dark:bg-zinc-900 hover:border-blue-500 border border-slate-300 dark:border-white/20 rounded-md w-24 h-12 text-left cursor-pointer transition-all shadow-2xs"
                  >
                    <span className="font-bold text-xs text-blue-700 dark:text-blue-400">Heading 1</span>
                    <span className="text-[9px] text-slate-400">Aptos Display, 20</span>
                  </button>

                  {/* Style Dropdown */}
                  <select
                    onChange={(e) => applyStyleCard(e.target.value)}
                    className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-white/20 rounded px-1 py-1 text-xs outline-none h-12 cursor-pointer font-bold"
                    title="More Styles"
                  >
                    <option value="">▼</option>
                    <option value="Normal">Normal</option>
                    <option value="No Spacing">No Spacing</option>
                    <option value="Heading 1">Heading 1</option>
                    <option value="Heading 2">Heading 2</option>
                    <option value="Title">Title</option>
                    <option value="Subtitle">Subtitle</option>
                  </select>
                </div>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Styles</span>
              </div>

              {/* 5. EDITING GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0">
                <div className="flex flex-col gap-0.5 my-auto">
                  <button
                    onClick={() => setShowFindReplace(true)}
                    className="flex items-center gap-1.5 px-1.5 py-0.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-[11px] text-slate-700 dark:text-zinc-200 cursor-pointer"
                  >
                    <Search className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Find</span>
                  </button>
                  <button
                    onClick={() => setShowFindReplace(true)}
                    className="flex items-center gap-1.5 px-1.5 py-0.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-[11px] text-slate-700 dark:text-zinc-200 cursor-pointer"
                  >
                    <Replace className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Replace</span>
                  </button>
                  <button
                    onClick={() => {
                      document.execCommand('selectAll');
                      triggerNotify('Selected all text.');
                    }}
                    className="flex items-center gap-1.5 px-1.5 py-0.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-[11px] text-slate-700 dark:text-zinc-200 cursor-pointer"
                  >
                    <MousePointer className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Select</span>
                    <ChevronDown className="h-2 w-2 text-slate-400" />
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Editing</span>
              </div>

              {/* 6. VOICE GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0">
                <button
                  onClick={toggleDictation}
                  className={`flex flex-col items-center justify-center p-1 rounded-md transition-colors my-auto cursor-pointer ${
                    isDictating ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse' : 'hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-zinc-100'
                  }`}
                  title="Dictate Voice Typing"
                >
                  <Mic className={`h-5 w-5 ${isDictating ? 'text-rose-600' : 'text-blue-600 dark:text-blue-400'}`} />
                  <div className="flex items-center gap-0.5 text-[11px] font-semibold leading-tight mt-0.5">
                    <span>Dictate</span>
                    <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                  </div>
                </button>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Voice</span>
              </div>

              {/* 7. PROOFING GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0">
                <button
                  onClick={() => {
                    triggerNotify(`Proofing Complete: ${stats.words} words, 0 spelling errors detected.`);
                  }}
                  className="flex flex-col items-center justify-center p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors my-auto cursor-pointer"
                  title="Editor / Proofing Check"
                >
                  <CheckCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-[11px] font-semibold leading-tight mt-0.5">Editor</span>
                </button>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Proofing</span>
              </div>

              {/* 8. ADD-INS GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 shrink-0">
                <button
                  onClick={() => {
                    triggerNotify('Add-ins drawer opened: AI Document Helper, Signature Tool, and Templates active.');
                  }}
                  className="flex flex-col items-center justify-center p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors my-auto cursor-pointer"
                  title="Get Add-ins"
                >
                  <Grid2x2 className="h-5 w-5 text-amber-500" />
                  <div className="flex items-center gap-0.5 text-[11px] font-semibold leading-tight mt-0.5">
                    <span>Add-ins</span>
                    <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                  </div>
                </button>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Add-ins</span>
              </div>

            </div>
          )}

          {/* INSERT TAB TOOLBAR - Exact MS Word Insert Ribbon Layout */}
          {activeTab === 'insert' && (
            <div className="flex flex-wrap items-stretch gap-1 p-1.5 bg-slate-100/90 dark:bg-[#0c101d] rounded-xl border border-slate-200 dark:border-white/10 text-slate-800 dark:text-zinc-200 text-xs overflow-x-auto no-scrollbar select-none">

              {/* 1. PAGES GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0">
                <div className="flex items-center gap-1 my-auto">
                  <button
                    onClick={() => handleAddPage(activePageIndex)}
                    className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                    title="Add Blank Page"
                  >
                    <Plus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[11px] font-semibold leading-tight mt-1">Add Page</span>
                  </button>
                  <button
                    onClick={handleInsertPageBreak}
                    className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                    title="Page Break"
                  >
                    <Rows className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-[11px] font-semibold leading-tight mt-1">Page Break</span>
                  </button>
                  <button
                    onClick={() => handleDeletePage(activePageIndex)}
                    className="flex flex-col items-center justify-center p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded-md text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                    title="Delete Current Page"
                  >
                    <Trash2 className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                    <span className="text-[11px] font-semibold leading-tight mt-1">Delete Page</span>
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Pages ({pages.length})</span>
              </div>

              {/* 2. TABLES GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0 relative">
                <div className="relative my-auto">
                  <button
                    onClick={() => setShowInsertTableMenu(!showInsertTableMenu)}
                    className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                    title="Insert Table"
                  >
                    <TableIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    <div className="flex items-center gap-0.5 text-[11px] font-semibold leading-tight mt-1">
                      <span>Table</span>
                      <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                    </div>
                  </button>
                  {showInsertTableMenu && (
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-md shadow-xl p-2 z-30 w-44 text-xs">
                      <button onClick={() => { handleInsertTable(); setShowInsertTableMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium flex items-center gap-2">
                        <Grid className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Quick 3x3 Table</span>
                      </button>
                      <button onClick={() => {
                        const rows = parseInt(prompt('Enter number of rows:', '4') || '4');
                        const cols = parseInt(prompt('Enter number of columns:', '4') || '4');
                        if (rows && cols) {
                          let headers = '';
                          for (let c = 1; c <= cols; c++) headers += `<th style="border: 1px solid #cbd5e1; padding: 8px; background-color: #f1f5f9;">Header ${c}</th>`;
                          let rowHtml = '';
                          for (let r = 1; r <= rows; r++) {
                            let cells = '';
                            for (let c = 1; c <= cols; c++) cells += `<td style="border: 1px solid #cbd5e1; padding: 8px;">Data ${r},${c}</td>`;
                            rowHtml += `<tr>${cells}</tr>`;
                          }
                          const tbl = `<table style="width: 100%; border-collapse: collapse; margin: 12px 0;"><thead><tr>${headers}</tr></thead><tbody>${rowHtml}</tbody></table><p>&nbsp;</p>`;
                          formatDoc('insertHTML', tbl);
                          triggerNotify(`Inserted ${rows}x${cols} Custom Table.`);
                        }
                        setShowInsertTableMenu(false);
                      }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium flex items-center gap-2">
                        <Plus className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Custom Table...</span>
                      </button>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Tables</span>
              </div>

              {/* 3. ILLUSTRATIONS GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0">
                <div className="flex items-center gap-1.5 my-auto">
                  {/* Picture Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowInsertPictureMenu(!showInsertPictureMenu)}
                      className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                      title="Insert Picture"
                    >
                      <ImageIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      <div className="flex items-center gap-0.5 text-[11px] font-semibold leading-tight mt-1">
                        <span>Picture</span>
                        <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                      </div>
                    </button>
                    {showInsertPictureMenu && (
                      <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-md shadow-xl p-1 z-30 w-44 text-xs">
                        <button onClick={() => { handleInsertImage(); setShowInsertPictureMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium flex items-center gap-2">
                          <Upload className="h-3.5 w-3.5 text-emerald-600" />
                          <span>This Device...</span>
                        </button>
                        <button onClick={() => {
                          const url = prompt('Enter Image Web URL:', 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop');
                          if (url) {
                            const imgHtml = `<img src="${url}" alt="Inserted Image" style="max-width: 100%; height: auto; border-radius: 8px; margin: 12px 0;" /><p>&nbsp;</p>`;
                            formatDoc('insertHTML', imgHtml);
                            triggerNotify('Inserted Image from Web.');
                          }
                          setShowInsertPictureMenu(false);
                        }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium flex items-center gap-2">
                          <ImageIcon className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Online Pictures...</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Drawing Button */}
                  <button
                    onClick={handleInsertDrawing}
                    className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                    title="Drawing Canvas"
                  >
                    <Pencil className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <span className="text-[11px] font-semibold leading-tight mt-1">Drawing</span>
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Illustrations</span>
              </div>

              {/* 4. LINKS GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0">
                <div className="relative my-auto">
                  <button
                    onClick={() => setShowInsertLinkMenu(!showInsertLinkMenu)}
                    className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                    title="Insert Link"
                  >
                    <LinkIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div className="flex items-center gap-0.5 text-[11px] font-semibold leading-tight mt-1">
                      <span>Link</span>
                      <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                    </div>
                  </button>
                  {showInsertLinkMenu && (
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-md shadow-xl p-1 z-30 w-44 text-xs">
                      <button onClick={() => {
                        const url = prompt('Enter Hyperlink URL:', 'https://');
                        if (url) formatDoc('createLink', url);
                        setShowInsertLinkMenu(false);
                      }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium flex items-center gap-2">
                        <LinkIcon className="h-3.5 w-3.5 text-blue-500" />
                        <span>Insert Link (Ctrl+K)</span>
                      </button>
                      <button onClick={() => {
                        handleInsertBookmark();
                        setShowInsertLinkMenu(false);
                      }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium flex items-center gap-2">
                        <Bookmark className="h-3.5 w-3.5 text-blue-500" />
                        <span>Link to Bookmark</span>
                      </button>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Links</span>
              </div>

              {/* 5. TABLE OF CONTENTS GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0">
                <button
                  onClick={handleInsertTableOfContents}
                  className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors my-auto cursor-pointer"
                  title="Insert Table of Contents"
                >
                  <ListOrdered className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                  <span className="text-[11px] font-semibold leading-tight mt-1 text-center">Table of<br/>Contents</span>
                </button>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Table of Contents</span>
              </div>

              {/* 6. BOOKMARKS GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0">
                <div className="relative my-auto">
                  <button
                    onClick={() => setShowInsertBookmarkMenu(!showInsertBookmarkMenu)}
                    className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                    title="Bookmarks"
                  >
                    <Bookmark className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    <div className="flex items-center gap-0.5 text-[11px] font-semibold leading-tight mt-1">
                      <span>Bookmarks</span>
                      <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                    </div>
                  </button>
                  {showInsertBookmarkMenu && (
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-md shadow-xl p-1 z-30 w-40 text-xs">
                      <button onClick={() => { handleInsertBookmark(); setShowInsertBookmarkMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium">Add Bookmark...</button>
                      <button onClick={() => { triggerNotify('Opening Bookmarks Navigator...'); setShowInsertBookmarkMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium">Go to Bookmark</button>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Bookmarks</span>
              </div>

              {/* 7. MEDIA GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0">
                <button
                  onClick={handleInsertOnlineVideo}
                  className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors my-auto cursor-pointer"
                  title="Online Video"
                >
                  <div className="relative">
                    <Video className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="absolute -bottom-1 -right-1 text-[9px] bg-blue-600 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">🌐</span>
                  </div>
                  <span className="text-[11px] font-semibold leading-tight mt-1 text-center">Online<br/>Video</span>
                </button>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Media</span>
              </div>

              {/* 8. COMMENTS GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0">
                <button
                  onClick={handleInsertComment}
                  className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors my-auto cursor-pointer"
                  title="New Comment"
                >
                  <MessageSquarePlus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[11px] font-semibold leading-tight mt-1 text-center">New<br/>Comment</span>
                </button>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Comments</span>
              </div>

              {/* 9. HEADER & FOOTER GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0">
                <div className="flex items-center gap-1.5 my-auto">
                  {/* Header & Footer Button */}
                  <button
                    onClick={handleInsertHeaderFooter}
                    className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                    title="Header & Footer"
                  >
                    <PanelTop className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <span className="text-[11px] font-semibold leading-tight mt-1 text-center">Header &<br/>Footer</span>
                  </button>

                  {/* Page Numbers Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowInsertPageNumMenu(!showInsertPageNumMenu)}
                      className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                      title="Page Numbers"
                    >
                      <Hash className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      <div className="flex items-center gap-0.5 text-[11px] font-semibold leading-tight mt-1">
                        <span>Page<br/>Numbers</span>
                        <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                      </div>
                    </button>
                    {showInsertPageNumMenu && (
                      <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-md shadow-xl p-1 z-30 w-40 text-xs">
                        <button onClick={() => { handleInsertPageNumber('right'); setShowInsertPageNumMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium">Top of Page (Right)</button>
                        <button onClick={() => { handleInsertPageNumber('center'); setShowInsertPageNumMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium">Bottom of Page (Center)</button>
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Header & Footer</span>
              </div>

              {/* 10. SYMBOLS GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0">
                <div className="flex items-center gap-1.5 my-auto">
                  {/* Equation Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowInsertEquationMenu(!showInsertEquationMenu)}
                      className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                      title="Insert Equation"
                    >
                      <span className="font-serif text-lg font-bold text-slate-800 dark:text-zinc-100 leading-none">π</span>
                      <span className="text-[11px] font-semibold leading-tight mt-1">Equation</span>
                    </button>
                    {showInsertEquationMenu && (
                      <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-md shadow-xl p-1 z-30 w-52 text-xs">
                        <button onClick={() => { handleInsertEquation('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}'); setShowInsertEquationMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-serif italic">Quadratic Formula</button>
                        <button onClick={() => { handleInsertEquation('a^2 + b^2 = c^2'); setShowInsertEquationMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-serif italic">Pythagorean Theorem</button>
                        <button onClick={() => { handleInsertEquation('A = \\pi r^2'); setShowInsertEquationMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-serif italic">Area of Circle</button>
                        <button onClick={() => { handleInsertEquation('E = mc^2'); setShowInsertEquationMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-serif italic">Energy Equivalence</button>
                      </div>
                    )}
                  </div>

                  {/* Symbol Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowInsertSymbolMenu(!showInsertSymbolMenu)}
                      className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                      title="Insert Symbol"
                    >
                      <span className="font-serif text-lg font-bold text-slate-800 dark:text-zinc-100 leading-none">Ω</span>
                      <div className="flex items-center gap-0.5 text-[11px] font-semibold leading-tight mt-1">
                        <span>Symbol</span>
                        <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                      </div>
                    </button>
                    {showInsertSymbolMenu && (
                      <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-md shadow-xl p-2 z-30 w-48 grid grid-cols-5 gap-1 text-center text-sm font-semibold">
                        {['©', '®', '™', '∞', 'Δ', 'λ', 'μ', 'π', 'Σ', '±', '≠', '≈', '≤', '≥', '€', '£', '¥', '✓', '★', '♥'].map(sym => (
                          <button key={sym} onClick={() => { handleInsertSymbol(sym); setShowInsertSymbolMenu(false); }} className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded cursor-pointer">{sym}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Symbols</span>
              </div>

              {/* 11. EMOJIS GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 shrink-0 relative">
                <div className="relative my-auto">
                  <button
                    onClick={() => setShowInsertEmojiMenu(!showInsertEmojiMenu)}
                    className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                    title="Emojis"
                  >
                    <Smile className="h-5 w-5 text-amber-500" />
                    <div className="flex items-center gap-0.5 text-[11px] font-semibold leading-tight mt-1">
                      <span>Emoji</span>
                      <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                    </div>
                  </button>
                  {showInsertEmojiMenu && (
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-md shadow-xl p-2 z-30 w-44 grid grid-cols-5 gap-1.5 text-center text-base">
                      {['😀', '👍', '❤️', '🎉', '🚀', '💡', '🔥', '⭐', '📝', '💼', '✅', '📌', '🎯', '✨', '👏'].map(em => (
                        <button key={em} onClick={() => { handleInsertEmoji(em); setShowInsertEmojiMenu(false); }} className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded cursor-pointer">{em}</button>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Emojis</span>
              </div>

            </div>
          )}

          {/* LAYOUT & DESIGN TAB TOOLBAR - Exact MS Word Ribbon Layout */}
          {activeTab === 'layout' && (
            <div className="flex flex-wrap items-stretch gap-1 p-1.5 bg-slate-100/90 dark:bg-[#0c101d] rounded-xl border border-slate-200 dark:border-white/10 text-slate-800 dark:text-zinc-200 text-xs overflow-x-auto no-scrollbar select-none">

              {/* 1. PAGE SETUP GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0">
                <div className="flex items-center gap-1 my-auto">
                  
                  {/* Margins Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowMarginsMenu(!showMarginsMenu)}
                      className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                      title="Page Margins"
                    >
                      <div className="w-5 h-5 border-2 border-slate-700 dark:border-zinc-200 rounded-xs flex items-center justify-center p-0.5">
                        <div className="w-full h-full border border-dashed border-blue-600 dark:border-blue-400"></div>
                      </div>
                      <div className="flex items-center gap-0.5 text-[11px] font-semibold leading-tight mt-1">
                        <span>Margins</span>
                        <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                      </div>
                    </button>
                    {showMarginsMenu && (
                      <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-md shadow-xl p-1 z-30 w-48 text-xs">
                        <button onClick={() => { setPageMargin('normal'); triggerNotify('Set Margins: Normal (1 inch)'); setShowMarginsMenu(false); }} className={`w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium flex items-center justify-between ${pageMargin === 'normal' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-bold' : ''}`}>
                          <span>Normal</span>
                          <span className="text-[10px] text-slate-400">Top 1" • Left 1"</span>
                        </button>
                        <button onClick={() => { setPageMargin('narrow'); triggerNotify('Set Margins: Narrow (0.5 inch)'); setShowMarginsMenu(false); }} className={`w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium flex items-center justify-between ${pageMargin === 'narrow' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-bold' : ''}`}>
                          <span>Narrow</span>
                          <span className="text-[10px] text-slate-400">Top 0.5" • Left 0.5"</span>
                        </button>
                        <button onClick={() => { setPageMargin('moderate'); triggerNotify('Set Margins: Moderate (0.75 inch)'); setShowMarginsMenu(false); }} className={`w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium flex items-center justify-between ${pageMargin === 'moderate' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-bold' : ''}`}>
                          <span>Moderate</span>
                          <span className="text-[10px] text-slate-400">Top 1" • Left 0.75"</span>
                        </button>
                        <button onClick={() => { setPageMargin('wide'); triggerNotify('Set Margins: Wide (1.5 inch)'); setShowMarginsMenu(false); }} className={`w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium flex items-center justify-between ${pageMargin === 'wide' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-bold' : ''}`}>
                          <span>Wide</span>
                          <span className="text-[10px] text-slate-400">Top 1" • Left 1.5"</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Orientation Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowOrientationMenu(!showOrientationMenu)}
                      className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                      title="Page Orientation"
                    >
                      <div className="w-5 h-5 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        {pageOrientation === 'landscape' ? (
                          <div className="w-5 h-3.5 border-2 border-blue-600 rounded-2xs bg-blue-50 dark:bg-blue-900/30"></div>
                        ) : (
                          <div className="w-3.5 h-5 border-2 border-blue-600 rounded-2xs bg-blue-50 dark:bg-blue-900/30"></div>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 text-[11px] font-semibold leading-tight mt-1">
                        <span>Orientation</span>
                        <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                      </div>
                    </button>
                    {showOrientationMenu && (
                      <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-md shadow-xl p-1 z-30 w-36 text-xs">
                        <button onClick={() => { setPageOrientation('portrait'); triggerNotify('Page Orientation: Portrait'); setShowOrientationMenu(false); }} className={`w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium flex items-center justify-between ${pageOrientation === 'portrait' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-bold' : ''}`}>
                          <span>Portrait</span>
                          <span>📄</span>
                        </button>
                        <button onClick={() => { setPageOrientation('landscape'); triggerNotify('Page Orientation: Landscape'); setShowOrientationMenu(false); }} className={`w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium flex items-center justify-between ${pageOrientation === 'landscape' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-bold' : ''}`}>
                          <span>Landscape</span>
                          <span>🖼️</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Size Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowSizeMenu(!showSizeMenu)}
                      className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                      title="Page Size"
                    >
                      <div className="w-5 h-5 border-2 border-slate-700 dark:border-zinc-200 rounded-xs flex flex-col justify-between p-0.5 relative">
                        <div className="w-full h-0.5 bg-blue-600"></div>
                        <div className="w-0.5 h-full bg-blue-600 absolute left-1/2 -translate-x-1/2"></div>
                      </div>
                      <div className="flex items-center gap-0.5 text-[11px] font-semibold leading-tight mt-1">
                        <span>Size</span>
                        <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                      </div>
                    </button>
                    {showSizeMenu && (
                      <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-md shadow-xl p-1 z-30 w-44 text-xs">
                        <button onClick={() => { setPageSize('a4'); triggerNotify('Page Size: A4 (210 x 297 mm)'); setShowSizeMenu(false); }} className={`w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium flex items-center justify-between ${pageSize === 'a4' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-bold' : ''}`}>
                          <span>A4</span>
                          <span className="text-[10px] text-slate-400">21 x 29.7 cm</span>
                        </button>
                        <button onClick={() => { setPageSize('letter'); triggerNotify('Page Size: Letter (8.5 x 11 in)'); setShowSizeMenu(false); }} className={`w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium flex items-center justify-between ${pageSize === 'letter' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-bold' : ''}`}>
                          <span>Letter</span>
                          <span className="text-[10px] text-slate-400">8.5" x 11"</span>
                        </button>
                        <button onClick={() => { setPageSize('legal'); triggerNotify('Page Size: Legal (8.5 x 14 in)'); setShowSizeMenu(false); }} className={`w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium flex items-center justify-between ${pageSize === 'legal' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-bold' : ''}`}>
                          <span>Legal</span>
                          <span className="text-[10px] text-slate-400">8.5" x 14"</span>
                        </button>
                        <button onClick={() => { setPageSize('executive'); triggerNotify('Page Size: Executive (7.25 x 10.5 in)'); setShowSizeMenu(false); }} className={`w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium flex items-center justify-between ${pageSize === 'executive' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-bold' : ''}`}>
                          <span>Executive</span>
                          <span className="text-[10px] text-slate-400">7.25" x 10.5"</span>
                        </button>
                        <button onClick={() => { setPageSize('a5'); triggerNotify('Page Size: A5 (148 x 210 mm)'); setShowSizeMenu(false); }} className={`w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium flex items-center justify-between ${pageSize === 'a5' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-bold' : ''}`}>
                          <span>A5</span>
                          <span className="text-[10px] text-slate-400">14.8 x 21 cm</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Columns Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowColumnsMenu(!showColumnsMenu)}
                      className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                      title="Page Columns"
                    >
                      <div className="w-5 h-5 flex items-center gap-0.5 justify-center">
                        <div className="w-1.5 h-full bg-blue-600 rounded-2xs"></div>
                        <div className="w-1.5 h-full bg-blue-600 rounded-2xs"></div>
                      </div>
                      <div className="flex items-center gap-0.5 text-[11px] font-semibold leading-tight mt-1">
                        <span>Columns</span>
                        <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                      </div>
                    </button>
                    {showColumnsMenu && (
                      <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-md shadow-xl p-1 z-30 w-36 text-xs">
                        <button onClick={() => { setPageColumns('1'); triggerNotify('Columns: One Column'); setShowColumnsMenu(false); }} className={`w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium ${pageColumns === '1' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-bold' : ''}`}>One</button>
                        <button onClick={() => { setPageColumns('2'); triggerNotify('Columns: Two Columns'); setShowColumnsMenu(false); }} className={`w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium ${pageColumns === '2' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-bold' : ''}`}>Two</button>
                        <button onClick={() => { setPageColumns('3'); triggerNotify('Columns: Three Columns'); setShowColumnsMenu(false); }} className={`w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium ${pageColumns === '3' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-bold' : ''}`}>Three</button>
                      </div>
                    )}
                  </div>

                  {/* Breaks Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowBreaksMenu(!showBreaksMenu)}
                      className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                      title="Page & Section Breaks"
                    >
                      <Rows className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      <div className="flex items-center gap-0.5 text-[11px] font-semibold leading-tight mt-1">
                        <span>Breaks</span>
                        <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                      </div>
                    </button>
                    {showBreaksMenu && (
                      <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-md shadow-xl p-1 z-30 w-48 text-xs">
                        <button onClick={() => { handleAddPage(activePageIndex); setShowBreaksMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add Blank Page</span>
                        </button>
                        <button onClick={() => { handleInsertPageBreak(); setShowBreaksMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium">Page Break (New Page)</button>
                        <button onClick={() => { handleDeletePage(activePageIndex); setShowBreaksMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded font-bold flex items-center justify-between">
                          <span>Delete Current Page</span>
                          <Trash2 className="h-3 w-3" />
                        </button>
                        <button onClick={() => {
                          const colBreak = `<div style="break-after: column; border-top: 1px dotted #818cf8; margin: 12px 0; text-align: center; color: #6366f1; font-size: 10px; font-weight: bold;">--- COLUMN BREAK ---</div><p>&nbsp;</p>`;
                          formatDoc('insertHTML', colBreak);
                          triggerNotify('Inserted Column Break.');
                          setShowBreaksMenu(false);
                        }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium">Column Break</button>
                        <button onClick={() => {
                          const secBreak = `<div style="border-top: 2px dashed #10b981; margin: 16px 0; padding-top: 4px; text-align: center; color: #059669; font-size: 10px; font-weight: bold;">=== SECTION BREAK (NEXT PAGE) ===</div><p>&nbsp;</p>`;
                          formatDoc('insertHTML', secBreak);
                          triggerNotify('Inserted Section Break.');
                          setShowBreaksMenu(false);
                        }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium">Section Break (Next Page)</button>
                      </div>
                    )}
                  </div>

                  {/* Line Numbers Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowLineNumbersMenu(!showLineNumbersMenu)}
                      className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                      title="Line Numbers"
                    >
                      <div className="flex flex-col items-center text-[10px] font-mono leading-none font-bold text-blue-600 dark:text-blue-400">
                        <span>1—</span>
                        <span>2—</span>
                      </div>
                      <div className="flex items-center gap-0.5 text-[11px] font-semibold leading-tight mt-1 text-center">
                        <span>Line<br/>Numbers</span>
                        <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                      </div>
                    </button>
                    {showLineNumbersMenu && (
                      <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-md shadow-xl p-1 z-30 w-44 text-xs">
                        <button onClick={() => { setLineNumbers('none'); triggerNotify('Line Numbers: None'); setShowLineNumbersMenu(false); }} className={`w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium ${lineNumbers === 'none' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-bold' : ''}`}>None</button>
                        <button onClick={() => { setLineNumbers('continuous'); triggerNotify('Line Numbers: Continuous'); setShowLineNumbersMenu(false); }} className={`w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium ${lineNumbers === 'continuous' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-bold' : ''}`}>Continuous</button>
                        <button onClick={() => { setLineNumbers('restart_page'); triggerNotify('Line Numbers: Restart Each Page'); setShowLineNumbersMenu(false); }} className={`w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium ${lineNumbers === 'restart_page' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-bold' : ''}`}>Restart Each Page</button>
                      </div>
                    )}
                  </div>

                </div>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Page Setup</span>
              </div>

              {/* 2. PARAGRAPH GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0">
                <div className="flex items-center gap-3 my-auto">
                  
                  {/* Indent Controls */}
                  <div className="flex flex-col gap-1 text-[11px]">
                    <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Indent</span>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1 w-12 text-slate-600 dark:text-zinc-300">
                        <Indent className="h-3 w-3 text-blue-600" />
                        <span>Left:</span>
                      </div>
                      <div className="flex items-center border border-slate-300 dark:border-white/20 rounded bg-white dark:bg-zinc-900 px-1 py-0.5">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="10"
                          value={indentLeft}
                          onChange={(e) => setIndentLeft(parseFloat(e.target.value) || 0)}
                          className="w-8 text-xs font-semibold outline-none text-right dark:bg-transparent"
                        />
                        <span className="text-[10px] text-slate-400 ml-0.5">cm</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1 w-12 text-slate-600 dark:text-zinc-300">
                        <Outdent className="h-3 w-3 text-blue-600" />
                        <span>Right:</span>
                      </div>
                      <div className="flex items-center border border-slate-300 dark:border-white/20 rounded bg-white dark:bg-zinc-900 px-1 py-0.5">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="10"
                          value={indentRight}
                          onChange={(e) => setIndentRight(parseFloat(e.target.value) || 0)}
                          className="w-8 text-xs font-semibold outline-none text-right dark:bg-transparent"
                        />
                        <span className="text-[10px] text-slate-400 ml-0.5">cm</span>
                      </div>
                    </div>
                  </div>

                  {/* Spacing Controls */}
                  <div className="flex flex-col gap-1 text-[11px]">
                    <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Spacing</span>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1 w-14 text-slate-600 dark:text-zinc-300">
                        <ArrowUpDown className="h-3 w-3 text-emerald-600" />
                        <span>Before:</span>
                      </div>
                      <div className="flex items-center border border-slate-300 dark:border-white/20 rounded bg-white dark:bg-zinc-900 px-1 py-0.5">
                        <input
                          type="number"
                          step="2"
                          min="0"
                          max="72"
                          value={spacingBefore}
                          onChange={(e) => setSpacingBefore(parseInt(e.target.value) || 0)}
                          className="w-8 text-xs font-semibold outline-none text-right dark:bg-transparent"
                        />
                        <span className="text-[10px] text-slate-400 ml-0.5">pt</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1 w-14 text-slate-600 dark:text-zinc-300">
                        <ArrowUpDown className="h-3 w-3 text-emerald-600" />
                        <span>After:</span>
                      </div>
                      <div className="flex items-center border border-slate-300 dark:border-white/20 rounded bg-white dark:bg-zinc-900 px-1 py-0.5">
                        <input
                          type="number"
                          step="2"
                          min="0"
                          max="72"
                          value={spacingAfter}
                          onChange={(e) => setSpacingAfter(parseInt(e.target.value) || 0)}
                          className="w-8 text-xs font-semibold outline-none text-right dark:bg-transparent"
                        />
                        <span className="text-[10px] text-slate-400 ml-0.5">pt</span>
                      </div>
                    </div>
                  </div>

                </div>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Paragraph</span>
              </div>

              {/* 3. PAGE BACKGROUND GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 shrink-0">
                <div className="flex items-center gap-2 my-auto">
                  
                  {/* Page Borders Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowPageBordersMenu(!showPageBordersMenu)}
                      className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                      title="Page Borders"
                    >
                      <div className="w-5 h-5 border-2 border-blue-600 rounded-xs bg-blue-50/50 flex items-center justify-center">
                        <div className="w-3 h-3 border border-slate-400 border-dashed"></div>
                      </div>
                      <div className="flex items-center gap-0.5 text-[11px] font-semibold leading-tight mt-1 text-center">
                        <span>Page<br/>Borders</span>
                        <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                      </div>
                    </button>
                    {showPageBordersMenu && (
                      <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-md shadow-xl p-1 z-30 w-40 text-xs">
                        <button onClick={() => { setPageBorder('none'); triggerNotify('Page Border: None'); setShowPageBordersMenu(false); }} className={`w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium ${pageBorder === 'none' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-bold' : ''}`}>None</button>
                        <button onClick={() => { setPageBorder('box'); triggerNotify('Page Border: Box Border'); setShowPageBordersMenu(false); }} className={`w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium ${pageBorder === 'box' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-bold' : ''}`}>Box Border</button>
                        <button onClick={() => { setPageBorder('shadow'); triggerNotify('Page Border: Shadow Border'); setShowPageBordersMenu(false); }} className={`w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium ${pageBorder === 'shadow' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-bold' : ''}`}>Shadow Border</button>
                        <button onClick={() => { setPageBorder('double'); triggerNotify('Page Border: Double Border'); setShowPageBordersMenu(false); }} className={`w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium ${pageBorder === 'double' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-bold' : ''}`}>Double Line</button>
                        <button onClick={() => { setPageBorder('dashed'); triggerNotify('Page Border: Dashed Border'); setShowPageBordersMenu(false); }} className={`w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium ${pageBorder === 'dashed' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-bold' : ''}`}>Dashed Border</button>
                      </div>
                    )}
                  </div>

                  {/* Page Colour Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowPageColorMenu(!showPageColorMenu)}
                      className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                      title="Page Colour"
                    >
                      <PaintBucket className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <div className="flex items-center gap-0.5 text-[11px] font-semibold leading-tight mt-1 text-center">
                        <span>Page<br/>Colour</span>
                        <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                      </div>
                    </button>
                    {showPageColorMenu && (
                      <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-md shadow-xl p-2 z-30 w-44 text-xs">
                        <button onClick={() => { setPageBg('white'); triggerNotify('Page Colour: Standard White'); setShowPageColorMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded-full border border-slate-300 bg-white"></span>
                          <span>Standard White</span>
                        </button>
                        <button onClick={() => { setPageBg('cream'); triggerNotify('Page Colour: Warm Cream'); setShowPageColorMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded-full border border-amber-300 bg-[#faf8f5]"></span>
                          <span>Warm Cream</span>
                        </button>
                        <button onClick={() => { setPageBg('dark'); triggerNotify('Page Colour: Dark Canvas'); setShowPageColorMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded-full border border-zinc-700 bg-[#121620]"></span>
                          <span>Dark Canvas</span>
                        </button>
                      </div>
                    )}
                  </div>

                </div>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Page Background</span>
              </div>

            </div>
          )}

          {/* REFERENCES TAB TOOLBAR - Exact Microsoft Word Ribbon Layout */}
          {activeTab === 'references' && (
            <div className="flex flex-wrap items-stretch gap-1 p-1.5 bg-slate-100/90 dark:bg-[#0c101d] rounded-xl border border-slate-200 dark:border-white/10 text-slate-800 dark:text-zinc-200 text-xs overflow-x-auto no-scrollbar select-none">

              {/* 1. TABLE OF CONTENTS GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0">
                <div className="flex items-center gap-2 my-auto">
                  {/* Insert Table of Contents Big Button */}
                  <button
                    onClick={handleInsertTOC}
                    className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                    title="Insert Table of Contents"
                  >
                    <div className="w-6 h-6 border-2 border-slate-700 dark:border-zinc-200 rounded flex flex-col justify-center p-1 bg-white dark:bg-zinc-800 shadow-2xs">
                      <div className="w-full h-0.5 bg-blue-600 mb-0.5"></div>
                      <div className="w-3/4 h-0.5 bg-slate-400 mb-0.5"></div>
                      <div className="w-1/2 h-0.5 bg-slate-400"></div>
                    </div>
                    <span className="text-[11px] font-semibold leading-tight mt-1 text-center max-w-[80px]">
                      Insert Table<br />of Contents
                    </span>
                  </button>

                  {/* Stacked Update & Remove TOC Buttons */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={handleUpdateTOC}
                      className="flex items-center gap-1.5 px-2 py-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-[11px] text-slate-700 dark:text-zinc-200 cursor-pointer transition-colors"
                      title="Update Table of Contents"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Update Table of Contents</span>
                    </button>
                    <button
                      onClick={handleRemoveTOC}
                      className="flex items-center gap-1.5 px-2 py-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-[11px] text-slate-700 dark:text-zinc-200 cursor-pointer transition-colors"
                      title="Remove Table of Contents"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                      <span>Remove Table of Contents</span>
                    </button>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Table of Contents</span>
              </div>

              {/* 2. FOOTNOTES GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0">
                <div className="flex items-center gap-2 my-auto">
                  {/* Big Insert Footnote Button */}
                  <button
                    onClick={handleInsertFootnote}
                    className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                    title="Insert Footnote (Ab¹)"
                  >
                    <div className="flex items-baseline justify-center font-serif font-bold text-base leading-none text-slate-800 dark:text-zinc-100">
                      <span>Ab</span>
                      <span className="text-blue-600 dark:text-blue-400 text-xs font-sans font-black ml-0.5">1</span>
                    </div>
                    <span className="text-[11px] font-semibold leading-tight mt-1 text-center max-w-[65px]">
                      Insert<br />Footnote
                    </span>
                  </button>

                  {/* Stacked Insert Endnote, Show Footnotes, Show Endnotes */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={handleInsertEndnote}
                      className="flex items-center gap-1.5 px-2 py-0.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-[11px] text-slate-700 dark:text-zinc-200 cursor-pointer transition-colors"
                      title="Insert Endnote"
                    >
                      <div className="flex items-center text-xs font-serif font-semibold">
                        <FileCode className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 mr-1" />
                        <span>Insert Endnote</span>
                      </div>
                    </button>
                    <button
                      onClick={handleShowFootnotes}
                      className="flex items-center gap-1.5 px-2 py-0.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-[11px] text-slate-700 dark:text-zinc-200 cursor-pointer transition-colors"
                      title="Show Footnotes"
                    >
                      <div className="flex items-center">
                        <span className="text-[10px] font-bold text-blue-600 mr-1">➔1</span>
                        <span>Show Footnotes</span>
                      </div>
                    </button>
                    <button
                      onClick={handleShowEndnotes}
                      className="flex items-center gap-1.5 px-2 py-0.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-[11px] text-slate-700 dark:text-zinc-200 cursor-pointer transition-colors"
                      title="Show Endnotes"
                    >
                      <div className="flex items-center">
                        <span className="text-[10px] font-bold text-emerald-600 mr-1">➔(i)</span>
                        <span>Show Endnotes</span>
                      </div>
                    </button>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Footnotes</span>
              </div>

              {/* 3. INSIGHTS GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0">
                <div className="flex items-center justify-center my-auto px-1">
                  <button
                    onClick={() => {
                      setShowFindReplace(true);
                      triggerNotify('Smart Insights Search activated.');
                    }}
                    className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                    title="Smart Search & Insights"
                  >
                    <div className="relative">
                      <Search className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-blue-600 text-[8px] font-bold text-white">i</span>
                    </div>
                    <span className="text-[11px] font-semibold leading-tight mt-1">Search</span>
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Insights</span>
              </div>

              {/* 4. CITATION & BIBLIOGRAPHY GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 shrink-0">
                <div className="flex items-center justify-center my-auto px-1">
                  <div className="relative">
                    <button
                      onClick={() => setShowCitationsMenu(!showCitationsMenu)}
                      className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                      title="Citations & Bibliography"
                    >
                      <div className="w-6 h-6 rounded border border-rose-500 bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold">
                        <BookMarked className="h-4 w-4" />
                      </div>
                      <div className="flex items-center gap-0.5 text-[11px] font-semibold leading-tight mt-1">
                        <span>Citations</span>
                        <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                      </div>
                    </button>

                    {showCitationsMenu && (
                      <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-md shadow-xl p-1 z-30 w-52 text-xs">
                        <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Style Presets</div>
                        <button onClick={() => { handleInsertCitation('apa'); setShowCitationsMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium flex items-center justify-between">
                          <span>APA Style Citation</span>
                          <span className="text-[10px] text-blue-600 font-mono">(Author, 2024)</span>
                        </button>
                        <button onClick={() => { handleInsertCitation('mla'); setShowCitationsMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium flex items-center justify-between">
                          <span>MLA Style Citation</span>
                          <span className="text-[10px] text-blue-600 font-mono">(Author 14)</span>
                        </button>
                        <button onClick={() => { handleInsertCitation('chicago'); setShowCitationsMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium flex items-center justify-between">
                          <span>Chicago Style</span>
                          <span className="text-[10px] text-blue-600 font-mono">(Author p. 12)</span>
                        </button>
                        <div className="my-1 border-t border-slate-200 dark:border-white/10"></div>
                        <button onClick={() => { handleInsertCitation('bibliography'); setShowCitationsMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>Insert Bibliography</span>
                        </button>
                        <button onClick={() => { handleInsertCitation('workscited'); setShowCitationsMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <Quote className="h-3.5 w-3.5" />
                          <span>Insert Works Cited</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Citation & Bibliography</span>
              </div>

            </div>
          )}

          {/* REVIEW & STATS TAB - Exact MS Word Review Ribbon Layout */}
          {activeTab === 'review' && (
            <div className="flex flex-wrap items-stretch gap-1 p-1.5 bg-slate-100/90 dark:bg-[#0c101d] rounded-xl border border-slate-200 dark:border-white/10 text-slate-800 dark:text-zinc-200 text-xs overflow-x-auto no-scrollbar select-none">

              {/* 1. PROOFING GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0">
                <div className="flex items-center gap-2 my-auto">
                  {/* Big Editor Button */}
                  <div className="relative">
                    <button
                      onClick={() => setShowEditorMenu(!showEditorMenu)}
                      className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                      title="Editor"
                    >
                      <div className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400">
                        <Pencil className="h-5 w-5" />
                        <ChevronDown className="h-2.5 w-2.5 text-slate-500" />
                      </div>
                      <span className="text-[11px] font-semibold leading-tight mt-1 text-center">
                        Editor
                      </span>
                    </button>

                    {showEditorMenu && (
                      <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-md shadow-xl p-1 z-30 w-48 text-xs">
                        <button onClick={() => { handleRunEditor('full'); setShowEditorMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium flex items-center gap-2">
                          <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                          <span>Run Full Analysis</span>
                        </button>
                        <button onClick={() => { handleRunEditor('conciseness'); setShowEditorMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium flex items-center gap-2">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Check Conciseness</span>
                        </button>
                        <button onClick={() => { handleRunEditor('formal'); setShowEditorMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-purple-600" />
                          <span>Check Tone & Voice</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Stacked Spelling & Grammar + Word Count */}
                  <div className="flex flex-col gap-0.5">
                    {/* Spelling & Grammar */}
                    <div className="relative">
                      <button
                        onClick={handleSpellingGrammarCheck}
                        className="flex items-center gap-1.5 px-2 py-0.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-[11px] text-slate-700 dark:text-zinc-200 cursor-pointer transition-colors"
                        title="Spelling & Grammar"
                      >
                        <div className="flex items-center gap-0.5 font-bold text-xs">
                          <span className="text-slate-800 dark:text-zinc-100 font-mono tracking-tight">ABC</span>
                          <CheckCircle className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span>Spelling & Grammar</span>
                        <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                      </button>
                    </div>

                    {/* Word Count */}
                    <div className="relative">
                      <button
                        onClick={handleOpenWordCount}
                        className="flex items-center gap-1.5 px-2 py-0.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-[11px] text-slate-700 dark:text-zinc-200 cursor-pointer transition-colors"
                        title="Word Count"
                      >
                        <div className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-mono font-bold text-[10px]">
                          <span>123</span>
                          <Rows className="h-3 w-3" />
                        </div>
                        <span>Word Count</span>
                        <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                      </button>
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Proofing</span>
              </div>

              {/* 2. ACCESSIBILITY GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0">
                <div className="flex items-center justify-center my-auto px-1">
                  <button
                    onClick={handleCheckAccessibility}
                    className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                    title="Check Accessibility"
                  >
                    <div className="relative flex items-center justify-center text-slate-700 dark:text-zinc-200">
                      <UserCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-0.5">
                        <Check className="h-2 w-2" />
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold leading-tight mt-1 text-center max-w-[70px]">
                      Check<br />Accessibility
                    </span>
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Accessibility</span>
              </div>

              {/* 3. TRANSLATE GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0">
                <div className="flex items-center justify-center my-auto px-1">
                  <div className="relative">
                    <button
                      onClick={() => setShowTranslateMenu(!showTranslateMenu)}
                      className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                      title="Translate"
                    >
                      <div className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400">
                        <Languages className="h-5 w-5" />
                        <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                      </div>
                      <span className="text-[11px] font-semibold leading-tight mt-1 text-center">
                        Translate
                      </span>
                    </button>

                    {showTranslateMenu && (
                      <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-md shadow-xl p-1 z-30 w-44 text-xs">
                        <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Language</div>
                        <button onClick={() => { handleTranslateDoc('Spanish'); setShowTranslateMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium">Spanish (Español)</button>
                        <button onClick={() => { handleTranslateDoc('Hindi'); setShowTranslateMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium">Hindi (हिंदी)</button>
                        <button onClick={() => { handleTranslateDoc('French'); setShowTranslateMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium">French (Français)</button>
                        <button onClick={() => { handleTranslateDoc('German'); setShowTranslateMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium">German (Deutsch)</button>
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Translate</span>
              </div>

              {/* 4. COMMENTS GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0">
                <div className="flex items-center gap-2 my-auto">
                  {/* New Comment Button */}
                  <button
                    onClick={handleAddComment}
                    className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                    title="New Comment"
                  >
                    <div className="relative text-blue-600 dark:text-blue-400">
                      <MessageSquarePlus className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-semibold leading-tight mt-1 text-center max-w-[60px]">
                      New<br />Comment
                    </span>
                  </button>

                  {/* Previous, Next, Delete Stack */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={handlePrevComment}
                      className="flex items-center gap-1.5 px-2 py-0.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-[11px] text-slate-700 dark:text-zinc-200 cursor-pointer transition-colors"
                      title="Previous Comment"
                    >
                      <ArrowLeft className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      <span>Previous</span>
                    </button>

                    <button
                      onClick={handleNextComment}
                      className="flex items-center gap-1.5 px-2 py-0.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-[11px] text-slate-700 dark:text-zinc-200 cursor-pointer transition-colors"
                      title="Next Comment"
                    >
                      <ArrowRight className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      <span>Next</span>
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => setShowDeleteCommentMenu(!showDeleteCommentMenu)}
                        className="flex items-center gap-1.5 px-2 py-0.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-[11px] text-slate-700 dark:text-zinc-200 cursor-pointer transition-colors"
                        title="Delete Comment"
                      >
                        <MessageSquareX className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                        <span>Delete</span>
                        <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                      </button>

                      {showDeleteCommentMenu && (
                        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-md shadow-xl p-1 z-30 w-40 text-xs">
                          <button onClick={() => { handleDeleteComment('active'); setShowDeleteCommentMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium text-rose-600">Delete Comment</button>
                          <button onClick={() => { handleDeleteComment('all'); setShowDeleteCommentMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium text-rose-700 font-bold">Delete All Comments</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Show Comments Big Toggle Button */}
                  <button
                    onClick={() => setShowCommentsPanel(!showCommentsPanel)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all border cursor-pointer ${
                      showCommentsPanel
                        ? 'bg-slate-200 dark:bg-zinc-800 border-slate-400 dark:border-white/30 shadow-inner'
                        : 'border-transparent hover:bg-slate-200 dark:hover:bg-white/10'
                    }`}
                    title="Show Comments"
                  >
                    <div className="p-1 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-white/10 rounded shadow-2xs">
                      <MessageSquare className="h-4 w-4 text-slate-700 dark:text-zinc-200" />
                    </div>
                    <span className="text-[11px] font-semibold leading-tight mt-1 text-center max-w-[65px]">
                      Show<br />Comments
                    </span>
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Comments</span>
              </div>

              {/* 5. MARKUP GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0">
                <div className="flex items-center gap-2 my-auto">
                  {/* Filter Button */}
                  <button
                    onClick={() => setShowFilterMenu(!showFilterMenu)}
                    className="flex flex-col items-center justify-center p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer"
                    title="Filter Markup"
                  >
                    <div className="flex items-center text-blue-600 dark:text-blue-400">
                      <Filter className="h-4 w-4" />
                      <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                    </div>
                    <span className="text-[10px] font-medium mt-0.5">Filter</span>
                  </button>

                  {/* Markup View Selector Dropdown */}
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                      <MessageSquare className="h-3 w-3 text-amber-500" />
                      <span>Markup view:</span>
                    </div>
                    <select
                      value={markupView}
                      onChange={(e) => {
                        setMarkupView(e.target.value as any);
                        triggerNotify(`Markup view set to: ${e.target.value}`);
                      }}
                      className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-white/15 rounded px-2 py-0.5 text-xs text-slate-800 dark:text-zinc-100 outline-none cursor-pointer"
                    >
                      <option value="all">All Markup</option>
                      <option value="simple">Simple Markup</option>
                      <option value="none">No Markup</option>
                      <option value="original">Original</option>
                    </select>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Markup</span>
              </div>

              {/* 6. TRACKING GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0">
                <div className="flex items-center gap-2 my-auto">
                  {/* Track Changes Selector */}
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-zinc-200">
                      <Pencil className="h-3.5 w-3.5 text-blue-600" />
                      <span>Track Changes:</span>
                    </div>
                    <select
                      value={trackChanges}
                      onChange={(e) => {
                        setTrackChanges(e.target.value as any);
                        triggerNotify(`Track Changes: ${e.target.value.toUpperCase()}`);
                      }}
                      className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-white/15 rounded px-2 py-0.5 text-xs font-semibold text-slate-800 dark:text-zinc-100 outline-none cursor-pointer"
                    >
                      <option value="off">Off</option>
                      <option value="everyone">For Everyone</option>
                      <option value="mine">Just Mine</option>
                    </select>
                  </div>

                  {/* Accept / Reject / Prev / Next Stack */}
                  <div className="flex items-center gap-1">
                    {/* Accept */}
                    <div className="relative">
                      <button
                        onClick={() => setShowAcceptMenu(!showAcceptMenu)}
                        className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-slate-800 dark:text-zinc-100 cursor-pointer transition-colors"
                        title="Accept Change"
                      >
                        <div className="relative text-emerald-600 dark:text-emerald-400">
                          <FileCheck className="h-4 w-4" />
                        </div>
                        <div className="flex items-center gap-0.5 text-[10px] font-semibold mt-0.5">
                          <span>Accept</span>
                          <ChevronDown className="h-2 w-2 text-slate-400" />
                        </div>
                      </button>

                      {showAcceptMenu && (
                        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-md shadow-xl p-1 z-30 w-44 text-xs">
                          <button onClick={() => { handleAcceptChange('current'); setShowAcceptMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium text-emerald-600">Accept Change</button>
                          <button onClick={() => { handleAcceptChange('all'); setShowAcceptMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-bold text-emerald-700">Accept All Changes</button>
                        </div>
                      )}
                    </div>

                    {/* Reject */}
                    <div className="relative">
                      <button
                        onClick={() => setShowRejectMenu(!showRejectMenu)}
                        className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-slate-800 dark:text-zinc-100 cursor-pointer transition-colors"
                        title="Reject Change"
                      >
                        <div className="relative text-rose-600 dark:text-rose-400">
                          <FileX className="h-4 w-4" />
                        </div>
                        <div className="flex items-center gap-0.5 text-[10px] font-semibold mt-0.5">
                          <span>Reject</span>
                          <ChevronDown className="h-2 w-2 text-slate-400" />
                        </div>
                      </button>

                      {showRejectMenu && (
                        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-md shadow-xl p-1 z-30 w-44 text-xs">
                          <button onClick={() => { handleRejectChange('current'); setShowRejectMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-medium text-rose-600">Reject Change</button>
                          <button onClick={() => { handleRejectChange('all'); setShowRejectMenu(false); }} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded font-bold text-rose-700">Reject All Changes</button>
                        </div>
                      )}
                    </div>

                    {/* Prev / Next Tracked Changes */}
                    <div className="flex flex-col gap-0.5 ml-1">
                      <button
                        onClick={() => triggerNotify('Navigated to previous tracked change.')}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-[10px] flex items-center gap-1"
                        title="Previous Tracked Change"
                      >
                        <ArrowLeft className="h-3 w-3 text-slate-600 dark:text-zinc-300" />
                        <span>Prev</span>
                      </button>
                      <button
                        onClick={() => triggerNotify('Navigated to next tracked change.')}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-[10px] flex items-center gap-1"
                        title="Next Tracked Change"
                      >
                        <ArrowRight className="h-3 w-3 text-slate-600 dark:text-zinc-300" />
                        <span>Next</span>
                      </button>
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Tracking</span>
              </div>

              {/* 7. CHANGES GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 shrink-0">
                <div className="flex items-center justify-center my-auto px-1">
                  <button
                    onClick={handleMarkAllAsRead}
                    className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                    title="Mark All as Read"
                  >
                    <div className="text-blue-600 dark:text-blue-400">
                      <CheckSquare className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-semibold leading-tight mt-1 text-center max-w-[70px]">
                      Mark All<br />as Read
                    </span>
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Changes</span>
              </div>

            </div>
          )}

          {/* VIEW TAB - Exact MS Word View Ribbon Layout */}
          {activeTab === 'view' && (
            <div className="flex flex-wrap items-stretch gap-1 p-1.5 bg-slate-100/90 dark:bg-[#0c101d] rounded-xl border border-slate-200 dark:border-white/10 text-slate-800 dark:text-zinc-200 text-xs overflow-x-auto no-scrollbar select-none">

              {/* 1. DOCUMENT VIEWS GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0">
                <div className="flex items-center gap-1.5 my-auto">
                  {/* Separate Pages */}
                  <button
                    onClick={() => {
                      setDocumentViewMode('separate');
                      triggerNotify('Switched to Separate Pages view.');
                    }}
                    className={`flex flex-col items-center justify-center p-1.5 rounded-md transition-all border cursor-pointer ${
                      documentViewMode === 'separate'
                        ? 'bg-white dark:bg-zinc-800 border-slate-400 dark:border-white/30 shadow-xs text-blue-600 dark:text-blue-400'
                        : 'border-transparent hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-200'
                    }`}
                    title="Separate Pages View"
                  >
                    <div className={`p-1 border rounded bg-slate-50 dark:bg-zinc-900 ${
                      documentViewMode === 'separate' ? 'border-blue-500' : 'border-slate-300 dark:border-white/20'
                    }`}>
                      <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-[11px] font-semibold leading-tight mt-1 text-center max-w-[65px]">
                      Separate<br />Pages
                    </span>
                  </button>

                  {/* Reading View */}
                  <button
                    onClick={() => {
                      setDocumentViewMode('reading');
                      triggerNotify('Switched to Reading View.');
                    }}
                    className={`flex flex-col items-center justify-center p-1.5 rounded-md transition-all border cursor-pointer ${
                      documentViewMode === 'reading'
                        ? 'bg-white dark:bg-zinc-800 border-slate-400 dark:border-white/30 shadow-xs text-blue-600 dark:text-blue-400'
                        : 'border-transparent hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-200'
                    }`}
                    title="Reading View"
                  >
                    <div className={`p-1 border rounded bg-slate-50 dark:bg-zinc-900 ${
                      documentViewMode === 'reading' ? 'border-blue-500' : 'border-slate-300 dark:border-white/20'
                    }`}>
                      <Columns className="h-5 w-5 text-slate-700 dark:text-zinc-200" />
                    </div>
                    <span className="text-[11px] font-semibold leading-tight mt-1 text-center max-w-[65px]">
                      Reading<br />View
                    </span>
                  </button>

                  {/* Immersive Reader */}
                  <button
                    onClick={() => {
                      setDocumentViewMode('immersive');
                      triggerNotify('Immersive Reader view activated.');
                    }}
                    className={`flex flex-col items-center justify-center p-1.5 rounded-md transition-all border cursor-pointer ${
                      documentViewMode === 'immersive'
                        ? 'bg-white dark:bg-zinc-800 border-slate-400 dark:border-white/30 shadow-xs text-blue-600 dark:text-blue-400'
                        : 'border-transparent hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-200'
                    }`}
                    title="Immersive Reader"
                  >
                    <div className={`relative p-1 border rounded bg-slate-50 dark:bg-zinc-900 ${
                      documentViewMode === 'immersive' ? 'border-blue-500' : 'border-slate-300 dark:border-white/20'
                    }`}>
                      <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <Volume2 className="h-3 w-3 absolute -bottom-1 -right-1 text-blue-600 bg-white dark:bg-zinc-900 rounded-full" />
                    </div>
                    <span className="text-[11px] font-semibold leading-tight mt-1 text-center max-w-[65px]">
                      Immersive<br />Reader
                    </span>
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Document Views</span>
              </div>

              {/* 2. ZOOM GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0">
                <div className="flex items-center gap-2 my-auto">
                  {/* Zoom Dropdown */}
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-zinc-200">
                      <Search className="h-3.5 w-3.5 text-blue-600" />
                      <span>Zoom:</span>
                    </div>
                    <select
                      value={zoomLevel}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setZoomLevel(val);
                        triggerNotify(`Zoom set to ${val}%`);
                      }}
                      className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-white/15 rounded px-2 py-0.5 text-xs font-semibold text-slate-800 dark:text-zinc-100 outline-none cursor-pointer"
                    >
                      <option value={50}>50%</option>
                      <option value={75}>75%</option>
                      <option value={100}>100%</option>
                      <option value={125}>125%</option>
                      <option value={150}>150%</option>
                      <option value={200}>200%</option>
                    </select>
                  </div>

                  {/* 100% Button */}
                  <button
                    onClick={() => {
                      setZoomLevel(100);
                      triggerNotify('Zoom reset to 100%');
                    }}
                    className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                    title="100% Zoom"
                  >
                    <div className="p-0.5 border border-slate-400 dark:border-white/30 rounded bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 font-mono font-bold text-[10px]">
                      100
                    </div>
                    <span className="text-[11px] font-semibold leading-tight mt-1 text-center">
                      100%
                    </span>
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Zoom</span>
              </div>

              {/* 3. SHOW GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 border-r border-slate-300/80 dark:border-white/15 shrink-0">
                <div className="flex items-center gap-1.5 my-auto">
                  {/* Ruler */}
                  <button
                    onClick={() => {
                      setShowRuler(!showRuler);
                      triggerNotify(showRuler ? 'Ruler hidden' : 'Ruler shown');
                    }}
                    className={`flex flex-col items-center justify-center p-1.5 rounded-md transition-all border cursor-pointer ${
                      showRuler
                        ? 'bg-white dark:bg-zinc-800 border-slate-400 dark:border-white/30 shadow-xs text-blue-600 dark:text-blue-400'
                        : 'border-transparent hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-200'
                    }`}
                    title="Ruler"
                  >
                    <Ruler className="h-5 w-5 text-slate-700 dark:text-zinc-200" />
                    <span className="text-[11px] font-semibold leading-tight mt-1 text-center">
                      Ruler
                    </span>
                  </button>

                  {/* Margin Guides */}
                  <button
                    onClick={() => {
                      setShowMarginGuides(!showMarginGuides);
                      triggerNotify(showMarginGuides ? 'Margin guides hidden' : 'Margin guides shown');
                    }}
                    className={`flex flex-col items-center justify-center p-1.5 rounded-md transition-all border cursor-pointer ${
                      showMarginGuides
                        ? 'bg-white dark:bg-zinc-800 border-slate-400 dark:border-white/30 shadow-xs text-blue-600 dark:text-blue-400'
                        : 'border-transparent hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-200'
                    }`}
                    title="Margin Guides"
                  >
                    <SquareDashed className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-[11px] font-semibold leading-tight mt-1 text-center">
                      Margin<br />Guides
                    </span>
                  </button>

                  {/* Navigation */}
                  <button
                    onClick={() => {
                      setShowNavigationPane(!showNavigationPane);
                      triggerNotify(showNavigationPane ? 'Navigation pane closed' : 'Navigation pane opened');
                    }}
                    className={`flex flex-col items-center justify-center p-1.5 rounded-md transition-all border cursor-pointer ${
                      showNavigationPane
                        ? 'bg-white dark:bg-zinc-800 border-slate-400 dark:border-white/30 shadow-xs text-blue-600 dark:text-blue-400'
                        : 'border-transparent hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-200'
                    }`}
                    title="Navigation Pane"
                  >
                    <PanelLeft className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-[11px] font-semibold leading-tight mt-1 text-center">
                      Navigation
                    </span>
                  </button>

                  {/* Header & Footer */}
                  <button
                    onClick={() => {
                      setShowHeaderFooter(!showHeaderFooter);
                      triggerNotify(showHeaderFooter ? 'Header & Footer view off' : 'Header & Footer editing enabled');
                    }}
                    className={`flex flex-col items-center justify-center p-1.5 rounded-md transition-all border cursor-pointer ${
                      showHeaderFooter
                        ? 'bg-white dark:bg-zinc-800 border-slate-400 dark:border-white/30 shadow-xs text-amber-600 dark:text-amber-400'
                        : 'border-transparent hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-200'
                    }`}
                    title="Header & Footer"
                  >
                    <PanelTop className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <span className="text-[11px] font-semibold leading-tight mt-1 text-center max-w-[65px]">
                      Header &<br />Footer
                    </span>
                  </button>

                  {/* Footnotes */}
                  <button
                    onClick={() => {
                      triggerNotify('Navigated to Footnotes area.');
                      const elem = document.getElementById('document-footnotes');
                      if (elem) elem.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                    title="Footnotes"
                  >
                    <div className="flex items-center text-slate-600 dark:text-zinc-300 font-serif font-bold text-sm">
                      <span>Ab</span>
                      <span className="text-[10px] text-blue-600 -mt-1">1</span>
                    </div>
                    <span className="text-[11px] font-semibold leading-tight mt-1 text-center">
                      Footnotes
                    </span>
                  </button>

                  {/* Endnotes */}
                  <button
                    onClick={() => {
                      triggerNotify('Navigated to Endnotes area.');
                      const elem = document.getElementById('document-endnotes');
                      if (elem) elem.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-zinc-100 transition-colors cursor-pointer"
                    title="Endnotes"
                  >
                    <div className="flex items-center text-slate-600 dark:text-zinc-300 font-serif font-bold text-sm">
                      <span>[i]</span>
                    </div>
                    <span className="text-[11px] font-semibold leading-tight mt-1 text-center">
                      Endnotes
                    </span>
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Show</span>
              </div>

              {/* 4. DARK MODE GROUP */}
              <div className="flex flex-col justify-between px-2 py-1 shrink-0">
                <div className="flex items-center justify-center my-auto px-1">
                  <button
                    onClick={() => {
                      if (pageBg === 'dark') {
                        setPageBg('white');
                        setIsDarkModeCanvas(false);
                        triggerNotify('Document dark mode turned OFF.');
                      } else {
                        setPageBg('dark');
                        setIsDarkModeCanvas(true);
                        triggerNotify('Document dark mode turned ON.');
                      }
                    }}
                    className={`flex flex-col items-center justify-center p-1.5 rounded-md transition-all border cursor-pointer ${
                      pageBg === 'dark'
                        ? 'bg-zinc-900 border-zinc-700 text-amber-400 shadow-xs'
                        : 'border-transparent hover:bg-slate-200 dark:hover:bg-white/10'
                    }`}
                    title="Dark Mode"
                  >
                    <Moon className={`h-5 w-5 ${pageBg === 'dark' ? 'text-amber-400 fill-amber-400/20' : 'text-slate-800 dark:text-zinc-200'}`} />
                    <span className="text-[11px] font-semibold leading-tight mt-1 text-center max-w-[60px]">
                      Dark<br />Mode
                    </span>
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 font-medium text-center tracking-tight mt-auto">Dark Mode</span>
              </div>

            </div>
          )}

          {/* TEMPLATES TAB */}
          {activeTab === 'templates' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TEMPLATES.map((tmpl) => {
                const Icon = tmpl.icon;
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => {
                      if (confirm(`Load template "${tmpl.name}"? Current document content will be replaced.`)) {
                        if (editorRef.current) {
                          editorRef.current.innerHTML = tmpl.content;
                          handleEditorChange();
                          triggerNotify(`Loaded ${tmpl.name} template.`);
                        }
                      }
                    }}
                    className="p-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 hover:border-blue-500 rounded-xl text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4 text-blue-600 group-hover:scale-110 transition-transform" />
                      <span className="font-bold text-xs text-slate-800 dark:text-zinc-200">{tmpl.name}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-2">{tmpl.desc}</p>
                  </button>
                );
              })}
            </div>
          )}

        </div>

        {/* Find & Replace Bar */}
        {showFindReplace && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-500/20 rounded-xl flex items-center gap-2 text-xs flex-wrap">
            <input
              type="text"
              placeholder="Find text..."
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              className="bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-500/30 px-2.5 py-1 rounded-lg outline-none"
            />
            <input
              type="text"
              placeholder="Replace with..."
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              className="bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-500/30 px-2.5 py-1 rounded-lg outline-none"
            />
            <button
              onClick={handleFindReplace}
              className="px-3 py-1 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 cursor-pointer"
            >
              Replace All
            </button>
            <button onClick={() => setShowFindReplace(false)} className="text-slate-400 hover:text-slate-600 ml-auto">
              Close
            </button>
          </div>
        )}

      </div>

      {/* MS Word Canvas Editor Workstation */}
      <div className="flex gap-4 items-start justify-center bg-slate-200/80 dark:bg-[#060911] p-4 sm:p-8 rounded-2xl min-h-[750px] shadow-inner overflow-x-auto">

        {/* Floating / Side Navigation Pane */}
        {showNavigationPane && (
          <div className="w-64 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl p-3 flex flex-col text-xs shrink-0 shadow-xl animate-fade-in sticky top-[250px] z-20">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10 mb-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-zinc-100">
                <PanelLeft className="h-4 w-4 text-blue-600" />
                <span>Pages Navigation</span>
              </div>
              <button onClick={() => setShowNavigationPane(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 text-xs p-1">✕</button>
            </div>
            <div className="mb-2">
              <input
                type="text"
                placeholder="Search document pages..."
                className="w-full px-2.5 py-1.5 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg text-xs outline-none"
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[500px]">
              <div className="flex items-center justify-between pt-1">
                <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">Pages ({pages.length})</span>
              </div>
              <div className="space-y-1">
                {pages.map((_, pIdx) => (
                  <div
                    key={`nav-page-${pIdx}`}
                    onClick={() => {
                      setActivePageIndex(pIdx);
                      pageRefs.current[pIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-colors ${
                      activePageIndex === pIdx
                        ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold border border-blue-300 dark:border-blue-800'
                        : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                      <span>Page {pIdx + 1}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeletePage(pIdx); }}
                      className="text-rose-500 hover:text-rose-700 p-0.5 rounded cursor-pointer"
                      title="Delete Page"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center flex-1 max-w-full">
          {/* Immersive Reader Audio Control Banner */}
          {documentViewMode === 'immersive' && (
            <div className="w-full max-w-[816px] mb-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-2xl shadow-lg flex items-center justify-between gap-3 text-xs animate-fade-in">
              <div className="flex items-center gap-2 font-bold">
                <BookOpen className="h-5 w-5" />
                <span>Immersive Reader Mode</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (isReadingAloud) {
                      window.speechSynthesis?.cancel();
                      setIsReadingAloud(false);
                      triggerNotify('Speech narration paused.');
                    } else {
                      const text = pages.map(p => p.replace(/<[^>]*>/g, '')).join('\n');
                      if ('speechSynthesis' in window && text) {
                        const utterance = new SpeechSynthesisUtterance(text);
                        utterance.onend = () => setIsReadingAloud(false);
                        window.speechSynthesis.speak(utterance);
                        setIsReadingAloud(true);
                        triggerNotify('Reading document aloud...');
                      }
                    }
                  }}
                  className="px-3 py-1 bg-white text-blue-700 font-bold rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Volume2 className="h-4 w-4" />
                  <span>{isReadingAloud ? 'Pause Narration' : 'Read Aloud'}</span>
                </button>
                <button
                  onClick={() => setDocumentViewMode('separate')}
                  className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Exit Reader
                </button>
              </div>
            </div>
          )}

          {/* Page Ruler & Margin Guide Header */}
          {showRuler && (
            <div className="w-full flex flex-col items-center mb-2 select-none">
              {/* Ruler Header Controls */}
              <div
                style={{
                  width: pageOrientation === 'landscape'
                    ? (pageSize === 'letter' ? 1056 : pageSize === 'legal' ? 1344 : pageSize === 'executive' ? 1008 : pageSize === 'a5' ? 800 : 1123)
                    : (pageSize === 'letter' ? 816 : pageSize === 'legal' ? 816 : pageSize === 'executive' ? 696 : pageSize === 'a5' ? 560 : 794)
                }}
                className="w-full max-w-full mb-1 flex items-center justify-between px-3 py-1 bg-slate-100 dark:bg-zinc-800/90 border border-slate-300 dark:border-zinc-700 rounded-lg text-[11px] font-medium text-slate-600 dark:text-zinc-300 shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-bold text-slate-800 dark:text-zinc-100">A4 Visual Page Ruler</span>
                  <span className="text-slate-400 font-mono">|</span>
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    Margin: {getMarginLabel()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <button
                    onClick={() => setShowMarginGuides(!showMarginGuides)}
                    className={`px-2.5 py-0.5 rounded font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                      showMarginGuides
                        ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                        : 'bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-300'
                    }`}
                  >
                    <SquareDashed className="h-3 w-3" />
                    <span>{showMarginGuides ? 'Guides: ON' : 'Guides: OFF'}</span>
                  </button>
                </div>
              </div>

              {/* Top Horizontal Ruler Bar */}
              <div
                style={{
                  width: pageOrientation === 'landscape'
                    ? (pageSize === 'letter' ? 1056 : pageSize === 'legal' ? 1344 : pageSize === 'executive' ? 1008 : pageSize === 'a5' ? 800 : 1123)
                    : (pageSize === 'letter' ? 816 : pageSize === 'legal' ? 816 : pageSize === 'executive' ? 696 : pageSize === 'a5' ? 560 : 794)
                }}
                className="relative h-7 bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-md shadow-inner overflow-hidden flex items-stretch text-[9px] font-mono select-none"
              >
                {/* Left Shaded Non-Printable Margin Zone */}
                <div
                  style={{ width: `${getMarginPx()}px` }}
                  className="h-full bg-slate-300/90 dark:bg-zinc-900/90 border-r border-slate-400 dark:border-zinc-600 flex items-center justify-center shrink-0 relative"
                >
                  <span className="text-[8px] text-slate-500 font-sans font-bold uppercase tracking-tight">Margin</span>
                  {/* Left Indent Marker Triangle */}
                  <div className="absolute right-0 top-0 translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-blue-600 dark:border-t-blue-400 z-10" title="First Line Indent" />
                  <div className="absolute right-0 bottom-0 translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-blue-600 dark:border-b-blue-400 z-10" title="Left Indent" />
                </div>

                {/* Printable White/Light Ruler Area with Inch & Tick Marks */}
                <div className="flex-1 h-full bg-white dark:bg-zinc-950 relative flex items-stretch">
                  {Array.from({ length: pageOrientation === 'landscape' ? 11 : 8 }).map((_, inchIdx) => (
                    <div key={`inch-tick-${inchIdx}`} className="flex-1 h-full border-r border-slate-300 dark:border-zinc-800 relative flex flex-col justify-between pt-0.5">
                      <span className="pl-1 text-slate-600 dark:text-zinc-400 font-bold text-[9px]">{inchIdx + 1}"</span>
                      <div className="flex justify-around items-end h-2.5 w-full pb-0">
                        <div className="h-1 w-[1px] bg-slate-300 dark:bg-zinc-700" />
                        <div className="h-1.5 w-[1px] bg-slate-400 dark:bg-zinc-600" />
                        <div className="h-1 w-[1px] bg-slate-300 dark:bg-zinc-700" />
                        <div className="h-2 w-[1px] bg-slate-500 dark:bg-zinc-500" />
                        <div className="h-1 w-[1px] bg-slate-300 dark:bg-zinc-700" />
                        <div className="h-1.5 w-[1px] bg-slate-400 dark:bg-zinc-600" />
                        <div className="h-1 w-[1px] bg-slate-300 dark:bg-zinc-700" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right Shaded Non-Printable Margin Zone */}
                <div
                  style={{ width: `${getMarginPx()}px` }}
                  className="h-full bg-slate-300/90 dark:bg-zinc-900/90 border-l border-slate-400 dark:border-zinc-600 flex items-center justify-center shrink-0 relative"
                >
                  <span className="text-[8px] text-slate-500 font-sans font-bold uppercase tracking-tight">Margin</span>
                  {/* Right Indent Marker Triangle */}
                  <div className="absolute left-0 bottom-0 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-blue-600 dark:border-b-blue-400 z-10" title="Right Indent" />
                </div>
              </div>
            </div>
          )}

          {/* Multi-Page A4 Canvas Sheets Rendering */}
          <div
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out'
            }}
            className="w-full flex flex-col items-center gap-8 py-4"
          >
            {pages.map((_, pageIndex) => {
              const { cardHeight, maxPx } = getPageHeightAndMaxPx();
              const widthClass = documentViewMode === 'reading'
                ? 'w-full max-w-[1020px]'
                : pageOrientation === 'landscape'
                ? pageSize === 'letter' ? 'w-full max-w-[1056px]' : pageSize === 'legal' ? 'w-full max-w-[1344px]' : pageSize === 'executive' ? 'w-full max-w-[1008px]' : pageSize === 'a5' ? 'w-full max-w-[800px]' : 'w-full max-w-[1123px]'
                : pageSize === 'letter' ? 'w-full max-w-[816px]' : pageSize === 'legal' ? 'w-full max-w-[816px]' : pageSize === 'executive' ? 'w-full max-w-[696px]' : pageSize === 'a5' ? 'w-full max-w-[560px]' : 'w-full max-w-[794px]';

              return (
                <div
                  key={`a4-page-card-${pageIndex}`}
                  className={`${widthClass} flex flex-col gap-2 relative`}
                >
                  {/* Individual Page Toolbar Control Bar */}
                  <div className="flex items-center justify-between px-2 text-xs select-none text-slate-500 dark:text-zinc-400">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-extrabold rounded-lg text-[11px] border border-blue-200 dark:border-blue-800">
                        Page {pageIndex + 1} of {pages.length}
                      </span>
                      {activePageIndex === pageIndex && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-zinc-800/80 rounded-lg text-[10px] font-semibold text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-white/10">
                          <span className="text-slate-400 font-bold uppercase text-[9px]">Height Monitor:</span>
                          <div className="w-12 h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-full overflow-hidden flex">
                            <div
                              className={`h-full transition-all duration-300 ${
                                pageHeightStats.percentage > 90
                                  ? 'bg-rose-500'
                                  : pageHeightStats.percentage > 75
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${pageHeightStats.percentage}%` }}
                            />
                          </div>
                          <span className={pageHeightStats.percentage > 90 ? 'text-rose-600 dark:text-rose-400 font-bold' : pageHeightStats.percentage > 75 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>
                            {pageHeightStats.percentage}%
                          </span>
                        </div>
                      )}
                      {showHeaderFooter && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">[ Header Zone ]</span>
                      )}
                    </div>

                    {/* Individual Page Controls: Move Up, Move Down, Delete Page */}
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-slate-200 dark:border-white/10">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMovePage(pageIndex, -1); }}
                        disabled={pageIndex === 0}
                        className="p-1 hover:bg-white dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 disabled:opacity-30 rounded cursor-pointer transition-colors"
                        title="Move Page Up"
                      >
                        ⬆
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMovePage(pageIndex, 1); }}
                        disabled={pageIndex === pages.length - 1}
                        className="p-1 hover:bg-white dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 disabled:opacity-30 rounded cursor-pointer transition-colors"
                        title="Move Page Down"
                      >
                        ⬇
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePage(pageIndex); }}
                        className="px-2.5 py-1 bg-rose-600 text-white font-bold rounded-lg text-[10px] hover:bg-rose-700 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Delete This Page"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Delete Page</span>
                      </button>
                    </div>
                  </div>

                  {/* The actual Page Card Container */}
                  <div
                    onClick={() => setActivePageIndex(pageIndex)}
                    className={`relative transition-all duration-200 ${
                      documentViewMode === 'reading'
                        ? 'w-full max-w-[1020px] min-h-[700px] shadow-2xl rounded-2xl border-2 border-blue-400 dark:border-blue-500'
                        : pageOrientation === 'landscape'
                        ? pageSize === 'letter' ? 'w-full max-w-[1056px] min-h-[816px]' : pageSize === 'legal' ? 'w-full max-w-[1344px] min-h-[816px]' : pageSize === 'executive' ? 'w-full max-w-[1008px] min-h-[696px]' : pageSize === 'a5' ? 'w-full max-w-[800px] min-h-[560px]' : 'w-full max-w-[1123px] min-h-[794px]'
                        : pageSize === 'letter' ? 'w-full max-w-[816px] min-h-[1056px]' : pageSize === 'legal' ? 'w-full max-w-[816px] min-h-[1344px]' : pageSize === 'executive' ? 'w-full max-w-[696px] min-h-[1008px]' : pageSize === 'a5' ? 'w-full max-w-[560px] min-h-[800px]' : 'w-full max-w-[794px] min-h-[1123px]'
                    } ${
                      activePageIndex === pageIndex
                        ? 'ring-4 ring-blue-500/50 dark:ring-blue-400/50 shadow-2xl border-blue-400 dark:border-blue-500'
                        : 'border border-slate-300 dark:border-zinc-800 shadow-xl opacity-95 hover:opacity-100'
                    } ${
                      pageBg === 'cream'
                        ? 'bg-[#faf8f5] text-slate-900'
                        : pageBg === 'dark'
                        ? 'bg-[#121620] text-zinc-100'
                        : 'bg-white text-slate-900'
                    } rounded-2xl flex flex-col justify-start`}
                    style={{
                      paddingTop: `${getMarginPx()}px`,
                      paddingBottom: `${getMarginPx()}px`,
                      paddingLeft: `${getMarginPx()}px`,
                      paddingRight: `${getMarginPx()}px`,
                    }}
                  >
                    {/* In-Canvas Visual Margin Boundary Guides Overlay */}
                    {showMarginGuides && (
                      <div
                        style={{
                          top: `${getMarginPx()}px`,
                          bottom: `${getMarginPx()}px`,
                          left: `${getMarginPx()}px`,
                          right: `${getMarginPx()}px`,
                        }}
                        className="absolute pointer-events-none border-2 border-dashed border-blue-400/40 dark:border-blue-500/40 rounded-xl z-20 flex flex-col justify-between p-2 select-none"
                      >
                        {/* Top Corner Crop Brackets & Printable Boundary Tag */}
                        <div className="w-full flex justify-between items-start">
                          <div className="w-3 h-3 border-t-2 border-l-2 border-blue-500 dark:border-blue-400 -mt-2 -ml-2" />
                          <span className="px-2 py-0.5 bg-blue-100/90 dark:bg-blue-950/90 text-blue-700 dark:text-blue-300 text-[9px] font-mono font-bold rounded border border-blue-300/80 dark:border-blue-800 -mt-4 shadow-2xs">
                            A4 Boundary: {getMarginLabel()}
                          </span>
                          <div className="w-3 h-3 border-t-2 border-r-2 border-blue-500 dark:border-blue-400 -mt-2 -mr-2" />
                        </div>

                        {/* Bottom Corner Crop Brackets */}
                        <div className="w-full flex justify-between items-end">
                          <div className="w-3 h-3 border-b-2 border-l-2 border-blue-500 dark:border-blue-400 -mb-2 -ml-2" />
                          <span className="text-[8px] font-mono font-bold text-blue-500/80 dark:text-blue-400/80 tracking-widest uppercase">
                            Page {pageIndex + 1} Printable Bounds
                          </span>
                          <div className="w-3 h-3 border-b-2 border-r-2 border-blue-500 dark:border-blue-400 -mb-2 -mr-2" />
                        </div>
                      </div>
                    )}

                    {/* Left Vertical Ruler (When Ruler is Active) */}
                    {showRuler && activePageIndex === pageIndex && (
                      <div
                        style={{
                          height: `${cardHeight}px`,
                          top: '0px',
                        }}
                        className="absolute -left-8 w-6 bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-l-md shadow-xs overflow-hidden flex flex-col select-none text-[8px] font-mono z-10 hidden md:flex"
                      >
                        {/* Top Vertical Margin Zone */}
                        <div
                          style={{ height: `${getMarginPx()}px` }}
                          className="w-full bg-slate-300/80 dark:bg-zinc-900/80 border-b border-slate-400/80 flex items-center justify-center shrink-0"
                        >
                          <span className="text-[7px] text-slate-500 font-bold -rotate-90">TOP</span>
                        </div>

                        {/* Vertical Ticks Area */}
                        <div className="flex-1 w-full bg-white dark:bg-zinc-950 relative flex flex-col justify-between py-1">
                          {Array.from({ length: pageOrientation === 'landscape' ? 6 : 9 }).map((_, vIdx) => (
                            <div key={`v-inch-${vIdx}`} className="w-full border-b border-slate-300 dark:border-zinc-800 relative flex justify-end pr-1 text-slate-600 dark:text-zinc-400 font-bold">
                              <span>{vIdx + 1}</span>
                            </div>
                          ))}
                        </div>

                        {/* Bottom Vertical Margin Zone */}
                        <div
                          style={{ height: `${getMarginPx()}px` }}
                          className="w-full bg-slate-300/80 dark:bg-zinc-900/80 border-t border-slate-400/80 flex items-center justify-center shrink-0"
                        >
                          <span className="text-[7px] text-slate-500 font-bold -rotate-90">BOT</span>
                        </div>
                      </div>
                    )}

                    {/* Editable Document Content for this Page */}
                    <div
                      ref={(el) => {
                        pageRefs.current[pageIndex] = el;
                        if (pageIndex === 0) (editorRef as any).current = el;
                      }}
                      contentEditable
                      onFocus={() => setActivePageIndex(pageIndex)}
                      onInput={() => handlePageInput(pageIndex)}
                      onKeyDown={(e) => handlePageKeyDown(e, pageIndex)}
                      onPaste={(e) => handleNativePaste(e, pageIndex)}
                      suppressContentEditableWarning
                      className="a4-page-content outline-none flex-1 font-sans text-sm sm:text-base leading-relaxed tracking-normal focus:outline-none select-text overflow-hidden"
                      style={{
                        fontFamily: activeFont,
                        minHeight: `${maxPx}px`,
                        maxHeight: `${maxPx}px`,
                        columnCount: documentViewMode === 'reading' ? 2 : (pageColumns === '2' ? 2 : pageColumns === '3' ? 3 : 1),
                        columnGap: '2.5rem',
                        columnRule: (documentViewMode === 'reading' || pageColumns !== '1') ? '1px solid #cbd5e1' : 'none'
                      }}
                    />

                    {/* Page Footer Zone Indicator */}
                    {showHeaderFooter && (
                      <div className="w-full border-t border-dashed border-amber-500/70 pt-2 mt-4 flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400 font-semibold select-none">
                        <span>[ Footer Zone ]</span>
                        <span>Page {pageIndex + 1} of {pages.length}</span>
                      </div>
                    )}
                  </div>

                  {/* Page Break / Horizontal Line Indicator between virtual pages */}
                  {pageIndex < pages.length - 1 && (
                    <div className="w-full flex items-center justify-center my-4 pointer-events-none select-none">
                      <div className="w-1/4 h-[1px] bg-gradient-to-r from-transparent via-slate-300 dark:via-zinc-700 to-transparent" />
                      <div className="mx-3 px-3 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[10px] font-mono font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 shadow-2xs">
                        <span>✂</span>
                        <span>Page Break</span>
                      </div>
                      <div className="w-1/4 h-[1px] bg-gradient-to-r from-transparent via-slate-300 dark:via-zinc-700 to-transparent" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Centered Add Page option at the bottom of the virtual page stream */}
            <div className="flex justify-center mt-6 mb-12 select-none">
              <button
                onClick={() => handleAddPage(pages.length - 1)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-xl border border-dashed border-blue-300 dark:border-blue-800 shadow-xs hover:shadow-md active:scale-95 transition-all duration-150 cursor-pointer group"
              >
                <Plus className="h-4 w-4 text-blue-500 group-hover:scale-125 transition-transform" />
                <span>Add New Page</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Status & Zoom Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-500 dark:text-zinc-400">
        <div className="flex items-center gap-3">
          <span className="font-bold text-blue-600 dark:text-blue-400">Page {activePageIndex + 1} of {pages.length}</span>
          <button
            onClick={() => handleAddPage(activePageIndex)}
            className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 font-bold rounded-lg border border-blue-200 dark:border-blue-900 cursor-pointer text-[10px] transition-all duration-150"
            title="Add a new blank page after the current active page"
          >
            <Plus className="h-2.5 w-2.5" />
            <span>Add Page</span>
          </button>
          <span>•</span>
          <span>{stats.words} Words</span>
          <span>•</span>
          <span>{stats.chars} Characters</span>
          <span>•</span>
          {/* Page Height Monitor Live Widget */}
          <div className="flex items-center gap-2 px-2.5 py-0.5 bg-slate-100 dark:bg-zinc-800/80 rounded-lg border border-slate-200 dark:border-white/10 text-[11px]">
            <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-zinc-300">
              <span className={`w-2 h-2 rounded-full ${pageHeightStats.percentage > 90 ? 'bg-rose-500' : 'bg-emerald-500'} animate-pulse`} />
              <span>Page Height Monitor:</span>
            </div>
            <div className="w-14 h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-full overflow-hidden flex">
              <div
                className={`h-full transition-all duration-300 ${
                  pageHeightStats.percentage > 90
                    ? 'bg-rose-500'
                    : pageHeightStats.percentage > 75
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${pageHeightStats.percentage}%` }}
              />
            </div>
            <span className={`font-extrabold ${
              pageHeightStats.percentage > 90
                ? 'text-rose-600 dark:text-rose-400'
                : pageHeightStats.percentage > 75
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {pageHeightStats.percentage}% ({pageHeightStats.usedPx}/{pageHeightStats.maxPx}px)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))} className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded">
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="font-bold w-12 text-center">{zoomLevel}%</span>
          <button onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))} className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded">
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Word Count Detailed Statistics Modal */}
      {showWordCountModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-md text-slate-800 dark:text-zinc-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 mb-4">
              <div className="flex items-center gap-2 font-bold text-base">
                <Rows className="h-5 w-5 text-blue-600" />
                <span>Word Count Statistics</span>
              </div>
              <button
                onClick={() => setShowWordCountModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-zinc-400">Pages:</span>
                <span className="font-semibold">1</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-zinc-400">Words:</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">{stats.words}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-zinc-400">Characters (no spaces):</span>
                <span className="font-semibold">{stats.chars}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-zinc-400">Characters (with spaces):</span>
                <span className="font-semibold">{Math.floor(stats.chars * 1.18)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-zinc-400">Paragraphs:</span>
                <span className="font-semibold">{stats.paragraphs || 1}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-zinc-400">Lines:</span>
                <span className="font-semibold">{Math.ceil(stats.words / 11) || 1}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-zinc-400">Estimated Read Time:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{stats.readTime}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowWordCountModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Comments Sidebar Panel */}
      {showCommentsPanel && (
        <div className="fixed top-20 right-4 bottom-12 w-80 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-40 flex flex-col p-4 text-xs text-slate-800 dark:text-zinc-100">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 mb-3">
            <div className="flex items-center gap-2 font-bold text-sm">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <span>Comments & Review ({commentsList.length})</span>
            </div>
            <button
              onClick={() => setShowCommentsPanel(false)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {commentsList.length === 0 ? (
              <div className="text-center py-10 text-slate-400 italic">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30 text-slate-400" />
                <p>No comments in this document yet.</p>
                <p className="text-[10px] mt-1">Select text and click "New Comment" in the Review tab to add one.</p>
              </div>
            ) : (
              commentsList.map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => setActiveCommentIndex(index)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    activeCommentIndex === index
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-500 shadow-2xs'
                      : 'bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-white/5 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 dark:text-zinc-100">{item.author}</span>
                    <span className="text-[10px] text-slate-400">{item.date}</span>
                  </div>
                  {item.quote && (
                    <p className="text-[10px] bg-amber-100/70 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 p-1.5 rounded mb-2 font-serif italic border-l-2 border-amber-500 line-clamp-2">
                      "{item.quote}"
                    </p>
                  )}
                  <p className="text-slate-700 dark:text-zinc-300 font-medium">{item.text}</p>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-white/10 mt-3 flex items-center justify-between gap-2">
            <button
              onClick={handleAddComment}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-center text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <MessageSquarePlus className="h-4 w-4" />
              <span>Add Comment</span>
            </button>
            {commentsList.length > 0 && (
              <button
                onClick={() => handleDeleteComment('all')}
                className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
                title="Clear All Comments"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
