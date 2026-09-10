import { ToolSeoContent } from './types';

export interface ToolBasicInfo {
  id: string;
  name: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  category?: string;
}

export function generateToolSchema(tool: ToolBasicInfo, seoData?: ToolSeoContent | null) {
  const siteUrl = 'https://pdftoolkitpro.online';
  const toolSlug = tool.id.replace(/_/g, '-');
  const canonicalUrl = seoData?.canonicalUrl || `${siteUrl}/tools/${tool.id}`;
  const toolName = tool.name;
  const toolTitle = seoData?.seoTitle || tool.seoTitle || `${toolName} - Free Online PDF Tool | PDF Toolkit Pro`;
  const toolDesc = seoData?.seoDescription || tool.seoDescription || tool.description || `Free browser-native online tool for ${toolName}. Fast, secure, and private.`;

  // Determine specific applicationCategory based on tool type
  let applicationCategory = 'UtilitiesApplication';
  const idLower = tool.id.toLowerCase();
  if (idLower.includes('excel') || idLower.includes('word') || idLower.includes('powerpoint') || idLower.includes('editor')) {
    applicationCategory = 'BusinessApplication';
  } else if (idLower.includes('image') || idLower.includes('photo') || idLower.includes('crop') || idLower.includes('resize')) {
    applicationCategory = 'MultimediaApplication';
  } else if (idLower.includes('protect') || idLower.includes('unlock') || idLower.includes('password') || idLower.includes('sign')) {
    applicationCategory = 'SecurityApplication';
  }

  const featureList = seoData?.features?.map(f => f.title) || [
    '100% Client-Side Processing',
    'No File Uploads to External Cloud',
    'Free Unlimited Usage',
    'Instant Browser Download'
  ];

  const graph: any[] = [
    // 1. WebSite Reference
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      "url": `${siteUrl}/`,
      "name": "PDF Toolkit Pro",
      "description": "Free online PDF tools to convert, merge, compress, edit, split, and sign PDFs securely in your browser.",
      "publisher": {
        "@id": `${siteUrl}/#organization`
      }
    },

    // 2. Organization Reference
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      "name": "PDF Toolkit Pro",
      "url": `${siteUrl}/`,
      "logo": {
        "@type": "ImageObject",
        "url": `${siteUrl}/logo.png`,
        "caption": "PDF Toolkit Pro"
      }
    },

    // 3. WebPage definition
    {
      "@type": "WebPage",
      "@id": `${canonicalUrl}#webpage`,
      "url": canonicalUrl,
      "name": toolTitle,
      "description": toolDesc,
      "isPartOf": {
        "@id": `${siteUrl}/#website`
      },
      "breadcrumb": {
        "@id": `${canonicalUrl}#breadcrumb`
      },
      "inLanguage": "en"
    },

    // 4. SoftwareApplication & WebApplication (Matching Main Page Pattern)
    {
      "@type": ["SoftwareApplication", "WebApplication"],
      "@id": `${canonicalUrl}#software`,
      "name": `${toolName} - PDF Toolkit Pro`,
      "url": canonicalUrl,
      "description": toolDesc,
      "operatingSystem": "All (Web Browser, Windows, macOS, Linux, iOS, Android)",
      "applicationCategory": applicationCategory,
      "applicationSubCategory": "PDF & Document Processing",
      "browserRequirements": "Requires HTML5 compatible web browser",
      "softwareVersion": "4.2.0",
      "offers": {
        "@type": "Offer",
        "price": "0.00",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock"
      },
      "featureList": featureList,
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "ratingCount": "142",
        "bestRating": "5",
        "worstRating": "1"
      }
    },

    // 5. BreadcrumbList
    {
      "@type": "BreadcrumbList",
      "@id": `${canonicalUrl}#breadcrumb`,
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": `${siteUrl}/`
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Tools",
          "item": `${siteUrl}/tools`
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": toolName,
          "item": canonicalUrl
        }
      ]
    }
  ];

  // 6. HowTo Schema (if steps are defined)
  if (seoData?.howToSteps && seoData.howToSteps.length > 0) {
    graph.push({
      "@type": "HowTo",
      "@id": `${canonicalUrl}#howto`,
      "name": seoData.howToTitle || `How to use ${toolName} Online for Free`,
      "description": seoData.intro || toolDesc,
      "step": seoData.howToSteps.map((step, idx) => ({
        "@type": "HowToStep",
        "position": step.step || (idx + 1),
        "name": step.title,
        "text": step.description,
        "url": `${canonicalUrl}#step-${step.step || (idx + 1)}`
      }))
    });
  }

  // 7. FAQPage Schema (if FAQs are defined)
  if (seoData?.faqs && seoData.faqs.length > 0) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${canonicalUrl}#faq`,
      "mainEntity": seoData.faqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph
  };
}
