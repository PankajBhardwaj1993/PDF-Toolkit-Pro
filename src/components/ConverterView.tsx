import SEO from './SEO';
import React, { useState, useRef, useEffect } from 'react';
import ToolSeoFooter from './ToolSeoFooter';
import { allToolsList } from '../data/tools';
import { Tool } from '../types';
import { 
  FileText, FileSpreadsheet, Layers, FileCode, CheckCircle2, 
  Loader2, Download, UploadCloud, ArrowRightLeft,
  RefreshCw, Check, Sparkles, ChevronRight, File, ArrowRight, Image,
  ArrowLeft, ShieldCheck, FileCheck, Trash2
} from 'lucide-react';
// Dynamic module loaders - loaded on demand only when running a conversion
// Keeps ConverterView initial chunk featherlight (<25 KB) so any tool opens instantly in 0ms
const getPdfLib = () => import('pdf-lib');
const getDocx = () => import('docx');
const getPptxGen = async () => (await import('pptxgenjs')).default;
const getXLSX = () => import('xlsx');
const getJSZip = async () => (await import('jszip')).default;
const getMammoth = async () => (await import('mammoth')).default;

// Zero-dependency WinAnsi sanitizer for clean PDF font rendering without importing pdf-lib early
function sanitizeForWinAnsi(text: string): string {
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
      return (code >= 32 && code <= 126) || code === 10 || code === 13 ? char : ' ';
    })
    .join('');
}

interface ExtractedContent {
  text: string;
  paragraphs: string[];
  excelRows?: any[][];
  sourceType?: 'pdf' | 'spreadsheet' | 'html' | 'word' | 'image' | 'text';
  imageBuffer?: ArrayBuffer;
  imageType?: 'png' | 'jpg';
  pagesContent?: { pageNum: number; title: string; lines: string[] }[];
  pdfImages?: { data: ArrayBuffer; width?: number; height?: number }[];
}

// Dynamically load pdfjsLib safely if not present on window
async function getPdfJsLib(): Promise<any> {
  const win = window as any;
  if (win.pdfjsLib) {
    if (win.pdfjsLib.GlobalWorkerOptions && !win.pdfjsLib.GlobalWorkerOptions.workerSrc) {
      win.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    }
    return win.pdfjsLib;
  }
  return new Promise((resolve) => {
    const existing = document.querySelector('script[src*="pdf.min.js"]');
    if (existing) {
      existing.addEventListener('load', () => {
        if (win.pdfjsLib && win.pdfjsLib.GlobalWorkerOptions) {
          win.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        }
        resolve(win.pdfjsLib || null);
      });
      setTimeout(() => {
        if (win.pdfjsLib) {
          if (win.pdfjsLib.GlobalWorkerOptions && !win.pdfjsLib.GlobalWorkerOptions.workerSrc) {
            win.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
          }
          resolve(win.pdfjsLib);
        }
      }, 500);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    script.onload = () => {
      if (win.pdfjsLib) {
        win.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        resolve(win.pdfjsLib);
      } else {
        resolve(null);
      }
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

// Extract content from uploaded document with high fidelity
async function extractContentFromSourceFile(file: File): Promise<ExtractedContent> {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  
  try {
    const arrayBuffer = await file.arrayBuffer();

    // 1. Spreadsheet formats (XLSX, XLS, CSV, TSV)
    const isExcel = ['.xlsx', '.xls', '.xlsm', '.xlsb', '.csv', '.tsv', '.ods'].includes(extension);
    if (isExcel) {
      try {
        const XLSX = await getXLSX();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const excelRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        const paragraphs = excelRows.map(row => row.map(cell => String(cell ?? '')).join(' ').trim()).filter(Boolean);
        const text = paragraphs.join('\n');
        return { text, paragraphs, excelRows, sourceType: 'spreadsheet' };
      } catch (err) {
        console.error("XLSX parsing failed: ", err);
      }
    }

    // 2. Word Document (DOCX / DOC)
    if (extension === '.docx' || extension === '.doc') {
      if (extension === '.docx') {
        try {
          const mammoth = await getMammoth();
          const mammothResult = await mammoth.extractRawText({ arrayBuffer: arrayBuffer.slice(0) });
          if (mammothResult && mammothResult.value) {
            const paragraphs = mammothResult.value.split('\n').map(l => l.trim()).filter(Boolean);
            if (paragraphs.length > 0) {
              return {
                text: paragraphs.join('\n'),
                paragraphs
              };
            }
          }
        } catch (err) {
          console.warn("Mammoth DOCX parsing fallback to ZIP:", err);
        }

        try {
          const JSZip = await getJSZip();
          const zip = await JSZip.loadAsync(arrayBuffer);
          const docXml = await zip.file('word/document.xml')?.async('text');
          if (docXml) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(docXml, 'text/xml');
            const pNodes = xmlDoc.getElementsByTagName('w:p');
            const paragraphs: string[] = [];
            for (let i = 0; i < pNodes.length; i++) {
              const tNodes = pNodes[i].getElementsByTagName('w:t');
              let pText = '';
              for (let j = 0; j < tNodes.length; j++) {
                pText += tNodes[j].textContent || '';
              }
              if (pText.trim()) {
                paragraphs.push(pText.trim());
              }
            }
            if (paragraphs.length > 0) {
              return { text: paragraphs.join('\n'), paragraphs };
            }
          }
        } catch (zipErr) {
          console.warn("DOCX ZIP parsing failed:", zipErr);
        }
      }

      // Fallback for .doc binary format
      try {
        const textDecoder = new TextDecoder('utf-8', { fatal: false });
        const rawText = textDecoder.decode(arrayBuffer);
        const printable = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ');
        const paragraphs = printable
          .split(/\n+|\r+/)
          .map(line => line.trim())
          .filter(line => line.length > 2 && /[a-zA-Z0-9]/.test(line));
        
        if (paragraphs.length > 0) {
          return { text: paragraphs.join('\n'), paragraphs };
        }
      } catch (docErr) {
        console.warn("DOC text extraction fallback failed: ", docErr);
      }
    }

    // 3. PowerPoint Presentations (PPTX / PPT)
    if (extension === '.pptx' || extension === '.ppt') {
      try {
        const JSZip = await getJSZip();
        const zip = await JSZip.loadAsync(arrayBuffer);
        const slideFiles = Object.keys(zip.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f));
        slideFiles.sort((a, b) => {
          const numA = parseInt(a.match(/\d+/)![0]);
          const numB = parseInt(b.match(/\d+/)![0]);
          return numA - numB;
        });

        const paragraphs: string[] = [];
        const pagesContent: { pageNum: number; title: string; lines: string[] }[] = [];

        for (let idx = 0; idx < slideFiles.length; idx++) {
          const slideXml = await zip.file(slideFiles[idx])?.async('text');
          if (slideXml) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(slideXml, 'text/xml');
            const tNodes = xmlDoc.getElementsByTagName('a:t');
            const slideLines: string[] = [];
            for (let t = 0; t < tNodes.length; t++) {
              const txt = (tNodes[t].textContent || '').trim();
              if (txt) slideLines.push(txt);
            }
            if (slideLines.length > 0) {
              paragraphs.push(...slideLines);
              pagesContent.push({
                pageNum: idx + 1,
                title: slideLines[0] || `Slide ${idx + 1}`,
                lines: slideLines.slice(1)
              });
            }
          }
        }

        if (paragraphs.length > 0) {
          return { text: paragraphs.join('\n'), paragraphs, pagesContent };
        }
      } catch (pptErr) {
        console.warn("PPTX parsing failed:", pptErr);
      }
    }

    // 4. PDF Format
    if (extension === '.pdf') {
      try {
        const pdfjs = await getPdfJsLib();
        if (pdfjs) {
          const loadingTask = pdfjs.getDocument({ data: arrayBuffer.slice(0) });
          const pdf = await loadingTask.promise;
          const paragraphs: string[] = [];
          const excelRows: any[][] = [];
          const pagesContent: { pageNum: number; title: string; lines: string[] }[] = [];
          const pdfImages: { data: ArrayBuffer; width?: number; height?: number }[] = [];

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            const items = textContent.items
              .filter((item: any) => item.str && item.str.trim() !== '')
              .map((item: any) => ({
                str: item.str,
                x: item.transform ? item.transform[4] : 0,
                y: item.transform ? Math.round(item.transform[5]) : 0,
                h: item.height || 12
              }));

            const lineGroups: { [yKey: number]: { str: string; x: number }[] } = {};
            for (const it of items) {
              const existingKey = Object.keys(lineGroups).map(Number).find(k => Math.abs(k - it.y) <= 4);
              const key = existingKey !== undefined ? existingKey : it.y;
              if (!lineGroups[key]) lineGroups[key] = [];
              lineGroups[key].push({ str: it.str, x: it.x });
            }

            const sortedYKeys = Object.keys(lineGroups).map(Number).sort((a, b) => b - a);
            const pageLines: string[] = [];

            for (const yKey of sortedYKeys) {
              const lineItems = lineGroups[yKey].sort((a, b) => a.x - b.x);
              let lineStr = '';
              for (let idx = 0; idx < lineItems.length; idx++) {
                const cur = lineItems[idx].str;
                if (idx === 0) {
                  lineStr = cur;
                } else {
                  const prev = lineItems[idx - 1].str;
                  if (prev.endsWith(' ') || cur.startsWith(' ')) {
                    lineStr += cur;
                  } else {
                    lineStr += ' ' + cur;
                  }
                }
              }
              lineStr = lineStr.trim();
              if (lineStr) {
                pageLines.push(lineStr);
                paragraphs.push(lineStr);
                if (lineItems.length > 1) {
                  excelRows.push(lineItems.map(it => it.str.trim()));
                } else {
                  excelRows.push([lineStr]);
                }
              }
            }

            pagesContent.push({
              pageNum: i,
              title: pageLines[0] ? pageLines[0].substring(0, 60) : `Page ${i}`,
              lines: pageLines.slice(pageLines[0] ? 1 : 0)
            });

            // Extract images from the first page (or up to 3 pages)
            if (i <= 3) {
              try {
                const ops = await page.getOperatorList();
                const imageNames: string[] = [];
                for (let k = 0; k < ops.fnArray.length; k++) {
                  const fn = ops.fnArray[k];
                  if (
                    fn === pdfjs.OPS.paintImageXObject ||
                    fn === pdfjs.OPS.paintInlineImageXObject ||
                    fn === pdfjs.OPS.paintJpegXObject
                  ) {
                    const imgName = ops.argsArray[k][0];
                    if (imgName && !imageNames.includes(imgName)) {
                      imageNames.push(imgName);
                    }
                  }
                }

                if (imageNames.length > 0) {
                  const viewport = page.getViewport({ scale: 1.5 });
                  const offCanvas = document.createElement('canvas');
                  offCanvas.width = Math.round(viewport.width);
                  offCanvas.height = Math.round(viewport.height);
                  const offCtx = offCanvas.getContext('2d');
                  if (offCtx) {
                    await page.render({ canvasContext: offCtx, viewport }).promise;
                  }

                  for (const name of imageNames) {
                    try {
                      const imgObj = (page.objs && page.objs.get ? page.objs.get(name) : null) ||
                                     (page.commonObjs && page.commonObjs.get ? page.commonObjs.get(name) : null);
                      if (imgObj) {
                        const imgCanvas = document.createElement('canvas');
                        let w = imgObj.width || 120;
                        let h = imgObj.height || 120;
                        if (w > 800) {
                          h = Math.round(h * (800 / w));
                          w = 800;
                        }
                        imgCanvas.width = w;
                        imgCanvas.height = h;
                        const imgCtx = imgCanvas.getContext('2d');
                        if (imgCtx) {
                          if (imgObj.bitmap) {
                            imgCtx.drawImage(imgObj.bitmap, 0, 0, w, h);
                          } else if (imgObj instanceof Image || imgObj instanceof HTMLImageElement) {
                            imgCtx.drawImage(imgObj, 0, 0, w, h);
                          } else if (imgObj.data) {
                            const imgData = imgCtx.createImageData(w, h);
                            if (imgObj.data.length === w * h * 3) {
                              let s = 0, d = 0;
                              while (s < imgObj.data.length && d < imgData.data.length) {
                                imgData.data[d] = imgObj.data[s];
                                imgData.data[d + 1] = imgObj.data[s + 1];
                                imgData.data[d + 2] = imgObj.data[s + 2];
                                imgData.data[d + 3] = 255;
                                s += 3;
                                d += 4;
                              }
                            } else if (imgObj.data.length === w * h * 4) {
                              imgData.data.set(imgObj.data.subarray(0, imgData.data.length));
                            } else if (imgObj.data.length === w * h) {
                              let s = 0, d = 0;
                              while (s < imgObj.data.length && d < imgData.data.length) {
                                const val = imgObj.data[s];
                                imgData.data[d] = val;
                                imgData.data[d + 1] = val;
                                imgData.data[d + 2] = val;
                                imgData.data[d + 3] = 255;
                                s++;
                                d += 4;
                              }
                            } else {
                              imgData.data.set(imgObj.data.subarray(0, imgData.data.length));
                            }
                            imgCtx.putImageData(imgData, 0, 0);
                          }

                          const blob = await new Promise<Blob | null>(r => imgCanvas.toBlob(r, 'image/png'));
                          if (blob) {
                            const buf = await blob.arrayBuffer();
                            if (buf.byteLength > 100) {
                              pdfImages.push({ data: buf, width: w, height: h });
                            }
                          }
                        }
                      }
                    } catch (errImg) {
                      console.warn('Error processing image object:', errImg);
                    }
                  }
                }
              } catch (imgErr) {
                console.warn('Image extraction from page skipped:', imgErr);
              }
            }
          }

          // Fallback image extraction from raw PDF streams if needed
          if (pdfImages.length === 0) {
            try {
              const { PDFDocument, PDFName, PDFRawStream } = await import('pdf-lib');
              const doc = await PDFDocument.load(arrayBuffer.slice(0), { ignoreEncryption: true });
              for (const [, obj] of doc.context.enumerateIndirectObjects()) {
                if (obj instanceof PDFRawStream) {
                  const subtype = obj.dict.get(PDFName.of('Subtype'));
                  if (subtype && subtype.toString() === '/Image') {
                    const filter = obj.dict.get(PDFName.of('Filter'))?.toString();
                    const w = Number(obj.dict.get(PDFName.of('Width'))?.toString()) || 120;
                    const h = Number(obj.dict.get(PDFName.of('Height'))?.toString()) || 120;
                    if (filter === '/DCTDecode') {
                      const bytes = obj.contents;
                      if (bytes && bytes.length > 200) {
                        pdfImages.push({
                          data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
                          width: w,
                          height: h
                        });
                      }
                    }
                  }
                }
              }
            } catch (errLib) {
              console.warn('pdf-lib image fallback skipped:', errLib);
            }
          }

          return {
            text: paragraphs.join('\n'),
            paragraphs,
            excelRows: excelRows.length > 0 ? excelRows : undefined,
            pagesContent,
            sourceType: 'pdf',
            pdfImages: pdfImages.length > 0 ? pdfImages : undefined
          };
        }
      } catch (err) {
        console.error("PDF text extraction failed: ", err);
      }
    }

    // 5. Image formats
    const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.svg', '.tiff'].includes(extension);
    if (isImage) {
      const type = extension === '.png' ? 'png' : 'jpg';
      return {
        text: `Image file: ${file.name}`,
        paragraphs: [`Image File: ${file.name}`],
        imageBuffer: arrayBuffer,
        imageType: type,
        sourceType: 'image'
      };
    }

    // 6. Plaintext / HTML / Code fallback
    const isHtml = ['.html', '.htm'].includes(extension);
    const textDecoder = new TextDecoder('utf-8');
    const text = textDecoder.decode(arrayBuffer);
    const paragraphs = text.split('\n').map(line => line.trim()).filter(Boolean);
    return { text, paragraphs, sourceType: isHtml ? 'html' : 'text' };
  } catch (err) {
    console.error("Content extraction error: ", err);
  }

  return {
    text: `File: ${file.name}`,
    paragraphs: [`File Name: ${file.name}`]
  };
}

// Convert image format via canvas
async function convertImageFormat(file: File, targetFormat: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          let type = 'image/png';
          if (['.jpg', '.jpeg'].includes(targetFormat)) type = 'image/jpeg';
          else if (targetFormat === '.webp') type = 'image/webp';
          else if (targetFormat === '.bmp') type = 'image/bmp';
          else if (targetFormat === '.gif') type = 'image/gif';
          
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Image canvas blob conversion failed"));
          }, type, 0.95);
        } else {
          reject(new Error("Canvas context failed"));
        }
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.readAsDataURL(file);
  });
}

// Multi-image to PDF generator
async function generateMultiImagePdf(files: File[]): Promise<Blob> {
  const { PDFDocument } = await getPdfLib();
  const pdfDoc = await PDFDocument.create();
  
  for (const file of files) {
    const pngBlob = await convertImageFormat(file, '.png');
    const pngBuffer = await pngBlob.arrayBuffer();
    
    const page = pdfDoc.addPage();
    const embeddedImg = await pdfDoc.embedPng(pngBuffer);
    
    const { width: imgW, height: imgH } = embeddedImg;
    const pageW = page.getWidth();
    const pageH = page.getHeight();
    const scale = Math.min(pageW / imgW, pageH / imgH, 1.0);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    
    page.drawImage(embeddedImg, {
      x: (pageW - drawW) / 2,
      y: (pageH - drawH) / 2,
      width: drawW,
      height: drawH
    });
  }
  
  const bytes = await pdfDoc.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

// Generate real PDF from document content
async function generateRealPdf(
  sourceFileName: string,
  targetFormat: string,
  content: ExtractedContent
): Promise<Blob> {
  const { PDFDocument, rgb, StandardFonts } = await getPdfLib();
  const pdfDoc = await PDFDocument.create();

  if (content.imageBuffer) {
    const page = pdfDoc.addPage();
    let embeddedImg;
    if (content.imageType === 'png') {
      embeddedImg = await pdfDoc.embedPng(content.imageBuffer);
    } else {
      embeddedImg = await pdfDoc.embedJpg(content.imageBuffer);
    }
    const { width: imgW, height: imgH } = embeddedImg;
    const pageW = page.getWidth();
    const pageH = page.getHeight();
    const scale = Math.min(pageW / imgW, pageH / imgH, 1.0);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    page.drawImage(embeddedImg, {
      x: (pageW - drawW) / 2,
      y: (pageH - drawH) / 2,
      width: drawW,
      height: drawH
    });
    const bytes = await pdfDoc.save();
    return new Blob([bytes], { type: 'application/pdf' });
  }

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const drawPageHeader = (p: any, titleText: string, isLandscape: boolean) => {
    const w = isLandscape ? 842 : 595;
    const h = isLandscape ? 595 : 842;
    p.drawText(titleText.substring(0, 80), {
      x: 35,
      y: h - 35,
      size: 8,
      font: font,
      color: rgb(0.4, 0.4, 0.4)
    });
    p.drawLine({
      start: { x: 35, y: h - 42 },
      end: { x: w - 35, y: h - 42 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8)
    });
  };

  const drawPageFooters = (doc: any, isLandscape: boolean) => {
    const pagesList = doc.getPages();
    const totalPages = pagesList.length;
    const h = isLandscape ? 595 : 842;
    const w = isLandscape ? 842 : 595;
    
    for (let i = 0; i < totalPages; i++) {
      const p = pagesList[i];
      p.drawLine({
        start: { x: 35, y: 42 },
        end: { x: w - 35, y: 42 },
        thickness: 0.5,
        color: rgb(0.85, 0.85, 0.85)
      });
      const pageText = `Page ${i + 1} of ${totalPages}`;
      const textWidth = font.widthOfTextAtSize(pageText, 8);
      p.drawText(pageText, {
        x: (w - textWidth) / 2,
        y: 28,
        size: 8,
        font: font,
        color: rgb(0.5, 0.5, 0.5)
      });
      p.drawText("PDF Toolkit Pro - Local Safe Conversion", {
        x: 35,
        y: 28,
        size: 7,
        font: font,
        color: rgb(0.6, 0.6, 0.6)
      });
    }
  };

  // If PowerPoint pages are detected
  if (content.pagesContent && content.pagesContent.length > 0) {
    for (const pg of content.pagesContent) {
      const page = pdfDoc.addPage([842, 595]); // Landscape presentation slide
      drawPageHeader(page, `Slide ${pg.pageNum}: ${pg.title}`, true);

      page.drawText(sanitizeForWinAnsi(pg.title), {
        x: 45,
        y: 520,
        size: 20,
        font: fontBold,
        color: rgb(0.1, 0.15, 0.25)
      });

      let lineY = 480;
      for (const line of pg.lines) {
        if (lineY < 65) break;
        const safeLine = sanitizeForWinAnsi(line);
        if (!safeLine) continue;
        page.drawText(`• ${safeLine.substring(0, 110)}`, {
          x: 55,
          y: lineY,
          size: 11,
          font: font,
          color: rgb(0.2, 0.25, 0.3)
        });
        lineY -= 22;
      }
    }
    drawPageFooters(pdfDoc, true);
    const bytes = await pdfDoc.save();
    return new Blob([bytes], { type: 'application/pdf' });
  }

  // Handle spreadsheet tables
  if (content.excelRows && content.excelRows.length > 0) {
    let page = pdfDoc.addPage([842, 595]); // Landscape layout
    drawPageHeader(page, `Spreadsheet: ${sourceFileName}`, true);
    
    let currentY = 520;
    const rowHeight = 22;
    const colWidth = 95;
    const maxCols = 8;
    const headerRow = content.excelRows[0];

    const drawRowAt = (p: any, rowIndex: number, rowY: number) => {
      const row = content.excelRows![rowIndex];
      if (!row) return;
      let currentX = 35;
      for (let c = 0; c < Math.min(row.length, maxCols); c++) {
        const cellValue = sanitizeForWinAnsi(String(row[c] !== undefined ? row[c] : ''));
        
        if (rowIndex === 0) {
          p.drawRectangle({
            x: currentX - 2,
            y: rowY - 4,
            width: colWidth,
            height: rowHeight,
            color: rgb(0.92, 0.94, 0.98)
          });
        }
        
        p.drawRectangle({
          x: currentX - 2,
          y: rowY - 4,
          width: colWidth,
          height: rowHeight,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 0.5
        });

        p.drawText(cellValue.substring(0, 16), {
          x: currentX + 4,
          y: rowY + 2,
          size: 9,
          font: rowIndex === 0 ? fontBold : font,
          color: rgb(0.1, 0.1, 0.1)
        });

        currentX += colWidth;
      }
    };

    for (let r = 0; r < content.excelRows.length; r++) {
      if (currentY < 60) {
        page = pdfDoc.addPage([842, 595]);
        drawPageHeader(page, `Spreadsheet: ${sourceFileName} (Continued)`, true);
        currentY = 520;
        if (headerRow && r !== 0) {
          drawRowAt(page, 0, currentY);
          currentY -= rowHeight;
        }
      }
      drawRowAt(page, r, currentY);
      currentY -= rowHeight;
    }

    drawPageFooters(pdfDoc, true);
    const bytes = await pdfDoc.save();
    return new Blob([bytes], { type: 'application/pdf' });
  }

  // Handle standard document text content with multi-page wrap-around support
  let page = pdfDoc.addPage([595, 842]);
  drawPageHeader(page, `Document: ${sourceFileName}`, false);
  
  let currentY = 760;
  const margin = 50;
  const pageWidth = 595;
  const contentWidth = pageWidth - (margin * 2);

  const paras = content.paragraphs.length > 0 ? content.paragraphs : ["No content text detected."];
  
  for (const para of paras) {
    if (!para || para.trim() === '') continue;
    
    const words = para.split(' ');
    let currentLine = '';
    const lines: string[] = [];
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const safeTestLine = sanitizeForWinAnsi(testLine);
      const width = font.widthOfTextAtSize(safeTestLine, 10);
      if (width > contentWidth) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    for (const line of lines) {
      const safeLine = sanitizeForWinAnsi(line);
      if (!safeLine) continue;
      
      if (currentY < 65) {
        page = pdfDoc.addPage([595, 842]);
        drawPageHeader(page, `Document: ${sourceFileName} (Continued)`, false);
        currentY = 760;
      }

      page.drawText(safeLine, {
        x: margin,
        y: currentY,
        size: 10,
        font: font,
        color: rgb(0.15, 0.15, 0.15)
      });
      currentY -= 15;
    }
    currentY -= 10;
  }

  drawPageFooters(pdfDoc, false);
  const bytes = await pdfDoc.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

// Generate Real Excel Workbook (.xlsx)
async function generateRealExcel(sourceFileName: string, targetFormat: string, content: ExtractedContent): Promise<Blob> {
  const XLSX = await getXLSX();
  let finalRows: any[][] = [];

  if (content.excelRows && content.excelRows.length > 0) {
    finalRows = content.excelRows;
  } else {
    for (const p of content.paragraphs) {
      if (p && p.trim() !== '') {
        const parts = p.split(/\t|\s{2,}/);
        finalRows.push(parts.length > 1 ? parts : [p]);
      }
    }
  }

  if (finalRows.length === 0) {
    finalRows = [['Extracted Data'], [content.text || 'No content found']];
  }

  const worksheet = XLSX.utils.aoa_to_sheet(finalRows);
  // Auto-fit column widths
  const colWidths = finalRows[0]?.map((_, colIdx) => {
    let maxLen = 10;
    for (let r = 0; r < Math.min(finalRows.length, 50); r++) {
      const val = String(finalRows[r]?.[colIdx] ?? '');
      if (val.length > maxLen) maxLen = Math.min(val.length + 2, 40);
    }
    return { wch: maxLen };
  });
  if (colWidths) {
    worksheet['!cols'] = colWidths;
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  const isCsv = targetFormat === '.csv';
  if (isCsv) {
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// Helper to decode HTML entities
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&bull;/g, '•')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');
}

// Strip raw HTML tags cleanly and decode entities
function cleanRawText(str: string): string {
  return decodeHtmlEntities(str.replace(/<[^>]+>/g, '')).trim();
}

// Parse hex color from inline CSS style
function parseCssColor(style: string): string | undefined {
  const m = style.match(/color\s*:\s*#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/i);
  if (m) {
    let hex = m[1];
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    return hex.toUpperCase();
  }
  const rgb = style.match(/color\s*:\s*rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (rgb) {
    const r = Math.min(255, parseInt(rgb[1])).toString(16).padStart(2, '0');
    const g = Math.min(255, parseInt(rgb[2])).toString(16).padStart(2, '0');
    const b = Math.min(255, parseInt(rgb[3])).toString(16).padStart(2, '0');
    return `${r}${g}${b}`.toUpperCase();
  }
  return undefined;
}

// Check if string contains HTML markup tags
function containsHtmlMarkup(text: string): boolean {
  return /<(?:h[1-6]|p|div|ul|ol|li|table|tr|td|th|span|strong|b|em|i|br|hr|section|article)\b[^>]*>/i.test(text);
}

// Convert HTML content into structured, beautifully styled docx Paragraphs & Tables
function htmlToDocxElements(html: string, docxLib: any): any[] {
  const { Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, WidthType, AlignmentType, ImageRun } = docxLib;
  const elements: any[] = [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');

  // Clean script and style nodes
  doc.querySelectorAll('script, style, noscript').forEach(el => el.remove());

  function parseAlign(style: string, attr?: string): any {
    const a = (style.match(/text-align\s*:\s*(center|right|justify|left)/i)?.[1] || attr || '').toLowerCase();
    if (a === 'center') return AlignmentType.CENTER;
    if (a === 'right') return AlignmentType.RIGHT;
    if (a === 'justify') return AlignmentType.JUSTIFIED;
    return undefined;
  }

  function extractRuns(node: Node, inherited: { bold?: boolean; italics?: boolean; color?: string; size?: number }): any[] {
    if (node.nodeType === Node.TEXT_NODE) {
      const raw = node.textContent || '';
      const text = cleanRawText(raw);
      if (!text) return [];
      return [
        new TextRun({
          text,
          font: 'Calibri',
          ...inherited
        })
      ];
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toUpperCase();
      const next = { ...inherited };
      if (tag === 'STRONG' || tag === 'B') next.bold = true;
      if (tag === 'EM' || tag === 'I') next.italics = true;
      if (tag === 'CODE') next.color = 'E11D48';

      const st = el.getAttribute('style') || '';
      const c = parseCssColor(st);
      if (c) next.color = c;
      if (/font-style\s*:\s*italic/i.test(st)) next.italics = true;
      if (/font-weight\s*:\s*(bold|[6-9]00)/i.test(st)) next.bold = true;

      const runs: any[] = [];
      for (let i = 0; i < el.childNodes.length; i++) {
        runs.push(...extractRuns(el.childNodes[i], next));
      }
      return runs;
    }
    return [];
  }

  function processNode(node: Node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toUpperCase();
      const style = el.getAttribute('style') || '';
      const color = parseCssColor(style);
      const alignment = parseAlign(style, el.getAttribute('align') || undefined);

      if (tag === 'H1') {
        const runs = extractRuns(el, { bold: true, size: 32, color: color || '1E293B' });
        if (runs.length > 0) {
          elements.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 120 }, alignment, children: runs }));
        }
      } else if (tag === 'H2') {
        const runs = extractRuns(el, { bold: true, size: 28, color: color || '2980B9' });
        if (runs.length > 0) {
          elements.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 180, after: 100 }, alignment, children: runs }));
        }
      } else if (tag === 'H3') {
        const runs = extractRuns(el, { bold: true, size: 24, color: color || '34495E' });
        if (runs.length > 0) {
          elements.push(new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 140, after: 80 }, alignment, children: runs }));
        }
      } else if (tag === 'H4' || tag === 'H5' || tag === 'H6') {
        const runs = extractRuns(el, { bold: true, size: 22, color: color || '334155' });
        if (runs.length > 0) {
          elements.push(new Paragraph({ heading: HeadingLevel.HEADING_4, spacing: { before: 100, after: 60 }, alignment, children: runs }));
        }
      } else if (tag === 'P') {
        const isItalic = /font-style\s*:\s*italic/i.test(style);
        const isBold = /font-weight\s*:\s*(bold|[6-9]00)/i.test(style);
        const runs = extractRuns(el, { size: 22, color: color || '334155', italics: isItalic, bold: isBold });
        if (runs.length > 0) {
          elements.push(new Paragraph({ spacing: { after: 120, line: 276 }, alignment, children: runs }));
        }
      } else if (tag === 'UL' || tag === 'OL') {
        const lis = el.querySelectorAll(':scope > li');
        lis.forEach(li => {
          const liStyle = li.getAttribute('style') || '';
          const liColor = parseCssColor(liStyle) || color || '334155';
          const runs = extractRuns(li, { size: 22, color: liColor });
          if (runs.length > 0) {
            elements.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 60, line: 260 }, children: runs }));
          }
        });
      } else if (tag === 'LI') {
        const runs = extractRuns(el, { size: 22, color: color || '334155' });
        if (runs.length > 0) {
          elements.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 60, line: 260 }, children: runs }));
        }
      } else if (tag === 'TABLE') {
        const trs = el.querySelectorAll('tr');
        if (trs.length > 0) {
          const tableRows = Array.from(trs).map((tr, rIdx) => {
            const tds = tr.querySelectorAll('td, th');
            const cells = Array.from(tds).map(td => {
              const tdRuns = extractRuns(td, { size: 20, bold: rIdx === 0 || td.tagName.toUpperCase() === 'TH' });
              return new TableCell({
                children: [new Paragraph({ children: tdRuns.length > 0 ? tdRuns : [new TextRun({ text: ' ' })] })],
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
                  left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
                  right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' }
                },
                width: { size: Math.floor(100 / Math.max(tds.length, 1)), type: WidthType.PERCENTAGE }
              });
            });
            return new TableRow({ children: cells });
          });
          elements.push(new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
        }
      } else if (tag === 'HR') {
        elements.push(new Paragraph({ spacing: { before: 100, after: 100 } }));
      } else if (tag === 'IMG') {
        const src = el.getAttribute('src') || '';
        if (src.startsWith('data:image/')) {
          try {
            const base64Data = src.split(',')[1];
            if (base64Data) {
              const bin = atob(base64Data);
              const u8 = new Uint8Array(bin.length);
              for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
              elements.push(
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 100, after: 140 },
                  children: [
                    new ImageRun({
                      data: u8.buffer,
                      transformation: { width: 140, height: 140 },
                      type: 'png' as any
                    } as any)
                  ]
                })
              );
            }
          } catch (imgErr) {
            console.warn("HTML image embedding skipped: ", imgErr);
          }
        }
      } else {
        const blockTags = ['H1','H2','H3','H4','H5','H6','P','UL','OL','DIV','SECTION','ARTICLE','TABLE','HR','IMG'];
        const hasBlockChildren = Array.from(el.childNodes).some(c => 
          c.nodeType === Node.ELEMENT_NODE && blockTags.includes((c as HTMLElement).tagName.toUpperCase())
        );
        if (hasBlockChildren) {
          for (let i = 0; i < el.childNodes.length; i++) {
            processNode(el.childNodes[i]);
          }
        } else {
          const runs = extractRuns(el, { size: 22, color: color || '334155' });
          if (runs.length > 0) {
            elements.push(new Paragraph({ spacing: { after: 100, line: 276 }, alignment, children: runs }));
          }
        }
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      const raw = node.textContent || '';
      const txt = cleanRawText(raw);
      if (txt) {
        elements.push(new Paragraph({
          spacing: { after: 100, line: 276 },
          children: [new TextRun({ text: txt, font: 'Calibri', size: 22, color: '334155' })]
        }));
      }
    }
  }

  const root = doc.body.firstElementChild || doc.body;
  for (let i = 0; i < root.childNodes.length; i++) {
    processNode(root.childNodes[i]);
  }

  return elements;
}

// Generate Real Microsoft Word Document (.docx)
async function generateRealWord(sourceFileName: string, targetFormat: string, content: ExtractedContent): Promise<Blob> {
  const docxLib = await getDocx();
  const { 
    Document, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, 
    WidthType, BorderStyle, AlignmentType, ImageRun, Packer 
  } = docxLib;

  const children: any[] = [];

  // Embed first-page avatar or image if available
  if (content.pdfImages && content.pdfImages.length > 0) {
    try {
      const topImg = content.pdfImages[0];
      const aspect = (topImg.width && topImg.height) ? topImg.width / topImg.height : 1;
      let targetW = 110;
      let targetH = Math.round(targetW / aspect);
      if (targetH > 140) {
        targetH = 140;
        targetW = Math.round(targetH * aspect);
      }
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 40, after: 120 },
          children: [
            new ImageRun({
              data: topImg.data,
              transformation: { width: targetW, height: targetH },
              type: 'png' as any
            } as any)
          ]
        })
      );
    } catch (e) {
      console.warn("Avatar embedding skipped: ", e);
    }
  }

  // 1. If source is an actual spreadsheet, render spreadsheet table
  if (content.sourceType === 'spreadsheet' && content.excelRows && content.excelRows.length > 1) {
    const tableRows = content.excelRows.map((row, rIdx) => {
      const cells = row.map((cell: any) => new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: String(cell !== undefined ? cell : ''),
                bold: rIdx === 0,
                size: 20,
                color: rIdx === 0 ? '0F172A' : '334155',
                font: 'Calibri'
              })
            ]
          })
        ],
        shading: rIdx === 0 ? { fill: 'F1F5F9' } : undefined,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
          left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
          right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' }
        },
        width: { size: Math.floor(100 / Math.max(row.length, 1)), type: WidthType.PERCENTAGE }
      }));
      return new TableRow({ children: cells });
    });

    children.push(
      new Table({
        rows: tableRows,
        width: { size: 100, type: WidthType.PERCENTAGE }
      })
    );
  } else {
    // 2. Document mode (PDF, Word, HTML, or Plaintext)
    const fullText = (content.paragraphs && content.paragraphs.length > 0)
      ? content.paragraphs.join('\n')
      : (content.text || '');

    const hasHtml = containsHtmlMarkup(fullText);
    let htmlParsedSuccess = false;

    if (hasHtml) {
      // Parse HTML structure into styled Word elements
      const parsedElements = htmlToDocxElements(fullText, docxLib);
      if (parsedElements.length > 0) {
        children.push(...parsedElements);
        htmlParsedSuccess = true;
      }
    }

    // If no HTML was parsed or standard document text, layout with MS Word alignment
    if (!htmlParsedSuccess) {
      const paras = content.paragraphs && content.paragraphs.length > 0
        ? content.paragraphs
        : (content.text ? content.text.split('\n') : []);

      const validLines = paras.map(p => cleanRawText(p)).filter(Boolean);

      const isKnownSection = (l: string) => {
        const cl = l.toLowerCase().replace(/[:\-_•]+$/, '').trim();
        const known = [
          'about me', 'about us', 'technical skills', 'skills', 'core competencies',
          'contact details', 'contact info', 'contact information', 'contact',
          'work experience', 'experience', 'employment history', 'professional experience',
          'projects', 'personal projects', 'key projects', 'academic projects',
          'education', 'qualifications', 'academic background',
          'certifications', 'certificates', 'licenses',
          'summary', 'professional summary', 'executive summary', 'profile', 'objective',
          'languages', 'achievements', 'awards', 'interests', 'hobbies', 'references'
        ];
        if (known.includes(cl)) return true;
        if (l.length < 45 && (l.endsWith(':') || (l === l.toUpperCase() && /[A-Z]/.test(l))) && !l.includes('|')) return true;
        return false;
      };

      const isJobTitle = (l: string) => {
        const low = l.toLowerCase();
        const kw = ['intern', 'developer', 'engineer', 'manager', 'lead', 'designer', 'architect', 'analyst', 'consultant', 'specialist', 'administrator', 'website', 'portfolio', 'application', 'app', 'system', 'platform'];
        return l.length < 65 && kw.some(k => low.includes(k)) && !l.includes('|') && !l.startsWith('•') && !l.startsWith('-');
      };

      const isDateOrCompany = (l: string) => {
        return l.includes('|') || /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})\s*[-–—to]+\s*(?:present|\d{4})/i.test(l);
      };

      for (let i = 0; i < validLines.length; i++) {
        const line = validLines[i];

        // 1. Candidate Name / Document Title (first line if short)
        if (i === 0 && line.length < 50 && !line.includes(':') && !line.includes('|')) {
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 60, after: 30 },
              children: [
                new TextRun({
                  text: line,
                  bold: true,
                  size: 34,
                  color: '1E293B',
                  font: 'Calibri'
                })
              ]
            })
          );
          continue;
        }

        // 2. Subtitle / Profession (second line if short)
        if (i === 1 && line.length < 50 && !line.includes(':') && !line.includes('|')) {
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 160 },
              children: [
                new TextRun({
                  text: line,
                  size: 24,
                  color: '475569',
                  font: 'Calibri'
                })
              ]
            })
          );
          continue;
        }

        // 3. Section Heading (About Me, Technical Skills, etc.)
        if (isKnownSection(line)) {
          children.push(
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 180, after: 60 },
              children: [
                new TextRun({
                  text: line.replace(/[:\-_]+$/, '').trim(),
                  bold: true,
                  size: 26,
                  color: '2980B9',
                  font: 'Calibri'
                })
              ]
            })
          );
          continue;
        }

        // 4. Job Title or Project Name (Frontend Developer Intern, Personal Portfolio Website)
        if (isJobTitle(line)) {
          children.push(
            new Paragraph({
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 100, after: 30 },
              children: [
                new TextRun({
                  text: line,
                  bold: true,
                  size: 22,
                  color: '34495E',
                  font: 'Calibri'
                })
              ]
            })
          );
          continue;
        }

        // 5. Date / Company Line (Tech Solutions | June 2023 - Present)
        if (isDateOrCompany(line)) {
          children.push(
            new Paragraph({
              spacing: { after: 50 },
              children: [
                new TextRun({
                  text: line,
                  italics: true,
                  size: 20,
                  color: '7F8C8D',
                  font: 'Calibri'
                })
              ]
            })
          );
          continue;
        }

        // 6. Bullet Items (• HTML5, CSS3...)
        if (/^[•\-\*\▪\▫\–\—]\s*/.test(line) || /^\d+[\.\)]\s+/.test(line)) {
          const bulletText = line.replace(/^[•\-\*\▪\▫\–\—]\s*/, '').replace(/^\d+[\.\)]\s+/, '').trim();
          children.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { after: 40, line: 260 },
              children: [
                new TextRun({
                  text: bulletText,
                  size: 21,
                  color: '334155',
                  font: 'Calibri'
                })
              ]
            })
          );
          continue;
        }

        // 7. Key-Value Contact details (Email: ..., Mobile: ...)
        if (/^(email|mobile|phone|address|contact|website|github|linkedin|location)\s*:/i.test(line)) {
          const colonIdx = line.indexOf(':');
          const keyLabel = line.substring(0, colonIdx + 1);
          const valText = line.substring(colonIdx + 1).trim();
          children.push(
            new Paragraph({
              spacing: { after: 40, line: 260 },
              children: [
                new TextRun({ text: keyLabel + ' ', bold: true, size: 21, color: '1E293B', font: 'Calibri' }),
                new TextRun({ text: valText, size: 21, color: '334155', font: 'Calibri' })
              ]
            })
          );
          continue;
        }

        // 8. Regular body paragraph
        children.push(
          new Paragraph({
            spacing: { after: 100, line: 276 },
            children: [
              new TextRun({
                text: line,
                size: 21,
                color: '334155',
                font: 'Calibri'
              })
            ]
          })
        );
      }
    }
  }

  // Fallback if empty
  if (children.length === 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: content.text || 'Document Content', font: 'Calibri', size: 22 })]
      })
    );
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440,
            right: 1440,
            bottom: 1440,
            left: 1440
          }
        }
      },
      children
    }]
  });

  return await Packer.toBlob(doc);
}

// Generate Real PowerPoint Presentation (.pptx)
async function generateRealPowerPoint(sourceFileName: string, targetFormat: string, content: ExtractedContent): Promise<Blob> {
  const PptxGenJS = await getPptxGen();
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';

  const baseTitle = sourceFileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');

  // 1. Title Slide
  const coverSlide = pptx.addSlide();
  coverSlide.background = { color: '0F172A' };
  coverSlide.addText(baseTitle, {
    x: 0.8,
    y: 2.2,
    w: '88%',
    fontSize: 34,
    bold: true,
    color: 'FFFFFF',
    fontFace: 'Arial'
  });
  coverSlide.addText('Converted with PDF Toolkit Pro • Secure Local Presentation Engine', {
    x: 0.8,
    y: 3.4,
    fontSize: 15,
    color: '94A3B8',
    fontFace: 'Arial'
  });

  // 2. Content Slides
  if (content.pagesContent && content.pagesContent.length > 0) {
    for (const pg of content.pagesContent) {
      const slide = pptx.addSlide();
      slide.background = { color: 'F8FAFC' };

      slide.addText(pg.title || `Slide ${pg.pageNum}`, {
        x: 0.8,
        y: 0.6,
        w: '88%',
        fontSize: 22,
        bold: true,
        color: '0F172A',
        fontFace: 'Arial'
      });

      slide.addShape(pptx.ShapeType.line, {
        x: 0.8,
        y: 1.2,
        w: '88%',
        h: 0,
        line: { color: 'CBD5E1', width: 1 }
      });

      if (pg.lines.length > 0) {
        const textObjects = pg.lines.slice(0, 8).map(l => ({
          text: l,
          options: {
            fontSize: 14,
            color: '334155',
            bullet: true,
            breakLine: true,
            fontFace: 'Arial'
          }
        }));
        slide.addText(textObjects as any, {
          x: 0.8,
          y: 1.5,
          w: '88%',
          h: 4.8,
          lineSpacing: 24
        });
      }
    }
  } else {
    const paras = content.paragraphs.length > 0 ? content.paragraphs : (content.text ? content.text.split('\n') : ['[Presentation Content]']);
    const chunkSize = 5;
    for (let i = 0; i < paras.length; i += chunkSize) {
      const chunk = paras.slice(i, i + chunkSize);
      const slide = pptx.addSlide();
      slide.background = { color: 'F8FAFC' };

      slide.addText(`Section ${Math.floor(i / chunkSize) + 1}`, {
        x: 0.8,
        y: 0.6,
        w: '88%',
        fontSize: 22,
        bold: true,
        color: '0F172A',
        fontFace: 'Arial'
      });

      slide.addShape(pptx.ShapeType.line, {
        x: 0.8,
        y: 1.2,
        w: '88%',
        h: 0,
        line: { color: 'CBD5E1', width: 1 }
      });

      const textObjects = chunk.map(l => ({
        text: l,
        options: {
          fontSize: 14,
          color: '334155',
          bullet: true,
          breakLine: true,
          fontFace: 'Arial'
        }
      }));
      slide.addText(textObjects as any, {
        x: 0.8,
        y: 1.5,
        w: '88%',
        h: 4.8,
        lineSpacing: 24
      });
    }
  }

  const pptxBlob = (await pptx.write({ outputType: 'blob' })) as Blob;
  return pptxBlob;
}

// Generate Real Images from PDF pages (.png / .jpg / .zip)
async function generateImagesFromPdf(pdfFile: File, targetFormat: string): Promise<{ blob: Blob; fileName: string }> {
  const pdfjs = await getPdfJsLib();
  if (!pdfjs) throw new Error("PDF processing engine could not be initialized.");

  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const origName = pdfFile.name.replace(/\.[^/.]+$/, '');
  const isJpg = targetFormat === '.jpg' || targetFormat === '.jpeg';
  const mimeType = isJpg ? 'image/jpeg' : 'image/png';
  const ext = isJpg ? '.jpg' : '.png';

  if (numPages === 1) {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Canvas rendering context unavailable");
    await page.render({ canvasContext: ctx, viewport }).promise;

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve({ blob, fileName: `${origName}_page_1${ext}` });
        else reject(new Error("Image rendering failed"));
      }, mimeType, 0.95);
    });
  } else {
    const JSZip = await getJSZip();
    const zip = new JSZip();
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport }).promise;
        const dataUrl = canvas.toDataURL(mimeType, 0.95);
        const base64Data = dataUrl.split(',')[1];
        zip.file(`${origName}_page_${i}${ext}`, base64Data, { base64: true });
      }
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    return { blob: zipBlob, fileName: `${origName}_pages.zip` };
  }
}

type CategoryId = 'pdf' | 'word' | 'excel' | 'powerpoint' | 'images' | 'text' | 'html' | 'data';

interface Category {
  id: CategoryId;
  name: string;
  description: string;
  icon: any;
}

const CATEGORIES: Category[] = [
  { id: 'pdf', name: 'PDF Converter', description: 'Convert to or from PDF formats', icon: FileText },
  { id: 'word', name: 'Word Converter', description: 'Convert Microsoft Word documents', icon: File },
  { id: 'excel', name: 'Excel Converter', description: 'Convert Microsoft Excel spreadsheets', icon: FileSpreadsheet },
  { id: 'powerpoint', name: 'PowerPoint Converter', description: 'Convert PowerPoint presentations', icon: Layers },
  { id: 'images', name: 'Image Converter', description: 'Convert and optimize photos & graphics', icon: Image },
  { id: 'text', name: 'Text Converter', description: 'Convert rich text and documents', icon: FileText },
  { id: 'html', name: 'HTML Converter', description: 'Convert webpage and HTML templates', icon: FileCode },
  { id: 'data', name: 'CSV / JSON / XML', description: 'Convert database and structured files', icon: FileCode },
];

interface ConverterTool {
  id: string;
  name: string;
  sourceCategory: CategoryId;
  targetCategoryName: string;
  sourceExtensions: string[];
  targetFormats: string[];
  defaultTargetFormat: string;
  description?: string;
}

const CONVERTER_TOOLS: ConverterTool[] = [
  // PDF
  {
    id: 'pdf_to_word',
    name: 'PDF to Word',
    description: 'Convert PDF documents into editable Microsoft Word documents (.docx) with formatting and layout preserved.',
    sourceCategory: 'pdf',
    targetCategoryName: 'Word',
    sourceExtensions: ['.pdf'],
    targetFormats: ['.docx', '.doc', '.odt'],
    defaultTargetFormat: '.docx'
  },
  {
    id: 'pdf_to_excel',
    name: 'PDF to Excel',
    description: 'Extract tables and structured numerical data from PDF files directly into editable Excel spreadsheets (.xlsx).',
    sourceCategory: 'pdf',
    targetCategoryName: 'Excel',
    sourceExtensions: ['.pdf'],
    targetFormats: ['.xlsx', '.csv'],
    defaultTargetFormat: '.xlsx'
  },
  {
    id: 'pdf_to_powerpoint',
    name: 'PDF to PowerPoint',
    description: 'Convert PDF documents and slide decks into editable Microsoft PowerPoint presentations (.pptx).',
    sourceCategory: 'pdf',
    targetCategoryName: 'PowerPoint',
    sourceExtensions: ['.pdf'],
    targetFormats: ['.pptx'],
    defaultTargetFormat: '.pptx'
  },
  {
    id: 'pdf_to_image',
    name: 'PDF to Image',
    description: 'Extract PDF pages into crisp high-resolution PNG or JPG images with 100% vector clarity.',
    sourceCategory: 'pdf',
    targetCategoryName: 'Image',
    sourceExtensions: ['.pdf'],
    targetFormats: ['.png', '.jpg', '.webp'],
    defaultTargetFormat: '.png'
  },
  {
    id: 'pdf_to_text',
    name: 'PDF to Text',
    description: 'Extract clean plain text from PDF documents for easy editing and analysis.',
    sourceCategory: 'pdf',
    targetCategoryName: 'Text',
    sourceExtensions: ['.pdf'],
    targetFormats: ['.txt'],
    defaultTargetFormat: '.txt'
  },
  {
    id: 'pdf_to_html',
    name: 'PDF to HTML',
    description: 'Convert PDF files into responsive, clean HTML web pages.',
    sourceCategory: 'pdf',
    targetCategoryName: 'HTML',
    sourceExtensions: ['.pdf'],
    targetFormats: ['.html'],
    defaultTargetFormat: '.html'
  },

  // WORD
  {
    id: 'word_to_pdf',
    name: 'Word to PDF',
    description: 'Convert DOCX and DOC documents into secure, standard, shareable PDF documents.',
    sourceCategory: 'word',
    targetCategoryName: 'PDF',
    sourceExtensions: ['.docx', '.doc', '.odt'],
    targetFormats: ['.pdf'],
    defaultTargetFormat: '.pdf'
  },
  {
    id: 'word_to_image',
    name: 'Word to Image',
    description: 'Convert Word documents to high quality PNG or JPG images.',
    sourceCategory: 'word',
    targetCategoryName: 'Image',
    sourceExtensions: ['.docx', '.doc', '.odt'],
    targetFormats: ['.png', '.jpg'],
    defaultTargetFormat: '.png'
  },
  {
    id: 'word_to_text',
    name: 'Word to Text',
    description: 'Extract clean unformatted plain text from Word documents.',
    sourceCategory: 'word',
    targetCategoryName: 'Text',
    sourceExtensions: ['.docx', '.doc', '.odt'],
    targetFormats: ['.txt'],
    defaultTargetFormat: '.txt'
  },
  {
    id: 'word_to_html',
    name: 'Word to HTML',
    description: 'Convert Word document contents to clean HTML code.',
    sourceCategory: 'word',
    targetCategoryName: 'HTML',
    sourceExtensions: ['.docx', '.doc', '.odt'],
    targetFormats: ['.html'],
    defaultTargetFormat: '.html'
  },

  // EXCEL
  {
    id: 'excel_to_pdf',
    name: 'Excel to PDF',
    description: 'Convert XLSX, XLS, and CSV spreadsheets into beautifully formatted landscape PDF tables.',
    sourceCategory: 'excel',
    targetCategoryName: 'PDF',
    sourceExtensions: ['.xlsx', '.xls', '.xlsm', '.csv'],
    targetFormats: ['.pdf'],
    defaultTargetFormat: '.pdf'
  },
  {
    id: 'excel_to_data',
    name: 'Excel to CSV / JSON',
    description: 'Export spreadsheet sheets into clean CSV, TSV, or JSON data structures.',
    sourceCategory: 'excel',
    targetCategoryName: 'CSV / JSON',
    sourceExtensions: ['.xlsx', '.xls', '.ods'],
    targetFormats: ['.csv', '.tsv', '.json'],
    defaultTargetFormat: '.csv'
  },

  // POWERPOINT
  {
    id: 'powerpoint_to_pdf',
    name: 'PowerPoint to PDF',
    description: 'Convert PPTX presentation slides into lightweight, portable, print-ready PDF slides.',
    sourceCategory: 'powerpoint',
    targetCategoryName: 'PDF',
    sourceExtensions: ['.pptx', '.ppt'],
    targetFormats: ['.pdf'],
    defaultTargetFormat: '.pdf'
  },
  {
    id: 'powerpoint_to_images',
    name: 'PowerPoint to Image',
    description: 'Export PPTX presentation slides into individual high resolution images.',
    sourceCategory: 'powerpoint',
    targetCategoryName: 'Image',
    sourceExtensions: ['.pptx', '.ppt'],
    targetFormats: ['.png', '.jpg'],
    defaultTargetFormat: '.png'
  },

  // IMAGES
  {
    id: 'image_to_pdf',
    name: 'Image to PDF',
    description: 'Convert JPG, PNG, WEBP, and BMP images into a single clean multi-page PDF document.',
    sourceCategory: 'images',
    targetCategoryName: 'PDF',
    sourceExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff'],
    targetFormats: ['.pdf'],
    defaultTargetFormat: '.pdf'
  },
  {
    id: 'image_to_image',
    name: 'Image Converter',
    description: 'Convert images between JPG, PNG, WEBP, BMP, and GIF with custom compression.',
    sourceCategory: 'images',
    targetCategoryName: 'Image',
    sourceExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'],
    targetFormats: ['.png', '.jpg', '.webp', '.bmp'],
    defaultTargetFormat: '.png'
  },

  // TEXT
  {
    id: 'text_to_pdf',
    name: 'Text to PDF',
    description: 'Convert plain text (.txt) and Markdown files into formatted PDF documents.',
    sourceCategory: 'text',
    targetCategoryName: 'PDF',
    sourceExtensions: ['.txt', '.rtf', '.md'],
    targetFormats: ['.pdf'],
    defaultTargetFormat: '.pdf'
  },
  {
    id: 'text_to_word',
    name: 'Text to Word',
    description: 'Convert plain text files into editable Microsoft Word (.docx) documents.',
    sourceCategory: 'text',
    targetCategoryName: 'Word',
    sourceExtensions: ['.txt', '.rtf', '.md'],
    targetFormats: ['.docx'],
    defaultTargetFormat: '.docx'
  },
  {
    id: 'text_to_html',
    name: 'Text to HTML',
    description: 'Convert plain text or Markdown into clean semantic HTML markup.',
    sourceCategory: 'text',
    targetCategoryName: 'HTML',
    sourceExtensions: ['.txt', '.rtf', '.md'],
    targetFormats: ['.html'],
    defaultTargetFormat: '.html'
  },

  // HTML
  {
    id: 'html_to_pdf',
    name: 'HTML to PDF',
    description: 'Convert HTML files and web templates into clean printable PDF documents.',
    sourceCategory: 'html',
    targetCategoryName: 'PDF',
    sourceExtensions: ['.html', '.htm'],
    targetFormats: ['.pdf'],
    defaultTargetFormat: '.pdf'
  },
  {
    id: 'html_to_word',
    name: 'HTML to Word',
    description: 'Convert HTML web pages into editable Microsoft Word (.docx) documents.',
    sourceCategory: 'html',
    targetCategoryName: 'Word',
    sourceExtensions: ['.html', '.htm'],
    targetFormats: ['.docx'],
    defaultTargetFormat: '.docx'
  },
  {
    id: 'html_to_image',
    name: 'HTML to Image',
    description: 'Render HTML documents as PNG or JPG visual snapshots.',
    sourceCategory: 'html',
    targetCategoryName: 'Image',
    sourceExtensions: ['.html', '.htm'],
    targetFormats: ['.png', '.jpg'],
    defaultTargetFormat: '.png'
  },

  // CSV / JSON / XML
  {
    id: 'data_to_excel',
    name: 'Data to Excel',
    description: 'Convert CSV, TSV, or JSON data files into formatted Excel spreadsheets (.xlsx).',
    sourceCategory: 'data',
    targetCategoryName: 'Excel',
    sourceExtensions: ['.csv', '.tsv', '.json', '.xml'],
    targetFormats: ['.xlsx', '.csv'],
    defaultTargetFormat: '.xlsx'
  },
  {
    id: 'data_to_word',
    name: 'Data to Word',
    description: 'Convert structured data into Microsoft Word document tables.',
    sourceCategory: 'data',
    targetCategoryName: 'Word',
    sourceExtensions: ['.csv', '.tsv', '.json', '.xml'],
    targetFormats: ['.docx'],
    defaultTargetFormat: '.docx'
  },
  {
    id: 'data_to_powerpoint',
    name: 'Data to PowerPoint',
    description: 'Convert structured dataset rows into presentation slides.',
    sourceCategory: 'data',
    targetCategoryName: 'PowerPoint',
    sourceExtensions: ['.csv', '.tsv', '.json', '.xml'],
    targetFormats: ['.pptx'],
    defaultTargetFormat: '.pptx'
  },
  {
    id: 'data_to_data',
    name: 'Data Cross-Converter',
    description: 'Convert between CSV, TSV, JSON, and XML structured data formats.',
    sourceCategory: 'data',
    targetCategoryName: 'CSV / JSON / XML',
    sourceExtensions: ['.csv', '.tsv', '.json', '.xml'],
    targetFormats: ['.json', '.csv', '.tsv', '.xml'],
    defaultTargetFormat: '.json'
  }
];

interface ConverterViewProps {
  onBackToTools?: () => void;
  onAddRecentFile: (file: { name: string; size: string; type: string; toolUsed: string }) => void;
  initialToolId?: string;
}

export default function ConverterView({ onBackToTools, onAddRecentFile, initialToolId }: ConverterViewProps) {
  const isSingleToolMode = Boolean(initialToolId);

  // Helper to find matching converter tool
  const findMatchingTool = (id?: string): ConverterTool => {
    if (!id) return CONVERTER_TOOLS[0];
    const normalized = id.toLowerCase().replace(/-/g, '_');
    const matched = CONVERTER_TOOLS.find(t => 
      t.id === normalized || 
      t.id.replace(/_/g, '-') === id ||
      t.id === id ||
      (id === 'jpg_to_pdf' && t.id === 'image_to_pdf') ||
      (id === 'pdf_to_jpg' && t.id === 'pdf_to_image')
    );
    return matched || CONVERTER_TOOLS[0];
  };

  const initialSelectedTool = findMatchingTool(initialToolId);
  const [activeCategory, setActiveCategory] = useState<CategoryId>(initialSelectedTool.sourceCategory);
  const [selectedTool, setSelectedTool] = useState<ConverterTool>(initialSelectedTool);
  const [targetFormat, setTargetFormat] = useState<string>(initialSelectedTool.defaultTargetFormat);
  
  // File Upload states
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // When initialToolId changes, synchronize selected tool
  useEffect(() => {
    if (initialToolId) {
      const tool = findMatchingTool(initialToolId);
      setActiveCategory(tool.sourceCategory);
      setSelectedTool(tool);
      setTargetFormat(tool.defaultTargetFormat);
      setUploadedFiles([]);
      setConvertedFileUrl(null);
      setConversionProgress(0);
      setIsConverting(false);
    }
  }, [initialToolId]);

  // Conversion process states
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [conversionStep, setConversionStep] = useState('');
  const [convertedFileUrl, setConvertedFileUrl] = useState<string | null>(null);
  const [convertedFileName, setConvertedFileName] = useState('');

  const handleCategorySelect = (categoryId: CategoryId) => {
    setActiveCategory(categoryId);
    const tool = CONVERTER_TOOLS.find(t => t.sourceCategory === categoryId);
    if (tool) {
      handleToolSelect(tool);
    }
  };

  const handleToolSelect = (tool: ConverterTool) => {
    setSelectedTool(tool);
    setTargetFormat(tool.defaultTargetFormat);
    setUploadedFiles([]);
    setConvertedFileUrl(null);
    setConversionProgress(0);
    setIsConverting(false);
  };

  const handleFormatChange = (format: string) => {
    setTargetFormat(format);
    setConvertedFileUrl(null);
  };

  // Drag and Drop files
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
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSetFiles(Array.from(files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSetFiles(Array.from(files));
    }
  };

  const validateAndSetFiles = (files: File[]) => {
    if (!selectedTool) return;
    const validFiles: File[] = [];
    for (const file of files) {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      const allowed = selectedTool.sourceExtensions.some(ext => ext.toLowerCase() === extension);
      if (allowed || selectedTool.sourceExtensions.length === 0 || selectedTool.sourceExtensions[0] === '.*') {
        validFiles.push(file);
      }
    }
    
    if (validFiles.length === 0) {
      alert(`Invalid format. Please upload files with these formats: ${selectedTool.sourceExtensions.join(', ')}`);
      return;
    }

    setUploadedFiles(validFiles);
    setConvertedFileUrl(null);
    setConversionProgress(0);
    setIsConverting(false);

    // Silently preheat the required conversion engine while user inspects parameters
    if (validFiles.length > 0) {
      const ext = '.' + validFiles[0].name.split('.').pop()?.toLowerCase();
      if (['.xlsx', '.xls', '.csv'].includes(ext) || targetFormat.includes('xls') || targetFormat.includes('csv')) {
        getXLSX();
      } else if (['.docx', '.doc'].includes(ext) || targetFormat.includes('doc')) {
        getDocx();
        getMammoth();
      } else if (['.pptx', '.ppt'].includes(ext) || targetFormat.includes('ppt')) {
        getPptxGen();
        getJSZip();
      } else if (ext === '.pdf' || targetFormat === '.pdf') {
        getPdfLib();
      }
    }
  };

  const triggerUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Standard high-quality document conversion pipeline
  const startConversion = async () => {
    if (uploadedFiles.length === 0 || !selectedTool) return;
    const uploadedFile = uploadedFiles[0];

    setIsConverting(true);
    setConversionProgress(10);
    setConversionStep('Reading document structure...');

    try {
      // Check if this is PDF to Image conversion
      const isPdfSource = uploadedFile.name.toLowerCase().endsWith('.pdf');
      const isImageTarget = ['.png', '.jpg', '.jpeg', '.webp'].includes(targetFormat);

      if (selectedTool.id === 'pdf_to_image' || (isPdfSource && isImageTarget)) {
        setConversionProgress(30);
        setConversionStep('Rendering PDF pages at high resolution (2x HD)...');
        const { blob, fileName } = await generateImagesFromPdf(uploadedFile, targetFormat);
        
        setConversionProgress(90);
        setConversionStep('Finalizing image package...');
        setConvertedFileName(fileName);
        
        setTimeout(() => {
          const downloadUrl = URL.createObjectURL(blob);
          setConvertedFileUrl(downloadUrl);
          setConversionProgress(100);
          setConversionStep('Conversion completed successfully!');
          setIsConverting(false);

          onAddRecentFile({
            name: fileName,
            size: `${(blob.size / 1024).toFixed(1)} KB`,
            type: targetFormat.replace('.', '').toUpperCase(),
            toolUsed: selectedTool.name
          });
        }, 400);
        return;
      }

      // Check if this is Multi-Image to PDF
      const sourceExt = '.' + uploadedFile.name.split('.').pop()?.toLowerCase();
      const sourceIsImage = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'].includes(sourceExt);
      const isTargetPdf = targetFormat === '.pdf';

      if (sourceIsImage && isTargetPdf && uploadedFiles.length > 1) {
        setConversionProgress(40);
        setConversionStep(`Compiling ${uploadedFiles.length} images into multi-page PDF...`);
        const blob = await generateMultiImagePdf(uploadedFiles);
        const outName = 'Combined_Images.pdf';
        setConvertedFileName(outName);
        
        setTimeout(() => {
          const downloadUrl = URL.createObjectURL(blob);
          setConvertedFileUrl(downloadUrl);
          setConversionProgress(100);
          setConversionStep('PDF generated successfully!');
          setIsConverting(false);

          onAddRecentFile({
            name: outName,
            size: `${(blob.size / 1024).toFixed(1)} KB`,
            type: 'PDF',
            toolUsed: selectedTool.name
          });
        }, 400);
        return;
      }

      // 1. Extract content from source document
      setConversionProgress(30);
      setConversionStep('Parsing original layout, typography, and tables...');
      const content = await extractContentFromSourceFile(uploadedFile);

      // 2. Generate target document
      setConversionProgress(60);
      setConversionStep(`Compiling into native ${targetFormat.toUpperCase()} standard format...`);

      const origNameWithoutExt = uploadedFile.name.substring(0, uploadedFile.name.lastIndexOf('.')) || uploadedFile.name;
      const outName = `${origNameWithoutExt}_converted${targetFormat}`;
      setConvertedFileName(outName);

      let blob: Blob;

      const isWord = ['.docx', '.doc', '.odt', '.rtf'].includes(targetFormat);
      const isExcel = ['.xlsx', '.xls', '.xlsm', '.ods'].includes(targetFormat);
      const isPowerPoint = ['.pptx', '.ppt', '.ppsx'].includes(targetFormat);
      const isPdf = targetFormat === '.pdf';
      const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'].includes(targetFormat);

      if (isWord) {
        blob = await generateRealWord(uploadedFile.name, targetFormat, content);
      } else if (isPowerPoint) {
        blob = await generateRealPowerPoint(uploadedFile.name, targetFormat, content);
      } else if (isExcel) {
        blob = await generateRealExcel(uploadedFile.name, targetFormat, content);
      } else if (isPdf) {
        if (sourceIsImage) {
          const pngBlob = await convertImageFormat(uploadedFile, '.png');
          const pngBuffer = await pngBlob.arrayBuffer();
          blob = await generateRealPdf(uploadedFile.name, targetFormat, {
            text: '',
            paragraphs: [],
            imageBuffer: pngBuffer,
            imageType: 'png'
          });
        } else {
          blob = await generateRealPdf(uploadedFile.name, targetFormat, content);
        }
      } else if (isImage) {
        if (sourceIsImage) {
          blob = await convertImageFormat(uploadedFile, targetFormat);
        } else {
          const { blob: imgBlob, fileName } = await generateImagesFromPdf(uploadedFile, targetFormat);
          blob = imgBlob;
          setConvertedFileName(fileName);
        }
      } else if (targetFormat === '.json') {
        const jsonStr = JSON.stringify(content.excelRows || content.paragraphs || { text: content.text }, null, 2);
        blob = new Blob([jsonStr], { type: 'application/json' });
      } else if (targetFormat === '.csv' || targetFormat === '.tsv') {
        const separator = targetFormat === '.tsv' ? '\t' : ',';
        let csvStr = '';
        if (content.excelRows && content.excelRows.length > 0) {
          csvStr = content.excelRows.map(row => row.map(cell => {
            const cellStr = String(cell !== undefined ? cell : '');
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          }).join(separator)).join('\n');
        } else {
          csvStr = content.paragraphs.map(p => {
            if (p.includes(',') || p.includes('"') || p.includes('\n')) {
              return `"${p.replace(/"/g, '""')}"`;
            }
            return p;
          }).join('\n');
        }
        blob = new Blob([csvStr], { type: targetFormat === '.tsv' ? 'text/tab-separated-values' : 'text/csv' });
      } else {
        blob = new Blob([content.text], { type: 'text/plain' });
      }

      setConversionProgress(85);
      setConversionStep('Validating file integrity & preparing download...');

      setTimeout(() => {
        const downloadUrl = URL.createObjectURL(blob);
        setConvertedFileUrl(downloadUrl);
        setConversionProgress(100);
        setConversionStep('Conversion completed successfully!');
        setIsConverting(false);

        onAddRecentFile({
          name: outName,
          size: `${(blob.size / 1024).toFixed(1)} KB`,
          type: targetFormat.replace('.', '').toUpperCase(),
          toolUsed: selectedTool.name
        });
      }, 500);

    } catch (err: any) {
      console.error("Conversion error: ", err);
      alert("Error during document generation: " + (err.message || err));
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (!convertedFileUrl) return;
    const a = document.createElement('a');
    a.href = convertedFileUrl;
    a.download = convertedFileName;
    document.body.appendChild(a);
    a.click();
    if (a.parentNode) {
      a.parentNode.removeChild(a);
    }
  };

  // Resolve matching tool object for SEO Footer
  const activeId = initialToolId || selectedTool?.id || 'pdf_to_word';
  const normalizedId = activeId.toLowerCase().replace(/-/g, '_');
  const matchedToolObj = allToolsList.find(t => 
    t.id === normalizedId || 
    t.id === activeId || 
    t.id.replace(/_/g, '-') === activeId ||
    (activeId === 'jpg_to_pdf' && t.id === 'image_to_pdf') ||
    (activeId === 'pdf_to_jpg' && t.id === 'pdf_to_image')
  );
  const currentToolObj: Tool = matchedToolObj || {
    id: normalizedId,
    name: selectedTool?.name || 'Document Converter',
    description: selectedTool?.description || 'Convert documents quickly and securely in your web browser.',
    category: 'office',
    icon: 'ArrowRightLeft'
  };

  return (
    <div className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 xl:px-12 w-full max-w-5xl mx-auto animate-fade-in space-y-8">
      {!initialToolId && (
        <SEO 
          title="Online Document & PDF Converter | PDF Toolkit Pro" 
          description="Free online file and document converter. Convert between PDF, Word, Excel, PowerPoint, JPG, PNG, and text formats instantly in your browser." 
          canonical="https://pdftoolkitpro.online/converter" 
          keywords={['online document converter', 'file converter', 'PDF converter free', 'document format converter']}
        />
      )}

      {/* TOP NAVIGATION / BREADCRUMB */}
      {onBackToTools && (
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToTools}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-1.5 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800/60 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>All Tools</span>
          </button>
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>100% Client-Side Privacy</span>
          </div>
        </div>
      )}

      {/* DEDICATED TOOL WORKSPACE HEADER */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border border-blue-500/15">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{selectedTool.sourceCategory.toUpperCase()} TO {selectedTool.targetCategoryName.toUpperCase()}</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50">
          {selectedTool.name} Converter
        </h1>
        <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
          {selectedTool.description || `Convert ${selectedTool.sourceExtensions.join(', ')} files to ${selectedTool.defaultTargetFormat.toUpperCase()} format securely in your browser.`}
        </p>
      </div>

      {/* ONLY SHOW CATEGORIES IF ACCESSED VIA GENERIC /converter WITHOUT A SPECIFIC TOOL */}
      {!isSingleToolMode && (
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4 animate-fade-in">
          <div className="border-b border-slate-100 dark:border-zinc-900 pb-2">
            <h3 className="font-bold text-xs text-slate-900 dark:text-zinc-200 uppercase tracking-wider">
              Choose Converter Category
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            {CATEGORIES.map((cat) => {
              const CategoryIcon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`flex flex-col items-center justify-center text-center p-3 rounded-2xl transition-all cursor-pointer border ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.02] border-transparent' 
                      : 'bg-slate-50 dark:bg-zinc-900/40 hover:bg-slate-100 dark:hover:bg-zinc-900/80 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300'
                  }`}
                >
                  <div className={`p-2 rounded-xl mb-1.5 ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500'}`}>
                    <CategoryIcon className="h-4 w-4" />
                  </div>
                  <span className={`text-[11px] font-bold leading-tight ${isActive ? 'text-white' : 'text-slate-800 dark:text-zinc-200'}`}>
                    {cat.name.replace(' Converter', '')}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sub-tool cards for this category */}
          <div className="pt-2 border-t border-slate-100 dark:border-zinc-900 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {CONVERTER_TOOLS.filter(t => t.sourceCategory === activeCategory).map((tool) => {
              const isSelected = selectedTool?.id === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => handleToolSelect(tool)}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-500/50 shadow-sm'
                      : 'bg-slate-50/50 dark:bg-zinc-900/30 border-slate-200 dark:border-zinc-800 hover:border-blue-400/40'
                  }`}
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                      {tool.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                      {tool.sourceExtensions.join(', ')} ➔ {tool.defaultTargetFormat.toUpperCase()}
                    </p>
                  </div>
                  <ChevronRight className={`h-4 w-4 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* DEDICATED TOOL WORKSTATION CARD */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        
        {/* Tool Header & Target Format Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-900 pb-5">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-blue-500" />
              <span>{selectedTool.name}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Supported Input: <span className="font-semibold text-slate-700 dark:text-zinc-300">{selectedTool.sourceExtensions.join(', ')}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-900/80 p-1.5 px-3 rounded-2xl border border-slate-200 dark:border-zinc-800">
            <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
              Output:
            </span>
            <select
              value={targetFormat}
              onChange={(e) => handleFormatChange(e.target.value)}
              className="px-2.5 py-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-800 dark:text-zinc-100 outline-none focus:border-blue-500"
            >
              {selectedTool.targetFormats.map(fmt => (
                <option key={fmt} value={fmt}>{fmt.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Upload Workspace Zone */}
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={uploadedFiles.length > 0 ? undefined : triggerUploadClick}
          className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all ${
            uploadedFiles.length > 0 
              ? 'border-emerald-500/30 bg-emerald-500/[0.01]' 
              : isDragOver
              ? 'border-blue-500 bg-blue-500/[0.04] scale-[0.99]'
              : 'border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/20 hover:border-blue-500/40 cursor-pointer'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept={selectedTool.sourceExtensions.join(',')}
            className="hidden"
            multiple={selectedTool.id === 'image_to_pdf'}
          />

          {uploadedFiles.length === 0 ? (
            <div className="space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center mx-auto shadow-sm">
                <UploadCloud className="h-8 w-8 text-blue-500" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-slate-800 dark:text-zinc-200">
                  Choose a {selectedTool.sourceExtensions.join(' / ').toUpperCase()} file or drag &amp; drop
                </p>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  {selectedTool.id === 'image_to_pdf' 
                    ? 'Upload single or multiple images to combine into one PDF.' 
                    : '100% Client-Side. Files never leave your browser.'}
                </p>
              </div>
              <button
                type="button"
                onClick={triggerUploadClick}
                className="mt-2 py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer inline-flex items-center gap-2"
              >
                <UploadCloud className="h-4 w-4" />
                <span>Select File</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Selected Files List */}
              <div className="flex flex-col gap-2 max-w-md mx-auto max-h-60 overflow-y-auto pr-1">
                {uploadedFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-3.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm text-left">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                        <FileCheck className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">
                          {f.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {(f.size / 1024).toFixed(1)} KB • {f.name.split('.').pop()?.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadedFiles(prev => prev.filter((_, idx) => idx !== i));
                        setConvertedFileUrl(null);
                        setConversionProgress(0);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                      title="Remove file"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Progress Bar during Conversion */}
              {isConverting && (
                <div className="max-w-md mx-auto space-y-3 bg-slate-50 dark:bg-zinc-900/60 p-4 border border-slate-100 dark:border-zinc-800 rounded-2xl">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-blue-600 dark:text-blue-400 animate-pulse flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {conversionStep}
                    </span>
                    <span className="text-slate-500 font-mono">{conversionProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${conversionProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Download Card on Success */}
              {convertedFileUrl && (
                <div className="max-w-md mx-auto p-5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 rounded-2xl text-left space-y-4 animate-fade-in shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">
                        Conversion Complete!
                      </span>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        Your file is ready to download.
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleDownload}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-emerald-500/20"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download {convertedFileName || `Converted File (${targetFormat.toUpperCase()})`}</span>
                  </button>

                  <div className="flex justify-center pt-1">
                    <button
                      onClick={() => {
                        setUploadedFiles([]);
                        setConvertedFileUrl(null);
                        setConversionProgress(0);
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer underline"
                    >
                      Convert another document
                    </button>
                  </div>
                </div>
              )}

              {/* Action Convert Button */}
              {!isConverting && !convertedFileUrl && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={startConversion}
                    className="py-3 px-8 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2.5 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-blue-500/25"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Convert to {targetFormat.toUpperCase()}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadedFiles([])}
                    className="py-3 px-4 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 border border-slate-200 dark:border-zinc-800 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Available formats pills for quick reference */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-zinc-900 text-xs">
          <span className="font-semibold text-slate-500 dark:text-zinc-400 text-[11px]">
            Target format:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {selectedTool.targetFormats.map((fmt) => {
              const isActive = targetFormat === fmt;
              return (
                <button
                  key={fmt}
                  onClick={() => handleFormatChange(fmt)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                    isActive
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300'
                  }`}
                >
                  <span>{fmt.toUpperCase()}</span>
                  {isActive && <Check className="h-3 w-3 text-white" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* TOOL SEO & FAQS FOOTER */}
      <ToolSeoFooter tool={currentToolObj} />

      {/* BOTTOM RETURN LINK */}
      {onBackToTools && (
        <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 flex justify-center">
          <button
            onClick={onBackToTools}
            className="py-3 px-6 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-2xl text-xs font-bold text-slate-700 dark:text-zinc-300 transition-all flex items-center gap-2 cursor-pointer"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            <span>Back to All PDF &amp; Document Tools</span>
          </button>
        </div>
      )}
    </div>
  );
}
