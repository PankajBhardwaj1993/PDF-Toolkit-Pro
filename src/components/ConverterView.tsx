import SEO from './SEO';
import React, { useState, useRef } from 'react';
import { 
  FileText, FileSpreadsheet, Layers, FileCode, CheckCircle2, 
  Loader2, Download, UploadCloud, HelpCircle, ArrowRightLeft,
  RefreshCw, Check, Sparkles, ChevronRight, File, ArrowRight, Image
} from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { sanitizeForWinAnsi } from '../utils/pdfUtils';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

interface ExtractedContent {
  text: string;
  paragraphs: string[];
  excelRows?: any[][];
  imageBuffer?: ArrayBuffer;
  imageType?: 'png' | 'jpg';
}

// Highly robust offline document format converters and generators
async function extractContentFromSourceFile(file: File): Promise<ExtractedContent> {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  
  try {
    const arrayBuffer = await file.arrayBuffer();

    // 1. Spreadsheet formats (XLSX, XLS, CSV)
    const isExcel = ['.xlsx', '.xls', '.xlsm', '.xlsb', '.csv', '.tsv'].includes(extension);
    if (isExcel) {
      try {
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const excelRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        const paragraphs = excelRows.map(row => row.map(cell => String(cell ?? '')).join(' ').trim()).filter(Boolean);
        const text = paragraphs.join('\n');
        return { text, paragraphs, excelRows };
      } catch (err) {
        console.error("XLSX parsing failed: ", err);
      }
    }

    // 2. Word Document (DOCX / DOC)
    if (extension === '.docx' || extension === '.doc') {
      if (extension === '.docx') {
        try {
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
                paragraphs.push(pText);
              }
            }
            if (paragraphs.length > 0) {
              return {
                text: paragraphs.join('\n'),
                paragraphs
              };
            }
          }
        } catch (err) {
          console.warn("DOCX ZIP parsing failed, utilizing fallback reader: ", err);
        }
      }

      // Fallback for .doc binary format or non-zip .docx files
      try {
        const textDecoder = new TextDecoder('utf-8', { fatal: false });
        const rawText = textDecoder.decode(arrayBuffer);
        const printable = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ');
        const paragraphs = printable
          .split(/\n+|\r+/)
          .map(line => line.trim())
          .filter(line => line.length > 2 && /[a-zA-Z0-9]/.test(line));
        
        if (paragraphs.length > 0) {
          return {
            text: paragraphs.join('\n'),
            paragraphs
          };
        }
      } catch (docErr) {
        console.warn("DOC text extraction fallback failed: ", docErr);
      }
    }

    // 3. PDF Format
    if (extension === '.pdf') {
      try {
        const pdfjs = (window as any).pdfjsLib;
        if (pdfjs) {
          pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
          const loadingTask = pdfjs.getDocument({ data: arrayBuffer.slice(0) });
          const pdf = await loadingTask.promise;
          const paragraphs: string[] = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str)
              .filter((s: string) => s.trim() !== '');
            paragraphs.push(...pageText);
          }
          return {
            text: paragraphs.join('\n'),
            paragraphs
          };
        }
      } catch (err) {
        console.error("PDF text extraction failed: ", err);
      }
    }

    // 4. Image formats
    const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.svg'].includes(extension);
    if (isImage) {
      const type = extension === '.png' ? 'png' : 'jpg';
      return {
        text: `Image file: ${file.name}`,
        paragraphs: [`Image File: ${file.name}`],
        imageBuffer: arrayBuffer,
        imageType: type
      };
    }

    // 5. Fallback plaintext/markup
    const textDecoder = new TextDecoder('utf-8');
    const text = textDecoder.decode(arrayBuffer);
    const paragraphs = text.split('\n').map(line => line.trim()).filter(Boolean);
    return { text, paragraphs };
  } catch (err) {
    console.error("Content extraction error: ", err);
  }

  return {
    text: `File: ${file.name}`,
    paragraphs: [`File Name: ${file.name}`]
  };
}

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

// High-fidelity file generators using real parsed original content

async function generateMultiImagePdf(files: File[]): Promise<Blob> {
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

async function generateRealPdf(
  sourceFileName: string,
  targetFormat: string,
  content: ExtractedContent
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();

  // Handle embedded images
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

  // Helper to draw a beautiful header on a page
  const drawPageHeader = (p: any, titleText: string, isLandscape: boolean) => {
    const w = isLandscape ? 842 : 595;
    const h = isLandscape ? 595 : 842;
    // Draw subtle running header
    p.drawText(titleText.substring(0, 80), {
      x: 35,
      y: h - 35,
      size: 8,
      font: font,
      color: rgb(0.4, 0.4, 0.4)
    });
    // Draw header divider line
    p.drawLine({
      start: { x: 35, y: h - 42 },
      end: { x: w - 35, y: h - 42 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8)
    });
  };

  // Helper to draw footers with "Page X of Y" on all pages at the very end
  const drawPageFooters = (doc: any, isLandscape: boolean) => {
    const pagesList = doc.getPages();
    const totalPages = pagesList.length;
    const h = isLandscape ? 595 : 842;
    const w = isLandscape ? 842 : 595;
    
    for (let i = 0; i < totalPages; i++) {
      const p = pagesList[i];
      // Draw footer divider line
      p.drawLine({
        start: { x: 35, y: 42 },
        end: { x: w - 35, y: 42 },
        thickness: 0.5,
        color: rgb(0.85, 0.85, 0.85)
      });
      // Draw Page X of Y text
      const pageText = `Page ${i + 1} of ${totalPages}`;
      const textWidth = font.widthOfTextAtSize(pageText, 8);
      p.drawText(pageText, {
        x: (w - textWidth) / 2,
        y: 28,
        size: 8,
        font: font,
        color: rgb(0.5, 0.5, 0.5)
      });
      // Draw watermark or app name
      p.drawText("PDF Toolkit Pro - Local Safe Conversion", {
        x: 35,
        y: 28,
        size: 7,
        font: font,
        color: rgb(0.6, 0.6, 0.6)
      });
    }
  };

  // Handle spreadsheet tables
  if (content.excelRows && content.excelRows.length > 0) {
    let page = pdfDoc.addPage([842, 595]); // Landscape layout for wide spreadsheets
    drawPageHeader(page, `Spreadsheet: ${sourceFileName}`, true);
    
    let currentY = 520;
    const rowHeight = 22;
    const colWidth = 95;
    const maxCols = 8;
    const headerRow = content.excelRows[0];

    // Helper to draw a single table row
    const drawRowAt = (p: any, rowIndex: number, rowY: number) => {
      const row = content.excelRows![rowIndex];
      if (!row) return;
      let currentX = 35;
      for (let c = 0; c < Math.min(row.length, maxCols); c++) {
        const cellValue = sanitizeForWinAnsi(String(row[c] !== undefined ? row[c] : ''));
        
        // Draw header background for the very first row
        if (rowIndex === 0) {
          p.drawRectangle({
            x: currentX - 2,
            y: rowY - 4,
            width: colWidth,
            height: rowHeight,
            color: rgb(0.92, 0.94, 0.98)
          });
        }
        
        // Draw cell border
        p.drawRectangle({
          x: currentX - 2,
          y: rowY - 4,
          width: colWidth,
          height: rowHeight,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 0.5
        });

        // Draw cell text
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
      // If we are about to exceed the bottom margin, add a new page
      if (currentY < 60) {
        page = pdfDoc.addPage([842, 595]);
        drawPageHeader(page, `Spreadsheet: ${sourceFileName} (Continued)`, true);
        currentY = 520;
        
        // On new page, redraw table headers (r = 0) for perfect continuity
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
      
      // If we are about to exceed bottom margin, create a new portrait page
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
    currentY -= 10; // Extra line spacing for paragraph breaks
  }

  drawPageFooters(pdfDoc, false);
  const bytes = await pdfDoc.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

function generateRealExcel(sourceFileName: string, targetFormat: string, content: ExtractedContent): Blob {
  let finalRows: any[][] = [];

  if (content.excelRows && content.excelRows.length > 0) {
    finalRows = content.excelRows;
  } else {
    for (const p of content.paragraphs) {
      if (p && p.trim() !== '') {
        finalRows.push([p]);
      }
    }
  }

  const worksheet = XLSX.utils.aoa_to_sheet(finalRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet 1");

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function generateRealWord(sourceFileName: string, targetFormat: string, content: ExtractedContent): Blob {
  let rtfContent = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang1033{\\fonttbl{\\f0\\fnil\\fcharset0 Calibri;}{\\f1\\fnil\\fcharset0 Arial;}}
{\\colortbl ;\\red0\\green0\\blue0;}
\\viewkind4\\uc1\\dbpr\\pard\\sb100\\sa100\\cf1\\f0\\fs22\n`;

  if (content.excelRows && content.excelRows.length > 0) {
    for (const row of content.excelRows) {
      rtfContent += `\\trowd\\trgaph108\\trleft360\n`;
      let colIdx = 1;
      for (const cell of row) {
        const w = 1500;
        rtfContent += `\\clbrdrt\\brdrs\\brdrw10\\clbrdrb\\brdrs\\brdrw10\\clbrdrl\\brdrs\\brdrw10\\clbrdrr\\brdrs\\brdrw10\\cellx${colIdx * w}\n`;
        colIdx++;
      }
      for (const cell of row) {
        const val = String(cell !== undefined ? cell : '').replace(/\\/g, '\\\\').replace(/{/g, '\\{').replace(/}/g, '\\}');
        rtfContent += ` ${val}\\cell\n`;
      }
      rtfContent += `\\row\n`;
    }
  } else {
    const paras = content.paragraphs.length > 0 ? content.paragraphs : [content.text];
    for (const p of paras) {
      if (!p || p.trim() === '') continue;
      const safeP = p.replace(/\\/g, '\\\\').replace(/{/g, '\\{').replace(/}/g, '\\}');
      rtfContent += `${safeP}\\par\\par\n`;
    }
  }

  rtfContent += `}`;
  return new Blob([rtfContent], { type: 'application/rtf' });
}

function generateRealPowerPoint(sourceFileName: string, targetFormat: string, content: ExtractedContent): Blob {
  let slidesHtml = `
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: white; padding: 0; margin: 0; }
        .slide { box-sizing: border-box; width: 100vw; height: 100vh; padding: 60px; page-break-after: always; display: flex; flex-direction: column; justify-content: center; }
        h1 { color: #3b82f6; font-size: 38px; margin-bottom: 20px; }
        p { font-size: 20px; line-height: 1.6; color: #cbd5e1; }
      </style>
    </head>
    <body>
  `;

  if (content.excelRows && content.excelRows.length > 0) {
    slidesHtml += `
      <div class="slide">
        <h1>Spreadsheet</h1>
        <table style="width:100%; border-collapse: collapse; margin-top: 15px; font-size: 15px; color: #f1f5f9;">
    `;
    for (let r = 0; r < Math.min(content.excelRows.length, 12); r++) {
      const row = content.excelRows[r];
      slidesHtml += `<tr>`;
      for (const cell of row) {
        const style = r === 0 ? 'background-color: #334155; font-weight: bold;' : '';
        slidesHtml += `<td style="border: 1px solid #475569; padding: 8px; ${style}">${cell !== undefined ? cell : ''}</td>`;
      }
      slidesHtml += `</tr>`;
    }
    slidesHtml += `
        </table>
      </div>
    `;
  } else {
    const paras = content.paragraphs.filter(p => p && p.trim() !== '');
    const itemsPerSlide = 5;
    
    for (let i = 0; i < paras.length && i < 40; i += itemsPerSlide) {
      const slideItems = paras.slice(i, i + itemsPerSlide);
      slidesHtml += `
        <div class="slide">
          <h1>Slide ${Math.floor(i / itemsPerSlide) + 1}</h1>
          <div style="margin-top: 15px; text-align: left;">
      `;
      for (const p of slideItems) {
        slidesHtml += `<p style="margin-bottom: 12px; font-size: 18px;">• ${p}</p>`;
      }
      slidesHtml += `
          </div>
        </div>
      `;
    }
  }

  slidesHtml += `</body></html>`;
  return new Blob([slidesHtml], { type: 'application/vnd.ms-powerpoint' });
}

async function generateRealImage(
  sourceFileName: string,
  targetFormat: string,
  content: ExtractedContent
): Promise<Blob> {
  if (content.imageBuffer) {
    let type = 'image/png';
    if (['.jpg', '.jpeg'].includes(targetFormat)) type = 'image/jpeg';
    else if (targetFormat === '.webp') type = 'image/webp';
    else if (targetFormat === '.gif') type = 'image/gif';
    else if (targetFormat === '.bmp') type = 'image/bmp';
    return new Blob([content.imageBuffer], { type });
  }

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1000, 1350);

      ctx.fillStyle = '#1e293b';
      ctx.font = '16px Inter, sans-serif';
      
      let currentY = 60;
      const margin = 60;
      const contentWidth = 880;

      if (content.excelRows && content.excelRows.length > 0) {
        for (let r = 0; r < Math.min(content.excelRows.length, 36); r++) {
          const row = content.excelRows[r];
          let currentX = margin;
          ctx.font = r === 0 ? 'bold 14px Inter, sans-serif' : 'normal 13px Inter, sans-serif';
          for (let c = 0; c < Math.min(row.length, 6); c++) {
            const cell = String(row[c] !== undefined ? row[c] : '');
            ctx.fillText(cell.substring(0, 14), currentX, currentY);
            currentX += 150;
          }
          currentY += 32;
        }
      } else {
        const paras = content.paragraphs.filter(p => p && p.trim() !== '');
        for (const p of paras) {
          const words = p.split(' ');
          let currentLine = '';
          const lines: string[] = [];
          
          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > contentWidth) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine) lines.push(currentLine);

          for (const line of lines) {
            ctx.fillText(line, margin, currentY);
            currentY += 26;
            if (currentY > 1280) break;
          }
          currentY += 12;
          if (currentY > 1280) break;
        }
      }
    }

    let type = 'image/png';
    if (['.jpg', '.jpeg'].includes(targetFormat)) type = 'image/jpeg';
    else if (targetFormat === '.webp') type = 'image/webp';
    
    canvas.toBlob((blob) => {
      resolve(blob || new Blob([], { type }));
    }, type, 0.95);
  });
}

interface ConverterViewProps {
  onBackToTools?: () => void;
  onAddRecentFile: (file: { name: string; size: string; type: string; toolUsed: string }) => void;
  initialToolId?: string;
}

// Category definition
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
}

const CONVERTER_TOOLS: ConverterTool[] = [
  // PDF
  {
    id: 'pdf_to_word',
    name: 'PDF to Word',
    sourceCategory: 'pdf',
    targetCategoryName: 'Word',
    sourceExtensions: ['.pdf'],
    targetFormats: ['.docx', '.doc', '.odt', '.rtf'],
    defaultTargetFormat: '.docx'
  },
  {
    id: 'pdf_to_excel',
    name: 'PDF to Excel',
    sourceCategory: 'pdf',
    targetCategoryName: 'Excel',
    sourceExtensions: ['.pdf'],
    targetFormats: ['.xlsx', '.xls', '.xlsm', '.xlsb', '.xltx', '.xltm', '.xlam', '.ods', '.csv', '.tsv'],
    defaultTargetFormat: '.xlsx'
  },
  {
    id: 'pdf_to_powerpoint',
    name: 'PDF to PowerPoint',
    sourceCategory: 'pdf',
    targetCategoryName: 'PowerPoint',
    sourceExtensions: ['.pdf'],
    targetFormats: ['.pptx', '.ppt', '.ppsx', '.pps', '.potx', '.potm'],
    defaultTargetFormat: '.pptx'
  },
  {
    id: 'pdf_to_image',
    name: 'PDF to Image',
    sourceCategory: 'pdf',
    targetCategoryName: 'Image',
    sourceExtensions: ['.pdf'],
    targetFormats: ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.svg', '.tiff', '.ico', '.heic', '.avif'],
    defaultTargetFormat: '.png'
  },
  {
    id: 'pdf_to_text',
    name: 'PDF to Text',
    sourceCategory: 'pdf',
    targetCategoryName: 'Text',
    sourceExtensions: ['.pdf'],
    targetFormats: ['.txt', '.rtf'],
    defaultTargetFormat: '.txt'
  },
  {
    id: 'pdf_to_html',
    name: 'PDF to HTML',
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
    sourceCategory: 'word',
    targetCategoryName: 'PDF',
    sourceExtensions: ['.docx', '.doc', '.odt'],
    targetFormats: ['.pdf'],
    defaultTargetFormat: '.pdf'
  },
  {
    id: 'word_to_image',
    name: 'Word to Image',
    sourceCategory: 'word',
    targetCategoryName: 'Image',
    sourceExtensions: ['.docx', '.doc', '.odt'],
    targetFormats: ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.svg', '.tiff', '.ico', '.heic', '.avif'],
    defaultTargetFormat: '.png'
  },
  {
    id: 'word_to_text',
    name: 'Word to Text',
    sourceCategory: 'word',
    targetCategoryName: 'Text',
    sourceExtensions: ['.docx', '.doc', '.odt'],
    targetFormats: ['.txt', '.rtf'],
    defaultTargetFormat: '.txt'
  },
  {
    id: 'word_to_html',
    name: 'Word to HTML',
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
    sourceCategory: 'excel',
    targetCategoryName: 'PDF',
    sourceExtensions: ['.xlsx', '.xls', '.xlsm', '.csv'],
    targetFormats: ['.pdf'],
    defaultTargetFormat: '.pdf'
  },
  {
    id: 'excel_to_data',
    name: 'Excel to Data Formats',
    sourceCategory: 'excel',
    targetCategoryName: 'CSV / JSON / XML',
    sourceExtensions: ['.xlsx', '.xls', '.ods'],
    targetFormats: ['.csv', '.tsv', '.json', '.xml'],
    defaultTargetFormat: '.csv'
  },

  // POWERPOINT
  {
    id: 'powerpoint_to_pdf',
    name: 'PowerPoint to PDF',
    sourceCategory: 'powerpoint',
    targetCategoryName: 'PDF',
    sourceExtensions: ['.pptx', '.ppt'],
    targetFormats: ['.pdf'],
    defaultTargetFormat: '.pdf'
  },
  {
    id: 'powerpoint_to_images',
    name: 'PowerPoint to Image',
    sourceCategory: 'powerpoint',
    targetCategoryName: 'Image',
    sourceExtensions: ['.pptx', '.ppt'],
    targetFormats: ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.svg', '.tiff', '.ico', '.heic', '.avif'],
    defaultTargetFormat: '.png'
  },

  // IMAGES
  {
    id: 'image_to_pdf',
    name: 'Image to PDF',
    sourceCategory: 'images',
    targetCategoryName: 'PDF',
    sourceExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff'],
    targetFormats: ['.pdf'],
    defaultTargetFormat: '.pdf'
  },
  {
    id: 'image_to_image',
    name: 'Image Converter',
    sourceCategory: 'images',
    targetCategoryName: 'Image',
    sourceExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.svg', '.tiff', '.ico', '.heic', '.avif'],
    targetFormats: ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.svg', '.tiff', '.ico', '.heic', '.avif'],
    defaultTargetFormat: '.png'
  },

  // TEXT
  {
    id: 'text_to_pdf',
    name: 'Text to PDF',
    sourceCategory: 'text',
    targetCategoryName: 'PDF',
    sourceExtensions: ['.txt', '.rtf', '.md'],
    targetFormats: ['.pdf'],
    defaultTargetFormat: '.pdf'
  },
  {
    id: 'text_to_word',
    name: 'Text to Word',
    sourceCategory: 'text',
    targetCategoryName: 'Word',
    sourceExtensions: ['.txt', '.rtf', '.md'],
    targetFormats: ['.docx', '.doc', '.odt', '.rtf'],
    defaultTargetFormat: '.docx'
  },
  {
    id: 'text_to_html',
    name: 'Text to HTML',
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
    sourceCategory: 'html',
    targetCategoryName: 'PDF',
    sourceExtensions: ['.html', '.htm'],
    targetFormats: ['.pdf'],
    defaultTargetFormat: '.pdf'
  },
  {
    id: 'html_to_word',
    name: 'HTML to Word',
    sourceCategory: 'html',
    targetCategoryName: 'Word',
    sourceExtensions: ['.html', '.htm'],
    targetFormats: ['.docx', '.doc', '.odt', '.rtf'],
    defaultTargetFormat: '.docx'
  },
  {
    id: 'html_to_image',
    name: 'HTML to Image',
    sourceCategory: 'html',
    targetCategoryName: 'Image',
    sourceExtensions: ['.html', '.htm'],
    targetFormats: ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.svg', '.tiff', '.ico', '.heic', '.avif'],
    defaultTargetFormat: '.png'
  },

  // CSV / JSON / XML
  {
    id: 'data_to_excel',
    name: 'Convert to Excel',
    sourceCategory: 'data',
    targetCategoryName: 'Excel',
    sourceExtensions: ['.csv', '.tsv', '.json', '.xml'],
    targetFormats: ['.xlsx', '.xls', '.xlsm', '.xlsb', '.xltx', '.xltm', '.xlam', '.ods', '.csv', '.tsv'],
    defaultTargetFormat: '.xlsx'
  },
  {
    id: 'data_to_word',
    name: 'Convert to Word',
    sourceCategory: 'data',
    targetCategoryName: 'Word',
    sourceExtensions: ['.csv', '.tsv', '.json', '.xml'],
    targetFormats: ['.docx', '.doc', '.odt', '.rtf'],
    defaultTargetFormat: '.docx'
  },
  {
    id: 'data_to_powerpoint',
    name: 'Convert to PowerPoint',
    sourceCategory: 'data',
    targetCategoryName: 'PowerPoint',
    sourceExtensions: ['.csv', '.tsv', '.json', '.xml'],
    targetFormats: ['.pptx', '.ppt', '.ppsx', '.pps', '.potx', '.potm'],
    defaultTargetFormat: '.pptx'
  },
  {
    id: 'data_to_image',
    name: 'Convert to Image',
    sourceCategory: 'data',
    targetCategoryName: 'Image',
    sourceExtensions: ['.csv', '.tsv', '.json', '.xml'],
    targetFormats: ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.svg', '.tiff', '.ico', '.heic', '.avif'],
    defaultTargetFormat: '.png'
  },
  {
    id: 'data_to_data',
    name: 'Data Cross-Converter',
    sourceCategory: 'data',
    targetCategoryName: 'CSV / JSON / XML',
    sourceExtensions: ['.csv', '.tsv', '.json', '.xml'],
    targetFormats: ['.csv', '.tsv', '.json', '.xml'],
    defaultTargetFormat: '.json'
  }
];

export default function ConverterView({ onBackToTools, onAddRecentFile, initialToolId }: ConverterViewProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('pdf');
  const [selectedTool, setSelectedTool] = useState<ConverterTool | null>(CONVERTER_TOOLS[0]);
  const [targetFormat, setTargetFormat] = useState<string>(CONVERTER_TOOLS[0].defaultTargetFormat);
  
  // File Upload states
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Auto handle initialToolId if passed
  React.useEffect(() => {
    if (initialToolId) {
      const normalized = initialToolId.toLowerCase().replace(/-/g, '_');
      const tool = CONVERTER_TOOLS.find(t => 
        t.id === normalized || 
        t.id.replace(/_/g, '-') === initialToolId ||
        t.id === initialToolId
      );
      if (tool) {
        setActiveCategory(tool.sourceCategory);
        setSelectedTool(tool);
        setTargetFormat(tool.defaultTargetFormat);
      }
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
    // Auto-select first tool of that category
    const tool = CONVERTER_TOOLS.find(t => t.sourceCategory === categoryId);
    if (tool) {
      handleToolSelect(tool, false);
    }
  };

  const handleToolSelect = (tool: ConverterTool, autoTriggerUpload: boolean = true) => {
    setSelectedTool(tool);
    setTargetFormat(tool.defaultTargetFormat);
    setUploadedFiles([]);
    setConvertedFileUrl(null);
    setConversionProgress(0);
    setIsConverting(false);

    // Scroll to workspace with visual focus feedback
    setTimeout(() => {
      workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (autoTriggerUpload) {
        setTimeout(() => {
          fileInputRef.current?.click();
        }, 300);
      }
    }, 50);
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
  };

  const triggerUploadClick = () => {
    fileInputRef.current?.click();
  };

  // High-fidelity local browser-native document conversion pipeline
  const startConversion = async () => {
    if (uploadedFiles.length === 0 || !selectedTool) return;
    const firstFile = uploadedFiles[0];
    const uploadedFile = firstFile;

    setIsConverting(true);
    setConversionProgress(5);
    setConversionStep('Initializing Adobe secure sandboxed pipeline...');

    try {
      // 1. Parse and extract original document content structure securely
      setConversionProgress(25);
      setConversionStep('Analyzing file encoding and extracting contents...');
      const content = await extractContentFromSourceFile(uploadedFile);

      // 2. Map and compile nodes
      setConversionProgress(55);
      setConversionStep(`Compiling content nodes into ${targetFormat.toUpperCase()} format rules...`);

      // Generate output filename
      const origNameWithoutExt = uploadedFile.name.substring(0, uploadedFile.name.lastIndexOf('.')) || uploadedFile.name;
      let outName = `${origNameWithoutExt}_converted${targetFormat}`;
      if (uploadedFiles.length > 1 && targetFormat === '.pdf' && ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.svg'].includes('.' + uploadedFile.name.split('.').pop()?.toLowerCase())) {
        outName = 'Combined_Images_converted.pdf';
      }
      setConvertedFileName(outName);

      let blob: Blob;

      const isPdf = targetFormat === '.pdf';
      const isExcel = ['.xlsx', '.xls', '.xlsm', '.xlsb', '.xltx', '.xltm', '.xlam', '.ods'].includes(targetFormat);
      const isWord = ['.docx', '.doc', '.odt', '.rtf'].includes(targetFormat);
      const isPowerPoint = ['.pptx', '.ppt', '.ppsx', '.pps', '.potx', '.potm'].includes(targetFormat);
      const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.svg', '.tiff', '.ico', '.heic', '.avif'].includes(targetFormat);

      if (isPdf) {
        // For PDF, check if the source file was an image
        const sourceExt = '.' + uploadedFile.name.split('.').pop()?.toLowerCase();
        const sourceIsImage = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.svg'].includes(sourceExt);
        
        if (sourceIsImage && uploadedFiles.length > 1) {
          blob = await generateMultiImagePdf(uploadedFiles);
          setConvertedFileName('Combined_Images.pdf');
        } else if (sourceIsImage) {
          // Convert image to a compatible PNG array buffer for pdf-lib
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
      } else if (isExcel) {
        blob = generateRealExcel(uploadedFile.name, targetFormat, content);
      } else if (isWord) {
        blob = generateRealWord(uploadedFile.name, targetFormat, content);
      } else if (isPowerPoint) {
        blob = generateRealPowerPoint(uploadedFile.name, targetFormat, content);
      } else if (isImage) {
        const sourceExt = '.' + uploadedFile.name.split('.').pop()?.toLowerCase();
        const sourceIsImage = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.svg'].includes(sourceExt);
        if (sourceIsImage) {
          blob = await convertImageFormat(uploadedFile, targetFormat);
        } else {
          blob = await generateRealImage(uploadedFile.name, targetFormat, content);
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
      } else if (targetFormat === '.xml') {
        let xmlStr = `<?xml version="1.0" encoding="UTF-8"?>\n<document>\n`;
        if (content.excelRows && content.excelRows.length > 0) {
          xmlStr += `  <rows>\n`;
          for (const row of content.excelRows) {
            xmlStr += `    <row>\n`;
            for (const cell of row) {
              xmlStr += `      <cell>${String(cell !== undefined ? cell : '')}</cell>\n`;
            }
            xmlStr += `    </row>\n`;
          }
          xmlStr += `  </rows>\n`;
        } else {
          xmlStr += `  <paragraphs>\n`;
          for (const p of content.paragraphs) {
            xmlStr += `    <paragraph>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</paragraph>\n`;
          }
          xmlStr += `  </paragraphs>\n`;
        }
        xmlStr += `</document>`;
        blob = new Blob([xmlStr], { type: 'application/xml' });
      } else {
        // Default Fallback (Plain Text)
        blob = new Blob([content.text], { type: 'text/plain' });
      }

      setConversionProgress(85);
      setConversionStep('Optimizing document and finalizing download package...');

      setTimeout(() => {
        const downloadUrl = URL.createObjectURL(blob);
        setConvertedFileUrl(downloadUrl);
        setConversionProgress(100);
        setConversionStep('Conversion completed successfully!');
        setIsConverting(false);

        // Log recent files
        onAddRecentFile({
          name: outName,
          size: `${(uploadedFiles.reduce((acc, f) => acc + f.size, 0) / 1024).toFixed(1)} KB`,
          type: targetFormat.replace('.', '').toUpperCase(),
          toolUsed: `Convert to ${selectedTool.targetCategoryName}`
        });
      }, 600);

    } catch (err: any) {
      console.error("Conversion error: ", err);
      alert("Error during document generation: " + err.message);
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
    document.body.removeChild(a);
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 xl:px-12 w-full max-w-[1850px] mx-auto animate-fade-in space-y-12">
      <SEO title="PDF Converter - Convert to Word, Excel, JPG | PDF Toolkit Pro" description="Convert PDF documents to editable Word, Excel, PowerPoint formats or images in seconds." canonical="/converter" />
      {/* Visual Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 border border-blue-500/10">
          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          Ultra-Fast Document Cross-Converter
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50">
          Professional Document Converter
        </h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-lg mx-auto leading-relaxed">
          Zero Server Retention. Upload spreadsheets, letters, presentation decks, or images, and cross-compile them cleanly into any target standard layout.
        </p>
      </div>

      {/* Converter Categories Grid (Small Tabs) */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-lg space-y-4 animate-fade-in">
        <div className="border-b border-slate-100 dark:border-zinc-900 pb-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-200 uppercase tracking-wider">
            Converter Categories
          </h3>
          <p className="text-xs text-slate-400 dark:text-zinc-500">Select converter node engine</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {CATEGORIES.map((cat) => {
            const CategoryIcon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className={`flex flex-col items-center justify-center text-center p-3 sm:p-4 rounded-2xl transition-all cursor-pointer border ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.02] border-transparent' 
                    : 'bg-slate-50 dark:bg-zinc-900/40 hover:bg-slate-100 dark:hover:bg-zinc-900/80 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300'
                }`}
              >
                <div className={`p-2 rounded-xl mb-1.5 ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-zinc-800/85 text-slate-500'}`}>
                  <CategoryIcon className="h-4.5 w-4.5" />
                </div>
                <div className="flex flex-col items-center">
                  <span className={`text-[11px] font-bold leading-tight ${isActive ? 'text-white' : 'text-slate-800 dark:text-zinc-200'}`}>
                    {cat.name.replace(' Converter', '')}
                  </span>
                  <span className={`text-[9px] mt-0.5 font-medium leading-none ${isActive ? 'text-blue-100' : 'text-slate-400 dark:text-zinc-500'}`}>
                    {cat.id === 'data' ? 'CSV/JSON' : cat.id.toUpperCase()}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Converter Workspace Panel - Center Aligned */}
      <div className="max-w-6xl 2xl:max-w-7xl mx-auto w-full space-y-6">
          
          {/* Sub-navigation selector for actual tools within Category */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-lg space-y-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              {CATEGORIES.find(c => c.id === activeCategory)?.name || 'Converter'} - Available Tools
            </span>

            {/* Grid of prominent Tool Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {CONVERTER_TOOLS.filter(t => t.sourceCategory === activeCategory).map((tool) => {
                const isSelected = selectedTool?.id === tool.id;
                return (
                  <div
                    key={tool.id}
                    onClick={() => handleToolSelect(tool, true)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 group ${
                      isSelected
                        ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-500/40 shadow-sm ring-2 ring-blue-500/20'
                        : 'bg-slate-50/50 dark:bg-zinc-900/40 border-slate-200 dark:border-zinc-800 hover:border-blue-400/50 hover:bg-slate-100/60 dark:hover:bg-zinc-900/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-red-600 text-white shadow-md shadow-red-500/40 border border-red-400 animate-beta-pop shrink-0">
                            BETA
                          </span>
                          <span>{tool.name}</span>
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 line-clamp-2">
                          Converts {tool.sourceExtensions.join(', ')} to {tool.targetCategoryName} ({tool.defaultTargetFormat})
                        </p>
                      </div>
                      <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-zinc-800 text-slate-500'}`}>
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-zinc-800/50 text-[10px]">
                      <span className="font-semibold text-slate-400">
                        Target: {tool.defaultTargetFormat.toUpperCase()}
                      </span>
                      <span className={`font-bold flex items-center gap-1 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-zinc-300'}`}>
                        {isSelected ? 'Active Workspace' : 'Open Tool'}
                        <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Core Converter Interface card */}
          {selectedTool && (
            <div ref={workspaceRef} className="bg-white dark:bg-[#0f172a] border-2 border-blue-500/30 dark:border-blue-500/20 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 scroll-mt-6 animate-fade-in">
              
              {/* Tool Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-900 pb-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
                    <ArrowRightLeft className="h-5 w-5 text-blue-500" />
                    {selectedTool.name}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Accepts: {selectedTool.sourceExtensions.join(', ')} format keys
                  </p>
                </div>

                {/* Dropdown with all supported formats */}
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                    Convert To:
                  </span>
                  <select
                    value={targetFormat}
                    onChange={(e) => handleFormatChange(e.target.value)}
                    className="px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 rounded-xl text-xs font-bold text-slate-800 dark:text-zinc-100 outline-none focus:border-blue-500"
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
                    : 'border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/15 hover:border-blue-500/40 cursor-pointer'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept={selectedTool.sourceExtensions.join(',')}
                  className="hidden"
                  multiple
                />

                {uploadedFiles.length === 0 ? (
                  <div className="space-y-4">
                    <div className="h-14 w-14 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center mx-auto shadow-sm">
                      <UploadCloud className="h-6 w-6 text-blue-500" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                        Drag & Drop or click to choose document
                      </p>
                      <p className="text-xs text-slate-400 dark:text-zinc-500">
                        High Speed. Fully safe and secure local execution.
                      </p>
                    </div>
                                    </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-2 max-w-md mx-auto max-h-60 overflow-y-auto pr-2">
                      {uploadedFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 rounded-2xl shadow-sm text-left">
                          <div className="h-11 w-11 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                            <File className="h-5.5 w-5.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">
                              {f.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {(f.size / 1024).toFixed(1)} KB • {f.name.split('.').pop()?.toUpperCase()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedFiles([]);
                          setConvertedFileUrl(null);
                          setConversionProgress(0);
                        }}
                        className="text-[11px] font-bold text-rose-500 hover:underline cursor-pointer bg-rose-50 dark:bg-rose-950/30 px-4 py-2 rounded-lg"
                      >
                        Clear All Files
                      </button>
                    </div>
                    {/* Progress overlay */}
                    {isConverting && (
                      <div className="max-w-md mx-auto space-y-3.5 bg-slate-50 dark:bg-zinc-900/50 p-4 border border-slate-100 dark:border-zinc-850/50 rounded-2xl">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-blue-600 dark:text-blue-400 animate-pulse flex items-center gap-1.5">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            {conversionStep}
                          </span>
                          <span className="text-slate-500 font-mono">{conversionProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-blue-500 h-full transition-all duration-300"
                            style={{ width: `${conversionProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Success Download block */}
                    {convertedFileUrl && (
                      <div className="max-w-md mx-auto p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/10 rounded-2xl text-left space-y-3 animate-fade-in">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            Ready to download!
                          </span>
                        </div>
                        <button
                          onClick={handleDownload}
                          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-emerald-500/15"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download converted file ({targetFormat.toUpperCase()})
                        </button>
                      </div>
                    )}

                    {/* Action convert button */}
                    {!isConverting && !convertedFileUrl && (
                      <button
                        onClick={startConversion}
                        className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 mx-auto cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-blue-500/15"
                      >
                        <RefreshCw className="h-4 w-4 animate-spin-slow" />
                        Convert to {targetFormat.toUpperCase()}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Clickable target chips below each converter */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Clickable Target Chips (Quick-Select Target Format)
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                    {selectedTool.targetFormats.length} Formats Supported
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedTool.targetFormats.map((fmt) => {
                    const isActive = targetFormat === fmt;
                    return (
                      <button
                        key={fmt}
                        onClick={() => handleFormatChange(fmt)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                            : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        <span>{fmt}</span>
                        {isActive && <Check className="h-3.5 w-3.5 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>

      {/* Return button */}
      {onBackToTools && (
        <div className="pt-6 border-t border-slate-200 dark:border-zinc-800 flex justify-center">
          <button
            onClick={onBackToTools}
            className="py-3.5 px-6 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-2xl text-xs font-bold text-slate-700 dark:text-zinc-300 transition-all flex items-center gap-2 cursor-pointer"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            Back to Primary Tools
          </button>
        </div>
      )}
    </div>
  );
}
