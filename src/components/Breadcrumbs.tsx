import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Home, ChevronRight } from 'lucide-react';
import { allToolsList } from '../data/tools';

interface BreadcrumbsProps {
  pathSegments: string[];
}

const segmentLabels: Record<string, string> = {
  tools: 'Tools',
  dashboard: 'Dashboard',
  converter: 'Universal Converter',
  donation: 'Support Us',
  pricing: 'Pricing',
  blog: 'Blog',
  contact: 'Contact Us',
  tickets: 'Support Tickets',
  support: 'Support Tickets',
  'support-tickets': 'Support Tickets',
  about: 'About Us',
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
  disclaimer: 'Disclaimer',
  docs: 'API Documentation',
  admin: 'Admin Portal'
};

export function getSegmentLabel(segment: string): string {
  if (segmentLabels[segment.toLowerCase()]) {
    return segmentLabels[segment.toLowerCase()];
  }
  
  const normalizedSegment = segment.replace(/_/g, '-').toLowerCase();
  const matchedTool = allToolsList.find(
    t => t.id === segment || 
         t.id.toLowerCase() === normalizedSegment || 
         t.id.replace(/_/g, '-').toLowerCase() === normalizedSegment
  );
  if (matchedTool) {
    return matchedTool.name;
  }
  
  return segment
    .split(/[-_]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function Breadcrumbs({ pathSegments }: BreadcrumbsProps) {
  const navigate = useNavigate();
  const siteUrl = 'https://pdftoolkitpro.online';

  // Build the breadcrumb paths and items
  const breadcrumbItems = pathSegments.map((segment, index) => {
    const urlPath = '/' + pathSegments.slice(0, index + 1).join('/');
    const label = getSegmentLabel(segment);
    return {
      name: label,
      path: urlPath,
    };
  });

  // Home is always the first item
  const allItems = [
    { name: 'Home', path: '/' },
    ...breadcrumbItems
  ];

  // Dynamically generate BreadcrumbList JSON-LD
  const jsonLdSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': allItems.map((item, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'name': item.name,
      'item': item.path === '/' ? siteUrl : `${siteUrl}${item.path}`
    }))
  };

  return (
    <>
      {/* Dynamic SEO JSON-LD injection */}
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(jsonLdSchema)}
        </script>
      </Helmet>

      {/* Breadcrumbs Navigation UI */}
      <nav 
        id="seo-breadcrumbs-nav"
        aria-label="Breadcrumb" 
        className="flex items-center space-x-1.5 text-xs font-semibold tracking-wide text-slate-500 dark:text-zinc-400 select-none overflow-x-auto whitespace-nowrap scrollbar-none py-1"
      >
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;

          return (
            <React.Fragment key={item.path}>
              {index > 0 && (
                <ChevronRight id={`breadcrumb-separator-${index}`} className="h-3 w-3 text-slate-300 dark:text-zinc-600 flex-shrink-0" />
              )}
              
              {isLast ? (
                <span 
                  id={`breadcrumb-current-page`}
                  className="text-slate-800 dark:text-zinc-100 font-bold truncate max-w-[200px] sm:max-w-[300px]"
                  aria-current="page"
                >
                  {item.name}
                </span>
              ) : (
                <button
                  id={`breadcrumb-item-btn-${index}`}
                  onClick={() => navigate(item.path)}
                  className="inline-flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer text-slate-500 dark:text-zinc-400 font-semibold"
                >
                  {index === 0 && <Home className="h-3 w-3 text-slate-400 dark:text-zinc-500 flex-shrink-0" />}
                  <span>{item.name}</span>
                </button>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </>
  );
}
