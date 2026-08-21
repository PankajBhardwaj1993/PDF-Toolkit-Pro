import React, { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import SEO from './SEO';
import { 
  ArrowLeft, Upload, FileText, Download, CheckCircle, AlertCircle, 
  RotateCw, Trash2, Sliders, Sparkles, Languages, HelpCircle, FileSignature, 
  RefreshCw, Eraser, DownloadCloud, Loader2, Play, Table, Key, QrCode
} from 'lucide-react';
import { 
  mergePDFs, splitPDF, rotatePDF, deletePDFPages, 
  extractPDFPages, addPageNumbers, addWatermark, addSignatureToPDF 
} from '../utils/pdfUtils';
import OnlinePdfEditor from './OnlinePdfEditor';
import InteractiveSignPdf from './InteractiveSignPdf';
import InteractiveDeletePdf from './InteractiveDeletePdf';
import InteractiveRotatePdf from './InteractiveRotatePdf';
import CropImageWorkstation from './CropImageWorkstation';
import PassportPhotoWorkstation from './PassportPhotoWorkstation';
import TextToSpeechWorkstation from './TextToSpeechWorkstation';
import GrammarWorkstation from './GrammarWorkstation';
import MergePdfWorkstation from './MergePdfWorkstation';
import CanonicalTestWorkstation from './CanonicalTestWorkstation';
import WordEditorWorkstation from './WordEditorWorkstation';
import ExcelEditorWorkstation from './ExcelEditorWorkstation';
import PdfMetadataEditorWorkstation from './PdfMetadataEditorWorkstation';
import BatchProcessorWorkstation from './BatchProcessorWorkstation';
import PdfOcrWorkstation from './PdfOcrWorkstation';
import { allToolsList } from '../data/tools';

interface ToolActiveViewProps {
  toolId: string;
  onBack: () => void;
  user: any;
  onAddRecentFile: (file: { name: string; size: string; type: string; toolUsed: string }) => void;
}

export const getToolSlug = (t: { id: string; name?: string; slug?: string }) => t.slug || t.id.toLowerCase().replace(/_/g, '-').replace(/[^a-z0-9-]/g, '');

export default function ToolActiveView({ toolId, onBack, user, onAddRecentFile }: ToolActiveViewProps) {
  const tool = allToolsList.find(t => t.id === toolId || getToolSlug(t) === toolId || t.id.replace(/_/g, '-') === toolId) || { name: 'PDF Tool', description: 'Process PDF files.', id: toolId };
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any>(null); // holds bytes or base64 urls or text

  // Tool specific configurations
  const [rotation, setRotation] = useState(90);
  const [pagesToDelete, setPagesToDelete] = useState('');
  const [pagesToExtract, setPagesToExtract] = useState('');
  const [watermarkText, setWatermarkText] = useState('PDF TOOLKIT PRO');
  const [pageNumberPos, setPageNumberPos] = useState<'bottom-center' | 'bottom-right' | 'top-right'>('bottom-center');

  // Signature states
  const [sigType, setSigType] = useState<'draw' | 'type'>('draw');
  const [typeSigName, setTypeSigName] = useState('');
  const [sigBrushSize, setSigBrushSize] = useState(3);
  const [sigColor, setSigColor] = useState('#000000');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Image operations
  const [imgWidth, setImgWidth] = useState(800);
  const [imgHeight, setImgHeight] = useState(600);
  const [imgQuality, setImgQuality] = useState(80);
  const [imgFormat, setImgFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg');

  // AI Operations
  const [textInput, setTextInput] = useState('');
  const [targetLang, setTargetLang] = useState('Spanish');
  const [aiTone, setAiTone] = useState('Professional');
  const [summarizeLevel, setSummarizeLevel] = useState('detailed');

  // AI Chat states
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: 'Hello! Upload a document or type some context, and ask me any questions about it.' }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Password / QR Generator
  const [qrText, setQrText] = useState('https://pdftoolkitpro.online');
  const [passLength, setPassLength] = useState(16);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [pdfPassword, setPdfPassword] = useState('');
  const [compressionLevel, setCompressionLevel] = useState(50);

  // Signature pad logic
  useEffect(() => {
    if (sigType === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = sigColor;
        ctx.lineWidth = sigBrushSize;
      }
    }
  }, [sigType, sigColor, sigBrushSize]);

  const startSignatureDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const drawSignature = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopSignatureDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignatureCanvas = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  // Drag and drop trigger helpers
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setUploadedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFiles(prev => [...prev, ...Array.from(e.target.files)]);
    }
  };

  // Helper to format file sizes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Central Core Processing trigger
  const handleProcess = async () => {
    setError(null);
    setSuccessResult(null);
    setIsProcessing(true);

    try {
      if (toolId === 'merge_pdf') {
        if (uploadedFiles.length < 2) {
          throw new Error('Please upload at least 2 PDF files to merge.');
        }
        const bytes = await mergePDFs(uploadedFiles);
        setSuccessResult({
          type: 'application/pdf',
          name: 'merged_document.pdf',
          bytes,
        });
        onAddRecentFile({
          name: 'merged_document.pdf',
          size: formatBytes(bytes.length),
          type: 'application/pdf',
          toolUsed: 'Merge PDF',
        });
      }

      else if (toolId === 'split_pdf') {
        if (uploadedFiles.length === 0) throw new Error('Please upload a PDF file.');
        const results = await splitPDF(uploadedFiles[0]);
        setSuccessResult({
          type: 'pdf_split_set',
          pages: results,
        });
        onAddRecentFile({
          name: `${uploadedFiles[0].name.replace('.pdf', '')}_split_pages.zip`,
          size: formatBytes(results[0].bytes.length * results.length),
          type: 'application/zip',
          toolUsed: 'Split PDF',
        });

        // Trigger automatic ZIP download for seamless experience
        try {
          const zip = new JSZip();
          results.forEach((pg: any) => {
            zip.file(`page_${pg.pageNum}.pdf`, pg.bytes);
          });
          const content = await zip.generateAsync({ type: 'blob' });
          const url = URL.createObjectURL(content);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${uploadedFiles[0].name.replace('.pdf', '')}_split_pages.zip`;
          a.click();
        } catch (zipErr) {
          console.error('Failed to auto-download ZIP:', zipErr);
        }
      }

      else if (toolId === 'rotate_pdf') {
        if (uploadedFiles.length === 0) throw new Error('Please upload a PDF file.');
        const bytes = await rotatePDF(uploadedFiles[0], rotation);
        const name = `rotated_${uploadedFiles[0].name}`;
        setSuccessResult({ type: 'application/pdf', name, bytes });
        onAddRecentFile({
          name,
          size: formatBytes(bytes.length),
          type: 'application/pdf',
          toolUsed: 'Rotate PDF',
        });
      }

      else if (toolId === 'delete_pdf') {
        if (uploadedFiles.length === 0) throw new Error('Please upload a PDF file.');
        const pages = pagesToDelete.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));
        if (pages.length === 0) throw new Error('Please enter valid page numbers (e.g. 1, 3, 5).');
        const bytes = await deletePDFPages(uploadedFiles[0], pages);
        const name = `modified_${uploadedFiles[0].name}`;
        setSuccessResult({ type: 'application/pdf', name, bytes });
        onAddRecentFile({
          name,
          size: formatBytes(bytes.length),
          type: 'application/pdf',
          toolUsed: 'Delete PDF Pages',
        });
      }

      else if (toolId === 'extract_pdf') {
        if (uploadedFiles.length === 0) throw new Error('Please upload a PDF file.');
        const pages = pagesToExtract.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));
        if (pages.length === 0) throw new Error('Please enter valid page numbers to extract (e.g. 2, 4).');
        const bytes = await extractPDFPages(uploadedFiles[0], pages);
        const name = `extracted_${uploadedFiles[0].name}`;
        setSuccessResult({ type: 'application/pdf', name, bytes });
        onAddRecentFile({
          name,
          size: formatBytes(bytes.length),
          type: 'application/pdf',
          toolUsed: 'Extract PDF Pages',
        });
      }

      else if (toolId === 'page_numbers') {
        if (uploadedFiles.length === 0) throw new Error('Please upload a PDF file.');
        const bytes = await addPageNumbers(uploadedFiles[0], pageNumberPos);
        const name = `numbered_${uploadedFiles[0].name}`;
        setSuccessResult({ type: 'application/pdf', name, bytes });
        onAddRecentFile({
          name,
          size: formatBytes(bytes.length),
          type: 'application/pdf',
          toolUsed: 'Add Page Numbers',
        });
      }

      else if (toolId === 'watermark') {
        if (uploadedFiles.length === 0) throw new Error('Please upload a PDF file.');
        const bytes = await addWatermark(uploadedFiles[0], watermarkText);
        const name = `watermarked_${uploadedFiles[0].name}`;
        setSuccessResult({ type: 'application/pdf', name, bytes });
        onAddRecentFile({
          name,
          size: formatBytes(bytes.length),
          type: 'application/pdf',
          toolUsed: 'Add Watermark',
        });
      }

      else if (toolId === 'protect_pdf') {
        if (uploadedFiles.length === 0) throw new Error('Please upload a PDF file.');
        if (!pdfPassword) throw new Error('Please enter a password to protect the PDF.');
        
        const reader = new FileReader();
        reader.readAsDataURL(uploadedFiles[0]);
        const base64: string = await new Promise((res) => reader.onload = () => res(reader.result as string));
        const cleanBase64 = base64.replace(/^data:application\/pdf;base64,/, '');

        const response = await fetch('/api/pdf/protect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfBase64: cleanBase64, password: pdfPassword }),
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to protect PDF');

        const encryptedBytes = Uint8Array.from(atob(data.pdfBase64), c => c.charCodeAt(0));
        const name = `protected_${uploadedFiles[0].name}`;
        
        setSuccessResult({ type: 'application/pdf', name, bytes: encryptedBytes });
        onAddRecentFile({
          name,
          size: formatBytes(encryptedBytes.length),
          type: 'application/pdf',
          toolUsed: 'Protect PDF',
        });
      }

      else if (toolId === 'compress_pdf') {
        if (uploadedFiles.length === 0) throw new Error('Please upload a PDF file.');
        
        const reader = new FileReader();
        reader.readAsDataURL(uploadedFiles[0]);
        const base64: string = await new Promise((res) => reader.onload = () => res(reader.result as string));
        const cleanBase64 = base64.replace(/^data:application\/pdf;base64,/, '');

        const response = await fetch('/api/pdf/compress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfBase64: cleanBase64, compressionLevel }),
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to compress PDF');

        const compressedBytes = Uint8Array.from(atob(data.pdfBase64), c => c.charCodeAt(0));
        const name = `compressed_${uploadedFiles[0].name}`;
        
        setSuccessResult({ 
          type: 'application/pdf', 
          name, 
          bytes: compressedBytes,
          stats: data.stats
        });
        onAddRecentFile({
          name,
          size: formatBytes(compressedBytes.length),
          type: 'application/pdf',
          toolUsed: 'Compress PDF',
        });
      }

      else if (toolId === 'sign_pdf') {
        if (uploadedFiles.length === 0) throw new Error('Please upload a PDF file.');
        if (!canvasRef.current && sigType === 'draw') throw new Error('Please create a signature first.');
        
        let sigUrl = '';
        if (sigType === 'draw' && canvasRef.current) {
          sigUrl = canvasRef.current.toDataURL('image/png');
        } else if (sigType === 'type') {
          // Render typed signature onto a temp canvas
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = 400;
          tempCanvas.height = 150;
          const ctx = tempCanvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = sigColor;
            ctx.font = '32px cursive';
            ctx.fillText(typeSigName || 'My Signature', 30, 80);
          }
          sigUrl = tempCanvas.toDataURL('image/png');
        }

        const bytes = await addSignatureToPDF(uploadedFiles[0], sigUrl);
        const name = `signed_${uploadedFiles[0].name}`;
        setSuccessResult({ type: 'application/pdf', name, bytes });
        onAddRecentFile({
          name,
          size: formatBytes(bytes.length),
          type: 'application/pdf',
          toolUsed: 'Sign PDF',
        });
      }

      else if (toolId === 'draw_signature') {
        let sigUrl = '';
        if (sigType === 'draw' && canvasRef.current) {
          sigUrl = canvasRef.current.toDataURL('image/png');
        } else {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = 400;
          tempCanvas.height = 150;
          const ctx = tempCanvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = sigColor;
            ctx.font = '32px cursive';
            ctx.fillText(typeSigName || 'My Signature', 40, 80);
          }
          sigUrl = tempCanvas.toDataURL('image/png');
        }

        setSuccessResult({
          type: 'image_download',
          name: 'my_signature_transparent.png',
          url: sigUrl,
        });
        onAddRecentFile({
          name: 'my_signature_transparent.png',
          size: '45 KB',
          type: 'image/png',
          toolUsed: 'Draw Signature',
        });
      }

      else if (toolId === 'compress_image' || toolId === 'resize_image' || toolId === 'convert_image') {
        if (uploadedFiles.length === 0) throw new Error('Please upload an image file.');
        
        // Process image with client Canvas
        const img = new Image();
        img.src = URL.createObjectURL(uploadedFiles[0]);
        await new Promise((res) => img.onload = res);

        const canvas = document.createElement('canvas');
        if (toolId === 'compress_image') {
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
        } else {
          canvas.width = imgWidth || img.width;
          canvas.height = imgHeight || img.height;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }

        const url = canvas.toDataURL(imgFormat, imgQuality / 100);
        
        // Calculate exact compressed byte size from data URL
        const head = `data:${imgFormat};base64,`;
        const newSizeBytes = Math.round((url.length - head.length) * 3 / 4);
        const originalSizeBytes = uploadedFiles[0].size || 1;
        const reductionPercent = Math.max(0, Math.round(((originalSizeBytes - newSizeBytes) / originalSizeBytes) * 100));

        const rawExt = imgFormat.split('/')[1];
        const extension = rawExt === 'jpeg' ? 'jpg' : rawExt;
        const name = `${toolId === 'compress_image' ? 'compressed' : 'processed'}_${uploadedFiles[0].name.split('.')[0]}.${extension}`;
        
        setSuccessResult({
          type: 'image_download',
          name,
          url,
          stats: {
            originalSize: originalSizeBytes,
            newSize: newSizeBytes,
            reductionPercent
          }
        });
        onAddRecentFile({
          name,
          size: formatBytes(newSizeBytes),
          type: imgFormat,
          toolUsed: toolId === 'compress_image' ? 'Compress Image' : 'Image Utilities',
        });
      }

      // ==========================================
      // BACKEND GEMINI AI TRIGGER SUITE
      // ==========================================
      else if (toolId === 'ai_ocr' || toolId === 'ai_image_ocr') {
        if (uploadedFiles.length === 0) throw new Error('Please upload an image document (JPEG/PNG/WEBP).');
        
        const reader = new FileReader();
        reader.readAsDataURL(uploadedFiles[0]);
        const base64: string = await new Promise((res) => reader.onload = () => res(reader.result as string));

        const response = await fetch('/api/ai/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType: uploadedFiles[0].type }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Gemini AI OCR request failed.');

        setSuccessResult({
          type: 'ai_text_output',
          title: 'AI OCR Extracted Text',
          text: data.text,
        });
        onAddRecentFile({
          name: `${uploadedFiles[0].name}_ocr.txt`,
          size: '2 KB',
          type: 'text/plain',
          toolUsed: 'AI Document OCR',
        });
      }

      else if (toolId === 'ai_grammar') {
        if (!textInput.trim()) throw new Error('Please input text for grammatical review.');

        const response = await fetch('/api/ai/grammar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textInput }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        setSuccessResult({
          type: 'ai_text_output',
          title: 'Grammar and Proofreading Analysis',
          text: data.result,
        });
      }

      else if (toolId === 'qr_generator') {
        // Draw canvas QR Code
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 250;
        tempCanvas.height = 250;
        const ctx = tempCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 250, 250);
          ctx.fillStyle = '#000000';
          // Draw standard visual pattern blocks (mock QR code)
          ctx.fillRect(20, 20, 60, 60); ctx.clearRect(30, 30, 40, 40); ctx.fillRect(40, 40, 20, 20);
          ctx.fillRect(170, 20, 60, 60); ctx.clearRect(180, 30, 40, 40); ctx.fillRect(190, 40, 20, 20);
          ctx.fillRect(20, 170, 60, 60); ctx.clearRect(30, 180, 40, 40); ctx.fillRect(40, 190, 20, 20);
          
          // Draw some random pixels
          for (let x = 90; x < 160; x += 10) {
            for (let y = 20; y < 230; y += 10) {
              if (Math.random() > 0.4) ctx.fillRect(x, y, 8, 8);
            }
          }
          for (let x = 20; x < 90; x += 10) {
            for (let y = 90; y < 160; y += 10) {
              if (Math.random() > 0.4) ctx.fillRect(x, y, 8, 8);
            }
          }
          for (let x = 160; x < 230; x += 10) {
            for (let y = 90; y < 230; y += 10) {
              if (Math.random() > 0.4) ctx.fillRect(x, y, 8, 8);
            }
          }
        }
        
        setSuccessResult({
          type: 'image_download',
          name: 'qr_code_utility.png',
          url: tempCanvas.toDataURL('image/png'),
        });
      }

      else if (toolId === 'password_generator') {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
        let pass = '';
        const randomValues = new Uint32Array(passLength);
        window.crypto.getRandomValues(randomValues);
        for (let i = 0; i < passLength; i++) {
          pass += chars[randomValues[i] % chars.length];
        }
        setGeneratedPassword(pass);
        setSuccessResult({
          type: 'text_only',
          text: pass,
        });
      }

    } catch (err: any) {
      setError(err.message || 'An unexpected processing error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };

  // AI Chat message sender
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isProcessing) return;

    const userMessage = { sender: 'user' as const, text: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsProcessing(true);

    try {
      let docTextContext = 'No document context uploaded yet.';
      if (uploadedFiles.length > 0) {
        docTextContext = `Uploaded File: ${uploadedFiles[0].name}. (Size: ${formatBytes(uploadedFiles[0].size)}).`;
      }

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages.slice(-5), userMessage], // send recent history
          documentContext: docTextContext + '\n' + textInput,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setChatMessages(prev => [...prev, { sender: 'ai', text: data.text }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { sender: 'ai', text: `Chat error: ${err.message}` }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadResult = () => {
    if (!successResult) return;
    
    if (successResult.bytes) {
      const blob = new Blob([successResult.bytes], { type: successResult.type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = successResult.name;
      a.click();
    } else if (successResult.url) {
      const a = document.createElement('a');
      a.href = successResult.url;
      a.download = successResult.name;
      a.click();
    }
  };

  const handleDownloadAllAsZip = async () => {
    if (!successResult || !successResult.pages) return;
    try {
      const zip = new JSZip();
      successResult.pages.forEach((pg: any) => {
        zip.file(`page_${pg.pageNum}.pdf`, pg.bytes);
      });
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${uploadedFiles[0]?.name.replace('.pdf', '') || 'document'}_split_pages.zip`;
      a.click();
    } catch (err) {
      console.error('Failed to generate ZIP archive:', err);
      alert('Failed to generate ZIP archive. Please try individual downloads.');
    }
  };

  const cleanToolName = (id: string) => {
    return id.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (toolId === 'online_pdf_editor') {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 xl:px-12 w-full max-w-[1850px] mx-auto space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>
          <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-white/5">
            Interactive Editor Mode
          </span>
        </div>
        <OnlinePdfEditor onAddRecentFile={onAddRecentFile} user={user} />
      </div>
    );
  }

  if (toolId === 'merge_pdf') {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 xl:px-12 w-full max-w-[1850px] mx-auto space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>
          <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-white/5">
            Interactive Editor Mode
          </span>
        </div>
        <MergePdfWorkstation onAddRecentFile={onAddRecentFile} user={user} onBackToTools={onBack} />
      </div>
    );
  }

  if (toolId === 'rotate_pdf') {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 xl:px-12 w-full max-w-[1850px] mx-auto space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>
          <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-white/5">
            Interactive Editor Mode
          </span>
        </div>
        <InteractiveRotatePdf onAddRecentFile={onAddRecentFile} user={user} />
      </div>
    );
  }

  if (toolId === 'delete_pdf') {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 xl:px-12 w-full max-w-[1850px] mx-auto space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>
          <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-white/5">
            Interactive Editor Mode
          </span>
        </div>
        <InteractiveDeletePdf onAddRecentFile={onAddRecentFile} user={user} />
      </div>
    );
  }

  if (toolId === 'sign_pdf') {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 xl:px-12 w-full max-w-[1850px] mx-auto space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>
          <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-white/5">
            Interactive Editor Mode
          </span>
        </div>
        <InteractiveSignPdf onAddRecentFile={onAddRecentFile} user={user} />
      </div>
    );
  }

  if (toolId === 'crop_image') {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 xl:px-12 w-full max-w-[1850px] mx-auto space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>
          <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-white/5">
            Interactive Editor Mode
          </span>
        </div>
        <CropImageWorkstation onAddRecentFile={onAddRecentFile} user={user} onBackToTools={onBack} />
      </div>
    );
  }

  if (toolId === 'passport_photo') {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 xl:px-12 w-full max-w-[1850px] mx-auto space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>
          <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-white/5">
            Interactive Editor Mode
          </span>
        </div>
        <PassportPhotoWorkstation onAddRecentFile={onAddRecentFile} user={user} onBackToTools={onBack} />
      </div>
    );
  }

  if (toolId === 'excel_editor' || toolId === 'excel-editor' || toolId === 'excel' || toolId === 'ms_excel' || toolId === 'ms-excel' || toolId === 'spreadsheet' || toolId === 'spreadsheet_editor') {
    return (
      <div className="py-4 px-2 sm:px-4 lg:px-6 xl:px-10 w-full max-w-[1850px] mx-auto space-y-4">
        <ExcelEditorWorkstation onAddRecentFile={onAddRecentFile} user={user} onBackToTools={onBack} />
      </div>
    );
  }

  if (toolId === 'word_editor' || toolId === 'word-editor' || toolId === 'ms_word' || toolId === 'ms-word' || toolId === 'doc_tool' || toolId === 'word') {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 xl:px-12 w-full max-w-[1850px] mx-auto space-y-4">
        <WordEditorWorkstation onAddRecentFile={onAddRecentFile} user={user} onBackToTools={onBack} />
      </div>
    );
  }

  if (toolId === 'ai_grammar') {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 xl:px-12 w-full max-w-[1850px] mx-auto space-y-4">
        <GrammarWorkstation onAddRecentFile={onAddRecentFile} user={user} onBackToTools={onBack} />
      </div>
    );
  }

  if (toolId === 'text_to_speech' || toolId === 'ai_tts' || toolId === 'text-to-speech') {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 xl:px-12 w-full max-w-[1850px] mx-auto space-y-4">
        <TextToSpeechWorkstation onAddRecentFile={onAddRecentFile} user={user} onBackToTools={onBack} />
      </div>
    );
  }

  if (toolId === 'canonical_tag_test' || toolId === 'canonical-tag-test') {
    if (!user || user.role !== 'admin') {
      return (
        <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-xl mx-auto animate-fade-in text-center space-y-6">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 sm:p-10 shadow-xl space-y-5">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Key className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold font-display text-slate-900 dark:text-zinc-50">
                Admin Authentication Required
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
                The <strong>SEO &amp; Canonical Tag Tester</strong> is an administrative tool restricted to system administrators. Please sign in with an admin account to access this diagnostic suite.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={onBack}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold text-xs rounded-xl transition-all cursor-pointer"
              >
                Back to Tools
              </button>
              <a
                href="/admin"
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Key className="h-3.5 w-3.5" />
                Go to Admin Sign In
              </a>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 xl:px-12 w-full max-w-[1850px] mx-auto space-y-4 animate-fade-in">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>
          <span className="font-mono text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-widest bg-purple-50 dark:bg-purple-950/40 px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800">
            Admin Diagnostic Tool
          </span>
        </div>
        <CanonicalTestWorkstation onAddRecentFile={onAddRecentFile} user={user} onBackToTools={onBack} />
      </div>
    );
  }

  if (toolId === 'edit_pdf_metadata' || toolId === 'pdf_metadata' || toolId === 'pdf_metadata_editor' || toolId === 'pdf-metadata-editor' || toolId === 'edit-pdf-metadata') {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 xl:px-12 w-full max-w-[1850px] mx-auto space-y-4 animate-fade-in">
        <PdfMetadataEditorWorkstation onAddRecentFile={onAddRecentFile} user={user} onBackToTools={onBack} />
      </div>
    );
  }

  if (toolId === 'batch_processor' || toolId === 'batch-processor' || toolId === 'batch' || toolId === 'batch_process') {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 xl:px-12 w-full max-w-[1850px] mx-auto space-y-4 animate-fade-in">
        <BatchProcessorWorkstation onAddRecentFile={onAddRecentFile} user={user} onBackToTools={onBack} />
      </div>
    );
  }

  if (toolId === 'pdf_ocr' || toolId === 'pdf-ocr' || toolId === 'ocr' || toolId === 'pdf_ocr_editor') {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 xl:px-12 w-full max-w-[1850px] mx-auto space-y-4 animate-fade-in">
        <PdfOcrWorkstation onAddRecentFile={onAddRecentFile} user={user} onBackToTools={onBack} />
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 xl:px-12 w-full max-w-[1850px] mx-auto space-y-6">
      
      {/* Workspace Top Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-900 pb-5">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </button>
        <span className="font-mono text-xs text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-zinc-850">
          Sandbox Active
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Dynamic Workspace Workbench Controls */}
        <div className="lg:col-span-7 bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-zinc-50">
                {cleanToolName(toolId)} Workstation
              </h1>
              {toolId === 'remove_bg' && (
                <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center">
                  <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    BETA VERSION
                  </span>
                  <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 animate-pulse">
                    TEMP DISABLED
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              {toolId === 'remove_bg'
                ? 'This workstation is temporarily disabled during our beta testing phase.'
                : 'Drag and drop files below to run conversions and processing safely in your browser.'}
            </p>
          </div>

          {/* 1. Drag & Drop File Upload Field */}
          {toolId === 'remove_bg' ? (
            <div className="border-2 border-dashed border-rose-200 dark:border-rose-900/30 rounded-2xl p-10 text-center bg-rose-50/10 dark:bg-rose-950/5 relative space-y-3">
              <div className="h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-950/30 flex items-center justify-center mx-auto mb-2 text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                Workstation Temporarily Disabled
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                The Remove Bg features are temporarily suspended for optimization in this beta version. It will return fully optimized shortly.
              </p>
            </div>
          ) : (
            toolId !== 'draw_signature' && toolId !== 'password_generator' && toolId !== 'qr_generator' && (
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className="border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl p-8 text-center bg-slate-50/50 dark:bg-zinc-900/10 hover:border-blue-500 hover:bg-slate-50 transition-all cursor-pointer relative"
              >
                <input
                  type="file"
                  multiple={toolId === 'merge_pdf'}
                  onChange={handleFileSelect}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Drag & Drop or Click to Upload
                </p>
                <p className="text-xs text-slate-400 dark:text-zinc-500">
                  {toolId === 'merge_pdf' ? 'Supports multiple PDF files.' : 'Supports PDF, JPEG, PNG, or WEBP up to 2GB.'}
                </p>
              </div>
            )
          )}

          {/* List of currently uploaded files */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Uploaded Elements ({uploadedFiles.length})</p>
              {uploadedFiles.map((f, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 border border-slate-100 dark:border-zinc-900 bg-slate-50/50 dark:bg-zinc-900/40 rounded-xl">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 truncate max-w-[200px]">{f.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-slate-400">{formatBytes(f.size)}</span>
                    <button
                      onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2. Custom Workstations configuration forms */}
          {toolId === 'rotate_pdf' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase text-slate-400">Rotation Angle</label>
              <div className="flex gap-2">
                {[90, 180, 270].map((deg) => (
                  <button
                    key={deg}
                    onClick={() => setRotation(deg)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                      rotation === deg 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                        : 'border-slate-200 dark:border-zinc-800 hover:border-slate-400 dark:text-zinc-200'
                    }`}
                  >
                    +{deg}° Right
                  </button>
                ))}
              </div>
            </div>
          )}

          {toolId === 'delete_pdf' && (
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Page Numbers to Remove</label>
              <input
                type="text"
                placeholder="e.g. 1, 3, 5 (comma separated)"
                value={pagesToDelete}
                onChange={(e) => setPagesToDelete(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 rounded-xl outline-none focus:border-blue-500 dark:text-zinc-100 font-mono text-xs"
              />
            </div>
          )}

          {toolId === 'extract_pdf' && (
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Page Numbers to Extract</label>
              <input
                type="text"
                placeholder="e.g. 2, 4 (comma separated)"
                value={pagesToExtract}
                onChange={(e) => setPagesToExtract(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 rounded-xl outline-none focus:border-blue-500 dark:text-zinc-100 font-mono text-xs"
              />
            </div>
          )}

          {toolId === 'page_numbers' && (
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Number Position</label>
              <select
                value={pageNumberPos}
                onChange={(e: any) => setPageNumberPos(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 rounded-xl outline-none focus:border-blue-500 text-xs dark:text-zinc-100"
              >
                <option value="bottom-center">Bottom Centered (Standard)</option>
                <option value="bottom-right">Bottom Right corner</option>
                <option value="top-right">Top Right corner</option>
              </select>
            </div>
          )}

          {toolId === 'watermark' && (
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Watermark Text</label>
              <input
                type="text"
                placeholder="e.g. SECURE DOCUMENT"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 rounded-xl outline-none focus:border-blue-500 dark:text-zinc-100 text-sm font-semibold"
              />
            </div>
          )}

          {toolId === 'protect_pdf' && (
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Secure PDF Password</label>
              <input
                type="text"
                placeholder="Enter a strong password to lock the PDF"
                value={pdfPassword}
                onChange={(e) => setPdfPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 rounded-xl outline-none focus:border-blue-500 dark:text-zinc-100 font-mono text-sm"
              />
              <p className="text-[10px] text-slate-400 mt-2">
                This password will be required to open or view the document contents. Keep it safe.
              </p>
            </div>
          )}

          {toolId === 'compress_pdf' && (
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2 flex justify-between">
                <span>Compression Strength</span>
                <span className={`font-mono ${
                  compressionLevel > 50 ? 'text-emerald-600 dark:text-emerald-400' :
                  compressionLevel < 50 ? 'text-rose-600 dark:text-rose-400' :
                  'text-blue-600 dark:text-blue-400'
                }`}>{compressionLevel}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={compressionLevel}
                onChange={(e) => setCompressionLevel(parseInt(e.target.value))}
                className={`w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full cursor-pointer mt-2 ${
                  compressionLevel > 50 ? 'accent-emerald-600' :
                  compressionLevel < 50 ? 'accent-rose-600' :
                  'accent-blue-600'
                }`}
              />
              <div className="flex justify-between text-[10px] font-medium mt-2">
                <span className={compressionLevel < 50 ? 'text-rose-500 font-bold' : 'text-slate-400'}>Large Size (Less Compression)</span>
                <span className={compressionLevel > 50 ? 'text-emerald-500 font-bold' : 'text-slate-400'}>Small Size (More Compression)</span>
              </div>
            </div>
          )}

          {(toolId === 'draw_signature' || toolId === 'sign_pdf') && (
            <div className="space-y-4">
              <div className="flex gap-2 border-b border-slate-100 dark:border-zinc-900 pb-3">
                <button
                  type="button"
                  onClick={() => setSigType('draw')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    sigType === 'draw' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-400'
                  }`}
                >
                  Draw Signature
                </button>
                <button
                  type="button"
                  onClick={() => setSigType('type')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    sigType === 'type' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-400'
                  }`}
                >
                  Type Signature
                </button>
              </div>

              {sigType === 'draw' ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs text-slate-400 font-semibold">
                    <span>Brush Color & Size</span>
                    <button
                      type="button"
                      onClick={clearSignatureCanvas}
                      className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
                    >
                      <Eraser className="h-3.5 w-3.5" /> Clear Pad
                    </button>
                  </div>
                  <div className="flex gap-3 items-center">
                    <input 
                      type="color" 
                      value={sigColor} 
                      onChange={(e) => setSigColor(e.target.value)}
                      className="h-8 w-8 cursor-pointer rounded-lg border-0 outline-none" 
                    />
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={sigBrushSize}
                      onChange={(e) => setSigBrushSize(parseInt(e.target.value))}
                      className="flex-1 accent-blue-600 h-1.5 bg-slate-100 rounded-full cursor-pointer"
                    />
                    <span className="font-mono text-xs font-bold text-slate-400 w-6 text-right">{sigBrushSize}px</span>
                  </div>
                  
                  {/* Signature Pad Canvas Container */}
                  <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-zinc-900/20">
                    <canvas
                      ref={canvasRef}
                      width={450}
                      height={180}
                      onMouseDown={startSignatureDrawing}
                      onMouseMove={drawSignature}
                      onMouseUp={stopSignatureDrawing}
                      onMouseLeave={stopSignatureDrawing}
                      onTouchStart={startSignatureDrawing}
                      onTouchMove={drawSignature}
                      onTouchEnd={stopSignatureDrawing}
                      className="w-full h-[180px] bg-transparent cursor-crosshair touch-none"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Type Your Name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={typeSigName}
                    onChange={(e) => setTypeSigName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 rounded-xl outline-none focus:border-blue-500 text-sm dark:text-zinc-100"
                  />
                  <div className="mt-3 p-6 border border-slate-100 dark:border-zinc-900 bg-slate-50/50 dark:bg-zinc-900/30 rounded-xl text-center">
                    <p className="text-3xl font-bold font-serif text-slate-800 dark:text-zinc-100 italic font-cursive" style={{ color: sigColor }}>
                      {typeSigName || 'Your Signature'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {(toolId === 'compress_image' || toolId === 'resize_image' || toolId === 'convert_image') && (
            <div className="space-y-4">
              {/* Only show Width and Height fields for Resize or Convert tools, NOT for Compress Image */}
              {toolId !== 'compress_image' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Width (px)</label>
                    <input
                      type="number"
                      value={imgWidth}
                      onChange={(e) => setImgWidth(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 rounded-xl outline-none focus:border-blue-500 dark:text-zinc-100 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Height (px)</label>
                    <input
                      type="number"
                      value={imgHeight}
                      onChange={(e) => setImgHeight(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 rounded-xl outline-none focus:border-blue-500 dark:text-zinc-100 text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              )}

              {/* Show Original File Size info if file is selected */}
              {uploadedFiles.length > 0 && (
                <div className="p-3 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600 dark:text-zinc-300">Selected Image Size:</span>
                  <span className="text-xs font-bold font-mono text-blue-600 dark:text-blue-400">
                    {formatBytes(uploadedFiles[0].size)}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Export Image Format</label>
                <select
                  value={imgFormat}
                  onChange={(e: any) => setImgFormat(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 rounded-xl outline-none focus:border-blue-500 text-xs dark:text-zinc-100 font-semibold"
                >
                  <option value="image/jpeg">JPG / JPEG (Standard Compressed)</option>
                  <option value="image/png">PNG (Lossless Quality)</option>
                  <option value="image/webp">WEBP (Web-optimized footprint)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 font-semibold mb-2">
                  <span>Compression Quality</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{imgQuality}%</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={100}
                  value={imgQuality}
                  onChange={(e) => setImgQuality(parseInt(e.target.value))}
                  className="w-full accent-blue-600 h-2 bg-slate-100 dark:bg-zinc-800 rounded-full cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-bold mt-1.5">
                  <span className={imgQuality < 50 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}>
                    ⚡ Small File Size (High Compression)
                  </span>
                  <span className={imgQuality >= 80 ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-400'}>
                    🖼 High Quality (Larger Size)
                  </span>
                </div>
              </div>

              {/* Quick Quality Presets for Compress Image */}
              {toolId === 'compress_image' && (
                <div className="space-y-2 pt-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    Quick Compression Presets:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setImgQuality(75)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold cursor-pointer border transition-all ${
                        imgQuality === 75
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      75% (Balanced)
                    </button>
                    <button
                      type="button"
                      onClick={() => setImgQuality(50)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold cursor-pointer border transition-all ${
                        imgQuality === 50
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      50% (Recommended)
                    </button>
                    <button
                      type="button"
                      onClick={() => setImgQuality(30)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold cursor-pointer border transition-all ${
                        imgQuality === 30
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      30% (Max Size Drop)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}



          {toolId === 'password_generator' && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-slate-400 font-semibold mb-2">
                  <span>Password Length</span>
                  <span className="font-mono">{passLength} characters</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={64}
                  value={passLength}
                  onChange={(e) => setPassLength(parseInt(e.target.value))}
                  className="w-full accent-blue-600 h-1.5 bg-slate-100 rounded-full cursor-pointer"
                />
              </div>
            </div>
          )}

          {toolId === 'qr_generator' && (
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Target URL or Text Content</label>
              <input
                type="text"
                placeholder="https://pdftoolkitpro.online"
                value={qrText}
                onChange={(e) => setQrText(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 rounded-xl outline-none focus:border-blue-500 dark:text-zinc-100 text-sm font-semibold"
              />
            </div>
          )}

          {/* Action trigger button */}
          <button
            id="workstation-process-btn"
            onClick={handleProcess}
            disabled={isProcessing || toolId === 'remove_bg'}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:dark:bg-zinc-800 text-white font-semibold py-3 rounded-xl cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 shadow-lg shadow-blue-500/15"
          >
            {toolId === 'remove_bg' ? (
              <>
                Temporarily Disabled
              </>
            ) : isProcessing ? (
              <>
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
                Generating Bytes on Server...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Process & Export File
              </>
            )}
          </button>

        </div>

        {/* Right Side: Dynamic Outputs / Real-time Interactive Logs */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Standard Outputs dashboard (Downloads, Error logging, etc.) */}
          <div className="space-y-6">
              
              {/* Error Logging display panel */}
              {error && (
                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-500/20 rounded-2xl p-5 flex gap-3 text-rose-800 dark:text-rose-300">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-1">Processing Error</h4>
                    <p className="text-xs leading-relaxed">{error}</p>
                  </div>
                </div>
              )}

              {/* Success Output panel */}
              {successResult ? (
                <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 shadow-xl space-y-6">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 border-b border-slate-100 dark:border-zinc-900 pb-3 mb-4">
                    <CheckCircle className="h-5 w-5" />
                    <h3 className="font-display font-bold text-sm text-slate-900 dark:text-zinc-100">Export Ready!</h3>
                  </div>

                  {successResult.bytes && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-zinc-900/50 rounded-xl">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="h-5 w-5 text-slate-400" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">{successResult.name}</p>
                            <p className="text-[10px] text-slate-400">{formatBytes(successResult.bytes.length)}</p>
                          </div>
                        </div>
                        <button
                          onClick={handleDownloadResult}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer"
                          title="Download Document"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {successResult.stats && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          <div className="bg-slate-50 dark:bg-zinc-900/50 p-3 rounded-xl text-center">
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Original Size</p>
                            <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">{formatBytes(successResult.stats.originalSize)}</p>
                          </div>
                          <div className="bg-slate-50 dark:bg-zinc-900/50 p-3 rounded-xl text-center">
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">New Size</p>
                            <p className="text-xs font-bold text-emerald-600">{formatBytes(successResult.stats.newSize)}</p>
                          </div>
                          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-500/20 p-3 rounded-xl text-center">
                            <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wider mb-1">Reduced By</p>
                            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{successResult.stats.reductionPercent}%</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {successResult.pages && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Split Pages ({successResult.pages.length})</p>
                        <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded font-bold">ZIP Ready</span>
                      </div>

                      {/* Premium Single Click ZIP Downloader */}
                      <button
                        onClick={handleDownloadAllAsZip}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer text-xs"
                      >
                        <DownloadCloud className="h-4.5 w-4.5" />
                        Download All Pages as ZIP (1-Click)
                      </button>

                      <div className="relative flex py-1 items-center">
                        <div className="flex-grow border-t border-slate-100 dark:border-zinc-900"></div>
                        <span className="flex-shrink mx-3 text-[10px] text-slate-450 dark:text-zinc-500 font-semibold uppercase">Or Download Separately</span>
                        <div className="flex-grow border-t border-slate-100 dark:border-zinc-900"></div>
                      </div>

                      <div className="space-y-2 max-h-[180px] overflow-y-auto pr-2">
                        {successResult.pages.map((pg: any, i: number) => (
                          <div key={i} className="flex justify-between items-center p-3 border border-slate-100 dark:border-zinc-900 bg-slate-50/50 dark:bg-zinc-900/30 rounded-xl">
                            <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Page #{pg.pageNum} File</span>
                            <button
                              onClick={() => {
                                const blob = new Blob([pg.bytes], { type: 'application/pdf' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `page_${pg.pageNum}.pdf`;
                                a.click();
                              }}
                              className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                            >
                              Download
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {successResult.type === 'image_download' && (
                    <div className="space-y-4">
                      <div className="border border-slate-100 dark:border-zinc-900 rounded-xl overflow-hidden bg-slate-50 dark:bg-zinc-900 flex flex-col items-center justify-center p-4">
                        <img loading="lazy" 
                          src={successResult.url} 
                          alt="Processed Output" 
                          className="max-h-40 max-w-full object-contain rounded" 
                        />
                      </div>

                      {successResult.stats && (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-slate-50 dark:bg-zinc-900/50 p-2.5 rounded-xl text-center border border-slate-100 dark:border-zinc-800">
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Original Size</p>
                            <p className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-mono">{formatBytes(successResult.stats.originalSize)}</p>
                          </div>
                          <div className="bg-slate-50 dark:bg-zinc-900/50 p-2.5 rounded-xl text-center border border-slate-100 dark:border-zinc-800">
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">New Size</p>
                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">{formatBytes(successResult.stats.newSize)}</p>
                          </div>
                          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-2.5 rounded-xl text-center">
                            <p className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-0.5">Reduced By</p>
                            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{successResult.stats.reductionPercent}%</p>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={handleDownloadResult}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-xs cursor-pointer shadow-md shadow-blue-500/20"
                      >
                        <DownloadCloud className="h-4 w-4" /> Download Processed Image
                      </button>
                    </div>
                  )}

                  {successResult.type === 'ai_text_output' && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">{successResult.title}</h4>
                      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 font-mono text-[11px] leading-relaxed max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                        {successResult.text}
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(successResult.text);
                          alert('Copied AI text results to clipboard!');
                        }}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 font-semibold text-xs rounded-xl cursor-pointer"
                      >
                        Copy Output Text
                      </button>
                    </div>
                  )}

                  {successResult.type === 'text_only' && (
                    <div className="p-4 bg-slate-50 dark:bg-zinc-900 text-center rounded-xl font-mono text-lg font-bold text-slate-800 dark:text-zinc-100 relative group">
                      <span>{successResult.text}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(successResult.text);
                          alert('Copied to clipboard!');
                        }}
                        className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 text-xs cursor-pointer"
                      >
                        Copy
                      </button>
                    </div>
                  )}

                </div>
              ) : (
                /* Static idle visual status indicator */
                <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 text-center shadow-sm">
                  <Sliders className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="font-display font-semibold text-slate-800 dark:text-zinc-200 text-sm mb-1">Sandbox Live</h3>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 max-w-[200px] mx-auto leading-normal">
                    Adjust configurations and click Process to compile outcomes.
                  </p>
                </div>
              )}

            </div>

        </div>

      </div>

      {/* FAQ & Content Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 mt-12 border-t border-slate-200 dark:border-zinc-800">
        <h2 className="text-xl font-display font-bold text-slate-900 dark:text-zinc-50 mb-6">Frequently Asked Questions about {tool.name}</h2>
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800">
            <h3 className="font-bold text-slate-900 dark:text-zinc-200 text-sm mb-2">Is the {tool.name} free to use?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">Yes, all core features of the {tool.name} are completely free for basic usage without requiring any registration.</p>
          </div>
          <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800">
            <h3 className="font-bold text-slate-900 dark:text-zinc-200 text-sm mb-2">Are my files secure when using the {tool.name}?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">Absolutely. We prioritize your privacy. Most of our tools process files locally in your browser. Any files that are uploaded are immediately deleted after processing and never shared.</p>
          </div>
          <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800">
            <h3 className="font-bold text-slate-900 dark:text-zinc-200 text-sm mb-2">Does the {tool.name} work on mobile devices?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">Yes! The {tool.name} is fully optimized for all devices, including mobile phones and tablets, directly through your web browser.</p>
          </div>
        </div>

        {/* Related Tools */}
        
        {/* Related Tools */}
        <div className="mt-12">
           <h3 className="text-lg font-display font-bold text-slate-900 dark:text-zinc-50 mb-6">Related Tools</h3>
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {allToolsList.filter((t: any) => t.category === (tool as any).category && t.id !== tool.id).slice(0, 3).map(related => (
                <a key={related.id} href={`/tools/${getToolSlug(related)}`} className="p-4 bg-white dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800 hover:border-blue-500 transition-colors">
                   <h4 className="font-bold text-slate-800 dark:text-zinc-200 text-xs">{related.name}</h4>
                   <p className="text-[11px] text-slate-400 mt-1">{related.description.substring(0, 80)}...</p>
                </a>
              ))}
           </div>
        </div>

      </div>

    </div>
  );
}
