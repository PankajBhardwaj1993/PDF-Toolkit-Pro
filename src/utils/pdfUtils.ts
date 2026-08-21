import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

// Helper to convert File to ArrayBuffer
async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// 1. Merge PDFs
export async function mergePDFs(files: File[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();
  
  for (const file of files) {
    const pdfBytes = await fileToArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  
  return await mergedPdf.save();
}

// 2. Split PDF into individual pages or groups
export async function splitPDF(file: File): Promise<Array<{ pageNum: number; bytes: Uint8Array }>> {
  const pdfBytes = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pageCount = pdfDoc.getPageCount();
  const results = [];
  
  for (let i = 0; i < pageCount; i++) {
    const singlePagePdf = await PDFDocument.create();
    const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [i]);
    singlePagePdf.addPage(copiedPage);
    const bytes = await singlePagePdf.save();
    results.push({ pageNum: i + 1, bytes });
  }
  
  return results;
}

// 3. Rotate PDF pages (90, 180, 270 degrees)
export async function rotatePDF(file: File, rotationAngle: number): Promise<Uint8Array> {
  const pdfBytes = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  
  pages.forEach((page) => {
    const currentRotation = page.getRotation().angle;
    page.setRotation(degrees((currentRotation + rotationAngle) % 360));
  });
  
  return await pdfDoc.save();
}

// 4. Delete PDF Pages
export async function deletePDFPages(file: File, pageNumbersToDelete: number[]): Promise<Uint8Array> {
  const pdfBytes = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  // Sort in descending order to avoid offset issues when removing pages
  const sortedIndices = pageNumbersToDelete
    .map(num => num - 1)
    .filter(idx => idx >= 0 && idx < pdfDoc.getPageCount())
    .sort((a, b) => b - a);
    
  sortedIndices.forEach(index => {
    pdfDoc.removePage(index);
  });
  
  return await pdfDoc.save();
}

// 5. Extract PDF Pages
export async function extractPDFPages(file: File, pageNumbersToExtract: number[]): Promise<Uint8Array> {
  const pdfBytes = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const extractedPdf = await PDFDocument.create();
  
  const validIndices = pageNumbersToExtract
    .map(num => num - 1)
    .filter(idx => idx >= 0 && idx < pdfDoc.getPageCount());
    
  if (validIndices.length === 0) {
    throw new Error('No valid pages selected for extraction');
  }
  
  const copiedPages = await extractedPdf.copyPages(pdfDoc, validIndices);
  copiedPages.forEach(page => extractedPdf.addPage(page));
  
  return await extractedPdf.save();
}

// 6. Add Page Numbers
export async function addPageNumbers(file: File, position: 'bottom-center' | 'bottom-right' | 'top-right' = 'bottom-center'): Promise<Uint8Array> {
  const pdfBytes = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pageCount = pages.length;
  
  pages.forEach((page, index) => {
    const { width, height } = page.getSize();
    const text = `Page ${index + 1} of ${pageCount}`;
    const textSize = 10;
    const textWidth = font.widthOfTextAtSize(text, textSize);
    
    let x = width / 2 - textWidth / 2;
    let y = 20;
    
    if (position === 'bottom-right') {
      x = width - textWidth - 30;
    } else if (position === 'top-right') {
      x = width - textWidth - 30;
      y = height - 30;
    }
    
    page.drawText(text, {
      x,
      y,
      size: textSize,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  });
  
  return await pdfDoc.save();
}

export function sanitizeForWinAnsi(text: string): string {
  if (!text) return '';
  return text
    .replace(/\u00A0/g, ' ')
    .replace(/\u200B/g, '')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\u2018-\u201B]/g, "'")
    .replace(/[\u201C-\u201F]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/[\u2022\u25cf\u25cb\u25a0\u25a1]/g, '*')
    .replace(/\u2122/g, 'TM')
    .replace(/\u00A9/g, '(C)')
    .replace(/\u00AE/g, '(R)')
    .split('')
    .map(char => {
      const code = char.charCodeAt(0);
      if (code >= 32 && code <= 126) return char;
      if (code === 10 || code === 13 || code === 9) return char;
      if (
        (code >= 160 && code <= 255) ||
        [0x20b9, 0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6,
         0x2030, 0x0160, 0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c,
         0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a,
         0x0153, 0x017e, 0x0178].includes(code)
      ) {
        return char;
      }
      return '';
    })
    .join('');
}

// 7. Add Watermark
export async function addWatermark(file: File, text: string, opacity: number = 0.3): Promise<Uint8Array> {
  const pdfBytes = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const safeText = sanitizeForWinAnsi(text) || 'WATERMARK';
  
  pages.forEach((page) => {
    const { width, height } = page.getSize();
    const textSize = 48;
    const textWidth = font.widthOfTextAtSize(safeText, textSize);
    
    // Draw centered watermark at a 45-degree angle
    page.drawText(safeText, {
      x: width / 2 - textWidth / 2 + 50,
      y: height / 2 - 20,
      size: textSize,
      font,
      color: rgb(0.7, 0.1, 0.1),
      opacity,
      rotate: degrees(45),
    });
  });
  
  return await pdfDoc.save();
}

// 8. Add Signature Image to PDF Page
export async function addSignatureToPDF(
  file: File,
  signatureBase64: string,
  pageNum: number = 1,
  x: number = 50,
  y: number = 50,
  scale: number = 0.5
): Promise<Uint8Array> {
  const pdfBytes = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  
  if (pageNum < 1 || pageNum > pages.length) {
    throw new Error('Invalid page number');
  }
  
  const page = pages[pageNum - 1];
  
  // Clean base64 string
  const base64Data = signatureBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
  const signatureImage = await pdfDoc.embedPng(Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)));
  
  const { width, height } = signatureImage.scale(scale);
  
  page.drawImage(signatureImage, {
    x,
    y,
    width,
    height,
  });
  
  return await pdfDoc.save();
}

export async function rotatePDFPages(file: File, pageRotations: { [pageNum: number]: number }): Promise<Uint8Array> {
  const pdfBytes = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  
  pages.forEach((page, index) => {
    const rot = pageRotations[index + 1];
    if (rot) {
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees((currentRotation + rot) % 360));
    }
  });
  
  return await pdfDoc.save();
}

// 9. PDF Metadata Management
export interface PDFMetadataInfo {
  title: string;
  author: string;
  subject: string;
  keywords: string[];
  creator: string;
  producer: string;
  creationDate: Date | null;
  modificationDate: Date | null;
  pageCount: number;
}

export interface PDFMetadataUpdate {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
  producer?: string;
  creationDate?: Date | null;
  modificationDate?: Date | null;
}

export async function getPDFMetadata(file: File): Promise<PDFMetadataInfo> {
  const pdfBytes = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  
  const rawKeywords = pdfDoc.getKeywords();
  let keywordsArray: string[] = [];
  if (rawKeywords) {
    // Split on commas, semicolons, or linebreaks
    keywordsArray = rawKeywords.split(/[,;\n]/).map(k => k.trim()).filter(Boolean);
  }

  return {
    title: pdfDoc.getTitle() || '',
    author: pdfDoc.getAuthor() || '',
    subject: pdfDoc.getSubject() || '',
    keywords: keywordsArray,
    creator: pdfDoc.getCreator() || '',
    producer: pdfDoc.getProducer() || '',
    creationDate: pdfDoc.getCreationDate() || null,
    modificationDate: pdfDoc.getModificationDate() || null,
    pageCount: pdfDoc.getPageCount(),
  };
}

export async function updatePDFMetadata(
  file: File,
  metadata: PDFMetadataUpdate
): Promise<Uint8Array> {
  const pdfBytes = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

  if (metadata.title !== undefined) pdfDoc.setTitle(metadata.title);
  if (metadata.author !== undefined) pdfDoc.setAuthor(metadata.author);
  if (metadata.subject !== undefined) pdfDoc.setSubject(metadata.subject);
  if (metadata.keywords !== undefined) pdfDoc.setKeywords(metadata.keywords);
  if (metadata.creator !== undefined) pdfDoc.setCreator(metadata.creator);
  if (metadata.producer !== undefined) pdfDoc.setProducer(metadata.producer);
  if (metadata.creationDate !== undefined) {
    if (metadata.creationDate) pdfDoc.setCreationDate(metadata.creationDate);
  }
  if (metadata.modificationDate !== undefined) {
    if (metadata.modificationDate) pdfDoc.setModificationDate(metadata.modificationDate);
  } else {
    pdfDoc.setModificationDate(new Date());
  }

  return await pdfDoc.save();
}

// Convert an array of image files into a single multi-page PDF document
export async function convertImagesToPDF(files: File[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  for (const file of files) {
    let imgDataUrl = '';
    const isPng = file.type === 'image/png';
    const isJpg = file.type === 'image/jpeg' || file.type === 'image/jpg';

    if (isPng || isJpg) {
      const arrayBuffer = await fileToArrayBuffer(file);
      const uint8 = new Uint8Array(arrayBuffer);
      let embeddedImage;
      try {
        if (isPng) {
          embeddedImage = await pdfDoc.embedPng(uint8);
        } else {
          embeddedImage = await pdfDoc.embedJpg(uint8);
        }
      } catch {
        imgDataUrl = await fileToCanvasDataUrl(file);
      }

      if (embeddedImage) {
        const { width, height } = embeddedImage;
        const page = pdfDoc.addPage([width, height]);
        page.drawImage(embeddedImage, { x: 0, y: 0, width, height });
        continue;
      }
    }

    if (!imgDataUrl) {
      imgDataUrl = await fileToCanvasDataUrl(file);
    }

    const base64Data = imgDataUrl.replace(/^data:image\/png;base64,/, '');
    const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const embeddedPng = await pdfDoc.embedPng(bytes);
    const { width, height } = embeddedPng;
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(embeddedPng, { x: 0, y: 0, width, height });
  }

  return await pdfDoc.save();
}

// Convert a single image to a 1-page PDF document
export async function convertSingleImageToPDF(file: File): Promise<Uint8Array> {
  return convertImagesToPDF([file]);
}

// Helper to convert any image file to clean PNG data URL via browser Canvas
export function fileToCanvasDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 800;
        canvas.height = img.naturalHeight || img.height || 600;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

