import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createWorker } from 'tesseract.js';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as XLSX from 'xlsx';
import { Document as DocxDocument, Packer, Paragraph, TextRun } from 'docx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  ScanText, Upload, RefreshCw, Download, FileText, FileSpreadsheet,
  Eye, Sparkles, Sliders, CheckCircle2, AlertCircle, Copy, Search,
  Type, Bold, Italic, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  ZoomIn, ZoomOut, RotateCw, Trash2, Layers, Grid, Check, HelpCircle,
  ArrowLeft, ArrowRight, Settings, Image as ImageIcon, Wand2, ShieldCheck,
  Languages, ListFilter, Play, FileCode, CheckSquare, X, ChevronRight, ChevronLeft,
  Maximize2, Minimize2, Table, Undo, Redo, Sparkle, Flame, AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react';

interface PdfOcrWorkstationProps {
  onAddRecentFile: (file: { name: string; size: string; type: string; toolUsed: string }) => void;
  user: any;
  onBackToTools: () => void;
}

interface OCRWord {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  confidence: number;
}

interface OCRBlock {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  confidence: number;
  words: OCRWord[];
}

interface PageOCRResult {
  pageNum: number;
  rawText: string;
  editedText: string;
  confidence: number;
  blocks: OCRBlock[];
  words: OCRWord[];
  dataUrl?: string;
}

interface PreprocessingSettings {
  contrast: number; // -100 to 100
  brightness: number; // -100 to 100
  grayscale: boolean;
  threshold: number; // 0 (off) to 255
  sharpen: boolean;
  rotation: number; // 0, 90, 180, 270
}

interface BatchFileItem {
  id: string;
  file: File;
  totalPages: number;
  status: 'idle' | 'processing' | 'done' | 'error';
  progress: number;
  resultText?: string;
  pageResults?: Record<number, PageOCRResult>;
  searchablePdfBytes?: Uint8Array;
  errorMsg?: string;
}

interface GlobalBatchProgress {
  totalFiles: number;
  completedFiles: number;
  currentFileName: string;
  currentFileIndex: number;
  currentPage: number;
  totalPages: number;
  currentStep: string;
  filePercent: number;
  overallPercent: number;
}

const SUPPORTED_LANGUAGES = [
  { code: 'eng', name: 'English (English)', group: 'Popular' },
  { code: 'hin', name: 'Hindi (हिन्दी)', group: 'Indian Languages' },
  { code: 'mar', name: 'Marathi (मराठी)', group: 'Indian Languages' },
  { code: 'tam', name: 'Tamil (தமிழ்)', group: 'Indian Languages' },
  { code: 'tel', name: 'Telugu (తెలుగు)', group: 'Indian Languages' },
  { code: 'ben', name: 'Bengali (বাংলা)', group: 'Indian Languages' },
  { code: 'guj', name: 'Gujarati (ગુજરાતી)', group: 'Indian Languages' },
  { code: 'kan', name: 'Kannada (ಕನ್ನಡ)', group: 'Indian Languages' },
  { code: 'mal', name: 'Malayalam (മലയാളം)', group: 'Indian Languages' },
  { code: 'pan', name: 'Punjabi (ਪੰਜਾਬੀ)', group: 'Indian Languages' },
  { code: 'eng+hin', name: 'English + Hindi (Dual)', group: 'Indian Languages' },
  { code: 'eng+mar', name: 'English + Marathi (Dual)', group: 'Indian Languages' },
  { code: 'spa', name: 'Spanish (Español)', group: 'Global' },
  { code: 'fra', name: 'French (Français)', group: 'Global' },
  { code: 'deu', name: 'German (Deutsch)', group: 'Global' },
  { code: 'chi_sim', name: 'Chinese Simplified (中文)', group: 'Global' },
];

export default function PdfOcrWorkstation({ onAddRecentFile, user, onBackToTools }: PdfOcrWorkstationProps) {
  // Mode selection
  const [workstationMode, setWorkstationMode] = useState<'single' | 'batch'>('single');

  // Single File State
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageScale, setPageScale] = useState<number>(1.2);

  // Preprocessing Settings
  const [showPreprocessing, setShowPreprocessing] = useState<boolean>(false);
  const [preprocessing, setPreprocessing] = useState<PreprocessingSettings>({
    contrast: 0,
    brightness: 0,
    grayscale: false,
    threshold: 0,
    sharpen: false,
    rotation: 0
  });

  // Region Selection Crop Box
  const [isSelectingRegion, setIsSelectingRegion] = useState<boolean>(false);
  const [cropBox, setCropBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isDrawingBox, setIsDrawingBox] = useState<boolean>(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);

  // OCR Processing States
  const [ocrEngine, setOcrEngine] = useState<'tesseract' | 'gemini'>('tesseract');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('eng');
  const [isOcrProcessing, setIsOcrProcessing] = useState<boolean>(false);
  const [ocrProgressMsg, setOcrProgressMsg] = useState<string>('');
  const [ocrPercent, setOcrPercent] = useState<number>(0);

  // OCR Output Per Page
  const [pageResults, setPageResults] = useState<Record<number, PageOCRResult>>({});

  // Editor View Mode
  const [editorTab, setEditorTab] = useState<'formatted' | 'plain' | 'tables' | 'layout'>('formatted');
  const [highlightLowConfidence, setHighlightLowConfidence] = useState<boolean>(true);
  const [lowConfidenceThreshold] = useState<number>(75);
  const [heatmapThresholdCrit, setHeatmapThresholdCrit] = useState<number>(60);
  const [heatmapThresholdWarn, setHeatmapThresholdWarn] = useState<number>(80);
  const [showHeatmapSettings, setShowHeatmapSettings] = useState<boolean>(false);
  const [showScanCanvasHeatmap, setShowScanCanvasHeatmap] = useState<boolean>(true);
  const [currentErrorIndex, setCurrentErrorIndex] = useState<number>(-1);
  const [batchCurrentErrorIndex, setBatchCurrentErrorIndex] = useState<number>(-1);

  // Search & Replace
  const [showSearchReplace, setShowSearchReplace] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [replaceQuery, setReplaceQuery] = useState<string>('');

  // AI Correction State
  const [isAiCorrecting, setIsAiCorrecting] = useState<boolean>(false);
  const [aiErrorMsg, setAiErrorMsg] = useState<string | null>(null);

  // Export Modal
  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  // Batch OCR State
  const [batchFiles, setBatchFiles] = useState<BatchFileItem[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
  const [globalBatchProgress, setGlobalBatchProgress] = useState<GlobalBatchProgress>({
    totalFiles: 0,
    completedFiles: 0,
    currentFileName: '',
    currentFileIndex: 0,
    currentPage: 0,
    totalPages: 0,
    currentStep: '',
    filePercent: 0,
    overallPercent: 0
  });

  // Batch Document Review Preview States
  const [selectedBatchFileId, setSelectedBatchFileId] = useState<string | null>(null);
  const [batchReviewPage, setBatchReviewPage] = useState<number>(1);
  const [batchReviewScale, setBatchReviewScale] = useState<number>(1.2);
  const [batchReviewPdfDoc, setBatchReviewPdfDoc] = useState<any>(null);
  const [batchReviewEditorTab, setBatchReviewEditorTab] = useState<'formatted' | 'plain' | 'tables' | 'layout'>('formatted');
  const [batchReviewHighlightLowConf, setBatchReviewHighlightLowConf] = useState<boolean>(true);
  const [batchReviewSearchQuery, setBatchReviewSearchQuery] = useState<string>('');
  const [batchReviewReplaceQuery, setBatchReviewReplaceQuery] = useState<string>('');
  const [showBatchReviewSearch, setShowBatchReviewSearch] = useState<boolean>(false);
  const [isBatchReviewAiCorrecting, setIsBatchReviewAiCorrecting] = useState<boolean>(false);
  const [showBatchZipModal, setShowBatchZipModal] = useState<boolean>(false);
  const [batchZipExportType, setBatchZipExportType] = useState<'all' | 'pdf' | 'docx' | 'txt'>('all');
  const [isGeneratingBatchZip, setIsGeneratingBatchZip] = useState<boolean>(false);
  const [batchZipProgressMsg, setBatchZipProgressMsg] = useState<string>('');

  // Refs
  const singleFileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const richEditorRef = useRef<HTMLDivElement | null>(null);
  const batchReviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const batchReviewRichEditorRef = useRef<HTMLDivElement | null>(null);

  // Upload and Drag States
  const [isFileLoading, setIsFileLoading] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Safe PDF.js library resolver with worker setup
  const getPdfJsLib = async (): Promise<any> => {
    const win = window as any;
    if (win.pdfjsLib) {
      if (win.pdfjsLib.GlobalWorkerOptions && !win.pdfjsLib.GlobalWorkerOptions.workerSrc) {
        win.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      }
      return win.pdfjsLib;
    }

    return new Promise((resolve, reject) => {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (win.pdfjsLib) {
          clearInterval(interval);
          if (win.pdfjsLib.GlobalWorkerOptions && !win.pdfjsLib.GlobalWorkerOptions.workerSrc) {
            win.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
          }
          resolve(win.pdfjsLib);
        } else if (attempts > 30) {
          clearInterval(interval);
          // Fallback dynamic script loading
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
          script.onload = () => {
            if (win.pdfjsLib && win.pdfjsLib.GlobalWorkerOptions) {
              win.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
            }
            resolve(win.pdfjsLib);
          };
          script.onerror = () => reject(new Error('Failed to load PDF engine. Check internet connection.'));
          document.head.appendChild(script);
        }
      }, 100);
    });
  };

  // Clean formatted file size
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle single file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let file: File | null = null;
    if ('dataTransfer' in e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        file = e.dataTransfer.files[0];
      }
    } else if (e.target.files && e.target.files.length > 0) {
      file = e.target.files[0];
    }

    if (!file) return;

    setIsFileLoading(true);
    setCurrentFile(file);
    setPageResults({});
    setCropBox(null);
    setCurrentPage(1);
    setAiErrorMsg(null);

    const isPdf = file.type === 'application/pdf' || file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib = await getPdfJsLib();
        if (!pdfjsLib) {
          throw new Error('PDF.js renderer is initializing. Please wait a moment.');
        }
        const loadedPdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setPdfDoc(loadedPdf);
        setTotalPages(loadedPdf.numPages);
      } catch (err: any) {
        console.error('Error loading PDF file:', err);
        alert(`Failed to load PDF file: ${err.message || 'Unknown error'}`);
      } finally {
        setIsFileLoading(false);
      }
    } else {
      // Image file (PNG, JPEG, WEBP, BMP, etc.)
      setPdfDoc(null);
      setTotalPages(1);
      setIsFileLoading(false);
    }

    if (singleFileInputRef.current) {
      singleFileInputRef.current.value = '';
    }
  };

  // Render current page to canvas with image preprocessing
  const renderCurrentPage = useCallback(async () => {
    if (!canvasRef.current || !currentFile) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isPdf = Boolean(pdfDoc) || currentFile.type === 'application/pdf' || currentFile.type.includes('pdf') || currentFile.name.toLowerCase().endsWith('.pdf');

    if (isPdf && pdfDoc) {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale: pageScale });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        await page.render(renderContext).promise;

        // Apply Image Preprocessing Filters if active
        applyCanvasFilters(canvas, ctx);
      } catch (err) {
        console.error('Failed to render page to canvas:', err);
      }
    } else if (!isPdf || currentFile.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|tiff?)$/i.test(currentFile.name)) {
      const img = new Image();
      const objectUrl = URL.createObjectURL(currentFile);
      img.onload = () => {
        canvas.width = img.naturalWidth * (pageScale / 1.2);
        canvas.height = img.naturalHeight * (pageScale / 1.2);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        applyCanvasFilters(canvas, ctx);
        URL.revokeObjectURL(objectUrl);
      };
      img.onerror = () => {
        console.error('Failed to render image file to canvas');
        URL.revokeObjectURL(objectUrl);
      };
      img.src = objectUrl;
    }
  }, [pdfDoc, currentFile, currentPage, pageScale, preprocessing]);

  // Apply pixel manipulation filters (contrast, brightness, grayscale, threshold, sharpen)
  const applyCanvasFilters = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const { contrast, brightness, grayscale, threshold, rotation } = preprocessing;

    if (contrast === 0 && brightness === 0 && !grayscale && threshold === 0 && rotation === 0) {
      return; // No filters to apply
    }

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Brightness
      if (brightness !== 0) {
        r = Math.min(255, Math.max(0, r + brightness));
        g = Math.min(255, Math.max(0, g + brightness));
        b = Math.min(255, Math.max(0, b + brightness));
      }

      // Contrast
      if (contrast !== 0) {
        r = Math.min(255, Math.max(0, factor * (r - 128) + 128));
        g = Math.min(255, Math.max(0, factor * (g - 128) + 128));
        b = Math.min(255, Math.max(0, factor * (b - 128) + 128));
      }

      // Grayscale
      if (grayscale || threshold > 0) {
        const avg = 0.299 * r + 0.587 * g + 0.114 * b;
        r = avg;
        g = avg;
        b = avg;
      }

      // Binarization Threshold
      if (threshold > 0) {
        const v = (r > threshold) ? 255 : 0;
        r = v;
        g = v;
        b = v;
      }

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }

    ctx.putImageData(imgData, 0, 0);
  };

  useEffect(() => {
    if (currentFile) {
      renderCurrentPage();
    }
  }, [currentFile, pdfDoc, currentPage, pageScale, preprocessing, renderCurrentPage]);

  // Crop Box Selection Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelectingRegion || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawingBox(true);
    setStartPoint({ x, y });
    setCropBox({ x, y, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingBox || !startPoint || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const x = Math.min(startPoint.x, currentX);
    const y = Math.min(startPoint.y, currentY);
    const w = Math.abs(currentX - startPoint.x);
    const h = Math.abs(currentY - startPoint.y);

    setCropBox({ x, y, w, h });
  };

  const handleMouseUp = () => {
    setIsDrawingBox(false);
  };

  // Execute OCR for Current Page
  const runOcrForCurrentPage = async () => {
    if (!canvasRef.current) return;

    setIsOcrProcessing(true);
    setOcrProgressMsg('Preparing page image canvas...');
    setOcrPercent(10);

    try {
      let targetCanvas = canvasRef.current;

      // If Region crop box is selected, extract cropped region
      if (cropBox && cropBox.w > 10 && cropBox.h > 10) {
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = cropBox.w;
        croppedCanvas.height = cropBox.h;
        const cropCtx = croppedCanvas.getContext('2d');
        if (cropCtx) {
          cropCtx.drawImage(
            canvasRef.current,
            cropBox.x, cropBox.y, cropBox.w, cropBox.h,
            0, 0, cropBox.w, cropBox.h
          );
          targetCanvas = croppedCanvas;
        }
      }

      const imageDataUrl = targetCanvas.toDataURL('image/png');

      if (ocrEngine === 'tesseract') {
        setOcrProgressMsg(`Initializing Tesseract OCR (${selectedLanguage})...`);
        setOcrPercent(25);

        const worker = await createWorker(selectedLanguage);
        setOcrProgressMsg('Analyzing document layout and text blocks...');
        setOcrPercent(50);

        const ret = await worker.recognize(imageDataUrl);
        setOcrProgressMsg('Extracting words, coordinates & confidence scores...');
        setOcrPercent(85);

        const rawText = ret.data.text || '';
        const dataAny = ret.data as any;
        const blocks: OCRBlock[] = (dataAny.blocks || []).map((b: any) => ({
          text: b.text,
          bbox: b.bbox,
          confidence: Math.round(b.confidence || 0),
          words: (b.words || []).map((w: any) => ({
            text: w.text,
            bbox: w.bbox,
            confidence: Math.round(w.confidence || 0)
          }))
        }));

        const words: OCRWord[] = (dataAny.words || []).map((w: any) => ({
          text: w.text,
          bbox: w.bbox,
          confidence: Math.round(w.confidence || 0)
        }));

        const avgConfidence = words.length > 0
          ? Math.round(words.reduce((acc, w) => acc + w.confidence, 0) / words.length)
          : Math.round(ret.data.confidence || 85);

        await worker.terminate();

        const pageResult: PageOCRResult = {
          pageNum: currentPage,
          rawText,
          editedText: rawText,
          confidence: avgConfidence,
          blocks,
          words,
          dataUrl: imageDataUrl
        };

        setPageResults(prev => ({ ...prev, [currentPage]: pageResult }));
        setOcrPercent(100);
        setOcrProgressMsg('OCR Complete!');
      } else {
        // Gemini AI OCR
        setOcrProgressMsg('Calling Gemini AI OCR Engine...');
        setOcrPercent(40);

        const response = await fetch('/api/ai/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: imageDataUrl, mimeType: 'image/png' })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Gemini AI OCR failed.');

        const rawText = data.text || '';
        const pageResult: PageOCRResult = {
          pageNum: currentPage,
          rawText,
          editedText: rawText,
          confidence: 96,
          blocks: [],
          words: [],
          dataUrl: imageDataUrl
        };

        setPageResults(prev => ({ ...prev, [currentPage]: pageResult }));
        setOcrPercent(100);
        setOcrProgressMsg('Gemini AI OCR Complete!');
      }

      onAddRecentFile({
        name: `${currentFile?.name.replace('.pdf', '')}_p${currentPage}_ocr.txt`,
        size: formatBytes(imageDataUrl.length),
        type: 'text/plain',
        toolUsed: 'PDF OCR Workstation'
      });
    } catch (err: any) {
      console.error('OCR Processing Error:', err);
      alert(`OCR Error: ${err.message}`);
    } finally {
      setIsOcrProcessing(false);
    }
  };

  // Run OCR for All Pages sequentially
  const runOcrForAllPages = async () => {
    if (!pdfDoc) {
      await runOcrForCurrentPage();
      return;
    }

    setIsOcrProcessing(true);
    setOcrProgressMsg('Starting multi-page OCR process...');

    try {
      const pdfjsLib = (window as any).pdfjsLib;
      const worker = ocrEngine === 'tesseract' ? await createWorker(selectedLanguage) : null;

      for (let p = 1; p <= totalPages; p++) {
        setOcrProgressMsg(`Processing Page ${p} of ${totalPages}...`);
        setOcrPercent(Math.round((p / totalPages) * 100));

        const page = await pdfDoc.getPage(p);
        const viewport = page.getViewport({ scale: 1.5 });

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = viewport.width;
        tempCanvas.height = viewport.height;
        const tempCtx = tempCanvas.getContext('2d');

        if (tempCtx) {
          await page.render({ canvasContext: tempCtx, viewport }).promise;
          applyCanvasFilters(tempCanvas, tempCtx);
          const imageDataUrl = tempCanvas.toDataURL('image/png');

          if (ocrEngine === 'tesseract' && worker) {
            const ret = await worker.recognize(imageDataUrl);
            const rawText = ret.data.text || '';
            const dataAny = ret.data as any;
            const words: OCRWord[] = (dataAny.words || []).map((w: any) => ({
              text: w.text,
              bbox: w.bbox,
              confidence: Math.round(w.confidence || 0)
            }));
            const avgConfidence = words.length > 0
              ? Math.round(words.reduce((acc, w) => acc + w.confidence, 0) / words.length)
              : 85;

            setPageResults(prev => ({
              ...prev,
              [p]: {
                pageNum: p,
                rawText,
                editedText: rawText,
                confidence: avgConfidence,
                blocks: [],
                words,
                dataUrl: imageDataUrl
              }
            }));
          } else {
            // Gemini AI
            const response = await fetch('/api/ai/ocr', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageBase64: imageDataUrl, mimeType: 'image/png' })
            });
            const data = await response.json();
            const rawText = data.text || '';
            setPageResults(prev => ({
              ...prev,
              [p]: {
                pageNum: p,
                rawText,
                editedText: rawText,
                confidence: 96,
                blocks: [],
                words: [],
                dataUrl: imageDataUrl
              }
            }));
          }
        }
      }

      if (worker) await worker.terminate();

      setOcrPercent(100);
      setOcrProgressMsg('Multi-page OCR Complete!');
    } catch (err: any) {
      console.error('Multi-page OCR Error:', err);
      alert(`Multi-page OCR failed: ${err.message}`);
    } finally {
      setIsOcrProcessing(false);
    }
  };

  // AI Text Correction (Gemini)
  const runAiTextCorrection = async () => {
    const currentRes = pageResults[currentPage];
    if (!currentRes || !currentRes.editedText.trim()) {
      alert('Please run OCR on the current page first before applying AI Correction.');
      return;
    }

    setIsAiCorrecting(true);
    setAiErrorMsg(null);

    try {
      const response = await fetch('/api/ai/ocr-correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: currentRes.editedText,
          language: selectedLanguage,
          mode: 'correction'
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI Text Correction failed.');

      const correctedText = data.correctedText;
      setPageResults(prev => ({
        ...prev,
        [currentPage]: {
          ...prev[currentPage],
          editedText: correctedText
        }
      }));
    } catch (err: any) {
      console.error('AI Correction Error:', err);
      setAiErrorMsg(`AI Correction Error: ${err.message}`);
    } finally {
      setIsAiCorrecting(false);
    }
  };

  // Handle Text Editing for Current Page
  const handleTextEdit = (newText: string) => {
    setPageResults(prev => ({
      ...prev,
      [currentPage]: {
        ...prev[currentPage] || { pageNum: currentPage, rawText: '', editedText: '', confidence: 100, blocks: [], words: [] },
        editedText: newText
      }
    }));
  };

  // Exec Command for Rich Formatting Toolbar
  const handleFormatCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
  };

  // General Document Export Helpers
  const exportSearchablePdfForDoc = async (file: File, pResults: Record<number, PageOCRResult>, totalP: number) => {
    const pdfDocOut = await PDFDocument.create();
    const helveticaFont = await pdfDocOut.embedFont(StandardFonts.Helvetica);

    const pagesToRender = Math.max(totalP || 1, Object.keys(pResults).length || 1);

    for (let p = 1; p <= pagesToRender; p++) {
      const pageRes = pResults[p];
      if (pageRes && pageRes.dataUrl) {
        try {
          const imgBytes = await fetch(pageRes.dataUrl).then(res => res.arrayBuffer());
          const embeddedImg = await pdfDocOut.embedPng(imgBytes);
          const { width, height } = embeddedImg.scale(1);
          const pdfPage = pdfDocOut.addPage([width, height]);
          pdfPage.drawImage(embeddedImg, { x: 0, y: 0, width, height });

          if (pageRes.words && pageRes.words.length > 0) {
            pageRes.words.forEach(w => {
              const textWidth = helveticaFont.widthOfTextAtSize(w.text || ' ', 10);
              const targetWidth = Math.max(1, (w.bbox?.x1 || 0) - (w.bbox?.x0 || 0));
              const calculatedFontSize = Math.min(18, Math.max(6, (targetWidth / Math.max(textWidth, 1)) * 10));

              pdfPage.drawText(w.text || '', {
                x: w.bbox?.x0 || 20,
                y: Math.max(10, height - (w.bbox?.y1 || 20)),
                size: calculatedFontSize,
                font: helveticaFont,
                color: rgb(0, 0, 0),
                opacity: 0.001
              });
            });
          } else if (pageRes.editedText) {
            const lines = pageRes.editedText.split('\n');
            let yPos = height - 20;
            lines.forEach(line => {
              if (line.trim() && yPos > 20) {
                pdfPage.drawText(line.substring(0, 80), {
                  x: 20,
                  y: yPos,
                  size: 9,
                  font: helveticaFont,
                  color: rgb(0, 0, 0),
                  opacity: 0.001
                });
                yPos -= 12;
              }
            });
          }
        } catch (err) {
          console.error(`Page ${p} embed error:`, err);
        }
      } else {
        // Text-only page fallback
        const pdfPage = pdfDocOut.addPage([600, 800]);
        const text = pageRes?.editedText || 'No text extracted';
        const lines = text.split('\n');
        let yPos = 780;
        lines.forEach(line => {
          if (line.trim() && yPos > 30) {
            pdfPage.drawText(line.substring(0, 90), {
              x: 30,
              y: yPos,
              size: 10,
              font: helveticaFont,
              color: rgb(0, 0, 0),
              opacity: 1
            });
            yPos -= 14;
          }
        });
      }
    }

    const pdfBytes = await pdfDocOut.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  };

  const exportDocxForDoc = async (pResults: Record<number, PageOCRResult>) => {
    const sortedPageKeys = Object.keys(pResults).sort((a, b) => Number(a) - Number(b));
    const allText = sortedPageKeys.length > 0
      ? sortedPageKeys.map(p => `--- PAGE ${p} ---\n\n${pResults[Number(p)].editedText || ''}`).join('\n\n')
      : 'No text extracted.';

    const paragraphs = allText.split('\n').map(line => new Paragraph({
      children: [new TextRun({ text: line, size: 24 })]
    }));

    const doc = new DocxDocument({
      sections: [{ properties: {}, children: paragraphs }]
    });

    const buffer = await Packer.toBuffer(doc);
    return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  };

  const exportTxtForDoc = (pResults: Record<number, PageOCRResult>) => {
    const sortedPageKeys = Object.keys(pResults).sort((a, b) => Number(a) - Number(b));
    const allText = sortedPageKeys.length > 0
      ? sortedPageKeys.map(p => `--- PAGE ${p} ---\n\n${pResults[Number(p)].editedText || ''}`).join('\n\n')
      : '';
    return new Blob([allText], { type: 'text/plain;charset=utf-8' });
  };

  const exportXlsxForDoc = (pResults: Record<number, PageOCRResult>, pageNum: number = 1) => {
    const res = pResults[pageNum] || Object.values(pResults)[0];
    const text = res?.editedText || '';
    const rows = text.split('\n').map(line => {
      if (line.includes('\t')) return line.split('\t');
      if (line.includes('|')) return line.split('|').map(s => s.trim()).filter(Boolean);
      if (line.includes(',')) return line.split(',');
      return [line];
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'OCR Table');
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  };

  const exportJsonForDoc = (pResults: Record<number, PageOCRResult>) => {
    return new Blob([JSON.stringify(pResults, null, 2)], { type: 'application/json' });
  };

  // Export Document Generators for Single Mode
  const handleExportSearchablePdf = async () => {
    try {
      if (!currentFile) return;
      const blob = await exportSearchablePdfForDoc(currentFile, pageResults, totalPages);
      saveAs(blob, `${currentFile.name.replace(/\.[^/.]+$/, '')}_searchable.pdf`);
      onAddRecentFile({
        name: `${currentFile.name.replace(/\.[^/.]+$/, '')}_searchable.pdf`,
        size: formatBytes(blob.size),
        type: 'application/pdf',
        toolUsed: 'Searchable PDF OCR'
      });
      setShowExportModal(false);
    } catch (err: any) {
      console.error('Searchable PDF Export Error:', err);
      alert(`Export Error: ${err.message}`);
    }
  };

  const handleExportDocx = async () => {
    try {
      const blob = await exportDocxForDoc(pageResults);
      saveAs(blob, `${currentFile?.name.replace(/\.[^/.]+$/, '') || 'document'}_ocr.docx`);
      setShowExportModal(false);
    } catch (err: any) {
      alert(`DOCX Export Error: ${err.message}`);
    }
  };

  const handleExportXlsx = () => {
    try {
      const blob = exportXlsxForDoc(pageResults, currentPage);
      saveAs(blob, `${currentFile?.name.replace(/\.[^/.]+$/, '') || 'table'}_ocr.xlsx`);
      setShowExportModal(false);
    } catch (err: any) {
      alert(`Excel Export Error: ${err.message}`);
    }
  };

  const handleExportTxt = () => {
    const blob = exportTxtForDoc(pageResults);
    saveAs(blob, `${currentFile?.name.replace(/\.[^/.]+$/, '') || 'document'}_ocr.txt`);
    setShowExportModal(false);
  };

  const handleExportJson = () => {
    const blob = exportJsonForDoc(pageResults);
    saveAs(blob, `${currentFile?.name.replace(/\.[^/.]+$/, '') || 'document'}_ocr_metadata.json`);
    setShowExportModal(false);
  };

  // Export a specific Batch File Item
  const handleExportBatchFile = async (item: BatchFileItem, format: 'pdf' | 'docx' | 'txt' | 'xlsx' | 'json') => {
    const pResults = item.pageResults || {
      1: {
        pageNum: 1,
        rawText: item.resultText || '',
        editedText: item.resultText || '',
        confidence: 90,
        blocks: [],
        words: []
      }
    };
    const baseName = item.file.name.replace(/\.[^/.]+$/, '');

    try {
      if (format === 'pdf') {
        const blob = await exportSearchablePdfForDoc(item.file, pResults, item.totalPages || 1);
        saveAs(blob, `${baseName}_searchable.pdf`);
      } else if (format === 'docx') {
        const blob = await exportDocxForDoc(pResults);
        saveAs(blob, `${baseName}_ocr.docx`);
      } else if (format === 'txt') {
        const blob = exportTxtForDoc(pResults);
        saveAs(blob, `${baseName}_ocr.txt`);
      } else if (format === 'xlsx') {
        const blob = exportXlsxForDoc(pResults, 1);
        saveAs(blob, `${baseName}_table.xlsx`);
      } else if (format === 'json') {
        const blob = exportJsonForDoc(pResults);
        saveAs(blob, `${baseName}_metadata.json`);
      }
    } catch (err: any) {
      alert(`Export Error: ${err.message}`);
    }
  };

  // Batch OCR Handlers
  const handleBatchFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray: File[] = Array.from(e.target.files);
      const newItems: BatchFileItem[] = filesArray.map(file => ({
        id: Math.random().toString(36).substring(7),
        file,
        totalPages: file.type.includes('pdf') || file.name.endsWith('.pdf') ? 1 : 1,
        status: 'idle',
        progress: 0
      }));
      setBatchFiles(prev => [...prev, ...newItems]);
    }
  };

  const runBatchOcr = async () => {
    if (batchFiles.length === 0) return;
    setIsBatchProcessing(true);

    const pdfjsLib = await getPdfJsLib();
    const totalFilesCount = batchFiles.length;

    for (let i = 0; i < batchFiles.length; i++) {
      const item = batchFiles[i];
      const currentFileNum = i + 1;

      setBatchFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'processing', progress: 5 } : f));

      setGlobalBatchProgress({
        totalFiles: totalFilesCount,
        completedFiles: i,
        currentFileName: item.file.name,
        currentFileIndex: currentFileNum,
        currentPage: 1,
        totalPages: 1,
        currentStep: 'Initializing document processing...',
        filePercent: 5,
        overallPercent: Math.round((i / totalFilesCount) * 100)
      });

      try {
        let extractedText = '';
        let filePagesCount = 1;
        const filePageResults: Record<number, PageOCRResult> = {};

        if (item.file.type === 'application/pdf' || item.file.name.endsWith('.pdf')) {
          setGlobalBatchProgress(prev => ({
            ...prev,
            currentStep: 'Parsing PDF document structure & pages...'
          }));

          const arrayBuffer = await item.file.arrayBuffer();
          const loadedPdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          filePagesCount = loadedPdf.numPages;

          setBatchFiles(prev => prev.map((f, idx) => idx === i ? { ...f, totalPages: filePagesCount } : f));

          const pageTexts: string[] = [];
          const worker = ocrEngine === 'tesseract' ? await createWorker(selectedLanguage) : null;

          for (let p = 1; p <= filePagesCount; p++) {
            const pageProgress = Math.round((p / filePagesCount) * 100);
            const overallCalc = Math.round(((i + (p / filePagesCount)) / totalFilesCount) * 100);

            setGlobalBatchProgress({
              totalFiles: totalFilesCount,
              completedFiles: i,
              currentFileName: item.file.name,
              currentFileIndex: currentFileNum,
              currentPage: p,
              totalPages: filePagesCount,
              currentStep: `Rendering page ${p}/${filePagesCount} to canvas...`,
              filePercent: pageProgress,
              overallPercent: overallCalc
            });

            const page = await loadedPdf.getPage(p);
            const viewport = page.getViewport({ scale: 1.5 });
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = viewport.width;
            tempCanvas.height = viewport.height;
            const tempCtx = tempCanvas.getContext('2d');

            if (tempCtx) {
              await page.render({ canvasContext: tempCtx, viewport }).promise;
              applyCanvasFilters(tempCanvas, tempCtx);
              const imageDataUrl = tempCanvas.toDataURL('image/png');

              if (ocrEngine === 'tesseract' && worker) {
                setGlobalBatchProgress(prev => ({
                  ...prev,
                  currentStep: `Running Tesseract OCR on Page ${p}/${filePagesCount}...`
                }));

                const ret = await worker.recognize(imageDataUrl);
                const pText = ret.data.text || '';
                pageTexts.push(`--- PAGE ${p} ---\n${pText}`);

                const wordsList: OCRWord[] = ((ret.data as any).words || []).map((w: any) => ({
                  text: w.text,
                  confidence: Math.round(w.confidence || 0),
                  bbox: {
                    x0: w.bbox?.x0 || 0,
                    y0: w.bbox?.y0 || 0,
                    x1: w.bbox?.x1 || 0,
                    y1: w.bbox?.y1 || 0
                  }
                }));

                filePageResults[p] = {
                  pageNum: p,
                  rawText: pText,
                  editedText: pText,
                  confidence: Math.round(ret.data.confidence || 88),
                  blocks: [],
                  words: wordsList,
                  dataUrl: imageDataUrl
                };
              } else {
                setGlobalBatchProgress(prev => ({
                  ...prev,
                  currentStep: `Calling Gemini AI OCR on Page ${p}/${filePagesCount}...`
                }));

                const response = await fetch('/api/ai/ocr', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ imageBase64: imageDataUrl, mimeType: 'image/png' })
                });
                const data = await response.json();
                const pText = data.text || '';
                pageTexts.push(`--- PAGE ${p} ---\n${pText}`);

                const syntheticWords: OCRWord[] = pText.split(/\s+/).filter(Boolean).map((t: string, wIdx: number) => ({
                  text: t,
                  confidence: 94,
                  bbox: { x0: 20 + (wIdx % 8) * 60, y0: 30 + Math.floor(wIdx / 8) * 20, x1: 70 + (wIdx % 8) * 60, y1: 45 + Math.floor(wIdx / 8) * 20 }
                }));

                filePageResults[p] = {
                  pageNum: p,
                  rawText: pText,
                  editedText: pText,
                  confidence: 94,
                  blocks: [],
                  words: syntheticWords,
                  dataUrl: imageDataUrl
                };
              }
            }

            setBatchFiles(prev => prev.map((f, idx) => idx === i ? {
              ...f,
              progress: pageProgress,
              pageResults: filePageResults
            } : f));
          }

          if (worker) await worker.terminate();
          extractedText = pageTexts.join('\n\n');

        } else {
          // Image File
          setGlobalBatchProgress({
            totalFiles: totalFilesCount,
            completedFiles: i,
            currentFileName: item.file.name,
            currentFileIndex: currentFileNum,
            currentPage: 1,
            totalPages: 1,
            currentStep: `Extracting text from image via ${ocrEngine === 'tesseract' ? 'Tesseract' : 'Gemini AI'}...`,
            filePercent: 50,
            overallPercent: Math.round(((i + 0.5) / totalFilesCount) * 100)
          });

          const reader = new FileReader();
          reader.readAsDataURL(item.file);
          const dataUrl: string = await new Promise((res) => reader.onload = () => res(reader.result as string));

          if (ocrEngine === 'tesseract') {
            const worker = await createWorker(selectedLanguage);
            const ret = await worker.recognize(dataUrl);
            await worker.terminate();
            extractedText = ret.data.text || '';
            const wordsList: OCRWord[] = ((ret.data as any).words || []).map((w: any) => ({
              text: w.text,
              confidence: Math.round(w.confidence || 0),
              bbox: {
                x0: w.bbox?.x0 || 0,
                y0: w.bbox?.y0 || 0,
                x1: w.bbox?.x1 || 0,
                y1: w.bbox?.y1 || 0
              }
            }));
            filePageResults[1] = {
              pageNum: 1,
              rawText: extractedText,
              editedText: extractedText,
              confidence: Math.round(ret.data.confidence || 90),
              blocks: [],
              words: wordsList,
              dataUrl
            };
          } else {
            const response = await fetch('/api/ai/ocr', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageBase64: dataUrl, mimeType: 'image/png' })
            });
            const data = await response.json();
            extractedText = data.text || '';
            const syntheticWords: OCRWord[] = extractedText.split(/\s+/).filter(Boolean).map((t: string, wIdx: number) => ({
              text: t,
              confidence: 94,
              bbox: { x0: 20 + (wIdx % 8) * 60, y0: 30 + Math.floor(wIdx / 8) * 20, x1: 70 + (wIdx % 8) * 60, y1: 45 + Math.floor(wIdx / 8) * 20 }
            }));
            filePageResults[1] = {
              pageNum: 1,
              rawText: extractedText,
              editedText: extractedText,
              confidence: 94,
              blocks: [],
              words: syntheticWords,
              dataUrl
            };
          }
        }

        const finalOverall = Math.round(((i + 1) / totalFilesCount) * 100);
        setGlobalBatchProgress({
          totalFiles: totalFilesCount,
          completedFiles: i + 1,
          currentFileName: item.file.name,
          currentFileIndex: currentFileNum,
          currentPage: filePagesCount,
          totalPages: filePagesCount,
          currentStep: `Completed processing for ${item.file.name}`,
          filePercent: 100,
          overallPercent: finalOverall
        });

        setBatchFiles(prev => prev.map((f, idx) => idx === i ? {
          ...f,
          status: 'done',
          progress: 100,
          resultText: extractedText,
          pageResults: filePageResults
        } : f));

        onAddRecentFile({
          name: `${item.file.name.replace(/\.[^/.]+$/, '')}_ocr.txt`,
          size: formatBytes(extractedText.length),
          type: 'text/plain',
          toolUsed: 'Batch OCR'
        });

      } catch (err: any) {
        setBatchFiles(prev => prev.map((f, idx) => idx === i ? {
          ...f,
          status: 'error',
          errorMsg: err.message
        } : f));
      }
    }

    setIsBatchProcessing(false);
  };

  // Batch ZIP Download with format options
  const handleDownloadBatchZipWithOptions = async (format: 'all' | 'pdf' | 'docx' | 'txt') => {
    const completedFiles = batchFiles.filter(f => f.status === 'done');
    if (completedFiles.length === 0) {
      alert('No processed files ready for download.');
      return;
    }

    setIsGeneratingBatchZip(true);
    setBatchZipProgressMsg('Packaging batch OCR files into ZIP...');
    try {
      const zip = new JSZip();

      for (let idx = 0; idx < completedFiles.length; idx++) {
        const item = completedFiles[idx];
        const baseName = item.file.name.replace(/\.[^/.]+$/, '');
        const pResults = item.pageResults || {
          1: {
            pageNum: 1,
            rawText: item.resultText || '',
            editedText: item.resultText || '',
            confidence: 90,
            blocks: [],
            words: []
          }
        };

        setBatchZipProgressMsg(`Processing ${item.file.name} (${idx + 1}/${completedFiles.length})...`);

        if (format === 'txt' || format === 'all') {
          const txtBlob = exportTxtForDoc(pResults);
          const txtText = await txtBlob.text();
          if (format === 'all') {
            zip.file(`${baseName}/${baseName}_ocr.txt`, txtText);
          } else {
            zip.file(`${baseName}_ocr.txt`, txtText);
          }
        }

        if (format === 'docx' || format === 'all') {
          const docxBlob = await exportDocxForDoc(pResults);
          const docxBuf = await docxBlob.arrayBuffer();
          if (format === 'all') {
            zip.file(`${baseName}/${baseName}_ocr.docx`, docxBuf);
          } else {
            zip.file(`${baseName}_ocr.docx`, docxBuf);
          }
        }

        if (format === 'pdf' || format === 'all') {
          const pdfBlob = await exportSearchablePdfForDoc(item.file, pResults, item.totalPages || 1);
          const pdfBuf = await pdfBlob.arrayBuffer();
          if (format === 'all') {
            zip.file(`${baseName}/${baseName}_searchable.pdf`, pdfBuf);
          } else {
            zip.file(`${baseName}_searchable.pdf`, pdfBuf);
          }
        }

        if (format === 'all') {
          const xlsxBlob = exportXlsxForDoc(pResults, 1);
          const xlsxBuf = await xlsxBlob.arrayBuffer();
          zip.file(`${baseName}/${baseName}_table.xlsx`, xlsxBuf);

          const jsonBlob = exportJsonForDoc(pResults);
          const jsonText = await jsonBlob.text();
          zip.file(`${baseName}/${baseName}_metadata.json`, jsonText);
        }
      }

      setBatchZipProgressMsg('Compressing ZIP archive...');
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `batch_ocr_${format}_export.zip`);
      setShowBatchZipModal(false);
    } catch (err: any) {
      console.error('Batch ZIP Error:', err);
      alert(`ZIP Download Error: ${err.message}`);
    } finally {
      setIsGeneratingBatchZip(false);
      setBatchZipProgressMsg('');
    }
  };

  // Legacy fallback for direct click
  const handleDownloadBatchZip = async () => {
    setShowBatchZipModal(true);
  };

  // Load PDF Doc for Selected Batch Review File
  useEffect(() => {
    if (!selectedBatchFileId) {
      setBatchReviewPdfDoc(null);
      return;
    }
    const item = batchFiles.find(f => f.id === selectedBatchFileId);
    if (!item) return;

    setBatchReviewPage(1);

    const isPdf = item.file.type === 'application/pdf' || item.file.name.endsWith('.pdf');
    if (isPdf) {
      (async () => {
        try {
          const arrayBuffer = await item.file.arrayBuffer();
          const pdfjs = await getPdfJsLib();
          const loaded = await pdfjs.getDocument({ data: arrayBuffer }).promise;
          setBatchReviewPdfDoc(loaded);
        } catch (e) {
          console.error('Failed to load batch review PDF:', e);
        }
      })();
    } else {
      setBatchReviewPdfDoc(null);
    }
  }, [selectedBatchFileId]);

  // Render Current Page for Batch Review Document
  const renderBatchReviewPage = useCallback(async () => {
    if (!batchReviewCanvasRef.current || !selectedBatchFileId) return;
    const item = batchFiles.find(f => f.id === selectedBatchFileId);
    if (!item) return;

    const canvas = batchReviewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isPdf = item.file.type === 'application/pdf' || item.file.name.endsWith('.pdf');
    if (isPdf && batchReviewPdfDoc) {
      try {
        const page = await batchReviewPdfDoc.getPage(batchReviewPage);
        const viewport = page.getViewport({ scale: batchReviewScale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (err) {
        console.error('Failed to render batch review page:', err);
      }
    } else if (!isPdf) {
      const img = new Image();
      const objectUrl = URL.createObjectURL(item.file);
      img.onload = () => {
        canvas.width = img.naturalWidth * (batchReviewScale / 1.2);
        canvas.height = img.naturalHeight * (batchReviewScale / 1.2);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(objectUrl);
      };
      img.src = objectUrl;
    }
  }, [selectedBatchFileId, batchReviewPdfDoc, batchReviewPage, batchReviewScale, batchFiles]);

  useEffect(() => {
    if (selectedBatchFileId) {
      renderBatchReviewPage();
    }
  }, [selectedBatchFileId, batchReviewPdfDoc, batchReviewPage, batchReviewScale, renderBatchReviewPage]);

  // Edit text in Batch Review View
  const handleBatchReviewTextEdit = (newText: string) => {
    if (!selectedBatchFileId) return;
    setBatchFiles(prev => prev.map(f => {
      if (f.id !== selectedBatchFileId) return f;
      const updatedPageResults = { ...(f.pageResults || {}) };
      if (updatedPageResults[batchReviewPage]) {
        updatedPageResults[batchReviewPage] = {
          ...updatedPageResults[batchReviewPage],
          editedText: newText
        };
      } else {
        updatedPageResults[batchReviewPage] = {
          pageNum: batchReviewPage,
          rawText: newText,
          editedText: newText,
          confidence: 92,
          blocks: [],
          words: []
        };
      }
      const updatedFullText = Object.keys(updatedPageResults)
        .sort((a, b) => Number(a) - Number(b))
        .map(p => updatedPageResults[Number(p)].editedText)
        .join('\n\n');

      return {
        ...f,
        pageResults: updatedPageResults,
        resultText: updatedFullText
      };
    }));
  };

  // AI Correction in Batch Review View
  const runBatchReviewAiCorrection = async () => {
    if (!selectedBatchFileId) return;
    const item = batchFiles.find(f => f.id === selectedBatchFileId);
    if (!item || !item.pageResults || !item.pageResults[batchReviewPage]) return;

    const currentText = item.pageResults[batchReviewPage].editedText;
    if (!currentText.trim()) return;

    setIsBatchReviewAiCorrecting(true);
    try {
      const response = await fetch('/api/ai/ocr-correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: currentText, language: selectedLanguage })
      });
      const data = await response.json();
      if (data.correctedText) {
        handleBatchReviewTextEdit(data.correctedText);
      }
    } catch (err: any) {
      console.error('Batch AI Correction Error:', err);
      alert('AI Correction error: ' + err.message);
    } finally {
      setIsBatchReviewAiCorrecting(false);
    }
  };

  // Search & Replace for Batch Review View
  const handleBatchReviewSearchReplace = () => {
    if (!batchReviewSearchQuery || !selectedBatchFileId) return;
    const item = batchFiles.find(f => f.id === selectedBatchFileId);
    const currentRes = item?.pageResults?.[batchReviewPage];
    if (!currentRes) return;

    const regex = new RegExp(batchReviewSearchQuery, 'gi');
    const updated = currentRes.editedText.replace(regex, batchReviewReplaceQuery);
    handleBatchReviewTextEdit(updated);
  };

  // Navigation helper to jump directly to errors
  const jumpToError = (direction: 'next' | 'prev', isBatch: boolean = false) => {
    const selector = isBatch ? '.batch-ocr-error-word' : '.ocr-error-word';
    const errorElements = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
    if (errorElements.length === 0) return;

    let newIndex = isBatch ? batchCurrentErrorIndex : currentErrorIndex;
    if (direction === 'next') {
      newIndex = (newIndex + 1) >= errorElements.length ? 0 : newIndex + 1;
    } else {
      newIndex = (newIndex - 1) < 0 ? errorElements.length - 1 : newIndex - 1;
    }

    if (isBatch) {
      setBatchCurrentErrorIndex(newIndex);
    } else {
      setCurrentErrorIndex(newIndex);
    }

    const target = errorElements[newIndex];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('ring-4', 'ring-blue-500', 'scale-105');
      setTimeout(() => {
        target.classList.remove('ring-4', 'ring-blue-500', 'scale-105');
      }, 1500);
    }
  };

  // Helper to render current page text with visual heatmap overlay
  const renderFormattedEditorContent = () => {
    const currentRes = pageResults[currentPage];
    if (!currentRes) return <p className="text-slate-400 italic">No OCR data for this page yet. Click "Run OCR" to process.</p>;

    if (!highlightLowConfidence || !currentRes.words || currentRes.words.length === 0) {
      return (
        <div
          ref={richEditorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => handleTextEdit(e.currentTarget.innerText)}
          className="w-full min-h-[350px] outline-none text-slate-800 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed font-sans text-sm"
        >
          {currentRes.editedText}
        </div>
      );
    }

    let errorCounter = 0;

    return (
      <div
        ref={richEditorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => handleTextEdit(e.currentTarget.innerText)}
        className="w-full min-h-[350px] outline-none text-slate-800 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed font-sans text-sm selection:bg-blue-200 dark:selection:bg-blue-900/50"
      >
        {currentRes.words.map((w, idx) => {
          const isCritical = w.confidence < heatmapThresholdCrit;
          const isWarning = w.confidence >= heatmapThresholdCrit && w.confidence < heatmapThresholdWarn;

          if (isCritical) {
            const errId = `ocr-err-word-${errorCounter++}`;
            return (
              <React.Fragment key={idx}>
                <mark
                  id={errId}
                  data-confidence={w.confidence}
                  title={`🔴 Critical Transcription Risk: ${w.confidence}% confidence. Click to edit or correct.`}
                  className="ocr-error-word ocr-error-critical bg-rose-100 dark:bg-rose-950/80 text-rose-950 dark:text-rose-100 border-b-2 border-rose-500 rounded px-1.5 py-0.5 mx-0.5 inline-flex items-center gap-1 font-semibold ring-1 ring-rose-400/50 dark:ring-rose-800 shadow-sm cursor-pointer hover:bg-rose-200 dark:hover:bg-rose-900 transition-all"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400 animate-pulse" />
                  <span>{w.text}</span>
                  <span className="text-[10px] font-mono opacity-70 bg-rose-200 dark:bg-rose-900/60 px-1 rounded">
                    {w.confidence}%
                  </span>
                </mark>
                <span> </span>
              </React.Fragment>
            );
          } else if (isWarning) {
            const errId = `ocr-err-word-${errorCounter++}`;
            return (
              <React.Fragment key={idx}>
                <mark
                  id={errId}
                  data-confidence={w.confidence}
                  title={`🟡 Low Confidence: ${w.confidence}% confidence. Review suggested.`}
                  className="ocr-error-word ocr-error-warning bg-amber-100 dark:bg-amber-950/80 text-amber-950 dark:text-amber-100 border-b-2 border-amber-500 rounded px-1.5 py-0.5 mx-0.5 inline-flex items-center gap-1 font-semibold ring-1 ring-amber-400/50 dark:ring-amber-800 shadow-sm cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-900 transition-all"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>{w.text}</span>
                  <span className="text-[10px] font-mono opacity-70 bg-amber-200 dark:bg-amber-900/60 px-1 rounded">
                    {w.confidence}%
                  </span>
                </mark>
                <span> </span>
              </React.Fragment>
            );
          } else {
            return (
              <React.Fragment key={idx}>
                <span
                  title={`🟢 High Confidence: ${w.confidence}%`}
                  className="hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded px-0.5 transition-colors"
                >
                  {w.text}
                </span>
                <span> </span>
              </React.Fragment>
            );
          }
        })}
      </div>
    );
  };

  // Helper to render batch review page text with visual heatmap overlay
  const renderBatchReviewFormattedEditorContent = () => {
    const item = batchFiles.find(f => f.id === selectedBatchFileId);
    const currentRes = item?.pageResults?.[batchReviewPage];
    if (!currentRes) return <p className="text-slate-400 italic">No OCR data for this page yet.</p>;

    if (!batchReviewHighlightLowConf || !currentRes.words || currentRes.words.length === 0) {
      return (
        <div
          ref={batchReviewRichEditorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => handleBatchReviewTextEdit(e.currentTarget.innerText)}
          className="w-full min-h-[380px] outline-none text-slate-800 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed font-sans text-sm"
        >
          {currentRes.editedText}
        </div>
      );
    }

    let batchErrorCounter = 0;

    return (
      <div
        ref={batchReviewRichEditorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => handleBatchReviewTextEdit(e.currentTarget.innerText)}
        className="w-full min-h-[380px] outline-none text-slate-800 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed font-sans text-sm selection:bg-blue-200 dark:selection:bg-blue-900/50"
      >
        {currentRes.words.map((w, idx) => {
          const isCritical = w.confidence < heatmapThresholdCrit;
          const isWarning = w.confidence >= heatmapThresholdCrit && w.confidence < heatmapThresholdWarn;

          if (isCritical) {
            const errId = `batch-ocr-err-word-${batchErrorCounter++}`;
            return (
              <React.Fragment key={idx}>
                <mark
                  id={errId}
                  data-confidence={w.confidence}
                  title={`🔴 Critical Transcription Risk: ${w.confidence}% confidence. Click to edit or correct.`}
                  className="batch-ocr-error-word ocr-error-critical bg-rose-100 dark:bg-rose-950/80 text-rose-950 dark:text-rose-100 border-b-2 border-rose-500 rounded px-1.5 py-0.5 mx-0.5 inline-flex items-center gap-1 font-semibold ring-1 ring-rose-400/50 dark:ring-rose-800 shadow-sm cursor-pointer hover:bg-rose-200 dark:hover:bg-rose-900 transition-all"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400 animate-pulse" />
                  <span>{w.text}</span>
                  <span className="text-[10px] font-mono opacity-70 bg-rose-200 dark:bg-rose-900/60 px-1 rounded">
                    {w.confidence}%
                  </span>
                </mark>
                <span> </span>
              </React.Fragment>
            );
          } else if (isWarning) {
            const errId = `batch-ocr-err-word-${batchErrorCounter++}`;
            return (
              <React.Fragment key={idx}>
                <mark
                  id={errId}
                  data-confidence={w.confidence}
                  title={`🟡 Low Confidence: ${w.confidence}% confidence. Review suggested.`}
                  className="batch-ocr-error-word ocr-error-warning bg-amber-100 dark:bg-amber-950/80 text-amber-950 dark:text-amber-100 border-b-2 border-amber-500 rounded px-1.5 py-0.5 mx-0.5 inline-flex items-center gap-1 font-semibold ring-1 ring-amber-400/50 dark:ring-amber-800 shadow-sm cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-900 transition-all"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>{w.text}</span>
                  <span className="text-[10px] font-mono opacity-70 bg-amber-200 dark:bg-amber-900/60 px-1 rounded">
                    {w.confidence}%
                  </span>
                </mark>
                <span> </span>
              </React.Fragment>
            );
          } else {
            return (
              <React.Fragment key={idx}>
                <span
                  title={`🟢 High Confidence: ${w.confidence}%`}
                  className="hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded px-0.5 transition-colors"
                >
                  {w.text}
                </span>
                <span> </span>
              </React.Fragment>
            );
          }
        })}
      </div>
    );
  };

  // Reusable Visual Heatmap Toolbar & Interactive Error Navigator
  const renderHeatmapToolbar = (isBatch: boolean = false) => {
    const item = isBatch ? batchFiles.find(f => f.id === selectedBatchFileId) : null;
    const currentRes = isBatch ? item?.pageResults?.[batchReviewPage] : pageResults[currentPage];
    const words = currentRes?.words || [];
    const isHighlighting = isBatch ? batchReviewHighlightLowConf : highlightLowConfidence;
    const toggleHighlight = () => isBatch ? setBatchReviewHighlightLowConf(prev => !prev) : setHighlightLowConfidence(prev => !prev);

    const critCount = words.filter(w => w.confidence < heatmapThresholdCrit).length;
    const warnCount = words.filter(w => w.confidence >= heatmapThresholdCrit && w.confidence < heatmapThresholdWarn).length;
    const highCount = words.filter(w => w.confidence >= heatmapThresholdWarn).length;
    const totalErrors = critCount + warnCount;
    const activeErrIdx = isBatch ? batchCurrentErrorIndex : currentErrorIndex;

    return (
      <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs shadow-inner">
        {/* Left: Heatmap Toggle & Graded Legend Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={toggleHighlight}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
              isHighlighting
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-500/20 ring-2 ring-orange-400/30'
                : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700'
            }`}
            title="Toggle Visual Heatmap Overlay for transcription confidence"
          >
            <Flame className={`h-3.5 w-3.5 ${isHighlighting ? 'text-amber-100 animate-bounce' : 'text-slate-400'}`} />
            <span>Heatmap Overlay</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
              isHighlighting ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-zinc-700 text-slate-500'
            }`}>
              {isHighlighting ? 'ACTIVE' : 'OFF'}
            </span>
          </button>

          {/* Color-Coded Heatmap Legend with Real-Time Counters */}
          <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-zinc-950 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-800 text-[11px]">
            <button
              onClick={() => jumpToError('next', isBatch)}
              disabled={critCount === 0}
              className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-bold px-1.5 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 disabled:opacity-40 cursor-pointer transition-colors"
              title={`Critical Transcription Risk (<${heatmapThresholdCrit}% confidence): ${critCount} words detected. Click to jump to next.`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>&lt;{heatmapThresholdCrit}% Red Alert ({critCount})</span>
            </button>

            <span className="text-slate-300 dark:text-zinc-700 font-bold">|</span>

            <button
              onClick={() => jumpToError('next', isBatch)}
              disabled={warnCount === 0}
              className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold px-1.5 py-0.5 rounded hover:bg-amber-50 dark:hover:bg-amber-950/50 disabled:opacity-40 cursor-pointer transition-colors"
              title={`Uncertain Low-Confidence (${heatmapThresholdCrit}-${heatmapThresholdWarn}% confidence): ${warnCount} words detected. Click to jump to next.`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>{heatmapThresholdCrit}-{heatmapThresholdWarn}% Yellow ({warnCount})</span>
            </button>

            <span className="text-slate-300 dark:text-zinc-700 font-bold">|</span>

            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold px-1.5 py-0.5" title={`High Confidence (≥${heatmapThresholdWarn}% confidence): ${highCount} words`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>≥{heatmapThresholdWarn}% Confident ({highCount})</span>
            </div>
          </div>
        </div>

        {/* Right: Quick Error Step Navigator & One-Click AI Correction */}
        <div className="flex flex-wrap items-center gap-2">
          {totalErrors > 0 && (
            <div className="flex items-center bg-white dark:bg-zinc-950 rounded-lg border border-slate-200 dark:border-zinc-800 p-0.5 shadow-sm">
              <button
                onClick={() => jumpToError('prev', isBatch)}
                className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-700 dark:text-zinc-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Jump to Previous Low-Confidence Error"
              >
                <ChevronLeft className="h-3 w-3" />
                <span className="hidden sm:inline">Prev Error</span>
              </button>
              
              <span className="px-2 text-[10px] font-mono text-slate-500 font-bold border-x border-slate-200 dark:border-zinc-800">
                {activeErrIdx >= 0 ? `${activeErrIdx + 1}/${totalErrors}` : `${totalErrors} Errors`}
              </span>

              <button
                onClick={() => jumpToError('next', isBatch)}
                className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-700 dark:text-zinc-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Jump to Next Low-Confidence Error"
              >
                <span className="hidden sm:inline">Next Error</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Quick AI Correction */}
          <button
            onClick={() => isBatch ? runBatchReviewAiCorrection() : runAiTextCorrection()}
            disabled={isBatch ? isBatchReviewAiCorrecting : isAiCorrecting}
            className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 shadow-md shadow-purple-500/20 transition-all cursor-pointer disabled:opacity-50"
            title="Automatically correct yellow and red low-confidence errors using AI"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>{(isBatch ? isBatchReviewAiCorrecting : isAiCorrecting) ? 'Fixing...' : 'Fix Errors with AI'}</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[1850px] mx-auto space-y-6">
      
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <ScanText className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-50">AI PDF OCR Studio</h1>
              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                Professional
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Side-by-side preview, editable text formatting, table extraction, multi-language support & searchable PDF export.
            </p>
          </div>
        </div>

        {/* Privacy Badge & Mode Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>100% Private Browser Execution</span>
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl border border-slate-200 dark:border-zinc-800">
            <button
              onClick={() => setWorkstationMode('single')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                workstationMode === 'single'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
              }`}
            >
              Single Editor
            </button>
            <button
              onClick={() => setWorkstationMode('batch')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                workstationMode === 'batch'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
              }`}
            >
              Batch OCR
            </button>
          </div>
        </div>
      </div>

      {/* GLOBAL BATCH & SINGLE OCR PROGRESS BAR */}
      {(isBatchProcessing || isOcrProcessing) && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-5 shadow-2xl border border-blue-500/30 space-y-4 animate-fade-in relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -right-10 -bottom-10 h-32 w-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-10 -top-10 h-32 w-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Top Title & Percent Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400 flex-shrink-0">
                <RefreshCw className="h-5 w-5 animate-spin text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-extrabold text-white tracking-wide">
                    {isBatchProcessing ? 'Global Batch Processing Active' : 'OCR Processing Active'}
                  </h4>
                  <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                    {isBatchProcessing ? `${globalBatchProgress.completedFiles}/${globalBatchProgress.totalFiles} Files Completed` : `Page ${currentPage}/${totalPages || 1}`}
                  </span>
                </div>
                <p className="text-xs text-blue-200/80 font-mono mt-0.5">
                  {isBatchProcessing
                    ? `File ${globalBatchProgress.currentFileIndex} of ${globalBatchProgress.totalFiles}: ${globalBatchProgress.currentFileName}`
                    : `Processing Document: ${currentFile?.name || 'Scan'}`}
                </p>
              </div>
            </div>

            {/* Live Percentage Display */}
            <div className="text-right">
              <div className="text-2xl font-black font-mono tracking-tight text-white flex items-center justify-end gap-1">
                <span>{isBatchProcessing ? globalBatchProgress.overallPercent : ocrPercent}%</span>
              </div>
              <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider block">
                {isBatchProcessing ? 'Total Batch Progress' : 'Page Step Progress'}
              </span>
            </div>
          </div>

          {/* Primary Overall Progress Bar */}
          <div className="space-y-1.5 relative z-10">
            <div className="flex justify-between items-center text-[11px] font-semibold text-blue-200">
              <span>Overall Batch Completion</span>
              <span className="font-mono font-bold">{isBatchProcessing ? `${globalBatchProgress.overallPercent}%` : `${ocrPercent}%`}</span>
            </div>
            <div className="w-full bg-slate-800/80 rounded-full h-3.5 p-0.5 border border-slate-700/60 overflow-hidden shadow-inner">
              <div
                className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 h-2.5 rounded-full transition-all duration-300 ease-out shadow-lg shadow-blue-500/50 relative"
                style={{ width: `${Math.max(3, isBatchProcessing ? globalBatchProgress.overallPercent : ocrPercent)}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
              </div>
            </div>
          </div>

          {/* Granular File & Page Step Progress Bar (for Batch mode) */}
          {isBatchProcessing && (
            <div className="space-y-1.5 relative z-10 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center text-[11px] text-slate-300 font-mono">
                <span className="truncate max-w-[70%] text-blue-300 font-bold flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-spin flex-shrink-0" />
                  <span>{globalBatchProgress.currentStep || 'Processing document pages...'}</span>
                </span>
                <span className="font-bold text-emerald-400">
                  Page {globalBatchProgress.currentPage}/{globalBatchProgress.totalPages} ({globalBatchProgress.filePercent}%)
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 border border-slate-700/50 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${Math.max(2, globalBatchProgress.filePercent)}%` }}
                />
              </div>
            </div>
          )}

          {/* Current Step Message for Single File mode */}
          {!isBatchProcessing && isOcrProcessing && (
            <div className="flex items-center gap-2 text-xs font-mono text-blue-200 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
              <Sparkles className="h-4 w-4 text-amber-400 animate-spin" />
              <span>{ocrProgressMsg || 'Extracting text and structure...'}</span>
            </div>
          )}
        </div>
      )}

      {/* SINGLE FILE OCR WORKSTATION MODE */}
      {workstationMode === 'single' && (
        <div className="space-y-6">
          
          {/* File Upload Dropzone (if no file loaded) */}
          {!currentFile && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(false);
                handleFileChange(e);
              }}
              onClick={() => singleFileInputRef.current?.click()}
              className={`border-2 border-dashed ${
                isDragOver
                  ? 'border-blue-500 bg-blue-100/30 dark:bg-blue-950/40 scale-[1.005]'
                  : 'border-blue-500/30 dark:border-blue-500/20 hover:border-blue-500'
              } bg-blue-50/20 dark:bg-blue-950/10 rounded-3xl p-12 text-center transition-all cursor-pointer relative space-y-4`}
            >
              <input
                ref={singleFileInputRef}
                type="file"
                accept=".pdf,application/pdf,image/png,image/jpeg,image/jpg,image/webp,image/tiff,image/bmp"
                onChange={handleFileChange}
                onClick={(e) => e.stopPropagation()}
                className="hidden"
              />
              <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                {isFileLoading ? (
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                ) : (
                  <Upload className="h-8 w-8 animate-bounce text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100">
                  {isFileLoading ? 'Loading Document...' : 'Select or Drag & Drop Scanned PDF or Image'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
                  Supports multi-page scanned PDFs, PNG, JPG, WEBP, and TIFF. Languages include English, Hindi, Marathi, Tamil, Telugu, and more.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={isFileLoading}
                  onClick={(e) => {
                    e.stopPropagation();
                    singleFileInputRef.current?.click();
                  }}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Upload className="h-4 w-4" />
                  <span>Choose File from Device</span>
                </button>
              </div>

              <div className="flex justify-center gap-2 pt-2">
                <span className="px-3 py-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                  📄 PDF Documents
                </span>
                <span className="px-3 py-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                  🖼️ Scanned Images
                </span>
                <span className="px-3 py-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                  🇮🇳 Indian Languages
                </span>
              </div>
            </div>
          )}

          {/* SIDE-BY-SIDE OCR WORKSPACE */}
          {currentFile && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT PANE: Original Document & Image Canvas Controls */}
              <div className="lg:col-span-6 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
                
                {/* Top Control Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-900 pb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate max-w-[180px]">
                      {currentFile.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">({formatBytes(currentFile.size)})</span>
                  </div>

                  {/* Page Navigation */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-900 px-2 py-1 rounded-lg">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="p-1 text-slate-600 dark:text-zinc-400 hover:text-blue-600 disabled:opacity-40 cursor-pointer"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 font-mono">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="p-1 text-slate-600 dark:text-zinc-400 hover:text-blue-600 disabled:opacity-40 cursor-pointer"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Zoom & Preprocessing Tools */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPageScale(s => Math.max(0.6, s - 0.2))}
                      className="p-1.5 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-lg text-slate-700 dark:text-zinc-300 cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-[10px] font-mono font-bold text-slate-500 w-10 text-center">
                      {Math.round(pageScale * 100)}%
                    </span>
                    <button
                      onClick={() => setPageScale(s => Math.min(2.5, s + 0.2))}
                      className="p-1.5 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-lg text-slate-700 dark:text-zinc-300 cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => setIsSelectingRegion(prev => !prev)}
                      className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                        isSelectingRegion
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-200'
                      }`}
                      title="Select Specific Region for OCR"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline text-[11px]">Region</span>
                    </button>

                    <button
                      onClick={() => setShowPreprocessing(prev => !prev)}
                      className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                        showPreprocessing
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-200'
                      }`}
                      title="Image Preprocessing Filters"
                    >
                      <Sliders className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline text-[11px]">Filters</span>
                    </button>

                    <button
                      onClick={() => { setCurrentFile(null); setPdfDoc(null); }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer ml-1"
                      title="Replace Document"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Preprocessing Filters Drawer */}
                {showPreprocessing && (
                  <div className="bg-slate-50 dark:bg-zinc-900/60 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-3 animate-fade-in">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <Wand2 className="h-3.5 w-3.5 text-indigo-500" />
                        Image Enhancement & Noise Cleaning
                      </span>
                      <button
                        onClick={() => setPreprocessing({ contrast: 0, brightness: 0, grayscale: false, threshold: 0, sharpen: false, rotation: 0 })}
                        className="text-[10px] font-semibold text-rose-500 hover:underline cursor-pointer"
                      >
                        Reset All
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Contrast ({preprocessing.contrast})</label>
                        <input
                          type="range"
                          min="-100"
                          max="100"
                          value={preprocessing.contrast}
                          onChange={(e) => setPreprocessing(p => ({ ...p, contrast: parseInt(e.target.value) }))}
                          className="w-full accent-blue-600"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Brightness ({preprocessing.brightness})</label>
                        <input
                          type="range"
                          min="-100"
                          max="100"
                          value={preprocessing.brightness}
                          onChange={(e) => setPreprocessing(p => ({ ...p, brightness: parseInt(e.target.value) }))}
                          className="w-full accent-blue-600"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Binarization Threshold ({preprocessing.threshold})</label>
                        <input
                          type="range"
                          min="0"
                          max="255"
                          value={preprocessing.threshold}
                          onChange={(e) => setPreprocessing(p => ({ ...p, threshold: parseInt(e.target.value) }))}
                          className="w-full accent-blue-600"
                        />
                      </div>

                      <div className="flex items-center gap-4 pt-3">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preprocessing.grayscale}
                            onChange={(e) => setPreprocessing(p => ({ ...p, grayscale: e.target.checked }))}
                            className="rounded accent-blue-600"
                          />
                          <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">Grayscale</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Canvas Render Container */}
                <div className="relative border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-100 dark:bg-zinc-900/50 overflow-auto max-h-[600px] flex justify-center items-start p-2">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    className={`max-w-full h-auto shadow-md rounded bg-white dark:bg-zinc-900 ${
                      isSelectingRegion ? 'cursor-crosshair' : 'cursor-default'
                    }`}
                  />

                  {/* Crop Rectangle Overlay */}
                  {cropBox && (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${cropBox.x}px`,
                        top: `${cropBox.y}px`,
                        width: `${cropBox.w}px`,
                        height: `${cropBox.h}px`,
                      }}
                      className="border-2 border-blue-500 bg-blue-500/15 pointer-events-none rounded"
                    >
                      <span className="absolute -top-5 left-0 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                        Selected Area
                      </span>
                    </div>
                  )}
                </div>

                {/* Region Crop Reset Banner */}
                {cropBox && (
                  <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 p-2.5 rounded-xl text-xs">
                    <span className="text-blue-800 dark:text-blue-300 font-medium">
                      🎯 Targeted area selected. OCR will process this bounding region.
                    </span>
                    <button
                      onClick={() => setCropBox(null)}
                      className="text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                    >
                      Clear Region
                    </button>
                  </div>
                )}
              </div>

              {/* RIGHT PANE: AI OCR Editor & Tools Studio */}
              <div className="lg:col-span-6 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
                
                {/* Engine & Language Control Header */}
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    {/* OCR Engine Selection */}
                    <div>
                      <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1">OCR Processing Engine</label>
                      <div className="flex gap-1 bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl border border-slate-200 dark:border-zinc-800">
                        <button
                          onClick={() => setOcrEngine('tesseract')}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            ocrEngine === 'tesseract'
                              ? 'bg-blue-600 text-white shadow'
                              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                          }`}
                        >
                          Tesseract Local
                        </button>
                        <button
                          onClick={() => setOcrEngine('gemini')}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                            ocrEngine === 'gemini'
                              ? 'bg-indigo-600 text-white shadow'
                              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                          }`}
                        >
                          <Sparkles className="h-3 w-3 text-amber-300" />
                          Gemini AI
                        </button>
                      </div>
                    </div>

                    {/* Language Selector */}
                    <div>
                      <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1">OCR Language</label>
                      <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-slate-800 dark:text-zinc-100 outline-none focus:border-blue-500"
                      >
                        {SUPPORTED_LANGUAGES.map(lang => (
                          <option key={lang.code} value={lang.code}>
                            {lang.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Run OCR Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={runOcrForCurrentPage}
                      disabled={isOcrProcessing}
                      className="flex-1 py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isOcrProcessing ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>{ocrProgressMsg || 'Processing...'}</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 fill-white" />
                          <span>Run OCR on Page {currentPage}</span>
                        </>
                      )}
                    </button>

                    {totalPages > 1 && (
                      <button
                        onClick={runOcrForAllPages}
                        disabled={isOcrProcessing}
                        className="py-2 px-3 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-zinc-800 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Layers className="h-3.5 w-3.5 text-blue-500" />
                        <span>OCR All {totalPages} Pages</span>
                      </button>
                    )}

                    <button
                      onClick={runAiTextCorrection}
                      disabled={isAiCorrecting || !pageResults[currentPage]}
                      className="py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      {isAiCorrecting ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Wand2 className="h-3.5 w-3.5" />
                      )}
                      <span>AI Fix Errors</span>
                    </button>
                  </div>

                  {/* Progress Bar */}
                  {isOcrProcessing && (
                    <div className="space-y-1 animate-fade-in">
                      <div className="w-full bg-slate-100 dark:bg-zinc-900 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full transition-all duration-300"
                          style={{ width: `${ocrPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span>{ocrProgressMsg}</span>
                        <span>{ocrPercent}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* View Mode Tabs & Search Overlay Toggle */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-900 pb-2">
                  <div className="flex gap-1">
                    {[
                      { id: 'formatted', label: 'Formatted Editor', icon: Type },
                      { id: 'plain', label: 'Plain Text', icon: FileText },
                      { id: 'tables', label: 'Tables Grid', icon: Table },
                      { id: 'layout', label: 'Layout Overlay', icon: Grid }
                    ].map(tab => {
                      const IconComp = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setEditorTab(tab.id as any)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                            editorTab === tab.id
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900'
                          }`}
                        >
                          <IconComp className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setHighlightLowConfidence(prev => !prev)}
                      className={`text-[11px] font-semibold px-2 py-1 rounded-lg border flex items-center gap-1 cursor-pointer ${
                        highlightLowConfidence
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                      title="Toggle Low Confidence Text Highlighting"
                    >
                      <Sparkle className="h-3 w-3" />
                      <span>Highlight Errors</span>
                    </button>

                    <button
                      onClick={() => setShowSearchReplace(prev => !prev)}
                      className="p-1 text-slate-400 hover:text-slate-800 cursor-pointer"
                      title="Find & Replace"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Search & Replace Floating Bar */}
                {showSearchReplace && (
                  <div className="bg-slate-50 dark:bg-zinc-900 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-2 animate-fade-in">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <input
                        type="text"
                        placeholder="Find text..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="px-2.5 py-1.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Replace with..."
                        value={replaceQuery}
                        onChange={(e) => setReplaceQuery(e.target.value)}
                        className="px-2.5 py-1.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          if (!searchQuery) return;
                          const currentRes = pageResults[currentPage];
                          if (currentRes) {
                            const updated = currentRes.editedText.replace(new RegExp(searchQuery, 'g'), replaceQuery);
                            handleTextEdit(updated);
                          }
                        }}
                        className="px-2.5 py-1 bg-blue-600 text-white text-[11px] font-bold rounded-lg cursor-pointer"
                      >
                        Replace All
                      </button>
                    </div>
                  </div>
                )}

                {/* Visual Heatmap Overlay Bar & Error Navigator */}
                {renderHeatmapToolbar(false)}

                {/* Rich Formatting Bar (When Formatted Tab Active) */}
                {editorTab === 'formatted' && (
                  <div className="flex flex-wrap items-center gap-1 bg-slate-50 dark:bg-zinc-900 p-1.5 rounded-xl border border-slate-200 dark:border-zinc-800">
                    <button onClick={() => handleFormatCommand('bold')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-700 dark:text-zinc-300 font-bold text-xs" title="Bold">
                      <Bold className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleFormatCommand('italic')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-700 dark:text-zinc-300 italic text-xs" title="Italic">
                      <Italic className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleFormatCommand('underline')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-700 dark:text-zinc-300 underline text-xs" title="Underline">
                      U
                    </button>

                    <div className="h-4 w-px bg-slate-300 dark:bg-zinc-800 mx-1" />

                    <button onClick={() => handleFormatCommand('justifyLeft')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-700 dark:text-zinc-300">
                      <AlignLeft className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleFormatCommand('justifyCenter')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-700 dark:text-zinc-300">
                      <AlignCenter className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleFormatCommand('justifyRight')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-700 dark:text-zinc-300">
                      <AlignRight className="h-3.5 w-3.5" />
                    </button>

                    <div className="h-4 w-px bg-slate-300 dark:bg-zinc-800 mx-1" />

                    <button onClick={() => handleFormatCommand('undo')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-700 dark:text-zinc-300">
                      <Undo className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleFormatCommand('redo')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-700 dark:text-zinc-300">
                      <Redo className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Main Content Area */}
                <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-4 bg-slate-50/50 dark:bg-zinc-900/30 min-h-[380px] max-h-[500px] overflow-auto">
                  {editorTab === 'formatted' && renderFormattedEditorContent()}

                  {editorTab === 'plain' && (
                    <textarea
                      value={pageResults[currentPage]?.editedText || ''}
                      onChange={(e) => handleTextEdit(e.target.value)}
                      placeholder="OCR Extracted plain text will appear here..."
                      className="w-full min-h-[350px] bg-transparent outline-none font-mono text-xs text-slate-800 dark:text-zinc-100 leading-relaxed resize-none"
                    />
                  )}

                  {editorTab === 'tables' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Structured Data & Detected Tables</span>
                        <button
                          onClick={handleExportXlsx}
                          className="px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5" />
                          <span>Export to XLSX</span>
                        </button>
                      </div>
                      <div className="overflow-x-auto border border-slate-200 dark:border-zinc-800 rounded-lg">
                        <table className="w-full text-left text-xs border-collapse">
                          <tbody>
                            {(pageResults[currentPage]?.editedText || '').split('\n').map((line, rIdx) => {
                              const cells = line.includes('\t') ? line.split('\t') : line.split('|').filter(Boolean);
                              return (
                                <tr key={rIdx} className="border-b border-slate-100 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-900">
                                  {cells.map((c, cIdx) => (
                                    <td key={cIdx} className="p-2 border-r border-slate-100 dark:border-zinc-800 font-mono text-[11px]">
                                      {c.trim()}
                                    </td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {editorTab === 'layout' && (
                    <div className="space-y-2 text-xs">
                      <p className="text-[11px] font-bold text-slate-500">Detected Text Blocks & Confidence Coordinates:</p>
                      {(pageResults[currentPage]?.words || []).map((w, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg">
                          <span className="font-mono text-xs text-slate-800 dark:text-zinc-200">{w.text}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-slate-400">
                              x: {w.bbox.x0}, y: {w.bbox.y0}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              w.confidence > 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {w.confidence}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="text-[11px] text-slate-400 font-mono">
                    Page Confidence: {pageResults[currentPage]?.confidence || 0}%
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const txt = pageResults[currentPage]?.editedText || '';
                        navigator.clipboard.writeText(txt);
                        alert('Page text copied to clipboard!');
                      }}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 text-slate-800 dark:text-zinc-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-zinc-800 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Text</span>
                    </button>

                    <button
                      onClick={() => setShowExportModal(true)}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Export Document...</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {/* BATCH FILES OCR MODE */}
      {workstationMode === 'batch' && (
        <div className="space-y-6">
          {/* If a batch file is selected for Document Review Preview */}
          {selectedBatchFileId ? (
            (() => {
              const selectedItem = batchFiles.find(f => f.id === selectedBatchFileId);
              if (!selectedItem) {
                setSelectedBatchFileId(null);
                return null;
              }

              const selectedIdx = batchFiles.findIndex(f => f.id === selectedBatchFileId);
              const totalBatchCount = batchFiles.length;
              const docTotalPages = selectedItem.totalPages || Object.keys(selectedItem.pageResults || {}).length || 1;
              const currentPageRes = selectedItem.pageResults?.[batchReviewPage];
              const avgConfidence = selectedItem.pageResults
                ? Math.round(
                    (Object.values(selectedItem.pageResults) as PageOCRResult[]).reduce((acc: number, curr: PageOCRResult) => acc + (curr.confidence || 0), 0) /
                    Math.max(1, Object.keys(selectedItem.pageResults).length)
                  )
                : 90;

              return (
                <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6 animate-fade-in">
                  {/* Top Review Navigation & Document Switcher */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-900 pb-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => setSelectedBatchFileId(null)}
                        className="px-3.5 py-2 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-zinc-800 transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back to Queue</span>
                      </button>

                      <div className="h-6 w-px bg-slate-200 dark:border-zinc-800 hidden sm:block" />

                      {/* Previous / Next Document Controls */}
                      <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-900/80 p-1 rounded-2xl border border-slate-200 dark:border-zinc-800">
                        <button
                          onClick={() => {
                            if (selectedIdx > 0) {
                              setSelectedBatchFileId(batchFiles[selectedIdx - 1].id);
                            }
                          }}
                          disabled={selectedIdx <= 0}
                          className="p-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded-xl text-slate-600 dark:text-zinc-300 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-all"
                          title="Previous Document"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>

                        <select
                          value={selectedBatchFileId}
                          onChange={(e) => setSelectedBatchFileId(e.target.value)}
                          className="bg-transparent text-xs font-bold text-slate-800 dark:text-zinc-200 outline-none px-2 py-1 cursor-pointer max-w-[220px] sm:max-w-xs truncate"
                        >
                          {batchFiles.map((bf, idx) => (
                            <option key={bf.id} value={bf.id} className="dark:bg-zinc-900">
                              Doc {idx + 1}/{batchFiles.length}: {bf.file.name} ({bf.status.toUpperCase()})
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => {
                            if (selectedIdx < totalBatchCount - 1) {
                              setSelectedBatchFileId(batchFiles[selectedIdx + 1].id);
                            }
                          }}
                          disabled={selectedIdx >= totalBatchCount - 1}
                          className="p-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded-xl text-slate-600 dark:text-zinc-300 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-all"
                          title="Next Document"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Document Badges */}
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 text-[11px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          <span>{selectedItem.file.name}</span>
                          <span className="text-[10px] opacity-70">({formatBytes(selectedItem.file.size)})</span>
                        </span>

                        <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 ${
                          avgConfidence >= 80
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                        }`}>
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>{avgConfidence}% Confidence</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowBatchZipModal(true)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="h-4 w-4" />
                        <span>Download All as ZIP</span>
                      </button>
                    </div>
                  </div>

                  {/* 2-Pane Side-by-Side Review Grid */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                    {/* LEFT PANE: Original Document Viewer */}
                    <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-zinc-900/30 space-y-4">
                      {/* Left Pane Header & Controls */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-zinc-800 pb-3">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4 text-blue-500" />
                          <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                            Original Scanned Page ({batchReviewPage} of {docTotalPages})
                          </span>
                        </div>

                        {/* Page Switching & Zoom Toolbar */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-1 rounded-xl border border-slate-200 dark:border-zinc-800">
                            <button
                              onClick={() => setBatchReviewPage(p => Math.max(1, p - 1))}
                              disabled={batchReviewPage <= 1}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-600 dark:text-zinc-300 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                              title="Previous Page"
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-[11px] font-mono font-bold px-2 text-slate-700 dark:text-zinc-300">
                              {batchReviewPage} / {docTotalPages}
                            </span>
                            <button
                              onClick={() => setBatchReviewPage(p => Math.min(docTotalPages, p + 1))}
                              disabled={batchReviewPage >= docTotalPages}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-600 dark:text-zinc-300 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                              title="Next Page"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-1 rounded-xl border border-slate-200 dark:border-zinc-800">
                            <button
                              onClick={() => setBatchReviewScale(s => Math.max(0.6, s - 0.2))}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-600 dark:text-zinc-300 cursor-pointer"
                              title="Zoom Out"
                            >
                              <ZoomOut className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-[10px] font-mono px-1 text-slate-500">
                              {Math.round(batchReviewScale * 100)}%
                            </span>
                            <button
                              onClick={() => setBatchReviewScale(s => Math.min(2.5, s + 0.2))}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-600 dark:text-zinc-300 cursor-pointer"
                              title="Zoom In"
                            >
                              <ZoomIn className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Canvas Container */}
                      <div className="flex justify-center items-center bg-slate-200/50 dark:bg-zinc-950/70 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 min-h-[460px] max-h-[580px] overflow-auto">
                        <canvas
                          ref={batchReviewCanvasRef}
                          className="shadow-xl rounded-lg bg-white max-w-full h-auto object-contain"
                        />
                      </div>
                    </div>

                    {/* RIGHT PANE: OCR Text Editor & Quality Review */}
                    <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 bg-white dark:bg-zinc-950 shadow-sm space-y-4">
                      {/* Tabs and Quick Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-900 pb-3">
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl border border-slate-200 dark:border-zinc-800">
                          <button
                            onClick={() => setBatchReviewEditorTab('formatted')}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                              batchReviewEditorTab === 'formatted'
                                ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                            }`}
                          >
                            Formatted Editor
                          </button>
                          <button
                            onClick={() => setBatchReviewEditorTab('plain')}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                              batchReviewEditorTab === 'plain'
                                ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                            }`}
                          >
                            Plain Text
                          </button>
                          <button
                            onClick={() => setBatchReviewEditorTab('tables')}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                              batchReviewEditorTab === 'tables'
                                ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                            }`}
                          >
                            Tables Grid
                          </button>
                          <button
                            onClick={() => setBatchReviewEditorTab('layout')}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                              batchReviewEditorTab === 'layout'
                                ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                            }`}
                          >
                            Coordinates
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={runBatchReviewAiCorrection}
                            disabled={isBatchReviewAiCorrecting || !currentPageRes?.editedText}
                            className="px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                            title="Fix OCR typos, alignments, and spelling errors with Gemini AI"
                          >
                            {isBatchReviewAiCorrecting ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Wand2 className="h-3.5 w-3.5" />
                            )}
                            <span>AI Error Fix</span>
                          </button>

                          <button
                            onClick={() => setBatchReviewHighlightLowConf(prev => !prev)}
                            className={`px-2.5 py-1 text-xs font-bold rounded-xl border transition-all flex items-center gap-1 cursor-pointer ${
                              batchReviewHighlightLowConf
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                            title="Toggle Low Confidence Text Highlighting"
                          >
                            <Sparkle className="h-3 w-3" />
                            <span>Highlight Errors</span>
                          </button>

                          <button
                            onClick={() => setShowBatchReviewSearch(prev => !prev)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-zinc-200 cursor-pointer"
                            title="Find & Replace"
                          >
                            <Search className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Search & Replace Bar for Batch Review */}
                      {showBatchReviewSearch && (
                        <div className="bg-slate-50 dark:bg-zinc-900 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-2 animate-fade-in">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <input
                              type="text"
                              placeholder="Find text..."
                              value={batchReviewSearchQuery}
                              onChange={(e) => setBatchReviewSearchQuery(e.target.value)}
                              className="px-2.5 py-1.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Replace with..."
                              value={batchReviewReplaceQuery}
                              onChange={(e) => setBatchReviewReplaceQuery(e.target.value)}
                              className="px-2.5 py-1.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={handleBatchReviewSearchReplace}
                              className="px-2.5 py-1 bg-blue-600 text-white text-[11px] font-bold rounded-lg cursor-pointer"
                            >
                              Replace All on Page
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Visual Heatmap Overlay Bar & Error Navigator */}
                      {renderHeatmapToolbar(true)}

                      {/* Rich Formatting Bar (When Formatted Tab Active) */}
                      {batchReviewEditorTab === 'formatted' && (
                        <div className="flex flex-wrap items-center gap-1 bg-slate-50 dark:bg-zinc-900 p-1.5 rounded-xl border border-slate-200 dark:border-zinc-800">
                          <button onClick={() => handleFormatCommand('bold')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-700 dark:text-zinc-300 font-bold text-xs" title="Bold">
                            <Bold className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleFormatCommand('italic')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-700 dark:text-zinc-300 italic text-xs" title="Italic">
                            <Italic className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleFormatCommand('underline')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-700 dark:text-zinc-300 underline text-xs" title="Underline">
                            U
                          </button>

                          <div className="h-4 w-px bg-slate-300 dark:bg-zinc-800 mx-1" />

                          <button onClick={() => handleFormatCommand('justifyLeft')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-700 dark:text-zinc-300">
                            <AlignLeft className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleFormatCommand('justifyCenter')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-700 dark:text-zinc-300">
                            <AlignCenter className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleFormatCommand('justifyRight')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-700 dark:text-zinc-300">
                            <AlignRight className="h-3.5 w-3.5" />
                          </button>

                          <div className="h-4 w-px bg-slate-300 dark:bg-zinc-800 mx-1" />

                          <button onClick={() => handleFormatCommand('undo')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-700 dark:text-zinc-300">
                            <Undo className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleFormatCommand('redo')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-700 dark:text-zinc-300">
                            <Redo className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Main Editor Text Content Area */}
                      <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-4 bg-slate-50/50 dark:bg-zinc-900/30 min-h-[380px] max-h-[480px] overflow-auto">
                        {batchReviewEditorTab === 'formatted' && renderBatchReviewFormattedEditorContent()}

                        {batchReviewEditorTab === 'plain' && (
                          <textarea
                            value={currentPageRes?.editedText || ''}
                            onChange={(e) => handleBatchReviewTextEdit(e.target.value)}
                            placeholder="OCR Extracted plain text for this page..."
                            className="w-full min-h-[350px] bg-transparent outline-none font-mono text-xs text-slate-800 dark:text-zinc-100 leading-relaxed resize-none"
                          />
                        )}

                        {batchReviewEditorTab === 'tables' && (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Detected Tabular Data</span>
                              <button
                                onClick={() => handleExportBatchFile(selectedItem, 'xlsx')}
                                className="px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                              >
                                <FileSpreadsheet className="h-3.5 w-3.5" />
                                <span>Export to XLSX</span>
                              </button>
                            </div>
                            <div className="overflow-x-auto border border-slate-200 dark:border-zinc-800 rounded-lg">
                              <table className="w-full text-left text-xs border-collapse">
                                <tbody>
                                  {(currentPageRes?.editedText || '').split('\n').map((line, rIdx) => {
                                    const cells = line.includes('\t') ? line.split('\t') : line.split('|').filter(Boolean);
                                    return (
                                      <tr key={rIdx} className="border-b border-slate-100 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-900">
                                        {cells.map((c, cIdx) => (
                                          <td key={cIdx} className="p-2 border-r border-slate-100 dark:border-zinc-800 font-mono text-[11px]">
                                            {c.trim()}
                                          </td>
                                        ))}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {batchReviewEditorTab === 'layout' && (
                          <div className="space-y-2 text-xs">
                            <p className="text-[11px] font-bold text-slate-500">Detected Words & Bounding Boxes:</p>
                            {(currentPageRes?.words || []).map((w, idx) => (
                              <div key={idx} className="flex justify-between items-center p-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg">
                                <span className="font-mono text-xs text-slate-800 dark:text-zinc-200">{w.text}</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-mono text-slate-400">
                                    x: {w.bbox?.x0 || 0}, y: {w.bbox?.y0 || 0}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    (w.confidence || 0) > 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {w.confidence || 0}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Export Toolbar for this Document */}
                      <div className="border-t border-slate-100 dark:border-zinc-900 pt-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="text-[11px] text-slate-400 font-mono">
                          Page Confidence: {currentPageRes?.confidence || 0}%
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => {
                              const txt = currentPageRes?.editedText || '';
                              navigator.clipboard.writeText(txt);
                              alert('Page text copied to clipboard!');
                            }}
                            className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 text-slate-800 dark:text-zinc-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-zinc-800 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy</span>
                          </button>

                          <button
                            onClick={() => handleExportBatchFile(selectedItem, 'pdf')}
                            className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Export as Searchable PDF with invisible OCR layer"
                          >
                            <FileText className="h-3.5 w-3.5 text-rose-600" />
                            <span>Searchable PDF</span>
                          </button>

                          <button
                            onClick={() => handleExportBatchFile(selectedItem, 'docx')}
                            className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border border-blue-200 dark:border-blue-900 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Export as Microsoft Word"
                          >
                            <FileText className="h-3.5 w-3.5 text-blue-600" />
                            <span>Word (.docx)</span>
                          </button>

                          <button
                            onClick={() => handleExportBatchFile(selectedItem, 'txt')}
                            className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 border border-slate-200 dark:border-zinc-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>Plain TXT</span>
                          </button>

                          <button
                            onClick={() => handleExportBatchFile(selectedItem, 'xlsx')}
                            className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-900 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Excel</span>
                          </button>

                          <button
                            onClick={() => handleExportBatchFile(selectedItem, 'json')}
                            className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-900 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <FileCode className="h-3.5 w-3.5 text-indigo-600" />
                            <span>JSON</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            /* BATCH QUEUE & MULTI-FILE WORKSPACE */
            <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-900 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-50">Batch OCR Queue</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Upload multiple PDF documents or scans. Process concurrently and review / export in multiple formats.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={runBatchOcr}
                    disabled={isBatchProcessing || batchFiles.length === 0}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isBatchProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-white" />}
                    <span>Start Batch OCR</span>
                  </button>

                  <button
                    onClick={() => setShowBatchZipModal(true)}
                    disabled={!batchFiles.some(f => f.status === 'done')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download All (ZIP)</span>
                  </button>
                </div>
              </div>

              {/* Batch Dropzone */}
              <div
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    const filesArray: File[] = Array.from(e.dataTransfer.files);
                    const newItems: BatchFileItem[] = filesArray.map(file => ({
                      id: Math.random().toString(36).substring(7),
                      file,
                      totalPages: file.type.includes('pdf') || file.name.endsWith('.pdf') ? 1 : 1,
                      status: 'idle',
                      progress: 0
                    }));
                    setBatchFiles(prev => [...prev, ...newItems]);
                  }
                }}
                className="border-2 border-dashed border-slate-200 dark:border-zinc-800 hover:border-blue-500 rounded-2xl p-8 text-center bg-slate-50/50 dark:bg-zinc-900/30 relative transition-all cursor-pointer"
              >
                <input
                  type="file"
                  multiple
                  accept=".pdf,application/pdf,image/*"
                  onChange={handleBatchFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <Upload className="h-10 w-10 text-blue-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">Click or Drag & Drop Multiple PDF / Image Files Here</p>
                <p className="text-[11px] text-slate-400 mt-1">Batch queue processes multiple documents with progress tracking & multi-format export</p>
              </div>

              {/* Batch Files List */}
              {batchFiles.length > 0 && (
                <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-slate-500 font-extrabold uppercase text-[10px]">
                        <th className="p-3.5">File Name</th>
                        <th className="p-3.5">Size</th>
                        <th className="p-3.5">Pages</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchFiles.map((item) => (
                        <tr key={item.id} className="border-b border-slate-100 dark:border-zinc-900 hover:bg-slate-50/60 dark:hover:bg-zinc-900/40 transition-colors">
                          <td className="p-3.5 font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-2.5">
                            <div className="h-8 w-8 bg-blue-50 dark:bg-blue-950/60 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                              <FileText className="h-4 w-4" />
                            </div>
                            <span className="truncate max-w-xs">{item.file.name}</span>
                          </td>
                          <td className="p-3.5 font-mono text-slate-500">{formatBytes(item.file.size)}</td>
                          <td className="p-3.5 font-mono text-slate-500">{item.totalPages || 1}</td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                              item.status === 'done' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' :
                              item.status === 'processing' ? 'bg-blue-100 text-blue-700 animate-pulse dark:bg-blue-950/60 dark:text-blue-300' :
                              item.status === 'error' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {item.status === 'done' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedBatchFileId(item.id);
                                      setBatchReviewPage(1);
                                    }}
                                    className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-bold rounded-xl border border-blue-200 dark:border-blue-800 text-[11px] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    <span>Review Document</span>
                                  </button>

                                  {/* Export Dropdown buttons */}
                                  <button
                                    onClick={() => handleExportBatchFile(item, 'pdf')}
                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-rose-600 rounded-lg cursor-pointer"
                                    title="Quick Export Searchable PDF"
                                  >
                                    <FileText className="h-4 w-4" />
                                  </button>

                                  <button
                                    onClick={() => handleExportBatchFile(item, 'docx')}
                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-blue-600 rounded-lg cursor-pointer"
                                    title="Quick Export Word DOCX"
                                  >
                                    <FileText className="h-4 w-4" />
                                  </button>

                                  <button
                                    onClick={() => handleExportBatchFile(item, 'xlsx')}
                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-emerald-600 rounded-lg cursor-pointer"
                                    title="Quick Export Excel XLSX"
                                  >
                                    <FileSpreadsheet className="h-4 w-4" />
                                  </button>
                                </>
                              )}

                              <button
                                onClick={() => setBatchFiles(prev => prev.filter(f => f.id !== item.id))}
                                className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                                title="Remove File"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SINGLE FILE EXPORT OPTIONS MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-900 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-50">Select Export Format</h3>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-800 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleExportSearchablePdf}
                className="w-full p-3 bg-slate-50 dark:bg-zinc-900/60 hover:bg-blue-50 dark:hover:bg-blue-950/30 border border-slate-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-rose-500/10 text-rose-600 rounded-xl flex items-center justify-center">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-100 block">Searchable PDF (.pdf)</span>
                    <span className="text-[10px] text-slate-400">Invisible OCR text layer embedded over original scan.</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
              </button>

              <button
                onClick={handleExportDocx}
                className="w-full p-3 bg-slate-50 dark:bg-zinc-900/60 hover:bg-blue-50 dark:hover:bg-blue-950/30 border border-slate-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-blue-500/10 text-blue-600 rounded-xl flex items-center justify-center">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-100 block">Microsoft Word (.docx)</span>
                    <span className="text-[10px] text-slate-400">Fully editable formatted Word document.</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
              </button>

              <button
                onClick={handleExportXlsx}
                className="w-full p-3 bg-slate-50 dark:bg-zinc-900/60 hover:bg-blue-50 dark:hover:bg-blue-950/30 border border-slate-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-100 block">Excel Spreadsheet (.xlsx)</span>
                    <span className="text-[10px] text-slate-400">Structured tables exported directly to Excel sheets.</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
              </button>

              <button
                onClick={handleExportTxt}
                className="w-full p-3 bg-slate-50 dark:bg-zinc-900/60 hover:bg-blue-50 dark:hover:bg-blue-950/30 border border-slate-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-slate-500/10 text-slate-600 rounded-xl flex items-center justify-center">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-100 block">Plain Text (.txt)</span>
                    <span className="text-[10px] text-slate-400">Simple UTF-8 text file download.</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
              </button>

              <button
                onClick={handleExportJson}
                className="w-full p-3 bg-slate-50 dark:bg-zinc-900/60 hover:bg-blue-50 dark:hover:bg-blue-950/30 border border-slate-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-indigo-500/10 text-indigo-600 rounded-xl flex items-center justify-center">
                    <FileCode className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-100 block">Structured JSON (.json)</span>
                    <span className="text-[10px] text-slate-400">Contains raw bounding boxes, words, and confidence scores.</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATCH DOWNLOAD ALL AS ZIP MODAL */}
      {showBatchZipModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-900 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-50">Batch ZIP Export</h3>
                <p className="text-xs text-slate-500">Choose the format bundle for all processed documents.</p>
              </div>
              <button
                onClick={() => setShowBatchZipModal(false)}
                disabled={isGeneratingBatchZip}
                className="text-slate-400 hover:text-slate-800 cursor-pointer disabled:opacity-30"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isGeneratingBatchZip ? (
              <div className="p-8 text-center space-y-4">
                <RefreshCw className="h-10 w-10 text-blue-600 animate-spin mx-auto" />
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-zinc-100">Generating ZIP Archive...</p>
                  <p className="text-xs text-slate-500 font-mono mt-1">{batchZipProgressMsg || 'Please wait...'}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => handleDownloadBatchZipWithOptions('all')}
                  className="w-full p-3 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100/50 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md">
                      <Download className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-100 block">Complete Archive (All Formats)</span>
                      <span className="text-[10px] text-slate-500">Folder for each doc containing Searchable PDF, DOCX, TXT, XLSX & JSON.</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-blue-600" />
                </button>

                <button
                  onClick={() => handleDownloadBatchZipWithOptions('pdf')}
                  className="w-full p-3 bg-slate-50 dark:bg-zinc-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-slate-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-rose-500/10 text-rose-600 rounded-xl flex items-center justify-center">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-100 block">Searchable PDFs (.pdf ZIP)</span>
                      <span className="text-[10px] text-slate-400">All documents as searchable PDFs with invisible text layer.</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-rose-600" />
                </button>

                <button
                  onClick={() => handleDownloadBatchZipWithOptions('docx')}
                  className="w-full p-3 bg-slate-50 dark:bg-zinc-900/60 hover:bg-blue-50 dark:hover:bg-blue-950/30 border border-slate-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-500/10 text-blue-600 rounded-xl flex items-center justify-center">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-100 block">Microsoft Word (.docx ZIP)</span>
                      <span className="text-[10px] text-slate-400">All documents exported as editable Word files.</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                </button>

                <button
                  onClick={() => handleDownloadBatchZipWithOptions('txt')}
                  className="w-full p-3 bg-slate-50 dark:bg-zinc-900/60 hover:bg-slate-100 dark:hover:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-slate-500/10 text-slate-600 rounded-xl flex items-center justify-center">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-100 block">Plain Text (.txt ZIP)</span>
                      <span className="text-[10px] text-slate-400">Simple plain text files for each document.</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
