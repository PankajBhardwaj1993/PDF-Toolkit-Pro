import React, { useState, useEffect, Suspense } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import SEO from './components/SEO';
import Breadcrumbs from './components/Breadcrumbs';

import ToolGrid from './components/ToolGrid';
import ToolActiveView from './components/ToolActiveView';
import BlogView from './components/BlogView';
const DashboardView = React.lazy(() => import('./components/DashboardView'));
const PricingView = React.lazy(() => import('./components/PricingView'));
const DonationView = React.lazy(() => import('./components/DonationView'));
const ContactView = React.lazy(() => import('./components/ContactView'));
const DocumentationView = React.lazy(() => import('./components/DocumentationView'));
const AdminView = React.lazy(() => import('./components/AdminView'));
const InfoPagesView = React.lazy(() => import('./components/InfoPagesView'));
const ConverterView = React.lazy(() => import('./components/ConverterView'));
const NotFoundView = React.lazy(() => import('./components/NotFoundView'));












import { allToolsList } from './data/tools';
import { getToolSeoContent } from './data/seo';
import { User, BlogPost } from './types';
import { 
  Loader2,
  ShieldAlert, ShieldCheck, Eye, EyeOff, Laptop, Sparkles, HelpCircle, Star, Sparkle, Zap, 
  MessageSquare, FileText, CheckCircle2, Moon, Sun, ArrowRight,
  CheckCircle, Download, Share2, Copy, Heart, QrCode as QrIcon, X
} from 'lucide-react';
import QRCode from 'qrcode';

const CONVERTER_TOOL_IDS = [
  'pdf_to_word', 'pdf_to_excel', 'pdf_to_powerpoint', 'pdf_to_image', 'pdf_to_text', 'pdf_to_html',
  'word_to_pdf', 'word_to_image', 'word_to_text', 'word_to_html',
  'excel_to_pdf', 'excel_to_data',
  'powerpoint_to_pdf', 'powerpoint_to_images',
  'image_to_pdf', 'image_to_image',
  'text_to_pdf', 'text_to_word', 'text_to_html',
  'html_to_pdf', 'html_to_word', 'html_to_image',
  'data_to_excel', 'data_to_word', 'data_to_powerpoint', 'data_to_image', 'data_to_data',
  'converter'
];

const isConverterTool = (id: string | null) => {
  if (!id) return false;
  const normalized = id.toLowerCase().replace(/-/g, '_');
  return CONVERTER_TOOL_IDS.includes(normalized) || CONVERTER_TOOL_IDS.includes(id);
};

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);
  let activeTab = 'tools';
  let selectedToolId = null;
  let is404 = false;

  const VALID_TABS = [
    'tools',
    'dashboard',
    'converter',
    'donation',
    'pricing',
    'blog',
    'contact',
    'about',
    'privacy',
    'terms',
    'disclaimer',
    'docs',
    'admin'
  ];

  if (pathSegments.length > 0) {
    if (pathSegments[0] === 'tools') {
      if (pathSegments[1]) {
        const routeId = pathSegments[1].toLowerCase();
        const matchedTool = allToolsList.find(
          t => t.id.toLowerCase() === routeId || 
               t.id.replace(/_/g, '-').toLowerCase() === routeId ||
               (t.slug && t.slug.toLowerCase() === routeId)
        );
        if (matchedTool) {
          selectedToolId = matchedTool.id;
          activeTab = 'tools';
          is404 = false;
        } else {
          is404 = true;
        }
        if (pathSegments.length > 2) {
          is404 = true;
        }
      } else {
        // Direct /tools or /tools/ URL requested - load All Tools catalog
        activeTab = 'tools';
        selectedToolId = null;
        is404 = false;
      }
    } else if (VALID_TABS.includes(pathSegments[0])) {
      activeTab = pathSegments[0];
      if (pathSegments[0] === 'blog') {
        if (pathSegments.length > 2) {
          is404 = true;
        }
      } else {
        if (pathSegments.length > 1) {
          is404 = true;
        }
      }
    } else {
      // Check if root path matches any tool slug or id directly (e.g. /merge-pdf)
      const routeId = pathSegments[0].toLowerCase();
      const matchedTool = allToolsList.find(
        t => t.id.toLowerCase() === routeId || 
             t.id.replace(/_/g, '-').toLowerCase() === routeId ||
             (t.slug && t.slug.toLowerCase() === routeId)
      );
      if (matchedTool && pathSegments.length === 1) {
        selectedToolId = matchedTool.id;
        activeTab = 'tools';
        is404 = false;
      } else {
        is404 = true;
      }
    }
  }
  

  const [searchQuery, setSearchQuery] = useState('');
  
  // Theme & User Authentication states
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    // Detect OS-level system theme preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true; // Default to dark mode
  });
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  // Auth Form inputs
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Favorites state (persisted client side)
  const [favorites, setFavorites] = useState<string[]>(['merge_pdf', 'compress_image', 'text_to_speech']);

  // Global download popup states
  const [showGlobalDownload, setShowGlobalDownload] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadName, setDownloadName] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isDonationDisabled, setIsDonationDisabled] = useState(false);

  const fetchConfig = async (retries = 2) => {
    try {
      const res = await fetch('/api/config');
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        setIsDonationDisabled(!!data.isDonationDisabled);
      }
    } catch (e) {
      if (retries > 0) {
        setTimeout(() => fetchConfig(retries - 1), 1000);
      } else {
        setIsDonationDisabled(false);
      }
    }
  };

  const upiId = "bhardwajpankaj267-2@okaxis";
  const upiOwnerName = "Pankaj Bhardwaj";

  // Global download interception setup
  useEffect(() => {
    const originalCreateElement = document.createElement;
    document.createElement = function <K extends keyof HTMLElementTagNameMap>(
      tagName: K,
      options?: ElementCreationOptions
    ): HTMLElementTagNameMap[K] {
      const element = originalCreateElement.call(document, tagName, options);
      if (tagName.toLowerCase() === 'a') {
        const anchor = element as HTMLAnchorElement;
        const originalClick = anchor.click;
        anchor.click = function() {
          if (anchor.hasAttribute('download') && !(anchor as any).__bypassModal) {
            const fileHref = anchor.href || anchor.getAttribute('href');
            const fileDownload = anchor.getAttribute('download') || 'download';
            if (fileHref) {
              setDownloadUrl(fileHref);
              setDownloadName(fileDownload);
              setShowGlobalDownload(true);
            }
          }
          return originalClick.apply(this, arguments);
        };
      }
      return element;
    };

    return () => {
      document.createElement = originalCreateElement;
    };
  }, []);

  // UPI QR Code Generator
  useEffect(() => {
    if (showGlobalDownload) {
      const upiUri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiOwnerName)}&cu=INR`;
      QRCode.toDataURL(upiUri, {
        width: 350,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      })
      .then(url => {
        setQrDataUrl(url);
      })
      .catch(err => {
        console.error('Failed to generate secure QR code for download modal:', err);
      });
    }
  }, [showGlobalDownload]);

  const handlePopupDownload = () => {
    if (!downloadUrl) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = downloadName || 'download';
    (a as any).__bypassModal = true;
    document.body.appendChild(a);
    a.click();
    if (a.parentNode) {
      a.parentNode.removeChild(a);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://pdftoolkitpro.online');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    // Sync dark mode style injection
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Always scroll to top when changing routes, opening a tool, or switching tabs
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [path, selectedToolId, activeTab]);

  // Redirect admin from 'contact' tab to 'admin' tab
  useEffect(() => {
    if (activeTab === 'contact' && user?.role === 'admin') {
      navigate('/admin');
    }
  }, [activeTab, user]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 1. Ctrl+K or Cmd+K: Open/Focus the search bar
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        
        // Navigate back to tools if we are on a tool subpage or different tab
        if (activeTab !== 'tools' || selectedToolId !== null) {
          navigate('/');
        }
        
        // Focus the search input element
        setTimeout(() => {
          const searchInput = document.getElementById('nav-search-input') as HTMLInputElement | null;
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
        }, 50);
      }

      // 2. Esc: Close any active modal
      if (event.key === 'Escape') {
        setShowAuthModal(false);
        setAuthError(null);
        setShowGlobalDownload(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTab, selectedToolId, navigate]);

  // Restore user session on mount
  const checkSession = async (retries = 2) => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (e) {
      if (retries > 0) {
        setTimeout(() => checkSession(retries - 1), 1000);
      }
    }
  };

  useEffect(() => {
    checkSession();
    fetchConfig();
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [activeTab]);

  const handleToggleFavorite = (toolId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      if (prev.includes(toolId)) {
        return prev.filter(id => id !== toolId);
      } else {
        return [...prev, toolId];
      }
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: passwordInput }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setShowAuthModal(false);
        setEmailInput('');
        setPasswordInput('');
        if (data.user?.role === 'admin') {
          navigate('/admin');
        }
      } else {
        setAuthError(data.error || 'Authentication failed.');
      }
    } catch (err) {
      setAuthError('Connection error.');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: passwordInput, username: usernameInput }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setShowAuthModal(false);
        setEmailInput('');
        setPasswordInput('');
        setUsernameInput('');
      } else {
        setAuthError(data.error || 'Registration failed.');
      }
    } catch (err) {
      setAuthError('Connection error.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      navigate('/');
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddRecentFile = async (file: { name: string; size: string; type: string; toolUsed: string }) => {
    try {
      await fetch('/api/recent-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(file),
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b0e14] text-slate-800 dark:text-slate-200 transition-colors duration-300 w-full max-w-[100vw] overflow-x-hidden">
      
      {/* Top Banner: All files encrypted & auto-deleted after processing */}
      <div className="w-full bg-emerald-500/10 dark:bg-emerald-950/20 border-b border-emerald-500/15 py-1.5 overflow-hidden relative z-50">
        <div className="max-w-[1850px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 relative">
          <div className="animate-sweep-horizontal whitespace-nowrap inline-block">
            <span className="animate-pop-up-down inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px] sm:text-xs uppercase tracking-wider">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              All files encrypted & auto-deleted after processing.
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          navigate('/' + (tab === 'tools' ? '' : tab));
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        user={user}
        onLogout={handleLogout}
        onLoginClick={() => {
          setAuthMode('login');
          setShowAuthModal(true);
        }}
        favorites={favorites}
        setSelectedToolId={(id) => navigate(id ? '/tools/' + id : '/')}
        isDonationDisabled={isDonationDisabled}
      />

      {/* Main Content Area Routing */}
      <main className="flex-grow">
        {pathSegments.length > 0 && !is404 && (
          <div className="border-b border-slate-200/50 dark:border-zinc-800/40 bg-white/50 dark:bg-[#0c1017]/40 backdrop-blur-sm">
            <div className="max-w-[1850px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-3">
              <Breadcrumbs pathSegments={pathSegments} />
            </div>
          </div>
        )}
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>}>
        {is404 ? (
          <NotFoundView allToolsList={allToolsList} />
        ) : selectedToolId ? (
          <>
            {(() => {
              const currentTool = allToolsList.find(t => t.id === selectedToolId || t.id.replace(/_/g, '-') === selectedToolId);
              const seoData = getToolSeoContent(selectedToolId);
              if (currentTool || seoData) {
                const title = seoData?.seoTitle || currentTool?.seoTitle || `${currentTool?.name || 'PDF Tool'} | Free Online PDF Toolkit Pro`;
                const description = seoData?.seoDescription || currentTool?.seoDescription || currentTool?.description || 'Free browser-native PDF and document tool.';
                const canonical = seoData?.canonicalUrl || `https://pdftoolkitpro.online/tools/${selectedToolId}`;
                const keywords = seoData?.secondaryKeywords 
                  ? [seoData.primaryKeyword, ...seoData.secondaryKeywords] 
                  : (currentTool?.seoKeywords || ['PDF tools', 'online converter']);
                return (
                  <SEO
                    title={title}
                    description={description}
                    canonical={canonical}
                    keywords={keywords}
                  />
                );
              }
              return null;
            })()}
            {isConverterTool(selectedToolId) ? (
              <ConverterView
                initialToolId={selectedToolId}
                onBackToTools={() => navigate('/')}
                onAddRecentFile={handleAddRecentFile}
              />
            ) : (
              <ToolActiveView
                toolId={selectedToolId}
                onBack={() => navigate('/')}
                user={user}
                onAddRecentFile={handleAddRecentFile}
              />
            )}
          </>
        ) : activeTab === 'tools' ? (
          <>
            
            {/* SEO and Schema for Home Page */}
            <SEO 
              title={location.pathname.startsWith('/tools') ? "All Free Online PDF & Document Tools | PDF Toolkit Pro" : "Free Online PDF Tools | Edit, Convert & Manage PDFs - PDF Toolkit Pro"}
              description="Free online PDF tools to convert, merge, compress, edit, split, and sign PDFs securely in your browser. Fast, free, and no installation required."
              canonical={location.pathname.startsWith('/tools') ? "https://pdftoolkitpro.online/tools" : "https://pdftoolkitpro.online/"}
              keywords={[
                'PDF tools online',
                'free PDF tools',
                'online PDF tools',
                'PDF toolkit',
                'PDF converter',
                'pdf toolkit pro',
                'pdftoolkitpro.online',
                'free online pdf editor',
                'convert pdf to word online',
                'merge pdf online free',
                'split pdf pages securely',
                'compress pdf online',
                'e-sign pdf documents',
                'ai ocr document scanner',
                'offline browser-native pdf tools'
              ]}
              schema={[
                {
                  "@context": "https://schema.org",
                  "@type": "WebSite",
                  "name": "PDF Toolkit Pro",
                  "url": "https://pdftoolkitpro.online",
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": "https://pdftoolkitpro.online/?q={search_term_string}",
                    "query-input": "required name=search_term_string"
                  }
                },
                {
                  "@context": "https://schema.org",
                  "@type": "Organization",
                  "name": "PDF Toolkit Pro",
                  "url": "https://pdftoolkitpro.online",
                  "logo": "https://pdftoolkitpro.online/logo.png",
                  "sameAs": [
                    "https://twitter.com/pdftoolkitpro"
                  ]
                },
                {
                  "@context": "https://schema.org",
                  "@type": "SoftwareApplication",
                  "name": "PDF Toolkit Pro",
                  "operatingSystem": "All",
                  "applicationCategory": "BusinessApplication",
                  "browserRequirements": "Requires HTML5 compatible browser",
                  "offers": {
                    "@type": "Offer",
                    "price": "0.00",
                    "priceCurrency": "USD"
                  },
                  "featureList": "PDF Editor, PDF Merge, PDF Split, Compress PDF, PDF to Word, Word to PDF, AI OCR, Text to Speech, Sign PDF, Draw Signature, Password Protection",
                  "aggregateRating": {
                    "@type": "AggregateRating",
                    "ratingValue": "4.9",
                    "ratingCount": "1248"
                  }
                },
                {
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  "mainEntity": [
                    {
                      "@type": "Question",
                      "name": "Is PDF Toolkit Pro really free?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Yes! PDF Toolkit Pro is 100% free with no hidden charges, subscription requirements, or annoying watermarks on your document outputs."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "Are my files safe on pdftoolkitpro.online?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Absolutely. Most of our tools run entirely client-side inside your browser, which means your documents and personal signatures never touch any cloud server. For AI-powered tools, files are processed instantly and deleted immediately, ensuring maximum compliance and privacy."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "What kind of tools does PDF Toolkit Pro offer?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "PDF Toolkit Pro offers a comprehensive set of browser tools: PDF merger, PDF page splitter, PDF compression, e-signatures, password protect/unlock, JPEG/PNG to PDF, PDF to editable Word/Excel formats, AI OCR scanner, AI text enhancer, and robust Text to Speech generation."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "Do I need to download or install any software?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "No. Everything works directly in your web browser. You do not need to install any Chrome extensions, desktop apps, or mobile software."
                      }
                    }
                  ]
                }
              ]}
            />

            <ToolGrid
              onSelectTool={(id) => navigate(id ? '/tools/' + id : '/')}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              allToolsList={allToolsList}
            />

            {/* Static Landing Page Blocks (Faqs, Testimonials, Footer CTAs) */}
            {searchQuery === '' && (
              <>
                {/* Frequently Asked Questions */}
                <section className="py-12 bg-white dark:bg-zinc-950 border-t border-b border-slate-200 dark:border-zinc-900 px-4 sm:px-6 lg:px-8 xl:px-12">
                  <div className="max-w-[1850px] mx-auto space-y-6">
                    <div className="text-center max-w-3xl mx-auto">
                      <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-zinc-50 tracking-tight">
                        Answers to Common Questions
                      </h2>
                      <p className="text-slate-400 mt-1 text-xs sm:text-sm">
                        Learn about our browser-native encryption protocols and Gemini AI features.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                      <div className="p-4 bg-slate-50/50 dark:bg-zinc-900/10 rounded-xl border border-slate-100 dark:border-zinc-900/50 space-y-1.5">
                        <h4 className="font-bold text-slate-900 dark:text-zinc-200 text-xs sm:text-sm flex items-center gap-1.5">
                          <HelpCircle className="h-4 w-4 text-blue-500 shrink-0" />
                          Are my sensitive documents secure?
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                          Absolutely. All PDF merges, rotations, splits, and image resizing operations happen entirely client-side. Your files never touch a secondary server.
                        </p>
                      </div>

                      <div className="p-4 bg-slate-50/50 dark:bg-zinc-900/10 rounded-xl border border-slate-100 dark:border-zinc-900/50 space-y-1.5">
                        <h4 className="font-bold text-slate-900 dark:text-zinc-200 text-xs sm:text-sm flex items-center gap-1.5">
                          <HelpCircle className="h-4 w-4 text-blue-500 shrink-0" />
                          How does the Gemini AI integration work?
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                          For advanced features like OCR, table extraction, and translation, your request is safely proxied to Google Gemini models using standard server security rules.
                        </p>
                      </div>

                      <div className="p-4 bg-slate-50/50 dark:bg-zinc-900/10 rounded-xl border border-slate-100 dark:border-zinc-900/50 space-y-1.5">
                        <h4 className="font-bold text-slate-900 dark:text-zinc-200 text-xs sm:text-sm flex items-center gap-1.5">
                          <HelpCircle className="h-4 w-4 text-blue-500 shrink-0" />
                          What limits apply to Basic Free accounts?
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                          Free accounts can upload files up to 10MB and perform up to 5 conversions per day. Pro plans unlock unlimited processing and file sizes up to 2GB.
                        </p>
                      </div>

                      <div className="p-4 bg-slate-50/50 dark:bg-zinc-900/10 rounded-xl border border-slate-100 dark:border-zinc-900/50 space-y-1.5">
                        <h4 className="font-bold text-slate-900 dark:text-zinc-200 text-xs sm:text-sm flex items-center gap-1.5">
                          <HelpCircle className="h-4 w-4 text-blue-500 shrink-0" />
                          Can I integrate the API into my own app?
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                          Yes! Our Enterprise Membership plan exposes direct REST endpoints for base64 OCR and Summarization. Contact us to learn more.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>


              </>
            )}
          </>
        ) : activeTab === 'dashboard' ? (
          <DashboardView
            user={user}
            favorites={favorites}
            onSelectTool={(id) => navigate(id ? '/tools/' + id : '/')}
            allToolsList={allToolsList}
          />
        ) : activeTab === 'converter' ? (
          <ConverterView
            onBackToTools={() => navigate('/')}
            onAddRecentFile={handleAddRecentFile}
          />
        ) : (activeTab === 'donation' || activeTab === 'pricing') ? (
          (isDonationDisabled && user?.role !== 'admin') ? (
            <div className="py-20 px-4 text-center space-y-4 max-w-md mx-auto animate-fade-in">
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-5 rounded-2xl">
                <p className="text-sm font-bold text-amber-800 dark:text-amber-400">
                  Donations Temporarily Paused
                </p>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  Our donation and server support program is currently paused by the administrator. Please rest assured all our core PDF tools and utilities remain completely free of charge.
                </p>
              </div>
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-sm"
              >
                Go back to Home
              </button>
            </div>
          ) : (
            <DonationView
              onBackToTools={() => navigate('/')}
              user={user}
              isDonationDisabled={isDonationDisabled}
              onToggleDonation={(disabled) => setIsDonationDisabled(disabled)}
            />
          )
        ) : activeTab === 'blog' ? (
          <BlogView user={user} postId={pathSegments[1]} />
        ) : activeTab === 'contact' ? (
          <ContactView
            user={user}
            onLoginRequest={() => {
              setAuthMode('login');
              setShowAuthModal(true);
            }}
          />
        ) : (activeTab === 'about' || activeTab === 'privacy' || activeTab === 'terms' || activeTab === 'disclaimer') ? (
          <InfoPagesView
            initialSection={activeTab}
            onNavigateToTickets={() => navigate('/contact')}
          />
        ) : activeTab === 'docs' ? (
          <DocumentationView />
        ) : activeTab === 'admin' ? (
          <AdminView 
            user={user} 
            isDonationDisabled={isDonationDisabled}
            onToggleDonation={(disabled) => setIsDonationDisabled(disabled)}
            onAddRecentFile={handleAddRecentFile}
            onNavigateToBlog={(postId) => navigate(postId ? `/blog/${postId}` : '/blog')}
            onLoginRequest={() => {
              setAuthMode('login');
              setShowAuthModal(true);
            }}
          />
        ) : null}
              </Suspense>
      </main>

      {/* Shared Footer panel */}
      {activeTab === 'tools' && selectedToolId === null && !is404 && (
        <Footer setActiveTab={(tab) => navigate('/' + (tab === 'tools' ? '' : tab))} setSelectedToolId={(id) => navigate(id ? '/tools/' + id : '/')} isDonationDisabled={isDonationDisabled} />
      )}

      {/* Breathtaking Authentication Modal Popover */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/65 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative space-y-6">
            <button
              onClick={() => { setShowAuthModal(false); setAuthError(null); }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer text-sm"
            >
              Close
            </button>

            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold font-display text-slate-900 dark:text-zinc-50">
                {authMode === 'login' ? 'Welcome Back' : 'Create Sandbox Account'}
              </h2>
              <p className="text-xs text-slate-400 dark:text-zinc-500">
                Activate access, track document metrics, and utilize advanced Gemini features.
              </p>
            </div>

            {authError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-xs font-semibold text-rose-700 dark:text-rose-400 rounded-xl border border-rose-500/10 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={authMode === 'login' ? handleLogin : handleSignup} className="space-y-4">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="johndoe"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 rounded-xl outline-none focus:border-blue-500 text-sm dark:text-zinc-100"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 rounded-xl outline-none focus:border-blue-500 text-sm dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Security Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 rounded-xl outline-none focus:border-blue-500 text-sm dark:text-zinc-100"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm cursor-pointer transition-all hover:scale-[1.01]"
              >
                {authMode === 'login' ? 'Sign In Securely' : 'Register Account'}
              </button>
            </form>

            <div className="text-center pt-2 border-t border-slate-100 dark:border-zinc-900">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'signup' : 'login');
                  setAuthError(null);
                }}
                className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                {authMode === 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Log In'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exquisite Global Download / Donation Support Modal Popover */}
      {showGlobalDownload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/65 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative space-y-6 overflow-y-auto max-h-[90vh] animate-popup-bounce">
            <button
              onClick={() => { setShowGlobalDownload(false); }}
              className="absolute right-4 top-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer rounded-full hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors"
              title="Close panel"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Success Message Header */}
            <div className="text-center space-y-3">
              <div className="h-14 w-14 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner shadow-emerald-500/10">
                <CheckCircle className="h-8 w-8 animate-pulse" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-display leading-tight">
                This task has been processed successfully!
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Your file has been generated and is ready for download.
              </p>
            </div>

            {/* Direct Download Button */}
            <div className="space-y-2">
              <button
                onClick={handlePopupDownload}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl text-sm flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-blue-500/25"
              >
                <Download className="h-5 w-5" />
                Download file
              </button>
              {downloadName && (
                <p className="text-[10px] text-center text-slate-400 font-mono truncate max-w-full px-4">
                  File name: {downloadName}
                </p>
              )}
            </div>

            {/* Spread the Word Section */}
            <div className="p-4 bg-slate-50 dark:bg-zinc-900/40 rounded-2xl border border-slate-100 dark:border-zinc-900/60 text-center space-y-3">
              <div className="space-y-1">
                <h4 className="font-bold text-xs text-slate-800 dark:text-zinc-200">
                  How can you thank us? Spread the word!
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Please share the tool to inspire more productive people!
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white dark:bg-zinc-950 hover:bg-slate-100 dark:hover:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-[11px] font-bold text-slate-700 dark:text-zinc-300 transition-all cursor-pointer shadow-sm"
                >
                  <Copy className="h-3.5 w-3.5 text-blue-500" />
                  {copied ? 'Copied Link!' : 'Copy Link'}
                </button>
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent('Hey! Check out this awesome Free PDF and AI toolkit: https://pdftoolkitpro.online')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[11px] font-bold transition-all cursor-pointer shadow-sm shadow-emerald-500/10"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Share to WhatsApp
                </a>
              </div>
            </div>

            {/* Donation Support Section */}
            {!isDonationDisabled && (
              <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 bg-slate-50 dark:bg-zinc-900/20 text-center space-y-4">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-zinc-100 flex items-center justify-center gap-1 leading-snug">
                    A Tiny Support Keeps This Platform Running ❤️
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-normal px-1">
                    You can donate any small amount of your choice. Your small contribution helps keep our servers running and maintains the domain so we can continue serving you completely free tools!
                  </p>
                </div>

                {/* Rendered UPI QR Code */}
                <div className="flex flex-col items-center justify-center">
                  <div className="w-56 h-56 bg-white rounded-2xl shadow-md overflow-hidden flex items-center justify-center p-3 border border-slate-100 relative">
                    {qrDataUrl ? (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <img loading="lazy" 
                          src={qrDataUrl} 
                          alt="UPI QR Code" 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute w-8 h-8 bg-white rounded-full flex items-center justify-center shadow border border-slate-100 p-1">
                          <svg viewBox="0 0 40 40" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M14.5 13.5C14.5 11.01 16.51 9 19 9H21C23.49 9 25.5 11.01 25.5 13.5V15.5H14.5V13.5Z" fill="#34A853" />
                            <path d="M25.5 26.5C25.5 28.99 23.49 31 21 31H19C16.51 31 14.5 28.99 14.5 26.5V24.5H25.5V26.5Z" fill="#F9BC05" />
                            <path d="M13.5 14.5H15.5V25.5H13.5C11.01 25.5 9 23.49 9 21V19C9 16.51 11.01 14.5 13.5 14.5Z" fill="#EA4335" />
                            <path d="M24.5 14.5H26.5C28.99 14.5 31 16.51 31 19V21C31 23.49 28.99 25.5 26.5 25.5H24.5V14.5Z" fill="#4285F4" />
                            <circle cx="20" cy="20" r="4.5" fill="#FFFFFF" />
                            <path d="M19 19H21V21H19V19Z" fill="#4285F4" />
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 gap-1.5">
                        <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-[10px]">Generating UPI QR...</p>
                      </div>
                    )}
                  </div>
                  
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-3">
                    Scan to Pay with any UPI app
                  </span>
                  <span className="text-[10px] font-extrabold text-slate-800 dark:text-zinc-100 font-mono bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 mt-1.5 shadow-sm inline-flex items-center gap-1 tracking-wider">
                    <QrIcon className="h-3 w-3 text-blue-500" />
                    UPI ID: {upiId}
                  </span>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* FLOATING ADMIN QUICK CONTROL WIDGET (Always visible at bottom right for Admin) */}
      {user?.role === 'admin' && (
        <div className="fixed bottom-5 right-5 z-50 animate-fade-in">
          <div className={`p-3 rounded-2xl shadow-2xl border backdrop-blur-md flex items-center gap-3 transition-all ${
            isDonationDisabled 
              ? 'bg-slate-900/95 text-white border-amber-500/50 shadow-amber-500/20' 
              : 'bg-slate-900/95 text-white border-emerald-500/50 shadow-emerald-500/20'
          }`}>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-900/80 text-purple-300">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Admin Control</p>
                <p className="text-xs font-extrabold flex items-center gap-1">
                  Donation Tab: 
                  <span className={isDonationDisabled ? "text-amber-400 font-black" : "text-emerald-400 font-black"}>
                    {isDonationDisabled ? 'OFF (Hidden)' : 'ON (Live)'}
                  </span>
                </p>
              </div>
            </div>

            <button
              onClick={async () => {
                const nextState = !isDonationDisabled;
                try {
                  const res = await fetch('/api/admin/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
                    body: JSON.stringify({ userId: user.id, isDonationDisabled: nextState })
                  });
                  if (res.ok) {
                    setIsDonationDisabled(nextState);
                  }
                } catch(e) {
                  console.error(e);
                }
              }}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md ${
                isDonationDisabled
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
              title={isDonationDisabled ? "Click to Enable Donation Button on Live Website" : "Click to Disable Donation Button on Live Website"}
            >
              {isDonationDisabled ? (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  <span>Turn ON</span>
                </>
              ) : (
                <>
                  <EyeOff className="h-3.5 w-3.5" />
                  <span>Turn OFF</span>
                </>
              )}
            </button>

            <button
              onClick={() => navigate('/admin')}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Open Admin Dashboard"
            >
              <Laptop className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}


export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </HelmetProvider>
  );
}
