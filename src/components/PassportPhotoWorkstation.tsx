import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, Upload, RotateCw, RotateCcw, Image as ImageIcon, Loader2, 
  ArrowLeft, RefreshCw, Check, Maximize, Sliders, Crop, AlertCircle,
  FlipHorizontal, FlipVertical, Grid, Trash2, Printer, Wand2, Paintbrush, 
  Scissors, ZoomIn, ZoomOut, AlertTriangle, Eye, EyeOff, SlidersHorizontal,
  FileText, Split
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface PassportSizePreset {
  id: string;
  name: string;
  country: string;
  widthMm: number;
  heightMm: number;
}

const PASSPORT_SIZES: PassportSizePreset[] = [
  { id: 'us_passport', name: 'US Passport / Visa (2x2 in)', country: 'United States', widthMm: 50.8, heightMm: 50.8 },
  { id: 'in_passport', name: 'Indian Passport (35x45 mm)', country: 'India', widthMm: 35, heightMm: 45 },
  { id: 'uk_passport', name: 'UK Passport (35x45 mm)', country: 'United Kingdom', widthMm: 35, heightMm: 45 },
  { id: 'schengen_passport', name: 'Schengen Passport (35x45 mm)', country: 'Schengen / Europe', widthMm: 35, heightMm: 45 },
  { id: 'ca_passport', name: 'Canada Passport (50x70 mm)', country: 'Canada', widthMm: 50, heightMm: 70 },
  { id: 'ca_visa', name: 'Canada Visa (35x45 mm)', country: 'Canada', widthMm: 35, heightMm: 45 },
  { id: 'au_passport', name: 'Australia Passport (35x45 mm)', country: 'Australia', widthMm: 35, heightMm: 45 },
  { id: 'cn_passport', name: 'China Passport (33x48 mm)', country: 'China', widthMm: 33, heightMm: 48 },
  { id: 'sg_passport', name: 'Singapore Passport (35x45 mm)', country: 'Singapore', widthMm: 35, heightMm: 45 },
  { id: 'uae_passport', name: 'UAE Passport (40x60 mm)', country: 'United Arab Emirates', widthMm: 40, heightMm: 60 },
  { id: 'size_1x1', name: 'Standard 1x1 inch photo', country: 'Global', widthMm: 25.4, heightMm: 25.4 },
  { id: 'size_3x4', name: 'Standard 3x4 cm photo', country: 'Global', widthMm: 30, heightMm: 40 },
  { id: 'size_4x6', name: 'Standard 4x6 cm photo', country: 'Global', widthMm: 40, heightMm: 60 },
];

interface PrintableSheetPreset {
  id: string;
  name: string;
  widthIn: number;
  heightIn: number;
}

const SHEET_SIZES: PrintableSheetPreset[] = [
  { id: 'single', name: 'Single Photo Cut', widthIn: 0, heightIn: 0 },
  { id: 'photo_4x6', name: '4" x 6" Photo Paper', widthIn: 4, heightIn: 6 },
  { id: 'letter', name: 'Letter Size (8.5" x 11")', widthIn: 8.5, heightIn: 11 },
  { id: 'a4', name: 'A4 Paper Sheet (210x297 mm)', widthIn: 8.27, heightIn: 11.69 },
];

interface PassportPhotoWorkstationProps {
  onAddRecentFile: (file: any) => void;
  user: any;
  onBackToTools?: () => void;
}

export default function PassportPhotoWorkstation({ onAddRecentFile, user, onBackToTools }: PassportPhotoWorkstationProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [imageSize, setImageSize] = useState<string>('');
  
  // Image metadata
  const [naturalWidth, setNaturalWidth] = useState<number>(0);
  const [naturalHeight, setNaturalHeight] = useState<number>(0);

  // Active step tabs: 'crop' | 'background' | 'adjust' | 'print'
  const [activeTab, setActiveTab] = useState<'crop' | 'background' | 'adjust' | 'print'>('crop');

  // Dimensions & DPI state
  const [selectedPresetId, setSelectedPresetId] = useState<string>('us_passport');
  const [customWidthMm, setCustomWidthMm] = useState<number>(35);
  const [customHeightMm, setCustomHeightMm] = useState<number>(45);
  const [dpi, setDpi] = useState<number>(300);

  // Crop & Transform state (Relative to the output viewport)
  const [zoom, setZoom] = useState<number>(100); // percentage (50 to 500)
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [offsetX, setOffsetX] = useState<number>(0); // offset pixels
  const [offsetY, setOffsetY] = useState<number>(0); // offset pixels
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  const [showFaceGuide, setShowFaceGuide] = useState<boolean>(true);

  // Background state
  const [bgColor, setBgColor] = useState<string>('#FFFFFF');
  const [bgPresets] = useState<Array<{ name: string; hex: string }>>([
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Light Blue', hex: '#A5C9EB' },
    { name: 'Royal Blue', hex: '#0033A0' },
    { name: 'Visa Red', hex: '#DA291C' },
    { name: 'Light Gray', hex: '#F0F0F0' },
  ]);
  const [customBgHex, setCustomBgHex] = useState<string>('#FFFFFF');
  const [bgType, setBgType] = useState<'color' | 'gradient' | 'image'>('color');
  const [selectedGradient, setSelectedGradient] = useState<string>('blue-sky');
  const [customBgImageSrc, setCustomBgImageSrc] = useState<string | null>(null);
  const [isCompareMode, setIsCompareMode] = useState<boolean>(false);
  const bgImageCache = useRef<HTMLImageElement | null>(null);
  const [bgToolMode, setBgToolMode] = useState<'none' | 'magic' | 'manual_erase' | 'manual_restore'>('magic');
  
  // Background Chroma Eraser variables
  const [magicTolerance, setMagicTolerance] = useState<number>(30);
  const [eraserSize, setEraserSize] = useState<number>(20);
  const [eraserFeather, setEraserFeather] = useState<number>(10);

  // Image editing filters
  const [brightness, setBrightness] = useState<number>(100); // 50 to 150
  const [contrast, setContrast] = useState<number>(100); // 50 to 150
  const [saturation, setSaturation] = useState<number>(100); // 50 to 150
  const [sharpness, setSharpness] = useState<number>(0); // 0 to 100
  const [skinSmoothing, setSkinSmoothing] = useState<number>(0); // 0 to 100

  // Printable sheet presets
  const [selectedSheetId, setSelectedSheetId] = useState<string>('photo_4x6');
  const [sheetCopies, setSheetCopies] = useState<number>(6);
  const [photoBorderWidth, setPhotoBorderWidth] = useState<number>(0);
  const [photoBorderColor, setPhotoBorderColor] = useState<string>('#000000');
  const [sheetPreviewUrl, setSheetPreviewUrl] = useState<string | null>(null);

  // Refs for drawing
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dragging / Panning on main preview
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panOffsetStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Status flags
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  // Check API health on mount
  useEffect(() => {
    const checkApi = async () => {
      try {
        const res = await fetch('/api/health/rembg');
        if (res.ok) {
          const data = await res.json();
          setApiStatus(data.status);
        } else {
          setApiStatus('disconnected');
        }
      } catch (err) {
        setApiStatus('disconnected');
      }
    };
    checkApi();
  }, []);

  // Clean up URL object
  useEffect(() => {
    return () => {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  }, [imageSrc]);

  // Handle uploaded file
  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, WEBP, or HEIC).');
      return;
    }
    setError(null);
    setImageFile(file);
    setImageSize(formatBytes(file.size));
    
    const url = URL.createObjectURL(file);
    setImageSrc(url);

    // Reset default parameters
    setZoom(100);
    setRotation(0);
    setOffsetX(0);
    setOffsetY(0);
    setFlipH(false);
    setFlipV(false);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setSharpness(0);
    setSkinSmoothing(0);
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
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setNaturalWidth(w);
    setNaturalHeight(h);

    // Auto-initialize transparency mask canvas of the same dimensions as the original image
    const mask = maskCanvasRef.current;
    if (mask) {
      mask.width = w;
      mask.height = h;
      const mctx = mask.getContext('2d');
      if (mctx) {
        // Initial state of mask is fully white/opaque (which means keep 100% of image)
        mctx.fillStyle = '#FFFFFF';
        mctx.fillRect(0, 0, w, h);
      }
    }

    // Delay slightly to allow state to settle, then draw
    setTimeout(() => {
      updateMainComposition();
    }, 50);
  };

  // Get current targeted millimeter dimensions
  const getSelectedSizeMm = () => {
    if (selectedPresetId === 'custom') {
      return { w: customWidthMm, h: customHeightMm };
    }
    const preset = PASSPORT_SIZES.find(p => p.id === selectedPresetId);
    return preset ? { w: preset.widthMm, h: preset.heightMm } : { w: 35, h: 45 };
  };

  // Convert size to pixels based on current DPI
  const getSelectedSizePx = () => {
    const mm = getSelectedSizeMm();
    const mmToInch = 25.4;
    const pxW = Math.round((mm.w / mmToInch) * dpi);
    const pxH = Math.round((mm.h / mmToInch) * dpi);
    return { w: pxW, h: pxH };
  };

  // Render/Refresh the main composition on Canvas
  const updateMainComposition = () => {
    const canvas = canvasRef.current;
    const originalImage = originalImageRef.current;
    const maskCanvas = maskCanvasRef.current;

    if (!canvas || !originalImage || originalImage.naturalWidth === 0 || originalImage.naturalHeight === 0) return;

    const sizePx = getSelectedSizePx();
    canvas.width = sizePx.w;
    canvas.height = sizePx.h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas for transparency support
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Helper to get gradient colors
    const getGradientColors = (preset: string) => {
      switch (preset) {
        case 'blue-sky': return ['#E3F2FD', '#90CAF9'];
        case 'sunset': return ['#FFE0B2', '#FFB74D'];
        case 'gray': return ['#ECEFF1', '#B0BEC5'];
        case 'royal-grad': return ['#0D47A1', '#1565C0'];
        case 'dark-slate': return ['#1E293B', '#0F172A'];
        default: return ['#FFFFFF', '#E2E8F0'];
      }
    };

    // 1. Draw Background depending on bgType
    if (bgType === 'color') {
      if (bgColor !== 'transparent') {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    } else if (bgType === 'gradient') {
      const colors = getGradientColors(selectedGradient);
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, colors[0]);
      grad.addColorStop(1, colors[1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (bgType === 'image' && customBgImageSrc) {
      const bgImg = bgImageCache.current;
      if (bgImg && bgImg.src === customBgImageSrc && bgImg.complete) {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
      } else {
        const img = new Image();
        img.src = customBgImageSrc;
        img.onload = () => {
          bgImageCache.current = img;
          updateMainComposition();
        };
      }
    }

    // 2. Prepare temporary canvas to draw the masked source image at original resolution
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = originalImage.naturalWidth;
    tempCanvas.height = originalImage.naturalHeight;
    const tctx = tempCanvas.getContext('2d');
    if (tctx) {
      // Draw original image
      tctx.drawImage(originalImage, 0, 0);

      // Apply the transparency mask
      if (maskCanvas) {
        tctx.globalCompositeOperation = 'destination-in';
        tctx.drawImage(maskCanvas, 0, 0);
        tctx.globalCompositeOperation = 'source-over';
      }
    }

    // 3. Prepare an isolated person canvas layer at target composition resolution
    const personCanvas = document.createElement('canvas');
    personCanvas.width = canvas.width;
    personCanvas.height = canvas.height;
    const pctx = personCanvas.getContext('2d');

    if (pctx) {
      pctx.save();
      
      // Move coordinate space to center of target canvas
      pctx.translate(canvas.width / 2 + offsetX, canvas.height / 2 + offsetY);
      
      // Apply flip
      pctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      
      // Apply rotation
      pctx.rotate((rotation * Math.PI) / 180);

      // Apply zoom & scale centered
      const scaleRatio = Math.max(canvas.width / originalImage.naturalWidth, canvas.height / originalImage.naturalHeight);
      const finalScale = scaleRatio * (zoom / 100);

      const drawW = originalImage.naturalWidth * finalScale;
      const drawH = originalImage.naturalHeight * finalScale;

      // Apply brightness, contrast, saturation filter
      pctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

      // Draw the masked image onto the isolated layer
      pctx.drawImage(tempCanvas, -drawW / 2, -drawH / 2, drawW, drawH);
      pctx.restore();

      // 4. Apply post-processing filters (Sharpness & Skin Smoothing) to the person layer ONLY
      if (sharpness > 0 || skinSmoothing > 0) {
        const imgData = pctx.getImageData(0, 0, personCanvas.width, personCanvas.height);
        applyFilters(imgData, sharpness, skinSmoothing);
        pctx.putImageData(imgData, 0, 0);
      }
    }

    // 5. Composite the isolated person layer onto the solid background
    ctx.drawImage(personCanvas, 0, 0);

    // 6. Draw photo border if specified
    if (photoBorderWidth > 0) {
      ctx.lineWidth = photoBorderWidth;
      ctx.strokeStyle = photoBorderColor;
      // Draw inner stroke to avoid clipping
      ctx.strokeRect(photoBorderWidth / 2, photoBorderWidth / 2, canvas.width - photoBorderWidth, canvas.height - photoBorderWidth);
    }
  };

  // Re-run composition rendering when parameters shift
  useEffect(() => {
    if (imageSrc) {
      updateMainComposition();
    }
  }, [
    imageSrc, selectedPresetId, customWidthMm, customHeightMm, dpi, 
    zoom, rotation, offsetX, offsetY, flipH, flipV, bgColor, bgType,
    selectedGradient, customBgImageSrc,
    brightness, contrast, saturation, sharpness, skinSmoothing,
    naturalWidth, naturalHeight, photoBorderWidth, photoBorderColor
  ]);

  // Apply convolution filters for Sharpness & selective blur for Skin Smoothing
  const applyFilters = (imgData: ImageData, sharpVal: number, smoothVal: number) => {
    const data = imgData.data;
    const w = imgData.width;
    const h = imgData.height;

    // Temporary storage for convolution
    if (sharpVal > 0) {
      const original = new Uint8ClampedArray(data);
      const k = sharpVal / 100;
      // Sharpen Laplace kernel
      const kernel = [
        0, -k, 0,
        -k, 1 + 4 * k, -k,
        0, -k, 0
      ];

      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = (y * w + x) * 4;
          // Skip completely transparent pixels
          if (original[idx + 3] === 0) continue;

          let r = 0, g = 0, b = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const pixelIdx = ((y + ky) * w + (x + kx)) * 4;
              const weight = kernel[(ky + 1) * 3 + (kx + 1)];
              r += original[pixelIdx] * weight;
              g += original[pixelIdx + 1] * weight;
              b += original[pixelIdx + 2] * weight;
            }
          }
          data[idx] = Math.max(0, Math.min(255, r));
          data[idx + 1] = Math.max(0, Math.min(255, g));
          data[idx + 2] = Math.max(0, Math.min(255, b));
        }
      }
    }

    if (smoothVal > 0) {
      const original = new Uint8ClampedArray(data);
      const radius = Math.max(1, Math.round((smoothVal / 100) * 3));
      const threshold = 25; // threshold to prevent blurring high contrast edges (eyes/brows)

      for (let y = radius; y < h - radius; y++) {
        for (let x = radius; x < w - radius; x++) {
          const idx = (y * w + x) * 4;
          // Skip completely transparent pixels
          if (original[idx + 3] === 0) continue;

          const targetR = original[idx];
          const targetG = original[idx + 1];
          const targetB = original[idx + 2];

          let rSum = 0, gSum = 0, bSum = 0, count = 0;

          // Selective blur neighborhood
          for (let ky = -radius; ky <= radius; ky++) {
            for (let kx = -radius; kx <= radius; kx++) {
              const pixelIdx = ((y + ky) * w + (x + kx)) * 4;
              const r = original[pixelIdx];
              const g = original[pixelIdx + 1];
              const b = original[pixelIdx + 2];

              // Color difference threshold
              const diff = Math.sqrt(
                Math.pow(r - targetR, 2) + 
                Math.pow(g - targetG, 2) + 
                Math.pow(b - targetB, 2)
              );

              if (diff < threshold) {
                rSum += r;
                gSum += g;
                bSum += b;
                count++;
              }
            }
          }

          if (count > 0) {
            data[idx] = rSum / count;
            data[idx + 1] = gSum / count;
            data[idx + 2] = bSum / count;
          }
        }
      }
    }
  };

  // Magic Wand background color remover
  const applyMagicWand = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const originalImage = originalImageRef.current;
    const mask = maskCanvasRef.current;

    if (!canvas || !originalImage || !mask) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    // Map clicked point back to original image space
    // Let's do a fast direct chroma background sampling instead:
    // Sample the clicked pixel color in composition canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const clickedData = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    const clickR = clickedData[0];
    const clickG = clickedData[1];
    const clickB = clickedData[2];

    // Read mask pixels and edit original image coordinates
    const mctx = mask.getContext('2d');
    if (!mctx) return;

    const originalCanvas = document.createElement('canvas');
    originalCanvas.width = originalImage.naturalWidth;
    originalCanvas.height = originalImage.naturalHeight;
    const octx = originalCanvas.getContext('2d');
    if (!octx) return;
    octx.drawImage(originalImage, 0, 0);

    const origData = octx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
    const maskData = mctx.getImageData(0, 0, mask.width, mask.height);

    const origPixels = origData.data;
    const maskPixels = maskData.data;

    // Apply color difference keying
    for (let i = 0; i < origPixels.length; i += 4) {
      const r = origPixels[i];
      const g = origPixels[i + 1];
      const b = origPixels[i + 2];

      const diff = Math.sqrt(
        Math.pow(r - clickR, 2) + 
        Math.pow(g - clickG, 2) + 
        Math.pow(b - clickB, 2)
      );

      if (diff < magicTolerance) {
        maskPixels[i + 3] = 0; // Make transparent
      }
    }

    mctx.putImageData(maskData, 0, 0);
    updateMainComposition();
  };

  // AI-powered background remover using rembg (U²-Net) via the backend API
  const handleAutoEraseBackground = async () => {
    const originalImage = originalImageRef.current;
    const mask = maskCanvasRef.current;
    if (!originalImage || !mask) return;

    setIsProcessing(true);
    setError(null);

    try {
      // 1. Convert original image to base64 at high resolution
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = originalImage.naturalWidth;
      tempCanvas.height = originalImage.naturalHeight;
      const tctx = tempCanvas.getContext('2d');
      if (!tctx) throw new Error('Could not initialize canvas context.');
      tctx.drawImage(originalImage, 0, 0);
      const base64Str = tempCanvas.toDataURL('image/png');

      // 2. Call server-side rembg API
      const response = await fetch('/api/ai/remove-bg', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageBase64: base64Str }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to remove background.');
      }

      const data = await response.json();
      if (!data.success || !data.imageBase64) {
        throw new Error('Invalid response from background removal service.');
      }

      // 3. Load processed transparent PNG image
      const processedImg = new Image();
      processedImg.src = data.imageBase64;
      await new Promise<void>((resolve, reject) => {
        processedImg.onload = () => resolve();
        processedImg.onerror = () => reject(new Error('Failed to load transparent PNG.'));
      });

      // 4. Update the mask canvas with the new transparent PNG alpha channel
      const mctx = mask.getContext('2d');
      if (!mctx) throw new Error('Could not access mask canvas context.');

      // Clear mask canvas
      mctx.clearRect(0, 0, mask.width, mask.height);
      // Draw the transparent PNG onto it. This updates the mask canvas with the exact transparency profile
      mctx.drawImage(processedImg, 0, 0, mask.width, mask.height);

      updateMainComposition();
    } catch (err: any) {
      console.error('AI Background Removal error:', err);
      setError(err.message || 'AI background removal failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset manual masking paths
  const handleResetMask = () => {
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const mctx = mask.getContext('2d');
    if (!mctx) return;
    mctx.fillStyle = '#FFFFFF';
    mctx.fillRect(0, 0, mask.width, mask.height);
    updateMainComposition();
  };

  // Drag-panning operations on Composition Canvas
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (bgToolMode !== 'none') {
      if (bgToolMode === 'magic') {
        applyMagicWand(e.clientX, e.clientY);
      }
      return;
    }

    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY };
    panOffsetStart.current = { x: offsetX, y: offsetY };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setOffsetX(panOffsetStart.current.x + dx);
    setOffsetY(panOffsetStart.current.y + dy);
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
  };

  // Brush drawing on original image mask (for erase / restore)
  const handleBrushStroke = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (bgToolMode !== 'manual_erase' && bgToolMode !== 'manual_restore') return;
    if (e.buttons !== 1) return; // Only trigger if mouse button is down

    const canvas = canvasRef.current;
    const originalImage = originalImageRef.current;
    const mask = maskCanvasRef.current;

    if (!canvas || !originalImage || !mask) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // Convert composition coordinates to original image coordinates
    // composition has canvas.width x canvas.height
    // Image was translated by canvas.width/2 + offsetX, canvas.height/2 + offsetY
    // rotated by rotation, flipped, scaled by finalScale
    const mctx = mask.getContext('2d');
    if (!mctx) return;

    // Let's implement drawing directly onto the mask using original coordinates.
    // To make it easy and accurate for the user, we can calculate coordinates on original image:
    const scaleRatio = Math.max(canvas.width / originalImage.naturalWidth, canvas.height / originalImage.naturalHeight);
    const finalScale = scaleRatio * (zoom / 100);

    // Coordinate translation math
    let origX = (x - (canvas.width / 2 + offsetX)) / finalScale + originalImage.naturalWidth / 2;
    let origY = (y - (canvas.height / 2 + offsetY)) / finalScale + originalImage.naturalHeight / 2;

    // Basic rotation adjustments
    if (rotation === 90) {
      const rx = origX - originalImage.naturalWidth / 2;
      const ry = origY - originalImage.naturalHeight / 2;
      origX = originalImage.naturalWidth / 2 + ry;
      origY = originalImage.naturalHeight / 2 - rx;
    } else if (rotation === 180) {
      origX = originalImage.naturalWidth - origX;
      origY = originalImage.naturalHeight - origY;
    } else if (rotation === 270) {
      const rx = origX - originalImage.naturalWidth / 2;
      const ry = origY - originalImage.naturalHeight / 2;
      origX = originalImage.naturalWidth / 2 - ry;
      origY = originalImage.naturalHeight / 2 + rx;
    }

    mctx.save();
    
    // Create soft brush gradient based on feather
    const grad = mctx.createRadialGradient(origX, origY, eraserSize * (1 - eraserFeather / 100), origX, origY, eraserSize);
    
    if (bgToolMode === 'manual_erase') {
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      mctx.globalCompositeOperation = 'destination-out';
    } else {
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      mctx.globalCompositeOperation = 'source-over';
    }

    mctx.fillStyle = grad;
    mctx.beginPath();
    mctx.arc(origX, origY, eraserSize, 0, Math.PI * 2);
    mctx.fill();
    mctx.restore();

    updateMainComposition();
  };

  // Perform Auto Contrast & Tone Enhancements
  const handleAutoEnhance = () => {
    // Standard photo optimization tweaks
    setBrightness(105);
    setContrast(112);
    setSaturation(106);
    setSharpness(35);
    setSkinSmoothing(25);
  };

  // Multi-copy layout helper
  const getSheetLayoutSpecs = () => {
    const sheet = SHEET_SIZES.find(s => s.id === selectedSheetId);
    if (!sheet || sheet.id === 'single') {
      return { widthPx: 0, heightPx: 0, maxCols: 1, maxRows: 1, sheetW: 0, sheetH: 0 };
    }

    const mmToInch = 25.4;
    // Calculate total pixel dimensions of the sheet paper at chosen DPI
    const widthPx = Math.round(sheet.widthIn * dpi);
    const heightPx = Math.round(sheet.heightIn * dpi);

    return { widthPx, heightPx, sheetW: sheet.widthIn * mmToInch, sheetH: sheet.heightIn * mmToInch };
  };

  // Generate the compiled printable sheet Canvas
  const generatePrintSheetCanvas = (): HTMLCanvasElement | null => {
    const mainCanvas = canvasRef.current;
    if (!mainCanvas) return null;

    const specs = getSheetLayoutSpecs();
    if (specs.widthPx === 0) {
      // Return single cropped photo canvas
      return mainCanvas;
    }

    const sheetCanvas = document.createElement('canvas');
    sheetCanvas.width = specs.widthPx;
    sheetCanvas.height = specs.heightPx;

    const ctx = sheetCanvas.getContext('2d');
    if (!ctx) return null;

    // Fill white backing sheet
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height);

    // Margins (approx 0.5 inch margins = 12.7mm)
    const marginPx = 0.5 * dpi;
    const availableWPx = sheetCanvas.width - 2 * marginPx;
    const availableHPx = sheetCanvas.height - 2 * marginPx;

    const passportSizePx = getSelectedSizePx();
    const photoWPx = passportSizePx.w;
    const photoHPx = passportSizePx.h;

    // Gap between photos (approx 4mm = 0.15 inch)
    const gapPx = Math.round(0.12 * dpi);

    // Max columns & rows that can fit
    const cols = Math.floor((availableWPx + gapPx) / (photoWPx + gapPx));
    const rows = Math.floor((availableHPx + gapPx) / (photoHPx + gapPx));

    const totalPossible = cols * rows;
    const drawCount = Math.min(sheetCopies, totalPossible);

    // Render copies centered on sheet
    const contentWPx = cols * photoWPx + (cols - 1) * gapPx;
    const contentHPx = Math.ceil(drawCount / cols) * photoHPx + (Math.ceil(drawCount / cols) - 1) * gapPx;

    const startXPx = marginPx + (availableWPx - contentWPx) / 2;
    const startYPx = marginPx + (availableHPx - contentHPx) / 2;

    for (let i = 0; i < drawCount; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);

      const dx = startXPx + col * (photoWPx + gapPx);
      const dy = startYPx + row * (photoHPx + gapPx);

      // Draw the composed passport photo
      ctx.drawImage(mainCanvas, dx, dy, photoWPx, photoHPx);

      // Draw thin dashed cutting border guidelines
      ctx.save();
      ctx.strokeStyle = '#D1D5DB';
      ctx.lineWidth = Math.max(1, Math.round(dpi / 300));
      ctx.setLineDash([Math.round(dpi / 60), Math.round(dpi / 60)]);
      ctx.strokeRect(dx, dy, photoWPx, photoHPx);
      ctx.restore();
    }

    return sheetCanvas;
  };

  // Generate a live preview URL for the sheet layout
  useEffect(() => {
    if (activeTab !== 'print' || selectedSheetId === 'single' || !imageSrc) {
      setSheetPreviewUrl(null);
      return;
    }
    const timer = setTimeout(() => {
      const sheetCanvas = generatePrintSheetCanvas();
      if (sheetCanvas) {
        setSheetPreviewUrl(sheetCanvas.toDataURL('image/png'));
      }
    }, 100); // Debounce to prevent blocking the UI
    return () => clearTimeout(timer);
  }, [
    activeTab, selectedSheetId, sheetCopies, imageSrc, selectedPresetId,
    customWidthMm, customHeightMm, dpi, zoom, rotation, offsetX, offsetY,
    flipH, flipV, bgColor, bgType, selectedGradient, customBgImageSrc,
    brightness, contrast, saturation, sharpness, skinSmoothing, photoBorderWidth, photoBorderColor
  ]);

  // Browser Direct Printing Handler
  const handlePrint = () => {
    const sheetCanvas = generatePrintSheetCanvas();
    if (!sheetCanvas) return;

    const dataUrl = sheetCanvas.toDataURL('image/png');
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked. Please allow popups to print.');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Passport Photos</title>
          <style>
            @page {
              size: auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              background-color: #FFFFFF;
            }
            img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }
          </style>
        </head>
        <body>
          <img loading="lazy" src="${dataUrl}" onload="window.print(); window.close();" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // High-Res File Downloads
  const handleDownload = async (format: 'png' | 'jpeg' | 'pdf', downloadSheet: boolean) => {
    setIsProcessing(true);
    try {
      const canvas = downloadSheet ? generatePrintSheetCanvas() : canvasRef.current;
      if (!canvas) throw new Error('Canvas rendering error.');

      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const fileExt = format === 'pdf' ? 'pdf' : format;
      const fileName = `passport_photo_${Date.now()}.${fileExt}`;

      if (format === 'pdf') {
        // Build PDF document using pdf-lib
        const pdfDoc = await PDFDocument.create();
        const imgDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const imgBytes = await fetch(imgDataUrl).then((res) => res.arrayBuffer());

        // Embed image based on format
        const embeddedImg = await pdfDoc.embedJpg(imgBytes);
        
        // Setup PDF page dimension to match sheet dimensions exactly
        let pageW = canvas.width;
        let pageH = canvas.height;

        // Normalize page size using standard points (1 inch = 72 points)
        if (downloadSheet) {
          const sheet = SHEET_SIZES.find(s => s.id === selectedSheetId);
          if (sheet && sheet.id !== 'single') {
            pageW = sheet.widthIn * 72;
            pageH = sheet.heightIn * 72;
          }
        } else {
          const mmSize = getSelectedSizeMm();
          pageW = (mmSize.w / 25.4) * 72;
          pageH = (mmSize.h / 25.4) * 72;
        }

        const page = pdfDoc.addPage([pageW, pageH]);
        page.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: pageW,
          height: pageH,
        });

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        triggerDownload(blob, fileName);
      } else {
        // Download as image
        const dataUrl = canvas.toDataURL(mimeType, 0.95);
        const blob = await fetch(dataUrl).then((res) => res.blob());
        triggerDownload(blob, fileName);
      }

      // Add to recent files
      onAddRecentFile({
        name: fileName,
        size: formatBytes(canvas.toDataURL().length * 0.75),
        type: format.toUpperCase(),
        toolUsed: 'Passport Photo Maker'
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred during export.');
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerDownload = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    if (a.parentNode) {
      a.parentNode.removeChild(a);
    }
    URL.revokeObjectURL(url);
  };

  const handleClearImage = () => {
    setImageFile(null);
    setImageSrc('');
    setNaturalWidth(0);
    setNaturalHeight(0);
    setError(null);
  };

  return (
    <div id="passport-photo-workstation" className="space-y-6">
      
      {/* Top Banner Context Info */}
      <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-xl">
            <ImageIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-zinc-200">
              Passport Size Photo Maker
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Fully compliant automated cropping, background coloring, skin polishing, and multi-photo templates.
            </p>
          </div>
        </div>

        {imageFile && (
          <button
            onClick={handleClearImage}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-zinc-800 hover:border-rose-500/30 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear Current Image
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/15 border border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Main Panel Layout */}
      {!imageFile ? (
        // Drag and Drop Upload State
        <div 
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDrop(e);
          }}
          className="border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-3xl p-16 text-center bg-slate-50/50 dark:bg-zinc-900/10 hover:border-blue-500 hover:bg-slate-50/10 transition-all cursor-pointer relative space-y-4 shadow-sm"
        >
          <input
            type="file"
            accept="image/png, image/jpeg, image/jpg, image/webp"
            onChange={(e) => {
              onFileSelect(e);
              e.target.value = '';
            }}
            className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
          />
          <div className="h-16 w-16 bg-blue-500/10 dark:bg-blue-500/5 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Upload className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-800 dark:text-zinc-200">
              Drag & Drop Your Portrait Photo here
            </p>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Supports JPEG, PNG, WEBP and JPG file structures up to 25MB
            </p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md cursor-pointer inline-flex items-center gap-1.5 transition-transform hover:-translate-y-0.5 active:translate-y-0">
            <Upload className="h-3.5 w-3.5" />
            Select File manually
          </button>
        </div>
      ) : (
        // Editing Mode Active Workspace
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Visual composition canvas workbench */}
          <div className="lg:col-span-7 bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-900 p-4 sm:p-6 shadow-md space-y-5">
            
            {/* Hidden Source elements */}
            <img loading="lazy" 
              ref={originalImageRef}
              src={imageSrc} 
              alt="Source" 
              className="hidden" 
              onLoad={handleImageLoad}
              crossOrigin="anonymous"
            />
            <canvas ref={maskCanvasRef} className="hidden" />

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-mono text-slate-400 dark:text-zinc-500">
                Resolution: {naturalWidth} × {naturalHeight} px | Size: {imageSize}
              </span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsCompareMode(!isCompareMode)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    isCompareMode 
                      ? 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-900/30' 
                      : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800'
                  }`}
                >
                  <Split className="h-3.5 w-3.5" />
                  {isCompareMode ? 'Exit Compare' : 'Before/After Compare'}
                </button>
                <button 
                  onClick={() => setShowFaceGuide(!showFaceGuide)}
                  disabled={isCompareMode}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer disabled:opacity-50 ${
                    showFaceGuide 
                      ? 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900/30' 
                      : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800'
                  }`}
                >
                  {showFaceGuide ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  Face Outline Guide
                </button>
              </div>
            </div>

            {/* Interactive Drawing Frame Container */}
            <div className={`relative border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-slate-900 flex justify-center items-center h-[400px] shadow-inner select-none ${isCompareMode ? 'p-4 gap-4 grid grid-cols-2' : 'p-8'}`}>
              
              {isCompareMode ? (
                <>
                  {/* Left Column: BEFORE (Original) */}
                  <div className="flex flex-col items-center justify-center relative bg-slate-950 rounded-lg p-2 overflow-hidden border border-white/5 h-full">
                    <span className="absolute top-2 left-2 bg-black/75 text-white text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded z-10 border border-white/10 shadow-lg">
                      Before (Original)
                    </span>
                    <img loading="lazy" 
                      src={imageSrc} 
                      className="max-w-full max-h-full object-contain rounded"
                      alt="Original"
                    />
                  </div>

                  {/* Right Column: AFTER (Processed) */}
                  <div className="flex flex-col items-center justify-center relative bg-slate-950 rounded-lg p-2 overflow-hidden border border-white/5 h-full">
                    <span className="absolute top-2 left-2 bg-blue-600/95 text-white text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded z-10 border border-blue-500/30 shadow-lg font-bold">
                      After (AI Rembg)
                    </span>
                    <canvas
                      ref={canvasRef}
                      onMouseDown={handleCanvasMouseDown}
                      onMouseMove={bgToolMode === 'none' ? handleCanvasMouseMove : handleBrushStroke}
                      onMouseUp={handleCanvasMouseUp}
                      onMouseLeave={handleCanvasMouseUp}
                      className={`max-w-full max-h-full object-contain rounded-sm shadow-md cursor-grab active:cursor-grabbing border border-white/10 ${
                        bgToolMode === 'magic' ? 'cursor-cell' : 
                        bgToolMode === 'manual_erase' || bgToolMode === 'manual_restore' ? 'cursor-crosshair' : ''
                      }`}
                      style={{
                        width: 'auto',
                        height: '100%',
                      }}
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Main composition drawing canvas */}
                  <canvas
                    ref={canvasRef}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={bgToolMode === 'none' ? handleCanvasMouseMove : handleBrushStroke}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                    className={`max-w-full max-h-full object-contain rounded-sm shadow-md cursor-grab active:cursor-grabbing border border-white/10 ${
                      bgToolMode === 'magic' ? 'cursor-cell' : 
                      bgToolMode === 'manual_erase' || bgToolMode === 'manual_restore' ? 'cursor-crosshair' : ''
                    } ${activeTab === 'print' && selectedSheetId !== 'single' ? 'opacity-0 absolute pointer-events-none' : 'opacity-100'}`}
                    style={{
                      width: 'auto',
                      height: '100%',
                    }}
                  />

                  {/* Print Sheet Preview */}
                  {activeTab === 'print' && selectedSheetId !== 'single' && sheetPreviewUrl && (
                    <img loading="lazy" 
                      src={sheetPreviewUrl} 
                      className="max-w-full max-h-full object-contain shadow-lg animate-fadeIn border border-slate-300 bg-white p-2" 
                      alt="Sheet Preview" 
                    />
                  )}

                  {/* Adjustable Oval Face Centering Guide Lines */}
                  {showFaceGuide && (activeTab !== 'print' || selectedSheetId === 'single') && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                      <div className="w-[180px] h-[240px] border-2 border-dashed border-yellow-400/85 rounded-[50%] flex items-center justify-center relative shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                        
                        {/* Crown boundary guide line */}
                        <div className="absolute top-[10%] left-0 right-0 border-t border-dotted border-yellow-400/80 text-[8px] text-center text-yellow-300 font-bold bg-slate-950/40 py-0.5">
                          TOP OF HAIR
                        </div>

                        {/* Eye line center guide */}
                        <div className="absolute top-[42%] left-0 right-0 border-t border-dotted border-yellow-400/60 flex justify-between px-2 text-[7px] text-yellow-300 font-bold">
                          <span>EYE LINE</span>
                          <span>EYE LINE</span>
                        </div>

                        {/* Chin alignment line */}
                        <div className="absolute bottom-[20%] left-0 right-0 border-t border-dotted border-yellow-400/80 text-[8px] text-center text-yellow-300 font-bold bg-slate-950/40 py-0.5">
                          CHIN BOTTOM
                        </div>

                        {/* Left & Right centering indicators */}
                        <div className="absolute top-1/2 left-0 w-3 h-0.5 bg-yellow-400/80"></div>
                        <div className="absolute top-1/2 right-0 w-3 h-0.5 bg-yellow-400/80"></div>
                      </div>
                      
                      {/* Shoulder layout references */}
                      <div className="w-[280px] h-20 border-t-2 border-dashed border-yellow-400/75 rounded-t-[40px] mt-2"></div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Quick alignment navigation actions bar */}
            <div className="bg-slate-50 dark:bg-zinc-900/40 border border-slate-100 dark:border-zinc-850 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Zoom:</span>
                <button 
                  onClick={() => setZoom(Math.max(50, zoom - 5))}
                  className="p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 cursor-pointer"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <input 
                  type="range" 
                  min="50" 
                  max="400" 
                  value={zoom} 
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-24 accent-blue-600 h-1 bg-slate-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
                />
                <button 
                  onClick={() => setZoom(Math.min(400, zoom + 5))}
                  className="p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 cursor-pointer"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <span className="text-xs font-mono font-bold text-slate-500 w-10 text-right">{zoom}%</span>
              </div>

              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setRotation((prev) => (prev - 90 + 360) % 360)}
                  title="Rotate Left"
                  className="p-2 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button 
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  title="Rotate Right"
                  className="p-2 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 cursor-pointer"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </button>
                <button 
                  onClick={() => setFlipH(!flipH)}
                  title="Flip Horizontally"
                  className={`p-2 rounded-lg border cursor-pointer ${
                    flipH 
                      ? 'bg-blue-500/10 border-blue-300 text-blue-600' 
                      : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50'
                  }`}
                >
                  <FlipHorizontal className="h-3.5 w-3.5" />
                </button>
                <button 
                  onClick={() => setFlipV(!flipV)}
                  title="Flip Vertically"
                  className={`p-2 rounded-lg border cursor-pointer ${
                    flipV 
                      ? 'bg-blue-500/10 border-blue-300 text-blue-600' 
                      : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50'
                  }`}
                >
                  <FlipVertical className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => {
                    setZoom(100);
                    setRotation(0);
                    setOffsetX(0);
                    setOffsetY(0);
                    setFlipH(false);
                    setFlipV(false);
                  }}
                  title="Reset Position & Rotation"
                  className="p-2 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-slate-800 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg cursor-pointer transition-colors"
                >
                  Reset Layout
                </button>
              </div>
            </div>

            {/* Hint for dragging */}
            <p className="text-[10px] text-center text-slate-400 dark:text-zinc-500 italic">
              Tip: Drag inside the black box directly to pan/align the photo with the guide lines.
            </p>

            {/* Real-Time Background Preview & Cutout Verification Component */}
            <div className="bg-slate-50 dark:bg-zinc-900/30 border border-slate-100 dark:border-zinc-850 p-4 rounded-xl space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Paintbrush className="h-4 w-4 text-blue-500" />
                  Real-Time Background Preview & Cutout Verification
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold tracking-wide">
                  Instant Test
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-normal">
                Toggle background colors instantly to inspect edge cutout quality. Switching to high-contrast colors like Red or Black helps you easily spot halos or raw edges!
              </p>
              
              {/* Solid Preset Toggles (White, Blue, Red, Soft Blue, Light Gray, Contrast Black) */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { name: 'White', hex: '#FFFFFF' },
                  { name: 'Blue', hex: '#0033A0' },
                  { name: 'Red', hex: '#DA291C' },
                  { name: 'Light Blue', hex: '#A5C9EB' },
                  { name: 'Light Gray', hex: '#F0F0F0' },
                  { name: 'Contrast Black', hex: '#000000' }
                ].map((preset) => {
                  const isActive = bgColor.toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      key={preset.hex}
                      onClick={() => {
                        setBgColor(preset.hex);
                        setCustomBgHex(preset.hex);
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                        isActive
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'bg-white dark:bg-zinc-850 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <span 
                        className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-sm inline-block"
                        style={{ backgroundColor: preset.hex }}
                      />
                      <span>{preset.name}</span>
                      {isActive && <Check className="h-3 w-3 ml-0.5" />}
                    </button>
                  );
                })}
              </div>

              {/* Custom Color Input for Real-Time Validation */}
              <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800/60">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                    Custom Color:
                  </span>
                  <div className="relative flex items-center gap-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1 flex-1">
                    <input
                      type="color"
                      value={customBgHex}
                      onChange={(e) => {
                        setCustomBgHex(e.target.value);
                        setBgColor(e.target.value);
                      }}
                      className="w-6 h-6 rounded cursor-pointer border border-slate-200"
                    />
                    <input
                      type="text"
                      value={customBgHex.toUpperCase()}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.startsWith('#') && val.length <= 7) {
                          setCustomBgHex(val);
                          if (val.length === 7) {
                            setBgColor(val);
                          }
                        }
                      }}
                      placeholder="#FFFFFF"
                      className="bg-transparent text-xs font-mono font-bold text-slate-700 dark:text-zinc-200 outline-none w-20 uppercase"
                    />
                  </div>
                </div>
                
                <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-zinc-500 bg-slate-100 dark:bg-zinc-900 px-2 py-1 rounded">
                  {bgColor.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Studio Edit Sidebar Controls */}
          <div className="lg:col-span-5 bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-900 shadow-md overflow-hidden">
            
            {/* Sidebar navigation steps */}
            <div className="flex border-b border-slate-150 dark:border-zinc-900 bg-slate-50/50 dark:bg-zinc-900/30">
              <button
                onClick={() => { setActiveTab('crop'); setBgToolMode('none'); }}
                className={`flex-1 py-3 text-center text-[11px] font-bold tracking-wider uppercase border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'crop'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                1. Size
              </button>
              <button
                onClick={() => { setActiveTab('background'); setBgToolMode('magic'); }}
                className={`flex-1 py-3 text-center text-[11px] font-bold tracking-wider uppercase border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'background'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                2. Eraser
              </button>
              <button
                onClick={() => { setActiveTab('adjust'); setBgToolMode('none'); }}
                className={`flex-1 py-3 text-center text-[11px] font-bold tracking-wider uppercase border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'adjust'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                3. Filters
              </button>
              <button
                onClick={() => { setActiveTab('print'); setBgToolMode('none'); }}
                className={`flex-1 py-3 text-center text-[11px] font-bold tracking-wider uppercase border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'print'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                4. Layout
              </button>
            </div>

            {/* Active editing body sections */}
            <div className="p-5 sm:p-6 space-y-6 max-h-[550px] overflow-y-auto">
              
              {/* TAB 1: Cropping, Dimension Presets, & DPI */}
              {activeTab === 'crop' && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      Standard Size / Country Preset
                    </label>
                    <select
                      value={selectedPresetId}
                      onChange={(e) => setSelectedPresetId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-zinc-200 outline-none"
                    >
                      {PASSPORT_SIZES.map((size) => (
                        <option key={size.id} value={size.id}>
                          [{size.country}] {size.name} ({size.widthMm}x{size.heightMm} mm)
                        </option>
                      ))}
                      <option value="custom">Custom Dimensions...</option>
                    </select>
                  </div>

                  {/* Custom sizes controls */}
                  {selectedPresetId === 'custom' && (
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-zinc-900/55 p-3 rounded-xl border border-slate-150 dark:border-zinc-850 animate-fadeIn">
                      <div>
                        <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          Width (mm)
                        </label>
                        <input
                          type="number"
                          value={customWidthMm}
                          onChange={(e) => setCustomWidthMm(Math.max(10, Number(e.target.value)))}
                          className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-200 outline-none mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          Height (mm)
                        </label>
                        <input
                          type="number"
                          value={customHeightMm}
                          onChange={(e) => setCustomHeightMm(Math.max(10, Number(e.target.value)))}
                          className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-200 outline-none mt-1"
                        />
                      </div>
                    </div>
                  )}

                  {/* DPI Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      Output Resolution (DPI)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setDpi(300)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                          dpi === 300
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/15'
                            : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-350'
                        }`}
                      >
                        300 DPI (Standard Print)
                      </button>
                      <button
                        onClick={() => setDpi(600)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                          dpi === 600
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/15'
                            : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-350'
                        }`}
                      >
                        600 DPI (Ultra Clear)
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                      Standard passport images are printed at 300 DPI. For high density photoprint systems, select 600 DPI.
                    </p>
                  </div>

                  {/* Frame specifications details */}
                  <div className="bg-slate-50 dark:bg-zinc-900 p-4 rounded-2xl border border-slate-100 dark:border-zinc-850 space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <SlidersHorizontal className="h-4 w-4 text-blue-500" />
                      Active Canvas Output:
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                      <div>Width: <span className="font-bold text-slate-800 dark:text-zinc-200">{getSelectedSizeMm().w} mm</span></div>
                      <div>Height: <span className="font-bold text-slate-800 dark:text-zinc-200">{getSelectedSizeMm().h} mm</span></div>
                      <div>Pixel W: <span className="font-bold text-slate-800 dark:text-zinc-200">{getSelectedSizePx().w} px</span></div>
                      <div>Pixel H: <span className="font-bold text-slate-800 dark:text-zinc-200">{getSelectedSizePx().h} px</span></div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Intelligent Background Remover & Colors */}
              {activeTab === 'background' && (
                <div className="space-y-6">
                  
                  {/* Chroma Background Removers tools */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <Wand2 className="h-4 w-4 text-purple-500" />
                        AI & Chroma Erasers
                      </label>
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          {apiStatus === 'checking' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>}
                          {apiStatus === 'connected' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${
                            apiStatus === 'checking' ? 'bg-amber-500' :
                            apiStatus === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}></span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {apiStatus === 'checking' ? 'Connecting...' :
                           apiStatus === 'connected' ? 'AI Ready' : 'AI Offline'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleAutoEraseBackground}
                        disabled={apiStatus !== 'connected'}
                        className="py-2.5 px-3 rounded-xl border border-slate-200 bg-gradient-to-tr from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 dark:border-zinc-800 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:from-indigo-100/50 hover:to-purple-100/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                        {isProcessing ? 'Processing...' : 'Auto background'}
                      </button>
                      <button
                        onClick={handleResetMask}
                        className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Restore Original
                      </button>
                    </div>
                  </div>

                  {/* Active background brush mode selection */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      Eraser Brush Toolkit
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setBgToolMode('magic')}
                        className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-all text-center flex flex-col items-center gap-1 ${
                          bgToolMode === 'magic'
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                            : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50'
                        }`}
                      >
                        <Wand2 className="h-3.5 w-3.5" />
                        Magic Wand
                      </button>
                      <button
                        onClick={() => setBgToolMode('manual_erase')}
                        className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-all text-center flex flex-col items-center gap-1 ${
                          bgToolMode === 'manual_erase'
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                            : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50'
                        }`}
                      >
                        <Paintbrush className="h-3.5 w-3.5" />
                        Erase Brush
                      </button>
                      <button
                        onClick={() => setBgToolMode('manual_restore')}
                        className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-all text-center flex flex-col items-center gap-1 ${
                          bgToolMode === 'manual_restore'
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                            : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50'
                        }`}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Restore Brush
                      </button>
                    </div>

                    {/* Magic wand description/tolerance */}
                    {bgToolMode === 'magic' && (
                      <div className="bg-slate-50 dark:bg-zinc-900/60 p-3.5 rounded-xl border border-slate-150 dark:border-zinc-850 space-y-2 animate-fadeIn">
                        <p className="text-[10px] text-slate-500 leading-normal">
                          <span className="font-bold text-blue-600 dark:text-blue-400">Magic Wand:</span> Click on any color in the preview photo to erase matching background color paths.
                        </p>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-zinc-400">
                            <span>Color Tolerance:</span>
                            <span>{magicTolerance}</span>
                          </div>
                          <input
                            type="range"
                            min="5"
                            max="100"
                            value={magicTolerance}
                            onChange={(e) => setMagicTolerance(Number(e.target.value))}
                            className="w-full accent-blue-600 h-1 bg-slate-200 dark:bg-zinc-850 rounded-lg cursor-pointer"
                          />
                        </div>
                      </div>
                    )}

                    {/* Manual paint brush parameter adjustments */}
                    {(bgToolMode === 'manual_erase' || bgToolMode === 'manual_restore') && (
                      <div className="bg-slate-50 dark:bg-zinc-900/60 p-3.5 rounded-xl border border-slate-150 dark:border-zinc-850 space-y-3 animate-fadeIn">
                        <p className="text-[10px] text-slate-500 leading-normal">
                          <span className="font-bold text-blue-600 dark:text-blue-400">Brush tool:</span> Drag your cursor directly on the photo to manually draw precise transparency.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-zinc-400">
                              <span>Brush Size:</span>
                              <span>{eraserSize}px</span>
                            </div>
                            <input
                              type="range"
                              min="3"
                              max="80"
                              value={eraserSize}
                              onChange={(e) => setEraserSize(Number(e.target.value))}
                              className="w-full accent-blue-600 h-1 bg-slate-200 dark:bg-zinc-850 rounded-lg cursor-pointer"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-zinc-400">
                              <span>Feathering:</span>
                              <span>{eraserFeather}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={eraserFeather}
                              onChange={(e) => setEraserFeather(Number(e.target.value))}
                              className="w-full accent-blue-600 h-1 bg-slate-200 dark:bg-zinc-850 rounded-lg cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Replace background color state */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      Step 3: Choose New Background Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {bgPresets.map((preset) => (
                        <button
                          key={preset.hex}
                          onClick={() => {
                            setBgColor(preset.hex);
                            setCustomBgHex(preset.hex);
                          }}
                          className={`w-9 h-9 rounded-xl border-2 cursor-pointer relative shadow-sm hover:scale-105 transition-all ${
                            bgColor === preset.hex 
                              ? 'border-blue-500 scale-105 ring-2 ring-blue-500/20' 
                              : 'border-slate-200 dark:border-zinc-800'
                          }`}
                          style={{ backgroundColor: preset.hex }}
                          title={preset.name}
                        >
                          {bgColor === preset.hex && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Check className={`h-4 w-4 ${preset.hex === '#FFFFFF' || preset.hex === '#F0F0F0' ? 'text-slate-900' : 'text-white'}`} />
                            </div>
                          )}
                        </button>
                      ))}

                      {/* Transparent (Remove Background) option */}
                      <button
                        onClick={() => {
                          setBgColor('transparent');
                          setBgType('color');
                        }}
                        className={`w-9 h-9 rounded-xl border-2 relative cursor-pointer shadow-sm hover:scale-105 transition-all overflow-hidden ${
                          bgColor === 'transparent' 
                            ? 'border-blue-500 scale-105 ring-2 ring-blue-500/20' 
                            : 'border-slate-200 dark:border-zinc-800'
                        }`}
                        title="Transparent (Remove Background)"
                      >
                        <div className="absolute inset-0 bg-transparent flex items-center justify-center bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjY2NjIiAvPgo8cmVjdCB4PSI0IiB5PSI0IiB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjY2NjIiAvPjwvc3ZnPg==')] bg-repeat">
                          {bgColor === 'transparent' && (
                            <Check className="h-4 w-4 text-slate-900 bg-white/70 rounded-full" />
                          )}
                        </div>
                      </button>

                      {/* Custom color picker */}
                      <div className="relative">
                        <input
                          type="color"
                          value={customBgHex}
                          onChange={(e) => {
                            setCustomBgHex(e.target.value);
                            setBgColor(e.target.value);
                          }}
                          className="absolute inset-0 opacity-0 w-9 h-9 cursor-pointer"
                        />
                        <button
                          className={`w-9 h-9 rounded-xl border-2 bg-gradient-to-tr from-rose-400 via-emerald-400 to-indigo-500 cursor-pointer ${
                            bgColor === customBgHex && !bgPresets.some(p => p.hex === bgColor)
                              ? 'border-blue-500 scale-105 ring-2 ring-blue-500/20'
                              : 'border-slate-200 dark:border-zinc-800'
                          }`}
                          title="Custom Color"
                        >
                          {bgColor === customBgHex && !bgPresets.some(p => p.hex === bgColor) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/15 rounded-xl">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Adjustments, skin smoothing & enhancements */}
              {activeTab === 'adjust' && (
                <div className="space-y-5">
                  <button
                    onClick={handleAutoEnhance}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5 transition-transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <Sliders className="h-4 w-4 animate-pulse" />
                    Auto Enhance Photo Details
                  </button>

                  <hr className="border-slate-100 dark:border-zinc-900" />

                  {/* Adjustment sliders */}
                  <div className="space-y-4">
                    
                    {/* Brightness slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-zinc-300">
                        <span>Brightness</span>
                        <span className="font-mono text-[11px]">{brightness}%</span>
                      </div>
                      <input
                        type="range"
                        min="60"
                        max="140"
                        value={brightness}
                        onChange={(e) => setBrightness(Number(e.target.value))}
                        className="w-full accent-blue-600 h-1 bg-slate-100 dark:bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Contrast slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-zinc-300">
                        <span>Contrast</span>
                        <span className="font-mono text-[11px]">{contrast}%</span>
                      </div>
                      <input
                        type="range"
                        min="60"
                        max="140"
                        value={contrast}
                        onChange={(e) => setContrast(Number(e.target.value))}
                        className="w-full accent-blue-600 h-1 bg-slate-100 dark:bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Saturation slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-zinc-300">
                        <span>Saturation</span>
                        <span className="font-mono text-[11px]">{saturation}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        value={saturation}
                        onChange={(e) => setSaturation(Number(e.target.value))}
                        className="w-full accent-blue-600 h-1 bg-slate-100 dark:bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Sharpness convolution slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-zinc-300">
                        <span>Sharpness Blur kernel</span>
                        <span className="font-mono text-[11px]">{sharpness}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={sharpness}
                        onChange={(e) => setSharpness(Number(e.target.value))}
                        className="w-full accent-blue-600 h-1 bg-slate-100 dark:bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Skin smoothing blur slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-zinc-300">
                        <span>Skin Smoothing</span>
                        <span className="font-mono text-[11px]">{skinSmoothing}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={skinSmoothing}
                        onChange={(e) => setSkinSmoothing(Number(e.target.value))}
                        className="w-full accent-blue-600 h-1 bg-slate-100 dark:bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Sheet Print Layout configurations */}
              {activeTab === 'print' && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      Multi-Photo Grid Sheet
                    </label>
                    <select
                      value={selectedSheetId}
                      onChange={(e) => setSelectedSheetId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-zinc-200 outline-none"
                    >
                      {SHEET_SIZES.map((sheet) => (
                        <option key={sheet.id} value={sheet.id}>
                          {sheet.name} {sheet.widthIn > 0 ? `(${sheet.widthIn}" × ${sheet.heightIn}")` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Photo Border Settings */}
                  <div className="space-y-3 bg-slate-50 dark:bg-zinc-900 p-4 rounded-xl border border-slate-150 dark:border-zinc-850">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block">
                      Photo Border Options
                    </label>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                        <span>Border Thickness</span>
                        <span>{photoBorderWidth} px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        value={photoBorderWidth}
                        onChange={(e) => setPhotoBorderWidth(Number(e.target.value))}
                        className="w-full accent-blue-600 h-1 bg-slate-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>
                    {photoBorderWidth > 0 && (
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">Border Color</span>
                        <input
                          type="color"
                          value={photoBorderColor}
                          onChange={(e) => setPhotoBorderColor(e.target.value)}
                          className="w-8 h-8 p-0 border-0 rounded cursor-pointer overflow-hidden bg-transparent"
                        />
                      </div>
                    )}
                  </div>

                  {/* Number of copies slider */}
                  {selectedSheetId !== 'single' && (
                    <div className="space-y-2 bg-slate-50 dark:bg-zinc-900 p-4 rounded-xl border border-slate-150 dark:border-zinc-850 animate-fadeIn">
                      <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-zinc-300">
                        <span>Desired Copies:</span>
                        <span className="font-mono text-blue-600 font-extrabold">{sheetCopies} copies</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="32"
                        value={sheetCopies}
                        onChange={(e) => setSheetCopies(Number(e.target.value))}
                        className="w-full accent-blue-600 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
                      />
                      <p className="text-[10px] text-slate-400">
                        Select count to tile over your printing paper. Dashed cutting borders will be automatically generated.
                      </p>
                    </div>
                  )}

                  {/* Print sheet properties detail */}
                  <div className="border border-slate-100 dark:border-zinc-900 p-4 rounded-xl flex items-center gap-2 text-slate-500 text-[11px] leading-relaxed">
                    <AlertCircle className="h-4 w-4 text-blue-500 shrink-0" />
                    <span>
                      Dashed margins are automatically calculated to let you print onto standard photo papers and easily scissor cut them cleanly.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ACTION FOOTER: Main Download and print layout controls */}
            <div className="border-t border-slate-150 dark:border-zinc-900 p-5 bg-slate-50/50 dark:bg-zinc-900/10 space-y-3">
              
              {/* If Single Photo is selected */}
              {selectedSheetId === 'single' ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleDownload('png', false)}
                      disabled={isProcessing}
                      className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1 transition-transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Save PNG Photo
                    </button>
                    <button
                      onClick={() => handleDownload('jpeg', false)}
                      disabled={isProcessing}
                      className="py-2.5 px-3 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1 transition-transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Save JPEG Photo
                    </button>
                  </div>
                  <button
                    onClick={() => handleDownload('pdf', false)}
                    disabled={isProcessing}
                    className="w-full py-2.5 px-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5 text-rose-500" />
                    Export Single Photo PDF
                  </button>
                </div>
              ) : (
                // Multi sheet layouts
                <div className="space-y-2">
                  <button
                    onClick={handlePrint}
                    disabled={isProcessing}
                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/10 cursor-pointer flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Printer className="h-4 w-4" />
                    Print Multi-Photo Sheet Directly
                  </button>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleDownload('png', true)}
                      disabled={isProcessing}
                      className="py-2 px-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 text-[10px] font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Download className="h-3 w-3 text-sky-500" />
                      PNG Sheet
                    </button>
                    <button
                      onClick={() => handleDownload('jpeg', true)}
                      disabled={isProcessing}
                      className="py-2 px-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 text-[10px] font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Download className="h-3 w-3 text-blue-500" />
                      JPEG Sheet
                    </button>
                    <button
                      onClick={() => handleDownload('pdf', true)}
                      disabled={isProcessing}
                      className="py-2 px-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 text-[10px] font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1"
                    >
                      <FileText className="h-3 w-3 text-rose-500" />
                      PDF Sheet
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
