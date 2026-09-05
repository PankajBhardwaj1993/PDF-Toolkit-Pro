import React, { useState } from 'react';
import { Mail, ArrowRight, ShieldCheck, CheckCircle2, Globe, Sparkles, FileText } from 'lucide-react';

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

  const navigateTo = (tab: string) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToTool = (toolId: string) => {
    setSelectedToolId(toolId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="border-t border-slate-200 dark:border-zinc-900 bg-slate-50 dark:bg-zinc-950/40 pt-16 pb-8 text-sm">
      <div className="mx-auto w-full max-w-[1850px] px-4 sm:px-6 lg:px-8 xl:px-12">
        
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-6 sm:gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand Info */}
          <div className="xs:col-span-2 md:col-span-1 lg:col-span-1 xl:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-purple-500 text-white shadow-md">
                <FileText className="h-4 w-4" />
              </div>
              <span className="font-display text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                PDF Toolkit Pro
              </span>
            </div>
            <p className="text-slate-500 dark:text-zinc-400 mb-6 max-w-xs leading-relaxed">
              Premium, highly secure, browser-native file manipulation utilities for <span className="font-semibold text-blue-600 dark:text-blue-400">pdftoolkitpro.online</span>. Convert, merge, edit, and enhance documents at Gemini-driven speed.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-lg w-fit border border-emerald-500/10">
              <ShieldCheck className="h-4 w-4" />
              All files encrypted & auto-deleted after processing.
            </div>
          </div>

          {/* Directory Column 1 */}
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-zinc-200 mb-4">Popular Tools</h3>
            <ul className="space-y-2.5">
              <li>
                <button 
                  onClick={() => navigateToTool('online_pdf_editor')} 
                  className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer text-left transition-colors"
                >
                  Online PDF Editor
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigateToTool('merge_pdf')} 
                  className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer text-left transition-colors"
                >
                  Merge PDF Documents
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigateToTool('split_pdf')} 
                  className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer text-left transition-colors"
                >
                  Split PDF into Pages
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigateToTool('resize_image')} 
                  className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer text-left transition-colors"
                >
                  Resize & Compress Image
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigateToTool('compress_pdf')} 
                  className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer text-left transition-colors"
                >
                  Compress PDF Online
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigateToTool('rotate_pdf')} 
                  className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer text-left transition-colors"
                >
                  Rotate PDF Pages
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigateToTool('delete_pdf')} 
                  className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer text-left transition-colors"
                >
                  Delete PDF Pages
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigateToTool('extract_pdf')} 
                  className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer text-left transition-colors"
                >
                  Extract PDF Pages Online
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigateToTool('compress_image')} 
                  className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer text-left transition-colors"
                >
                  Compress Images Online
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigateToTool('convert_image')} 
                  className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer text-left transition-colors"
                >
                  Convert Image Format Online
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigateToTool('batch_processor')} 
                  className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer text-left transition-colors"
                >
                  Batch Processor Multi-File Engine
                </button>
              </li>
            </ul>
          </div>

          {/* Directory Column 2 */}
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-zinc-200 mb-4">Resources</h3>
            <ul className="space-y-2.5">
              <li>
                <button onClick={() => navigateTo('blog')} className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
                  Blog &amp; Guides
                </button>
              </li>
              {!isDonationDisabled && (
                <li>
                  <button onClick={() => navigateTo('donation')} className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
                    Support & Donation
                  </button>
                </li>
              )}
              <li>
                <button onClick={() => navigateTo('tickets')} className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
                  Support & Tickets
                </button>
              </li>
            </ul>
          </div>

          {/* Company & Legal Column */}
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-zinc-200 mb-4">Company</h3>
            <ul className="space-y-2.5">
              <li>
                <button onClick={() => navigateTo('about')} className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
                  About Us
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('privacy')} className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('terms')} className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('disclaimer')} className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
                  Disclaimer
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('contact')} className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
                  Contact Us
                </button>
              </li>
            </ul>
          </div>

          {/* Newsletter subscription */}
          <div className="md:col-span-2 lg:col-span-1">
            <h3 className="font-semibold text-slate-800 dark:text-zinc-200 mb-4">Stay Optimized</h3>
            <p className="text-slate-500 dark:text-zinc-400 mb-4">
              Subscribe for high-speed utility updates and security insights.
            </p>
            {subscribed ? (
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 rounded-xl border border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span>Subscription successful!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="relative flex">
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2.5 pl-3 pr-10 outline-none placeholder:text-slate-400 dark:text-zinc-100 focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-colors"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-slate-200 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400 dark:text-zinc-500">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]"></span>
              <span className="font-semibold text-slate-600 dark:text-slate-400">All systems operational</span>
            </div>
            <span className="w-px h-3 bg-slate-200 dark:bg-white/10 hidden sm:block"></span>
            <span>v4.2.0-stable</span>
          </div>
          
          <div className="flex flex-wrap gap-x-4 gap-y-2 font-semibold text-slate-500 dark:text-slate-400 justify-center md:justify-end">
            <button onClick={() => navigateTo('about')} className="hover:text-blue-600 dark:hover:text-white cursor-pointer transition-colors">About Us</button>
            <button onClick={() => navigateTo('privacy')} className="hover:text-blue-600 dark:hover:text-white cursor-pointer transition-colors">Privacy Policy</button>
            <button onClick={() => navigateTo('terms')} className="hover:text-blue-600 dark:hover:text-white cursor-pointer transition-colors">Terms & Conditions</button>
            <button onClick={() => navigateTo('disclaimer')} className="hover:text-blue-600 dark:hover:text-white cursor-pointer transition-colors">Disclaimer</button>
            <button onClick={() => navigateTo('contact')} className="hover:text-blue-600 dark:hover:text-white cursor-pointer transition-colors">Contact Us</button>
          </div>
        </div>

      </div>
    </footer>
  );
}
