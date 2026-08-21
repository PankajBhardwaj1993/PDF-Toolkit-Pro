import React, { useState, useEffect, useRef } from 'react';
import { Download, Upload, Trash2, RotateCcw, FileText, Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
import { deletePDFPages } from '../utils/pdfUtils';

interface InteractiveDeletePdfProps {
  onAddRecentFile: (file: any) => void;
  user: any;
}

const PdfThumbnail: React.FC<{ pdfDoc: any, pageNum: number, isDeleted: boolean, onToggleDelete: () => void }> = ({ pdfDoc, pageNum, isDeleted, onToggleDelete }) => { 
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let isCurrent = true;
    const renderThumb = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        if (!isCurrent) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;
        
        const rawViewport = page.getViewport({ scale: 1.0 });
        // Use a fixed width for thumbnail to be fast
        const scale = 200 / rawViewport.width; 
        const viewport = page.getViewport({ scale });
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({ canvasContext: context, viewport }).promise;
      } catch (err) {
        console.error('Error rendering thumb', err);
      }
    };
    renderThumb();
    return () => { isCurrent = false; };
  }, [pdfDoc, pageNum]);

  return (
    <div className={`relative group flex flex-col items-center gap-2 p-2 rounded-xl transition-all ${isDeleted ? 'opacity-50 grayscale' : 'hover:bg-slate-100 dark:hover:bg-zinc-800/50'}`}>
      <div className="relative shadow-sm border border-slate-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-white">
        <canvas ref={canvasRef} className="max-w-full h-auto" />
        {isDeleted && (
          <div className="absolute inset-0 flex items-center justify-center bg-rose-500/20 backdrop-blur-[1px]">
            <Trash2 className="h-8 w-8 text-rose-600" />
          </div>
        )}
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 flex items-center justify-center gap-2 ${isDeleted ? '!hidden' : ''}`}>
           <button 
             onClick={onToggleDelete}
             className="p-2 bg-rose-500 text-white rounded-full hover:bg-rose-600 shadow-lg transform hover:scale-105 transition-all"
             title="Delete Page"
           >
             <Trash2 className="h-4 w-4" />
           </button>
        </div>
        {isDeleted && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 flex items-center justify-center gap-2">
             <button 
               onClick={onToggleDelete}
               className="p-2 bg-slate-700 text-white rounded-full hover:bg-slate-600 shadow-lg transform hover:scale-105 transition-all"
               title="Restore Page"
             >
               <RotateCcw className="h-4 w-4" />
             </button>
          </div>
        )}
      </div>
      <span className="text-xs font-semibold text-slate-500">Page {pageNum}</span>
    </div>
  );
};

export default function InteractiveDeletePdf({ onAddRecentFile, user }: InteractiveDeletePdfProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [pdfSource, setPdfSource] = useState<ArrayBuffer | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  
  const [deletedPages, setDeletedPages] = useState<Set<number>>(new Set());
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!pdfSource) return;
    const loadPdf = async () => {
      try {
        const pdfjs = (window as any).pdfjsLib;
        if (!pdfjs) {
          setError("PDF backend library is still loading. Please wait.");
          return;
        }
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        
        const loadingTask = pdfjs.getDocument({ data: pdfSource.slice(0) });
        const doc = await loadingTask.promise;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setDeletedPages(new Set());
        setError(null);
      } catch (err: any) {
        setError(`Failed to open PDF: ${err.message}`);
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
      setPdfSource(fileReader.result as ArrayBuffer);
      setSuccessMsg(`Loaded successfully: "${file.name}"`);
      setTimeout(() => setSuccessMsg(null), 3000);
    };
    fileReader.readAsArrayBuffer(file);
  };

  const togglePageDelete = (pageNum: number) => {
    setDeletedPages(prev => {
      const next = new Set(prev);
      if (next.has(pageNum)) {
        next.delete(pageNum);
      } else {
        next.add(pageNum);
      }
      return next;
    });
  };

  const processAndDownload = async () => {
    if (!uploadedFile || deletedPages.size === 0) {
      if (deletedPages.size === 0) setError("Please select at least one page to delete.");
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setSuccessMsg(null);
    
    try {
      const pagesToDeleteArr = Array.from(deletedPages) as number[];
      const bytes = await deletePDFPages(uploadedFile, pagesToDeleteArr);
      
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `arranged_${uploadedFile.name}`;
      a.click();
      URL.revokeObjectURL(url);
      
      setSuccessMsg("Document pages removed successfully.");
      onAddRecentFile({
        name: `arranged_${uploadedFile.name}`,
        size: formatBytes(bytes.length),
        type: 'application/pdf',
        toolUsed: 'Delete PDF Pages',
      });
      
      // Update the current view to show the new document
      setPdfSource(bytes.buffer as ArrayBuffer);
      const newFile = new File([blob], `arranged_${uploadedFile.name}`, { type: 'application/pdf' });
      setUploadedFile(newFile);
      setDeletedPages(new Set());
      
    } catch (err: any) {
      setError(`Failed to process PDF: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full flex flex-col h-[calc(100vh-6rem)]">
      {/* Header Toolbar */}
      <div className="bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold font-display text-slate-800 dark:text-zinc-100 flex items-center gap-2">
              <Trash2 className="h-6 w-6 text-rose-500" />
              Delete PDF Pages
            </h1>
            <p className="text-xs text-slate-500 font-medium">Select pages to remove from your document.</p>
          </div>
        </div>
        
        {pdfSource && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setPdfSource(null); setUploadedFile(null); setPdfDoc(null); setDeletedPages(new Set()); setSuccessMsg(null); }}
              className="px-4 py-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-700 dark:text-zinc-300 rounded-xl text-sm font-semibold transition-colors"
            >
              Clear
            </button>
            <button 
              onClick={processAndDownload}
              disabled={isProcessing || deletedPages.size === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all hover:scale-105"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Apply Changes & Download
            </button>
          </div>
        )}
      </div>

      {!pdfSource ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/50 dark:bg-zinc-950/50">
          <div 
            className={`max-w-xl w-full border-2 border-dashed rounded-3xl p-12 text-center transition-all ${
              isDragOver ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 scale-[1.02]' : 'border-slate-300 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-blue-500'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault(); setIsDragOver(false);
              if (e.dataTransfer.files[0]) handleFileChange(e.dataTransfer.files[0]);
            }}
          >
            <div className="h-20 w-20 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <Upload className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-zinc-100 mb-2">Drag & Drop PDF here</h3>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mb-8">or click to browse from your computer</p>
            <label className="px-6 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
              Choose File
              <input type="file" className="hidden" accept=".pdf" onChange={(e) => e.target.files && handleFileChange(e.target.files[0])} />
            </label>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-zinc-950/50">
          <div className="p-4 border-b border-slate-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 shrink-0 flex justify-between items-center">
             <div className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
                {deletedPages.size > 0 ? (
                  <span className="text-rose-600">{deletedPages.size} pages selected for deletion</span>
                ) : (
                  <span>Click on a page to mark it for deletion</span>
                )}
             </div>
             {error && <span className="text-sm text-rose-500">{error}</span>}
             {successMsg && <span className="text-sm text-emerald-500">{successMsg}</span>}
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {pdfDoc && Array.from({ length: totalPages }).map((_, i) => (
                <PdfThumbnail 
                  key={`page-${i + 1}-${pdfDoc.numPages}`} 
                  pdfDoc={pdfDoc} 
                  pageNum={i + 1} 
                  isDeleted={deletedPages.has(i + 1)}
                  onToggleDelete={() => togglePageDelete(i + 1)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
