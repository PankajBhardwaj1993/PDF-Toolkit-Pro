import fontkit from '@pdf-lib/fontkit';
import React, { useState, useRef, useEffect } from 'react';
import { 
  ZoomIn, ZoomOut, RotateCcw, Download, Sparkles, Upload, X, HelpCircle, 
  Edit3, Loader2, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Save,
  Bold, Italic, Trash2, Check, CaseSensitive, Palette, Plus, Minus, Undo, Type, FilePlus,
  Pencil, MoveRight, Square, Circle as CircleIcon, MessageSquareText, Hexagon, Cloud,
  Spline, Stamp, Highlighter, Eraser, ChevronDown, ChevronUp, ArrowUpDown, MousePointer, Layers,
  Feather, Image as ImageIcon, Grid, Calendar, EyeOff, Pin, FileText, SquarePen, SquareDashed,
  AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

export type AnnotationToolType = 
  | 'select'
  | 'draw'
  | 'line'
  | 'arrow'
  | 'rectangle'
  | 'circle'
  | 'callout'
  | 'polygon'
  | 'cloud'
  | 'connected_lines'
  | 'stamp'
  | 'highlight'
  | 'erase'
  | 'check'
  | 'cross'
  | 'table'
  | 'text_box'
  | 'date'
  | 'blackout'
  | 'whiteout'
  | 'sticky'
  | 'image'
  | 'signature'
  | 'watermark';

export interface PdfAnnotation {
  id: string;
  page: number;
  type: AnnotationToolType;
  points: { x: number; y: number }[]; // coordinates in percentage 0..100
  color: string;
  strokeWidth: number;
  text?: string;
  stampType?: string;
  imageUrl?: string;
  tableData?: string[][];
  colWidths?: number[];
  rowHeights?: number[];
  fontSize?: number;
  opacity?: number;
  angle?: number;
}

interface ParsedTextBlock {
  id: string;
  page: number;
  text: string;
  originalText: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize: number;
  fontFamily: string;
  fontName: string;
  color: string;
  isEdited: boolean;
  transform: number[];
  pdfX: number;
  pdfY: number;
  pdfW: number;
  pdfH: number;
  initialPdfW?: number;
  pageWidth?: number;
  pageHeight?: number;
  bold?: boolean;
  italic?: boolean;
  isNew?: boolean;
  align?: 'left' | 'center' | 'right';
  autoHeight?: boolean;
}

function hexToRgb(hexStr: string = '#000000'): { r: number, g: number, b: number } {
  if (!hexStr) return { r: 0, g: 0, b: 0 };
  let hex = hexStr.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (hex.length === 6) {
    let r = parseInt(hex.substring(0, 2), 16) / 255;
    let g = parseInt(hex.substring(2, 4), 16) / 255;
    let b = parseInt(hex.substring(4, 6), 16) / 255;
    if (r < 0.45 && g < 0.45 && b < 0.45) {
      return { r: 0, g: 0, b: 0 };
    }
    return { r, g, b };
  }
  return { r: 0, g: 0, b: 0 };
}

export function sanitizeForWinAnsi(text: string): string {
  if (!text) return '';
  const mapped = text
    .replace(/\u00A0/g, ' ')
    .replace(/\u200B/g, '')
    .replace(/[\u20B9₹]/g, 'Rs. ')
    .replace(/\u20A8/g, 'Rs. ')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\u2018-\u201B]/g, "'")
    .replace(/[\u201C-\u201F]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/[\u2022\u25cf\u25cb\u25a0\u25a1]/g, '*')
    .replace(/\u2122/g, 'TM')
    .replace(/\u00A9/g, '(C)')
    .replace(/\u00AE/g, '(R)');

  const winAnsiAllowed = new Set([
    9, 10, 13,
    0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6,
    0x2030, 0x0160, 0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c,
    0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a,
    0x0153, 0x017e, 0x0178
  ]);

  return mapped
    .split('')
    .map(char => {
      const code = char.charCodeAt(0);
      if ((code >= 32 && code <= 126) || (code >= 160 && code <= 255) || winAnsiAllowed.has(code)) {
        return char;
      }
      return '';
    })
    .join('');
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

function wrapTextForPdf(text: string, maxWidth: number, fontSize: number, font: any): string[] {
  if (!text) return [''];
  const paragraphs = text.split('\n');
  const wrappedLines: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph === '') {
      wrappedLines.push('');
      continue;
    }

    const tokens = paragraph.split(/(\s+)/);
    let currentLine = '';

    for (const token of tokens) {
      if (!token) continue;

      const testLine = currentLine + token;
      let testWidth = 0;
      try {
        testWidth = font.widthOfTextAtSize(testLine, fontSize);
      } catch (err) {
        testWidth = testLine.length * fontSize * 0.6;
      }

      if (testWidth > maxWidth) {
        if (currentLine !== '') {
          wrappedLines.push(currentLine);
          currentLine = '';
        }

        let tokenWidth = 0;
        try {
          tokenWidth = font.widthOfTextAtSize(token, fontSize);
        } catch (err) {
          tokenWidth = token.length * fontSize * 0.6;
        }

        if (tokenWidth > maxWidth && token.trim() !== '') {
          let subLine = '';
          for (const char of token) {
            const testSub = subLine + char;
            let testSubWidth = 0;
            try {
              testSubWidth = font.widthOfTextAtSize(testSub, fontSize);
            } catch (e) {
              testSubWidth = testSub.length * fontSize * 0.6;
            }

            if (testSubWidth > maxWidth && subLine !== '') {
              wrappedLines.push(subLine);
              subLine = char;
            } else {
              subLine = testSub;
            }
          }
          currentLine = subLine;
        } else {
          if (token.trim() !== '' || currentLine !== '') {
            currentLine = token;
          }
        }
      } else {
        currentLine = testLine;
      }
    }
    wrappedLines.push(currentLine);
  }

  return wrappedLines;
}

export interface DetectedFontStyles {
  fontSize: number;
  fontFamily: string;
  fontName: string;
  bold: boolean;
  italic: boolean;
}

export function detectFontFamilyAndSize(item: any, style: any = {}): DetectedFontStyles {
  let fontSize = 0;
  if (item && typeof item.height === 'number' && item.height > 0) {
    fontSize = Math.round(item.height * 100) / 100;
  } else if (item && item.transform && Array.isArray(item.transform) && item.transform.length >= 4) {
    const skewX = item.transform[2] || 0;
    const scaleY = item.transform[3] || 0;
    const scaleX = item.transform[0] || 0;
    const skewY = item.transform[1] || 0;
    
    const computedSize = Math.hypot(scaleX, skewY) || Math.hypot(skewX, scaleY) || Math.abs(scaleY) || Math.abs(scaleX);
    if (computedSize > 0) {
      fontSize = Math.round(computedSize * 100) / 100;
    }
  }
  if (!fontSize || isNaN(fontSize) || fontSize <= 0) {
    fontSize = 9;
  }

  const rawFontName = (item?.fontName || '').trim();
  const rawStyleFamily = (style?.fontFamily || '').trim();
  
  const cleanFontName = rawFontName.includes('+') ? rawFontName.split('+')[1] : rawFontName;
  const combinedFontStr = `${cleanFontName} ${rawStyleFamily}`.trim();
  const fontLower = combinedFontStr.toLowerCase();

  const bold = /bold|black|heavy|bd|-b\b|_b\b|medium|semibold|demi|700|800|900/i.test(fontLower);
  const italic = /italic|oblique|slanted|it\b|-i\b|_i\b/i.test(fontLower);

  let fontFamily = 'Helvetica, Arial, sans-serif';

  const isSerif = fontLower.includes('times') || 
                  (fontLower.includes('serif') && !fontLower.includes('sans-serif') && !fontLower.includes('sansserif')) || 
                  fontLower.includes('georgia') || 
                  fontLower.includes('cambria') || 
                  fontLower.includes('garamond') || 
                  fontLower.includes('palatino');

  if (isSerif) {
    fontFamily = '"Times New Roman", Times, Georgia, serif';
  } else if (fontLower.includes('courier') || fontLower.includes('mono') || fontLower.includes('code') || fontLower.includes('consolas') || fontLower.includes('menlo')) {
    fontFamily = '"Courier New", Courier, monospace';
  } else if (fontLower.includes('calibri')) {
    fontFamily = 'Calibri, "Segoe UI", sans-serif';
  } else if (fontLower.includes('arial')) {
    fontFamily = 'Arial, Helvetica, sans-serif';
  } else if (fontLower.includes('verdana')) {
    fontFamily = 'Verdana, Geneva, sans-serif';
  } else if (fontLower.includes('tahoma')) {
    fontFamily = 'Tahoma, Geneva, sans-serif';
  } else if (fontLower.includes('trebuchet')) {
    fontFamily = '"Trebuchet MS", sans-serif';
  } else if (fontLower.includes('helvetica')) {
    fontFamily = 'Helvetica, Arial, sans-serif';
  } else if (cleanFontName) {
    const baseName = cleanFontName.replace(/-(Bold|Italic|BoldItalic|Regular|Medium|Light|MT|PSMT)$/i, '').trim();
    if (baseName && baseName.length > 2) {
      fontFamily = `"${baseName}", Helvetica, Arial, sans-serif`;
    }
  }

  return {
    fontSize,
    fontFamily,
    fontName: cleanFontName || rawFontName || 'Helvetica',
    bold,
    italic,
  };
}

const detectColorFromCanvas = (
  canvas: HTMLCanvasElement,
  x: number, // percentage
  y: number, // percentage
  w: number, // percentage
  h: number  // percentage
): string => {
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return '#000000';
    
    const imgX = Math.round((x / 100) * canvas.width);
    const imgY = Math.round((y / 100) * canvas.height);
    const imgW = Math.max(1, Math.round((w / 100) * canvas.width));
    const imgH = Math.max(1, Math.round((h / 100) * canvas.height));
    
    const imgData = ctx.getImageData(
      Math.max(0, Math.min(canvas.width - imgW, imgX)),
      Math.max(0, Math.min(canvas.height - imgH, imgY)),
      imgW,
      imgH
    );
    
    const data = imgData.data;
    if (!data || data.length === 0) return '#000000';
    
    let bgLightCount = 0;
    let bgDarkCount = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i+1];
      const b = data[i+2];
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      if (brightness > 127) bgLightCount++;
      else bgDarkCount++;
    }
    
    const isBackgroundLight = bgLightCount >= bgDarkCount;
    
    let count = 0;
    let sumR = 0, sumG = 0, sumB = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i+1];
      const b = data[i+2];
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      
      if (isBackgroundLight) {
        if (brightness < 180) {
          sumR += r;
          sumG += g;
          sumB += b;
          count++;
        }
      } else {
        if (brightness > 80) {
          sumR += r;
          sumG += g;
          sumB += b;
          count++;
        }
      }
    }
    
    if (count > 0) {
      const avgR = Math.round(sumR / count);
      const avgG = Math.round(sumG / count);
      const avgB = Math.round(sumB / count);
      if (avgR < 115 && avgG < 115 && avgB < 115) {
        return '#000000';
      }
      const hex = '#' + [avgR, avgG, avgB].map(v => {
        const h = v.toString(16);
        return h.length === 1 ? '0' + h : h;
      }).join('');
      return hex;
    }
    
    return isBackgroundLight ? '#000000' : '#ffffff';
  } catch (err) {
    return '#000000';
  }
};

interface OnlinePdfEditorProps {
  onAddRecentFile: (file: { name: string; size: string; type: string; toolUsed: string }) => void;
  user: any;
}

let cachedNotoSansRegular: ArrayBuffer | null = null;
let cachedNotoSansBold: ArrayBuffer | null = null;

function needsCustomUnicodeFont(text: string): boolean {
  if (!text) return false;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // 0x20B9 is ₹. Standard ASCII and WinAnsi characters are generally < 256.
    if (code === 0x20B9 || code === 8377 || code > 255) {
      return true;
    }
  }
  return false;
}

async function getAppropriateFont(
  pdfDoc: PDFDocument,
  fontFamily: string = 'Helvetica',
  isBold: boolean = false,
  isItalic: boolean = false,
  text: string = ''
) {
  // Only load the custom Noto Sans TTF font if the text actually contains ₹ or other unicode symbols
  if (needsCustomUnicodeFont(text)) {
    try {
      return await getCustomFont(pdfDoc, isBold);
    } catch (e) {
      console.warn("Failed to load custom unicode font, falling back to standard font", e);
    }
  }

  let stdFont: StandardFonts;
  const family = (fontFamily || 'Helvetica').toLowerCase();
  if (family.includes('times') || (family.includes('serif') && !family.includes('sans-serif') && !family.includes('sansserif'))) {
    if (isBold && isItalic) {
      stdFont = StandardFonts.TimesRomanBoldItalic;
    } else if (isBold) {
      stdFont = StandardFonts.TimesRomanBold;
    } else if (isItalic) {
      stdFont = StandardFonts.TimesRomanItalic;
    } else {
      stdFont = StandardFonts.TimesRoman;
    }
  } else if (family.includes('courier') || family.includes('mono') || family.includes('code')) {
    if (isBold && isItalic) {
      stdFont = StandardFonts.CourierBoldOblique;
    } else if (isBold) {
      stdFont = StandardFonts.CourierBold;
    } else if (isItalic) {
      stdFont = StandardFonts.CourierOblique;
    } else {
      stdFont = StandardFonts.Courier;
    }
  } else {
    if (isBold && isItalic) {
      stdFont = StandardFonts.HelveticaBoldOblique;
    } else if (isBold) {
      stdFont = StandardFonts.HelveticaBold;
    } else if (isItalic) {
      stdFont = StandardFonts.HelveticaOblique;
    } else {
      stdFont = StandardFonts.Helvetica;
    }
  }

  return await pdfDoc.embedFont(stdFont);
}

async function getCustomFont(pdfDoc: PDFDocument, isBold: boolean) {
  try {
    const fk = (fontkit as any).default || fontkit;
    try {
      pdfDoc.registerFontkit(fk);
    } catch (regErr) {
      // Ignore already registered error
    }
    let bytes = isBold ? cachedNotoSansBold : cachedNotoSansRegular;
    if (!bytes) {
      const url = isBold ? '/fonts/NotoSans-Bold.ttf' : '/fonts/NotoSans-Regular.ttf';
      try {
        const res = await fetch(url);
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (!contentType.includes('text/html')) {
            const buf = await res.arrayBuffer();
            const firstByte = new Uint8Array(buf)[0];
            // Valid TTF file shouldn't start with '<' (0x3C)
            if (firstByte !== 0x3C) {
              bytes = buf;
            }
          }
        }
      } catch (fetchErr) {
        console.warn("Failed fetching local Noto Sans font:", fetchErr);
      }

      // Google Fonts CDN fallback (Noto Sans supports Unicode and Devanagari/Rupee natively)
      if (!bytes) {
        console.log("Fetching custom unicode font from Google Fonts CDN for Rupee/unicode support...");
        const cdnUrl = isBold 
          ? 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf'
          : 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf';
        try {
          const res = await fetch(cdnUrl);
          if (res.ok) {
            bytes = await res.arrayBuffer();
          }
        } catch (cdnErr) {
          console.warn("Failed fetching from Google Fonts CDN:", cdnErr);
        }
      }

      if (bytes && bytes.byteLength > 0) {
        if (isBold) cachedNotoSansBold = bytes;
        else cachedNotoSansRegular = bytes;
      }
    }
    if (bytes && bytes.byteLength > 0) {
      return await pdfDoc.embedFont(new Uint8Array(bytes.slice(0)), { subset: true });
    }
  } catch (err) {
    console.warn("Failed embedding Noto Sans font, falling back to standard font:", err);
  }
  const stdFont = isBold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica;
  return await pdfDoc.embedFont(stdFont);
}

interface SinglePdfPageProps {
  key?: React.Key;
  pageNum: number;
  totalPages: number;
  pdfDoc: any;
  zoom: number;
  parsedBlocks: ParsedTextBlock[];
  editingBlock: ParsedTextBlock | null;
  newTextValue: string;
  isProcessing: boolean;
  activeTool: AnnotationToolType;
  strokeColor: string;
  strokeWidth: number;
  selectedStamp: string;
  pageAnnotations: PdfAnnotation[];
  onAddAnnotation: (ann: PdfAnnotation) => void;
  onUpdateAnnotation?: (id: string, ann: PdfAnnotation) => void;
  onDeleteAnnotation: (id: string) => void;
  onParsedBlocks: (page: number, blocks: ParsedTextBlock[]) => void;
  setEditingBlock: (block: ParsedTextBlock | null) => void;
  setNewTextValue: (val: string) => void;
  handleAddTextAt: (pctX: number, pctY: number, targetPageNum?: number) => void;
  handleApplyTextEdit: (options?: { customReplacementText?: string }) => void;
  handleDeletePage: (pageNum: number) => void;
  handleAddPage: (afterPageNum?: number) => void;
  handleMovePageUp?: (pageNum: number) => void;
  handleMovePageDown?: (pageNum: number) => void;
  setLastSelectedColor: (col: string) => void;
  tableConfig: { rows: number; cols: number };
  setActiveTool: (tool: AnnotationToolType) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  textareaResized: boolean;
  setTextareaResized: (val: boolean) => void;
}

function SinglePdfPage({
  pageNum,
  totalPages,
  pdfDoc,
  zoom,
  parsedBlocks,
  editingBlock,
  newTextValue,
  isProcessing,
  activeTool,
  strokeColor,
  strokeWidth,
  selectedStamp,
  pageAnnotations,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onParsedBlocks,
  setEditingBlock,
  setNewTextValue,
  handleAddTextAt,
  handleApplyTextEdit,
  handleDeletePage,
  handleAddPage,
  handleMovePageUp,
  handleMovePageDown,
  setLastSelectedColor,
  tableConfig,
  setActiveTool,
  currentPage,
  setCurrentPage,
  textareaResized,
  setTextareaResized
}: SinglePdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number>(595 / 842);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [resizingAnnId, setResizingAnnId] = useState<string | null>(null);
  const [resizeCorner, setResizeCorner] = useState<'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r' | null>(null);
  const [draggingAnnId, setDraggingAnnId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number, y: number } | null>(null);
  const [stickyModal, setStickyModal] = useState<{ x: number; y: number; pageNum: number; editingId?: string; initialText?: string } | null>(null);
  const [stickyTextValue, setStickyTextValue] = useState('');
  const [editingTableAnn, setEditingTableAnn] = useState<PdfAnnotation | null>(null);
  const [resizingColIndex, setResizingColIndex] = useState<{ annId: string; colIndex: number; initialColWidths: number[] } | null>(null);
  const [resizingRowIndex, setResizingRowIndex] = useState<{ annId: string; rowIndex: number; initialRowHeights: number[] } | null>(null);

  useEffect(() => {
    setTextareaResized(false);
  }, [editingBlock?.id]);

  useEffect(() => {
    if (!pdfDoc) return;

    let isCurrent = true;
    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        if (!isCurrent) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        const rawViewport = page.getViewport({ scale: 1.0 });
        const pageWidth = rawViewport.width;
        const pageHeight = rawViewport.height;
        setAspectRatio(pageWidth / pageHeight);

        const scale = (zoom / 100) * 1.5;
        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        
        await page.render(renderContext).promise;

        // Parse text content
        const textContent = await page.getTextContent();
        const styles = textContent.styles || {};
        const items = textContent.items.filter((item: any) => item.str !== undefined);
        
        const filteredItems: any[] = [];
        for (let i = items.length - 1; i >= 0; i--) {
          const item = items[i];
          const tx = item.transform ? item.transform[4] : 0;
          const ty = item.transform ? item.transform[5] : 0;
          
          const isDuplicate = filteredItems.some((existing: any) => {
            const exTx = existing.transform ? existing.transform[4] : 0;
            const exTy = existing.transform ? existing.transform[5] : 0;
            return Math.abs(exTx - tx) < 5 && Math.abs(exTy - ty) < 5;
          });
          
          if (!isDuplicate) {
            filteredItems.unshift(item);
          }
        }

        // Sort items by vertical position (descending) then horizontal position (ascending)
        filteredItems.sort((a, b) => {
          const tyA = a.transform ? a.transform[5] : 0;
          const tyB = b.transform ? b.transform[5] : 0;
          const tyDiff = tyB - tyA;
          if (Math.abs(tyDiff) > 3) return tyDiff;
          const txA = a.transform ? a.transform[4] : 0;
          const txB = b.transform ? b.transform[4] : 0;
          return txA - txB;
        });

        // Merge adjacent items on the same horizontal baseline
        const mergedItems: any[] = [];
        for (const item of filteredItems) {
          if (mergedItems.length === 0) {
            mergedItems.push({ ...item });
            continue;
          }
          const prev = mergedItems[mergedItems.length - 1];
          const prevTx = prev.transform ? prev.transform[4] : 0;
          const prevTy = prev.transform ? prev.transform[5] : 0;
          const itemTx = item.transform ? item.transform[4] : 0;
          const itemTy = item.transform ? item.transform[5] : 0;

          const sameLine = Math.abs(prevTy - itemTy) < 2;
          const prevRight = prevTx + (prev.width || 0);
          const gap = itemTx - prevRight;

          // Do NOT merge across spaces or gaps (table columns, cells, or separate words).
          // Only merge if gap is <= 1.5px and no space (tight character kerning of the SAME word fragment).
          const isTightKerning = gap >= -2 && gap <= 1.5 && !prev.str.endsWith(' ') && !item.str.startsWith(' ');

          if (sameLine && isTightKerning) {
            prev.str = prev.str + item.str;
            prev.width = (itemTx + (item.width || 0)) - prevTx;
          } else {
            mergedItems.push({ ...item });
          }
        }

        const blocks: ParsedTextBlock[] = mergedItems.map((item: any, idx: number) => {
          const transform = item.transform;
          const tx = transform[4];
          const ty = transform[5];
          
          const style = styles[item.fontName] || {};
          const detectedStyles = detectFontFamilyAndSize(item, style);
          const fontSize = detectedStyles.fontSize;

          const [vx, vy] = rawViewport.convertToViewportPoint(tx, ty);
          
          const percentX = (vx / pageWidth) * 100;
          const topY = vy - fontSize;
          const percentY = (topY / pageHeight) * 100;
          
          const percentW = (item.width / pageWidth) * 100;
          const percentH = (fontSize / pageHeight) * 100;

          return {
            id: `parsed-${pageNum}-${idx}`,
            page: pageNum,
            text: item.str,
            originalText: item.str,
            x: percentX,
            y: percentY,
            w: percentW > 0 ? percentW : 12,
            h: percentH > 0 ? percentH : 4,
            fontSize: detectedStyles.fontSize,
            fontFamily: detectedStyles.fontFamily,
            fontName: detectedStyles.fontName,
            color: '#000000',
            isEdited: false,
            transform,
            pdfX: tx,
            pdfY: ty,
            pdfW: item.width,
            initialPdfW: item.width,
            pdfH: fontSize,
            pageWidth,
            pageHeight,
            bold: detectedStyles.bold,
            italic: detectedStyles.italic
          };
        });

        if (isCurrent) {
          onParsedBlocks(pageNum, blocks);
        }
      } catch (err: any) {
        console.error("PDF Page rendering error: ", err);
      }
    };

    renderPage();

    return () => {
      isCurrent = false;
    };
  }, [pdfDoc, pageNum, zoom]);

  // Handle Drawing & Annotation Mouse Events
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement | SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (activeTool === 'select') return;

    if (activeTool === 'stamp') {
      onAddAnnotation({
        id: `ann-${pageNum}-${Date.now()}`,
        page: pageNum,
        type: 'stamp',
        points: [{ x, y }],
        color: strokeColor,
        strokeWidth,
        stampType: selectedStamp
      });
      return;
    }



    if (activeTool === 'check' || activeTool === 'cross' || activeTool === 'date' || activeTool === 'sticky' || activeTool === 'table' || activeTool === 'text_box') {
      let textVal = '';
      if (activeTool === 'check') textVal = '✓';
      if (activeTool === 'cross') textVal = '✕';
      if (activeTool === 'date') {
        const d = new Date();
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        textVal = `${dd}/${mm}/${yyyy}`;
      }
      if (activeTool === 'sticky') {
        setStickyModal({ x, y, pageNum, initialText: 'Note: ' });
        setStickyTextValue('Note: ');
        return;
      }
      
      if (activeTool === 'text_box') {
        handleAddTextAt(x, y, pageNum);
        return;
      }

      let tableData;
      if (activeTool === 'table') {
        tableData = Array.from({ length: tableConfig.rows }, (_, ri) =>
          Array.from({ length: tableConfig.cols }, (_, ci) =>
            ri === 0 ? `Header ${ci + 1}` : `Data ${ri},${ci + 1}`
          )
        );
      }

      onAddAnnotation({
        id: `ann-${pageNum}-${Date.now()}`,
        page: pageNum,
        type: activeTool,
        points: activeTool === 'table' 
          ? [{ x, y }, { x: Math.min(x + 45, 95), y: Math.min(y + 25, 95) }]
          : [{ x, y }, { x: x + 25, y: y + 15 }],
        color: activeTool === 'check' ? '#16a34a' : activeTool === 'cross' ? '#dc2626' : (activeTool === 'table' ? strokeColor || '#000000' : strokeColor),
        strokeWidth: activeTool === 'table' ? strokeWidth || 1.5 : strokeWidth,
        text: textVal,
        tableData,
        fontSize: 9
      });
      return;
    }

    setIsDrawing(true);
    if (activeTool === 'line' || activeTool === 'arrow' || activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'cloud' || activeTool === 'highlight' || activeTool === 'blackout' || activeTool === 'whiteout') {
      setCurrentPoints([{ x, y }, { x: x + 1, y: y + 1 }]);
    } else {
      setCurrentPoints([{ x, y }]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement | SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    if (activeTool === 'select') {
      if (resizingColIndex && dragStartPos && onUpdateAnnotation) {
        const ann = pageAnnotations.find(a => a.id === resizingColIndex.annId);
        if (ann) {
          const p1 = ann.points[1] || { x: ann.points[0].x + 35, y: ann.points[0].y + 20 };
          const tableW = Math.max(5, Math.abs(p1.x - ann.points[0].x));
          const dx = x - dragStartPos.x;
          const deltaRatio = (dx / tableW) * 100;

          const initial = resizingColIndex.initialColWidths;
          const ci = resizingColIndex.colIndex;
          const combinedW = initial[ci] + initial[ci + 1];

          const newW = Math.max(2, Math.min(combinedW - 2, initial[ci] + deltaRatio));
          const newWNext = combinedW - newW;

          const newColWidths = [...initial];
          newColWidths[ci] = newW;
          newColWidths[ci + 1] = newWNext;

          onUpdateAnnotation(ann.id, { ...ann, colWidths: newColWidths });
        }
        return;
      }

      if (resizingRowIndex && dragStartPos && onUpdateAnnotation) {
        const ann = pageAnnotations.find(a => a.id === resizingRowIndex.annId);
        if (ann) {
          const p1 = ann.points[1] || { x: ann.points[0].x + 35, y: ann.points[0].y + 20 };
          const tableH = Math.max(5, Math.abs(p1.y - ann.points[0].y));
          const dy = y - dragStartPos.y;
          const deltaRatio = (dy / tableH) * 100;

          const initial = resizingRowIndex.initialRowHeights;
          const ri = resizingRowIndex.rowIndex;
          const combinedH = initial[ri] + initial[ri + 1];

          const newH = Math.max(2, Math.min(combinedH - 2, initial[ri] + deltaRatio));
          const newHNext = combinedH - newH;

          const newRowHeights = [...initial];
          newRowHeights[ri] = newH;
          newRowHeights[ri + 1] = newHNext;

          onUpdateAnnotation(ann.id, { ...ann, rowHeights: newRowHeights });
        }
        return;
      }

      if (resizingAnnId && resizeCorner && onUpdateAnnotation) {
        const ann = pageAnnotations.find(a => a.id === resizingAnnId);
        if (ann) {
          const newPoints = [...ann.points];
          if (!newPoints[1]) newPoints[1] = { x: newPoints[0].x + 30, y: newPoints[0].y + 20 };
          
          let p0x = Math.min(newPoints[0].x, newPoints[1].x);
          let p0y = Math.min(newPoints[0].y, newPoints[1].y);
          let p1x = Math.max(newPoints[0].x, newPoints[1].x);
          let p1y = Math.max(newPoints[0].y, newPoints[1].y);

          if (resizeCorner === 'tl') { p0x = Math.min(x, p1x - 2); p0y = Math.min(y, p1y - 2); }
          else if (resizeCorner === 'tr') { p1x = Math.max(x, p0x + 2); p0y = Math.min(y, p1y - 2); }
          else if (resizeCorner === 'bl') { p0x = Math.min(x, p1x - 2); p1y = Math.max(y, p0y + 2); }
          else if (resizeCorner === 'br') { p1x = Math.max(x, p0x + 2); p1y = Math.max(y, p0y + 2); }
          else if (resizeCorner === 't') { p0y = Math.min(y, p1y - 2); }
          else if (resizeCorner === 'b') { p1y = Math.max(y, p0y + 2); }
          else if (resizeCorner === 'l') { p0x = Math.min(x, p1x - 2); }
          else if (resizeCorner === 'r') { p1x = Math.max(x, p0x + 2); }

          newPoints[0] = { x: p0x, y: p0y };
          newPoints[1] = { x: p1x, y: p1y };
          onUpdateAnnotation(resizingAnnId, { ...ann, points: newPoints });
        }
      } else if (draggingAnnId && dragStartPos && onUpdateAnnotation) {
        const ann = pageAnnotations.find(a => a.id === draggingAnnId);
        if (ann) {
          const dx = x - dragStartPos.x;
          const dy = y - dragStartPos.y;
          const newPoints = ann.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
          onUpdateAnnotation(draggingAnnId, { ...ann, points: newPoints });
          setDragStartPos({ x, y });
        }
      }
      return;
    }

    if (!isDrawing) return;

    if (activeTool === 'draw' || activeTool === 'erase' || activeTool === 'connected_lines') {
      setCurrentPoints(prev => [...prev, { x, y }]);
    } else {
      // Shapes keep start point and update end point
      setCurrentPoints(prev => [prev[0], { x, y }]);
    }
  };

  const handleMouseUp = () => {
    if (activeTool === 'select') {
      setResizingAnnId(null);
      setResizeCorner(null);
      setResizingColIndex(null);
      setResizingRowIndex(null);
      setDraggingAnnId(null);
      setDragStartPos(null);
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    let pts = [...currentPoints];
    if (pts.length >= 2) {
      const dx = Math.abs(pts[1].x - pts[0].x);
      const dy = Math.abs(pts[1].y - pts[0].y);
      if (dx < 0.5 && dy < 0.5) {
        pts[1] = { x: pts[0].x + 25, y: pts[0].y + 15 };
      }
    } else if (pts.length === 1) {
      if (activeTool === 'line' || activeTool === 'arrow' || activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'cloud' || activeTool === 'highlight' || activeTool === 'blackout' || activeTool === 'whiteout') {
        pts.push({ x: pts[0].x + 25, y: pts[0].y + 25 });
      } else {
        pts.push({ x: pts[0].x + 1, y: pts[0].y + 1 });
      }
    }

    onAddAnnotation({
      id: `ann-${pageNum}-${Date.now()}`,
      page: pageNum,
      type: activeTool,
      points: pts,
      color: activeTool === 'highlight' ? '#fde047' : activeTool === 'blackout' ? '#000000' : (activeTool === 'erase' || activeTool === 'whiteout') ? '#ffffff' : strokeColor,
      strokeWidth: activeTool === 'highlight' ? 12 : activeTool === 'erase' ? 24 : strokeWidth,
      text: activeTool === 'callout' ? 'Callout text' : undefined,
    });

    setCurrentPoints([]);
  };

  return (
    <div id={`pdf-page-${pageNum}`} className="flex flex-col items-center w-full my-4 animate-fade-in">
      {/* Page Card Header */}
      <div 
        className="flex items-center justify-between px-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-t-2xl text-xs font-semibold shadow-sm text-slate-700 dark:text-zinc-300"
        style={{ width: `${600 * (zoom / 100)}px`, maxWidth: '100%' }}
      >
        <div className="flex items-center gap-2">
          <span className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 px-2.5 py-1 rounded-lg font-mono font-bold text-[11px]">
            Page {pageNum} of {totalPages}
          </span>
          {pageAnnotations.length > 0 && (
            <span className="bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
              {pageAnnotations.length} Annotation{pageAnnotations.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Reorder Page Up / Down Buttons */}
          {totalPages > 1 && (
            <div className="flex items-center bg-slate-100 dark:bg-zinc-800 rounded-lg p-0.5 border border-slate-200 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => handleMovePageUp && handleMovePageUp(pageNum)}
                disabled={pageNum === 1 || isProcessing}
                className="p-1 hover:bg-white dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
                title="Move Page Up"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleMovePageDown && handleMovePageDown(pageNum)}
                disabled={pageNum === totalPages || isProcessing}
                className="p-1 hover:bg-white dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
                title="Move Page Down"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Add Blank Page Below */}
          <button
            type="button"
            onClick={() => handleAddPage && handleAddPage(pageNum)}
            disabled={isProcessing}
            className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-medium px-2 py-1 rounded-lg text-xs cursor-pointer transition-colors border border-slate-200/60 dark:border-zinc-700/60"
            title={`Insert blank page below Page ${pageNum}`}
          >
            <FilePlus className="h-3.5 w-3.5 text-blue-500" />
            <span>+ Page</span>
          </button>

          {/* Add Text Button */}
          <button
            type="button"
            onClick={() => {
              if (activeTool === 'text_box' && currentPage === pageNum) {
                setActiveTool('select');
              } else {
                setActiveTool('text_box');
                setCurrentPage(pageNum);
              }
            }}
            className={`inline-flex items-center gap-1 font-medium px-2.5 py-1 rounded-lg text-xs cursor-pointer transition-all shadow-sm ${
              activeTool === 'text_box' && currentPage === pageNum
                ? 'bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-400 scale-[1.02]'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
            title={`Click here, then click anywhere on Page ${pageNum} to add custom text`}
          >
            <Type className="h-3.5 w-3.5" />
            <span>{activeTool === 'text_box' && currentPage === pageNum ? 'Click Page to Add' : '+ Add Text'}</span>
          </button>

          {/* Delete Page Button */}
          <button
            type="button"
            onClick={() => handleDeletePage(pageNum)}
            disabled={isProcessing}
            className="inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/60 text-rose-600 font-medium px-2 py-1 rounded-lg text-xs cursor-pointer transition-colors border border-rose-200/60 dark:border-rose-900/40"
            title={totalPages === 1 ? 'Clear Page 1' : `Delete Page ${pageNum}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Main Page Paper Card */}
      <div 
        data-pdf-page={pageNum}
        className="relative bg-white dark:bg-zinc-900 shadow-2xl rounded-b-2xl border border-slate-300/40 dark:border-zinc-800/40 transition-all duration-300 select-none overflow-visible"
        style={{ 
          width: `${600 * (zoom / 100)}px`,
          aspectRatio: `${aspectRatio}`,
          maxWidth: '100%'
        }}
      >
        {/* PDF Canvas */}
        <canvas 
          ref={canvasRef} 
          className="w-full h-full block select-none pointer-events-none rounded-b-2xl"
        />

        {/* SVG Drawing & Annotations Overlay Layer */}
        <svg 
          className={`absolute inset-0 w-full h-full ${activeTool !== 'select' || resizingAnnId !== null || draggingAnnId !== null ? 'cursor-crosshair z-30 pointer-events-auto' : 'pointer-events-none z-10'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Render saved annotations on this page */}
          {pageAnnotations.map((ann) => (
            <g key={ann.id} className="group cursor-pointer">
              {(ann.type === 'draw' || ann.type === 'erase') && ann.points.length >= 2 && (
                <g>
                  {ann.points.slice(0, -1).map((p, i) => {
                    const nextP = ann.points[i + 1];
                    return (
                      <line
                        key={i}
                        x1={`${p.x}%`}
                        y1={`${p.y}%`}
                        x2={`${nextP.x}%`}
                        y2={`${nextP.y}%`}
                        stroke={ann.color}
                        strokeWidth={ann.strokeWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    );
                  })}
                </g>
              )}

              {ann.type === 'line' && ann.points.length >= 2 && (
                <line
                  x1={`${ann.points[0].x}%`}
                  y1={`${ann.points[0].y}%`}
                  x2={`${ann.points[1].x}%`}
                  y2={`${ann.points[1].y}%`}
                  stroke={ann.color}
                  strokeWidth={ann.strokeWidth}
                  strokeLinecap="round"
                />
              )}

              {ann.type === 'connected_lines' && ann.points.length >= 2 && (
                <g>
                  {ann.points.slice(0, -1).map((p, i) => {
                    const nextP = ann.points[i + 1];
                    return (
                      <line
                        key={i}
                        x1={`${p.x}%`}
                        y1={`${p.y}%`}
                        x2={`${nextP.x}%`}
                        y2={`${nextP.y}%`}
                        stroke={ann.color}
                        strokeWidth={ann.strokeWidth}
                        strokeLinecap="round"
                      />
                    );
                  })}
                </g>
              )}

              {ann.type === 'arrow' && ann.points.length >= 2 && (
                <g>
                  <defs>
                    <marker
                      id={`arrowhead-${ann.id}`}
                      viewBox="0 0 10 10"
                      refX="6"
                      refY="5"
                      markerWidth={Math.max(6, ann.strokeWidth * 2.5 + 4)}
                      markerHeight={Math.max(6, ann.strokeWidth * 2.5 + 4)}
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill={ann.color} />
                    </marker>
                  </defs>
                  <line
                    x1={`${ann.points[0].x}%`}
                    y1={`${ann.points[0].y}%`}
                    x2={`${ann.points[ann.points.length - 1].x}%`}
                    y2={`${ann.points[ann.points.length - 1].y}%`}
                    stroke={ann.color}
                    strokeWidth={ann.strokeWidth}
                    strokeLinecap="round"
                    markerEnd={`url(#arrowhead-${ann.id})`}
                  />
                </g>
              )}

              {ann.type === 'rectangle' && ann.points.length >= 2 && (
                <rect
                  x={`${Math.min(ann.points[0].x, ann.points[1].x)}%`}
                  y={`${Math.min(ann.points[0].y, ann.points[1].y)}%`}
                  width={`${Math.abs(ann.points[1].x - ann.points[0].x)}%`}
                  height={`${Math.abs(ann.points[1].y - ann.points[0].y)}%`}
                  fill="none"
                  stroke={ann.color}
                  strokeWidth={ann.strokeWidth}
                  rx="4"
                />
              )}

              {ann.type === 'highlight' && ann.points.length >= 2 && (
                <rect
                  x={`${Math.min(ann.points[0].x, ann.points[1].x)}%`}
                  y={`${Math.min(ann.points[0].y, ann.points[1].y)}%`}
                  width={`${Math.abs(ann.points[1].x - ann.points[0].x)}%`}
                  height={`${Math.abs(ann.points[1].y - ann.points[0].y)}%`}
                  fill="#fde047"
                  opacity="0.4"
                  stroke="#eab308"
                  strokeWidth="1"
                />
              )}

              {ann.type === 'circle' && ann.points.length >= 2 && (
                <ellipse
                  cx={`${(ann.points[0].x + ann.points[1].x) / 2}%`}
                  cy={`${(ann.points[0].y + ann.points[1].y) / 2}%`}
                  rx={`${Math.abs(ann.points[1].x - ann.points[0].x) / 2}%`}
                  ry={`${Math.abs(ann.points[1].y - ann.points[0].y) / 2}%`}
                  fill="none"
                  stroke={ann.color}
                  strokeWidth={ann.strokeWidth}
                />
              )}

              {ann.type === 'polygon' && ann.points.length >= 2 && (
                <polygon
                  points={ann.points.map(p => `${p.x},${p.y}`).join(' ')}
                  fill={`${ann.color}20`}
                  stroke={ann.color}
                  strokeWidth={ann.strokeWidth}
                />
              )}

              {ann.type === 'cloud' && ann.points.length >= 2 && (
                <rect
                  x={`${Math.min(ann.points[0].x, ann.points[1].x)}%`}
                  y={`${Math.min(ann.points[0].y, ann.points[1].y)}%`}
                  width={`${Math.abs(ann.points[1].x - ann.points[0].x)}%`}
                  height={`${Math.abs(ann.points[1].y - ann.points[0].y)}%`}
                  fill="none"
                  stroke={ann.color}
                  strokeWidth={ann.strokeWidth}
                  strokeDasharray="6 3"
                  rx="12"
                />
              )}

              {ann.type === 'callout' && ann.points.length >= 2 && (
                <g>
                  <rect
                    x={`${Math.min(ann.points[0].x, ann.points[1].x)}%`}
                    y={`${Math.min(ann.points[0].y, ann.points[1].y)}%`}
                    width={`${Math.max(15, Math.abs(ann.points[1].x - ann.points[0].x))}%`}
                    height={`${Math.max(8, Math.abs(ann.points[1].y - ann.points[0].y))}%`}
                    fill="#ffffff"
                    stroke={ann.color}
                    strokeWidth={ann.strokeWidth}
                    rx="6"
                  />
                  <line
                    x1={`${ann.points[0].x}%`}
                    y1={`${ann.points[0].y}%`}
                    x2={`${ann.points[0].x - 5}%`}
                    y2={`${ann.points[0].y + 10}%`}
                    stroke={ann.color}
                    strokeWidth={ann.strokeWidth}
                  />
                  <text
                    x={`${Math.min(ann.points[0].x, ann.points[1].x) + 2}%`}
                    y={`${Math.min(ann.points[0].y, ann.points[1].y) + 5}%`}
                    fontSize="11"
                    fontWeight="bold"
                    fill={ann.color}
                  >
                    {ann.text || 'Callout'}
                  </text>
                </g>
              )}

              {ann.type === 'stamp' && ann.points.length >= 1 && (
                <g transform={`translate(${ann.points[0].x * 5}, ${ann.points[0].y * 5})`}>
                  <rect
                    x={`${ann.points[0].x}%`}
                    y={`${ann.points[0].y}%`}
                    width="110"
                    height="36"
                    fill="#ffffff"
                    stroke={ann.color}
                    strokeWidth="3"
                    rx="6"
                  />
                  <rect
                    x={`calc(${ann.points[0].x}% + 3px)`}
                    y={`calc(${ann.points[0].y}% + 3px)`}
                    width="104"
                    height="30"
                    fill="none"
                    stroke={ann.color}
                    strokeWidth="1"
                    rx="4"
                  />
                  <text
                    x={`calc(${ann.points[0].x}% + 55px)`}
                    y={`calc(${ann.points[0].y}% + 23px)`}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="900"
                    fontFamily="sans-serif"
                    fill={ann.color}
                    letterSpacing="1"
                  >
                    {ann.stampType || 'APPROVED'}
                  </text>
                </g>
              )}

              {ann.type === 'check' && ann.points.length >= 1 && (
                <g>
                  <circle
                    cx={`${ann.points[0].x}%`} cy={`${ann.points[0].y}%`} r="24"
                    fill="transparent"
                    style={{ pointerEvents: activeTool === 'select' ? 'auto' : 'none' }}
                    onMouseDown={(e) => {
                      if (activeTool === 'select') {
                        e.stopPropagation();
                        setDraggingAnnId(ann.id);
                        setDragStartPos({ x: ((e.clientX - e.currentTarget.closest('svg')!.getBoundingClientRect().left) / e.currentTarget.closest('svg')!.getBoundingClientRect().width) * 100, y: ((e.clientY - e.currentTarget.closest('svg')!.getBoundingClientRect().top) / e.currentTarget.closest('svg')!.getBoundingClientRect().height) * 100 });
                      }
                    }}
                  />
                  <circle cx={`${ann.points[0].x}%`} cy={`${ann.points[0].y}%`} r="12" fill="#16a34a" className="pointer-events-none" />
                  <text x={`${ann.points[0].x}%`} y={`${ann.points[0].y}%`} dy="4" textAnchor="middle" fontSize="14" fill="#ffffff" fontWeight="bold" className="pointer-events-none">✓</text>
                </g>
              )}

              {ann.type === 'cross' && ann.points.length >= 1 && (
                <g>
                  <circle
                    cx={`${ann.points[0].x}%`} cy={`${ann.points[0].y}%`} r="24"
                    fill="transparent"
                    style={{ pointerEvents: activeTool === 'select' ? 'auto' : 'none' }}
                    onMouseDown={(e) => {
                      if (activeTool === 'select') {
                        e.stopPropagation();
                        setDraggingAnnId(ann.id);
                        setDragStartPos({ x: ((e.clientX - e.currentTarget.closest('svg')!.getBoundingClientRect().left) / e.currentTarget.closest('svg')!.getBoundingClientRect().width) * 100, y: ((e.clientY - e.currentTarget.closest('svg')!.getBoundingClientRect().top) / e.currentTarget.closest('svg')!.getBoundingClientRect().height) * 100 });
                      }
                    }}
                  />
                  <circle cx={`${ann.points[0].x}%`} cy={`${ann.points[0].y}%`} r="12" fill="#dc2626" className="pointer-events-none" />
                  <text x={`${ann.points[0].x}%`} y={`${ann.points[0].y}%`} dy="4" textAnchor="middle" fontSize="14" fill="#ffffff" fontWeight="bold" className="pointer-events-none">✕</text>
                </g>
              )}

              {ann.type === 'date' && ann.points.length >= 1 && (
                <g>
                  <text x={`${ann.points[0].x}%`} y={`${ann.points[0].y}%`} fontSize="13" fontWeight="bold" fill={ann.color}>
                    {ann.text || `${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`}
                  </text>
                </g>
              )}

              {(ann.type === 'blackout' || ann.type === 'whiteout') && ann.points.length >= 2 && (
                <g>
                  <rect
                    x={`${Math.min(ann.points[0].x, ann.points[1].x)}%`}
                    y={`${Math.min(ann.points[0].y, ann.points[1].y)}%`}
                    width={`${Math.abs(ann.points[1].x - ann.points[0].x)}%`}
                    height={`${Math.abs(ann.points[1].y - ann.points[0].y)}%`}
                    fill={ann.type === 'blackout' ? '#000000' : '#ffffff'}
                    stroke={ann.type === 'whiteout' && activeTool === 'select' ? '#cbd5e1' : 'none'}
                    strokeWidth={ann.type === 'whiteout' && activeTool === 'select' ? '1' : '0'}
                    strokeDasharray={ann.type === 'whiteout' && activeTool === 'select' ? '3,3' : undefined}
                    style={{ pointerEvents: activeTool === 'select' ? 'auto' : 'none' }}
                    onMouseDown={(e) => {
                      if (activeTool === 'select') {
                        e.stopPropagation();
                        setDraggingAnnId(ann.id);
                        setDragStartPos({
                          x: ((e.clientX - e.currentTarget.closest('svg')!.getBoundingClientRect().left) / e.currentTarget.closest('svg')!.getBoundingClientRect().width) * 100,
                          y: ((e.clientY - e.currentTarget.closest('svg')!.getBoundingClientRect().top) / e.currentTarget.closest('svg')!.getBoundingClientRect().height) * 100
                        });
                      }
                    }}
                    rx="2"
                  />
                  {activeTool === 'select' && (
                    <>
                      {/* Highlight outline on hover */}
                      <rect
                        x={`${Math.min(ann.points[0].x, ann.points[1].x)}%`}
                        y={`${Math.min(ann.points[0].y, ann.points[1].y)}%`}
                        width={`${Math.abs(ann.points[1].x - ann.points[0].x)}%`}
                        height={`${Math.abs(ann.points[1].y - ann.points[0].y)}%`}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                        className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      />
                      {/* TL Corner */}
                      <circle
                        cx={`${Math.min(ann.points[0].x, ann.points[1].x)}%`}
                        cy={`${Math.min(ann.points[0].y, ann.points[1].y)}%`}
                        r="6"
                        fill="#3b82f6"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="opacity-0 group-hover:opacity-100 transition-opacity cursor-nwse-resize pointer-events-auto"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setResizingAnnId(ann.id);
                          setResizeCorner('tl');
                        }}
                      />
                      {/* TR Corner */}
                      <circle
                        cx={`${Math.max(ann.points[0].x, ann.points[1].x)}%`}
                        cy={`${Math.min(ann.points[0].y, ann.points[1].y)}%`}
                        r="6"
                        fill="#3b82f6"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="opacity-0 group-hover:opacity-100 transition-opacity cursor-nesw-resize pointer-events-auto"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setResizingAnnId(ann.id);
                          setResizeCorner('tr');
                        }}
                      />
                      {/* BL Corner */}
                      <circle
                        cx={`${Math.min(ann.points[0].x, ann.points[1].x)}%`}
                        cy={`${Math.max(ann.points[0].y, ann.points[1].y)}%`}
                        r="6"
                        fill="#3b82f6"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="opacity-0 group-hover:opacity-100 transition-opacity cursor-nesw-resize pointer-events-auto"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setResizingAnnId(ann.id);
                          setResizeCorner('bl');
                        }}
                      />
                      {/* BR Corner */}
                      <circle
                        cx={`${Math.max(ann.points[0].x, ann.points[1].x)}%`}
                        cy={`${Math.max(ann.points[0].y, ann.points[1].y)}%`}
                        r="6"
                        fill="#3b82f6"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="opacity-0 group-hover:opacity-100 transition-opacity cursor-nwse-resize pointer-events-auto"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setResizingAnnId(ann.id);
                          setResizeCorner('br');
                        }}
                      />
                    </>
                  )}
                </g>
              )}

              {ann.type === 'sticky' && ann.points.length >= 1 && (
                <g 
                  className="cursor-pointer"
                  style={{ pointerEvents: activeTool === 'select' ? 'auto' : 'none' }}
                  onMouseDown={(e) => {
                    if (activeTool === 'select') {
                      e.stopPropagation();
                      setDraggingAnnId(ann.id);
                      setDragStartPos({ 
                        x: ((e.clientX - e.currentTarget.closest('svg')!.getBoundingClientRect().left) / e.currentTarget.closest('svg')!.getBoundingClientRect().width) * 100, 
                        y: ((e.clientY - e.currentTarget.closest('svg')!.getBoundingClientRect().top) / e.currentTarget.closest('svg')!.getBoundingClientRect().height) * 100 
                      });
                    }
                  }}
                  onClick={(e) => {
                    if (activeTool === 'select') {
                      e.stopPropagation();
                      setStickyModal({ x: ann.points[0].x, y: ann.points[0].y, pageNum, editingId: ann.id, initialText: ann.text || '' });
                      setStickyTextValue(ann.text || '');
                    }
                  }}
                  title="Click in Select mode to edit sticky note text, or drag to move"
                >
                  <foreignObject
                    x={`${ann.points[0].x}%`}
                    y={`${ann.points[0].y}%`}
                    width="140"
                    height="90"
                    style={{ overflow: 'visible' }}
                  >
                    <div className="w-[140px] h-[85px] bg-[#fef08a] border border-[#f59e0b] rounded-lg p-2 shadow-lg flex flex-col justify-between font-sans select-none pointer-events-auto">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                        <span className="text-[10px] font-bold text-[#78350f]">📌 Sticky Note</span>
                      </div>
                      <div className="text-[11px] text-[#451a03] font-medium overflow-hidden text-ellipsis line-clamp-3">
                        {ann.text || 'Sticky Note'}
                      </div>
                      {activeTool === 'select' && (
                        <div className="text-[9px] text-blue-600 italic">Click to edit</div>
                      )}
                    </div>
                  </foreignObject>
                </g>
              )}

              {ann.type === 'table' && ann.points.length >= 1 && (
                <g key={ann.id}>
                  {(() => {
                    const p1 = ann.points[1] || { x: ann.points[0].x + 35, y: ann.points[0].y + 20 };
                    const minX = Math.min(ann.points[0].x, p1.x);
                    const minY = Math.min(ann.points[0].y, p1.y);
                    const width = Math.max(5, Math.abs(p1.x - ann.points[0].x));
                    const height = Math.max(5, Math.abs(p1.y - ann.points[0].y));
                    const rows = ann.tableData?.length || 1;
                    const cols = ann.tableData?.[0]?.length || 1;
                    const tableBorderColor = ann.color || '#000000';
                    const tableBorderWidth = ann.strokeWidth || 1.5;

                    const colWidths = (ann.colWidths && ann.colWidths.length === cols)
                      ? ann.colWidths
                      : Array(cols).fill(100 / cols);
                    const rowHeights = (ann.rowHeights && ann.rowHeights.length === rows)
                      ? ann.rowHeights
                      : Array(rows).fill(100 / rows);

                    const totalColW = colWidths.reduce((a, b) => a + b, 0) || 100;
                    const totalRowH = rowHeights.reduce((a, b) => a + b, 0) || 100;

                    const cumColWidths = [0];
                    for (let i = 0; i < cols; i++) {
                      cumColWidths.push(cumColWidths[i] + colWidths[i]);
                    }
                    const cumRowHeights = [0];
                    for (let j = 0; j < rows; j++) {
                      cumRowHeights.push(cumRowHeights[j] + rowHeights[j]);
                    }

                    return (
                      <g>
                        <foreignObject
                          x={`${minX}%`}
                          y={`${minY}%`}
                          width={`${width}%`}
                          height={`${height}%`}
                          style={{ overflow: 'visible' }}
                        >
                          <div
                            className={`w-full h-full relative group transition-shadow ${
                              activeTool === 'select' ? 'cursor-move ring-2 ring-blue-500/80 shadow-md' : ''
                            }`}
                            style={{
                              pointerEvents: activeTool === 'select' ? 'auto' : 'none'
                            }}
                            onMouseDown={(e) => {
                              if (activeTool === 'select') {
                                e.stopPropagation();
                                setDraggingAnnId(ann.id);
                                setDragStartPos({
                                  x: ((e.clientX - e.currentTarget.closest('svg')!.getBoundingClientRect().left) / e.currentTarget.closest('svg')!.getBoundingClientRect().width) * 100,
                                  y: ((e.clientY - e.currentTarget.closest('svg')!.getBoundingClientRect().top) / e.currentTarget.closest('svg')!.getBoundingClientRect().height) * 100
                                });
                              }
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setEditingTableAnn(ann);
                            }}
                          >
                            {/* Floating Action Bar when Selected */}
                            {activeTool === 'select' && (
                              <div 
                                className="absolute -top-10 left-0 bg-slate-900/90 text-white text-[11px] font-medium px-2 py-1 rounded-lg shadow-xl flex items-center gap-1.5 z-30 whitespace-nowrap pointer-events-auto"
                                onMouseDown={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => setEditingTableAnn(ann)}
                                  className="hover:bg-blue-600 px-2 py-0.5 rounded flex items-center gap-1 text-white font-semibold transition-colors"
                                  title="Edit table cells & structure"
                                >
                                  <Edit3 className="h-3 w-3" /> Edit Table
                                </button>
                                <span className="text-slate-600">|</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!ann.tableData || !onUpdateAnnotation) return;
                                    const newCols = ann.tableData[0]?.length || 1;
                                    const newRow = new Array(newCols).fill('');
                                    const updatedRowHeights = [...rowHeights, 100 / (rows + 1)];
                                    onUpdateAnnotation(ann.id, { ...ann, tableData: [...ann.tableData, newRow], rowHeights: updatedRowHeights });
                                  }}
                                  className="hover:bg-slate-700 px-1.5 py-0.5 rounded text-slate-200"
                                  title="Add Row (Horizontal line)"
                                >
                                  + Row
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!ann.tableData || ann.tableData.length <= 1 || !onUpdateAnnotation) return;
                                    const nextData = ann.tableData.slice(0, -1);
                                    const updatedRowHeights = rowHeights.slice(0, -1);
                                    onUpdateAnnotation(ann.id, { ...ann, tableData: nextData, rowHeights: updatedRowHeights });
                                  }}
                                  className="hover:bg-slate-700 px-1.5 py-0.5 rounded text-slate-200"
                                  title="Remove Row"
                                >
                                  - Row
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!ann.tableData || !onUpdateAnnotation) return;
                                    const nextData = ann.tableData.map(r => [...r, '']);
                                    const updatedColWidths = [...colWidths, 100 / (cols + 1)];
                                    onUpdateAnnotation(ann.id, { ...ann, tableData: nextData, colWidths: updatedColWidths });
                                  }}
                                  className="hover:bg-slate-700 px-1.5 py-0.5 rounded text-slate-200"
                                  title="Add Column (Vertical line)"
                                >
                                  + Col
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!ann.tableData || ann.tableData[0]?.length <= 1 || !onUpdateAnnotation) return;
                                    const nextData = ann.tableData.map(r => r.slice(0, -1));
                                    const updatedColWidths = colWidths.slice(0, -1);
                                    onUpdateAnnotation(ann.id, { ...ann, tableData: nextData, colWidths: updatedColWidths });
                                  }}
                                  className="hover:bg-slate-700 px-1.5 py-0.5 rounded text-slate-200"
                                  title="Remove Column"
                                >
                                  - Col
                                </button>
                                <span className="text-slate-600">|</span>
                                <button
                                  type="button"
                                  onClick={() => onDeleteAnnotation(ann.id)}
                                  className="hover:bg-red-600 px-1.5 py-0.5 rounded text-rose-300 hover:text-white"
                                  title="Delete Table"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}

                            {/* HTML Grid Table */}
                            <div
                              className="w-full h-full bg-white select-none overflow-hidden"
                              style={{
                                display: 'grid',
                                gridTemplateRows: rowHeights.map(h => `${h}fr`).join(' '),
                                gridTemplateColumns: colWidths.map(w => `${w}fr`).join(' '),
                                border: `${tableBorderWidth}px solid ${tableBorderColor}`,
                                boxSizing: 'border-box'
                              }}
                            >
                              {ann.tableData?.map((row, ri) =>
                                row.map((cell, ci) => (
                                  <div
                                    key={`${ri}-${ci}`}
                                    className="p-1 overflow-hidden flex items-start break-words font-sans text-left leading-tight"
                                    style={{
                                      borderRight: ci < cols - 1 ? `${tableBorderWidth}px solid ${tableBorderColor}` : 'none',
                                      borderBottom: ri < rows - 1 ? `${tableBorderWidth}px solid ${tableBorderColor}` : 'none',
                                      backgroundColor: '#ffffff',
                                      fontWeight: ri === 0 ? '600' : '400',
                                      color: '#0f172a',
                                      fontSize: `${ann.fontSize || 10}px`
                                    }}
                                  >
                                    <span className="w-full break-words whitespace-pre-wrap">
                                      {cell || ''}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </foreignObject>

                        {/* Edge Resize Grabber Lines & 8 Corner Handle Circles */}
                        {activeTool === 'select' && (
                          <>
                            {/* 4 Outer Edge Resize Lines (Top, Bottom, Left, Right) */}
                            <line x1={`${minX}%`} y1={`${minY}%`} x2={`${minX + width}%`} y2={`${minY}%`} stroke="#3b82f6" strokeWidth="6" strokeOpacity="0.3" className="cursor-ns-resize pointer-events-auto hover:stroke-blue-600" onMouseDown={(e) => { e.stopPropagation(); setResizingAnnId(ann.id); setResizeCorner('t'); }} />
                            <line x1={`${minX}%`} y1={`${minY + height}%`} x2={`${minX + width}%`} y2={`${minY + height}%`} stroke="#3b82f6" strokeWidth="6" strokeOpacity="0.3" className="cursor-ns-resize pointer-events-auto hover:stroke-blue-600" onMouseDown={(e) => { e.stopPropagation(); setResizingAnnId(ann.id); setResizeCorner('b'); }} />
                            <line x1={`${minX}%`} y1={`${minY}%`} x2={`${minX}%`} y2={`${minY + height}%`} stroke="#3b82f6" strokeWidth="6" strokeOpacity="0.3" className="cursor-ew-resize pointer-events-auto hover:stroke-blue-600" onMouseDown={(e) => { e.stopPropagation(); setResizingAnnId(ann.id); setResizeCorner('l'); }} />
                            <line x1={`${minX + width}%`} y1={`${minY}%`} x2={`${minX + width}%`} y2={`${minY + height}%`} stroke="#3b82f6" strokeWidth="6" strokeOpacity="0.3" className="cursor-ew-resize pointer-events-auto hover:stroke-blue-600" onMouseDown={(e) => { e.stopPropagation(); setResizingAnnId(ann.id); setResizeCorner('r'); }} />

                            {/* Internal Draggable Column Lines (Vertical Dividers) */}
                            {Array.from({ length: cols - 1 }).map((_, cIdx) => {
                              const lineXPct = minX + (width * (cumColWidths[cIdx + 1] / totalColW));
                              return (
                                <g key={`col-line-${cIdx}`}>
                                  <line
                                    x1={`${lineXPct}%`}
                                    y1={`${minY}%`}
                                    x2={`${lineXPct}%`}
                                    y2={`${minY + height}%`}
                                    stroke="#2563eb"
                                    strokeWidth="6"
                                    strokeOpacity="0.35"
                                    strokeDasharray="3 3"
                                    className="cursor-col-resize pointer-events-auto hover:stroke-blue-600 hover:stroke-opacity-100"
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setResizingColIndex({ annId: ann.id, colIndex: cIdx, initialColWidths: [...colWidths] });
                                      setDragStartPos({
                                        x: ((e.clientX - e.currentTarget.closest('svg')!.getBoundingClientRect().left) / e.currentTarget.closest('svg')!.getBoundingClientRect().width) * 100,
                                        y: ((e.clientY - e.currentTarget.closest('svg')!.getBoundingClientRect().top) / e.currentTarget.closest('svg')!.getBoundingClientRect().height) * 100
                                      });
                                    }}
                                  />
                                  <circle
                                    cx={`${lineXPct}%`}
                                    cy={`${minY + height / 2}%`}
                                    r="5"
                                    fill="#2563eb"
                                    stroke="white"
                                    strokeWidth="1.5"
                                    className="cursor-col-resize pointer-events-auto shadow-md"
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setResizingColIndex({ annId: ann.id, colIndex: cIdx, initialColWidths: [...colWidths] });
                                      setDragStartPos({
                                        x: ((e.clientX - e.currentTarget.closest('svg')!.getBoundingClientRect().left) / e.currentTarget.closest('svg')!.getBoundingClientRect().width) * 100,
                                        y: ((e.clientY - e.currentTarget.closest('svg')!.getBoundingClientRect().top) / e.currentTarget.closest('svg')!.getBoundingClientRect().height) * 100
                                      });
                                    }}
                                  />
                                </g>
                              );
                            })}

                            {/* Internal Draggable Row Lines (Horizontal Dividers) */}
                            {Array.from({ length: rows - 1 }).map((_, rIdx) => {
                              const lineYPct = minY + (height * (cumRowHeights[rIdx + 1] / totalRowH));
                              return (
                                <g key={`row-line-${rIdx}`}>
                                  <line
                                    x1={`${minX}%`}
                                    y1={`${lineYPct}%`}
                                    x2={`${minX + width}%`}
                                    y2={`${lineYPct}%`}
                                    stroke="#2563eb"
                                    strokeWidth="6"
                                    strokeOpacity="0.35"
                                    strokeDasharray="3 3"
                                    className="cursor-row-resize pointer-events-auto hover:stroke-blue-600 hover:stroke-opacity-100"
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setResizingRowIndex({ annId: ann.id, rowIndex: rIdx, initialRowHeights: [...rowHeights] });
                                      setDragStartPos({
                                        x: ((e.clientX - e.currentTarget.closest('svg')!.getBoundingClientRect().left) / e.currentTarget.closest('svg')!.getBoundingClientRect().width) * 100,
                                        y: ((e.clientY - e.currentTarget.closest('svg')!.getBoundingClientRect().top) / e.currentTarget.closest('svg')!.getBoundingClientRect().height) * 100
                                      });
                                    }}
                                  />
                                  <circle
                                    cx={`${minX + width / 2}%`}
                                    cy={`${lineYPct}%`}
                                    r="5"
                                    fill="#2563eb"
                                    stroke="white"
                                    strokeWidth="1.5"
                                    className="cursor-row-resize pointer-events-auto shadow-md"
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setResizingRowIndex({ annId: ann.id, rowIndex: rIdx, initialRowHeights: [...rowHeights] });
                                      setDragStartPos({
                                        x: ((e.clientX - e.currentTarget.closest('svg')!.getBoundingClientRect().left) / e.currentTarget.closest('svg')!.getBoundingClientRect().width) * 100,
                                        y: ((e.clientY - e.currentTarget.closest('svg')!.getBoundingClientRect().top) / e.currentTarget.closest('svg')!.getBoundingClientRect().height) * 100
                                      });
                                    }}
                                  />
                                </g>
                              );
                            })}

                            {/* 8 Resize Handle Circles */}
                            <circle cx={`${minX}%`} cy={`${minY}%`} r="6" fill="#3b82f6" stroke="white" strokeWidth="1.5" className="cursor-nwse-resize pointer-events-auto" onMouseDown={(e) => { e.stopPropagation(); setResizingAnnId(ann.id); setResizeCorner('tl'); }} />
                            <circle cx={`${minX + width}%`} cy={`${minY}%`} r="6" fill="#3b82f6" stroke="white" strokeWidth="1.5" className="cursor-nesw-resize pointer-events-auto" onMouseDown={(e) => { e.stopPropagation(); setResizingAnnId(ann.id); setResizeCorner('tr'); }} />
                            <circle cx={`${minX}%`} cy={`${minY + height}%`} r="6" fill="#3b82f6" stroke="white" strokeWidth="1.5" className="cursor-nesw-resize pointer-events-auto" onMouseDown={(e) => { e.stopPropagation(); setResizingAnnId(ann.id); setResizeCorner('bl'); }} />
                            <circle cx={`${minX + width}%`} cy={`${minY + height}%`} r="6" fill="#3b82f6" stroke="white" strokeWidth="1.5" className="cursor-nwse-resize pointer-events-auto" onMouseDown={(e) => { e.stopPropagation(); setResizingAnnId(ann.id); setResizeCorner('br'); }} />

                            <circle cx={`${minX + width / 2}%`} cy={`${minY}%`} r="5.5" fill="#3b82f6" stroke="white" strokeWidth="1.5" className="cursor-ns-resize pointer-events-auto" onMouseDown={(e) => { e.stopPropagation(); setResizingAnnId(ann.id); setResizeCorner('t'); }} />
                            <circle cx={`${minX + width / 2}%`} cy={`${minY + height}%`} r="5.5" fill="#3b82f6" stroke="white" strokeWidth="1.5" className="cursor-ns-resize pointer-events-auto" onMouseDown={(e) => { e.stopPropagation(); setResizingAnnId(ann.id); setResizeCorner('b'); }} />
                            <circle cx={`${minX}%`} cy={`${minY + height / 2}%`} r="5.5" fill="#3b82f6" stroke="white" strokeWidth="1.5" className="cursor-ew-resize pointer-events-auto" onMouseDown={(e) => { e.stopPropagation(); setResizingAnnId(ann.id); setResizeCorner('l'); }} />
                            <circle cx={`${minX + width}%`} cy={`${minY + height / 2}%`} r="5.5" fill="#3b82f6" stroke="white" strokeWidth="1.5" className="cursor-ew-resize pointer-events-auto" onMouseDown={(e) => { e.stopPropagation(); setResizingAnnId(ann.id); setResizeCorner('r'); }} />
                          </>
                        )}
                      </g>
                    );
                  })()}
                </g>
              )}

              {(ann.type === 'image' || ann.type === 'signature') && ann.imageUrl && (
                <g>
                  <image
                    href={ann.imageUrl}
                    x={`${Math.min(ann.points[0].x, ann.points[1]?.x || ann.points[0].x + 30)}%`}
                    y={`${Math.min(ann.points[0].y, ann.points[1]?.y || ann.points[0].y + 20)}%`}
                    width={`${Math.abs((ann.points[1]?.x || ann.points[0].x + 30) - ann.points[0].x)}%`}
                    height={`${Math.abs((ann.points[1]?.y || ann.points[0].y + 20) - ann.points[0].y)}%`}
                    preserveAspectRatio="none"
                    style={{ pointerEvents: activeTool === 'select' ? 'auto' : 'none' }}
                    onMouseDown={(e) => {
                      if (activeTool === 'select') {
                        e.stopPropagation();
                        setDraggingAnnId(ann.id);
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = ((e.clientX - rect.left) / rect.width) * 100;
                        const clickY = ((e.clientY - rect.top) / rect.height) * 100;
                        // Approximate offset calculation (simplified for now)
                        setDragStartPos({ x: ((e.clientX - e.currentTarget.closest('svg')!.getBoundingClientRect().left) / e.currentTarget.closest('svg')!.getBoundingClientRect().width) * 100, y: ((e.clientY - e.currentTarget.closest('svg')!.getBoundingClientRect().top) / e.currentTarget.closest('svg')!.getBoundingClientRect().height) * 100 });
                      }
                    }}
                  />
                  {activeTool === 'select' && (
                    <>
                      <rect
                        x={`${Math.min(ann.points[0].x, ann.points[1]?.x || ann.points[0].x + 30)}%`}
                        y={`${Math.min(ann.points[0].y, ann.points[1]?.y || ann.points[0].y + 20)}%`}
                        width={`${Math.abs((ann.points[1]?.x || ann.points[0].x + 30) - ann.points[0].x)}%`}
                        height={`${Math.abs((ann.points[1]?.y || ann.points[0].y + 20) - ann.points[0].y)}%`}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                        className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      />
                      {/* TL Corner */}
                      <circle
                        cx={`${Math.min(ann.points[0].x, ann.points[1]?.x || ann.points[0].x + 30)}%`}
                        cy={`${Math.min(ann.points[0].y, ann.points[1]?.y || ann.points[0].y + 20)}%`}
                        r="6"
                        fill="#3b82f6"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="opacity-0 group-hover:opacity-100 transition-opacity cursor-nwse-resize pointer-events-auto"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setResizingAnnId(ann.id);
                          setResizeCorner('tl');
                        }}
                      />
                      {/* TR Corner */}
                      <circle
                        cx={`${Math.max(ann.points[0].x, ann.points[1]?.x || ann.points[0].x + 30)}%`}
                        cy={`${Math.min(ann.points[0].y, ann.points[1]?.y || ann.points[0].y + 20)}%`}
                        r="6"
                        fill="#3b82f6"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="opacity-0 group-hover:opacity-100 transition-opacity cursor-nesw-resize pointer-events-auto"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setResizingAnnId(ann.id);
                          setResizeCorner('tr');
                        }}
                      />
                      {/* BL Corner */}
                      <circle
                        cx={`${Math.min(ann.points[0].x, ann.points[1]?.x || ann.points[0].x + 30)}%`}
                        cy={`${Math.max(ann.points[0].y, ann.points[1]?.y || ann.points[0].y + 20)}%`}
                        r="6"
                        fill="#3b82f6"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="opacity-0 group-hover:opacity-100 transition-opacity cursor-nesw-resize pointer-events-auto"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setResizingAnnId(ann.id);
                          setResizeCorner('bl');
                        }}
                      />
                      {/* BR Corner */}
                      <circle
                        cx={`${Math.max(ann.points[0].x, ann.points[1]?.x || ann.points[0].x + 30)}%`}
                        cy={`${Math.max(ann.points[0].y, ann.points[1]?.y || ann.points[0].y + 20)}%`}
                        r="6"
                        fill="#3b82f6"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="opacity-0 group-hover:opacity-100 transition-opacity cursor-nwse-resize pointer-events-auto"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setResizingAnnId(ann.id);
                          setResizeCorner('br');
                        }}
                      />
                    </>
                  )}
                </g>
              )}

              {/* Delete button overlay on hover */}
              {activeTool === 'select' && (
                <g 
                  className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteAnnotation(ann.id);
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onDeleteAnnotation(ann.id);
                  }}
                >
                  <circle
                    cx={`${(ann.type === 'check' || ann.type === 'cross') ? ann.points[0].x + 3 : ann.points[0].x}%`}
                    cy={`${(ann.type === 'check' || ann.type === 'cross') ? ann.points[0].y - 3 : ann.points[0].y}%`}
                    r="10"
                    fill="#e11d48"
                  />
                  <text
                    x={`${(ann.type === 'check' || ann.type === 'cross') ? ann.points[0].x + 3 : ann.points[0].x}%`}
                    y={`${(ann.type === 'check' || ann.type === 'cross') ? ann.points[0].y - 3 : ann.points[0].y}%`}
                    textAnchor="middle"
                    dy="4"
                    fontSize="12"
                    fill="#ffffff"
                    fontWeight="bold"
                  >
                    ×
                  </text>
                </g>
              )}
            </g>
          ))}

          {/* Render active drawing stroke preview */}
          {isDrawing && currentPoints.length > 0 && (
            <g>
              {(activeTool === 'draw' || activeTool === 'erase') && currentPoints.length >= 2 && (
                <g>
                  {currentPoints.slice(0, -1).map((p, i) => {
                    const nextP = currentPoints[i + 1];
                    return (
                      <line
                        key={i}
                        x1={`${p.x}%`}
                        y1={`${p.y}%`}
                        x2={`${nextP.x}%`}
                        y2={`${nextP.y}%`}
                        stroke={activeTool === 'erase' ? '#ffffff' : strokeColor}
                        strokeWidth={activeTool === 'erase' ? 24 : strokeWidth}
                        strokeLinecap="round"
                      />
                    );
                  })}
                </g>
              )}

              {(activeTool === 'line' || activeTool === 'arrow') && currentPoints.length >= 2 && (
                <line
                  x1={`${currentPoints[0].x}%`}
                  y1={`${currentPoints[0].y}%`}
                  x2={`${currentPoints[1].x}%`}
                  y2={`${currentPoints[1].y}%`}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                />
              )}

              {activeTool === 'rectangle' && currentPoints.length >= 2 && (
                <rect
                  x={`${Math.min(currentPoints[0].x, currentPoints[1].x)}%`}
                  y={`${Math.min(currentPoints[0].y, currentPoints[1].y)}%`}
                  width={`${Math.abs(currentPoints[1].x - currentPoints[0].x)}%`}
                  height={`${Math.abs(currentPoints[1].y - currentPoints[0].y)}%`}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  rx="4"
                />
              )}

              {(activeTool === 'blackout' || activeTool === 'whiteout') && currentPoints.length >= 2 && (
                <rect
                  x={`${Math.min(currentPoints[0].x, currentPoints[1].x)}%`}
                  y={`${Math.min(currentPoints[0].y, currentPoints[1].y)}%`}
                  width={`${Math.abs(currentPoints[1].x - currentPoints[0].x)}%`}
                  height={`${Math.abs(currentPoints[1].y - currentPoints[0].y)}%`}
                  fill={activeTool === 'blackout' ? '#000000' : '#ffffff'}
                  stroke="#3b82f6"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  rx="2"
                />
              )}

              {activeTool === 'circle' && currentPoints.length >= 2 && (
                <ellipse
                  cx={`${(currentPoints[0].x + currentPoints[1].x) / 2}%`}
                  cy={`${(currentPoints[0].y + currentPoints[1].y) / 2}%`}
                  rx={`${Math.abs(currentPoints[1].x - currentPoints[0].x) / 2}%`}
                  ry={`${Math.abs(currentPoints[1].y - currentPoints[0].y) / 2}%`}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                />
              )}
            </g>
          )}
        </svg>

        {/* Hit-boxes text editing overlay */}
        <div 
          className={`absolute inset-0 select-none ${activeTool === 'select' ? 'pointer-events-auto' : 'pointer-events-none'}`}
          style={{ width: '100%', height: '100%' }}
          onClick={(e) => {
            if (activeTool === 'select' && e.target === e.currentTarget) {
              if (editingBlock) {
                handleApplyTextEdit();
              } else {
                setEditingBlock(null);
              }
            }
          }}
        >
          {(() => {
            const pageW = 600 * (zoom / 100);
            // 28.3 points out of 595 represents approx 1cm margin
            const marginPx = (28.3 / (editingBlock?.pageWidth || 595)) * pageW;

            return (parsedBlocks || []).map((block) => {
              const isSelected = editingBlock?.id === block.id;
              const leftPx = (block.x / 100) * pageW;
              const maxAllowedW = Math.max(160, pageW - marginPx - leftPx);

              return (
                <div
                  key={block.id}
                  onClick={() => {
                    if (activeTool !== 'select') return;
                    if (!isSelected) {
                      const sampledColor = canvasRef.current 
                        ? detectColorFromCanvas(canvasRef.current, block.x, block.y, block.w, block.h)
                        : (block.color || '#000000');
                      setTextareaResized(false);
                      setEditingBlock({
                        ...block,
                        fontSize: (!block.fontSize || Math.round(block.fontSize) <= 12) ? 9 : block.fontSize,
                        page: pageNum,
                        color: sampledColor,
                        align: block.align || 'left',
                        autoHeight: block.autoHeight !== false
                      });
                      setNewTextValue(block.text);
                    }
                  }}
                  className={`absolute group transition-all duration-150 ${
                    isSelected 
                      ? 'z-30' 
                      : 'border border-transparent hover:border-blue-500/40 hover:bg-blue-500/10 cursor-pointer'
                  }`}
                  style={{
                    left: `${block.x}%`,
                    top: `${block.y}%`,
                    width: isSelected ? undefined : `${block.w}%`,
                    height: isSelected ? undefined : `${block.h}%`,
                  }}
                  title={isSelected ? undefined : `Click to edit: "${block.text}"`}
                >
                  {!isSelected && (
                    <span className="opacity-0 group-hover:opacity-100 absolute -top-4 -right-1 bg-blue-600 text-white rounded p-0.5 shadow-md scale-75 transition-all pointer-events-none">
                      <Edit3 className="h-2.5 w-2.5" />
                    </span>
                  )}

                  {/* Inline Toolbar & Editing for existing text block */}
                  {isSelected && (
                    <div className="absolute top-0 left-0 z-40" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <div 
                          className={`absolute bottom-full mb-3 ${
                            editingBlock.x < 40 ? 'left-0' : editingBlock.x > 60 ? 'right-0' : 'left-1/2 -translate-x-1/2'
                          } flex items-center gap-1 bg-white dark:bg-zinc-900 border border-blue-400 shadow-xl rounded-xl p-1 whitespace-nowrap z-50 animate-fade-in text-slate-800 dark:text-zinc-200`}
                        >
                          <button 
                            type="button"
                            onClick={() => setEditingBlock({ ...editingBlock, bold: !editingBlock.bold })}
                            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${editingBlock.bold ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 font-bold' : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400'}`}
                            title="Toggle Bold"
                          >
                            <Bold className="h-3.5 w-3.5" />
                          </button>

                          <button 
                            type="button"
                            onClick={() => setEditingBlock({ ...editingBlock, italic: !editingBlock.italic })}
                            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${editingBlock.italic ? 'bg-blue-100 dark:bg-blue-950 text-blue-600' : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400'}`}
                            title="Toggle Italic"
                          >
                            <Italic className="h-3.5 w-3.5" />
                          </button>

                          <div className="h-4.5 w-px bg-slate-200 dark:bg-zinc-800 mx-0.5" />

                          <div className="flex items-center gap-0.5 px-1 bg-slate-50 dark:bg-zinc-950 rounded-lg py-0.5">
                            <button 
                              type="button"
                              onClick={() => setEditingBlock({ ...editingBlock, fontSize: Math.max(4, editingBlock.fontSize - 1) })}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 rounded cursor-pointer transition-colors"
                              title="Decrease Font Size"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="font-mono font-bold text-[10px] w-8 text-center text-slate-600 dark:text-zinc-400">
                              {Math.round(editingBlock.fontSize)}pt
                            </span>
                            <button 
                              type="button"
                              onClick={() => setEditingBlock({ ...editingBlock, fontSize: editingBlock.fontSize + 1 })}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 rounded cursor-pointer transition-colors"
                              title="Increase Font Size"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <div className="h-4.5 w-px bg-slate-200 dark:bg-zinc-800 mx-0.5" />

                          <button 
                            type="button"
                            onClick={() => {
                              let text = newTextValue;
                              if (text === text.toUpperCase()) {
                                text = text.toLowerCase();
                              } else if (text === text.toLowerCase()) {
                                text = text.replace(/\b\w/g, c => c.toUpperCase());
                              } else {
                                text = text.toUpperCase();
                              }
                              setNewTextValue(text);
                            }}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 rounded-lg cursor-pointer transition-colors"
                            title="Toggle Text Case"
                          >
                            <CaseSensitive className="h-3.5 w-3.5" />
                          </button>

                          <div className="relative flex items-center">
                            <label 
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 rounded-lg cursor-pointer transition-colors flex items-center gap-1 relative overflow-hidden"
                              title="Change Text Color"
                            >
                              <Palette className="h-3.5 w-3.5" style={{ color: editingBlock.color }} />
                              <input 
                                type="color" 
                                value={editingBlock.color} 
                                onChange={(e) => {
                                  setEditingBlock({ ...editingBlock, color: e.target.value });
                                  setLastSelectedColor(e.target.value);
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              />
                            </label>
                          </div>

                          <div className="h-4.5 w-px bg-slate-200 dark:bg-zinc-800 mx-0.5" />

                          {/* Alignment controls */}
                          <button 
                            type="button"
                            onClick={() => setEditingBlock({ ...editingBlock, align: 'left' })}
                            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${(!editingBlock.align || editingBlock.align === 'left') ? 'bg-blue-100 dark:bg-blue-950 text-blue-600' : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400'}`}
                            title="Align Left"
                          >
                            <AlignLeft className="h-3.5 w-3.5" />
                          </button>

                          <button 
                            type="button"
                            onClick={() => setEditingBlock({ ...editingBlock, align: 'center' })}
                            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${editingBlock.align === 'center' ? 'bg-blue-100 dark:bg-blue-950 text-blue-600' : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400'}`}
                            title="Align Center"
                          >
                            <AlignCenter className="h-3.5 w-3.5" />
                          </button>

                          <button 
                            type="button"
                            onClick={() => setEditingBlock({ ...editingBlock, align: 'right' })}
                            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${editingBlock.align === 'right' ? 'bg-blue-100 dark:bg-blue-950 text-blue-600' : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400'}`}
                            title="Align Right"
                          >
                            <AlignRight className="h-3.5 w-3.5" />
                          </button>

                          <div className="h-4.5 w-px bg-slate-200 dark:bg-zinc-800 mx-0.5" />

                          {/* Auto height control */}
                          <button 
                            type="button"
                            onClick={() => {
                              const newAutoHeight = editingBlock.autoHeight === false ? true : false;
                              setEditingBlock({ ...editingBlock, autoHeight: newAutoHeight });
                              setTimeout(() => {
                                const textarea = document.getElementById('pdf-text-editor-textarea') as HTMLTextAreaElement | null;
                                if (textarea) {
                                  if (newAutoHeight) {
                                    textarea.style.height = 'auto';
                                    textarea.style.height = (textarea.scrollHeight + 5) + 'px';
                                  } else {
                                    textarea.style.height = '60px';
                                  }
                                }
                              }, 10);
                            }}
                            className={`p-1.5 rounded-lg cursor-pointer transition-all flex items-center gap-1 text-[11px] px-2 font-medium ${editingBlock.autoHeight !== false ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500'}`}
                            title="Toggle Auto Height"
                          >
                            <Layers className="h-3.5 w-3.5" />
                            <span>Auto H</span>
                          </button>

                          <div className="h-4.5 w-px bg-slate-200 dark:bg-zinc-800 mx-0.5" />

                          <button 
                            type="button"
                            onClick={() => {
                              setNewTextValue('');
                              setTimeout(() => {
                                handleApplyTextEdit({ customReplacementText: '' });
                              }, 50);
                            }}
                            className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 rounded-lg cursor-pointer transition-colors"
                            title="Delete Text"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>

                          <button 
                            type="button"
                            onClick={() => setEditingBlock(null)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-lg cursor-pointer transition-colors"
                            title="Cancel"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>

                          <button 
                            type="button"
                            onClick={() => handleApplyTextEdit()}
                            disabled={isProcessing}
                            className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-all flex items-center justify-center shadow-lg shadow-blue-500/20 disabled:opacity-50"
                            title="Apply & Save Text"
                          >
                            {isProcessing ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                            ) : (
                              <Check className="h-3.5 w-3.5 text-white" />
                            )}
                          </button>
                        </div>

                        {(() => {
                          const visualFontSize = editingBlock.fontSize * (zoom / 100);
                          const estimatedCharWidth = visualFontSize * (editingBlock.bold ? 0.65 : 0.55);
                          const textW = Math.max((editingBlock.w / 100) * pageW + 20, newTextValue.length * estimatedCharWidth + 25);

                          return (
                            <textarea
                              id="pdf-text-editor-textarea"
                              value={newTextValue}
                              onChange={(e) => setNewTextValue(e.target.value)}
                              onInput={(e) => {
                                if (editingBlock.autoHeight !== false) {
                                  e.currentTarget.style.height = 'auto';
                                  e.currentTarget.style.height = (e.currentTarget.scrollHeight) + 'px';
                                }
                              }}
                              wrap={newTextValue.includes('\n') ? "soft" : "off"}
                              className="border-2 border-blue-500 bg-white dark:bg-zinc-900 rounded shadow-2xl px-2 py-1 outline-none overflow-x-auto block"
                              style={{
                                width: `${Math.min(maxAllowedW, Math.max(140, textW))}px`,
                                minWidth: '120px',
                                minHeight: `${Math.max(28, Math.round(visualFontSize * 1.3))}px`,
                                maxWidth: `${maxAllowedW}px`,
                                textAlign: editingBlock.align || 'left',
                                fontSize: `${visualFontSize}px`,
                                fontFamily: editingBlock.fontFamily,
                                fontWeight: editingBlock.bold ? 'bold' : 'normal',
                                fontStyle: editingBlock.italic ? 'italic' : 'normal',
                                color: editingBlock.color,
                                lineHeight: 1.2,
                                whiteSpace: newTextValue.includes('\n') ? 'pre-wrap' : 'nowrap',
                                resize: 'none',
                                overflowY: editingBlock.autoHeight !== false ? 'hidden' : 'auto',
                              }}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                  e.preventDefault();
                                  handleApplyTextEdit();
                                } else if (e.key === 'Escape') {
                                  setEditingBlock(null);
                                }
                              }}
                            />
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              );
            });
          })()}

          {/* Render newly added text block for this page */}
          {editingBlock && editingBlock.isNew && editingBlock.page === pageNum && (() => {
            const pageW = 600 * (zoom / 100);
            const marginPx = (28.3 / (editingBlock.pageWidth || 595)) * pageW;
            const leftPx = (editingBlock.x / 100) * pageW;
            const maxAllowedW = Math.max(160, pageW - marginPx - leftPx);

            return (
              <div
                className="absolute z-40"
                style={{
                  left: `${editingBlock.x}%`,
                  top: `${editingBlock.y}%`,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative">
                  <div 
                    className={`absolute bottom-full mb-3 ${
                      editingBlock.x < 40 ? 'left-0' : editingBlock.x > 60 ? 'right-0' : 'left-1/2 -translate-x-1/2'
                    } flex items-center gap-1 bg-white dark:bg-zinc-900 border border-blue-400 shadow-xl rounded-xl p-1 whitespace-nowrap z-50 animate-fade-in text-slate-800 dark:text-zinc-200`}
                  >
                    <button 
                      type="button"
                      onClick={() => setEditingBlock({ ...editingBlock, bold: !editingBlock.bold })}
                      className={`p-1.5 rounded-lg cursor-pointer transition-colors ${editingBlock.bold ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 font-bold' : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400'}`}
                      title="Toggle Bold"
                    >
                      <Bold className="h-3.5 w-3.5" />
                    </button>

                    <button 
                      type="button"
                      onClick={() => setEditingBlock({ ...editingBlock, italic: !editingBlock.italic })}
                      className={`p-1.5 rounded-lg cursor-pointer transition-colors ${editingBlock.italic ? 'bg-blue-100 dark:bg-blue-950 text-blue-600' : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400'}`}
                      title="Toggle Italic"
                    >
                      <Italic className="h-3.5 w-3.5" />
                    </button>

                    <div className="h-4.5 w-px bg-slate-200 dark:bg-zinc-800 mx-0.5" />

                    <div className="flex items-center gap-0.5 px-1 bg-slate-50 dark:bg-zinc-950 rounded-lg py-0.5">
                      <button 
                        type="button"
                        onClick={() => setEditingBlock({ ...editingBlock, fontSize: Math.max(4, editingBlock.fontSize - 1) })}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 rounded cursor-pointer transition-colors"
                        title="Decrease Font Size"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="font-mono font-bold text-[10px] w-8 text-center text-slate-600 dark:text-zinc-400">
                        {Math.round(editingBlock.fontSize)}pt
                      </span>
                      <button 
                        type="button"
                        onClick={() => setEditingBlock({ ...editingBlock, fontSize: editingBlock.fontSize + 1 })}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 rounded cursor-pointer transition-colors"
                        title="Increase Font Size"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="h-4.5 w-px bg-slate-200 dark:bg-zinc-800 mx-0.5" />

                    <button 
                      type="button"
                      onClick={() => {
                        let text = newTextValue;
                        if (text === text.toUpperCase()) {
                          text = text.toLowerCase();
                        } else if (text === text.toLowerCase()) {
                          text = text.replace(/\b\w/g, c => c.toUpperCase());
                        } else {
                          text = text.toUpperCase();
                        }
                        setNewTextValue(text);
                      }}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 rounded-lg cursor-pointer transition-colors"
                      title="Toggle Text Case"
                    >
                      <CaseSensitive className="h-3.5 w-3.5" />
                    </button>

                    <div className="relative flex items-center">
                      <label 
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 rounded-lg cursor-pointer transition-colors flex items-center gap-1 relative overflow-hidden"
                        title="Change Text Color"
                      >
                        <Palette className="h-3.5 w-3.5" style={{ color: editingBlock.color }} />
                        <input 
                          type="color" 
                          value={editingBlock.color} 
                          onChange={(e) => {
                            setEditingBlock({ ...editingBlock, color: e.target.value });
                            setLastSelectedColor(e.target.value);
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </label>
                    </div>

                    <div className="h-4.5 w-px bg-slate-200 dark:bg-zinc-800 mx-0.5" />

                    {/* Alignment controls */}
                    <button 
                      type="button"
                      onClick={() => setEditingBlock({ ...editingBlock, align: 'left' })}
                      className={`p-1.5 rounded-lg cursor-pointer transition-colors ${(!editingBlock.align || editingBlock.align === 'left') ? 'bg-blue-100 dark:bg-blue-950 text-blue-600' : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400'}`}
                      title="Align Left"
                    >
                      <AlignLeft className="h-3.5 w-3.5" />
                    </button>

                    <button 
                      type="button"
                      onClick={() => setEditingBlock({ ...editingBlock, align: 'center' })}
                      className={`p-1.5 rounded-lg cursor-pointer transition-colors ${editingBlock.align === 'center' ? 'bg-blue-100 dark:bg-blue-950 text-blue-600' : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400'}`}
                      title="Align Center"
                    >
                      <AlignCenter className="h-3.5 w-3.5" />
                    </button>

                    <button 
                      type="button"
                      onClick={() => setEditingBlock({ ...editingBlock, align: 'right' })}
                      className={`p-1.5 rounded-lg cursor-pointer transition-colors ${editingBlock.align === 'right' ? 'bg-blue-100 dark:bg-blue-950 text-blue-600' : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400'}`}
                      title="Align Right"
                    >
                      <AlignRight className="h-3.5 w-3.5" />
                    </button>

                    <div className="h-4.5 w-px bg-slate-200 dark:bg-zinc-800 mx-0.5" />

                    {/* Auto height control */}
                    <button 
                      type="button"
                      onClick={() => {
                        const newAutoHeight = editingBlock.autoHeight === false ? true : false;
                        setEditingBlock({ ...editingBlock, autoHeight: newAutoHeight });
                        setTimeout(() => {
                          const textarea = document.getElementById('pdf-text-editor-textarea') as HTMLTextAreaElement | null;
                          if (textarea) {
                            if (newAutoHeight) {
                              textarea.style.height = 'auto';
                              textarea.style.height = (textarea.scrollHeight + 5) + 'px';
                            } else {
                              textarea.style.height = '60px';
                            }
                          }
                        }, 10);
                      }}
                      className={`p-1.5 rounded-lg cursor-pointer transition-all flex items-center gap-1 text-[11px] px-2 font-medium ${editingBlock.autoHeight !== false ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500'}`}
                      title="Toggle Auto Height"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      <span>Auto H</span>
                    </button>

                    <div className="h-4.5 w-px bg-slate-200 dark:bg-zinc-800 mx-0.5" />

                    <button 
                      type="button"
                      onClick={() => setEditingBlock(null)}
                      className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 rounded-lg cursor-pointer transition-colors"
                      title="Discard New Text"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>

                    <button 
                      type="button"
                      onClick={() => handleApplyTextEdit()}
                      disabled={isProcessing}
                      className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-all flex items-center justify-center shadow-lg shadow-blue-500/20 disabled:opacity-50"
                      title="Apply & Save Text"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                      ) : (
                        <Check className="h-3.5 w-3.5 text-white" />
                      )}
                    </button>
                  </div>

                  {(() => {
                    const visualFontSize = editingBlock.fontSize * (zoom / 100);
                    const estimatedCharWidth = visualFontSize * (editingBlock.bold ? 0.65 : 0.55);
                    const textW = Math.max((editingBlock.w / 100) * pageW + 20, newTextValue.length * estimatedCharWidth + 25);

                    return (
                      <textarea
                        id="pdf-text-editor-textarea"
                        value={newTextValue}
                        onChange={(e) => setNewTextValue(e.target.value)}
                        onInput={(e) => {
                          if (editingBlock.autoHeight !== false) {
                            e.currentTarget.style.height = 'auto';
                            e.currentTarget.style.height = (e.currentTarget.scrollHeight) + 'px';
                          }
                        }}
                        wrap={newTextValue.includes('\n') ? "soft" : "off"}
                        className="border-2 border-blue-500 bg-white dark:bg-zinc-900 rounded shadow-2xl px-2 py-1 outline-none overflow-x-auto block"
                        style={{
                          width: `${Math.min(maxAllowedW, Math.max(140, textW))}px`,
                          minWidth: '120px',
                          minHeight: `${Math.max(28, Math.round(visualFontSize * 1.3))}px`,
                          maxWidth: `${maxAllowedW}px`,
                          textAlign: editingBlock.align || 'left',
                          fontSize: `${visualFontSize}px`,
                          fontFamily: editingBlock.fontFamily,
                          fontWeight: editingBlock.bold ? 'bold' : 'normal',
                          fontStyle: editingBlock.italic ? 'italic' : 'normal',
                          color: editingBlock.color,
                          lineHeight: 1.2,
                          whiteSpace: newTextValue.includes('\n') ? 'pre-wrap' : 'nowrap',
                          resize: 'none',
                          overflowY: editingBlock.autoHeight !== false ? 'hidden' : 'auto',
                        }}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault();
                            handleApplyTextEdit();
                          } else if (e.key === 'Escape') {
                            setEditingBlock(null);
                          }
                        }}
                      />
                    );
                  })()}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Button to add a new page directly below this page */}
      <div className="mt-3 mb-2 flex items-center justify-center">
        <button
          onClick={() => handleAddPage(pageNum)}
          disabled={isProcessing}
          className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 font-semibold px-4 py-1.5 rounded-full text-xs cursor-pointer shadow-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          title={`Insert a new blank page below Page ${pageNum}`}
        >
          <FilePlus className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>+ Add Blank Page Below Page {pageNum}</span>
        </button>
      </div>

      {/* Sticky Note Modal Dialog */}
      {stickyModal && stickyModal.pageNum === pageNum && (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-700/60 rounded-2xl shadow-2xl p-5 w-full max-w-sm flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📌</span>
                <h3 className="font-semibold text-slate-800 dark:text-zinc-100 text-sm">
                  {stickyModal.editingId ? 'Edit Sticky Note' : 'Add Sticky Note'}
                </h3>
              </div>
              <button 
                onClick={() => setStickyModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <textarea
              value={stickyTextValue}
              onChange={(e) => setStickyTextValue(e.target.value)}
              placeholder="Enter sticky note text..."
              className="w-full h-24 p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 text-slate-800 dark:text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none font-sans"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  const textToSave = stickyTextValue !== '' ? stickyTextValue : (stickyModal.initialText || 'Sticky Note');
                  if (stickyModal.editingId && onUpdateAnnotation) {
                    const existing = pageAnnotations.find(a => a.id === stickyModal.editingId);
                    if (existing) {
                      onUpdateAnnotation(stickyModal.editingId, { ...existing, text: textToSave });
                    }
                  } else {
                    onAddAnnotation({
                      id: `ann-${pageNum}-${Date.now()}`,
                      page: pageNum,
                      type: 'sticky',
                      points: [{ x: stickyModal.x, y: stickyModal.y }, { x: stickyModal.x + 25, y: stickyModal.y + 15 }],
                      color: strokeColor,
                      strokeWidth,
                      text: textToSave
                    });
                  }
                  setStickyModal(null);
                  setStickyTextValue('');
                } else if (e.key === 'Escape') {
                  setStickyModal(null);
                  setStickyTextValue('');
                }
              }}
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => {
                  setStickyModal(null);
                  setStickyTextValue('');
                }}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 text-xs font-medium hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const textToSave = stickyTextValue !== '' ? stickyTextValue : (stickyModal.initialText || 'Sticky Note');
                  if (stickyModal.editingId && onUpdateAnnotation) {
                    const existing = pageAnnotations.find(a => a.id === stickyModal.editingId);
                    if (existing) {
                      onUpdateAnnotation(stickyModal.editingId, { ...existing, text: textToSave });
                    }
                  } else {
                    onAddAnnotation({
                      id: `ann-${pageNum}-${Date.now()}`,
                      page: pageNum,
                      type: 'sticky',
                      points: [{ x: stickyModal.x, y: stickyModal.y }, { x: stickyModal.x + 25, y: stickyModal.y + 15 }],
                      color: strokeColor,
                      strokeWidth,
                      text: textToSave
                    });
                  }
                  setStickyModal(null);
                  setStickyTextValue('');
                }}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-md shadow-amber-500/20 cursor-pointer transition-all"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Structure & Spreadsheet Cell Editor Modal */}
      {editingTableAnn && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-900/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Grid className="h-5 w-5 text-blue-600" />
                  PDF Table Grid & Cell Content Editor
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Full Table Structure: Horizontal Lines = Rows | Vertical Lines = Columns
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTableAnn(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Grid Control Toolbar */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-100 dark:bg-zinc-800/50 rounded-xl border border-slate-200 dark:border-zinc-700/60 text-xs">
                
                {/* Row count */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Rows (Horizontal Lines)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (!editingTableAnn.tableData || editingTableAnn.tableData.length <= 1) return;
                        const newTable = editingTableAnn.tableData.slice(0, -1);
                        setEditingTableAnn({ ...editingTableAnn, tableData: newTable });
                      }}
                      className="px-2.5 py-1 bg-white dark:bg-zinc-800 border rounded font-bold hover:bg-slate-200 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-bold text-sm w-6 text-center text-slate-800 dark:text-slate-100">
                      {editingTableAnn.tableData?.length || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!editingTableAnn.tableData) return;
                        const cols = editingTableAnn.tableData[0]?.length || 1;
                        const newRow = new Array(cols).fill('');
                        setEditingTableAnn({ ...editingTableAnn, tableData: [...editingTableAnn.tableData, newRow] });
                      }}
                      className="px-2.5 py-1 bg-white dark:bg-zinc-800 border rounded font-bold hover:bg-slate-200 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Col count */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Columns (Vertical Lines)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (!editingTableAnn.tableData || editingTableAnn.tableData[0]?.length <= 1) return;
                        const newTable = editingTableAnn.tableData.map(r => r.slice(0, -1));
                        setEditingTableAnn({ ...editingTableAnn, tableData: newTable });
                      }}
                      className="px-2.5 py-1 bg-white dark:bg-zinc-800 border rounded font-bold hover:bg-slate-200 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-bold text-sm w-6 text-center text-slate-800 dark:text-slate-100">
                      {editingTableAnn.tableData?.[0]?.length || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!editingTableAnn.tableData) return;
                        const newTable = editingTableAnn.tableData.map(r => [...r, '']);
                        setEditingTableAnn({ ...editingTableAnn, tableData: newTable });
                      }}
                      className="px-2.5 py-1 bg-white dark:bg-zinc-800 border rounded font-bold hover:bg-slate-200 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Border Color */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Border Line Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editingTableAnn.color || '#000000'}
                      onChange={(e) => setEditingTableAnn({ ...editingTableAnn, color: e.target.value })}
                      className="w-8 h-8 rounded border cursor-pointer"
                    />
                    <span className="font-mono text-xs text-slate-700 dark:text-zinc-300">{editingTableAnn.color || '#000000'}</span>
                  </div>
                </div>

                {/* Font Size */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Text Font Size: {editingTableAnn.fontSize || 9}px
                  </label>
                  <input
                    type="range"
                    min="6"
                    max="18"
                    value={editingTableAnn.fontSize || 9}
                    onChange={(e) => setEditingTableAnn({ ...editingTableAnn, fontSize: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

              </div>

              {/* Quick Preset Templates */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="font-semibold text-slate-500 dark:text-zinc-400">Quick Office Templates:</span>
                
                {/* 1. Invoice Table */}
                <button
                  type="button"
                  onClick={() => {
                    setEditingTableAnn({
                      ...editingTableAnn,
                      color: '#000000',
                      strokeWidth: 1.5,
                      fontSize: 9,
                      tableData: [
                        ['S. No.', 'Item Description', 'Qty', 'Unit Price (₹)', 'Total Amount (₹)'],
                        ['1', 'Consultation & Advisory Services', '1', '5,000.00', '5,000.00'],
                        ['2', 'Document Processing & Verification', '2', '1,200.00', '2,400.00'],
                        ['3', 'GST / Taxes (18%)', '-', '-', '1,332.00']
                      ]
                    });
                  }}
                  className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-medium rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 cursor-pointer"
                >
                  🧾 Invoice / Billing (5 Cols)
                </button>

                {/* 2. Salary / Payslip Table */}
                <button
                  type="button"
                  onClick={() => {
                    setEditingTableAnn({
                      ...editingTableAnn,
                      color: '#000000',
                      strokeWidth: 1.5,
                      fontSize: 9,
                      tableData: [
                        ['Earnings Head', 'Amount (₹)', 'Deductions Head', 'Amount (₹)'],
                        ['Basic Pay', '35,000.00', 'Provident Fund (PF)', '1,800.00'],
                        ['House Rent Allowance (HRA)', '14,000.00', 'Professional Tax', '200.00'],
                        ['Special Allowance', '8,500.00', 'TDS / Income Tax', '2,500.00'],
                        ['Total Gross Salary', '57,500.00', 'Total Deductions', '4,500.00']
                      ]
                    });
                  }}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-medium rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-200 cursor-pointer"
                >
                  💼 Salary Payslip (4 Cols)
                </button>

                {/* 3. Employee Attendance Log */}
                <button
                  type="button"
                  onClick={() => {
                    setEditingTableAnn({
                      ...editingTableAnn,
                      color: '#000000',
                      strokeWidth: 1.5,
                      fontSize: 9,
                      tableData: [
                        ['Emp ID', 'Employee Name', 'Department', 'Shift Timing', 'Status'],
                        ['EMP-0101', 'Rahul Sharma', 'Operations', '09:00 AM - 06:00 PM', 'Present'],
                        ['EMP-0102', 'Priya Patel', 'Finance & HR', '09:00 AM - 06:00 PM', 'Present'],
                        ['EMP-0103', 'Amit Kumar', 'IT Support', '10:00 AM - 07:00 PM', 'On Leave']
                      ]
                    });
                  }}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-medium rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-200 cursor-pointer"
                >
                  👥 Attendance Log (5 Cols)
                </button>

                {/* 4. Task & Project Tracker */}
                <button
                  type="button"
                  onClick={() => {
                    setEditingTableAnn({
                      ...editingTableAnn,
                      color: '#000000',
                      strokeWidth: 1.5,
                      fontSize: 9,
                      tableData: [
                        ['Task ID', 'Task Description', 'Assigned To', 'Due Date', 'Status'],
                        ['TSK-101', 'Q3 Financial Audit Review', 'Finance Team', '30/08/2026', 'Completed'],
                        ['TSK-102', 'Client Agreement Renewal', 'Legal Dept.', '05/09/2026', 'In Progress'],
                        ['TSK-103', 'System Backup & Security Patch', 'IT Admin', '12/09/2026', 'Pending']
                      ]
                    });
                  }}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-medium rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-200 cursor-pointer"
                >
                  📝 Task Tracker (5 Cols)
                </button>

                {/* 5. Office Asset & Inventory Register */}
                <button
                  type="button"
                  onClick={() => {
                    setEditingTableAnn({
                      ...editingTableAnn,
                      color: '#000000',
                      strokeWidth: 1.5,
                      fontSize: 9,
                      tableData: [
                        ['Asset Tag', 'Equipment / Item Name', 'Location / Floor', 'Status / Condition'],
                        ['AST-2026-01', 'Dell Latitude Laptop (i7)', 'Floor 2 - Cabin 4', 'In Use - Good'],
                        ['AST-2026-02', 'Ergonomic Mesh Office Chair', 'Floor 1 - Desk 12', 'Assigned - Good'],
                        ['AST-2026-03', 'HP Laserjet Network Printer', 'Floor 2 - Print Hub', 'Active']
                      ]
                    });
                  }}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-medium rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-200 cursor-pointer"
                >
                  📦 Asset Register (4 Cols)
                </button>

              </div>

              {/* Interactive Grid Cell Spreadsheet Inputs */}
              <div className="overflow-x-auto border border-slate-300 dark:border-zinc-700 rounded-xl shadow-xs bg-white dark:bg-zinc-950 p-2">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-zinc-800">
                      <th className="p-2 border border-slate-300 dark:border-zinc-700 text-slate-400 w-10 text-center font-mono">#</th>
                      {editingTableAnn.tableData?.[0]?.map((_, ci) => (
                        <th key={ci} className="p-2 border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 font-bold min-w-[120px]">
                          Col {ci + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {editingTableAnn.tableData?.map((row, ri) => (
                      <tr key={ri} className={ri === 0 ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}>
                        <td className="p-2 border border-slate-300 dark:border-zinc-700 font-mono text-center text-slate-400 font-bold">
                          {ri === 0 ? 'Header' : `R${ri}`}
                        </td>
                        {row.map((cell, ci) => (
                          <td key={ci} className="p-1 border border-slate-300 dark:border-zinc-700">
                            <textarea
                              value={cell}
                              onChange={(e) => {
                                const val = e.target.value;
                                const nextData = editingTableAnn.tableData!.map((r, rIdx) => 
                                  rIdx === ri ? r.map((c, cIdx) => cIdx === ci ? val : c) : r
                                );
                                setEditingTableAnn({ ...editingTableAnn, tableData: nextData });
                              }}
                              rows={ri === 0 ? 1 : 2}
                              className={`w-full p-1.5 border rounded focus:ring-2 focus:ring-blue-500 outline-none text-xs ${
                                ri === 0 
                                  ? 'font-bold bg-white dark:bg-zinc-900 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-100' 
                                  : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200'
                              }`}
                              placeholder={ri === 0 ? `Header ${ci+1}` : `Row ${ri}, Col ${ci+1}`}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => {
                  onDeleteAnnotation(editingTableAnn.id);
                  setEditingTableAnn(null);
                }}
                className="px-4 py-2 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-semibold text-xs rounded-xl hover:bg-red-100 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" /> Delete Table
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTableAnn(null)}
                  className="px-4 py-2 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold text-xs rounded-xl hover:bg-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onUpdateAnnotation) {
                      onUpdateAnnotation(editingTableAnn.id, editingTableAnn);
                    }
                    setEditingTableAnn(null);
                  }}
                  className="px-5 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="h-4 w-4" /> Save Table Grid
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default function OnlinePdfEditor({ onAddRecentFile, user }: OnlinePdfEditorProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [pdfSource, setPdfSource] = useState<ArrayBuffer | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(100);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Text Editing
  const [parsedTextBlocks, setParsedTextBlocks] = useState<{ [pageNumber: number]: ParsedTextBlock[] }>({});
  const [editingBlock, setEditingBlock] = useState<ParsedTextBlock | null>(null);
  const [newTextValue, setNewTextValue] = useState<string>('');
  const [lastSelectedColor, setLastSelectedColor] = useState<string | null>(null);
  const [currentPageDimensions, setCurrentPageDimensions] = useState<{ width: number; height: number }>({ width: 595, height: 842 });
  const [textareaResized, setTextareaResized] = useState(false);

  useEffect(() => {
    setTextareaResized(false);
  }, [editingBlock?.id]);

  // Annotations & Drawing Tools
  const [activeTool, setActiveTool] = useState<AnnotationToolType>('select');
  const [strokeColor, setStrokeColor] = useState<string>('#0052cc');
  const [strokeWidth, setStrokeWidth] = useState<number>(2);
  const [selectedStamp, setSelectedStamp] = useState<string>('APPROVED');
  const [annotations, setAnnotations] = useState<{ [pageNumber: number]: PdfAnnotation[] }>({});
  const [tableConfig, setTableConfig] = useState({ rows: 3, cols: 3, color: '#000000', strokeWidth: 1.5, fontSize: 9 });
  const [showTableSelector, setShowTableSelector] = useState(false);
  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);

  // Modals & Image Uploads
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const signatureInputRef = useRef<HTMLInputElement | null>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [signatureMode, setSignatureMode] = useState<'draw' | 'type' | 'upload'>('draw');
  const [typedSignature, setTypedSignature] = useState('');
  const [uploadedSignatureUrl, setUploadedSignatureUrl] = useState<string | null>(null);
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isSigDrawing, setIsSigDrawing] = useState(false);

  const [isWatermarkModalOpen, setIsWatermarkModalOpen] = useState(false);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkColor, setWatermarkColor] = useState('#dc2626');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.25);
  const [watermarkTarget, setWatermarkTarget] = useState<'all' | 'current'>('all');

  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [deleteConfirmPageNum, setDeleteConfirmPageNum] = useState<number | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<ArrayBuffer[]>([]);

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        handleAddAnnotation({
          id: `ann-${currentPage}-${Date.now()}`,
          page: currentPage,
          type: 'image',
          points: [{ x: 25, y: 25 }, { x: 75, y: 65 }],
          color: '#000000',
          strokeWidth: 1,
          imageUrl: dataUrl
        });
        setSuccessMsg("Image added! Use any corner to resize, or click and drag to move.");
        setActiveTool('select');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyWatermark = async () => {
    if (!pdfSource) return;
    try {
      setIsProcessing(true);
      setError(null);
      setHistory(prev => [...prev, pdfSource.slice(0)]);

      const pdfBytes = new Uint8Array(pdfSource);
      const doc = await PDFDocument.load(pdfBytes);
      const pagesList = doc.getPages();
      const font = await doc.embedFont(StandardFonts.HelveticaBold);
      const { r, g, b } = hexToRgb(watermarkColor);

      const targetIndices = watermarkTarget === 'current' ? [currentPage - 1] : Array.from({ length: pagesList.length }, (_, i) => i);

      for (const pIdx of targetIndices) {
        if (pIdx >= 0 && pIdx < pagesList.length) {
          const page = pagesList[pIdx];
          const pageW = page.getWidth();
          const pageH = page.getHeight();

          page.drawText(watermarkText || 'CONFIDENTIAL', {
            x: pageW * 0.15,
            y: pageH * 0.45,
            size: 48,
            font,
            color: rgb(r, g, b),
            opacity: watermarkOpacity,
            rotate: degrees(-45),
          });
        }
      }

      const savedBytes = await doc.save();
      setPdfSource(savedBytes.buffer.slice(0));
      setIsWatermarkModalOpen(false);
      setSuccessMsg(`Watermark "${watermarkText}" applied successfully!`);
    } catch (e: any) {
      setError(`Failed to apply watermark: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const scrollToPage = (pageNum: number) => {
    setCurrentPage(pageNum);
    const pageEl = document.getElementById(`pdf-page-${pageNum}`);
    if (pageEl) {
      pageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleAddTextAt = (pctX: number, pctY: number, targetPageNum?: number) => {
    const pageToUse = targetPageNum || currentPage || 1;
    const pageW = currentPageDimensions.width || 595;
    const pageH = currentPageDimensions.height || 842;
    const fontSize = 9;
    
    // Enforce 1 cm margin (approx 28.3 points)
    const margin = 28.3;
    const marginPct = (margin / pageW) * 100;
    const defaultW = 25; // 25% of the page width
    
    // Clamp coordinates so it remains within margins
    const clampX = Math.max(marginPct, Math.min(100 - marginPct - defaultW, pctX));
    const clampY = Math.max(5, Math.min(92, pctY));
    const pdfX = (clampX / 100) * pageW;
    const pdfY = pageH - ((clampY / 100) * pageH) - fontSize;
    const pdfW = (defaultW / 100) * pageW;

    setTextareaResized(false);
    setEditingBlock({
      id: `new-${pageToUse}-${Date.now()}`,
      page: pageToUse,
      text: 'New Text',
      originalText: '',
      x: clampX,
      y: clampY,
      w: defaultW,
      h: 5,
      fontSize,
      fontFamily: 'Helvetica',
      fontName: 'Helvetica',
      color: lastSelectedColor || '#000000',
      isEdited: true,
      pdfX,
      pdfY,
      pdfW,
      pdfH: fontSize,
      pageWidth: pageW,
      pageHeight: pageH,
      isNew: true,
      bold: false,
      italic: false,
      align: 'left',
      autoHeight: true
    });
    setNewTextValue('New Text');
    setActiveTool('select');
  };

  const handleAddAnnotation = (ann: PdfAnnotation) => {
    setAnnotations(prev => {
      const existing = prev[ann.page] || [];
      return {
        ...prev,
        [ann.page]: [...existing, ann]
      };
    });
    setSuccessMsg(`Added ${ann.type} annotation on Page ${ann.page}`);
  };

  const handleDeleteAnnotation = (id: string) => {
    setAnnotations(prev => {
      const next: { [pageNumber: number]: PdfAnnotation[] } = {};
      Object.keys(prev).forEach(pKey => {
        const pNum = parseInt(pKey);
        next[pNum] = prev[pNum].filter(a => a.id !== id);
      });
      return next;
    });
  };

  const handleUpdateAnnotation = (id: string, newAnn: PdfAnnotation) => {
    setAnnotations(prev => {
      const next: { [pageNumber: number]: PdfAnnotation[] } = {};
      Object.keys(prev).forEach(pKey => {
        const pNum = parseInt(pKey);
        next[pNum] = prev[pNum].map(a => a.id === id ? newAnn : a);
      });
      return next;
    });
  };

  // Burn all drawn annotations onto the PDF file permanently
  const handleSaveAnnotationsToPdf = async () => {
    if (!pdfSource) return;
    const totalAnnCount = (Object.values(annotations) as PdfAnnotation[][]).reduce((acc, arr) => acc + (arr ? arr.length : 0), 0);
    if (totalAnnCount === 0) {
      setError("No drawings or annotations to save on the PDF.");
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Save to history before modifying
      setHistory(prev => [...prev, pdfSource.slice(0)]);

      const pdfBytes = new Uint8Array(pdfSource);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pagesList = pdfDoc.getPages();

      for (const [pStr, annList] of Object.entries(annotations)) {
        const pNum = parseInt(pStr);
        if (pNum >= 1 && pNum <= pagesList.length) {
          const page = pagesList[pNum - 1];
          const pageW = page.getWidth();
          const pageH = page.getHeight();

          const list = (annList || []) as PdfAnnotation[];
          for (const ann of list) {
            const { r, g, b } = hexToRgb(ann.color);
            const strokeRgb = rgb(r, g, b);

            if ((ann.type === 'draw' || ann.type === 'erase' || ann.type === 'line' || ann.type === 'connected_lines') && ann.points.length >= 2) {
              for (let i = 0; i < ann.points.length - 1; i++) {
                const p1 = ann.points[i];
                const p2 = ann.points[i + 1];
                page.drawLine({
                  start: { x: (p1.x / 100) * pageW, y: pageH - (p1.y / 100) * pageH },
                  end: { x: (p2.x / 100) * pageW, y: pageH - (p2.y / 100) * pageH },
                  thickness: ann.strokeWidth,
                  color: strokeRgb,
                });
              }
            } else if (ann.type === 'arrow' && ann.points.length >= 2) {
              const p1 = ann.points[0];
              const p2 = ann.points[ann.points.length - 1];
              const startX = (p1.x / 100) * pageW;
              const startY = pageH - (p1.y / 100) * pageH;
              const endX = (p2.x / 100) * pageW;
              const endY = pageH - (p2.y / 100) * pageH;

              page.drawLine({
                start: { x: startX, y: startY },
                end: { x: endX, y: endY },
                thickness: ann.strokeWidth,
                color: strokeRgb,
              });

              // Arrowhead filled triangle
              const angle = Math.atan2(endY - startY, endX - startX);
              const headLen = Math.max(12, ann.strokeWidth * 4 + 6);
              const xA = endX - headLen * Math.cos(angle - Math.PI / 6);
              const yA = endY - headLen * Math.sin(angle - Math.PI / 6);
              const xB = endX - headLen * Math.cos(angle + Math.PI / 6);
              const yB = endY - headLen * Math.sin(angle + Math.PI / 6);

              page.drawSvgPath(`M ${endX} ${endY} L ${xA} ${yA} L ${xB} ${yB} Z`, {
                color: strokeRgb,
                borderColor: strokeRgb,
                borderWidth: 0,
              });
            } else if ((ann.type === 'rectangle' || ann.type === 'cloud' || ann.type === 'highlight') && ann.points.length >= 2) {
              const minX = Math.min(ann.points[0].x, ann.points[1].x);
              const maxX = Math.max(ann.points[0].x, ann.points[1].x);
              const minY = Math.min(ann.points[0].y, ann.points[1].y);
              const maxY = Math.max(ann.points[0].y, ann.points[1].y);

              const rectX = (minX / 100) * pageW;
              const rectY = pageH - (maxY / 100) * pageH;
              const rectW = Math.max(4, ((maxX - minX) / 100) * pageW);
              const rectH = Math.max(4, ((maxY - minY) / 100) * pageH);

              if (ann.type === 'highlight') {
                page.drawRectangle({
                  x: rectX,
                  y: rectY,
                  width: rectW,
                  height: rectH,
                  color: rgb(0.99, 0.88, 0.28),
                  opacity: 0.4,
                });
              } else {
                page.drawRectangle({
                  x: rectX,
                  y: rectY,
                  width: rectW,
                  height: rectH,
                  borderColor: strokeRgb,
                  borderWidth: ann.strokeWidth,
                });
              }
            } else if (ann.type === 'circle' && ann.points.length >= 2) {
              const minX = Math.min(ann.points[0].x, ann.points[1].x);
              const maxX = Math.max(ann.points[0].x, ann.points[1].x);
              const minY = Math.min(ann.points[0].y, ann.points[1].y);
              const maxY = Math.max(ann.points[0].y, ann.points[1].y);

              const centerX = (((minX + maxX) / 2) / 100) * pageW;
              const centerY = pageH - ((((minY + maxY) / 2)) / 100) * pageH;
              const rx = Math.max(2, ((maxX - minX) / 2 / 100) * pageW);
              const ry = Math.max(2, ((maxY - minY) / 2 / 100) * pageH);

              page.drawEllipse({
                x: centerX,
                y: centerY,
                xScale: rx,
                yScale: ry,
                borderColor: strokeRgb,
                borderWidth: ann.strokeWidth,
              });
            } else if (ann.type === 'stamp' && ann.points.length >= 1) {
              const stampX = (ann.points[0].x / 100) * pageW;
              const stampY = pageH - (ann.points[0].y / 100) * pageH - 30;
              const stampText = ann.stampType || 'APPROVED';

              page.drawRectangle({
                x: stampX,
                y: stampY,
                width: 110,
                height: 34,
                borderColor: strokeRgb,
                borderWidth: 2,
                color: rgb(1, 1, 1),
              });
              page.drawRectangle({
                x: stampX + 3,
                y: stampY + 3,
                width: 104,
                height: 28,
                borderColor: strokeRgb,
                borderWidth: 1,
              });

              const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
              page.drawText(stampText, {
                x: stampX + 12,
                y: stampY + 10,
                size: 11,
                font,
                color: strokeRgb,
              });
            } else if (ann.type === 'check' && ann.points.length >= 1) {
              const ptX = (ann.points[0].x / 100) * pageW;
              const ptY = pageH - (ann.points[0].y / 100) * pageH - 12;
              const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
              page.drawText('✓', { x: ptX, y: ptY, size: 18, font, color: rgb(0.08, 0.63, 0.29) });
            } else if (ann.type === 'cross' && ann.points.length >= 1) {
              const ptX = (ann.points[0].x / 100) * pageW;
              const ptY = pageH - (ann.points[0].y / 100) * pageH - 12;
              const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
              page.drawText('✕', { x: ptX, y: ptY, size: 18, font, color: rgb(0.86, 0.14, 0.14) });
            } else if (ann.type === 'date' && ann.points.length >= 1) {
              const ptX = (ann.points[0].x / 100) * pageW;
              const ptY = pageH - (ann.points[0].y / 100) * pageH - 14;
              const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
              const dateText = ann.text || `${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`;
              page.drawText(dateText, { x: ptX, y: ptY, size: 12, font, color: strokeRgb });
            } else if (ann.type === 'blackout' && ann.points.length >= 2) {
              const minX = Math.min(ann.points[0].x, ann.points[1].x);
              const maxX = Math.max(ann.points[0].x, ann.points[1].x);
              const minY = Math.min(ann.points[0].y, ann.points[1].y);
              const maxY = Math.max(ann.points[0].y, ann.points[1].y);
              const rectX = (minX / 100) * pageW;
              const rectY = pageH - (maxY / 100) * pageH;
              const rectW = Math.max(4, ((maxX - minX) / 100) * pageW);
              const rectH = Math.max(4, ((maxY - minY) / 100) * pageH);
              page.drawRectangle({ x: rectX, y: rectY, width: rectW, height: rectH, color: rgb(0, 0, 0) });
            } else if (ann.type === 'whiteout' && ann.points.length >= 2) {
              const minX = Math.min(ann.points[0].x, ann.points[1].x);
              const maxX = Math.max(ann.points[0].x, ann.points[1].x);
              const minY = Math.min(ann.points[0].y, ann.points[1].y);
              const maxY = Math.max(ann.points[0].y, ann.points[1].y);
              const rectX = (minX / 100) * pageW;
              const rectY = pageH - (maxY / 100) * pageH;
              const rectW = Math.max(4, ((maxX - minX) / 100) * pageW);
              const rectH = Math.max(4, ((maxY - minY) / 100) * pageH);
              page.drawRectangle({ x: rectX, y: rectY, width: rectW, height: rectH, color: rgb(1, 1, 1) });
            } else if (ann.type === 'sticky' && ann.points.length >= 1) {
              const ptX = (ann.points[0].x / 100) * pageW;
              const ptY = pageH - (ann.points[0].y / 100) * pageH - 60;
              page.drawRectangle({ x: ptX, y: ptY, width: 120, height: 60, color: rgb(0.99, 0.94, 0.54), borderColor: rgb(0.96, 0.62, 0.04), borderWidth: 1 });
              const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
              page.drawText(ann.text || 'Sticky Note', { x: ptX + 5, y: ptY + 40, size: 10, font, color: rgb(0.27, 0.1, 0.01) });
            } else if (ann.type === 'table' && ann.points.length >= 1) {
              const p1 = ann.points[1] || { x: ann.points[0].x + 35, y: ann.points[0].y + 20 };
              const minX = Math.min(ann.points[0].x, p1.x);
              const maxX = Math.max(ann.points[0].x, p1.x);
              const minY = Math.min(ann.points[0].y, p1.y);
              const maxY = Math.max(ann.points[0].y, p1.y);
              
              const ptX = (minX / 100) * pageW;
              const ptY = pageH - (maxY / 100) * pageH;
              const ptW = Math.max(10, ((maxX - minX) / 100) * pageW);
              const ptH = Math.max(10, ((maxY - minY) / 100) * pageH);

              const tblColorHex = ann.color || '#000000';
              const { r: cR, g: cG, b: cB } = hexToRgb(tblColorHex);
              const borderRgb = rgb(cR, cG, cB);
              const borderThick = ann.strokeWidth || 1.5;

              // Outer table border & background
              page.drawRectangle({
                x: ptX,
                y: ptY,
                width: ptW,
                height: ptH,
                borderColor: borderRgb,
                borderWidth: borderThick,
                color: rgb(1, 1, 1)
              });
              
              const rows = ann.tableData?.length || 1;
              const cols = ann.tableData?.[0]?.length || 1;

              const rawColWidths = (ann.colWidths && ann.colWidths.length === cols)
                ? ann.colWidths
                : Array(cols).fill(100 / cols);
              const rawRowHeights = (ann.rowHeights && ann.rowHeights.length === rows)
                ? ann.rowHeights
                : Array(rows).fill(100 / rows);

              const colSum = rawColWidths.reduce((a, b) => a + b, 0) || 100;
              const rowSum = rawRowHeights.reduce((a, b) => a + b, 0) || 100;

              const colPts = rawColWidths.map(w => (w / colSum) * ptW);
              const rowPts = rawRowHeights.map(h => (h / rowSum) * ptH);

              const colXOffsets = [0];
              for (let i = 0; i < cols; i++) {
                colXOffsets.push(colXOffsets[i] + colPts[i]);
              }

              const rowYOffsets = [0];
              for (let j = 0; j < rows; j++) {
                rowYOffsets.push(rowYOffsets[j] + rowPts[j]);
              }

              // Draw Vertical Column Lines
              for (let i = 1; i < cols; i++) {
                const linePtX = ptX + colXOffsets[i];
                page.drawLine({
                  start: { x: linePtX, y: ptY },
                  end: { x: linePtX, y: ptY + ptH },
                  color: borderRgb,
                  thickness: borderThick
                });
              }

              // Draw Horizontal Row Lines
              for (let j = 1; j < rows; j++) {
                const linePtY = ptY + ptH - rowYOffsets[j];
                page.drawLine({
                  start: { x: ptX, y: linePtY },
                  end: { x: ptX + ptW, y: linePtY },
                  color: borderRgb,
                  thickness: borderThick
                });
              }

              const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
              const fontNorm = await pdfDoc.embedFont(StandardFonts.Helvetica);

              if (ann.tableData) {
                for (let ri = 0; ri < rows; ri++) {
                  for (let ci = 0; ci < cols; ci++) {
                    const cellText = ann.tableData[ri][ci] || '';
                    if (!cellText) continue;

                    const cellW = colPts[ci];
                    const cellH = rowPts[ri];

                    const cellX = ptX + colXOffsets[ci];
                    const cellY = ptY + ptH - rowYOffsets[ri + 1];
                    const cellPad = 3;
                    const availWidth = cellW - (cellPad * 2);
                    
                    const fontSize = ann.fontSize || Math.max(7, Math.min(10, cellH * 0.35));
                    const fontToUse = (ri === 0) ? fontBold : fontNorm;

                    const lines = wrapTextForPdf(cellText, availWidth, fontSize, fontToUse);
                    const lineSpacing = fontSize * 1.15;
                    let lineY = ptY + ptH - rowYOffsets[ri] - cellPad - (fontSize * 0.75);

                    for (const line of lines) {
                      if (lineY < cellY + 2) break; // stay inside cell bounds
                      page.drawText(line, {
                        x: cellX + cellPad,
                        y: lineY,
                        size: fontSize,
                        font: fontToUse,
                        color: ri === 0 ? rgb(0.06, 0.09, 0.16) : rgb(0.12, 0.16, 0.23)
                      });
                      lineY -= lineSpacing;
                    }
                  }
                }
              }
            } else if ((ann.type === 'image' || ann.type === 'signature') && ann.imageUrl) {
              try {
                const imgData = ann.imageUrl;
                let embeddedImg;
                if (imgData.includes('data:image/png')) {
                  const base64 = imgData.split(',')[1];
                  const imgBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
                  embeddedImg = await pdfDoc.embedPng(imgBytes);
                } else {
                  const base64 = imgData.split(',')[1];
                  const imgBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
                  embeddedImg = await pdfDoc.embedJpg(imgBytes);
                }
                const minX = Math.min(ann.points[0].x, ann.points[1]?.x || ann.points[0].x + 30);
                const minY = Math.min(ann.points[0].y, ann.points[1]?.y || ann.points[0].y + 20);
                const maxX = Math.max(ann.points[0].x, ann.points[1]?.x || ann.points[0].x + 30);
                const maxY = Math.max(ann.points[0].y, ann.points[1]?.y || ann.points[0].y + 20);
                const rectX = (minX / 100) * pageW;
                const rectY = pageH - (maxY / 100) * pageH;
                const rectW = Math.max(20, ((maxX - minX) / 100) * pageW);
                const rectH = Math.max(20, ((maxY - minY) / 100) * pageH);
                page.drawImage(embeddedImg, { x: rectX, y: rectY, width: rectW, height: rectH });
              } catch (eImg) {
                console.warn("Failed embedding image into PDF:", eImg);
              }
            }
          }
        }
      }

      const savedBytes = await pdfDoc.save();
      const updatedArrayBuffer = savedBytes.buffer;

      setPdfSource(updatedArrayBuffer.slice(0));
      setAnnotations({});
      setActiveTool('select');
      setSuccessMsg("Drawings & Annotations successfully saved into PDF!");
      onAddRecentFile({
        name: uploadedFile?.name || 'edited_document.pdf',
        size: formatBytes(updatedArrayBuffer.byteLength),
        type: 'application/pdf',
        toolUsed: 'Online PDF Editor'
      });
    } catch (e: any) {
      console.error("Error saving annotations to PDF:", e);
      setError(e.message || 'Failed saving annotations.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddPage = async (afterPageNum?: number) => {
    if (!pdfSource) return;
    try {
      setIsProcessing(true);
      setError(null);

      setHistory(prev => [...prev, pdfSource.slice(0)]);

      const pdfBytes = new Uint8Array(pdfSource);
      const doc = await PDFDocument.load(pdfBytes);
      
      const pageW = currentPageDimensions.width || 595;
      const pageH = currentPageDimensions.height || 842;
      
      const pageCount = doc.getPageCount();
      const insertIndex = afterPageNum !== undefined ? Math.min(afterPageNum, pageCount) : Math.min(currentPage, pageCount);
      
      doc.insertPage(insertIndex, [pageW, pageH]);
      
      const savedBytes = await doc.save();
      const cleanBuffer = savedBytes.buffer.slice(savedBytes.byteOffset, savedBytes.byteOffset + savedBytes.byteLength);

      const newPageNum = insertIndex + 1;

      // Shift annotations for pages > insertIndex
      setAnnotations(prev => {
        const next: { [pageNumber: number]: PdfAnnotation[] } = {};
        Object.keys(prev).forEach(pKey => {
          const pNum = parseInt(pKey, 10);
          if (pNum <= insertIndex) {
            next[pNum] = prev[pNum];
          } else {
            next[pNum + 1] = prev[pNum].map(ann => ({ ...ann, page: pNum + 1 }));
          }
        });
        return next;
      });

      // Shift text blocks for pages > insertIndex
      setParsedTextBlocks(prev => {
        const next: { [pageNumber: number]: ParsedTextBlock[] } = {};
        Object.keys(prev).forEach(pKey => {
          const pNum = parseInt(pKey, 10);
          if (pNum <= insertIndex) {
            next[pNum] = prev[pNum];
          } else {
            next[pNum + 1] = prev[pNum];
          }
        });
        return next;
      });

      setPdfSource(cleanBuffer);
      setCurrentPage(newPageNum);
      setEditingBlock(null);
      setSuccessMsg(`New blank page (Page ${newPageNum}) added below! Click "+ Add Text" or click anywhere on the page to add text.`);

      setTimeout(() => {
        scrollToPage(newPageNum);
      }, 350);

      onAddRecentFile({
        name: uploadedFile?.name || 'edited_document.pdf',
        size: formatBytes(cleanBuffer.byteLength),
        type: 'application/pdf',
        toolUsed: 'Online PDF Editor'
      });
    } catch (e: any) {
      console.error("Error adding page to PDF:", e);
      setError(e.message || 'Failed to add a new page.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeletePage = async (pageIndexToDelete: number, bypassConfirm = false) => {
    if (!pdfSource) return;

    if (!bypassConfirm) {
      setDeleteConfirmPageNum(pageIndexToDelete);
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      setHistory(prev => [...prev, pdfSource.slice(0)]);

      const pdfBytes = new Uint8Array(pdfSource);
      const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const pageCount = doc.getPageCount();

      if (pageCount <= 1) {
        // Reset single page to a clean blank page instead of breaking PDF document
        const newDoc = await PDFDocument.create();
        const pageW = currentPageDimensions.width || 595;
        const pageH = currentPageDimensions.height || 842;
        newDoc.addPage([pageW, pageH]);
        const savedBytes = await newDoc.save();
        const cleanBuffer = savedBytes.buffer.slice(savedBytes.byteOffset, savedBytes.byteOffset + savedBytes.byteLength);

        setPdfSource(cleanBuffer);
        setAnnotations({});
        setParsedTextBlocks({});
        setCurrentPage(1);
        setSuccessMsg(`Page ${pageIndexToDelete} cleared to a fresh blank page.`);
        return;
      }

      doc.removePage(pageIndexToDelete - 1);
      
      const savedBytes = await doc.save();
      const cleanBuffer = savedBytes.buffer.slice(savedBytes.byteOffset, savedBytes.byteOffset + savedBytes.byteLength);

      setPdfSource(cleanBuffer);

      // Shift annotations
      setAnnotations(prev => {
        const next: { [pageNumber: number]: PdfAnnotation[] } = {};
        Object.keys(prev).forEach(pKey => {
          const pNum = parseInt(pKey, 10);
          if (pNum < pageIndexToDelete) {
            next[pNum] = prev[pNum];
          } else if (pNum > pageIndexToDelete) {
            next[pNum - 1] = prev[pNum].map(ann => ({ ...ann, page: pNum - 1 }));
          }
        });
        return next;
      });

      // Shift parsed text blocks
      setParsedTextBlocks(prev => {
        const next: { [pageNumber: number]: ParsedTextBlock[] } = {};
        Object.keys(prev).forEach(pKey => {
          const pNum = parseInt(pKey, 10);
          if (pNum < pageIndexToDelete) {
            next[pNum] = prev[pNum];
          } else if (pNum > pageIndexToDelete) {
            next[pNum - 1] = prev[pNum];
          }
        });
        return next;
      });

      const nextCurrentPage = Math.max(1, Math.min(currentPage, doc.getPageCount()));
      setCurrentPage(nextCurrentPage);
      setEditingBlock(null);
      setSuccessMsg(`Page ${pageIndexToDelete} deleted successfully.`);
    } catch (e: any) {
      console.error("Error deleting page:", e);
      setError(e.message || 'Failed to delete page.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMovePage = async (fromIndex: number, toIndex: number) => {
    if (!pdfSource || pages.length <= 1) return;
    if (fromIndex < 1 || fromIndex > pages.length || toIndex < 1 || toIndex > pages.length || fromIndex === toIndex) return;

    try {
      setIsProcessing(true);
      setError(null);

      setHistory(prev => [...prev, pdfSource.slice(0)]);

      const pdfBytes = new Uint8Array(pdfSource);
      const srcDoc = await PDFDocument.load(pdfBytes);
      const count = srcDoc.getPageCount();

      const indices = Array.from({ length: count }, (_, i) => i);
      const [movedIndex] = indices.splice(fromIndex - 1, 1);
      indices.splice(toIndex - 1, 0, movedIndex);

      const newDoc = await PDFDocument.create();
      const copiedPages = await newDoc.copyPages(srcDoc, indices);
      copiedPages.forEach(p => newDoc.addPage(p));

      const savedBytes = await newDoc.save();
      const cleanBuffer = savedBytes.buffer.slice(savedBytes.byteOffset, savedBytes.byteOffset + savedBytes.byteLength);

      setPdfSource(cleanBuffer);

      setAnnotations(prev => {
        const next: { [pageNumber: number]: PdfAnnotation[] } = {};
        indices.forEach((old0Idx, new0Idx) => {
          const oldPageNum = old0Idx + 1;
          const newPageNum = new0Idx + 1;
          if (prev[oldPageNum]) {
            next[newPageNum] = prev[oldPageNum].map(ann => ({
              ...ann,
              page: newPageNum
            }));
          }
        });
        return next;
      });

      setParsedTextBlocks(prev => {
        const next: { [pageNumber: number]: ParsedTextBlock[] } = {};
        indices.forEach((old0Idx, new0Idx) => {
          const oldPageNum = old0Idx + 1;
          const newPageNum = new0Idx + 1;
          if (prev[oldPageNum]) {
            next[newPageNum] = prev[oldPageNum];
          }
        });
        return next;
      });

      setCurrentPage(toIndex);
      setSuccessMsg(`Moved Page ${fromIndex} to Page ${toIndex}!`);

      setTimeout(() => {
        scrollToPage(toIndex);
      }, 350);
    } catch (e: any) {
      console.error("Error reordering pages:", e);
      setError(e.message || 'Failed to reorder pages.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMovePageUp = (pageNum: number) => {
    if (pageNum > 1) {
      handleMovePage(pageNum, pageNum - 1);
    }
  };

  const handleMovePageDown = (pageNum: number) => {
    if (pageNum < pages.length) {
      handleMovePage(pageNum, pageNum + 1);
    }
  };

  // Load PDF on source change
  useEffect(() => {
    setParsedTextBlocks({});
    setEditingBlock(null);

    if (!pdfSource) {
      setPdfDoc(null);
      setPages([]);
      return;
    }

    const loadPdf = async () => {
      try {
        setIsProcessing(true);
        setError(null);
        
        const pdfjs = (window as any).pdfjsLib;
        if (!pdfjs) {
          throw new Error("PDF rendering engine is still loading. Please try again in 2 seconds.");
        }
        
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        
        const loadingTask = pdfjs.getDocument({ data: pdfSource.slice(0) });
        const pdf = await loadingTask.promise;
        
        setPdfDoc(pdf);
        
        const newPages = Array.from({ length: pdf.numPages }, (_, i) => ({
          id: i + 1,
          rotation: 0
        }));
        
        setPages(newPages);
        if (currentPage > pdf.numPages) {
          setCurrentPage(pdf.numPages || 1);
        }

        try {
          const firstPage = await pdf.getPage(1);
          const vp = firstPage.getViewport({ scale: 1.0 });
          setCurrentPageDimensions({ width: vp.width, height: vp.height });
        } catch (e) {
          // ignore
        }
      } catch (e: any) {
        setError(`Failed parsing PDF: ${e.message}`);
      } finally {
        setIsProcessing(false);
      }
    };

    loadPdf();
  }, [pdfSource]);

  const handleFileChange = (file: File) => {
    if (file.type !== 'application/pdf') {
      setError("Please upload a valid PDF document file.");
      return;
    }
    setUploadedFile(file);
    const fileReader = new FileReader();
    fileReader.onload = () => {
      const arrayBuffer = fileReader.result as ArrayBuffer;
      setPdfSource(arrayBuffer);
      setHistory([]);
      setSuccessMsg(`Loaded successfully: "${file.name}"`);
    };
    fileReader.readAsArrayBuffer(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleApplyTextEdit = async (options?: { customReplacementText?: string }) => {
    if (!editingBlock || !pdfSource) return;

    const blockToUse = { ...editingBlock };
    const textareaEl = document.getElementById('pdf-text-editor-textarea') as HTMLTextAreaElement | null;
    if (textareaEl && textareaResized) {
      const parentPage = textareaEl.closest('[data-pdf-page]') as HTMLElement | null;
      if (parentPage) {
        const pageW = parentPage.clientWidth;
        const pageH = parentPage.clientHeight;
        const textW = textareaEl.clientWidth;
        const textH = textareaEl.clientHeight;
        if (pageW > 0 && pageH > 0 && textW > 0 && textH > 0) {
          const newW = (textW / pageW) * 100;
          const newH = (textH / pageH) * 100;
          
          const origPageW = blockToUse.pageWidth || currentPageDimensions.width || 595;
          const origPageH = blockToUse.pageHeight || currentPageDimensions.height || 842;
          
          blockToUse.w = newW;
          blockToUse.h = newH;
          blockToUse.pdfW = (newW / 100) * origPageW;
          blockToUse.pdfH = (newH / 100) * origPageH;
        }
      }
    }

    const replacementVal = options && options.customReplacementText !== undefined 
      ? options.customReplacementText 
      : newTextValue;

    try {
      setIsProcessing(true);
      setError(null);

      setHistory(prev => [...prev, pdfSource.slice(0)]);

      const pdfBytes = new Uint8Array(pdfSource);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pagesList = pdfDoc.getPages();
      const targetPageNum = blockToUse.page || currentPage || 1;
      const idx = targetPageNum - 1;
      
      if (idx < 0 || idx >= pagesList.length) {
        throw new Error(`Invalid page index ${targetPageNum}`);
      }
      
      const page = pagesList[idx];

      const targetText = replacementVal || '';
      const baseFontSize = blockToUse.fontSize || 9;

      let font: any = null;
      try {
        font = await getAppropriateFont(
          pdfDoc,
          blockToUse.fontFamily,
          !!blockToUse.bold,
          !!blockToUse.italic,
          targetText
        );
      } catch (e) {
        console.warn("getAppropriateFont failed, falling back to standard Helvetica", e);
        font = await pdfDoc.embedFont(blockToUse.bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica);
      }

      const origPageW = blockToUse.pageWidth || currentPageDimensions.width || 595;
      const origPageH = blockToUse.pageHeight || currentPageDimensions.height || 842;

      // 1 cm margin = 28.3 points
      const margin = 28.3;
      
      // Enforce margin limits on width
      let finalPdfW = blockToUse.pdfW || (blockToUse.w / 100) * origPageW || 150;
      if (finalPdfW > origPageW - 2 * margin) {
        finalPdfW = origPageW - 2 * margin;
      }

      // Enforce margin limits on X coordinate
      let finalPdfX = blockToUse.pdfX;
      if (finalPdfX < margin) {
        finalPdfX = margin;
      }
      if (finalPdfX + finalPdfW > origPageW - margin) {
        finalPdfX = origPageW - margin - finalPdfW;
      }

      // Perform font-metrics word wrapping (Only wrap if explicit newlines exist)
      let wrappedLines: string[];
      if (!targetText.includes('\n')) {
        wrappedLines = [targetText];
      } else {
        wrappedLines = targetText.split('\n');
      }

      const descenderOffset = baseFontSize * 0.12;
      const ascenderOffset = baseFontSize * 0.72;
      const lineSpacing = baseFontSize * 1.15;

      const rectY = blockToUse.pdfY - ((wrappedLines.length - 1) * lineSpacing) - descenderOffset;
      const rectH = ((wrappedLines.length - 1) * lineSpacing) + ascenderOffset + descenderOffset;

      const rectX = finalPdfX;
      const rectW = finalPdfW;

      // Erase original text rectangle (Only the original text block's bounds, preserving table border lines and completely covering glyphs)
      if (!blockToUse.isNew && (blockToUse.pdfW > 0 || blockToUse.text || blockToUse.originalText)) {
        const origFontSize = blockToUse.fontSize || 9;
        
        // Font glyph vertical offsets:
        // Ascender (capitals, tall letters, currency symbols like ₹): 0.92 * fontSize above baseline
        // Descender ('g', 'j', 'p', 'q', 'y'): 0.28 * fontSize below baseline
        const origDescenderOffset = origFontSize * 0.28 + 1;
        const origAscenderOffset = origFontSize * 0.92 + 1;
        
        const origTextStr = blockToUse.originalText || blockToUse.text || '';
        let origTextMeasuredWidth = 0;
        try {
          if (font && origTextStr) {
            origTextMeasuredWidth = font.widthOfTextAtSize(origTextStr, origFontSize);
          }
        } catch (err) {
          origTextMeasuredWidth = origTextStr.length * origFontSize * 0.6;
        }

        let newTextMeasuredWidth = 0;
        try {
          if (font && targetText) {
            newTextMeasuredWidth = font.widthOfTextAtSize(targetText, baseFontSize);
          }
        } catch (err) {
          newTextMeasuredWidth = targetText.length * baseFontSize * 0.6;
        }

        const eraseWidth = Math.min(
          origPageW - margin - blockToUse.pdfX,
          Math.max(blockToUse.pdfW || 0, blockToUse.initialPdfW || 0, origTextMeasuredWidth, newTextMeasuredWidth) + 5
        );
        const origRectX = Math.max(0, blockToUse.pdfX - 1.5);
        const origRectY = blockToUse.pdfY - origDescenderOffset;
        const origRectH = origAscenderOffset + origDescenderOffset;

        page.drawRectangle({
          x: origRectX,
          y: origRectY,
          width: eraseWidth,
          height: origRectH,
          color: rgb(1, 1, 1),
        });
      }

      if (targetText && targetText.trim() !== '') {
        const { r, g, b } = hexToRgb(blockToUse.color);

        for (let i = 0; i < wrappedLines.length; i++) {
          const lineText = wrappedLines[i];
          if (lineText) {
            const lineY = blockToUse.pdfY - (i * lineSpacing);
            
            // Apply text alignment
            let lineX = finalPdfX;
            if (blockToUse.align === 'center' || blockToUse.align === 'right') {
              let lineW = 0;
              try {
                lineW = font.widthOfTextAtSize(lineText, baseFontSize);
              } catch (e) {
                lineW = lineText.length * baseFontSize * 0.6;
              }
              if (blockToUse.align === 'center') {
                lineX = finalPdfX + (finalPdfW - lineW) / 2;
              } else if (blockToUse.align === 'right') {
                lineX = finalPdfX + (finalPdfW - lineW);
              }
            }

            try {
              page.drawText(lineText, {
                x: lineX,
                y: lineY,
                size: baseFontSize,
                font: font,
                color: rgb(r, g, b),
              });
            } catch (drawErr) {
              console.warn("Primary drawText failed, retrying with sanitized text:", drawErr);
              try {
                page.drawText(sanitizeForWinAnsi(lineText), {
                  x: lineX,
                  y: lineY,
                  size: baseFontSize,
                  font: font,
                  color: rgb(r, g, b),
                });
              } catch (drawErr2) {
                console.warn("Custom font drawText failed, retrying with Helvetica fallback:", drawErr2);
                const fallbackFont = await pdfDoc.embedFont(
                  blockToUse.bold
                    ? (blockToUse.italic ? StandardFonts.HelveticaBoldOblique : StandardFonts.HelveticaBold)
                    : (blockToUse.italic ? StandardFonts.HelveticaOblique : StandardFonts.Helvetica)
                );
                page.drawText(sanitizeForWinAnsi(lineText), {
                  x: lineX,
                  y: lineY,
                  size: baseFontSize,
                  font: fallbackFont,
                  color: rgb(r, g, b),
                });
              }
            }
          }
        }
      }

      const savedBytes = await pdfDoc.save();
      const updatedArrayBuffer = savedBytes.buffer;
      
      setPdfSource(updatedArrayBuffer.slice(0));
      setEditingBlock(null);
      setTextareaResized(false);
      setSuccessMsg("PDF text updated successfully!");
      onAddRecentFile({
        name: uploadedFile?.name || 'edited_document.pdf',
        size: formatBytes(updatedArrayBuffer.byteLength),
        type: 'application/pdf',
        toolUsed: 'Online PDF Editor'
      });
    } catch (e: any) {
      console.error("Error saving text edit:", e);
      setError(e.message || 'An error occurred during editing.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!pdfSource) return;
    const blob = new Blob([pdfSource], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = uploadedFile?.name ? `edited_${uploadedFile.name}` : 'edited_document.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUndo = () => {
    // Check if there are unsaved annotations on the current page to undo first
    const currentAnn = annotations[currentPage] || [];
    if (currentAnn.length > 0) {
      setAnnotations(prev => {
        const updated = [...prev[currentPage]];
        updated.pop(); // Remove the last annotation
        return { ...prev, [currentPage]: updated };
      });
      setSuccessMsg("Last annotation removed.");
      return;
    }

    if (history.length === 0) return;
    
    setIsProcessing(true);
    try {
      const prevSource = history[history.length - 1];
      setPdfSource(prevSource);
      setHistory(prev => prev.slice(0, prev.length - 1));
      setEditingBlock(null);
      setSuccessMsg("Last action undone successfully!");
    } catch (e: any) {
      setError(`Failed to undo: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseDocument = () => {
    setUploadedFile(null);
    setPdfSource(null);
    setPdfDoc(null);
    setPages([]);
    setCurrentPage(1);
    setParsedTextBlocks({});
    setEditingBlock(null);
    setAnnotations({});
    setHistory([]);
    setSuccessMsg(null);
    setError(null);
  };

  // Tools list matching screenshot exactly
  const annotationToolsList = [
    { id: 'draw', label: 'Draw', icon: Pencil },
    { id: 'line', label: 'Line', icon: Minus },
    { id: 'arrow', label: 'Arrow', icon: MoveRight },
    { id: 'rectangle', label: 'Rectangle', icon: Square },
    { id: 'circle', label: 'Circle', icon: CircleIcon },
    { id: 'callout', label: 'Text callout', icon: MessageSquareText },
    { id: 'polygon', label: 'Polygon', icon: Hexagon },
    { id: 'cloud', label: 'Cloud', icon: Cloud },
    { id: 'connected_lines', label: 'Connected lines', icon: Spline },
    { id: 'stamp', label: 'Stamps palette', icon: Stamp },
    { id: 'highlight', label: 'Highlight', icon: Highlighter },
  ];

  const totalAnnotationCount = (Object.values(annotations) as PdfAnnotation[][]).reduce((acc, arr) => acc + (arr ? arr.length : 0), 0);

  return (
    <div className="w-full space-y-6">
      
      {/* Messages */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-500/25 text-rose-800 dark:text-rose-300 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed animate-fade-in">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-500" />
          <div>
            <h4 className="font-bold uppercase tracking-wide mb-0.5">Error processing request</h4>
            <p>{error}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed animate-fade-in">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500" />
          <div>
            <h4 className="font-bold uppercase tracking-wide mb-0.5">Success</h4>
            <p>{successMsg}</p>
          </div>
        </div>
      )}

      {!pdfSource ? (
        /* Upload Workstation */
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 flex flex-col items-center justify-center min-h-[350px] relative ${
            isDragOver 
              ? 'border-blue-500 bg-blue-500/5 shadow-inner' 
              : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl'
          }`}
        >
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileChange(e.target.files[0]);
              }
            }}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <div className="p-4 bg-blue-500/10 rounded-2xl mb-4 text-blue-600 animate-bounce-slow">
            <Upload className="h-10 w-10" />
          </div>
          <h2 className="font-display text-xl font-bold text-slate-800 dark:text-zinc-100 mb-2">
            Upload PDF Document
          </h2>
          <p className="text-xs text-slate-400 dark:text-zinc-500 max-w-sm leading-normal">
            Drag & drop your file here, or click to browse. Edit text, add shapes, freehand drawing, lines, arrows, clouds & stamps.
          </p>
        </div>
      ) : (
        /* PDF Viewer Container */
        <div className="bg-slate-100 dark:bg-zinc-950 rounded-3xl border border-slate-200 dark:border-zinc-850 overflow-hidden shadow-2xl flex flex-col">
          
          {/* Top Control Panel */}
          <div className="bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-850 px-6 py-4 flex flex-wrap gap-4 items-center justify-between">
            
            {/* File Info */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="font-display font-bold text-sm text-slate-800 dark:text-zinc-100 truncate max-w-[220px]">
                  {uploadedFile?.name || 'document.pdf'}
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  {uploadedFile ? formatBytes(pdfSource.byteLength) : 'Unknown size'} • {pages.length} Page{pages.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Pagination / Jump Controls */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-2.5 py-1">
              <button
                onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 rounded-lg cursor-pointer disabled:opacity-40 transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="h-4.5 w-4.5" />
              </button>
              <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-zinc-400 font-semibold px-1">
                <span>Page</span>
                <input
                  type="number"
                  min={1}
                  max={pages.length}
                  value={currentPage}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (val >= 1 && val <= pages.length) scrollToPage(val);
                  }}
                  className="w-10 text-center bg-transparent border-0 outline-none focus:ring-0 text-blue-600 font-bold p-0"
                />
                <span className="text-slate-400 font-normal">of {pages.length}</span>
              </div>
              <button
                onClick={() => scrollToPage(Math.min(pages.length, currentPage + 1))}
                disabled={currentPage === pages.length}
                className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 rounded-lg cursor-pointer disabled:opacity-40 transition-colors"
                title="Next Page"
              >
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-2 py-1">
              <button
                onClick={() => setZoom(prev => Math.max(50, prev - 10))}
                className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 rounded-lg cursor-pointer transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-[11px] font-mono font-bold text-slate-500 w-12 text-center">
                {zoom}%
              </span>
              <button
                onClick={() => setZoom(prev => Math.min(200, prev + 10))}
                className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 rounded-lg cursor-pointer transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <div className="h-3 w-px bg-slate-200 dark:bg-zinc-800 mx-1" />
              <button
                onClick={() => setZoom(100)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 rounded-lg cursor-pointer transition-colors"
                title="Reset Zoom"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsReorderModalOpen(true)}
                disabled={pages.length <= 1 || isProcessing}
                className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-3.5 py-2 rounded-xl text-xs cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
                title="Reorder PDF pages sequence (Move Up / Down)"
              >
                <ArrowUpDown className="h-4 w-4" />
                <span>Reorder Pages</span>
              </button>
              <button
                onClick={() => handleAddPage(pages.length)}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3.5 py-2 rounded-xl text-xs cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
                title="Add a new page at the bottom of this PDF"
              >
                <FilePlus className="h-4 w-4" />
                <span>+ Add Page</span>
              </button>
              <button
                onClick={() => setActiveTool(activeTool === 'text_box' ? 'select' : 'text_box')}
                className={`inline-flex items-center gap-1.5 font-semibold px-3.5 py-2 rounded-xl text-xs cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all ${
                  activeTool === 'text_box'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-400 scale-[1.02]'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
                title="Click here, then click anywhere on the page to add custom text"
              >
                <Type className="h-4 w-4" />
                <span>{activeTool === 'text_box' ? 'Click Page to Add' : '+ Add Text'}</span>
              </button>
              <button
                onClick={handleUndo}
                disabled={history.length === 0 && (!annotations[currentPage] || annotations[currentPage].length === 0)}
                className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-850 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-300 font-semibold px-3 py-2 rounded-xl text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all border border-slate-200/50 dark:border-zinc-700/50"
                title="Undo last action"
              >
                <Undo className="h-3.5 w-3.5 text-blue-500" />
                Undo
              </button>
              <button
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-xs cursor-pointer shadow-lg shadow-blue-500/10 hover:scale-[1.01] active:scale-[0.99] transition-all"
                title="Download updated PDF to your local computer"
              >
                <Download className="h-3.5 w-3.5" />
                Download PDF
              </button>
              <button
                onClick={handleCloseDocument}
                className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-850 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-800 cursor-pointer transition-all"
                title="Close Document"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

          </div>

          {/* Top Toolbar matching screenshot exactly (Sign, Erase, Image, Check, Cross, Circle, Table, Text Box, Date, Blackout, Highlight, Draw, Line, Arrow, Sticky, Watermark) */}
          <div className="bg-slate-100/90 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 px-4 py-2 flex items-center justify-start gap-1 sm:gap-2 overflow-x-auto select-none no-scrollbar shadow-inner">
            {/* Hidden image input */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleImageUpload(e.target.files[0]);
                }
              }}
            />

            {/* 0. Edit Mode */}
            <button
              onClick={() => setActiveTool('select')}
              className={`flex flex-col items-center justify-center min-w-[65px] px-2.5 py-1 rounded-xl cursor-pointer transition-all border ${
                activeTool === 'select'
                  ? 'bg-blue-600 text-white shadow ring-2 ring-blue-400 border-blue-600'
                  : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-100'
              }`}
              title="Select / Edit Text Mode (Click text in PDF to edit)"
            >
              <MousePointer className={`h-4 w-4 ${activeTool === 'select' ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
              <span className={`text-[11px] font-bold mt-0.5 ${activeTool === 'select' ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}>Edit Mode</span>
            </button>

            {/* 1. Sign */}
            <button
              onClick={() => setIsSignatureModalOpen(true)}
              className="flex flex-col items-center justify-center min-w-[52px] px-2.5 py-1 rounded-xl cursor-pointer transition-all text-slate-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800"
              title="Add Digital Signature"
            >
              <div className="flex items-center gap-0.5">
                <Feather className="h-4 w-4" />
                <ChevronDown className="h-3 w-3 opacity-60" />
              </div>
              <span className="text-[11px] font-semibold mt-0.5">Sign</span>
            </button>

            {/* 2. Erase */}
            <button
              onClick={() => setActiveTool('erase')}
              className={`flex flex-col items-center justify-center min-w-[50px] px-2.5 py-1 rounded-xl cursor-pointer transition-all ${
                activeTool === 'erase' ? 'bg-blue-600 text-white shadow' : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800'
              }`}
              title="Whiteout objects and text"
            >
              <Eraser className="h-4 w-4" />
              <span className="text-[11px] font-semibold mt-0.5">Erase</span>
            </button>

            {/* 3. Image */}
            <button
              onClick={() => imageInputRef.current?.click()}
              className="flex flex-col items-center justify-center min-w-[50px] px-2.5 py-1 rounded-xl cursor-pointer transition-all text-slate-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800"
              title="Insert Image onto PDF"
            >
              <ImageIcon className="h-4 w-4" />
              <span className="text-[11px] font-semibold mt-0.5">Image</span>
            </button>

            {/* 4. Check */}
            <button
              onClick={() => setActiveTool('check')}
              className={`flex flex-col items-center justify-center min-w-[50px] px-2.5 py-1 rounded-xl cursor-pointer transition-all ${
                activeTool === 'check' ? 'bg-blue-600 text-white shadow' : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800'
              }`}
              title="Place Checkmark symbol ✓"
            >
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[11px] font-semibold mt-0.5">Check</span>
            </button>

            {/* 5. Cross */}
            <button
              onClick={() => setActiveTool('cross')}
              className={`flex flex-col items-center justify-center min-w-[50px] px-2.5 py-1 rounded-xl cursor-pointer transition-all ${
                activeTool === 'cross' ? 'bg-blue-600 text-white shadow' : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800'
              }`}
              title="Place Cross symbol ✕"
            >
              <X className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              <span className="text-[11px] font-semibold mt-0.5">Cross</span>
            </button>

            {/* 6. Circle */}
            <button
              onClick={() => setActiveTool('circle')}
              className={`flex flex-col items-center justify-center min-w-[50px] px-2.5 py-1 rounded-xl cursor-pointer transition-all ${
                activeTool === 'circle' ? 'bg-blue-600 text-white shadow' : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800'
              }`}
              title="Draw Circle shape"
            >
              <CircleIcon className="h-4 w-4" />
              <span className="text-[11px] font-semibold mt-0.5">Circle</span>
            </button>

            {/* 7. Table / ग्रिड तालिका */}
            <button
              onClick={() => {
                setActiveTool('table');
                setShowTableSelector(true);
              }}
              className={`flex flex-col items-center justify-center min-w-[55px] px-2.5 py-1 rounded-xl cursor-pointer transition-all ${
                activeTool === 'table' ? 'bg-emerald-600 text-white shadow ring-2 ring-emerald-400' : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800'
              }`}
              title="Add Custom Resizable Table Structure (Rows & Columns)"
            >
              <Grid className="h-4 w-4 text-emerald-500" />
              <span className="text-[11px] font-bold mt-0.5">Table</span>
            </button>





            {/* 9. Date */}
            <button
              onClick={() => setActiveTool('date')}
              className={`flex flex-col items-center justify-center min-w-[50px] px-2.5 py-1 rounded-xl cursor-pointer transition-all ${
                activeTool === 'date' ? 'bg-blue-600 text-white shadow' : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800'
              }`}
              title="Insert Today Date"
            >
              <Calendar className="h-4 w-4" />
              <span className="text-[11px] font-semibold mt-0.5">Date</span>
            </button>

            {/* 10. Blackout */}
            <button
              onClick={() => setActiveTool('blackout')}
              className={`flex flex-col items-center justify-center min-w-[55px] px-2.5 py-1 rounded-xl cursor-pointer transition-all ${
                activeTool === 'blackout' ? 'bg-blue-600 text-white shadow' : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800'
              }`}
              title="Blackout Redact"
            >
              <EyeOff className="h-4 w-4" />
              <span className="text-[11px] font-semibold mt-0.5">Blackout</span>
            </button>

            {/* 10b. Whiteout */}
            <button
              onClick={() => setActiveTool('whiteout')}
              className={`flex flex-col items-center justify-center min-w-[55px] px-2.5 py-1 rounded-xl cursor-pointer transition-all ${
                activeTool === 'whiteout' ? 'bg-blue-600 text-white shadow' : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800'
              }`}
              title="Whiteout Redact"
            >
              <SquareDashed className="h-4 w-4 text-slate-800 dark:text-slate-200" />
              <span className="text-[11px] font-semibold mt-0.5">Whiteout</span>
            </button>

            {/* 11. Highlight */}
            <button
              onClick={() => setActiveTool('highlight')}
              className={`flex flex-col items-center justify-center min-w-[55px] px-2.5 py-1 rounded-xl cursor-pointer transition-all ${
                activeTool === 'highlight' ? 'bg-blue-600 text-white shadow' : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800'
              }`}
              title="Highlight Text"
            >
              <Highlighter className="h-4 w-4 text-amber-500" />
              <span className="text-[11px] font-semibold mt-0.5">Highlight</span>
            </button>

            {/* 12. Draw */}
            <button
              onClick={() => setActiveTool('draw')}
              className={`flex flex-col items-center justify-center min-w-[50px] px-2.5 py-1 rounded-xl cursor-pointer transition-all ${
                activeTool === 'draw' ? 'bg-blue-600 text-white shadow' : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800'
              }`}
              title="Freehand Draw"
            >
              <Pencil className="h-4 w-4" />
              <span className="text-[11px] font-semibold mt-0.5">Draw</span>
            </button>

            {/* 13. Line */}
            <button
              onClick={() => setActiveTool('line')}
              className={`flex flex-col items-center justify-center min-w-[50px] px-2.5 py-1 rounded-xl cursor-pointer transition-all ${
                activeTool === 'line' ? 'bg-blue-600 text-white shadow' : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800'
              }`}
              title="Straight Line"
            >
              <Minus className="h-4 w-4" />
              <span className="text-[11px] font-semibold mt-0.5">Line</span>
            </button>

            {/* 14. Arrow */}
            <button
              onClick={() => setActiveTool('arrow')}
              className={`flex flex-col items-center justify-center min-w-[50px] px-2.5 py-1 rounded-xl cursor-pointer transition-all ${
                activeTool === 'arrow' ? 'bg-blue-600 text-white shadow' : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800'
              }`}
              title="Draw Arrow"
            >
              <MoveRight className="h-4 w-4" />
              <span className="text-[11px] font-semibold mt-0.5">Arrow</span>
            </button>

            {/* 15. Sticky */}
            <button
              onClick={() => setActiveTool('sticky')}
              className={`flex flex-col items-center justify-center min-w-[50px] px-2.5 py-1 rounded-xl cursor-pointer transition-all ${
                activeTool === 'sticky' ? 'bg-blue-600 text-white shadow' : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800'
              }`}
              title="Add Sticky Note"
            >
              <Pin className="h-4 w-4 text-amber-600" />
              <span className="text-[11px] font-semibold mt-0.5">Sticky</span>
            </button>

            {/* 16. Watermark */}
            <button
              onClick={() => setIsWatermarkModalOpen(true)}
              className="flex flex-col items-center justify-center min-w-[65px] px-2.5 py-1 rounded-xl cursor-pointer transition-all text-slate-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800"
              title="Add Watermark"
            >
              <FileText className="h-4 w-4" />
              <span className="text-[11px] font-semibold mt-0.5">Watermark</span>
            </button>
          </div>

          {/* Table Configurator Panel Bar when Table Tool is Active */}
          {activeTool === 'table' && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800/60 px-4 py-2.5 flex items-center justify-between flex-wrap gap-3 text-xs font-sans animate-fade-in z-30">
              <div className="flex items-center gap-2">
                <Grid className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold text-slate-800 dark:text-slate-100">Table Tool Active:</span>
                <span className="text-slate-600 dark:text-slate-300">
                  Click anywhere on PDF page to place table (Horizontal = Row, Vertical = Column)
                </span>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                {/* Rows */}
                <div className="flex items-center gap-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Rows:</span>
                  <button
                    type="button"
                    onClick={() => setTableConfig(prev => ({ ...prev, rows: Math.max(1, prev.rows - 1) }))}
                    className="w-5 h-5 bg-white dark:bg-zinc-800 border rounded flex items-center justify-center font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-bold w-4 text-center text-slate-800 dark:text-slate-100">{tableConfig.rows}</span>
                  <button
                    type="button"
                    onClick={() => setTableConfig(prev => ({ ...prev, rows: Math.min(20, prev.rows + 1) }))}
                    className="w-5 h-5 bg-white dark:bg-zinc-800 border rounded flex items-center justify-center font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    +
                  </button>
                </div>

                {/* Cols */}
                <div className="flex items-center gap-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Columns:</span>
                  <button
                    type="button"
                    onClick={() => setTableConfig(prev => ({ ...prev, cols: Math.max(1, prev.cols - 1) }))}
                    className="w-5 h-5 bg-white dark:bg-zinc-800 border rounded flex items-center justify-center font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-bold w-4 text-center text-slate-800 dark:text-slate-100">{tableConfig.cols}</span>
                  <button
                    type="button"
                    onClick={() => setTableConfig(prev => ({ ...prev, cols: Math.min(15, prev.cols + 1) }))}
                    className="w-5 h-5 bg-white dark:bg-zinc-800 border rounded flex items-center justify-center font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    +
                  </button>
                </div>

                {/* Border Color */}
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Color:</span>
                  <input
                    type="color"
                    value={tableConfig.color || '#000000'}
                    onChange={(e) => setTableConfig(prev => ({ ...prev, color: e.target.value }))}
                    className="w-6 h-6 rounded cursor-pointer border"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleAddAnnotation({
                      id: `ann-${currentPage}-${Date.now()}`,
                      page: currentPage,
                      type: 'table',
                      points: [{ x: 10, y: 10 }, { x: 90, y: 35 }],
                      color: tableConfig.color || '#000000',
                      strokeWidth: tableConfig.strokeWidth || 1.5,
                      fontSize: tableConfig.fontSize || 9,
                      tableData: Array.from({ length: tableConfig.rows }, () =>
                        Array.from({ length: tableConfig.cols }, () => '')
                      )
                    });
                  }}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Insert Table
                </button>
              </div>
            </div>
          )}

          {/* Interactive Multi-Page Workspace */}
          <div className="flex-1 flex relative overflow-hidden min-h-[700px]">
            
            {/* Left Floating Annotation Sidebar (Matching Screenshot Exactly) */}
            <div className="relative z-40 p-3 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 flex flex-col items-center gap-3 shadow-lg select-none">
              
              {/* Select Mode with Bold Blue "Edit Mode" Label */}
              <div className="relative flex items-center">
                <button
                  onClick={() => setActiveTool('select')}
                  className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-center ${
                    activeTool === 'select'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-2 ring-blue-400'
                      : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100'
                  }`}
                  title="Select / Edit Text Mode"
                >
                  <MousePointer className="h-5 w-5" />
                </button>
                <div className="absolute left-full ml-2 z-30">
                  <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 shadow-md whitespace-nowrap animate-pulse-subtle">
                    Edit Mode
                  </span>
                </div>
              </div>

              {/* Primary Annotation Icon with Flyout Menu (Matching Image) */}
              <div className="relative">
                <button
                  onClick={() => setIsToolsDropdownOpen(!isToolsDropdownOpen)}
                  className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-center relative ${
                    activeTool !== 'select'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-2 ring-blue-400'
                      : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                  }`}
                  title="Drawing & Shape Annotation Tools"
                >
                  <Pencil className="h-5 w-5" />
                  <ChevronDown className="h-3 w-3 absolute -bottom-1 -right-1 bg-white dark:bg-zinc-900 rounded-full text-blue-600 border border-slate-200 dark:border-zinc-700" />
                </button>

                {/* Popover Flyout Menu (Exact Match to Screenshot) */}
                {isToolsDropdownOpen && (
                  <div className="absolute left-full top-0 ml-2 w-56 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-1.5 z-50 animate-fade-in text-xs font-medium text-slate-800 dark:text-zinc-200">
                    <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-100 dark:border-zinc-800 mb-1">
                      Annotation Tools
                    </div>
                    {annotationToolsList.map((tool) => {
                      const Icon = tool.icon;
                      const isSelected = activeTool === tool.id;
                      return (
                        <button
                          key={tool.id}
                          onClick={() => {
                            setActiveTool(tool.id as AnnotationToolType);
                            setIsToolsDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                              : 'hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="h-4 w-4 text-slate-500 dark:text-zinc-400" />
                            <span>{tool.label}</span>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="w-full h-px bg-slate-200 dark:bg-zinc-800 my-1" />

              {/* Stroke Color Picker */}
              <div className="relative group">
                <label 
                  className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 cursor-pointer block relative overflow-hidden shadow-sm hover:scale-105 transition-transform"
                  style={{ backgroundColor: strokeColor }}
                  title="Stroke Color"
                >
                  <input
                    type="color"
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </label>
              </div>

              {/* Stroke Thickness */}
              <button
                onClick={() => setStrokeWidth(prev => (prev >= 6 ? 1 : prev + 2))}
                className="p-2 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer font-mono font-bold text-[10px]"
                title="Change Stroke Thickness"
              >
                {strokeWidth}px
              </button>

              {/* Stamp Choice Selector if Stamp active */}
              {activeTool === 'stamp' && (
                <div className="flex flex-col items-center gap-1">
                  <select
                    value={selectedStamp}
                    onChange={(e) => setSelectedStamp(e.target.value)}
                    className="bg-slate-100 dark:bg-zinc-800 text-[10px] font-bold text-slate-700 dark:text-zinc-300 rounded-lg p-1 border border-slate-200 dark:border-zinc-700 outline-none cursor-pointer"
                  >
                    <option value="APPROVED">APPROVED</option>
                    <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="FINAL">FINAL</option>
                    <option value="REJECTED">REJECTED</option>
                    <option value="SIGN HERE">SIGN HERE</option>
                  </select>
                </div>
              )}

              {/* Apply Drawings to PDF button */}
              {totalAnnotationCount > 0 && (
                <button
                  onClick={handleSaveAnnotationsToPdf}
                  disabled={isProcessing}
                  className="mt-auto p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer shadow-lg shadow-blue-500/20 transition-all flex flex-col items-center gap-1 text-[9px] font-bold text-center"
                  title="Burn drawings onto PDF"
                >
                  <Save className="h-4 w-4" />
                  <span>Save All</span>
                </button>
              )}

            </div>

            {/* Document Viewer Scroll View */}
            <div className="flex-1 flex flex-col items-center p-6 bg-slate-200/50 dark:bg-zinc-950/50 relative overflow-y-auto max-h-[800px] select-none">
              {isProcessing && (
                <div className="sticky top-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-4 py-2.5 rounded-full shadow-2xl border border-blue-500/30 flex items-center gap-2.5 z-50 animate-fade-in mb-4">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 tracking-wide uppercase">
                    Processing PDF...
                  </span>
                </div>
              )}

              {/* Vertical Stack of All PDF Pages */}
              <div className="w-full flex flex-col items-center gap-4">
                {pages.map((p) => (
                  <SinglePdfPage
                    key={`page-card-${p.id}`}
                    pageNum={p.id}
                    totalPages={pages.length}
                    pdfDoc={pdfDoc}
                    zoom={zoom}
                    parsedBlocks={parsedTextBlocks[p.id] || []}
                    editingBlock={editingBlock}
                    newTextValue={newTextValue}
                    isProcessing={isProcessing}
                    activeTool={activeTool}
                    strokeColor={strokeColor}
                    strokeWidth={strokeWidth}
                    selectedStamp={selectedStamp}
                    pageAnnotations={annotations[p.id] || []}
                    onAddAnnotation={handleAddAnnotation}
                    onUpdateAnnotation={handleUpdateAnnotation}
                    onDeleteAnnotation={handleDeleteAnnotation}
                    onParsedBlocks={(pNum, blocks) => {
                      setParsedTextBlocks(prev => ({ ...prev, [pNum]: blocks }));
                    }}
                    setEditingBlock={setEditingBlock}
                    setNewTextValue={setNewTextValue}
                    handleAddTextAt={handleAddTextAt}
                    handleApplyTextEdit={handleApplyTextEdit}
                    handleDeletePage={handleDeletePage}
                    handleAddPage={handleAddPage}
                    handleMovePageUp={handleMovePageUp}
                    handleMovePageDown={handleMovePageDown}
                    setLastSelectedColor={(col) => setLastSelectedColor(col)}
                    tableConfig={tableConfig}
                    setActiveTool={setActiveTool}
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    textareaResized={textareaResized}
                    setTextareaResized={setTextareaResized}
                  />
                ))}
              </div>

            </div>

          </div>

        </div>
      )}

      {/* Signature Modal */}
      {isSignatureModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Feather className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-base text-slate-800 dark:text-zinc-100">Add Digital Signature</h3>
              </div>
              <button 
                onClick={() => setIsSignatureModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl">
              <button
                onClick={() => setSignatureMode('draw')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  signatureMode === 'draw' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow' : 'text-slate-500'
                }`}
              >
                Draw
              </button>
              <button
                onClick={() => setSignatureMode('type')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  signatureMode === 'type' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow' : 'text-slate-500'
                }`}
              >
                Type
              </button>
              <button
                onClick={() => setSignatureMode('upload')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  signatureMode === 'upload' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow' : 'text-slate-500'
                }`}
              >
                Upload
              </button>
            </div>

            {signatureMode === 'draw' ? (
              <div className="space-y-2">
                <div className="border border-slate-200 dark:border-zinc-700 rounded-2xl bg-slate-50 dark:bg-zinc-950 p-2 relative">
                  <canvas
                    ref={sigCanvasRef}
                    width={360}
                    height={140}
                    className="w-full h-36 bg-white dark:bg-zinc-900 rounded-xl cursor-crosshair border border-slate-100 dark:border-zinc-800"
                    onMouseDown={(e) => {
                      const canvas = sigCanvasRef.current;
                      if (!canvas) return;
                      const ctx = canvas.getContext('2d');
                      if (!ctx) return;
                      const rect = canvas.getBoundingClientRect();
                      ctx.beginPath();
                      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                      ctx.strokeStyle = strokeColor;
                      ctx.lineWidth = 2.5;
                      ctx.lineCap = 'round';
                      setIsSigDrawing(true);
                    }}
                    onMouseMove={(e) => {
                      if (!isSigDrawing) return;
                      const canvas = sigCanvasRef.current;
                      if (!canvas) return;
                      const ctx = canvas.getContext('2d');
                      if (!ctx) return;
                      const rect = canvas.getBoundingClientRect();
                      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                      ctx.stroke();
                    }}
                    onMouseUp={() => setIsSigDrawing(false)}
                  />
                  <button
                    onClick={() => {
                      const canvas = sigCanvasRef.current;
                      if (canvas) {
                        const ctx = canvas.getContext('2d');
                        ctx?.clearRect(0, 0, canvas.width, canvas.height);
                      }
                    }}
                    className="absolute top-4 right-4 text-[10px] font-bold text-rose-500 hover:underline bg-white/80 px-2 py-0.5 rounded"
                  >
                    Clear Canvas
                  </button>
                </div>
              </div>
            ) : signatureMode === 'type' ? (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Type your name..."
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 font-serif text-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <div className="space-y-2 flex flex-col items-center justify-center">
                <input
                  ref={signatureInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          setUploadedSignatureUrl(event.target.result as string);
                        }
                      };
                      reader.readAsDataURL(e.target.files[0]);
                    }
                  }}
                />
                {!uploadedSignatureUrl ? (
                  <button
                    onClick={() => signatureInputRef.current?.click()}
                    className="w-full py-8 border-2 border-dashed border-slate-300 dark:border-zinc-700 rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors flex flex-col items-center justify-center gap-2"
                  >
                    <ImageIcon className="h-8 w-8 opacity-50" />
                    <span className="text-sm font-semibold">Click to upload photo</span>
                  </button>
                ) : (
                  <div className="relative w-full h-36 border border-slate-200 dark:border-zinc-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-zinc-900 flex items-center justify-center">
                    <img src={uploadedSignatureUrl} alt="Uploaded signature" className="max-w-full max-h-full object-contain" />
                    <button
                      onClick={() => setUploadedSignatureUrl(null)}
                      className="absolute top-2 right-2 bg-rose-500 text-white rounded-full p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsSignatureModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  let dataUrl = '';
                  if (signatureMode === 'draw') {
                    // Check if canvas is empty
                    const canvas = sigCanvasRef.current;
                    if (canvas) {
                      const ctx = canvas.getContext('2d');
                      const pixelBuffer = new Uint32Array(ctx!.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
                      const isBlank = !pixelBuffer.some(color => color !== 0);
                      if (!isBlank) {
                        dataUrl = canvas.toDataURL();
                      }
                    }
                  } else if (signatureMode === 'type' && typedSignature.trim()) {
                    const canvas = document.createElement('canvas');
                    canvas.width = 300;
                    canvas.height = 100;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      ctx.clearRect(0, 0, 300, 100);
                      ctx.font = '32px cursive, Georgia, serif';
                      ctx.fillStyle = strokeColor;
                      ctx.fillText(typedSignature, 20, 60);
                      dataUrl = canvas.toDataURL();
                    }
                  } else if (signatureMode === 'upload' && uploadedSignatureUrl) {
                    dataUrl = uploadedSignatureUrl;
                  }

                  if (dataUrl) {
                    handleAddAnnotation({
                      id: `ann-${currentPage}-${Date.now()}`,
                      page: currentPage,
                      type: 'signature',
                      points: [{ x: 30, y: 70 }, { x: 70, y: 88 }],
                      color: strokeColor,
                      strokeWidth: 2,
                      imageUrl: dataUrl
                    });
                    setIsSignatureModalOpen(false);
                    setSuccessMsg("Signature added! Use any corner to resize, or click and drag to move.");
                    setActiveTool('select');
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20"
              >
                Insert Signature
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Watermark Modal */}
      {isWatermarkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-base text-slate-800 dark:text-zinc-100">Add Watermark</h3>
              </div>
              <button 
                onClick={() => setIsWatermarkModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Watermark Text</label>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder="e.g. CONFIDENTIAL / DO NOT COPY"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Color</label>
                  <input
                    type="color"
                    value={watermarkColor}
                    onChange={(e) => setWatermarkColor(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 dark:border-zinc-700 cursor-pointer p-0"
                  />
                </div>
                <div className="flex-1">
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Opacity</label>
                  <input
                    type="range"
                    min={0.05}
                    max={0.8}
                    step={0.05}
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-[10px] text-slate-400 text-right">{Math.round(watermarkOpacity * 100)}%</div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Target Pages</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setWatermarkTarget('all')}
                    className={`flex-1 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                      watermarkTarget === 'all' ? 'border-blue-600 bg-blue-50 dark:bg-blue-950 text-blue-600' : 'border-slate-200 dark:border-zinc-800 text-slate-600'
                    }`}
                  >
                    All Pages
                  </button>
                  <button
                    onClick={() => setWatermarkTarget('current')}
                    className={`flex-1 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                      watermarkTarget === 'current' ? 'border-blue-600 bg-blue-50 dark:bg-blue-950 text-blue-600' : 'border-slate-200 dark:border-zinc-800 text-slate-600'
                    }`}
                  >
                    Current Page ({currentPage})
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsWatermarkModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyWatermark}
                disabled={isProcessing}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                Apply Watermark
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reorder Pages Modal */}
      {isReorderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-bold text-base text-slate-800 dark:text-zinc-100">
                  Reorder PDF Pages
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsReorderModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              <p className="text-xs text-slate-500 dark:text-zinc-400 mb-2">
                Move pages up or down to adjust your document sequence.
              </p>
              {pages.map((p) => (
                <div
                  key={`reorder-item-${p.id}`}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-850 border border-slate-200 dark:border-zinc-700/60 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 flex items-center justify-center bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold font-mono text-xs rounded-lg">
                      {p.id}
                    </span>
                    <div>
                      <span className="font-medium text-xs text-slate-800 dark:text-zinc-200">
                        Page {p.id}
                      </span>
                      {annotations[p.id]?.length > 0 && (
                        <span className="ml-2 text-[10px] text-blue-500 font-semibold">
                          ({annotations[p.id].length} ann)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleMovePageUp(p.id)}
                      disabled={p.id === 1 || isProcessing}
                      className="p-1.5 bg-white dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-slate-700 dark:text-zinc-200 hover:text-blue-600 rounded-lg border border-slate-200 dark:border-zinc-700 disabled:opacity-30 cursor-pointer transition-colors"
                      title="Move Up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMovePageDown(p.id)}
                      disabled={p.id === pages.length || isProcessing}
                      className="p-1.5 bg-white dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-slate-700 dark:text-zinc-200 hover:text-blue-600 rounded-lg border border-slate-200 dark:border-zinc-700 disabled:opacity-30 cursor-pointer transition-colors"
                      title="Move Down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePage(p.id)}
                      disabled={isProcessing}
                      className="p-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-200/60 dark:border-rose-900/40 cursor-pointer transition-colors ml-1"
                      title="Delete Page"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 flex justify-end">
              <button
                type="button"
                onClick={() => setIsReorderModalOpen(false)}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Page Confirmation Modal */}
      {deleteConfirmPageNum !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center">
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/60 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100 mb-2">
              {pages.length <= 1 ? `Clear Page 1?` : `Delete Page ${deleteConfirmPageNum}?`}
            </h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 mb-6">
              {pages.length <= 1
                ? 'This will clear all content on Page 1 and reset it to a clean blank page.'
                : `Are you sure you want to permanently delete Page ${deleteConfirmPageNum} from this document? You can undo this action anytime.`
              }
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmPageNum(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = deleteConfirmPageNum;
                  setDeleteConfirmPageNum(null);
                  handleDeletePage(target, true);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
              >
                {pages.length <= 1 ? 'Clear Page' : 'Yes, Delete Page'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
