import fontkit from '@pdf-lib/fontkit';

function getToolSlug(tool: { id: string; name?: string; slug?: string }): string {
  if (tool.slug) return tool.slug;
  return tool.id;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

import { allToolsList } from './src/data/tools';
import express from 'express';
import path from 'path';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import fsPromises from 'fs/promises';
import fs from 'fs';
import os from 'os';
import { createServer as createViteServer } from 'vite';
import { db } from './src/server/db';
import { GoogleGenAI, Type } from '@google/genai';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt';

const execFileAsync = promisify(execFile);

// Helper functions for PDF editing using pdf-lib
function hexToRgb(hexStr: string = '#000000'): { r: number, g: number, b: number } {
  if (!hexStr) return { r: 0, g: 0, b: 0 };
  let hex = hexStr.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (hex.length === 6) {
    let r = parseInt(hex.substring(0, 2), 16) / 255;
    let g = parseInt(hex.substring(2, 4), 16) / 255;
    let b = parseInt(hex.substring(4, 6), 16) / 255;
    // Automatically force pure jet black (0,0,0) for any dark or grayish tones
    if (r < 0.45 && g < 0.45 && b < 0.45) {
      return { r: 0, g: 0, b: 0 };
    }
    return { r, g, b };
  }
  return { r: 0, g: 0, b: 0 };
}

function sanitizeForWinAnsi(text: string): string {
  if (!text) return '';
  return text
    .replace(/\u00A0/g, ' ')
    .replace(/\u200B/g, '')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\u2018-\u201B]/g, "'")
    .replace(/[\u201C-\u201F]/g, '"');
}

function getStandardFontName(fontName: string = '', bold: boolean = false, italic: boolean = false): StandardFonts {
  const fontLower = fontName.toLowerCase();
  const isBold = bold || fontLower.includes('bold') || fontLower.includes('black') || fontLower.includes('heavy');
  const isItalic = italic || fontLower.includes('italic') || fontLower.includes('oblique');

  if (fontLower.includes('times') || fontLower.includes('serif')) {
    if (isBold && isItalic) return StandardFonts.TimesRomanBoldItalic;
    if (isBold) return StandardFonts.TimesRomanBold;
    if (isItalic) return StandardFonts.TimesRomanItalic;
    return StandardFonts.TimesRoman;
  } else if (fontLower.includes('courier') || fontLower.includes('mono')) {
    if (isBold && isItalic) return StandardFonts.CourierBoldOblique;
    if (isBold) return StandardFonts.CourierBold;
    if (isItalic) return StandardFonts.CourierOblique;
    return StandardFonts.Courier;
  } else {
    if (isBold && isItalic) return StandardFonts.HelveticaBoldOblique;
    if (isBold) return StandardFonts.HelveticaBold;
    if (isItalic) return StandardFonts.HelveticaOblique;
    return StandardFonts.Helvetica;
  }
}


let serverCachedRegularFont: ArrayBuffer | null = null;
let serverCachedBoldFont: ArrayBuffer | null = null;

async function getServerFont(pdfDoc: PDFDocument, isBold: boolean, fallbackFontName: string, italic: boolean) {
  try {
    pdfDoc.registerFontkit(fontkit);
    let bytes = isBold ? serverCachedBoldFont : serverCachedRegularFont;
    if (!bytes) {
      const fontPath = isBold ? 'public/fonts/FreeSansBold.ttf' : 'public/fonts/FreeSans.ttf';
      if (fs.existsSync(fontPath)) {
        const buf = fs.readFileSync(fontPath);
        bytes = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        if (isBold) serverCachedBoldFont = bytes;
        else serverCachedRegularFont = bytes;
      }
    }
    if (bytes && bytes.byteLength > 0) {
      return await pdfDoc.embedFont(new Uint8Array(bytes), { subset: true });
    }
  } catch (e) {
    console.warn("Server font embedding warning:", e);
  }
  const stdFont = getStandardFontName(fallbackFontName, isBold, italic);
  return await pdfDoc.embedFont(stdFont);
}

async function editPdfTextWithPdfLib(
  pdfBase64: string,
  pageNum: number,
  replacementText: string,
  textToFind: string,
  pdfX: number,
  pdfY: number,
  fontSize: number,
  fontName: string,
  colorHex: string,
  pdfW: number,
  pdfH: number,
  bold: boolean,
  italic: boolean
): Promise<string> {
  const pdfBytes = Uint8Array.from(Buffer.from(pdfBase64, 'base64'));
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const idx = pageNum - 1;
  if (idx < 0 || idx >= pages.length) {
    throw new Error(`Invalid page index ${pageNum}`);
  }
  const page = pages[idx];

  const safeText = sanitizeForWinAnsi(replacementText);
  const baseFontSize = fontSize || 12;
  const lines = safeText ? safeText.split('\n') : [''];

  const rectX = pdfX - 0.5;
  const rectY = pdfY - ((lines.length - 1) * baseFontSize * 1.15) - (baseFontSize * 0.15);
  const rectW = Math.max(2, pdfW + 1);
  const rectH = (lines.length - 1) * 1.15 * baseFontSize + (baseFontSize * 0.88);

  page.drawRectangle({
    x: rectX,
    y: rectY,
    width: rectW,
    height: rectH,
    color: rgb(1, 1, 1),
  });

  if (safeText && safeText.trim() !== '') {
    const font = await getServerFont(pdfDoc, bold, fontName, italic);
    const { r, g, b } = hexToRgb(colorHex || '#000000');

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      if (lineText) {
        let finalFontSize = baseFontSize;
        if (pdfW > 0 && lineText.length > 0) {
          try {
            const measuredWidth = font.widthOfTextAtSize(lineText, baseFontSize);
            if (measuredWidth > 0) {
              const scaleRatio = pdfW / measuredWidth;
              finalFontSize = baseFontSize * Math.min(1.02, Math.max(0.70, scaleRatio));
            }
          } catch (e) {
            // fallback
          }
        }
        const lineY = pdfY - (i * finalFontSize * 1.15);
        page.drawText(lineText, {
          x: pdfX,
          y: lineY,
          size: finalFontSize,
          font: font,
          color: rgb(r, g, b),
        });
      }
    }
  }

  const savedBytes = await pdfDoc.save();
  return Buffer.from(savedBytes).toString('base64');
}

// Initialize the Google GenAI SDK
// Using process.env.GEMINI_API_KEY injected automatically by the platform
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'MOCK_KEY',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function generateContentWithRetry(params: any, maxRetries = 3, initialDelayMs = 1000, retryOn429 = true): Promise<any> {
  let attempt = 0;
  while (true) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      attempt++;
      const errString = String(err?.message || '') + ' ' + String(err?.status || '') + ' ' + JSON.stringify(err);
      
      const is429 = errString.includes('429') || 
                    errString.includes('RESOURCE_EXHAUSTED') ||
                    errString.includes('quota');

      const isTransient = errString.includes('503') || 
                          errString.includes('500') ||
                          errString.includes('UNAVAILABLE') || 
                          errString.includes('demand') ||
                          errString.includes('temporary') ||
                          errString.includes('overloaded') ||
                          (retryOn429 ? is429 : false);

      if (attempt <= maxRetries && isTransient) {
        const delay = initialDelayMs * Math.pow(2, attempt - 1);
        console.warn(`Gemini API transient error detected. Attempt ${attempt}/${maxRetries}. Retrying in ${delay}ms... Error:`, errString);
        await new Promise(res => setTimeout(res, delay));
        continue;
      }
      throw err;
    }
  }
}

async function translateText(text: string, targetLang: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'MOCK_KEY') {
    try {
      let langName = targetLang;
      const lower = targetLang.toLowerCase();
      if (lower.startsWith('hi')) langName = 'Hindi';
      else if (lower.startsWith('ja')) langName = 'Japanese';
      else if (lower.startsWith('en')) langName = 'English';
      else if (lower.startsWith('es')) langName = 'Spanish';
      else if (lower.startsWith('fr')) langName = 'French';
      else if (lower.startsWith('de')) langName = 'German';
      else if (lower.startsWith('zh')) langName = 'Chinese (Mandarin)';
      else if (lower.startsWith('ko')) langName = 'Korean';
      else if (lower.startsWith('ar')) langName = 'Arabic';
      else if (lower.startsWith('it')) langName = 'Italian';
      else if (lower.startsWith('pt')) langName = 'Portuguese';

      const response = await generateContentWithRetry({
        model: 'gemini-3.5-flash',
        contents: `Translate the following text into ${langName} language. Translate it naturally, preserve the original formatting/paragraphs, and do not include any additional commentary, introductory remarks, or formatting notes. Return only the clean translated text.

"${text}"`,
        generationConfig: {
          temperature: 0.3,
        }
      }, 1, 1000, false);
      const translated = response?.text || response?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (translated && translated.trim()) {
        return translated.trim();
      }
    } catch (err) {
      console.error('Translation with Gemini failed, trying fallback:', err);
    }
  }

  try {
    const langCode = targetLang.split('-')[0];
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${langCode}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data[0]) {
        const translatedText = data[0].map((x: any) => x[0]).join('');
        if (translatedText) return translatedText;
      }
    }
  } catch (err) {
    console.error('Web translation fallback failed:', err);
  }

  return text;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // HTTP Strict Transport Security (HSTS) Header Middleware
  app.use((req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Body parsers with generous limits for base64 file processing
  app.use(express.json({ limit: '500mb' }));
  app.use(express.urlencoded({ limit: '500mb', extended: true }));

  // ==========================================
  // 1. API ROUTES (Must be defined first!)
  // ==========================================

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Translation API
  app.post('/api/translate', async (req, res) => {
    try {
      const { text, targetLang } = req.body;
      if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Text input is required for translation.' });
      }
      if (!targetLang || !targetLang.trim()) {
        return res.status(400).json({ error: 'Target language code is required.' });
      }

      const translated = await translateText(text, targetLang);
      res.json({ translatedText: translated });
    } catch (err: any) {
      console.error('Translation error:', err);
      res.status(500).json({ error: err.message || 'Translation failed.' });
    }
  });

  // High Quality Human Voice Text To Speech Audio Generation API
  app.post('/api/tts', async (req, res) => {
    try {
      const { text, lang } = req.body;
      if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Text input is required for text-to-speech.' });
      }

      let rawLang = (lang || 'en-US').trim();
      let targetLang = rawLang;
      const lowerRaw = rawLang.toLowerCase();

      if (lowerRaw.includes('zh-tw') || lowerRaw.includes('zh-hant')) {
        targetLang = 'zh-TW';
      } else if (lowerRaw.includes('zh')) {
        targetLang = 'zh-CN';
      } else if (lowerRaw.startsWith('en-gb') || lowerRaw.includes('uk')) {
        targetLang = 'en-GB';
      } else if (lowerRaw.startsWith('en-in') || lowerRaw.includes('india')) {
        targetLang = 'en-IN';
      } else if (lowerRaw.startsWith('en-au') || lowerRaw.includes('australia')) {
        targetLang = 'en-AU';
      } else if (lowerRaw.startsWith('en-us') || lowerRaw.startsWith('en')) {
        targetLang = 'en-US';
      } else if (lowerRaw.startsWith('hi')) {
        targetLang = 'hi';
      } else if (lowerRaw.startsWith('ja')) {
        targetLang = 'ja';
      } else if (lowerRaw.startsWith('es-mx')) {
        targetLang = 'es-MX';
      } else if (lowerRaw.startsWith('es')) {
        targetLang = 'es-ES';
      } else if (lowerRaw.startsWith('fr-ca')) {
        targetLang = 'fr-CA';
      } else if (lowerRaw.startsWith('fr')) {
        targetLang = 'fr-FR';
      } else if (lowerRaw.startsWith('de')) {
        targetLang = 'de';
      } else if (lowerRaw.startsWith('ko')) {
        targetLang = 'ko';
      } else if (lowerRaw.startsWith('ar')) {
        targetLang = 'ar';
      } else if (lowerRaw.startsWith('ru')) {
        targetLang = 'ru';
      } else if (lowerRaw.startsWith('pt-br')) {
        targetLang = 'pt-BR';
      } else if (lowerRaw.startsWith('it')) {
        targetLang = 'it';
      }

      // If targetLang is not one of the specifically mapped ones and contains a hyphen, extract the 2-letter language code prefix
      if (targetLang.includes('-') && 
          !['zh-tw', 'zh-hant', 'zh-cn', 'en-gb', 'en-in', 'en-au', 'en-us', 'es-mx', 'fr-ca', 'pt-br'].includes(targetLang.toLowerCase())) {
        targetLang = targetLang.split('-')[0];
      }

      const cleanText = text.trim().slice(0, 10000);
      
      // Helper function to split text into chunks for TTS API
      const maxLen = 160;
      const sentences = cleanText.match(/[^.!?।\n]+[.!?।\n]*/g) || [cleanText];
      const chunks: string[] = [];
      let currentChunk = '';

      for (const sentence of sentences) {
        if ((currentChunk + sentence).length <= maxLen) {
          currentChunk += sentence;
        } else {
          if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
          }
          if (sentence.length > maxLen) {
            for (let i = 0; i < sentence.length; i += maxLen) {
              chunks.push(sentence.slice(i, i + maxLen).trim());
            }
            currentChunk = '';
          } else {
            currentChunk = sentence;
          }
        }
      }
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }

      const validChunks = chunks.filter(c => c.length > 0);
      const audioBuffers: Buffer[] = [];

      for (const chunk of validChunks) {
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${targetLang}&client=tw-ob`;
        const response = await fetch(ttsUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Referer': 'https://translate.google.com/',
          }
        });

        if (response.ok) {
          const arrayBuf = await response.arrayBuffer();
          audioBuffers.push(Buffer.from(arrayBuf));
        } else {
          console.warn(`TTS fetch warning for chunk "${chunk.slice(0, 20)}": status ${response.status}`);
        }
      }

      if (audioBuffers.length === 0) {
        return res.status(500).json({ error: 'Failed to generate speech audio from TTS service.' });
      }

      const combinedBuffer = Buffer.concat(audioBuffers);
      const audioBase64 = `data:audio/mp3;base64,${combinedBuffer.toString('base64')}`;

      res.json({
        success: true,
        audioBase64,
        format: 'mp3',
        size: combinedBuffer.length,
      });
    } catch (err: any) {
      console.error('TTS Audio API error:', err);
      res.status(500).json({ error: 'Failed to synthesize speech audio.', details: err.message });
    }
  });

  // Authentication
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    const lowerEmail = String(email || '').trim().toLowerCase();

    // Strict rule: Only the admin email can log in
    if (lowerEmail !== 'admin@pdftoolkitpro.online') {
      return res.status(403).json({ 
        error: 'Registration and user logins are disabled on this platform. Only the System Administrator can sign in.' 
      });
    }

    // Strict rule: Check the admin password
    if (password !== 'CCNTSPL@$1111') {
      return res.status(401).json({ 
        error: 'Invalid password. Access Denied.' 
      });
    }

    // Admin login succeeds - find the admin user in the database
    let adminUser = db.users.find(u => u.email.toLowerCase() === lowerEmail);
    if (!adminUser) {
      // Create admin user dynamically if not exists
      adminUser = {
        id: 'usr_admin',
        email: 'admin@pdftoolkitpro.online',
        username: 'System Admin',
        role: 'admin' as const,
        subscription: 'enterprise' as const,
        createdAt: new Date().toISOString(),
      };
      db.users.push(adminUser);
    }

    res.setHeader('Set-Cookie', `userId=${adminUser.id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000`);
    res.json({ user: adminUser, token: 'mock-jwt-token' });
  });

  app.post('/api/auth/signup', (req, res) => {
    return res.status(403).json({ 
      error: 'User registration is disabled. Only the System Administrator can access administrative features.' 
    });
  });

  // Get active user session
  app.get('/api/auth/me', (req, res) => {
    const cookieHeader = req.headers.cookie || '';
    const cookies = Object.fromEntries(cookieHeader.split(';').map(c => {
      const parts = c.split('=');
      return [parts[0].trim(), parts.slice(1).join('=')];
    }));
    const userId = cookies.userId;
    const currentUser = db.users.find(u => u.id === userId);
    
    if (currentUser) {
      res.json({ user: currentUser });
    } else {
      res.status(401).json({ error: 'Not authenticated' });
    }
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    res.setHeader('Set-Cookie', 'userId=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
    res.json({ success: true });
  });

  // Recent Files API
  app.get('/api/recent-files', (req, res) => {
    res.json({ files: db.recentFiles });
  });

  app.post('/api/recent-files', (req, res) => {
    const { name, size, type, toolUsed } = req.body;
    const newFile = {
      id: `f_${Date.now()}`,
      name: name || 'processed_document.pdf',
      size: size || '1.2 MB',
      type: type || 'application/pdf',
      toolUsed: toolUsed || 'Unknown Tool',
      date: new Date().toISOString(),
      status: 'completed' as const,
    };
    db.addFile(newFile);
    res.json({ file: newFile });
  });

  // Support Tickets API
  app.get('/api/support/tickets', (req, res) => {
    res.json({ tickets: db.supportTickets });
  });

  app.post('/api/support/tickets', (req, res) => {
    const { subject, message, category, email } = req.body;
    const newTicket = {
      id: `t_${Date.now()}`,
      subject: subject || 'User Support Request',
      message,
      status: 'open' as const,
      category: category || 'General',
      date: new Date().toISOString(),
      userEmail: email || 'visitor@example.com',
      replies: [
        {
          sender: 'user' as const,
          message,
          date: new Date().toISOString()
        }
      ]
    };
    db.addTicket(newTicket);
    res.json({ ticket: newTicket });
  });

  app.post('/api/support/tickets/:id/reply', (req, res) => {
    const { id } = req.params;
    const { message, sender } = req.body;
    const reply = {
      sender: sender || 'user',
      message,
      date: new Date().toISOString()
    };
    db.addTicketReply(id, reply);
    res.json({ ticket: db.supportTickets.find(t => t.id === id) });
  });

  app.post('/api/support/tickets/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const ticket = db.supportTickets.find(t => t.id === id);
    if (ticket && (status === 'open' || status === 'pending' || status === 'resolved')) {
      ticket.status = status;
    }
    res.json({ ticket });
  });

  app.delete('/api/support/tickets/:id', (req, res) => {
    const { id } = req.params;
    const deleted = db.deleteTicket(id);
    res.json({ success: deleted, tickets: db.supportTickets });
  });

  // Blogs API
  app.get('/api/blogs', (req, res) => {
    res.json({ posts: db.blogPosts });
  });

  app.post('/api/blogs', (req, res) => {
    const { id, title, excerpt, content, category, author, image, readTime, date } = req.body;
    
    // Calculate reading time if not provided (~200 words per minute)
    let calculatedReadTime = readTime;
    if (!calculatedReadTime && content) {
      const words = content.trim().split(/\s+/).length;
      const minutes = Math.max(1, Math.ceil(words / 200));
      calculatedReadTime = `${minutes} min read`;
    }

    const newBlog = {
      id: id || `b_${Date.now()}`,
      title: title || 'Untitled Article',
      excerpt: excerpt || '',
      content: content || '',
      category: category || 'Tutorials',
      author: author || 'Admin / SEO Team',
      date: date || new Date().toISOString().split('T')[0],
      readTime: calculatedReadTime || '4 min read',
      image: image || 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=500&auto=format&fit=crop&q=60',
    };
    db.addBlog(newBlog);
    res.json({ post: newBlog, success: true, posts: db.blogPosts });
  });

  app.put('/api/blogs/:id', (req, res) => {
    const { id } = req.params;
    const { title, excerpt, content, category, author, image, readTime, date } = req.body;
    
    let calculatedReadTime = readTime;
    if (!calculatedReadTime && content) {
      const words = content.trim().split(/\s+/).length;
      const minutes = Math.max(1, Math.ceil(words / 200));
      calculatedReadTime = `${minutes} min read`;
    }

    const updated = db.updateBlog(id, {
      ...(title !== undefined && { title }),
      ...(excerpt !== undefined && { excerpt }),
      ...(content !== undefined && { content }),
      ...(category !== undefined && { category }),
      ...(author !== undefined && { author }),
      ...(image !== undefined && { image }),
      ...(calculatedReadTime !== undefined && { readTime: calculatedReadTime }),
      ...(date !== undefined && { date })
    });

    if (updated) {
      res.json({ success: true, post: updated, posts: db.blogPosts });
    } else {
      res.status(404).json({ error: 'Blog post not found' });
    }
  });

  app.delete('/api/blogs/:id', (req, res) => {
    db.deleteBlog(req.params.id);
    res.json({ success: true, posts: db.blogPosts });
  });

  // Admin API
  app.get('/api/admin/analytics', (req, res) => {
    const cookieHeader = req.headers.cookie || '';
    const cookies = Object.fromEntries(cookieHeader.split(';').map(c => {
      const parts = c.split('=');
      return [parts[0].trim(), parts.slice(1).join('=')];
    }));
    const userId = cookies.userId || req.headers['x-user-id'] || req.body?.userId;
    const currentUser = db.users.find(u => u.id === userId);

    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized. Admins only.' });
    }

    const activeDbUsersCount = db.users.length;
    const proDbUsersCount = db.users.filter(u => u.subscription === 'pro').length;
    const enterpriseDbUsersCount = db.users.filter(u => u.subscription === 'enterprise').length;

    // Dynamically calculated stats directly from the actual active database
    const dynamicAnalytics = {
      ...db.analytics,
      activeUsers: activeDbUsersCount,
      premiumSubscribers: proDbUsersCount + enterpriseDbUsersCount,
      monthlyRevenue: (proDbUsersCount * 9) + (enterpriseDbUsersCount * 49),
      platformUptime: '99.98%'
    };
    res.json({ analytics: dynamicAnalytics });
  });

  app.get('/api/admin/users', (req, res) => {
    const cookieHeader = req.headers.cookie || '';
    const cookies = Object.fromEntries(cookieHeader.split(';').map(c => {
      const parts = c.split('=');
      return [parts[0].trim(), parts.slice(1).join('=')];
    }));
    const userId = cookies.userId || req.headers['x-user-id'] || req.body?.userId;
    const currentUser = db.users.find(u => u.id === userId);

    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized. Admins only.' });
    }

    res.json({ users: db.users });
  });

  app.post('/api/admin/users/:id/subscription', (req, res) => {
    const cookieHeader = req.headers.cookie || '';
    const cookies = Object.fromEntries(cookieHeader.split(';').map(c => {
      const parts = c.split('=');
      return [parts[0].trim(), parts.slice(1).join('=')];
    }));
    const userId = cookies.userId || req.headers['x-user-id'] || req.body?.userId;
    const currentUser = db.users.find(u => u.id === userId);

    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized. Admins only.' });
    }

    const { id } = req.params;
    const { subscription } = req.body;
    const user = db.users.find(u => u.id === id);
    if (user) {
      user.subscription = subscription;
      res.json({ user });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });

  // Global Config Endpoint (Publicly queryable)
  app.get('/api/config', (req, res) => {
    res.json({ isDonationDisabled: db.isDonationDisabled });
  });

  // Admin Configuration Updates (Secured to admin session)
  app.post('/api/admin/config', (req, res) => {
    const cookieHeader = req.headers.cookie || '';
    const cookies = Object.fromEntries(cookieHeader.split(';').map(c => {
      const parts = c.split('=');
      return [parts[0].trim(), parts.slice(1).join('=')];
    }));
    const userId = cookies.userId || req.headers['x-user-id'] || req.body.userId;
    const currentUser = db.users.find(u => u.id === userId);

    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized. Admins only.' });
    }

    const { isDonationDisabled } = req.body;
    if (typeof isDonationDisabled === 'boolean') {
      db.isDonationDisabled = isDonationDisabled;
    }
    res.json({ success: true, isDonationDisabled: db.isDonationDisabled });
  });

  // Billing (Checkout & Coupon verification)
  app.post('/api/billing/coupon', (req, res) => {
    const { code } = req.body;
    if (code?.toUpperCase() === 'FREEPRO') {
      res.json({ valid: true, discount: 100, message: '100% OFF Code Applied Successfully!' });
    } else if (code?.toUpperCase() === 'WELCOME20') {
      res.json({ valid: true, discount: 20, message: '20% OFF Code Applied Successfully!' });
    } else {
      res.status(400).json({ valid: false, message: 'Invalid or Expired Promo Code' });
    }
  });

  app.post('/api/billing/checkout', (req, res) => {
    const { planId, email, stripeToken, couponCode } = req.body;
    const transactionId = `txn_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const date = new Date().toISOString();
    
    // Find plan
    const plan = db.plans.find(p => p.id === planId) || db.plans[1];
    
    // Simulate invoice generation
    const invoice = {
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      transactionId,
      planName: plan.name,
      amountPaid: couponCode?.toUpperCase() === 'FREEPRO' ? '$0.00' : plan.price,
      date,
      email: email || 'user@example.com',
    };

    // Update user sub if exists in DB
    const user = db.users.find(u => u.email.toLowerCase() === email?.toLowerCase());
    if (user) {
      user.subscription = planId === 'p_enterprise' ? 'enterprise' : 'pro';
    }

    res.json({
      success: true,
      invoice,
      message: 'Subscription updated successfully! Invoice has been generated.',
    });
  });

  // Native PDF Text Editing Endpoint using pdf-lib
  app.post('/api/pdf/edit', async (req, res) => {
    const { pdfBase64, page, textToFind, replacementText, pdfX, pdfY, fontSize, fontName, color, pdfW, pdfH, bold, italic } = req.body;
    
    if (!pdfBase64) {
      return res.status(400).json({ error: 'No PDF data provided' });
    }

    try {
      const updatedPdfBase64 = await editPdfTextWithPdfLib(
        pdfBase64,
        page || 1,
        replacementText || '',
        textToFind || '',
        pdfX || 0,
        pdfY || 0,
        fontSize || 12,
        fontName || 'Helvetica',
        color || '#000000',
        pdfW || 50,
        pdfH || 12,
        !!bold,
        !!italic
      );
      res.json({ success: true, pdfBase64: updatedPdfBase64 });
    } catch (err: any) {
      console.error('PDF editing failed with pdf-lib:', err);
      res.status(500).json({ error: 'Failed to process PDF editing', details: err.message });
    }
  });

  // Protect PDF Endpoint using @pdfsmaller/pdf-encrypt
  app.post('/api/pdf/protect', async (req, res) => {
    const { pdfBase64, password } = req.body;
    
    if (!pdfBase64) return res.status(400).json({ error: 'No PDF data provided' });
    if (!password) return res.status(400).json({ error: 'Password is required' });

    try {
      const pdfBytes = Uint8Array.from(Buffer.from(pdfBase64, 'base64'));
      const encryptedBytes = await encryptPDF(pdfBytes, password, { algorithm: 'AES-256' });
      const encryptedBase64 = Buffer.from(encryptedBytes).toString('base64');
      
      res.json({ success: true, pdfBase64: encryptedBase64 });
    } catch (err: any) {
      console.error('PDF encryption failed:', err);
      res.status(500).json({ error: 'Failed to protect PDF', details: err.message });
    }
  });

  // Compress PDF Endpoint using Ghostscript
  app.post('/api/pdf/compress', async (req, res) => {
    const { pdfBase64, compressionLevel } = req.body;
    
    if (!pdfBase64) return res.status(400).json({ error: 'No PDF data provided' });
    
    // compressionLevel 0-100 (0 = high quality/low compression, 100 = low quality/high compression)
    const level = Math.max(0, Math.min(100, parseInt(compressionLevel || '50', 10)));
    
    // Map to GS pdfsettings
    let pdfSettings = '/ebook'; // medium
    if (level < 25) pdfSettings = '/prepress';
    else if (level < 50) pdfSettings = '/printer';
    else if (level < 75) pdfSettings = '/ebook';
    else pdfSettings = '/screen';

    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `input_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`);
    const outputPath = path.join(tmpDir, `output_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`);

    try {
      // Write base64 to input file
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');
      await fsPromises.writeFile(inputPath, pdfBuffer);

      // Run ghostscript
      const gsArgs = [
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.4',
        `-dPDFSETTINGS=${pdfSettings}`,
        '-dNOPAUSE',
        '-dQUIET',
        '-dBATCH',
        `-sOutputFile=${outputPath}`,
        inputPath
      ];

      await execFileAsync('gs', gsArgs);

      // Read output file
      const compressedBuffer = await fsPromises.readFile(outputPath);
      const compressedBase64 = compressedBuffer.toString('base64');
      
      const originalSize = pdfBuffer.length;
      const newSize = compressedBuffer.length;
      const reductionPercent = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));

      res.json({ 
        success: true, 
        pdfBase64: compressedBase64,
        stats: {
          originalSize,
          newSize,
          reductionPercent
        }
      });
    } catch (err: any) {
      console.error('PDF compression failed:', err);
      res.status(500).json({ error: 'Failed to compress PDF', details: err.message });
    } finally {
      // Clean up
      try {
        await fsPromises.unlink(inputPath).catch(() => {});
        await fsPromises.unlink(outputPath).catch(() => {});
      } catch (e) {}
    }
  });

  // AI Background Removal API Health Check
  app.get('/api/health/rembg', async (req, res) => {
    try {
      const response = await fetch('https://www.rembg.com/api/membership-usage?listBillingCycles=1', {
        headers: {
          'x-api-key': process.env.REMOVE_BG_API_KEY || '74626bff-7dbb-442f-9550-fa3c5d8fb1cb',
        },
      });
      if (response.ok) {
        res.json({ status: 'connected' });
      } else {
        res.json({ status: 'disconnected', error: response.statusText });
      }
    } catch (err: any) {
      res.json({ status: 'disconnected', error: err.message });
    }
  });

  // AI Background Removal using rembg.com API
  app.post('/api/ai/remove-bg', async (req, res) => {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    try {
      const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|webp|jpg);base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      
      const formData = new FormData();
      formData.append('image', new Blob([buffer], { type: 'image/png' }), 'image.png');
      formData.append('format', 'png');
      
      const response = await fetch('https://api.rembg.com/rmbg', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.REMOVE_BG_API_KEY || '74626bff-7dbb-442f-9550-fa3c5d8fb1cb',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`rembg.com API Error: ${response.status} - ${errorText}`);
      }

      const outputBuffer = await response.arrayBuffer();
      const outputBase64 = `data:image/png;base64,${Buffer.from(outputBuffer).toString('base64')}`;

      res.json({ success: true, imageBase64: outputBase64 });
    } catch (err: any) {
      console.error('Background removal failed:', err);
      res.status(500).json({ error: 'AI Background Removal failed.', details: err.message });
    }
  });

  // ==========================================

  // OCR Endpoint (Extract Text from Image/Scanned PDF screenshot)
  app.post('/api/ai/ocr', async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Image data is required' });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|webp|jpg);base64,/, '');
      const response = await generateContentWithRetry({
        model: 'gemini-3.5-flash',
        contents: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType || 'image/png'
            }
          },
          {
            text: 'Extract all the printed and handwritten text from this document image cleanly. Do not explain anything, just output the exact extracted text as a readable document format.'
          }
        ]
      });

      res.json({ text: response.text });
    } catch (err: any) {
      console.error('Gemini OCR Error:', err);
      res.status(500).json({ error: 'AI OCR Processing failed. Please verify your Gemini API key.', details: err.message });
    }
  });

  // Scanned PDF OCR Layout Detector Endpoint
  app.post('/api/ai/scanned-ocr', async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Image data is required' });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|webp|jpg);base64,/, '');
      const response = await generateContentWithRetry({
        model: 'gemini-3.5-flash',
        contents: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType || 'image/png'
            }
          },
          {
            text: 'Analyze this scanned document page image and detect all text fields. For each text block/line, calculate its precise coordinates as percentages relative to the total page width and height (x: left percentage 0-100, y: top percentage 0-100, w: width percentage 0-100, h: height percentage 0-100). Keep the coordinates precise so they perfectly bounding-box the text. Provide the text contents, fontFamily (Helvetica, Times New Roman, or Courier New), fontSize (8 to 36), bold, italic, and color (hex format, e.g. #000000).'
          }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              blocks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING, description: 'The exact text string in this block' },
                    x: { type: Type.NUMBER, description: 'Left horizontal coordinate as percentage of page width (0 to 100)' },
                    y: { type: Type.NUMBER, description: 'Top vertical coordinate as percentage of page height (0 to 100)' },
                    w: { type: Type.NUMBER, description: 'Width as percentage of page width (0 to 100)' },
                    h: { type: Type.NUMBER, description: 'Height as percentage of page height (0 to 100)' },
                    fontFamily: { type: Type.STRING, description: '"Helvetica", "Times New Roman" or "Courier New"' },
                    fontSize: { type: Type.NUMBER, description: 'Estimated font size in points' },
                    bold: { type: Type.BOOLEAN, description: 'Whether the text is bold' },
                    italic: { type: Type.BOOLEAN, description: 'Whether the text is italic' },
                    color: { type: Type.STRING, description: 'Hex color code of the text (e.g. #000000)' }
                  },
                  required: ['text', 'x', 'y', 'w', 'h', 'fontFamily', 'fontSize']
                }
              }
            },
            required: ['blocks']
          }
        }
      });

      const parsedData = JSON.parse(response.text);
      res.json({ success: true, blocks: parsedData.blocks });
    } catch (err: any) {
      console.error('Gemini Scanned OCR Layout Error:', err);
      res.status(500).json({ error: 'AI OCR Layout detection failed.', details: err.message });
    }
  });

  // AI OCR Text Correction & Formatting Endpoint
  app.post('/api/ai/ocr-correct', async (req, res) => {
    try {
      const { text, language, mode } = req.body;
      if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Text input is required for AI OCR correction.' });
      }

      const langName = language || 'English/Indian Languages';
      let prompt = `You are an expert OCR Error Correction & Document Restoration AI.
Analyze the following OCR-extracted text (Language context: ${langName}).

Tasks:
1. Fix OCR recognition mistakes, character confusions (e.g., '1' vs 'l' vs 'I', '0' vs 'O', 'rn' vs 'm'), split or merged words, missing spaces, and punctuation errors.
2. Fix spelling and grammar errors caused by scan noise while preserving the original facts, names, numbers, and exact core meaning.
3. Clean up broken lines and restore proper paragraph flow and structure.
4. Do NOT add any introductory chatter or commentary. Return ONLY the clean corrected text.

OCR TEXT TO CORRECT:
"${text.trim()}"`;

      if (mode === 'table') {
        prompt = `You are a Document Table Restorer AI.
Analyze the following OCR text and reconstruct any tabular structure into a clean, well-formatted Markdown Table.

OCR TEXT:
"${text.trim()}"`;
      }

      const response = await generateContentWithRetry({
        model: 'gemini-3.5-flash',
        contents: prompt,
        generationConfig: {
          temperature: 0.1,
        }
      });

      const correctedText = response?.text?.trim() || text;
      res.json({ success: true, correctedText });
    } catch (err: any) {
      console.error('AI OCR Correction Error:', err);
      res.status(500).json({ error: 'AI OCR Correction failed.', details: err.message });
    }
  });

  // AI OCR Text Correction & Formatting Endpoint
  app.post('/api/ai/ocr-correct', async (req, res) => {
    try {
      const { text, language, mode } = req.body;
      if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Text input is required for AI OCR correction.' });
      }

      const langName = language || 'English/Indian Languages';
      let prompt = `You are an expert OCR Error Correction & Document Restoration AI.
Analyze the following OCR-extracted text (Language context: ${langName}).

Tasks:
1. Fix OCR recognition mistakes, character confusions (e.g., '1' vs 'l' vs 'I', '0' vs 'O', 'rn' vs 'm'), split or merged words, missing spaces, and punctuation errors.
2. Fix spelling and grammar errors caused by scan noise while preserving the original facts, names, numbers, and exact core meaning.
3. Clean up broken lines and restore proper paragraph flow and structure.
4. Do NOT add any introductory chatter or commentary. Return ONLY the clean corrected text.

OCR TEXT TO CORRECT:
"${text.trim()}"`;

      if (mode === 'table') {
        prompt = `You are a Document Table Restorer AI.
Analyze the following OCR text and reconstruct any tabular structure into a clean, well-formatted Markdown Table.

OCR TEXT:
"${text.trim()}"`;
      }

      const response = await generateContentWithRetry({
        model: 'gemini-3.5-flash',
        contents: prompt,
        generationConfig: {
          temperature: 0.1,
        }
      });

      const correctedText = response?.text?.trim() || text;
      res.json({ success: true, correctedText });
    } catch (err: any) {
      console.error('AI OCR Correction Error:', err);
      res.status(500).json({ error: 'AI OCR Correction failed.', details: err.message });
    }
  });

  // AI OCR Text Correction & Formatting Endpoint
  app.post('/api/ai/ocr-correct', async (req, res) => {
    try {
      const { text, language, mode } = req.body;
      if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Text input is required for AI OCR correction.' });
      }

      const langName = language || 'English/Indian Languages';
      let prompt = `You are an expert OCR Error Correction & Document Restoration AI.
Analyze the following OCR-extracted text (Language context: ${langName}).

Tasks:
1. Fix OCR recognition mistakes, character confusions (e.g., '1' vs 'l' vs 'I', '0' vs 'O', 'rn' vs 'm'), split or merged words, missing spaces, and punctuation errors.
2. Fix spelling and grammar errors caused by scan noise while preserving the original facts, names, numbers, and exact core meaning.
3. Clean up broken lines and restore proper paragraph flow and structure.
4. Do NOT add any introductory chatter or commentary. Return ONLY the clean corrected text.

OCR TEXT TO CORRECT:
"${text.trim()}"`;

      if (mode === 'table') {
        prompt = `You are a Document Table Restorer AI.
Analyze the following OCR text and reconstruct any tabular structure into a clean, well-formatted Markdown Table.

OCR TEXT:
"${text.trim()}"`;
      }

      const response = await generateContentWithRetry({
        model: 'gemini-3.5-flash',
        contents: prompt,
        generationConfig: {
          temperature: 0.1,
        }
      });

      const correctedText = response?.text?.trim() || text;
      res.json({ success: true, correctedText });
    } catch (err: any) {
      console.error('AI OCR Correction Error:', err);
      res.status(500).json({ error: 'AI OCR Correction failed.', details: err.message });
    }
  });

  // AI Document Summarizer
  app.post('/api/ai/summarize', async (req, res) => {
    try {
      const { text, level } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Text content is required' });
      }

      const prompt = `Provide a ${level || 'detailed'} summary of the following document content. Break it down with headings, key takeaways, and bullet points:\n\n${text}`;
      
      const response = await generateContentWithRetry({
        model: 'gemini-3.5-flash',
        contents: prompt
      });

      res.json({ summary: response.text });
    } catch (err: any) {
      console.error('Gemini Summarizer Error:', err);
      res.status(500).json({ error: 'AI Summarization failed.', details: err.message });
    }
  });

  // AI Translation
  app.post('/api/ai/translate', async (req, res) => {
    try {
      const { text, targetLanguage } = req.body;
      if (!text || !targetLanguage) {
        return res.status(400).json({ error: 'Text and targetLanguage are required' });
      }

      const prompt = `Translate the following text accurately into ${targetLanguage}. Maintain the exact document structure, paragraphs, and styling format. Do not add any conversational remarks, only return the translation:\n\n${text}`;
      
      const response = await generateContentWithRetry({
        model: 'gemini-3.5-flash',
        contents: prompt
      });

      res.json({ translatedText: response.text });
    } catch (err: any) {
      console.error('Gemini Translation Error:', err);
      res.status(500).json({ error: 'AI Translation failed.', details: err.message });
    }
  });

  // AI Grammar Correction
  app.post('/api/ai/grammar', async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      const prompt = `Analyze the following text for spelling, punctuation, and grammatical mistakes. Return a corrected version of the text, followed by a brief, bulleted explanation of the corrections made (wrap explanation inside a clear block):\n\n${text}`;
      
      const response = await generateContentWithRetry({
        model: 'gemini-3.5-flash',
        contents: prompt
      });

      res.json({ result: response.text });
    } catch (err: any) {
      console.error('Gemini Grammar Error:', err);
      res.status(500).json({ error: 'AI Grammar review failed.', details: err.message });
    }
  });

  // AI Text Rewrite
  app.post('/api/ai/rewrite', async (req, res) => {
    try {
      const { text, tone } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      const prompt = `Rewrite the following text to make it sound highly ${tone || 'professional'} and engaging, while maintaining the exact core meaning. Return only the rewritten text:\n\n${text}`;
      
      const response = await generateContentWithRetry({
        model: 'gemini-3.5-flash',
        contents: prompt
      });

      res.json({ rewrittenText: response.text });
    } catch (err: any) {
      console.error('Gemini Rewrite Error:', err);
      res.status(500).json({ error: 'AI Rewrite failed.', details: err.message });
    }
  });

  // AI Chat Assistant (with context)
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { messages, documentContext } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages array is required' });
      }

      // Format messages into chat history
      const systemInstruction = `You are PDF Toolkit Pro's Document Assistant. You answer questions accurately based on the uploaded document context below. Be helpful, professional, and directly cite references from the document.
      
      DOCUMENT CONTEXT:
      ${documentContext || 'No document context uploaded yet. Answer general document or PDF processing queries.'}`;

      const apiMessages = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      // Last message is the active query
      const lastMessage = apiMessages[apiMessages.length - 1];
      const contents = apiMessages;

      const response = await generateContentWithRetry({
        model: 'gemini-3.5-flash',
        contents,
        config: {
          systemInstruction
        }
      });

      res.json({ text: response.text });
    } catch (err: any) {
      console.error('Gemini Chat Error:', err);
      res.status(500).json({ error: 'AI Chat Assistant failed.', details: err.message });
    }
  });

  // AI Image OCR and Table Extraction
  app.post('/api/ai/table-extraction', async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Image is required for table extraction' });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|webp|jpg);base64,/, '');
      const response = await generateContentWithRetry({
        model: 'gemini-3.5-flash',
        contents: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType || 'image/png'
            }
          },
          {
            text: 'Analyze this document. Detect any tables. Extract the structured tabular data and return it represented in a clean, standard Markdown table format, followed by a valid CSV string in a separate code block.'
          }
        ]
      });

      res.json({ result: response.text });
    } catch (err: any) {
      console.error('Gemini Table Extraction Error:', err);
      res.status(500).json({ error: 'AI Table Extraction failed.', details: err.message });
    }
  });






  
  app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send(`User-agent: *\nAllow: /\nSitemap: https://pdftoolkitpro.online/sitemap.xml\n`);
  });

  app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml');
    
    const currentDate = new Date().toISOString().split('T')[0];
    
    const staticPages = [
      { path: '/', priority: '1.0', changefreq: 'weekly' },
      { path: '/pricing', priority: '0.8', changefreq: 'weekly' },
      { path: '/blog', priority: '0.8', changefreq: 'weekly' },
      { path: '/contact', priority: '0.8', changefreq: 'weekly' },
      { path: '/about', priority: '0.8', changefreq: 'weekly' },
      { path: '/privacy', priority: '0.8', changefreq: 'weekly' },
      { path: '/terms', priority: '0.8', changefreq: 'weekly' },
      { path: '/disclaimer', priority: '0.8', changefreq: 'weekly' },
      { path: '/converter', priority: '0.8', changefreq: 'weekly' },
    ];

    const urlMap = new Map<string, { loc: string; lastmod: string; changefreq: string; priority: string }>();

    for (const page of staticPages) {
      const loc = `https://pdftoolkitpro.online${page.path}`;
      urlMap.set(loc, {
        loc,
        lastmod: currentDate,
        changefreq: page.changefreq,
        priority: page.priority,
      });
    }

    // Dynamically include tools from allToolsList (imported from src/data/tools.ts)
    const activeTools = allToolsList.filter(tool => !tool.hidden && !tool.disabled);

    for (const tool of activeTools) {
      const slug = getToolSlug(tool);
      const loc = `https://pdftoolkitpro.online/tools/${slug}`;
      if (!urlMap.has(loc)) {
        urlMap.set(loc, {
          loc,
          lastmod: currentDate,
          changefreq: 'weekly',
          priority: '0.9',
        });
      }
    }

    // Sort entries alphabetically by loc
    const sortedUrls = Array.from(urlMap.values()).sort((a, b) => a.loc.localeCompare(b.loc));

    const xmlEntries = sortedUrls.map(u => 
      `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
    ).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlEntries}\n</urlset>`;

    res.send(xml);
  });

  app.get('/sitemap-images.xml', (req, res) => {
    res.type('application/xml');
    const activeTools = allToolsList.filter(tool => !tool.hidden && !tool.disabled);
    const toolUrls = activeTools.map(t => ({
      loc: `https://pdftoolkitpro.online/tools/${getToolSlug(t)}`,
      img: `https://pdftoolkitpro.online/og-image.svg?title=${encodeURIComponent(t.name)}`,
      title: t.name
    }));
    
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${toolUrls.map(u => `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n    <image:image>\n      <image:loc>${escapeXml(u.img)}</image:loc>\n      <image:title>${escapeXml(u.title)}</image:title>\n    </image:image>\n  </url>`).join('\n')}\n</urlset>`;
    res.send(xml);
  });

  app.get('/sitemap-videos.xml', (req, res) => {
    res.type('application/xml');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n</urlset>`;
    res.send(xml);
  });

  app.get('/og-image.svg', (req, res) => {
    const title = (req.query.title as string) || 'PDF Toolkit Pro';
    res.type('image/svg+xml');
    res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <rect width="1200" height="630" fill="#0f172a" />
      <text x="600" y="315" font-family="sans-serif" font-size="72" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${escapeXml(title)}</text>
    </svg>`);
  });

  // ==========================================
  // 1. API ROUTES (Must be defined first!)
  // ==========================================

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Authentication
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    const lowerEmail = String(email || '').trim().toLowerCase();

    // Strict rule: Only the admin email can log in
    if (lowerEmail !== 'admin@pdftoolkitpro.online') {
      return res.status(403).json({ 
        error: 'Registration and user logins are disabled on this platform. Only the System Administrator can sign in.' 
      });
    }

    // Strict rule: Check the admin password
    if (password !== 'CCNTSPL@$1111') {
      return res.status(401).json({ 
        error: 'Invalid password. Access Denied.' 
      });
    }

    // Admin login succeeds - find the admin user in the database
    let adminUser = db.users.find(u => u.email.toLowerCase() === lowerEmail);
    if (!adminUser) {
      // Create admin user dynamically if not exists
      adminUser = {
        id: 'usr_admin',
        email: 'admin@pdftoolkitpro.online',
        username: 'System Admin',
        role: 'admin' as const,
        subscription: 'enterprise' as const,
        createdAt: new Date().toISOString(),
      };
      db.users.push(adminUser);
    }

    res.setHeader('Set-Cookie', `userId=${adminUser.id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000`);
    res.json({ user: adminUser, token: 'mock-jwt-token' });
  });

  app.post('/api/auth/signup', (req, res) => {
    return res.status(403).json({ 
      error: 'User registration is disabled. Only the System Administrator can access administrative features.' 
    });
  });

  // Get active user session
  app.get('/api/auth/me', (req, res) => {
    const cookieHeader = req.headers.cookie || '';
    const cookies = Object.fromEntries(cookieHeader.split(';').map(c => {
      const parts = c.split('=');
      return [parts[0].trim(), parts.slice(1).join('=')];
    }));
    const userId = cookies.userId;
    const currentUser = db.users.find(u => u.id === userId);
    
    if (currentUser) {
      res.json({ user: currentUser });
    } else {
      res.status(401).json({ error: 'Not authenticated' });
    }
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    res.setHeader('Set-Cookie', 'userId=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
    res.json({ success: true });
  });

  // Recent Files API
  app.get('/api/recent-files', (req, res) => {
    res.json({ files: db.recentFiles });
  });

  app.post('/api/recent-files', (req, res) => {
    const { name, size, type, toolUsed } = req.body;
    const newFile = {
      id: `f_${Date.now()}`,
      name: name || 'processed_document.pdf',
      size: size || '1.2 MB',
      type: type || 'application/pdf',
      toolUsed: toolUsed || 'Unknown Tool',
      date: new Date().toISOString(),
      status: 'completed' as const,
    };
    db.addFile(newFile);
    res.json({ file: newFile });
  });

  // Support Tickets API
  app.get('/api/support/tickets', (req, res) => {
    res.json({ tickets: db.supportTickets });
  });

  app.post('/api/support/tickets', (req, res) => {
    const { subject, message, category, email } = req.body;
    const newTicket = {
      id: `t_${Date.now()}`,
      subject: subject || 'User Support Request',
      message,
      status: 'open' as const,
      category: category || 'General',
      date: new Date().toISOString(),
      userEmail: email || 'visitor@example.com',
      replies: [
        {
          sender: 'user' as const,
          message,
          date: new Date().toISOString()
        }
      ]
    };
    db.addTicket(newTicket);
    res.json({ ticket: newTicket });
  });

  app.post('/api/support/tickets/:id/reply', (req, res) => {
    const { id } = req.params;
    const { message, sender } = req.body;
    const reply = {
      sender: sender || 'user',
      message,
      date: new Date().toISOString()
    };
    db.addTicketReply(id, reply);
    res.json({ ticket: db.supportTickets.find(t => t.id === id) });
  });

  app.post('/api/support/tickets/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const ticket = db.supportTickets.find(t => t.id === id);
    if (ticket && (status === 'open' || status === 'pending' || status === 'resolved')) {
      ticket.status = status;
    }
    res.json({ ticket });
  });

  // Admin API
  app.get('/api/admin/analytics', (req, res) => {
    const cookieHeader = req.headers.cookie || '';
    const cookies = Object.fromEntries(cookieHeader.split(';').map(c => {
      const parts = c.split('=');
      return [parts[0].trim(), parts.slice(1).join('=')];
    }));
    const userId = cookies.userId || req.headers['x-user-id'] || req.body?.userId;
    const currentUser = db.users.find(u => u.id === userId);

    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized. Admins only.' });
    }

    const activeDbUsersCount = db.users.length;
    const proDbUsersCount = db.users.filter(u => u.subscription === 'pro').length;
    const enterpriseDbUsersCount = db.users.filter(u => u.subscription === 'enterprise').length;

    // Dynamically calculated stats directly from the actual active database
    const dynamicAnalytics = {
      ...db.analytics,
      activeUsers: activeDbUsersCount,
      premiumSubscribers: proDbUsersCount + enterpriseDbUsersCount,
      monthlyRevenue: (proDbUsersCount * 9) + (enterpriseDbUsersCount * 49),
      platformUptime: '99.98%'
    };
    res.json({ analytics: dynamicAnalytics });
  });

  app.get('/api/admin/users', (req, res) => {
    const cookieHeader = req.headers.cookie || '';
    const cookies = Object.fromEntries(cookieHeader.split(';').map(c => {
      const parts = c.split('=');
      return [parts[0].trim(), parts.slice(1).join('=')];
    }));
    const userId = cookies.userId || req.headers['x-user-id'] || req.body?.userId;
    const currentUser = db.users.find(u => u.id === userId);

    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized. Admins only.' });
    }

    res.json({ users: db.users });
  });

  app.post('/api/admin/users/:id/subscription', (req, res) => {
    const cookieHeader = req.headers.cookie || '';
    const cookies = Object.fromEntries(cookieHeader.split(';').map(c => {
      const parts = c.split('=');
      return [parts[0].trim(), parts.slice(1).join('=')];
    }));
    const userId = cookies.userId || req.headers['x-user-id'] || req.body?.userId;
    const currentUser = db.users.find(u => u.id === userId);

    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized. Admins only.' });
    }

    const { id } = req.params;
    const { subscription } = req.body;
    const user = db.users.find(u => u.id === id);
    if (user) {
      user.subscription = subscription;
      res.json({ user });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });

  // Global Config Endpoint (Publicly queryable)
  app.get('/api/config', (req, res) => {
    res.json({ isDonationDisabled: db.isDonationDisabled });
  });

  // Admin Configuration Updates (Secured to admin session)
  app.post('/api/admin/config', (req, res) => {
    const cookieHeader = req.headers.cookie || '';
    const cookies = Object.fromEntries(cookieHeader.split(';').map(c => {
      const parts = c.split('=');
      return [parts[0].trim(), parts.slice(1).join('=')];
    }));
    const userId = cookies.userId || req.headers['x-user-id'] || req.body.userId;
    const currentUser = db.users.find(u => u.id === userId);

    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized. Admins only.' });
    }

    const { isDonationDisabled } = req.body;
    if (typeof isDonationDisabled === 'boolean') {
      db.isDonationDisabled = isDonationDisabled;
    }
    res.json({ success: true, isDonationDisabled: db.isDonationDisabled });
  });

  // Billing (Checkout & Coupon verification)
  app.post('/api/billing/coupon', (req, res) => {
    const { code } = req.body;
    if (code?.toUpperCase() === 'FREEPRO') {
      res.json({ valid: true, discount: 100, message: '100% OFF Code Applied Successfully!' });
    } else if (code?.toUpperCase() === 'WELCOME20') {
      res.json({ valid: true, discount: 20, message: '20% OFF Code Applied Successfully!' });
    } else {
      res.status(400).json({ valid: false, message: 'Invalid or Expired Promo Code' });
    }
  });

  app.post('/api/billing/checkout', (req, res) => {
    const { planId, email, stripeToken, couponCode } = req.body;
    const transactionId = `txn_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const date = new Date().toISOString();
    
    // Find plan
    const plan = db.plans.find(p => p.id === planId) || db.plans[1];
    
    // Simulate invoice generation
    const invoice = {
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      transactionId,
      planName: plan.name,
      amountPaid: couponCode?.toUpperCase() === 'FREEPRO' ? '$0.00' : plan.price,
      date,
      email: email || 'user@example.com',
    };

    // Update user sub if exists in DB
    const user = db.users.find(u => u.email.toLowerCase() === email?.toLowerCase());
    if (user) {
      user.subscription = planId === 'p_enterprise' ? 'enterprise' : 'pro';
    }

    res.json({
      success: true,
      invoice,
      message: 'Subscription updated successfully! Invoice has been generated.',
    });
  });

  // Native PDF Text Editing Endpoint using pdf-lib
  app.post('/api/pdf/edit', async (req, res) => {
    const { pdfBase64, page, textToFind, replacementText, pdfX, pdfY, fontSize, fontName, color, pdfW, pdfH, bold, italic } = req.body;
    
    if (!pdfBase64) {
      return res.status(400).json({ error: 'No PDF data provided' });
    }

    try {
      const updatedPdfBase64 = await editPdfTextWithPdfLib(
        pdfBase64,
        page || 1,
        replacementText || '',
        textToFind || '',
        pdfX || 0,
        pdfY || 0,
        fontSize || 12,
        fontName || 'Helvetica',
        color || '#000000',
        pdfW || 50,
        pdfH || 12,
        !!bold,
        !!italic
      );
      res.json({ success: true, pdfBase64: updatedPdfBase64 });
    } catch (err: any) {
      console.error('PDF editing failed with pdf-lib:', err);
      res.status(500).json({ error: 'Failed to process PDF editing', details: err.message });
    }
  });

  // Protect PDF Endpoint using @pdfsmaller/pdf-encrypt
  app.post('/api/pdf/protect', async (req, res) => {
    const { pdfBase64, password } = req.body;
    
    if (!pdfBase64) return res.status(400).json({ error: 'No PDF data provided' });
    if (!password) return res.status(400).json({ error: 'Password is required' });

    try {
      const pdfBytes = Uint8Array.from(Buffer.from(pdfBase64, 'base64'));
      const encryptedBytes = await encryptPDF(pdfBytes, password, { algorithm: 'AES-256' });
      const encryptedBase64 = Buffer.from(encryptedBytes).toString('base64');
      
      res.json({ success: true, pdfBase64: encryptedBase64 });
    } catch (err: any) {
      console.error('PDF encryption failed:', err);
      res.status(500).json({ error: 'Failed to protect PDF', details: err.message });
    }
  });

  // Compress PDF Endpoint using Ghostscript
  app.post('/api/pdf/compress', async (req, res) => {
    const { pdfBase64, compressionLevel } = req.body;
    
    if (!pdfBase64) return res.status(400).json({ error: 'No PDF data provided' });
    
    // compressionLevel 0-100 (0 = high quality/low compression, 100 = low quality/high compression)
    const level = Math.max(0, Math.min(100, parseInt(compressionLevel || '50', 10)));
    
    // Map to GS pdfsettings
    let pdfSettings = '/ebook'; // medium
    if (level < 25) pdfSettings = '/prepress';
    else if (level < 50) pdfSettings = '/printer';
    else if (level < 75) pdfSettings = '/ebook';
    else pdfSettings = '/screen';

    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `input_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`);
    const outputPath = path.join(tmpDir, `output_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`);

    try {
      // Write base64 to input file
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');
      await fsPromises.writeFile(inputPath, pdfBuffer);

      // Run ghostscript
      const gsArgs = [
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.4',
        `-dPDFSETTINGS=${pdfSettings}`,
        '-dNOPAUSE',
        '-dQUIET',
        '-dBATCH',
        `-sOutputFile=${outputPath}`,
        inputPath
      ];

      await execFileAsync('gs', gsArgs);

      // Read output file
      const compressedBuffer = await fsPromises.readFile(outputPath);
      const compressedBase64 = compressedBuffer.toString('base64');
      
      const originalSize = pdfBuffer.length;
      const newSize = compressedBuffer.length;
      const reductionPercent = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));

      res.json({ 
        success: true, 
        pdfBase64: compressedBase64,
        stats: {
          originalSize,
          newSize,
          reductionPercent
        }
      });
    } catch (err: any) {
      console.error('PDF compression failed:', err);
      res.status(500).json({ error: 'Failed to compress PDF', details: err.message });
    } finally {
      // Clean up
      try {
        await fsPromises.unlink(inputPath).catch(() => {});
        await fsPromises.unlink(outputPath).catch(() => {});
      } catch (e) {}
    }
  });

  // AI Background Removal API Health Check
  app.get('/api/health/rembg', async (req, res) => {
    try {
      const response = await fetch('https://www.rembg.com/api/membership-usage?listBillingCycles=1', {
        headers: {
          'x-api-key': process.env.REMOVE_BG_API_KEY || '74626bff-7dbb-442f-9550-fa3c5d8fb1cb',
        },
      });
      if (response.ok) {
        res.json({ status: 'connected' });
      } else {
        res.json({ status: 'disconnected', error: response.statusText });
      }
    } catch (err: any) {
      res.json({ status: 'disconnected', error: err.message });
    }
  });

  // AI Background Removal using rembg.com API
  app.post('/api/ai/remove-bg', async (req, res) => {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    try {
      const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|webp|jpg);base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      
      const formData = new FormData();
      formData.append('image', new Blob([buffer], { type: 'image/png' }), 'image.png');
      formData.append('format', 'png');
      
      const response = await fetch('https://api.rembg.com/rmbg', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.REMOVE_BG_API_KEY || '74626bff-7dbb-442f-9550-fa3c5d8fb1cb',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`rembg.com API Error: ${response.status} - ${errorText}`);
      }

      const outputBuffer = await response.arrayBuffer();
      const outputBase64 = `data:image/png;base64,${Buffer.from(outputBuffer).toString('base64')}`;

      res.json({ success: true, imageBase64: outputBase64 });
    } catch (err: any) {
      console.error('Background removal failed:', err);
      res.status(500).json({ error: 'AI Background Removal failed.', details: err.message });
    }
  });

  // ==========================================

  // OCR Endpoint (Extract Text from Image/Scanned PDF screenshot)
  app.post('/api/ai/ocr', async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Image data is required' });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|webp|jpg);base64,/, '');
      const response = await generateContentWithRetry({
        model: 'gemini-3.5-flash',
        contents: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType || 'image/png'
            }
          },
          {
            text: 'Extract all the printed and handwritten text from this document image cleanly. Do not explain anything, just output the exact extracted text as a readable document format.'
          }
        ]
      });

      res.json({ text: response.text });
    } catch (err: any) {
      console.error('Gemini OCR Error:', err);
      res.status(500).json({ error: 'AI OCR Processing failed. Please verify your Gemini API key.', details: err.message });
    }
  });

  // Scanned PDF OCR Layout Detector Endpoint
  app.post('/api/ai/scanned-ocr', async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Image data is required' });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|webp|jpg);base64,/, '');
      const response = await generateContentWithRetry({
        model: 'gemini-3.5-flash',
        contents: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType || 'image/png'
            }
          },
          {
            text: 'Analyze this scanned document page image and detect all text fields. For each text block/line, calculate its precise coordinates as percentages relative to the total page width and height (x: left percentage 0-100, y: top percentage 0-100, w: width percentage 0-100, h: height percentage 0-100). Keep the coordinates precise so they perfectly bounding-box the text. Provide the text contents, fontFamily (Helvetica, Times New Roman, or Courier New), fontSize (8 to 36), bold, italic, and color (hex format, e.g. #000000).'
          }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              blocks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING, description: 'The exact text string in this block' },
                    x: { type: Type.NUMBER, description: 'Left horizontal coordinate as percentage of page width (0 to 100)' },
                    y: { type: Type.NUMBER, description: 'Top vertical coordinate as percentage of page height (0 to 100)' },
                    w: { type: Type.NUMBER, description: 'Width as percentage of page width (0 to 100)' },
                    h: { type: Type.NUMBER, description: 'Height as percentage of page height (0 to 100)' },
                    fontFamily: { type: Type.STRING, description: '"Helvetica", "Times New Roman" or "Courier New"' },
                    fontSize: { type: Type.NUMBER, description: 'Estimated font size in points' },
                    bold: { type: Type.BOOLEAN, description: 'Whether the text is bold' },
                    italic: { type: Type.BOOLEAN, description: 'Whether the text is italic' },
                    color: { type: Type.STRING, description: 'Hex color code of the text (e.g. #000000)' }
                  },
                  required: ['text', 'x', 'y', 'w', 'h', 'fontFamily', 'fontSize']
                }
              }
            },
            required: ['blocks']
          }
        }
      });

      const parsedData = JSON.parse(response.text);
      res.json({ success: true, blocks: parsedData.blocks });
    } catch (err: any) {
      console.error('Gemini Scanned OCR Layout Error:', err);
      res.status(500).json({ error: 'AI OCR Layout detection failed.', details: err.message });
    }
  });

  // AI OCR Text Correction & Formatting Endpoint
  app.post('/api/ai/ocr-correct', async (req, res) => {
    try {
      const { text, language, mode } = req.body;
      if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Text input is required for AI OCR correction.' });
      }

      const langName = language || 'English/Indian Languages';
      let prompt = `You are an expert OCR Error Correction & Document Restoration AI.
Analyze the following OCR-extracted text (Language context: ${langName}).

Tasks:
1. Fix OCR recognition mistakes, character confusions (e.g., '1' vs 'l' vs 'I', '0' vs 'O', 'rn' vs 'm'), split or merged words, missing spaces, and punctuation errors.
2. Fix spelling and grammar errors caused by scan noise while preserving the original facts, names, numbers, and exact core meaning.
3. Clean up broken lines and restore proper paragraph flow and structure.
4. Do NOT add any introductory chatter or commentary. Return ONLY the clean corrected text.

OCR TEXT TO CORRECT:
"${text.trim()}"`;

      if (mode === 'table') {
        prompt = `You are a Document Table Restorer AI.
Analyze the following OCR text and reconstruct any tabular structure into a clean, well-formatted Markdown Table.

OCR TEXT:
"${text.trim()}"`;
      }

      const response = await generateContentWithRetry({
        model: 'gemini-3.5-flash',
        contents: prompt,
        generationConfig: {
          temperature: 0.1,
        }
      });

      const correctedText = response?.text?.trim() || text;
      res.json({ success: true, correctedText });
    } catch (err: any) {
      console.error('AI OCR Correction Error:', err);
      res.status(500).json({ error: 'AI OCR Correction failed.', details: err.message });
    }
  });

  // AI Document Summarizer
  app.post('/api/ai/summarize', async (req, res) => {
    try {
      const { text, level } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Text content is required' });
      }

      const prompt = `Provide a ${level || 'detailed'} summary of the following document content. Break it down with headings, key takeaways, and bullet points:\n\n${text}`;
      
      const response = await generateContentWithRetry({
        model: 'gemini-3.5-flash',
        contents: prompt
      });

      res.json({ summary: response.text });
    } catch (err: any) {
      console.error('Gemini Summarizer Error:', err);
      res.status(500).json({ error: 'AI Summarization failed.', details: err.message });
    }
  });

  // AI Translation
  app.post('/api/ai/translate', async (req, res) => {
    try {
      const { text, targetLanguage } = req.body;
      if (!text || !targetLanguage) {
        return res.status(400).json({ error: 'Text and targetLanguage are required' });
      }

      const prompt = `Translate the following text accurately into ${targetLanguage}. Maintain the exact document structure, paragraphs, and styling format. Do not add any conversational remarks, only return the translation:\n\n${text}`;
      
      const response = await generateContentWithRetry({
        model: 'gemini-3.5-flash',
        contents: prompt
      });

      res.json({ translatedText: response.text });
    } catch (err: any) {
      console.error('Gemini Translation Error:', err);
      res.status(500).json({ error: 'AI Translation failed.', details: err.message });
    }
  });

  // AI Grammar Correction
  app.post('/api/ai/grammar', async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      const prompt = `Analyze the following text for spelling, punctuation, and grammatical mistakes. Return a corrected version of the text, followed by a brief, bulleted explanation of the corrections made (wrap explanation inside a clear block):\n\n${text}`;
      
      const response = await generateContentWithRetry({
        model: 'gemini-3.5-flash',
        contents: prompt
      });

      res.json({ result: response.text });
    } catch (err: any) {
      console.error('Gemini Grammar Error:', err);
      res.status(500).json({ error: 'AI Grammar review failed.', details: err.message });
    }
  });

  // AI Text Rewrite
  app.post('/api/ai/rewrite', async (req, res) => {
    try {
      const { text, tone } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      const prompt = `Rewrite the following text to make it sound highly ${tone || 'professional'} and engaging, while maintaining the exact core meaning. Return only the rewritten text:\n\n${text}`;
      
      const response = await generateContentWithRetry({
        model: 'gemini-3.5-flash',
        contents: prompt
      });

      res.json({ rewrittenText: response.text });
    } catch (err: any) {
      console.error('Gemini Rewrite Error:', err);
      res.status(500).json({ error: 'AI Rewrite failed.', details: err.message });
    }
  });

  // AI Chat Assistant (with context)
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { messages, documentContext } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages array is required' });
      }

      // Format messages into chat history
      const systemInstruction = `You are PDF Toolkit Pro's Document Assistant. You answer questions accurately based on the uploaded document context below. Be helpful, professional, and directly cite references from the document.
      
      DOCUMENT CONTEXT:
      ${documentContext || 'No document context uploaded yet. Answer general document or PDF processing queries.'}`;

      const apiMessages = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      // Last message is the active query
      const lastMessage = apiMessages[apiMessages.length - 1];
      const contents = apiMessages;

      const response = await generateContentWithRetry({
        model: 'gemini-3.5-flash',
        contents,
        config: {
          systemInstruction
        }
      });

      res.json({ text: response.text });
    } catch (err: any) {
      console.error('Gemini Chat Error:', err);
      res.status(500).json({ error: 'AI Chat Assistant failed.', details: err.message });
    }
  });

  // AI Image OCR and Table Extraction
  app.post('/api/ai/table-extraction', async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Image is required for table extraction' });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|webp|jpg);base64,/, '');
      const response = await generateContentWithRetry({
        model: 'gemini-3.5-flash',
        contents: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType || 'image/png'
            }
          },
          {
            text: 'Analyze this document. Detect any tables. Extract the structured tabular data and return it represented in a clean, standard Markdown table format, followed by a valid CSV string in a separate code block.'
          }
        ]
      });

      res.json({ result: response.text });
    } catch (err: any) {
      console.error('Gemini Table Extraction Error:', err);
      res.status(500).json({ error: 'AI Table Extraction failed.', details: err.message });
    }
  });






  // Pre-load tools list to use in server-side SEO
  let allTools = [];
  try {
    const toolsCode = fs.readFileSync('src/data/tools.ts', 'utf8');
    const toolRegex = /id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*description:\s*'([^']+)'/g;
    let match;
    while ((match = toolRegex.exec(toolsCode)) !== null) {
      allTools.push({ id: match[1], name: match[2], description: match[3] });
    }
  } catch (err) {
    console.error("Failed to parse tools for SEO:", err);
  }

  app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send(`User-agent: *\nAllow: /\nSitemap: https://pdftoolkitpro.online/sitemap.xml`);
  });


  app.get('/sitemap-images.xml', (req, res) => {
    res.type('application/xml');
    const toolUrls = allTools.map(t => ({
      loc: `https://pdftoolkitpro.online/tools/${t.id}`,
      img: `https://pdftoolkitpro.online/og-image.svg?title=${encodeURIComponent(t.name)}`,
      title: t.name
    }));
    
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n  ${toolUrls.map(u => `<url>\n    <loc>${u.loc}</loc>\n    <image:image>\n      <image:loc>${u.img}</image:loc>\n      <image:title>${u.title.replace(/&/g, '&amp;')}</image:title>\n    </image:image>\n  </url>`).join('\n  ')}\n</urlset>`;
    res.send(xml);
  });
  
  app.get('/sitemap-videos.xml', (req, res) => {
    res.type('application/xml');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n  <!-- Video sitemap structure ready for future tutorials -->\n</urlset>`;
    res.send(xml);
  });
  
  app.get('/sitemap.xml', (req, res) => {

    res.type('application/xml');
    const staticUrls = [
      '/', '/tools', '/dashboard', '/pricing', '/donation', '/blog', '/contact', '/docs', '/about', '/privacy', '/terms', '/disclaimer', '/converter'
    ];
    const toolUrls = allTools.map(t => '/tools/' + t.id);
    const urls = [...staticUrls, ...toolUrls];
    
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  ${urls.map(url => `<url><loc>https://pdftoolkitpro.online${url}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`).join('\n  ')}\n</urlset>`;
    res.send(xml);
  });
  
  // Dynamic OG image endpoint
  app.get('/og-image.svg', (req, res) => {
    const title = typeof req.query.title === 'string' ? req.query.title : 'PDF Toolkit Pro';
    res.type('image/svg+xml');
    res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <rect width="1200" height="630" fill="#0f172a" />
      <text x="600" y="315" font-family="sans-serif" font-size="72" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${title.replace(/</g, '&lt;')}</text>
    </svg>`);
  });

  // Serve robots.txt
  app.get(['/robots.txt', '/robots', '/robots.txt/'], (req, res) => {
    res.status(200);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const robotsPath = path.join(process.cwd(), 'public', 'robots.txt');
    const distRobotsPath = path.join(process.cwd(), 'dist', 'robots.txt');
    if (fs.existsSync(robotsPath)) {
      return res.send(fs.readFileSync(robotsPath, 'utf-8'));
    } else if (fs.existsSync(distRobotsPath)) {
      return res.send(fs.readFileSync(distRobotsPath, 'utf-8'));
    }
    res.send(`User-agent: *\nAllow: /\nSitemap: https://pdftoolkitpro.online/sitemap.xml\n`);
  });

  // Serve BingSiteAuth.xml (Bing Webmaster Verification)
  app.get(['/BingSiteAuth.xml', '/bingsiteauth.xml'], (req, res) => {
    res.status(200);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const bingAuthPath = path.join(process.cwd(), 'public', 'BingSiteAuth.xml');
    const distBingPath = path.join(process.cwd(), 'dist', 'BingSiteAuth.xml');
    if (fs.existsSync(bingAuthPath)) {
      return res.send(fs.readFileSync(bingAuthPath, 'utf-8'));
    } else if (fs.existsSync(distBingPath)) {
      return res.send(fs.readFileSync(distBingPath, 'utf-8'));
    }
    res.send(`<?xml version="1.0"?>\n<users>\n\t<user>2999381AFC1C190810593353997BC842</user>\n</users>`);
  });

  // Dynamic OG image endpoint
  app.get('/og-image.svg', (req, res) => {
    const title = typeof req.query.title === 'string' ? req.query.title : 'PDF Toolkit Pro';
    res.type('image/svg+xml');
    res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <rect width="1200" height="630" fill="#0f172a" />
      <text x="600" y="315" font-family="sans-serif" font-size="72" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${title.replace(/</g, '&lt;')}</text>
    </svg>`);
  });

  // Serve sitemap.xml and all sitemap aliases
  const serveSitemap = (req: express.Request, res: express.Response) => {
    res.status(200);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    const publicSitemap = path.join(process.cwd(), 'public', 'sitemap.xml');
    const distSitemap = path.join(process.cwd(), 'dist', 'sitemap.xml');
    
    if (fs.existsSync(publicSitemap)) {
      return res.send(fs.readFileSync(publicSitemap, 'utf-8'));
    }
    if (fs.existsSync(distSitemap)) {
      return res.send(fs.readFileSync(distSitemap, 'utf-8'));
    }
    
    const staticUrls = [
      '/', '/tools', '/converter', '/blog', '/pricing', '/donation', '/docs', '/contact', '/about', '/privacy', '/terms', '/disclaimer'
    ];
    const toolUrls = allToolsList.filter(t => !t.hidden).map(t => '/tools/' + (t.slug || t.id));
    const blogUrls = ['/blog/b_001', '/blog/b_002', '/blog/b_003'];
    const urls = Array.from(new Set([...staticUrls, ...toolUrls, ...blogUrls]));
    const today = new Date().toISOString().split('T')[0];
    
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.map(url => `<url><loc>https://pdftoolkitpro.online${url}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${url === '/' ? '1.0' : url.startsWith('/tools/') ? '0.9' : '0.8'}</priority></url>`).join('\n  ')}
</urlset>`;
    res.send(xml);
  };

  app.get([
    '/sitemap.xml',
    '/sitemap',
    '/sitemap/',
    '/sitemap.xml/',
    '/sitemap_index.xml',
    '/sitemap-index.xml',
    '/sitemaps.xml'
  ], serveSitemap);

  // Serve LLMs.txt for AI Search Engines (ChatGPT, Perplexity, Gemini, Claude)
  const serveLlmsTxt = (req: express.Request, res: express.Response) => {
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    const llmsFile = path.join(process.cwd(), 'public', 'llms.txt');
    if (fs.existsSync(llmsFile)) {
      return res.send(fs.readFileSync(llmsFile, 'utf-8'));
    }
    const distLlms = path.join(process.cwd(), 'dist', 'llms.txt');
    if (fs.existsSync(distLlms)) {
      return res.send(fs.readFileSync(distLlms, 'utf-8'));
    }
    res.status(404).send('# PDF Toolkit Pro\n\n> Free online PDF tools & workspace.');
  };

  const serveLlmsFullTxt = (req: express.Request, res: express.Response) => {
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    const llmsFullFile = path.join(process.cwd(), 'public', 'llms-full.txt');
    if (fs.existsSync(llmsFullFile)) {
      return res.send(fs.readFileSync(llmsFullFile, 'utf-8'));
    }
    const distLlmsFull = path.join(process.cwd(), 'dist', 'llms-full.txt');
    if (fs.existsSync(distLlmsFull)) {
      return res.send(fs.readFileSync(distLlmsFull, 'utf-8'));
    }
    res.status(404).send('# PDF Toolkit Pro Full Docs\n\n> Free online PDF tools reference.');
  };

  app.get(['/llms.txt', '/llms.txt/'], serveLlmsTxt);
  app.get(['/llms-full.txt', '/llms-full.txt/'], serveLlmsFullTxt);

  // ==========================================
  // 3. VITE DEV SERVER OR STATIC FILE SERVING
  // ==========================================

  if (process.env.NODE_ENV !== 'production') {
    // Mount Vite dev server in development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve compiled assets in production mode
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));

    app.get('*', async (req, res) => {
      try {
        let template = await fsPromises.readFile(path.join(distPath, 'index.html'), 'utf-8');
        
        // Simple SSR Meta Tag injection based on route
        let title = "PDF Toolkit Pro | Free Online PDF Tools & AI Workspace";
        let desc = "Free online PDF tools to convert, merge, compress, edit, split, and sign PDFs securely in your browser. Fast, free, and no installation required.";
        let url = `https://pdftoolkitpro.online${req.url.split('?')[0]}`;
        
        if (req.url === '/tools' || req.url === '/tools/' || req.url.startsWith('/tools?')) {
          title = "All Free Online PDF & Document Tools | PDF Toolkit Pro";
          desc = "Browse all 40+ free online PDF, image, and conversion tools. Merge, edit, convert, OCR, and sign PDF files directly in your browser.";
        } else if (req.url.startsWith('/tools/')) {
          const toolId = req.url.split('/')[2]?.split('?')[0];
          const tool = allToolsList.find(t => getToolSlug(t) === toolId || t.id === toolId || t.id.replace(/_/g, '-') === toolId);
          if (tool) {
            title = tool.seoTitle || `${tool.name} - Free Online PDF Tool | PDF Toolkit Pro`;
            desc = tool.seoDescription || tool.description;
          }
        } else if (req.url.startsWith('/dashboard')) {
          title = "My Dashboard | PDF Toolkit Pro";
          desc = "Access your recent PDF files, favorite tools, and secure cloud workspace settings on PDF Toolkit Pro.";
        } else if (req.url.startsWith('/pricing') || req.url.startsWith('/donation')) {
          title = "Support & Pricing | PDF Toolkit Pro";
          desc = "Support PDF Toolkit Pro development or learn more about our 100% free community tools and server donations.";
        } else if (req.url.startsWith('/blog')) {
          title = "PDF & Document Blog | PDF Toolkit Pro";
          desc = "Read helpful guides, tutorials, and tips on managing, converting, merging, and editing PDF documents online.";
        } else if (req.url.startsWith('/contact')) {
          title = "Contact & Helpdesk | PDF Toolkit Pro";
          desc = "Get in touch with the PDF Toolkit Pro support team for inquiries, bug reports, and technical assistance.";
        } else {
          const cleanPath = req.url.split('?')[0].replace(/^\/+|\/+$/g, '');
          const directTool = allToolsList.find(t => getToolSlug(t) === cleanPath || t.id === cleanPath || t.id.replace(/_/g, '-') === cleanPath);
          if (directTool) {
            title = directTool.seoTitle || `${directTool.name} - Free Online PDF Tool | PDF Toolkit Pro`;
            desc = directTool.seoDescription || directTool.description;
          }
        }

        // Clean desc length to stay strictly within 110-155 characters for Bing & Google
        if (desc && desc.length > 155) {
          desc = desc.substring(0, 152).trim() + '...';
        }
        
        const ogImage = `https://pdftoolkitpro.online/og-image.svg?title=${encodeURIComponent(title)}`;
        
        // Remove ALL existing title and meta description tags globally to prevent any duplicates
        template = template.replace(/<title[^>]*>[\s\S]*?<\/title>\s*/gi, '');
        template = template.replace(/<meta[^>]*name=["']description["'][^>]*>\s*/gi, '');
        
        // Remove ANY existing canonical tags first to prevent duplicates
        template = template.replace(/<link[^>]*rel=["']canonical["'][^>]*>\s*/gi, '');
        
        // Remove existing duplicate OpenGraph/Twitter tags if any
        template = template.replace(/<meta property=["']og:[^"']*["'][^>]*>\s*/gi, '');
        template = template.replace(/<meta name=["']twitter:[^"']*["'][^>]*>\s*/gi, '');

        // Add clean single title + description + canonical + OpenGraph tags and Twitter card
        const seoTags = `
    <title data-rh="true">${title}</title>
    <meta data-rh="true" name="description" content="${desc}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${desc}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${desc}" />
    <meta name="twitter:image" content="${ogImage}" />`;
        
        template = template.replace('</head>', `${seoTags}\n  </head>`);
        
        // Inject page-specific noscript fallback for search engine bots (Bing / Google)
        const noscriptBotContent = `
    <noscript>
      <div style="padding: 2rem; max-width: 1200px; margin: 0 auto; text-align: center; font-family: system-ui, -apple-system, sans-serif;">
        <h1 style="font-size: 2rem; font-weight: 800; color: #0f172a; margin-bottom: 0.5rem;">${title}</h1>
        <p style="font-size: 1rem; color: #475569;">${desc}</p>
      </div>
    </noscript>`;
        template = template.replace(/<noscript>[\s\S]*?<\/noscript>/i, noscriptBotContent);
        
        res.send(template);
      } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
      }
    });

  }

  // AI OCR Text Correction & Formatting Endpoint
  app.post('/api/ai/ocr-correct', async (req, res) => {
    try {
      const { text, language, mode } = req.body;
      if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Text input is required for AI OCR correction.' });
      }

      const langName = language || 'English/Indian Languages';
      let prompt = `You are an expert OCR Error Correction & Document Restoration AI.
Analyze the following OCR-extracted text (Language context: ${langName}).

Tasks:
1. Fix OCR recognition mistakes, character confusions (e.g., '1' vs 'l' vs 'I', '0' vs 'O', 'rn' vs 'm'), split or merged words, missing spaces, and punctuation errors.
2. Fix spelling and grammar errors caused by scan noise while preserving the original facts, names, numbers, and exact core meaning.
3. Clean up broken lines and restore proper paragraph flow and structure.
4. Do NOT add any introductory chatter or commentary. Return ONLY the clean corrected text.

OCR TEXT TO CORRECT:
"${text.trim()}"`;

      if (mode === 'table') {
        prompt = `You are a Document Table Restorer AI.
Analyze the following OCR text and reconstruct any tabular structure into a clean, well-formatted Markdown Table.

OCR TEXT:
"${text.trim()}"`;
      }

      const response = await generateContentWithRetry({
        model: 'gemini-3.5-flash',
        contents: prompt,
        generationConfig: {
          temperature: 0.1,
        }
      });

      const correctedText = response?.text?.trim() || text;
      res.json({ success: true, correctedText });
    } catch (err: any) {
      console.error('AI OCR Correction Error:', err);
      res.status(500).json({ error: 'AI OCR Correction failed.', details: err.message });
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PDF Toolkit Pro Server is actively running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to boot PDF Toolkit Pro backend server:', error);
});
