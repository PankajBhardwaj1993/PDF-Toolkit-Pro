import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, Upload, RotateCw, RotateCcw, Image as ImageIcon, Loader2, 
  ArrowLeft, RefreshCw, Check, Maximize, Sliders, Crop, AlertCircle,
  FlipHorizontal, FlipVertical, Grid, Trash2
} from 'lucide-react';

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface CropImageWorkstationProps {
  onAddRecentFile: (file: any) => void;
  user: any;
  onBackToTools?: () => void;
}

export default function CropImageWorkstation({ onAddRecentFile, user, onBackToTools }: CropImageWorkstationProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [imageSize, setImageSize] = useState<string>('');
  const [naturalWidth, setNaturalWidth] = useState<number>(0);
  const [naturalHeight, setNaturalHeight] = useState<number>(0);
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);

  // Crop Box coordinates in percentage (0 to 100)
  const [cropX, setCropX] = useState<number>(10);
  const [cropY, setCropY] = useState<number>(10);
  const [cropW, setCropW] = useState<number>(80);
  const [cropH, setCropH] = useState<number>(80);
  const [aspectRatio, setAspectRatio] = useState<string>('free'); // 'free', '1:1', '16:9', '4:3', '3:2', '9:16'

  // Image export settings
  const [exportFormat, setExportFormat] = useState<string>('image/jpeg');
  const [exportQuality, setExportQuality] = useState<number>(90);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [croppedResult, setCroppedResult] = useState<{ url: string; size: string; width: number; height: number; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Dragging states
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragType, setDragType] = useState<string>(''); // 'move', 'tl', 'tr', 'bl', 'br', 't', 'b', 'l', 'r'
  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartCrop = useRef<{ x: number; y: number; w: number; h: number }>({ x: 10, y: 10, w: 80, h: 80 });

  // Cleanup Object URL on unmount
  useEffect(() => {
    return () => {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  }, [imageSrc]);

  // Load selected file
  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, WEBP, etc.)');
      return;
    }
    setError(null);
    setCroppedResult(null);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setCropX(10);
    setCropY(10);
    setCropW(80);
    setCropH(80);
    setAspectRatio('free');

    setImageFile(file);
    setImageSize(formatBytes(file.size));
    const url = URL.createObjectURL(file);
    setImageSrc(url);
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileChange(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalWidth(img.naturalWidth);
    setNaturalHeight(img.naturalHeight);
  };

  // Predefined Aspect Ratio locking
  useEffect(() => {
    if (aspectRatio === 'free') return;
    
    // Adjust height based on aspect ratio
    let ratioNum = 1;
    if (aspectRatio === '1:1') ratioNum = 1;
    else if (aspectRatio === '16:9') ratioNum = 16 / 9;
    else if (aspectRatio === '4:3') ratioNum = 4 / 3;
    else if (aspectRatio === '3:2') ratioNum = 3 / 2;
    else if (aspectRatio === '9:16') ratioNum = 9 / 16;

    // We want to calculate the new height in percentages based on natural width & height of image
    if (naturalWidth && naturalHeight) {
      const naturalAspect = naturalWidth / naturalHeight;
      const percentRatio = ratioNum / naturalAspect; // adjust for coordinate scaling
      
      let newW = cropW;
      let newH = cropW / percentRatio;

      if (newH > 100 - cropY) {
        newH = 100 - cropY;
        newW = newH * percentRatio;
      }
      if (newW > 100 - cropX) {
        newW = 100 - cropX;
        newH = newW / percentRatio;
      }

      setCropW(Math.max(10, Math.min(100, parseFloat(newW.toFixed(2)))));
      setCropH(Math.max(10, Math.min(100, parseFloat(newH.toFixed(2)))));
    }
  }, [aspectRatio, naturalWidth, naturalHeight]);

  // Handle Drag / Move of Crop Box and Handles
  const startDrag = (e: React.MouseEvent | React.TouchEvent, type: string) => {
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setIsDragging(true);
    setDragType(type);
    dragStartPos.current = { x: clientX, y: clientY };
    dragStartCrop.current = { x: cropX, y: cropY, w: cropW, h: cropH };
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !containerRef.current) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const containerRect = containerRef.current.getBoundingClientRect();
      const imgWidth = imageRef.current ? imageRef.current.offsetWidth : containerRect.width;
      const imgHeight = imageRef.current ? imageRef.current.offsetHeight : containerRect.height;
      
      const deltaXPercent = ((clientX - dragStartPos.current.x) / imgWidth) * 100;
      const deltaYPercent = ((clientY - dragStartPos.current.y) / imgHeight) * 100;

      // Rotate delta vector by negative of rotation angle so mouse coords align with local crop box orientation
      const rad = (-rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      let localDeltaX = deltaXPercent * cos - deltaYPercent * sin;
      let localDeltaY = deltaXPercent * sin + deltaYPercent * cos;

      // Handle mirrors
      if (flipH) localDeltaX = -localDeltaX;
      if (flipV) localDeltaY = -localDeltaY;

      let newX = dragStartCrop.current.x;
      let newY = dragStartCrop.current.y;
      let newW = dragStartCrop.current.w;
      let newH = dragStartCrop.current.h;

      if (dragType === 'move') {
        newX = Math.max(0, Math.min(100 - newW, dragStartCrop.current.x + localDeltaX));
        newY = Math.max(0, Math.min(100 - newH, dragStartCrop.current.y + localDeltaY));
      } else {
        // Resize logic based on handle
        if (dragType.includes('r')) {
          newW = Math.max(5, Math.min(100 - newX, dragStartCrop.current.w + localDeltaX));
        }
        if (dragType.includes('l')) {
          const maxW = dragStartCrop.current.x + dragStartCrop.current.w;
          newX = Math.max(0, Math.min(maxW - 5, dragStartCrop.current.x + localDeltaX));
          newW = maxW - newX;
        }
        if (dragType.includes('b')) {
          newH = Math.max(5, Math.min(100 - newY, dragStartCrop.current.h + localDeltaY));
        }
        if (dragType.includes('t')) {
          const maxH = dragStartCrop.current.y + dragStartCrop.current.h;
          newY = Math.max(0, Math.min(maxH - 5, dragStartCrop.current.y + localDeltaY));
          newH = maxH - newY;
        }

        // Apply aspect ratio locks on resize
        if (aspectRatio !== 'free') {
          let ratioNum = 1;
          if (aspectRatio === '1:1') ratioNum = 1;
          else if (aspectRatio === '16:9') ratioNum = 16 / 9;
          else if (aspectRatio === '4:3') ratioNum = 4 / 3;
          else if (aspectRatio === '3:2') ratioNum = 3 / 2;
          else if (aspectRatio === '9:16') ratioNum = 9 / 16;

          const naturalAspect = naturalWidth / naturalHeight;
          const percentRatio = ratioNum / naturalAspect;

          if (dragType === 'tr' || dragType === 'br' || dragType === 'r' || dragType === 'b') {
            newH = newW / percentRatio;
            if (newY + newH > 100) {
              newH = 100 - newY;
              newW = newH * percentRatio;
            }
          } else if (dragType === 'tl' || dragType === 'bl' || dragType === 'l' || dragType === 't') {
            newW = newH * percentRatio;
            if (newX + newW > 100) {
              newW = 100 - newX;
              newH = newW / percentRatio;
            }
          }
        }
      }

      setCropX(parseFloat(Math.max(0, Math.min(100, newX)).toFixed(2)));
      setCropY(parseFloat(Math.max(0, Math.min(100, newY)).toFixed(2)));
      setCropW(parseFloat(Math.max(5, Math.min(100 - newX, newW)).toFixed(2)));
      setCropH(parseFloat(Math.max(5, Math.min(100 - newY, newH)).toFixed(2)));
    };

    const stopDrag = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', stopDrag);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', stopDrag);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', stopDrag);
    };
  }, [isDragging, dragType, cropX, cropY, cropW, cropH, aspectRatio, naturalWidth, naturalHeight]);

  // Rotate functions
  const rotateClockwise = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const rotateCounterClockwise = () => {
    setRotation(prev => (prev + 270) % 360);
  };

  // Perform client side Canvas Crop
  const handleCropImage = async () => {
    if (!imageFile || !imageSrc) return;
    setIsProcessing(true);
    setError(null);

    try {
      // 1. Create source image object
      const img = new Image();
      img.src = imageSrc;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Failed to load image in canvas.'));
      });

      // 2. Compute true rotation dimensions
      const is90Rotated = rotation === 90 || rotation === 270;
      const rotW = is90Rotated ? img.naturalHeight : img.naturalWidth;
      const rotH = is90Rotated ? img.naturalWidth : img.naturalHeight;

      // Create intermediate canvas to draw rotated & flipped image
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = rotW;
      tempCanvas.height = rotH;
      const tempCtx = tempCanvas.getContext('2d');

      if (!tempCtx) {
        throw new Error('Could not create 2D context for image processing');
      }

      // Apply rotation & flip matrices to temp canvas
      tempCtx.translate(rotW / 2, rotH / 2);
      tempCtx.rotate((rotation * Math.PI) / 180);
      const scaleX = flipH ? -1 : 1;
      const scaleY = flipV ? -1 : 1;
      tempCtx.scale(scaleX, scaleY);
      tempCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

      // Now map percentage crop zones to temp canvas pixels
      const pixelX = Math.round((cropX / 100) * rotW);
      const pixelY = Math.round((cropY / 100) * rotH);
      const pixelW = Math.round((cropW / 100) * rotW);
      const pixelH = Math.round((cropH / 100) * rotH);

      // Create final cropped canvas
      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = pixelW;
      croppedCanvas.height = pixelH;
      const croppedCtx = croppedCanvas.getContext('2d');

      if (!croppedCtx) {
        throw new Error('Failed to create cropping canvas context');
      }

      // Draw the cropped portion
      croppedCtx.drawImage(
        tempCanvas,
        pixelX, pixelY, pixelW, pixelH, // source crop rect
        0, 0, pixelW, pixelH           // destination target rect
      );

      // Generate Data URL
      const dataUrl = croppedCanvas.toDataURL(exportFormat, exportQuality / 100);
      const extension = exportFormat.split('/')[1];
      const origName = imageFile.name.split('.')[0];
      const croppedName = `${origName}_cropped.${extension}`;

      // Calculate approximate size in bytes from base64
      const head = `data:${exportFormat};base64,`;
      const sizeInBytes = Math.round((dataUrl.length - head.length) * 3 / 4);

      const result = {
        url: dataUrl,
        size: formatBytes(sizeInBytes),
        width: pixelW,
        height: pixelH,
        name: croppedName
      };

      setCroppedResult(result);

      // Save to recent files history
      onAddRecentFile({
        name: croppedName,
        size: result.size,
        type: exportFormat,
        toolUsed: 'Crop Image'
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during cropping.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadCroppedImage = () => {
    if (!croppedResult) return;
    const a = document.createElement('a');
    a.href = croppedResult.url;
    a.download = croppedResult.name;
    a.click();
  };

  const handleReset = () => {
    setImageFile(null);
    setImageSrc('');
    setCroppedResult(null);
    setError(null);
  };

  return (
    <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-7 shadow-xl space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-900 pb-5">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
            <Crop className="h-5 w-5 text-blue-500 animate-pulse" />
            Crop Image Workstation
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Rotate, flip, adjust coordinates, and trim images with real-time visual sandbox mask.
          </p>
        </div>
        {imageFile && (
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1 text-xs font-bold px-3 py-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all border border-rose-100 dark:border-rose-900/40 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Start Over
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl flex items-start gap-2 text-xs text-rose-700 dark:text-rose-400">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold">Error Processing Image</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {!imageFile ? (
        /* DRAG & DROP FILE UPLOAD AREA */
        <div 
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl p-12 text-center bg-slate-50/50 dark:bg-zinc-900/10 hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-zinc-900/20 transition-all cursor-pointer relative"
        >
          <input
            type="file"
            accept="image/*"
            onChange={onFileSelect}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mx-auto mb-4">
            <Upload className="h-7 w-7 text-blue-500" />
          </div>
          <h3 className="text-base font-bold text-slate-700 dark:text-zinc-300 mb-1">
            Drag & drop image here or click to browse
          </h3>
          <p className="text-xs text-slate-400 dark:text-zinc-500 max-w-sm mx-auto">
            Supports high-resolution PNG, JPEG, WebP, GIF, or BMP image formats.
          </p>
        </div>
      ) : croppedResult ? (
        /* CROP SUCCESS PANEL */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-4 animate-fade-in">
          <div className="flex flex-col items-center justify-center p-4 border border-slate-100 dark:border-zinc-900 bg-slate-50/30 dark:bg-zinc-900/10 rounded-2xl">
            <div className="max-w-full max-h-[400px] overflow-hidden rounded-xl shadow-lg bg-slate-100 dark:bg-zinc-900 flex items-center justify-center relative border border-slate-200 dark:border-zinc-800 p-2">
              <img loading="lazy" 
                src={croppedResult.url} 
                alt="Cropped Success result" 
                className="max-w-full max-h-[350px] object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="mt-4 text-center space-y-1">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 px-2.5 py-1 rounded-full">
                <Check className="h-3.5 w-3.5" />
                Image Cropped Successfully!
              </span>
              <p className="text-xs text-slate-400 font-mono mt-1.5">
                {croppedResult.width} x {croppedResult.height} px • {croppedResult.size}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="font-display text-lg font-bold text-slate-800 dark:text-zinc-100">Ready for Download</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                Your cropped image has been rendered on a high-fidelity client-side canvas. All metadata has been processed inside your browser with absolute speed and safety.
              </p>
            </div>

            <div className="border border-slate-100 dark:border-zinc-900 rounded-xl p-4 bg-slate-50/50 dark:bg-zinc-950 space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">File Name:</span>
                <span className="font-bold text-slate-700 dark:text-zinc-300 font-mono truncate max-w-[180px]">{croppedResult.name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Output Dimensions:</span>
                <span className="font-semibold text-slate-700 dark:text-zinc-300 font-mono">{croppedResult.width} x {croppedResult.height} px</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Optimized Size:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{croppedResult.size}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={downloadCroppedImage}
                className="flex-1 py-3 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-blue-500/10 uppercase tracking-wider"
              >
                <Download className="h-4 w-4" />
                Download Cropped Image
              </button>
              <button
                onClick={() => setCroppedResult(null)}
                className="py-3 px-5 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Recrop Image
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* INTERACTIVE WORKSPACE GRID */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
          
          {/* LEFT: INTERACTIVE CROP BOX CANVAS STAGE (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between px-1">
              <span>Interactive Crop Mask Canvas</span>
              <span>Drag corners or sliders to select area</span>
            </div>

            {/* Stage Container */}
            <div className="relative border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-950/80 flex items-center justify-center min-h-[320px] max-h-[460px] shadow-inner p-4">
              <div 
                ref={containerRef}
                className="relative select-none max-w-full max-h-[400px] overflow-hidden"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.3s ease-out'
                }}
              >
                {/* Source Image */}
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Source file for cropping"
                  onLoad={handleImageLoad}
                  className={`max-w-full max-h-[380px] object-contain pointer-events-none rounded ${flipH ? 'scale-x-[-1]' : ''} ${flipV ? 'scale-y-[-1]' : ''}`}
                  referrerPolicy="no-referrer"
                />

                {/* Crop Overlay Backdrop (Muted out regions) */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Top Mask */}
                  <div className="absolute bg-black/60 backdrop-blur-[1px]" style={{ top: 0, left: 0, right: 0, height: `${cropY}%` }} />
                  {/* Bottom Mask */}
                  <div className="absolute bg-black/60 backdrop-blur-[1px]" style={{ top: `${cropY + cropH}%`, left: 0, right: 0, bottom: 0 }} />
                  {/* Left Mask */}
                  <div className="absolute bg-black/60 backdrop-blur-[1px]" style={{ top: `${cropY}%`, left: 0, width: `${cropX}%`, height: `${cropH}%` }} />
                  {/* Right Mask */}
                  <div className="absolute bg-black/60 backdrop-blur-[1px]" style={{ top: `${cropY}%`, left: `${cropX + cropW}%`, right: 0, height: `${cropH}%` }} />
                </div>

                {/* Interactive Crop Boundary Box */}
                <div 
                  className="absolute border-2 border-blue-500 shadow-[0_0_0_1px_rgba(255,255,255,0.5)] cursor-move group select-none touch-none"
                  style={{
                    top: `${cropY}%`,
                    left: `${cropX}%`,
                    width: `${cropW}%`,
                    height: `${cropH}%`
                  }}
                  onMouseDown={(e) => startDrag(e, 'move')}
                  onTouchStart={(e) => startDrag(e, 'move')}
                >
                  {/* Rule of Thirds Grid overlay inside crop box */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30 pointer-events-none">
                    <div className="border-r border-b border-dashed border-white" />
                    <div className="border-r border-b border-dashed border-white" />
                    <div className="border-b border-dashed border-white" />
                    <div className="border-r border-b border-dashed border-white" />
                    <div className="border-r border-b border-dashed border-white" />
                    <div className="border-b border-dashed border-white" />
                    <div className="border-r border-dashed border-white" />
                    <div className="border-r border-dashed border-white" />
                    <div />
                  </div>

                  {/* Visual Pixel Indicator */}
                  <div className="absolute top-1 left-1.5 bg-black/75 text-[9px] font-mono text-white px-1.5 py-0.5 rounded font-bold pointer-events-none select-none">
                    {Math.round((cropW / 100) * (rotation === 90 || rotation === 270 ? naturalHeight : naturalWidth))} x {Math.round((cropH / 100) * (rotation === 90 || rotation === 270 ? naturalWidth : naturalHeight))} px
                  </div>

                  {/* Corner Handles */}
                  <div 
                    onMouseDown={(e) => startDrag(e, 'tl')}
                    onTouchStart={(e) => startDrag(e, 'tl')}
                    className="absolute -top-1.5 -left-1.5 h-3.5 w-3.5 bg-white border border-blue-600 rounded-full cursor-nwse-resize shadow-md" 
                  />
                  <div 
                    onMouseDown={(e) => startDrag(e, 'tr')}
                    onTouchStart={(e) => startDrag(e, 'tr')}
                    className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 bg-white border border-blue-600 rounded-full cursor-nesw-resize shadow-md" 
                  />
                  <div 
                    onMouseDown={(e) => startDrag(e, 'bl')}
                    onTouchStart={(e) => startDrag(e, 'bl')}
                    className="absolute -bottom-1.5 -left-1.5 h-3.5 w-3.5 bg-white border border-blue-600 rounded-full cursor-nesw-resize shadow-md" 
                  />
                  <div 
                    onMouseDown={(e) => startDrag(e, 'br')}
                    onTouchStart={(e) => startDrag(e, 'br')}
                    className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 bg-white border border-blue-600 rounded-full cursor-nwse-resize shadow-md" 
                  />

                  {/* Midline Handles */}
                  <div 
                    onMouseDown={(e) => startDrag(e, 't')}
                    onTouchStart={(e) => startDrag(e, 't')}
                    className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-5 bg-white border border-blue-600 rounded-full cursor-ns-resize shadow-sm" 
                  />
                  <div 
                    onMouseDown={(e) => startDrag(e, 'b')}
                    onTouchStart={(e) => startDrag(e, 'b')}
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-5 bg-white border border-blue-600 rounded-full cursor-ns-resize shadow-sm" 
                  />
                  <div 
                    onMouseDown={(e) => startDrag(e, 'l')}
                    onTouchStart={(e) => startDrag(e, 'l')}
                    className="absolute top-1/2 -left-1 -translate-y-1/2 h-5 w-2 bg-white border border-blue-600 rounded-full cursor-ew-resize shadow-sm" 
                  />
                  <div 
                    onMouseDown={(e) => startDrag(e, 'r')}
                    onTouchStart={(e) => startDrag(e, 'r')}
                    className="absolute top-1/2 -right-1 -translate-y-1/2 h-5 w-2 bg-white border border-blue-600 rounded-full cursor-ew-resize shadow-sm" 
                  />
                </div>
              </div>
            </div>

            {/* Quick Rotate & Mirror Operations bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-zinc-900/40 p-3 rounded-xl border border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Orientation:</span>
                <button
                  type="button"
                  onClick={rotateCounterClockwise}
                  className="p-2 bg-white dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl hover:bg-slate-100 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                  title="Rotate Left"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-blue-500" />
                  -90°
                </button>
                <button
                  type="button"
                  onClick={rotateClockwise}
                  className="p-2 bg-white dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl hover:bg-slate-100 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                  title="Rotate Right"
                >
                  <RotateCw className="h-3.5 w-3.5 text-blue-500" />
                  +90°
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Mirror:</span>
                <button
                  type="button"
                  onClick={() => setFlipH(!flipH)}
                  className={`p-2 border rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                    flipH 
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50'
                      : 'bg-white dark:bg-zinc-850 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:bg-slate-50'
                  }`}
                  title="Flip Horizontal"
                >
                  <FlipHorizontal className="h-3.5 w-3.5" />
                  Flip H
                </button>
                <button
                  type="button"
                  onClick={() => setFlipV(!flipV)}
                  className={`p-2 border rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                    flipV 
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50'
                      : 'bg-white dark:bg-zinc-850 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:bg-slate-50'
                  }`}
                  title="Flip Vertical"
                >
                  <FlipVertical className="h-3.5 w-3.5" />
                  Flip V
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: CROP SETTINGS & RATIOS PANEL (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Aspect Ratio Cards */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider">Aspect Ratio Profiles</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'free', label: 'Freeform', desc: 'Any bounding shape' },
                  { id: '1:1', label: '1:1 Square', desc: 'Social Icons/Avatars' },
                  { id: '16:9', label: '16:9 HD', desc: 'Video widescreen' },
                  { id: '4:3', label: '4:3 Standard', desc: 'Presentation frame' },
                  { id: '3:2', label: '3:2 Classic', desc: 'Dslr camera print' },
                  { id: '9:16', label: '9:16 Portrait', desc: 'Vertical Mobile reels' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setAspectRatio(item.id)}
                    className={`p-2.5 border rounded-xl text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                      aspectRatio === item.id 
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/10'
                        : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 text-slate-700 dark:text-zinc-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-extrabold">{item.label}</span>
                    <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-medium truncate leading-tight">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Coordinate Sliders for accessibility and precision */}
            <div className="bg-slate-50/50 dark:bg-zinc-900/20 p-4 rounded-xl border border-slate-100 dark:border-zinc-850 space-y-4">
              <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400">
                <span>Manual Dimension Tuning</span>
                <span className="font-mono text-[10px] text-blue-500 lowercase">percents (%)</span>
              </div>

              {/* Slider set: X and Y offsets */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                    <span>X Offset</span>
                    <span className="font-mono">{cropX}%</span>
                  </div>
                  <input 
                    type="range" 
                    min={0} 
                    max={100 - cropW} 
                    value={cropX} 
                    onChange={(e) => setCropX(Math.max(0, Math.min(100 - cropW, parseInt(e.target.value))))}
                    className="w-full accent-blue-600" 
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                    <span>Y Offset</span>
                    <span className="font-mono">{cropY}%</span>
                  </div>
                  <input 
                    type="range" 
                    min={0} 
                    max={100 - cropH} 
                    value={cropY} 
                    onChange={(e) => setCropY(Math.max(0, Math.min(100 - cropH, parseInt(e.target.value))))}
                    className="w-full accent-blue-600" 
                  />
                </div>
              </div>

              {/* Slider set: Width and Height */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                    <span>Crop Width</span>
                    <span className="font-mono">{cropW}%</span>
                  </div>
                  <input 
                    type="range" 
                    min={5} 
                    max={100 - cropX} 
                    value={cropW} 
                    disabled={aspectRatio !== 'free'}
                    onChange={(e) => setCropW(Math.max(5, Math.min(100 - cropX, parseInt(e.target.value))))}
                    className={`w-full accent-blue-600 ${aspectRatio !== 'free' ? 'opacity-50 cursor-not-allowed' : ''}`} 
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                    <span>Crop Height</span>
                    <span className="font-mono">{cropH}%</span>
                  </div>
                  <input 
                    type="range" 
                    min={5} 
                    max={100 - cropY} 
                    value={cropH} 
                    disabled={aspectRatio !== 'free'}
                    onChange={(e) => setCropH(Math.max(5, Math.min(100 - cropY, parseInt(e.target.value))))}
                    className={`w-full accent-blue-600 ${aspectRatio !== 'free' ? 'opacity-50 cursor-not-allowed' : ''}`} 
                  />
                </div>
              </div>
            </div>

            {/* Export quality and format */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider">Export Format</label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl outline-none focus:border-blue-500 text-xs dark:text-zinc-100 font-semibold"
                >
                  <option value="image/jpeg">JPEG (Compressed)</option>
                  <option value="image/png">PNG (Lossless)</option>
                  <option value="image/webp">WEBP (Web-optimized)</option>
                </select>
              </div>

              {exportFormat !== 'image/png' && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold uppercase text-slate-400 tracking-wider">
                    <span>Quality</span>
                    <span className="font-mono text-[10px] text-blue-500 font-bold">{exportQuality}%</span>
                  </div>
                  <input 
                    type="range" 
                    min={10} 
                    max={100} 
                    value={exportQuality} 
                    onChange={(e) => setExportQuality(parseInt(e.target.value))}
                    className="w-full h-8 accent-blue-600" 
                  />
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="pt-2">
              <button
                onClick={handleCropImage}
                disabled={isProcessing}
                className="w-full py-4 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/25 uppercase tracking-widest"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cropping Image in Browser...
                  </>
                ) : (
                  <>
                    <Crop className="h-4 w-4" />
                    Apply Crop & Process
                  </>
                )}
              </button>
            </div>

            {/* Info card */}
            <div className="border border-slate-100 dark:border-zinc-900 rounded-xl p-3 bg-slate-50/50 dark:bg-zinc-950 flex gap-2 text-[11px] text-slate-400">
              <Maximize className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-bold text-slate-600 dark:text-zinc-300 block">Client-Side High Fidelity Execution</span>
                <span className="leading-normal">All crop rendering, pixel resizing, and color depth matrices are computed using client-side HTML5 2D contexts inside your browser with 100% privacy.</span>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
