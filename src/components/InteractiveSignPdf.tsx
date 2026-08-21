import React, { useState, useRef, useEffect } from 'react';
import { 
  ZoomIn, ZoomOut, Download, Upload, X, Loader2, ChevronLeft, ChevronRight, CheckCircle2, Eraser, FileSignature, AlertCircle, Sparkles, Plus, Minus, RefreshCw, Image as ImageIcon
} from 'lucide-react';
import { PDFDocument, degrees } from 'pdf-lib';

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface SignatureElement {
  id: string;
  page: number;
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
  base64: string;
  rotation?: number; // degrees
}

interface InteractiveSignPdfProps {
  onAddRecentFile: (file: any) => void;
  user: any;
}

export default function InteractiveSignPdf({ onAddRecentFile, user }: InteractiveSignPdfProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [pdfSource, setPdfSource] = useState<ArrayBuffer | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null); // pdfjs doc
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(100);
  
  const [aspectRatio, setAspectRatio] = useState<number>(0.75); // default A4
  const [isDragOver, setIsDragOver] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sigPadCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Signatures
  const [signatures, setSignatures] = useState<SignatureElement[]>([]);
  const [sigType, setSigType] = useState<'draw' | 'type' | 'image'>('draw');
  const [uploadedImageSig, setUploadedImageSig] = useState<string | null>(null);
  const [sigColor, setSigColor] = useState<string>('#000000');
  const [sigBrushSize, setSigBrushSize] = useState<number>(3);
  const [typeSigName, setTypeSigName] = useState('');
  const [showSigModal, setShowSigModal] = useState(false);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Drawing state
  const isDrawingRef = useRef(false);
  const sigColorRef = useRef(sigColor);
  const sigBrushSizeRef = useRef(sigBrushSize);

  useEffect(() => { sigColorRef.current = sigColor; }, [sigColor]);
  useEffect(() => { sigBrushSizeRef.current = sigBrushSize; }, [sigBrushSize]);

  // Dragging state
  const [draggingSigId, setDraggingSigId] = useState<string | null>(null);

  // Resizing state
  const [resizingSigId, setResizingSigId] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState<number>(0);
  const [resizeStartWidth, setResizeStartWidth] = useState<number>(0);

  useEffect(() => {
    if (!resizingSigId) return;

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const dx = clientX - resizeStartX;
      
      if (containerRef.current) {
        const containerWidth = containerRef.current.getBoundingClientRect().width;
        const dxPercent = (dx / containerWidth) * 100;
        
        setSignatures(sigs => sigs.map(s => 
          s.id === resizingSigId ? { ...s, width: Math.max(5, resizeStartWidth + dxPercent) } : s
        ));
      }
    };

    const handleMouseUp = () => {
      setResizingSigId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [resizingSigId, resizeStartX, resizeStartWidth]);

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
        setCurrentPage(1);
        setError(null);
      } catch (err: any) {
        setError(`Failed to open PDF: ${err.message}`);
      }
    };
    loadPdf();
  }, [pdfSource]);

  useEffect(() => {
    if (!pdfDoc) return;
    let isCurrent = true;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
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
      } catch (err: any) {
        if (isCurrent) setError(`Failed to render page: ${err.message}`);
      }
    };

    renderPage();
    return () => { isCurrent = false; };
  }, [pdfDoc, currentPage, zoom]);

  // Canvas Drawing for Signature Pad
  useEffect(() => {
    const canvas = sigPadCanvasRef.current;
    if (!canvas || showSigModal === false || sigType !== 'draw') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set white background only initially if it's empty
    if (!canvas.getAttribute('data-initialized')) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      canvas.setAttribute('data-initialized', 'true');
    }

    const startDrawing = (e) => {
      e.preventDefault();
      isDrawingRef.current = true;
      
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      ctx.beginPath();
      ctx.moveTo(x, y);
      
      // Draw a dot just in case they just click
      ctx.lineWidth = sigBrushSizeRef.current;
      ctx.lineCap = 'round';
      ctx.strokeStyle = sigColorRef.current;
      ctx.lineTo(x, y);
      ctx.stroke();
      
      draw(e);
    };

    const stopDrawing = () => {
      isDrawingRef.current = false;
      ctx.beginPath();
    };

    const draw = (e) => {
      if (!isDrawingRef.current) return;
      
      e.preventDefault();
      
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      ctx.lineWidth = sigBrushSizeRef.current;
      ctx.lineCap = 'round';
      ctx.strokeStyle = sigColorRef.current;

      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseout', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [showSigModal, sigType]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadedImageSig(ev.target?.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const clearSignatureCanvas = () => {
    const canvas = sigPadCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

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
    };
    fileReader.readAsArrayBuffer(file);
  };

  const addSignatureToPage = () => {
    let sigUrl = '';
    if (sigType === 'draw' && sigPadCanvasRef.current) {
      // Remove white background and make transparent
      const canvas = sigPadCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          // If white (R>240, G>240, B>240), make transparent
          if (data[i] > 240 && data[i+1] > 240 && data[i+2] > 240) {
            data[i+3] = 0;
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }
      sigUrl = canvas.toDataURL('image/png');
    } else if (sigType === 'type') {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 400;
      tempCanvas.height = 150;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = sigColor;
        ctx.font = '40px cursive';
        ctx.fillText(typeSigName || 'My Signature', 30, 80);
      }
      sigUrl = tempCanvas.toDataURL('image/png');
    } else if (sigType === 'image' && uploadedImageSig) {
      sigUrl = uploadedImageSig;
    }

    if (sigUrl) {
      const newSig: SignatureElement = {
        id: `sig_${Date.now()}`,
        page: currentPage,
        x: 40,
        y: 40,
        width: 30, // 30% of page width
        base64: sigUrl
      };
      setSignatures([...signatures, newSig]);
    }
    setShowSigModal(false);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingSigId(id);
    e.dataTransfer.effectAllowed = 'move';
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    e.dataTransfer.setData('text/plain', JSON.stringify({ id, offsetX, offsetY }));
  };

  const handleDragOverPdf = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropPdf = (e: React.DragEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const { id, offsetX, offsetY } = data;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const xPx = e.clientX - containerRect.left - offsetX;
      const yPx = e.clientY - containerRect.top - offsetY;
      
      const xPercent = (xPx / containerRect.width) * 100;
      const yPercent = (yPx / containerRect.height) * 100;
      
      setSignatures(sigs => sigs.map(sig => 
        sig.id === id ? { ...sig, x: Math.max(0, Math.min(xPercent, 100 - sig.width)), y: Math.max(0, Math.min(yPercent, 90)) } : sig
      ));
    } catch (err) {
      // ignore
    }
    setDraggingSigId(null);
  };

  const savePdf = async () => {
    if (!uploadedFile || !pdfSource) return;
    setIsProcessing(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const pdfDoc = await PDFDocument.load(pdfSource);
      const pages = pdfDoc.getPages();
      
      for (const sig of signatures) {
        const page = pages[sig.page - 1];
        const { width, height } = page.getSize();
        
        // Clean base64 string
        const base64Data = sig.base64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
        const signatureImage = await pdfDoc.embedPng(Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)));
        
        const imgDims = signatureImage.scale(1);
        
        // sig.width is percentage of page width
        const renderWidth = width * (sig.width / 100);
        const aspect = imgDims.height / imgDims.width;
        const renderHeight = renderWidth * aspect;
        
        // Calculate coords (y in pdf-lib is from bottom)
        const xPos = width * (sig.x / 100);
        const yPos = height - (height * (sig.y / 100)) - renderHeight;
        
        const rad = (sig.rotation || 0) * Math.PI / 180;
        const cx = xPos + renderWidth / 2;
        const cy = yPos + renderHeight / 2;
        
        const x_prime = cx - (renderWidth/2)*Math.cos(rad) - (renderHeight/2)*Math.sin(rad);
        const y_prime = cy + (renderWidth/2)*Math.sin(rad) - (renderHeight/2)*Math.cos(rad);
        
        page.drawImage(signatureImage, {
          x: x_prime,
          y: y_prime,
          width: renderWidth,
          height: renderHeight,
          rotate: degrees(-(sig.rotation || 0)),
        });
      }

      const pdfBytes = await pdfDoc.save();
      
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `signed_${uploadedFile.name}`;
      a.click();
      URL.revokeObjectURL(url);
      
      setSuccessMsg("Document signed and downloaded successfully.");
      onAddRecentFile({
        name: `signed_${uploadedFile.name}`,
        size: formatBytes(pdfBytes.length),
        type: 'application/pdf',
        toolUsed: 'Sign PDF Document',
      });
    } catch (err: any) {
      setError(`Failed to save PDF: ${err.message}`);
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
              <FileSignature className="h-6 w-6 text-blue-500" />
              Sign PDF Workstation
            </h1>
            <p className="text-xs text-slate-500 font-medium">Draw, type, and place signatures directly on your documents.</p>
          </div>
        </div>
        
        {pdfSource && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setPdfSource(null); setUploadedFile(null); setSignatures([]); setSuccessMsg(null); }}
              className="px-4 py-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-700 dark:text-zinc-300 rounded-xl text-sm font-semibold transition-colors"
            >
              Clear
            </button>
            <button 
              onClick={savePdf}
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all hover:scale-105"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Save Document
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
            <div className="h-20 w-20 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6">
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
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar Toolbar */}
          <div className="w-64 bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800 p-4 flex flex-col gap-6 overflow-y-auto shrink-0">
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Tools</h3>
              <button
                onClick={() => setShowSigModal(true)}
                className="w-full py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold rounded-xl border border-blue-200 dark:border-blue-800/30 flex items-center justify-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
              >
                <FileSignature className="h-5 w-5" />
                Add Signature
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Navigation</h3>
              <div className="flex items-center justify-between bg-slate-50 dark:bg-zinc-900/40 rounded-xl p-2 border border-slate-200 dark:border-zinc-800">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="p-2 hover:bg-white dark:hover:bg-zinc-800 rounded-lg disabled:opacity-50 text-slate-600 dark:text-zinc-400"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
                  {currentPage} <span className="text-slate-400 font-normal">/ {totalPages}</span>
                </span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-2 hover:bg-white dark:hover:bg-zinc-800 rounded-lg disabled:opacity-50 text-slate-600 dark:text-zinc-400"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="p-2 bg-slate-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800"><Minus className="h-4 w-4"/></button>
                <span className="flex-1 text-center text-sm font-semibold text-slate-700 dark:text-zinc-300">{zoom}%</span>
                <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="p-2 bg-slate-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800"><Plus className="h-4 w-4"/></button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-medium flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                {successMsg}
              </div>
            )}
          </div>

          {/* Main Stage */}
          <div className="flex-1 flex items-center justify-center p-8 bg-slate-200/50 dark:bg-zinc-950/50 relative overflow-auto">
            <div 
              ref={containerRef}
              className="relative bg-white dark:bg-zinc-900 shadow-2xl rounded-lg border border-slate-300/40 dark:border-zinc-800/40 transition-all duration-300"
              style={{ 
                width: `${600 * (zoom / 100)}px`,
                aspectRatio: `${aspectRatio}`,
                minWidth: `${400 * (zoom / 100)}px`
              }}
              onDragOver={handleDragOverPdf}
              onDrop={handleDropPdf}
            >
              <canvas ref={canvasRef} className="w-full h-full object-contain pointer-events-none" />
              
              {/* Overlay Signatures */}
              {signatures.filter(s => s.page === currentPage).map(sig => (
                <div
                  key={sig.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, sig.id)}
                  className="absolute cursor-move border-2 border-transparent hover:border-blue-400 group rounded"
                  style={{
                    left: `${sig.x}%`,
                    top: `${sig.y}%`,
                    width: `${sig.width}%`,
                    transform: `rotate(${sig.rotation || 0}deg)`,
                  }}
                >
                  <img loading="lazy" src={sig.base64} alt="Signature" className="w-full h-auto pointer-events-none" />
                  
                  {/* Rotate Handle */}
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setSignatures(sigs => sigs.map(s => 
                        s.id === sig.id ? { ...s, rotation: ((s.rotation || 0) + 90) % 360 } : s
                      ));
                    }}
                    className="absolute -top-3 -left-3 bg-white dark:bg-zinc-800 text-blue-500 border border-slate-200 dark:border-zinc-700 rounded-full p-1 shadow-lg cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    title="Rotate 90 degrees"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </div>

                  {/* Delete Button */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSignatures(sigs => sigs.filter(s => s.id !== sig.id)); }}
                    className="absolute -top-3 -right-3 bg-white dark:bg-zinc-800 text-rose-500 border border-slate-200 dark:border-zinc-700 rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>

                  {/* Resize Handle */}
                  <div 
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setResizingSigId(sig.id);
                      setResizeStartX(e.clientX);
                      setResizeStartWidth(sig.width);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      setResizingSigId(sig.id);
                      setResizeStartX(e.touches[0].clientX);
                      setResizeStartWidth(sig.width);
                    }}
                    className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity" 
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {showSigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-zinc-900 bg-slate-50 dark:bg-zinc-900/30">
              <h3 className="font-bold text-slate-800 dark:text-zinc-100">Create Signature</h3>
              <button onClick={() => setShowSigModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="flex gap-2 border-b border-slate-100 dark:border-zinc-900 pb-3">
                <button
                  type="button"
                  onClick={() => setSigType('draw')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    sigType === 'draw' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Draw
                </button>
                <button
                  type="button"
                  onClick={() => setSigType('type')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    sigType === 'type' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Type
                </button>
                <button
                  type="button"
                  onClick={() => setSigType('image')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    sigType === 'image' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <ImageIcon className="h-3 w-3" /> Image
                </button>
              </div>

              {sigType === 'draw' ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-500">Color & Size</span>
                    <button onClick={clearSignatureCanvas} className="text-xs text-slate-500 hover:text-rose-500 flex items-center gap-1">
                      <Eraser className="h-3.5 w-3.5" /> Clear
                    </button>
                  </div>
                  <div className="flex gap-3 items-center">
                    <input type="color" value={sigColor} onChange={e => setSigColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                    <input type="range" min="1" max="10" value={sigBrushSize} onChange={e => setSigBrushSize(parseInt(e.target.value))} className="flex-1 accent-blue-600" />
                  </div>
                  <div className="border-2 border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden touch-none relative bg-white">
                    <canvas ref={sigPadCanvasRef} width={400} height={150} className="w-full bg-white cursor-crosshair" />
                    <div className="absolute bottom-2 left-3 text-[10px] text-slate-300 pointer-events-none font-mono">Sign Here</div>
                  </div>
                </div>
              ) : sigType === 'type' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2">Your Name</label>
                    <input 
                      type="text" 
                      placeholder="Jane Doe" 
                      value={typeSigName}
                      onChange={e => setTypeSigName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:border-blue-500 text-slate-800 dark:text-zinc-100 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2">Color</label>
                    <input type="color" value={sigColor} onChange={e => setSigColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
                  </div>
                  <div className="p-6 bg-white dark:bg-white rounded-xl border border-slate-200 flex items-center justify-center min-h-[120px] overflow-hidden">
                    <span style={{ color: sigColor, fontFamily: 'cursive', fontSize: '40px' }} className="whitespace-nowrap">
                      {typeSigName || 'My Signature'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
                    <label className="cursor-pointer flex flex-col items-center">
                      <Upload className="h-8 w-8 text-blue-500 mb-2" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-zinc-200">Click to upload image</span>
                      <span className="text-xs text-slate-500 mt-1">PNG, JPG up to 5MB</span>
                      <input type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleImageUpload} />
                    </label>
                  </div>
                  {uploadedImageSig && (
                    <div className="p-4 bg-slate-50 dark:bg-zinc-900/50 rounded-xl border border-slate-200 dark:border-zinc-800 flex justify-center">
                      <img loading="lazy" src={uploadedImageSig} alt="Uploaded signature" className="max-h-32 object-contain" />
                    </div>
                  )}
                </div>
              )}

              <button 
                onClick={addSignatureToPage}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-transform hover:scale-[1.02]"
              >
                Insert Signature
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
