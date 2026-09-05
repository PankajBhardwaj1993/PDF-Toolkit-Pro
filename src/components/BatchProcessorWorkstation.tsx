import React, { useState, useRef, useEffect } from 'react';
import { 
  Layers, 
  Upload, 
  Download, 
  Trash2, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Image as ImageIcon, 
  FileArchive, 
  Sparkles, 
  ArrowLeft, 
  RefreshCw, 
  Sliders, 
  Check, 
  X, 
  Plus, 
  FileCheck, 
  FolderArchive,
  ArrowRight,
  ShieldCheck,
  Percent,
  SlidersHorizontal,
  Info,
  Maximize2
} from 'lucide-react';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { 
  addWatermark, 
  updatePDFMetadata, 
  convertImagesToPDF, 
  convertSingleImageToPDF,
  fileToCanvasDataUrl
} from '../utils/pdfUtils';

interface BatchProcessorWorkstationProps {
  onAddRecentFile?: (file: { name: string; size: string; type: string; toolUsed: string }) => void;
  user?: any;
  onBackToTools?: () => void;
}

export type BatchActionType = 
  | 'compress_images'
  | 'convert_images'
  | 'resize_images'
  | 'images_to_pdf_individual'
  | 'images_to_single_pdf'
  | 'compress_pdfs'
  | 'watermark_pdfs'
  | 'sanitize_pdf_metadata';

export interface BatchItem {
  id: string;
  file: File;
  originalSize: number;
  status: 'pending' | 'processing' | 'done' | 'error';
  progress: number;
  outputName?: string;
  outputSize?: number;
  outputBlob?: Blob;
  outputUrl?: string;
  error?: string;
  reductionPercent?: number;
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function BatchProcessorWorkstation({
  onAddRecentFile,
  user,
  onBackToTools
}: BatchProcessorWorkstationProps) {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [action, setAction] = useState<BatchActionType>('compress_images');
  
  // Action Settings
  const [imageQuality, setImageQuality] = useState<number>(75);
  const [targetImageFormat, setTargetImageFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg');
  const [resizeScale, setResizeScale] = useState<number>(50);
  const [watermarkText, setWatermarkText] = useState<string>('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.3);
  const [pdfCompressionLevel, setPdfCompressionLevel] = useState<'recommended' | 'extreme' | 'low'>('recommended');

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [currentFileStatusText, setCurrentFileStatusText] = useState<string>('');
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [zipProgress, setZipProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<boolean>(false);

  // Filter items by current action compatibility warning
  const isImageAction = action === 'compress_images' || action === 'convert_images' || action === 'resize_images' || action === 'images_to_pdf_individual' || action === 'images_to_single_pdf';
  const isPdfAction = action === 'compress_pdfs' || action === 'watermark_pdfs' || action === 'sanitize_pdf_metadata';

  // Add files to batch
  const handleAddFiles = (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    if (fileArray.length === 0) return;

    const newItems: BatchItem[] = fileArray.map((f, idx) => ({
      id: `${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 9)}`,
      file: f,
      originalSize: f.size,
      status: 'pending',
      progress: 0
    }));

    setItems(prev => [...prev, ...newItems]);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Remove single item
  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // Clear all items
  const handleClearAll = () => {
    if (isProcessing) return;
    setItems([]);
    setOverallProgress(0);
    setCurrentFileStatusText('');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Quick Sample Batch generation
  const handleLoadSampleBatch = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const sampleFiles: File[] = [];

      // Create 2 Sample Canvas Images
      const createSampleImage = (name: string, title: string, color1: string, color2: string) => {
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const grad = ctx.createLinearGradient(0, 0, 1200, 800);
          grad.addColorStop(0, color1);
          grad.addColorStop(1, color2);
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 1200, 800);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 52px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(title, 600, 380);

          ctx.font = '24px sans-serif';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fillText('Batch Processing Sample Asset • High Resolution', 600, 440);
        }

        return new Promise<File>((res) => {
          canvas.toBlob((blob) => {
            if (blob) {
              res(new File([blob], name, { type: 'image/jpeg' }));
            }
          }, 'image/jpeg', 0.95);
        });
      };

      const img1 = await createSampleImage('Project_Roadmap_Q3.jpg', 'Project Roadmap Q3', '#3b82f6', '#1d4ed8');
      const img2 = await createSampleImage('Analytics_Report_Hero.jpg', 'Analytics Overview', '#8b5cf6', '#6d28d9');
      sampleFiles.push(img1, img2);

      // Create 2 Sample PDFs
      const createSamplePdf = async (name: string, title: string, author: string) => {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595, 842]);
        pdfDoc.setTitle(title);
        pdfDoc.setAuthor(author);
        pdfDoc.setSubject('Official Batch Sample Document');
        pdfDoc.setKeywords(['sample', 'batch', 'report']);
        
        const bytes = await pdfDoc.save();
        const blob = new Blob([bytes], { type: 'application/pdf' });
        return new File([blob], name, { type: 'application/pdf' });
      };

      const pdf1 = await createSamplePdf('Corporate_Briefing_2026.pdf', 'Corporate Briefing 2026', 'Executive Team');
      const pdf2 = await createSamplePdf('Financial_Audit_Draft.pdf', 'Financial Audit Draft', 'Audit Committee');
      sampleFiles.push(pdf1, pdf2);

      handleAddFiles(sampleFiles);
      setSuccessMessage('Loaded 4 sample assets (2 images, 2 PDFs) into the Batch Processor.');
    } catch (err) {
      console.error('Error generating sample batch:', err);
      setErrorMessage('Failed to generate sample batch files.');
    }
  };

  // Image Processing Core Worker
  const processImageFile = async (
    file: File, 
    actionType: BatchActionType
  ): Promise<{ blob: Blob; outputName: string; size: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.naturalWidth || img.width || 800;
          let height = img.naturalHeight || img.height || 600;

          if (actionType === 'resize_images') {
            const factor = resizeScale / 100;
            width = Math.round(width * factor);
            height = Math.round(height * factor);
          }

          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas 2D context not supported'));
            return;
          }

          // Draw image
          ctx.drawImage(img, 0, 0, width, height);

          // Determine mime type and extension
          let mime = 'image/jpeg';
          let ext = 'jpg';
          let qualityParam = imageQuality / 100;

          if (actionType === 'convert_images') {
            mime = targetImageFormat;
            ext = targetImageFormat === 'image/jpeg' ? 'jpg' : targetImageFormat.split('/')[1];
          } else if (actionType === 'compress_images' || actionType === 'resize_images') {
            // Keep original mime if possible, fallback to jpeg
            if (file.type === 'image/png') {
              mime = 'image/png';
              ext = 'png';
            } else if (file.type === 'image/webp') {
              mime = 'image/webp';
              ext = 'webp';
            } else {
              mime = 'image/jpeg';
              ext = 'jpg';
            }
          }

          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to encode image canvas'));
              return;
            }

            const baseName = file.name.replace(/\.[^/.]+$/, '');
            let prefix = 'processed';
            if (actionType === 'compress_images') prefix = 'compressed';
            if (actionType === 'convert_images') prefix = 'converted';
            if (actionType === 'resize_images') prefix = `resized_${resizeScale}pct`;

            const outputName = `${prefix}_${baseName}.${ext}`;
            resolve({ blob, outputName, size: blob.size });
          }, mime, qualityParam);
        };
        img.onerror = () => reject(new Error(`Failed to decode image file: ${file.name}`));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsDataURL(file);
    });
  };

  // PDF Processing Worker
  const processPdfFile = async (
    file: File, 
    actionType: BatchActionType
  ): Promise<{ blob: Blob; outputName: string; size: number }> => {
    const baseName = file.name.replace(/\.pdf$/i, '');

    if (actionType === 'watermark_pdfs') {
      const bytes = await addWatermark(file, watermarkText, watermarkOpacity);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      return {
        blob,
        outputName: `watermarked_${baseName}.pdf`,
        size: blob.size
      };
    }

    if (actionType === 'sanitize_pdf_metadata') {
      const bytes = await updatePDFMetadata(file, {
        title: '',
        author: '',
        subject: '',
        keywords: [],
        creator: '',
        producer: '',
        creationDate: null,
        modificationDate: new Date()
      });
      const blob = new Blob([bytes], { type: 'application/pdf' });
      return {
        blob,
        outputName: `sanitized_${baseName}.pdf`,
        size: blob.size
      };
    }

    if (actionType === 'compress_pdfs') {
      // Call server or local optimization
      try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        const base64: string = await new Promise((res) => reader.onload = () => res(reader.result as string));
        const cleanBase64 = base64.replace(/^data:application\/pdf;base64,/, '');

        const response = await fetch('/api/pdf/compress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfBase64: cleanBase64, compressionLevel: pdfCompressionLevel }),
        });

        if (response.ok) {
          const data = await response.json();
          const compressedBytes = Uint8Array.from(atob(data.pdfBase64), c => c.charCodeAt(0));
          const blob = new Blob([compressedBytes], { type: 'application/pdf' });
          return {
            blob,
            outputName: `compressed_${baseName}.pdf`,
            size: blob.size
          };
        }
      } catch {
        // Fallback to client-side load-and-save optimization
      }

      const pdfBytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const savedBytes = await pdfDoc.save();
      const blob = new Blob([savedBytes], { type: 'application/pdf' });
      return {
        blob,
        outputName: `compressed_${baseName}.pdf`,
        size: blob.size
      };
    }

    throw new Error(`Unsupported PDF action: ${actionType}`);
  };

  // Main Batch Processing Runner
  const handleStartBatchProcessing = async () => {
    if (items.length === 0) {
      setErrorMessage('Please upload files before starting batch processing.');
      return;
    }

    setIsProcessing(true);
    cancelRef.current = false;
    setErrorMessage(null);
    setSuccessMessage(null);
    setOverallProgress(0);

    // Special Case: Images to Single Combined PDF
    if (action === 'images_to_single_pdf') {
      const imageFiles = items.map(it => it.file).filter(f => f.type.startsWith('image/'));
      if (imageFiles.length === 0) {
        setErrorMessage('No valid image files found to combine into a single PDF.');
        setIsProcessing(false);
        return;
      }

      setCurrentFileStatusText(`Combining ${imageFiles.length} images into a single multi-page PDF document...`);
      setOverallProgress(30);

      try {
        const combinedBytes = await convertImagesToPDF(imageFiles);
        setOverallProgress(90);

        const blob = new Blob([combinedBytes], { type: 'application/pdf' });
        const outputName = `Batch_Combined_${imageFiles.length}_Images.pdf`;
        const outputUrl = URL.createObjectURL(blob);

        setItems(prev => prev.map(item => ({
          ...item,
          status: 'done',
          progress: 100,
          outputName,
          outputSize: blob.size,
          outputBlob: blob,
          outputUrl,
          reductionPercent: 0
        })));

        if (onAddRecentFile) {
          onAddRecentFile({
            name: outputName,
            size: formatBytes(blob.size),
            type: 'PDF Document',
            toolUsed: 'Batch Images to Single PDF'
          });
        }

        setOverallProgress(100);
        setCurrentFileStatusText('Combined PDF generated successfully!');
        setSuccessMessage(`Successfully combined ${imageFiles.length} images into a single master PDF!`);
      } catch (err: any) {
        console.error('Batch combine error:', err);
        setErrorMessage(err.message || 'Failed to combine images into PDF.');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // Standard per-file sequential processing with real-time progress
    const updatedItems = [...items];
    const total = updatedItems.length;
    let completedCount = 0;
    let totalSavedBytes = 0;

    for (let i = 0; i < total; i++) {
      if (cancelRef.current) {
        setCurrentFileStatusText('Batch processing paused / cancelled.');
        break;
      }

      const item = updatedItems[i];
      setCurrentFileStatusText(`Processing ${i + 1} of ${total}: ${item.file.name}...`);

      // Update current item to processing
      setItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'processing', progress: 20 } : it));

      try {
        let result: { blob: Blob; outputName: string; size: number };

        if (item.file.type.startsWith('image/')) {
          if (action === 'images_to_pdf_individual') {
            const bytes = await convertSingleImageToPDF(item.file);
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const baseName = item.file.name.replace(/\.[^/.]+$/, '');
            result = {
              blob,
              outputName: `${baseName}.pdf`,
              size: blob.size
            };
          } else {
            result = await processImageFile(item.file, action);
          }
        } else if (item.file.type === 'application/pdf' || item.file.name.toLowerCase().endsWith('.pdf')) {
          if (isPdfAction) {
            result = await processPdfFile(item.file, action);
          } else {
            throw new Error('PDF files are not supported by the selected image action.');
          }
        } else {
          throw new Error('Unsupported file type for this action.');
        }

        const originalSize = item.file.size || 1;
        const reductionPercent = Math.max(0, Math.round(((originalSize - result.size) / originalSize) * 100));
        const outputUrl = URL.createObjectURL(result.blob);

        if (result.size < originalSize) {
          totalSavedBytes += (originalSize - result.size);
        }

        completedCount++;

        // Update item in state
        setItems(prev => prev.map((it, idx) => idx === i ? {
          ...it,
          status: 'done',
          progress: 100,
          outputName: result.outputName,
          outputSize: result.size,
          outputBlob: result.blob,
          outputUrl,
          reductionPercent
        } : it));

      } catch (err: any) {
        console.error(`Error processing file ${item.file.name}:`, err);
        setItems(prev => prev.map((it, idx) => idx === i ? {
          ...it,
          status: 'error',
          progress: 0,
          error: err.message || 'Processing failed'
        } : it));
      }

      // Update overall progress
      const progressPct = Math.round(((i + 1) / total) * 100);
      setOverallProgress(progressPct);
    }

    setIsProcessing(false);
    setCurrentFileStatusText(`Completed processing ${completedCount} of ${total} files.`);
    setSuccessMessage(`Batch action finished! ${completedCount} files processed successfully.`);

    if (onAddRecentFile && completedCount > 0) {
      onAddRecentFile({
        name: `Batch_${action}_${completedCount}_files.zip`,
        size: formatBytes(totalSavedBytes || 1024),
        type: 'Batch Output',
        toolUsed: `Batch Processor (${action.replace(/_/g, ' ')})`
      });
    }
  };

  // Download All Processed Files as a ZIP archive
  const handleDownloadAllAsZip = async () => {
    const doneItems = items.filter(it => it.status === 'done' && it.outputBlob && it.outputName);
    if (doneItems.length === 0) {
      setErrorMessage('No completed files available to download.');
      return;
    }

    // If single combined PDF was produced, download it directly
    if (action === 'images_to_single_pdf' && doneItems[0]?.outputBlob) {
      saveAs(doneItems[0].outputBlob, doneItems[0].outputName || 'Combined_Images.pdf');
      return;
    }

    setIsZipping(true);
    setZipProgress(10);
    setErrorMessage(null);

    try {
      const zip = new JSZip();
      
      doneItems.forEach((item, index) => {
        if (item.outputBlob && item.outputName) {
          zip.file(item.outputName, item.outputBlob);
        }
        setZipProgress(10 + Math.round((index / doneItems.length) * 40));
      });

      setZipProgress(60);
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      }, (metadata) => {
        setZipProgress(60 + Math.round((metadata.percent / 100) * 35));
      });

      setZipProgress(100);
      const zipName = `Batch_${action}_${doneItems.length}_Files.zip`;
      saveAs(zipBlob, zipName);

      setSuccessMessage(`Downloaded ZIP archive "${zipName}" successfully!`);
    } catch (err: any) {
      console.error('Failed to create ZIP package:', err);
      setErrorMessage('Failed to generate ZIP archive.');
    } finally {
      setIsZipping(false);
      setZipProgress(0);
    }
  };

  // Metrics Calculation
  const totalOriginalSize = items.reduce((acc, it) => acc + (it.originalSize || 0), 0);
  const doneItems = items.filter(it => it.status === 'done');
  const totalOutputSize = doneItems.reduce((acc, it) => acc + (it.outputSize || 0), 0);
  const totalSavedSize = Math.max(0, totalOriginalSize - totalOutputSize);
  const overallSavedPercent = totalOriginalSize > 0 ? Math.round((totalSavedSize / totalOriginalSize) * 100) : 0;

  return (
    <div id="batch-processor-workstation" className="space-y-6 animate-fade-in pb-16">
      
      {/* Top Header Card */}
      <div id="batch-header-card" className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBackToTools && (
            <button
              id="batch-back-btn"
              onClick={onBackToTools}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Back to Tools"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Batch Processor</h1>
                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Multi-File Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Upload multiple files and apply batch compression, format conversion, watermark, or PDF merging with real-time tracking.
              </p>
            </div>
          </div>
        </div>

        {items.length > 0 && (
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              id="batch-clear-btn"
              onClick={handleClearAll}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear All</span>
            </button>
            <button
              id="batch-zip-download-btn"
              onClick={handleDownloadAllAsZip}
              disabled={isProcessing || doneItems.length === 0 || isZipping}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {isZipping ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Zipping ({zipProgress}%)...</span>
                </>
              ) : (
                <>
                  <FolderArchive className="h-3.5 w-3.5" />
                  <span>Download All as ZIP ({doneItems.length})</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      {errorMessage && (
        <div id="batch-error-banner" className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 flex items-start gap-3 text-red-700 dark:text-red-300 text-sm animate-fade-in">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Error</p>
            <p className="text-xs">{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div id="batch-success-banner" className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-start gap-3 text-emerald-700 dark:text-emerald-300 text-sm animate-fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Success</p>
            <p className="text-xs">{successMessage}</p>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Workstation 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Control Panel: Action Selector & Action Settings */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Action Selector Card */}
          <div id="batch-action-selector-card" className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-slate-800 dark:text-zinc-100 font-bold text-xs">
              <SlidersHorizontal className="h-4 w-4 text-indigo-500" />
              <span>Choose Batch Action</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                Image Operations
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  onClick={() => setAction('compress_images')}
                  className={`text-left px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                    action === 'compress_images'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200 shadow-2xs'
                      : 'border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-indigo-500" />
                    <span>Compress Images (JPG/PNG/WebP)</span>
                  </div>
                  {action === 'compress_images' && <Check className="h-4 w-4 text-indigo-600" />}
                </button>

                <button
                  onClick={() => setAction('convert_images')}
                  className={`text-left px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                    action === 'convert_images'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200 shadow-2xs'
                      : 'border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-indigo-500" />
                    <span>Convert Image Formats</span>
                  </div>
                  {action === 'convert_images' && <Check className="h-4 w-4 text-indigo-600" />}
                </button>

                <button
                  onClick={() => setAction('resize_images')}
                  className={`text-left px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                    action === 'resize_images'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200 shadow-2xs'
                      : 'border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Maximize2 className="h-4 w-4 text-indigo-500" />
                    <span>Batch Resize Image Dimensions</span>
                  </div>
                  {action === 'resize_images' && <Check className="h-4 w-4 text-indigo-600" />}
                </button>

                <button
                  onClick={() => setAction('images_to_pdf_individual')}
                  className={`text-left px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                    action === 'images_to_pdf_individual'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200 shadow-2xs'
                      : 'border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-rose-500" />
                    <span>Convert Images to Individual PDFs</span>
                  </div>
                  {action === 'images_to_pdf_individual' && <Check className="h-4 w-4 text-indigo-600" />}
                </button>

                <button
                  onClick={() => setAction('images_to_single_pdf')}
                  className={`text-left px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                    action === 'images_to_single_pdf'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200 shadow-2xs'
                      : 'border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FolderArchive className="h-4 w-4 text-rose-500" />
                    <span>Combine All Images into 1 Master PDF</span>
                  </div>
                  {action === 'images_to_single_pdf' && <Check className="h-4 w-4 text-indigo-600" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-white/5">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                PDF Document Operations
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  onClick={() => setAction('compress_pdfs')}
                  className={`text-left px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                    action === 'compress_pdfs'
                      ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 shadow-2xs'
                      : 'border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileArchive className="h-4 w-4 text-rose-500" />
                    <span>Batch Compress PDFs</span>
                  </div>
                  {action === 'compress_pdfs' && <Check className="h-4 w-4 text-rose-600" />}
                </button>

                <button
                  onClick={() => setAction('watermark_pdfs')}
                  className={`text-left px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                    action === 'watermark_pdfs'
                      ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 shadow-2xs'
                      : 'border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-rose-500" />
                    <span>Batch Watermark PDFs</span>
                  </div>
                  {action === 'watermark_pdfs' && <Check className="h-4 w-4 text-rose-600" />}
                </button>

                <button
                  onClick={() => setAction('sanitize_pdf_metadata')}
                  className={`text-left px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                    action === 'sanitize_pdf_metadata'
                      ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 shadow-2xs'
                      : 'border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <span>Strip & Sanitize PDF Metadata</span>
                  </div>
                  {action === 'sanitize_pdf_metadata' && <Check className="h-4 w-4 text-rose-600" />}
                </button>
              </div>
            </div>
          </div>

          {/* Dynamic Settings for Selected Action */}
          <div id="batch-action-settings-card" className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-slate-800 dark:text-zinc-100 font-bold text-xs">
              <Sliders className="h-4 w-4 text-indigo-500" />
              <span>Action Settings</span>
            </div>

            {/* Quality Slider (for images) */}
            {(action === 'compress_images' || action === 'convert_images' || action === 'resize_images') && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700 dark:text-zinc-300">Compression Quality</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md">
                    {imageQuality}%
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={imageQuality}
                  onChange={(e) => setImageQuality(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Smaller Size (30%)</span>
                  <span>Balanced (75%)</span>
                  <span>High Quality (95%)</span>
                </div>
              </div>
            )}

            {/* Target Format (for image conversion) */}
            {action === 'convert_images' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Target Output Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['image/jpeg', 'image/png', 'image/webp'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setTargetImageFormat(fmt)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        targetImageFormat === fmt
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300'
                      }`}
                    >
                      {fmt === 'image/jpeg' ? 'JPG' : fmt === 'image/png' ? 'PNG' : 'WebP'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Resize Scale Factor */}
            {action === 'resize_images' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Dimension Scale
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[25, 50, 75, 100].map((sc) => (
                    <button
                      key={sc}
                      onClick={() => setResizeScale(sc)}
                      className={`py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        resizeScale === sc
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      {sc}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PDF Watermark settings */}
            {action === 'watermark_pdfs' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Watermark Text
                  </label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="e.g. CONFIDENTIAL, DRAFT, COPY"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 dark:text-zinc-400">Opacity</span>
                    <span className="font-bold text-rose-600">{Math.round(watermarkOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.8"
                    step="0.05"
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-rose-600"
                  />
                </div>
              </div>
            )}

            {/* PDF Compression level */}
            {action === 'compress_pdfs' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Compression Mode
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['recommended', 'extreme', 'low'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setPdfCompressionLevel(lvl)}
                      className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold capitalize transition-all cursor-pointer ${
                        pdfCompressionLevel === lvl
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata sanitizer notice */}
            {action === 'sanitize_pdf_metadata' && (
              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-[11px] space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Privacy Protection
                </p>
                <p>
                  Will strip Author, Title, Creator tool, Producer, and embedded search keywords from all uploaded PDF files simultaneously.
                </p>
              </div>
            )}

            {/* Big Action Start Button */}
            <div className="pt-2">
              <button
                id="start-batch-btn"
                onClick={handleStartBatchProcessing}
                disabled={isProcessing || items.length === 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Processing Batch... ({overallProgress}%)</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-white" />
                    <span>Apply Batch Action to {items.length} Files</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

        {/* Right Main Panel: File Upload Zone, Progress Bar, and File List Table */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Real-time Overall Progress Bar Widget (Shown whenever processing or files exist) */}
          <div id="batch-progress-widget" className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                  <span>Batch Execution Status</span>
                  {isProcessing && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 animate-pulse">
                      Processing in Real-Time
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 truncate max-w-md">
                  {currentFileStatusText || (items.length === 0 ? 'Upload files to begin batch operations.' : `${items.length} files queued. Ready to process.`)}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
                  {overallProgress}%
                </span>
                <p className="text-[10px] text-slate-400">
                  {doneItems.length} / {items.length} Done
                </p>
              </div>
            </div>

            {/* Animated Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-zinc-800/80 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200/50 dark:border-zinc-700/50">
              <div 
                className={`h-full rounded-full transition-all duration-300 ease-out bg-gradient-to-r from-indigo-500 via-violet-500 to-rose-500 ${
                  isProcessing ? 'animate-pulse' : ''
                }`}
                style={{ width: `${overallProgress}%` }}
              />
            </div>

            {/* Summary Statistics Pill Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800">
                <span className="text-[10px] font-medium text-slate-400 block">Total Files</span>
                <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">{items.length}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800">
                <span className="text-[10px] font-medium text-slate-400 block">Original Size</span>
                <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">{formatBytes(totalOriginalSize)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800">
                <span className="text-[10px] font-medium text-slate-400 block">Output Size</span>
                <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">{formatBytes(totalOutputSize)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40">
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block">Saved Space</span>
                <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                  {totalSavedSize > 0 ? `${formatBytes(totalSavedSize)} (${overallSavedPercent}%)` : '0%'}
                </span>
              </div>
            </div>
          </div>

          {/* Upload Drop Zone & Table */}
          <div id="batch-files-container" className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-xs space-y-4">
            
            {/* Top Toolbar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Batch Queue</h3>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                  {items.length} items
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      handleAddFiles(e.target.files);
                    }
                  }}
                />
                
                <button
                  id="add-more-files-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Files</span>
                </button>

                <button
                  id="batch-sample-btn"
                  onClick={handleLoadSampleBatch}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200/60 dark:border-indigo-800/40 transition-colors cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Try Sample Batch</span>
                </button>
              </div>
            </div>

            {/* Drop Zone if empty */}
            {items.length === 0 ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files) {
                    handleAddFiles(e.dataTransfer.files);
                  }
                }}
                className="border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl p-10 text-center transition-all bg-slate-50/50 dark:bg-zinc-900/30 flex flex-col items-center justify-center gap-3 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="h-14 w-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Upload className="h-7 w-7 animate-bounce-subtle" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-100">
                    Drag & Drop Multiple Files Here
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Supports JPG, PNG, WebP, GIF, BMP, and PDF files. Process 10, 50, or 100+ files in a single pass.
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors"
                >
                  Select Multiple Files
                </button>
              </div>
            ) : (
              /* Items Table */
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-zinc-900/80 text-slate-600 dark:text-zinc-400 font-semibold border-b border-slate-200 dark:border-zinc-800">
                    <tr>
                      <th className="p-3 w-1/3">File Name</th>
                      <th className="p-3">Original</th>
                      <th className="p-3">Status / Progress</th>
                      <th className="p-3">Output Size</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {items.map((item, index) => {
                      const isImg = item.file.type.startsWith('image/');
                      const isPdf = item.file.type === 'application/pdf' || item.file.name.toLowerCase().endsWith('.pdf');

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors">
                          {/* File Name & Icon */}
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isImg 
                                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900' 
                                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900'
                              }`}>
                                {isImg ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                              </div>
                              <div className="overflow-hidden">
                                <span className="font-semibold text-slate-800 dark:text-zinc-200 block truncate max-w-[200px] sm:max-w-[260px]" title={item.file.name}>
                                  {item.file.name}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  #{index + 1} • {item.file.type || 'Document'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Original Size */}
                          <td className="p-3 text-slate-600 dark:text-zinc-400 font-medium">
                            {formatBytes(item.originalSize)}
                          </td>

                          {/* Status / Progress */}
                          <td className="p-3">
                            {item.status === 'pending' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-medium text-[11px]">
                                Queued
                              </span>
                            )}
                            {item.status === 'processing' && (
                              <div className="flex items-center gap-2">
                                <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                                  Working...
                                </span>
                              </div>
                            )}
                            {item.status === 'done' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                                <Check className="h-3 w-3" />
                                Done
                              </span>
                            )}
                            {item.status === 'error' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-bold text-[11px]" title={item.error}>
                                <AlertCircle className="h-3 w-3" />
                                Error
                              </span>
                            )}
                          </td>

                          {/* Output Size & Savings */}
                          <td className="p-3">
                            {item.outputSize !== undefined ? (
                              <div>
                                <span className="font-bold text-slate-800 dark:text-zinc-200">
                                  {formatBytes(item.outputSize)}
                                </span>
                                {item.reductionPercent !== undefined && item.reductionPercent > 0 && (
                                  <span className="ml-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                                    -{item.reductionPercent}%
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {item.status === 'done' && item.outputBlob && (
                                <button
                                  onClick={() => saveAs(item.outputBlob!, item.outputName || 'processed_file')}
                                  className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
                                  title="Download File"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                disabled={isProcessing}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-40"
                                title="Remove File"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bottom Actions Bar */}
            {items.length > 0 && (
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>Files are processed locally in your browser memory for high speed and total privacy.</span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleDownloadAllAsZip}
                    disabled={isProcessing || doneItems.length === 0 || isZipping}
                    className="w-full sm:w-auto px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <FolderArchive className="h-4 w-4" />
                    <span>Download All as ZIP</span>
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
