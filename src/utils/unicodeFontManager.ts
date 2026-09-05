import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, StandardFonts, PDFFont } from 'pdf-lib';
import { detectScriptAndDirection, SupportedLanguage } from './languageConfig';

// In-memory binary font buffers cache
const fontBufferCache: Record<string, ArrayBuffer> = {};

// Font URL mappings for scripts
const FONT_URL_MAP: Record<string, { regular: string[]; bold?: string[] }> = {
  arabic: {
    regular: [
      '/fonts/NotoSansArabic-Regular.ttf',
      'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansArabic/NotoSansArabic-Regular.ttf'
    ]
  },
  hebrew: {
    regular: [
      '/fonts/NotoSansHebrew-Regular.ttf',
      '/fonts/FreeSans.ttf',
      'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansHebrew/NotoSansHebrew-Regular.ttf'
    ]
  },
  devanagari: {
    regular: [
      '/fonts/NotoSansDevanagari-Regular.ttf',
      '/fonts/NotoSansDevanagari.ttf',
      'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf'
    ]
  },
  thai: {
    regular: [
      '/fonts/NotoSansThai-Regular.ttf',
      'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansThai/NotoSansThai-Regular.ttf'
    ]
  },
  cyrillic: {
    regular: [
      '/fonts/NotoSans-Regular.ttf',
      '/fonts/FreeSans.ttf'
    ],
    bold: [
      '/fonts/NotoSans-Bold.ttf',
      '/fonts/FreeSansBold.ttf'
    ]
  },
  greek: {
    regular: [
      '/fonts/NotoSans-Regular.ttf',
      '/fonts/FreeSans.ttf'
    ],
    bold: [
      '/fonts/NotoSans-Bold.ttf',
      '/fonts/FreeSansBold.ttf'
    ]
  },
  vietnamese: {
    regular: [
      '/fonts/NotoSans-Regular.ttf',
      '/fonts/FreeSans.ttf'
    ],
    bold: [
      '/fonts/NotoSans-Bold.ttf',
      '/fonts/FreeSansBold.ttf'
    ]
  },
  'cjk-sc': {
    regular: [
      'https://cdn.jsdelivr.net/npm/@canvas-fonts/noto-sans-sc@1.0.4/NotoSansSC-Regular.ttf',
      '/fonts/FreeSans.ttf'
    ]
  },
  'cjk-tc': {
    regular: [
      'https://cdn.jsdelivr.net/npm/@canvas-fonts/noto-sans-tc@1.0.4/NotoSansTC-Regular.ttf',
      '/fonts/FreeSans.ttf'
    ]
  },
  'cjk-jp': {
    regular: [
      'https://cdn.jsdelivr.net/npm/@canvas-fonts/noto-sans-jp@1.0.4/NotoSansJP-Regular.ttf',
      '/fonts/FreeSans.ttf'
    ]
  },
  'cjk-kr': {
    regular: [
      'https://cdn.jsdelivr.net/npm/@canvas-fonts/noto-sans-kr@1.0.4/NotoSansKR-Regular.ttf',
      '/fonts/FreeSans.ttf'
    ]
  },
  latin_extended: {
    regular: [
      '/fonts/NotoSans-Regular.ttf',
      '/fonts/FreeSans.ttf'
    ],
    bold: [
      '/fonts/NotoSans-Bold.ttf',
      '/fonts/FreeSansBold.ttf'
    ]
  }
};

/**
 * Fetch and cache font bytes from local or CDN URLs
 */
export async function fetchFontBuffer(urls: string[]): Promise<ArrayBuffer | null> {
  for (const url of urls) {
    if (fontBufferCache[url] && fontBufferCache[url].byteLength > 100) {
      return fontBufferCache[url];
    }
    try {
      const res = await fetch(url);
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) {
          const buf = await res.arrayBuffer();
          const firstByte = new Uint8Array(buf)[0];
          // Check it is a valid binary TTF/OTF and not HTML error page
          if (firstByte !== 0x3C && buf.byteLength > 1000) {
            fontBufferCache[url] = buf;
            return buf;
          }
        }
      }
    } catch (err) {
      console.warn(`Could not load font from ${url}:`, err);
    }
  }
  return null;
}

/**
 * Register fontkit on PDFDocument safely
 */
export function ensureFontkit(pdfDoc: PDFDocument) {
  try {
    const fk = (fontkit as any).default || fontkit;
    pdfDoc.registerFontkit(fk);
  } catch (err) {
    // Already registered or unsupported
  }
}

/**
 * Check if the text needs special Unicode or multi-language font
 */
export function needsMultiLanguageFont(text: string): boolean {
  if (!text) return false;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // Currency symbols like ₹ (0x20B9), ₺, ₴, ₫, ₪, ฿ or non-ASCII characters
    if (code > 255 || code === 0x20B9 || code === 8377 || code === 0x20AA || code === 0x0E3F || code === 0x20AB) {
      return true;
    }
  }
  return false;
}

/**
 * Embeds the best matching font for the given text and language into a PDFDocument
 */
export async function getAppropriateUnicodeFont(
  pdfDoc: PDFDocument,
  fontFamily: string = 'Helvetica',
  isBold: boolean = false,
  isItalic: boolean = false,
  text: string = '',
  selectedLanguageCode?: string
): Promise<PDFFont> {
  ensureFontkit(pdfDoc);

  const { script } = detectScriptAndDirection(text);

  // If text contains multi-language characters or specific script is detected
  if (needsMultiLanguageFont(text) || (script && script !== 'latin') || selectedLanguageCode) {
    let scriptKey = script;
    if (selectedLanguageCode) {
      if (selectedLanguageCode === 'ar') scriptKey = 'arabic';
      else if (selectedLanguageCode === 'he') scriptKey = 'hebrew';
      else if (selectedLanguageCode === 'hi') scriptKey = 'devanagari';
      else if (selectedLanguageCode === 'th') scriptKey = 'thai';
      else if (selectedLanguageCode === 'ru' || selectedLanguageCode === 'uk') scriptKey = 'cyrillic';
      else if (selectedLanguageCode === 'el') scriptKey = 'greek';
      else if (selectedLanguageCode === 'vi') scriptKey = 'vietnamese';
      else if (selectedLanguageCode === 'zh-CN') scriptKey = 'cjk-sc';
      else if (selectedLanguageCode === 'zh-TW') scriptKey = 'cjk-tc';
      else if (selectedLanguageCode === 'ja') scriptKey = 'cjk-jp';
      else if (selectedLanguageCode === 'ko') scriptKey = 'cjk-kr';
      else if (['cs', 'pl', 'hu', 'ro', 'tr', 'da', 'no', 'sv', 'fi', 'de', 'es', 'fr', 'pt'].includes(selectedLanguageCode)) {
        scriptKey = 'latin_extended';
      }
    }

    const fontConfig = FONT_URL_MAP[scriptKey] || FONT_URL_MAP.latin_extended;
    const urls = (isBold && fontConfig.bold) ? fontConfig.bold : fontConfig.regular;

    try {
      const buffer = await fetchFontBuffer(urls);
      if (buffer && buffer.byteLength > 1000) {
        return await pdfDoc.embedFont(new Uint8Array(buffer.slice(0)), { subset: true });
      }
    } catch (err) {
      console.warn(`Failed embedding font for script ${scriptKey}:`, err);
    }

    // Try fallback to FreeSans or NotoSans
    try {
      const fallbackBuf = await fetchFontBuffer(['/fonts/NotoSans-Regular.ttf', '/fonts/FreeSans.ttf']);
      if (fallbackBuf && fallbackBuf.byteLength > 1000) {
        return await pdfDoc.embedFont(new Uint8Array(fallbackBuf.slice(0)), { subset: true });
      }
    } catch (fbErr) {
      console.warn('Fallback font embed failed:', fbErr);
    }
  }

  // Standard Core 14 Fonts fallback
  let stdFont: StandardFonts;
  const family = (fontFamily || 'Helvetica').toLowerCase();
  if (family.includes('times') || (family.includes('serif') && !family.includes('sans-serif') && !family.includes('sansserif'))) {
    if (isBold && isItalic) stdFont = StandardFonts.TimesRomanBoldItalic;
    else if (isBold) stdFont = StandardFonts.TimesRomanBold;
    else if (isItalic) stdFont = StandardFonts.TimesRomanItalic;
    else stdFont = StandardFonts.TimesRoman;
  } else if (family.includes('courier') || family.includes('mono') || family.includes('code')) {
    if (isBold && isItalic) stdFont = StandardFonts.CourierBoldOblique;
    else if (isBold) stdFont = StandardFonts.CourierBold;
    else if (isItalic) stdFont = StandardFonts.CourierOblique;
    else stdFont = StandardFonts.Courier;
  } else {
    if (isBold && isItalic) stdFont = StandardFonts.HelveticaBoldOblique;
    else if (isBold) stdFont = StandardFonts.HelveticaBold;
    else if (isItalic) stdFont = StandardFonts.HelveticaOblique;
    else stdFont = StandardFonts.Helvetica;
  }

  return await pdfDoc.embedFont(stdFont);
}
