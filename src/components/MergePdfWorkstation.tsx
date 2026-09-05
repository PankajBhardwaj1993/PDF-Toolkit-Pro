import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, 
  Upload, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  FileText, 
  Loader2, 
  CheckCircle, 
  Plus, 
  RefreshCw 
} from 'lucide-react';
import { mergePDFs } from '../utils/pdfUtils';

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface MergePdfWorkstationProps {
  onAddRecentFile: (file: any) => void;
  user: any;
  onBackToTools?: () => void;
}

interface PdfFileWithMeta {
  id: string;
  file: File;
  pageCount: number | null;
  loading: boolean;
  error: boolean;
}

// Single PDF page-1 preview rendering component
const SinglePdfPreview: React.FC<{ file: File; onPageCountLoaded: (count: number) => void }> = ({ file, onPageCountLoaded }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let isCurrent = true;
    let renderTask: any = null;

    const renderFirstPage = async () => {
      try {
        setLoading(true);
        setError(false);

        // Helper to resolve pdfjsLib safely
        const win = window as any;
        let pdfjs = win.pdfjsLib;
        if (!pdfjs) {
          for (let i = 0; i < 20; i++) {
            await new Promise(res => setTimeout(res, 250));
            if (win.pdfjsLib) {
              pdfjs = win.pdfjsLib;
              break;
            }
          }
        }

        if (!pdfjs) {
          throw new Error("pdfjs library unavailable");
        }

        if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        }

        const arrayBuffer = await file.arrayBuffer();
        if (!isCurrent) return;

        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const doc = await loadingTask.promise;
        if (!isCurrent) return;
        
        onPageCountLoaded(doc.numPages);

        const page = await doc.getPage(1);
        if (!isCurrent) return;

        const canvas = canvasRef.current;
        if (!canvas) {
          setLoading(false);
          return;
        }

        const context = canvas.getContext('2d');
        if (!context) {
          setLoading(false);
          return;
        }

        const rawViewport = page.getViewport({ scale: 1.0 });
        // Use 2x pixel ratio for sharp retina thumbnail rendering
        const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
        const targetWidth = 120 * dpr;
        const scale = targetWidth / rawViewport.width;
        const viewport = page.getViewport({ scale });

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        renderTask = page.render({ canvasContext: context, viewport });
        await renderTask.promise;

        if (isCurrent) {
          setLoading(false);
        }
      } catch (err: any) {
        if (err?.name === 'RenderingCancelledException') {
          return;
        }
        console.error('Error rendering first page thumbnail:', err);
        if (isCurrent) {
          setError(true);
          setLoading(false);
        }
      }
    };

    renderFirstPage();

    return () => {
      isCurrent = false;
      if (renderTask && renderTask.cancel) {
        try {
          renderTask.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [file]);

  return (
    <div className="relative shadow-sm border border-slate-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900 w-[110px] h-[145px] flex items-center justify-center flex-shrink-0">
      {/* Canvas is always mounted in the DOM so canvasRef.current is never null */}
      <canvas 
        ref={canvasRef} 
        className={`max-w-full max-h-full object-contain transition-opacity duration-200 ${loading || error ? 'opacity-0' : 'opacity-100'}`} 
      />

      {loading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/90 dark:bg-zinc-900/90 gap-1.5 z-10">
          <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
          <span className="text-[8px] text-slate-400 font-medium">Loading...</span>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 bg-slate-100 dark:bg-zinc-900 flex flex-col items-center justify-center p-2 text-center z-10">
          <FileText className="h-6 w-6 text-slate-400 mb-1" />
          <span className="text-[9px] text-slate-500 font-semibold truncate w-full">{file.name}</span>
          <span className="text-[8px] text-rose-500 mt-0.5">Preview N/A</span>
        </div>
      )}
    </div>
  );
};

export default function MergePdfWorkstation({ onAddRecentFile, user, onBackToTools }: MergePdfWorkstationProps) {
  const [pdfFiles, setPdfFiles] = useState<PdfFileWithMeta[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [mergedBlobUrl, setMergedBlobUrl] = useState<string | null>(null);
  const [mergedSize, setMergedSize] = useState<string | null>(null);

  // Load sample PDFs or handle initial file drops/selections if any
  const processNewFiles = async (files: FileList | File[]) => {
    const newItems: PdfFileWithMeta[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.type !== 'application/pdf' && !f.name.endsWith('.pdf')) {
        continue;
      }
      newItems.push({
        id: Math.random().toString(36).substr(2, 9),
        file: f,
        pageCount: null,
        loading: true,
        error: false,
      });
    }

    if (newItems.length > 0) {
      setPdfFiles(prev => [...prev, ...newItems]);
      setError(null);
      setSuccessMsg(null);
      setMergedBlobUrl(null);
    } else {
      setError("Please select valid PDF document files.");
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      processNewFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processNewFiles(Array.from(e.target.files));
    }
  };

  const updatePageCount = (id: string, count: number) => {
    setPdfFiles(prev => prev.map(item => item.id === id ? { ...item, pageCount: count, loading: false } : item));
  };

  // Reordering functions
  const moveUp = (index: number) => {
    if (index === 0) return;
    setPdfFiles(prev => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      return next;
    });
  };

  const moveDown = (index: number) => {
    if (index === pdfFiles.length - 1) return;
    setPdfFiles(prev => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      return next;
    });
  };

  const changePosition = (index: number, targetPositionStr: string) => {
    const targetIdx = parseInt(targetPositionStr) - 1;
    if (isNaN(targetIdx) || targetIdx < 0 || targetIdx >= pdfFiles.length || targetIdx === index) return;
    
    setPdfFiles(prev => {
      const next = [...prev];
      const itemToMove = next[index];
      // Remove from current position
      next.splice(index, 1);
      // Insert at target position
      next.splice(targetIdx, 0, itemToMove);
      return next;
    });
  };

  const removeFile = (id: string) => {
    setPdfFiles(prev => prev.filter(item => item.id !== id));
    setSuccessMsg(null);
    setMergedBlobUrl(null);
  };

  const clearAll = () => {
    setPdfFiles([]);
    setSuccessMsg(null);
    setError(null);
    setMergedBlobUrl(null);
  };

  const handleMerge = async () => {
    if (pdfFiles.length < 2) {
      setError("Please upload at least 2 PDF files to merge.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const filesToMerge = pdfFiles.map(item => item.file);
      const bytes = await mergePDFs(filesToMerge);
      
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setMergedBlobUrl(url);
      setMergedSize(formatBytes(bytes.length));

      // Trigger auto-download
      const a = document.createElement('a');
      a.href = url;
      a.download = 'merged_document.pdf';
      a.click();

      setSuccessMsg("PDF documents merged successfully!");
      onAddRecentFile({
        name: 'merged_document.pdf',
        size: formatBytes(bytes.length),
        type: 'application/pdf',
        toolUsed: 'Merge PDF',
      });
    } catch (err: any) {
      setError(`Failed to merge PDFs: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Workstation Dashboard Header */}
      <div className="bg-slate-50 dark:bg-zinc-900/30 p-5 rounded-2xl border border-slate-150 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <FileText className="h-5 w-5" />
            </span>
            Merge PDF Workstation
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Arrange, sequence, and merge multiple PDF documents with real-time left-pane page previews.
          </p>
        </div>
        
        {pdfFiles.length > 0 && (
          <button
            onClick={clearAll}
            className="self-start md:self-auto px-3.5 py-1.5 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            Clear All
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-150 dark:border-rose-900/30 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 animate-pulse">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/30 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
          {mergedBlobUrl && (
            <a
              href={mergedBlobUrl}
              download="merged_document.pdf"
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Download Again ({mergedSize})
            </a>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT SIDE: PREVIEWS AND SEQUENCING LIST */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-150 dark:border-zinc-850 pb-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
              <span>PDF sequence & previews</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-[10px] text-slate-500 font-mono">
                {pdfFiles.length} files
              </span>
            </h3>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Left Pane Previews
            </span>
          </div>

          {pdfFiles.length === 0 ? (
            <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl p-10 text-center bg-slate-50/20 dark:bg-zinc-900/5 flex flex-col items-center justify-center">
              <FileText className="h-12 w-12 text-slate-300 dark:text-zinc-700 mb-3" />
              <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">No PDFs uploaded yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Upload at least two PDF files in the control center on the right to start arranging their sequence.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {pdfFiles.map((item, index) => (
                <div 
                  key={item.id} 
                  className="flex flex-col sm:flex-row gap-4 p-4 border border-slate-150 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl hover:shadow-md transition-all relative"
                >
                  {/* Position number bubble badge */}
                  <div className="absolute top-3 left-3 sm:relative sm:top-0 sm:left-0 self-start flex items-center justify-center h-7 w-7 rounded-full bg-blue-600 text-white text-xs font-black shadow-sm font-mono z-10">
                    #{index + 1}
                  </div>

                  {/* Left component inside the row: Preview Thumbnail of 1st Page */}
                  <div className="flex justify-center sm:justify-start">
                    <SinglePdfPreview 
                      file={item.file} 
                      onPageCountLoaded={(count) => updatePageCount(item.id, count)} 
                    />
                  </div>

                  {/* Right components: info and ordering selectors */}
                  <div className="flex-1 flex flex-col justify-between min-w-0 py-1">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-100 truncate pr-6 sm:pr-0" title={item.file.name}>
                        {item.file.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-zinc-900/80 px-2 py-0.5 rounded border border-slate-100 dark:border-zinc-800">
                          {formatBytes(item.file.size)}
                        </span>
                        {item.pageCount !== null && (
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-950/30">
                            {item.pageCount} {item.pageCount === 1 ? 'Page' : 'Pages'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Controls section */}
                    <div className="flex items-center justify-between gap-3 mt-4 sm:mt-0 pt-3 border-t border-slate-50 dark:border-zinc-900">
                      
                      {/* Sequencing Dropdown Selector */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Position:</span>
                        <select
                          value={index + 1}
                          onChange={(e) => changePosition(index, e.target.value)}
                          className="px-2 py-1 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 rounded-lg text-xs font-bold text-slate-700 dark:text-zinc-300 outline-none focus:border-blue-500 cursor-pointer"
                        >
                          {pdfFiles.map((_, i) => (
                            <option key={i} value={i + 1}>
                              {i + 1} {i === index ? '(Current)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Arrow adjusters and delete buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveUp(index)}
                          disabled={index === 0}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 disabled:opacity-30 disabled:pointer-events-none text-slate-600 dark:text-zinc-400 transition-colors cursor-pointer"
                          title="Move PDF Up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        
                        <button
                          onClick={() => moveDown(index)}
                          disabled={index === pdfFiles.length - 1}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 disabled:opacity-30 disabled:pointer-events-none text-slate-600 dark:text-zinc-400 transition-colors cursor-pointer"
                          title="Move PDF Down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        
                        <button
                          onClick={() => removeFile(item.id)}
                          className="p-1.5 rounded-lg border border-rose-100 dark:border-rose-950 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer ml-1"
                          title="Remove PDF"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT SIDE: CONTROL CENTER & ADD MORE */}
        <div className="lg:col-span-5 space-y-6">
          <div className="border-b border-slate-150 dark:border-zinc-850 pb-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200">
              Control Center
            </h3>
          </div>

          {/* Upload Drop Zone to Add More PDFs */}
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl p-6 text-center bg-slate-50/40 dark:bg-zinc-900/10 hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-zinc-900/30 transition-all cursor-pointer relative"
          >
            <input
              type="file"
              multiple
              accept="application/pdf"
              onChange={handleFileSelect}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <Plus className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">
              Click or Drag & Drop PDFs to upload
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Supports multiple PDF uploads. Append to current sequence.
            </p>
          </div>

          {/* List stats and triggers */}
          {pdfFiles.length > 0 && (
            <div className="bg-slate-50/50 dark:bg-zinc-900/20 border border-slate-150 dark:border-zinc-800/60 p-5 rounded-2xl space-y-4">
              <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
                Merge Settings & Stats
              </h4>
              
              <div className="space-y-2 text-xs text-slate-600 dark:text-zinc-400">
                <div className="flex justify-between">
                  <span>Total PDFs Selected:</span>
                  <span className="font-bold font-mono text-slate-800 dark:text-zinc-200">{pdfFiles.length} files</span>
                </div>
                <div className="flex justify-between">
                  <span>Combined Page Count:</span>
                  <span className="font-bold font-mono text-slate-800 dark:text-zinc-200">
                    {pdfFiles.some(item => item.pageCount === null) ? (
                      <Loader2 className="h-3 w-3 inline animate-spin text-slate-400" />
                    ) : (
                      pdfFiles.reduce((acc, item) => acc + (item.pageCount || 0), 0)
                    )} pages
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Files Size:</span>
                  <span className="font-bold font-mono text-slate-800 dark:text-zinc-200">
                    {formatBytes(pdfFiles.reduce((acc, item) => acc + item.file.size, 0))}
                  </span>
                </div>
              </div>

              <button
                onClick={handleMerge}
                disabled={isProcessing || pdfFiles.length < 2}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:dark:bg-zinc-800 disabled:text-slate-400 text-white font-bold py-3 px-4 rounded-xl cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 shadow-lg shadow-blue-500/15"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    Merging PDFs on Client...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Done & Download Merged PDF
                  </>
                )}
              </button>
              
              {pdfFiles.length < 2 && (
                <p className="text-[10px] text-center text-amber-500 font-semibold leading-normal">
                  Please upload at least 2 PDF files to enable merging.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
