import React from 'react';
import { Helmet } from 'react-helmet-async';
import { SUPPORTED_LANGUAGES_LIST } from '../utils/languageConfig';

export interface AlternateHreflang {
  lang: string;
  href: string;
}

export interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  keywords?: string | string[];
  schema?: any;
  currentLanguage?: string;
  lang?: string;
  alternateLinks?: AlternateHreflang[];
  noHreflang?: boolean;
}

const DEFAULT_KEYWORDS = [
  'pdf toolkit',
  'pdf toolkit pro',
  'pdftoolkitpro.online',
  'free pdf tools',
  'merge pdf online',
  'split pdf free',
  'compress pdf securely',
  'convert pdf to word',
  'pdf to excel converter',
  'pdf to jpg high quality',
  'jpg to pdf converter',
  'word to pdf online',
  'ocr pdf free',
  'pdf ocr online',
  'ai ocr reader',
  'pdf summarizer ai',
  'ai pdf summarizer',
  'sign pdf online',
  'e-sign pdf free',
  'electronic signature online',
  'protect pdf with password',
  'password protect pdf online',
  'decrypt pdf',
  'remove pdf password securely',
  'add watermark to pdf',
  'pdf watermark editor free',
  'reorder pdf pages online',
  'rotate pdf online',
  'crop pdf free',
  'extract images from pdf',
  'pdf editor free no install',
  'browser-native pdf editor',
  'secure pdf processing online',
  'offline pdf tools',
  'high speed pdf conversion',
  'ai document workspace',
  'free ocr tool online',
  'convert scan to text ai',
  'read handwriting ai'
];

const OG_LOCALE_MAP: Record<string, string> = {
  ar: 'ar_AR',
  id: 'id_ID',
  de: 'de_DE',
  da: 'da_DK',
  cs: 'cs_CZ',
  en: 'en_US',
  es: 'es_ES',
  el: 'el_GR',
  fr: 'fr_FR',
  it: 'it_IT',
  ja: 'ja_JP',
  ko: 'ko_KR',
  'zh-CN': 'zh_CN',
  'zh-TW': 'zh_TW',
  hi: 'hi_IN',
  he: 'he_IL',
  hu: 'hu_HU',
  nl: 'nl_NL',
  no: 'nb_NO',
  pl: 'pl_PL',
  pt: 'pt_BR',
  ro: 'ro_RO',
  ru: 'ru_RU',
  fi: 'fi_FI',
  sv: 'sv_SE',
  th: 'th_TH',
  vi: 'vi_VN',
  tr: 'tr_TR',
  uk: 'uk_UA',
};

function getActiveLanguage(explicitLang?: string): string {
  if (explicitLang && explicitLang !== 'auto') {
    return explicitLang.toLowerCase();
  }
  
  if (typeof window !== 'undefined') {
    // 1. URL search param e.g. ?lang=es
    try {
      const params = new URLSearchParams(window.location.search);
      const urlLang = params.get('lang') || params.get('locale');
      if (urlLang) return urlLang.toLowerCase();
    } catch {
      // ignore
    }

    // 2. localStorage preferences
    try {
      const stored = localStorage.getItem('preferred_language') || localStorage.getItem('pdf_editor_language');
      if (stored && stored !== 'auto') return stored.toLowerCase();
    } catch {
      // ignore
    }

    // 3. documentElement lang
    if (document.documentElement.lang && document.documentElement.lang !== 'en') {
      return document.documentElement.lang.toLowerCase();
    }
  }

  return 'en';
}

function buildLanguageUrl(baseUrl: string, langCode: string): string {
  try {
    const url = new URL(baseUrl);
    if (langCode === 'en' || langCode === 'x-default') {
      url.searchParams.delete('lang');
      url.searchParams.delete('locale');
    } else {
      url.searchParams.set('lang', langCode);
    }
    return url.toString();
  } catch {
    if (langCode === 'en' || langCode === 'x-default') {
      return baseUrl;
    }
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}lang=${encodeURIComponent(langCode)}`;
  }
}

export default function SEO({
  title,
  description,
  canonical,
  keywords,
  schema,
  currentLanguage,
  lang,
  alternateLinks,
  noHreflang = false
}: SEOProps) {
  const siteUrl = 'https://pdftoolkitpro.online';
  
  // Base canonical URL without extra lang query
  const rawCanonical = canonical || '/';
  const baseCleanCanonical = rawCanonical.startsWith('http')
    ? rawCanonical
    : `${siteUrl}${rawCanonical.startsWith('/') ? rawCanonical : '/' + rawCanonical}`;

  // Determine active language
  const activeLang = getActiveLanguage(lang || currentLanguage);
  const matchedLang = SUPPORTED_LANGUAGES_LIST.find(
    l => l.code.toLowerCase() === activeLang.toLowerCase() || l.code.toLowerCase() === activeLang.split('-')[0]
  );
  const isRtl = matchedLang?.isRtl || activeLang === 'ar' || activeLang === 'he';
  const currentOgLocale = OG_LOCALE_MAP[activeLang] || 'en_US';

  // Full canonical for the current document
  const fullCanonical = activeLang === 'en'
    ? baseCleanCanonical
    : buildLanguageUrl(baseCleanCanonical, activeLang);

  const keywordString = keywords
    ? (Array.isArray(keywords) ? keywords.join(', ') : keywords)
    : DEFAULT_KEYWORDS.join(', ');

  // Clean description length to stay strictly within 110-155 characters for Bing & Google
  const cleanDescription = description && description.length > 155
    ? description.substring(0, 152).trim() + '...'
    : description;

  // Generate hreflang items
  const hreflangItems: AlternateHreflang[] = alternateLinks && alternateLinks.length > 0
    ? alternateLinks
    : [
        // x-default points to base canonical (default fallback)
        { lang: 'x-default', href: buildLanguageUrl(baseCleanCanonical, 'x-default') },
        // All 29 supported languages
        ...SUPPORTED_LANGUAGES_LIST.map(l => ({
          lang: l.code,
          href: buildLanguageUrl(baseCleanCanonical, l.code)
        }))
      ];

  return (
    <Helmet>
      {/* HTML Tag Lang & Dir Attributes */}
      <html lang={activeLang} dir={isRtl ? 'rtl' : 'ltr'} />

      <title>{title}</title>
      <meta name="description" content={cleanDescription} />
      <meta name="keywords" content={keywordString} />
      <link rel="canonical" href={fullCanonical} />

      {/* Multilingual Discovery: hreflang tags for all 29 supported languages */}
      {!noHreflang && hreflangItems.map((item, idx) => (
        <link
          key={`hreflang-${item.lang}-${idx}`}
          rel="alternate"
          hrefLang={item.lang}
          href={item.href}
        />
      ))}

      {/* Content Language Meta */}
      <meta httpEquiv="content-language" content={activeLang} />
      
      {/* OpenGraph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={cleanDescription} />
      <meta property="og:url" content={fullCanonical} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content={currentOgLocale} />
      {Object.entries(OG_LOCALE_MAP)
        .filter(([code]) => code !== activeLang)
        .slice(0, 6)
        .map(([code, locale]) => (
          <meta key={`og-alt-${code}`} property="og:locale:alternate" content={locale} />
        ))}
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={cleanDescription} />

      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
}

