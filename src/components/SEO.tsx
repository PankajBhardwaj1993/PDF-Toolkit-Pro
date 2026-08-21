import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  keywords?: string | string[];
  schema?: any;
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

export default function SEO({ title, description, canonical, keywords, schema }: SEOProps) {
  const siteUrl = 'https://pdftoolkitpro.online';
  const fullCanonical = canonical ? (siteUrl + canonical) : siteUrl;

  const keywordString = keywords
    ? (Array.isArray(keywords) ? keywords.join(', ') : keywords)
    : DEFAULT_KEYWORDS.join(', ');

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywordString} />
      <link rel="canonical" href={fullCanonical} />
      
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={fullCanonical} />
      <meta property="og:type" content="website" />
      
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />

      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
}
