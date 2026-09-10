import React, { useState } from 'react';
import { Mail, ArrowRight, ShieldCheck, CheckCircle2, Globe, Sparkles, FileText, ExternalLink, Github, Heart } from 'lucide-react';

interface FooterProps {
  setActiveTab: (tab: string) => void;
  setSelectedToolId: (id: string | null) => void;
  isDonationDisabled?: boolean;
}

export default function Footer({ setActiveTab, setSelectedToolId, isDonationDisabled = false }: FooterProps) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 5000);
    }
  };

  const handleNav = (e: React.MouseEvent, tab: string) => {
    if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
      e.preventDefault();
      setActiveTab(tab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleToolNav = (e: React.MouseEvent, toolId: string) => {
    if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
      e.preventDefault();
      setSelectedToolId(toolId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer id="global-footer" className="border-t border-slate-200 dark:border-zinc-900 bg-slate-50 dark:bg-zinc-950/50 pt-16 pb-8 text-sm">
      <div className="mx-auto w-full max-w-[1850px] px-4 sm:px-6 lg:px-8 xl:px-12">
        
        {/* Main Footer Directory Grid */}
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-12">
          
          {/* Brand Info & Mission */}
          <div className="xs:col-span-2 md:col-span-3 lg:col-span-2 pr-0 lg:pr-4">
            <a 
              href="/"
              onClick={(e) => handleNav(e, 'tools')}
              className="flex items-center gap-2 mb-4 no-underline text-inherit cursor-pointer"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-purple-500 text-white shadow-md shadow-blue-500/20">
                <FileText className="h-5 w-5" />
              </div>
              <span className="font-display text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                PDF Toolkit Pro
              </span>
            </a>
            
            <p className="text-slate-600 dark:text-zinc-400 mb-5 text-sm leading-relaxed max-w-sm">
              Free, private, browser-native document and image utility suite for <span className="font-semibold text-blue-600 dark:text-blue-400">pdftoolkitpro.online</span>. Merge, compress, convert, edit, OCR, and sign files securely with zero server-side storage.
            </p>

            <div className="flex flex-col gap-2.5 mb-6">
              <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-lg w-fit border border-emerald-500/20 font-medium">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>100% Client-Side Private • Encrypted in Browser</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-lg w-fit border border-blue-500/20 font-medium">
                <Globe className="h-4 w-4 shrink-0" />
                <span>Zero File Uploads to Cloud • Instant Processing</span>
              </div>
            </div>

            {/* Newsletter Subscription */}
            <div className="max-w-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-2">
                Stay Updated With New Free Tools
              </p>
              {subscribed ? (
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 rounded-xl border border-emerald-500/20">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Thank you! You are subscribed to updates.</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="relative flex">
                  <input
                    type="email"
                    required
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2.5 pl-3 pr-10 text-xs outline-none placeholder:text-slate-400 dark:text-zinc-100 focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    aria-label="Subscribe"
                    className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-colors"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Column 1: Core PDF Utilities */}
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-zinc-100 mb-3 text-sm">
              Popular PDF Tools
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <a 
                  href="/tools/online_pdf_editor" 
                  onClick={(e) => handleToolNav(e, 'online_pdf_editor')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  Online PDF Editor
                </a>
              </li>
              <li>
                <a 
                  href="/tools/merge_pdf" 
                  onClick={(e) => handleToolNav(e, 'merge_pdf')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  Merge PDF Files
                </a>
              </li>
              <li>
                <a 
                  href="/tools/split_pdf" 
                  onClick={(e) => handleToolNav(e, 'split_pdf')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  Split PDF Pages
                </a>
              </li>
              <li>
                <a 
                  href="/tools/compress_pdf" 
                  onClick={(e) => handleToolNav(e, 'compress_pdf')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  Compress PDF Size
                </a>
              </li>
              <li>
                <a 
                  href="/tools/sign_pdf" 
                  onClick={(e) => handleToolNav(e, 'sign_pdf')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  Sign PDF &amp; Fill Forms
                </a>
              </li>
              <li>
                <a 
                  href="/tools/rotate_pdf" 
                  onClick={(e) => handleToolNav(e, 'rotate_pdf')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  Rotate PDF Pages
                </a>
              </li>
              <li>
                <a 
                  href="/tools/delete_pdf" 
                  onClick={(e) => handleToolNav(e, 'delete_pdf')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  Delete PDF Pages
                </a>
              </li>
              <li>
                <a 
                  href="/tools/extract_pdf" 
                  onClick={(e) => handleToolNav(e, 'extract_pdf')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  Extract PDF Pages
                </a>
              </li>
              <li>
                <a 
                  href="/tools/protect_pdf" 
                  onClick={(e) => handleToolNav(e, 'protect_pdf')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  Protect PDF Password
                </a>
              </li>
              <li>
                <a 
                  href="/tools/unlock_pdf" 
                  onClick={(e) => handleToolNav(e, 'unlock_pdf')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  Unlock PDF Password
                </a>
              </li>
              <li>
                <a 
                  href="/tools/watermark_pdf" 
                  onClick={(e) => handleToolNav(e, 'watermark_pdf')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  Add PDF Watermark
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Image & Converter Utilities */}
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-zinc-100 mb-3 text-sm">
              Image &amp; Conversion Tools
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <a 
                  href="/tools/compress_image" 
                  onClick={(e) => handleToolNav(e, 'compress_image')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  Compress Images Online
                </a>
              </li>
              <li>
                <a 
                  href="/tools/resize_image" 
                  onClick={(e) => handleToolNav(e, 'resize_image')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  Resize Image Dimensions
                </a>
              </li>
              <li>
                <a 
                  href="/tools/convert_image" 
                  onClick={(e) => handleToolNav(e, 'convert_image')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  Convert JPG PNG WebP
                </a>
              </li>
              <li>
                <a 
                  href="/tools/crop_image" 
                  onClick={(e) => handleToolNav(e, 'crop_image')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  Crop Photos Online
                </a>
              </li>
              <li>
                <a 
                  href="/tools/passport_photo" 
                  onClick={(e) => handleToolNav(e, 'passport_photo')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  Passport Photo Maker
                </a>
              </li>
              <li>
                <a 
                  href="/tools/pdf_to_word" 
                  onClick={(e) => handleToolNav(e, 'pdf_to_word')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  PDF to Word Converter
                </a>
              </li>
              <li>
                <a 
                  href="/tools/pdf_to_excel" 
                  onClick={(e) => handleToolNav(e, 'pdf_to_excel')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  PDF to Excel Converter
                </a>
              </li>
              <li>
                <a 
                  href="/tools/pdf_to_jpg" 
                  onClick={(e) => handleToolNav(e, 'pdf_to_jpg')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  PDF to JPG Converter
                </a>
              </li>
              <li>
                <a 
                  href="/tools/jpg_to_pdf" 
                  onClick={(e) => handleToolNav(e, 'jpg_to_pdf')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  JPG to PDF Converter
                </a>
              </li>
              <li>
                <a 
                  href="/tools/ocr_pdf" 
                  onClick={(e) => handleToolNav(e, 'ocr_pdf')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  OCR Text Scanner
                </a>
              </li>
              <li>
                <a 
                  href="/tools/batch_processor" 
                  onClick={(e) => handleToolNav(e, 'batch_processor')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  Batch Multi-File Engine
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Guides & Tutorials (Internal Content Links) */}
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-zinc-100 mb-3 text-sm">
              Tutorials &amp; Guides
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <a 
                  href="/blog" 
                  onClick={(e) => handleNav(e, 'blog')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium no-underline"
                >
                  All Blog &amp; Guides
                </a>
              </li>
              <li>
                <a 
                  href="/blog/how-to-compress-image-online-free-without-losing-quality" 
                  onClick={(e) => handleNav(e, 'blog')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  How to Compress Images
                </a>
              </li>
              <li>
                <a 
                  href="/blog/how-to-resize-images-online-free-dimensions-file-size" 
                  onClick={(e) => handleNav(e, 'blog')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  How to Resize Images
                </a>
              </li>
              <li>
                <a 
                  href="/blog/how-to-convert-image-formats-online-free-jpg-png-webp-gif" 
                  onClick={(e) => handleNav(e, 'blog')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  Convert JPG PNG WebP
                </a>
              </li>
              <li>
                <a 
                  href="/blog/how-to-crop-images-online-free-perfect-dimensions" 
                  onClick={(e) => handleNav(e, 'blog')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  Crop Photos for Social Media
                </a>
              </li>
              <li>
                <a 
                  href="/blog/how-to-extract-pdf-pages-online-free" 
                  onClick={(e) => handleNav(e, 'blog')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  How to Extract PDF Pages
                </a>
              </li>
              <li>
                <a 
                  href="/blog/how-to-delete-pdf-pages-online-free" 
                  onClick={(e) => handleNav(e, 'blog')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  How to Delete PDF Pages
                </a>
              </li>
              <li>
                <a 
                  href="/blog/how-to-rotate-pdf-pages-online-free-permanently" 
                  onClick={(e) => handleNav(e, 'blog')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  Rotate PDF Permanently
                </a>
              </li>
              <li>
                <a 
                  href="/blog/how-to-compress-pdf-online-free-reduce-file-size" 
                  onClick={(e) => handleNav(e, 'blog')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  Reduce PDF File Size Free
                </a>
              </li>
              <li>
                <a 
                  href="/blog/online-pdf-editor-how-to-edit-pdf-files-online-for-free" 
                  onClick={(e) => handleNav(e, 'blog')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  How to Edit PDF Text Online
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Legal, Authority, & External Links */}
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-zinc-100 mb-3 text-sm">
              Legal &amp; Trust
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <a 
                  href="/about" 
                  onClick={(e) => handleNav(e, 'about')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  About PDF Toolkit Pro
                </a>
              </li>
              <li>
                <a 
                  href="/privacy" 
                  onClick={(e) => handleNav(e, 'privacy')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a 
                  href="/terms" 
                  onClick={(e) => handleNav(e, 'terms')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  Terms &amp; Conditions
                </a>
              </li>
              <li>
                <a 
                  href="/cookies" 
                  onClick={(e) => handleNav(e, 'cookies')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  Cookie Policy
                </a>
              </li>
              <li>
                <a 
                  href="/disclaimer" 
                  onClick={(e) => handleNav(e, 'disclaimer')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  Legal Disclaimer
                </a>
              </li>
              <li>
                <a 
                  href="/contact" 
                  onClick={(e) => handleNav(e, 'contact')}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline"
                >
                  Contact &amp; Help Desk
                </a>
              </li>
              {!isDonationDisabled && (
                <li>
                  <a 
                    href="/pricing" 
                    onClick={(e) => handleNav(e, 'pricing')}
                    className="text-rose-600 dark:text-rose-400 hover:underline font-semibold flex items-center gap-1 no-underline"
                  >
                    <Heart className="h-3 w-3 fill-rose-500" />
                    <span>Support the Project</span>
                  </a>
                </li>
              )}
            </ul>

            {/* External Authority & Standards Links */}
            <div className="mt-5 pt-4 border-t border-slate-200 dark:border-zinc-800">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-2">
                External Authority
              </h4>
              <ul className="space-y-1.5 text-[11px]">
                <li>
                  <a 
                    href="https://github.com/PankajBhardwaj1993/PDF-Toolkit-Pro" 
                    target="_blank" 
                    rel="noopener"
                    className="text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1 transition-colors"
                  >
                    <Github className="h-3 w-3" />
                    <span>GitHub Repository</span>
                    <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                  </a>
                </li>
                <li>
                  <a 
                    href="https://www.pdfa.org" 
                    target="_blank" 
                    rel="noopener nofollow"
                    className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1 transition-colors"
                  >
                    <span>PDF Association</span>
                    <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                  </a>
                </li>
                <li>
                  <a 
                    href="https://www.w3.org" 
                    target="_blank" 
                    rel="noopener nofollow"
                    className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1 transition-colors"
                  >
                    <span>W3C Standards</span>
                    <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                  </a>
                </li>
                <li>
                  <a 
                    href="/rss.xml" 
                    target="_blank" 
                    rel="alternate"
                    type="application/rss+xml"
                    className="text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 font-medium transition-colors"
                  >
                    <span>RSS Syndication Feed</span>
                    <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                  </a>
                </li>
              </ul>
            </div>
          </div>

        </div>

        {/* Bottom Bar with Compliance, Copyright, and Quick Links */}
        <div className="pt-8 border-t border-slate-200 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-zinc-500">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">All 35+ Tools Operational</span>
            </div>
            <span className="w-px h-3 bg-slate-200 dark:bg-white/10 hidden sm:block"></span>
            <span>v4.2.0 • ISO 32000 PDF Compliance</span>
            <span className="w-px h-3 bg-slate-200 dark:bg-white/10 hidden sm:block"></span>
            <span>&copy; {new Date().getFullYear()} PDF Toolkit Pro. All rights reserved.</span>
          </div>
          
          <div className="flex flex-wrap gap-x-4 gap-y-2 font-medium text-slate-600 dark:text-slate-400 justify-center md:justify-end">
            <a href="/about" onClick={(e) => handleNav(e, 'about')} className="hover:text-blue-600 dark:hover:text-white transition-colors no-underline">About</a>
            <a href="/privacy" onClick={(e) => handleNav(e, 'privacy')} className="hover:text-blue-600 dark:hover:text-white transition-colors no-underline">Privacy</a>
            <a href="/terms" onClick={(e) => handleNav(e, 'terms')} className="hover:text-blue-600 dark:hover:text-white transition-colors no-underline">Terms</a>
            <a href="/cookies" onClick={(e) => handleNav(e, 'cookies')} className="hover:text-blue-600 dark:hover:text-white transition-colors no-underline">Cookies</a>
            <button onClick={() => window.dispatchEvent(new CustomEvent('open-cookie-settings'))} className="hover:text-blue-600 dark:hover:text-white cursor-pointer transition-colors bg-transparent border-0 p-0 text-xs text-slate-600 dark:text-slate-400 font-medium">Preferences</button>
            <a href="/disclaimer" onClick={(e) => handleNav(e, 'disclaimer')} className="hover:text-blue-600 dark:hover:text-white transition-colors no-underline">Disclaimer</a>
            <a href="/contact" onClick={(e) => handleNav(e, 'contact')} className="hover:text-blue-600 dark:hover:text-white transition-colors no-underline">Contact</a>
          </div>
        </div>

      </div>
    </footer>
  );
}
