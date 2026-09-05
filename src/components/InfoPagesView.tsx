import SEO from './SEO';
import React, { useState, useEffect } from 'react';
import { 
  Info, ShieldCheck, Scale, AlertTriangle, Mail, MapPin, 
  MessageSquare, ExternalLink, Calendar, CheckCircle2, ChevronRight,
  Shield, Key, Sparkles, Building2, Globe
} from 'lucide-react';

interface InfoPagesViewProps {
  initialSection?: 'about' | 'privacy' | 'terms' | 'disclaimer' | 'contact';
  onNavigateToTickets?: () => void;
}

export default function InfoPagesView({ initialSection = 'about', onNavigateToTickets }: InfoPagesViewProps) {
  const [activeTab, setActiveTab] = useState<'about' | 'privacy' | 'terms' | 'disclaimer' | 'contact'>(initialSection);

  useEffect(() => {
    setActiveTab(initialSection);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [initialSection]);

  const tabs = [
    { id: 'about', label: 'About Us', icon: Info, desc: 'Our mission and background' },
    { id: 'privacy', label: 'Privacy Policy', icon: ShieldCheck, desc: 'How we protect your data' },
    { id: 'terms', label: 'Terms & Conditions', icon: Scale, desc: 'Rules and terms of usage' },
    { id: 'disclaimer', label: 'Disclaimer', icon: AlertTriangle, desc: 'Legal exclusions and liabilities' },
    { id: 'contact', label: 'Contact Us', icon: Mail, desc: 'Get in touch with support' },
  ] as const;

  const seoMap = {
    about: {
      title: "About Us | PDF Toolkit Pro – Free Online PDF Tools",
      description: "Learn about PDF Toolkit Pro, our mission to provide fast, free, browser-native document tools with zero server retention and complete privacy.",
      canonical: "https://pdftoolkitpro.online/about",
      h1: "About PDF Toolkit Pro",
      keywords: ["about PDF Toolkit Pro", "free PDF platform", "online document tools mission"]
    },
    privacy: {
      title: "Privacy Policy – Zero Server Retention | PDF Toolkit Pro",
      description: "Read our privacy policy. PDF Toolkit Pro processes files directly in your browser with zero server retention, ensuring your documents remain private.",
      canonical: "https://pdftoolkitpro.online/privacy",
      h1: "Privacy Policy",
      keywords: ["PDF privacy policy", "secure PDF processing", "zero retention PDF"]
    },
    terms: {
      title: "Terms of Service | PDF Toolkit Pro",
      description: "Read the terms of service and usage conditions for PDF Toolkit Pro free online document manipulation tools and API services.",
      canonical: "https://pdftoolkitpro.online/terms",
      h1: "Terms of Service",
      keywords: ["PDF terms of service", "website terms of use", "PDF tools license"]
    },
    disclaimer: {
      title: "Legal Disclaimer | PDF Toolkit Pro",
      description: "Read the legal disclaimer and limitation of liability for using PDF Toolkit Pro online document processing tools and services.",
      canonical: "https://pdftoolkitpro.online/disclaimer",
      h1: "Disclaimer",
      keywords: ["PDF Toolkit Pro disclaimer", "document tool disclaimer", "terms of use"]
    },
    contact: {
      title: "Contact Us | PDF Toolkit Pro",
      description: "Contact the PDF Toolkit Pro team for support, feature requests, bug reports, and business inquiries. We respond within 24 hours.",
      canonical: "https://pdftoolkitpro.online/contact",
      h1: "Contact PDF Toolkit Pro",
      keywords: ["contact PDF Toolkit Pro", "PDF support", "PDF helpdesk"]
    },
  };

  const currentSeo = seoMap[activeTab] || seoMap.about;

  return (
    <div className="w-full max-w-[1850px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-12">
      <SEO 
        title={currentSeo.title} 
        description={currentSeo.description} 
        canonical={currentSeo.canonical}
        keywords={currentSeo.keywords}
      />
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h1 className="text-3xl font-extrabold font-display text-slate-900 dark:text-white tracking-tight sm:text-4xl">
          {currentSeo.h1}
        </h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-zinc-400">
          Everything you need to know about the operations, privacy guardrails, and terms of service at <span className="font-semibold text-blue-600 dark:text-blue-400">pdftoolkitpro.online</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar Selector Navigation */}
        <div className="lg:col-span-3 bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 shadow-sm space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-3 mb-3">Navigation</p>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-xl text-left transition-all ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400 dark:text-zinc-500'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold leading-none">{tab.label}</p>
                  <p className={`text-[9px] mt-0.5 truncate ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>{tab.desc}</p>
                </div>
                <ChevronRight className={`h-3.5 w-3.5 opacity-60 ${isActive ? 'block' : 'hidden group-hover:block'}`} />
              </button>
            );
          })}
        </div>

        {/* Dynamic Display Panel */}
        <div className="lg:col-span-9 bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-10 shadow-xl space-y-6">
          
          {/* ================= ABOUT US TAB ================= */}
          {activeTab === 'about' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-zinc-900 pb-4">
                <div className="h-10 w-10 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50 font-display">About PDF Toolkit Pro</h2>
                  <p className="text-xs text-slate-400 dark:text-zinc-500">Learn about our vision and operational ethos</p>
                </div>
              </div>

              <div className="prose prose-slate dark:prose-invert max-w-none text-xs leading-relaxed text-slate-600 dark:text-zinc-300 space-y-5">
                <p>
                  Welcome to <strong>PDF Toolkit Pro</strong> (<a href="https://pdftoolkitpro.online" className="text-blue-600 hover:underline">pdftoolkitpro.online</a>). We are a modern, high-speed document manipulation suite engineered for developers, professionals, and remote workstations. 
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                  <div className="p-4 bg-slate-50 dark:bg-zinc-900/50 rounded-xl border border-slate-100 dark:border-zinc-900 space-y-2">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold">
                      <Shield className="h-4 w-4" />
                      <span>Security First</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Our core operations (Merging, Splitting, Page deletions, Rotations) execute directly inside your browser cache. Your secure files never traverse outside servers.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-zinc-900/50 rounded-xl border border-slate-100 dark:border-zinc-900 space-y-2">
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold">
                      <Sparkles className="h-4 w-4" />
                      <span>Gemini-Augmented AI</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Advanced utilities like AI Document OCR, spreadsheet table extraction, translation, and structured summarization harness Google's state-of-the-art Gemini LLMs.
                    </p>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide">Why pdftoolkitpro.online?</h3>
                <p>
                  Traditionally, document manipulation has been slow, bloated, and computationally expensive. Free conversion options on the web compromise privacy by keeping copies of sensitive payloads on remote server registers. 
                </p>
                <p>
                  <strong>PDF Toolkit Pro</strong> breaks this paradigm. By leveraging WebAssembly and compiled client-side JavaScript binaries directly inside browser tabs, we achieve blistering speeds while strictly preserving total information security.
                </p>

                <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide">Our Headquarters & Development</h3>
                <p>
                  Created and maintained by a dedicated group of full-stack engineers, we consistently strive to make legal workflows, contract modifications, and OCR extraction simple, beautiful, and secure.
                </p>
              </div>
            </div>
          )}

          {/* ================= PRIVACY POLICY TAB ================= */}
          {activeTab === 'privacy' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-zinc-900 pb-4">
                <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50 font-display">Privacy Policy</h2>
                  <p className="text-xs text-slate-400 dark:text-zinc-500">Effective Date: 2026</p>
                </div>
              </div>

              <div className="prose prose-slate dark:prose-invert max-w-none text-xs leading-relaxed text-slate-600 dark:text-zinc-300 space-y-5">
                <p className="text-sm font-semibold text-slate-800 dark:text-zinc-100">
                  At PDFToolkitPro.in, we value your privacy and are committed to protecting your information.
                </p>

                <div className="bg-slate-50 dark:bg-zinc-900/40 p-5 rounded-2xl border border-slate-100 dark:border-zinc-900/80 space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <p>We do not permanently store your uploaded PDF files.</p>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <p>Files are processed temporarily and are automatically deleted after processing.</p>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <p>We do not sell, rent, or share your documents with third parties.</p>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <p>We use industry-standard HTTPS encryption to secure data transmission.</p>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <p>Cookies and Google Analytics may be used to improve website performance and user experience.</p>
                  </div>
                </div>

                <p className="font-semibold text-slate-700 dark:text-zinc-200 mt-6 border-t border-slate-100 dark:border-zinc-900 pt-4">
                  By using our website, you agree to this Privacy Policy.
                </p>
              </div>
            </div>
          )}

          {/* ================= TERMS & CONDITIONS TAB ================= */}
          {activeTab === 'terms' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-zinc-900 pb-4">
                <div className="h-10 w-10 bg-amber-50 dark:bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Scale className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50 font-display">Terms & Conditions</h2>
                  <p className="text-xs text-slate-400 dark:text-zinc-500">Usage agreement and user guidelines</p>
                </div>
              </div>

              <div className="prose prose-slate dark:prose-invert max-w-none text-xs leading-relaxed text-slate-600 dark:text-zinc-300 space-y-5">
                <p>
                  Welcome to <strong>pdftoolkitpro.online</strong>. By accessing our tools, website, and services, you explicitly agree to comply with and be bound by the following Terms & Conditions.
                </p>

                <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide">1. Acceptable Use Policy</h3>
                <p>
                  You agree to use our website only for lawful purposes. You are strictly forbidden from uploading files containing malicious scripts, viruses, or illegal document types. Any attempt to reverse-engineer our backend endpoints or automate scraping requests will result in instant account ban.
                </p>

                <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide">2. Membership & Accounts</h3>
                <p>
                  Free accounts are allocated limits (up to 10MB per upload and 5 conversions daily). Premium plans (Pro, Enterprise) unlock larger buffers and continuous throughput. Accounts are single-user only and cannot be shared.
                </p>

                <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide">3. Content Ownership</h3>
                <p>
                  We claim zero ownership or intellectual property over the documents and images you process through our services. You retain complete and absolute rights over all inputs and outputs.
                </p>

                <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide">4. Termination and Modifications</h3>
                <p>
                  We reserve the right to modify, adjust, or discontinue parts of the toolset or subscription guidelines with prior notice.
                </p>
              </div>
            </div>
          )}

          {/* ================= DISCLAIMER TAB ================= */}
          {activeTab === 'disclaimer' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-zinc-900 pb-4">
                <div className="h-10 w-10 bg-rose-50 dark:bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50 font-display">Disclaimer</h2>
                  <p className="text-xs text-slate-400 dark:text-zinc-500">Important limitations of liability, non-affiliation disclosures, and terms of service</p>
                </div>
              </div>

              <div className="prose prose-slate dark:prose-invert max-w-none text-xs leading-relaxed text-slate-600 dark:text-zinc-300 space-y-6">
                {/* Important Notice Callout Box */}
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-500/20 p-5 rounded-2xl text-amber-900 dark:text-amber-200">
                  <p className="font-bold mb-2.5 flex items-center gap-2 text-sm text-amber-900 dark:text-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    Important Notice &amp; Legal Disclosures
                  </p>
                  <ul className="list-disc pl-5 space-y-2 text-xs font-medium text-slate-700 dark:text-zinc-300">
                    <li>
                      <strong>PDF Toolkit Pro (pdftoolkitpro.online)</strong> is an independent online document utility and productivity platform.
                    </li>
                    <li>
                      We are not affiliated with, endorsed by, sponsored by, or connected to <strong>Adobe Inc.</strong>, <strong>Microsoft Corporation</strong>, <strong>Google LLC</strong>, or any government authority.
                    </li>
                    <li>
                      All file operations run in-browser or with instant ephemeral memory cleanup. Your documents are never permanently stored or shared.
                    </li>
                    <li>
                      We do not provide legal, financial, or tax advice, and make no representations regarding the legal validity or admissibility of modified files in specific jurisdictions.
                    </li>
                  </ul>
                </div>

                {/* Section 1: Non-Affiliation and Trademarks */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide mb-1.5">
                    1. Independent Service &amp; Trademark Disclosures
                  </h3>
                  <p>
                    PDF Toolkit Pro (hosted at <span className="font-semibold text-blue-600 dark:text-blue-400">pdftoolkitpro.online</span>) is a privately developed, independent productivity suite. All third-party trademarks, product names, logos, and brands mentioned on this website—including but not limited to <em>Adobe®, Acrobat®, Portable Document Format (PDF), Microsoft® Word, Microsoft® Excel, PowerPoint®, and Google®</em>—are the property of their respective trademark holders. Reference to these trademarks is strictly for descriptive and compatibility identification purposes and does not imply any sponsorship, endorsement, or commercial association.
                  </p>
                </div>

                {/* Section 2: No Legal or Professional Advice */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide mb-1.5">
                    2. No Legal, Financial, or Professional Advice
                  </h3>
                  <p>
                    The tools, workflows, document editors, OCR extractors, and electronic signature pads provided on this website are designed solely for general administrative convenience and digital productivity. PDF Toolkit Pro does not provide legal, contractual, compliance, or regulatory advice. It is the sole responsibility of the user to verify whether digital signatures and electronic records generated on this site fulfill statutory compliance requirements (such as the ESIGN Act, UETA, eIDAS, or local contract law) for their specific use case.
                  </p>
                </div>

                {/* Section 3: "As-Is" Warranty & Accuracy Disclaimer */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide mb-1.5">
                    3. "As-Is" Provision &amp; Accuracy Disclaimer
                  </h3>
                  <p>
                    All services, functions, algorithms, and content on PDF Toolkit Pro are provided on an <strong>"as is"</strong> and <strong>"as available"</strong> basis, without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, accuracy, or non-infringement. While we endeavor to maintain high-fidelity conversions and precise OCR transcriptions, we cannot guarantee that output files will be completely error-free, uninterrupted, or fully compatible with every legacy viewer.
                  </p>
                </div>

                {/* Section 4: Data Security & Backup Responsibility */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide mb-1.5">
                    4. Data Security &amp; User Backup Responsibility
                  </h3>
                  <p>
                    We prioritize document confidentiality by employing browser-native WebAssembly processing where available. In situations where temporary server processing is utilized, files are strictly ephemeral and automatically purged. Users are strongly advised to always maintain original, unedited backup copies of essential documents prior to executing conversion, compression, metadata editing, or page deletion operations.
                  </p>
                </div>

                {/* Section 5: Limitation of Liability */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide mb-1.5">
                    5. Limitation of Liability
                  </h3>
                  <p>
                    To the maximum extent permitted by applicable law, PDF Toolkit Pro, its operators, contributors, and service partners shall not be held liable for any direct, indirect, incidental, special, consequential, or punitive damages—including without limitation, loss of data, corrupted documents, business interruption, or financial loss—arising out of or in connection with your access to, use of, or inability to use our tools and services.
                  </p>
                </div>

                {/* Section 6: Contact for Legal Inquiries */}
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide mb-1.5">
                    6. Contact for Inquiries &amp; Legal Notices
                  </h3>
                  <p>
                    If you have questions, feedback, or legal inquiries regarding this Disclaimer or our Terms of Service, please reach out to our dedicated support desk:
                  </p>
                  <div className="mt-2.5 p-3.5 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-200/60 dark:border-zinc-800 flex flex-wrap gap-6 text-xs text-slate-600 dark:text-zinc-300">
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-zinc-200">Email: </span>
                      <a href="mailto:support@pdftoolkitpro.online" className="text-blue-600 dark:text-blue-400 hover:underline">
                        support@pdftoolkitpro.online
                      </a>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-zinc-200">Website: </span>
                      <span className="text-slate-800 dark:text-zinc-300 font-mono">https://pdftoolkitpro.online</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= CONTACT US TAB ================= */}
          {activeTab === 'contact' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-zinc-900 pb-4">
                <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50 font-display">Contact Us</h2>
                  <p className="text-xs text-slate-400 dark:text-zinc-500">Reach the PDF Toolkit Pro support desk</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-5 text-xs text-slate-600 dark:text-zinc-300">
                  <p className="leading-relaxed">
                    Have questions about enterprise custom APIs, custom corporate pricing, or experiencing bug anomalies? Contact our support team directly. We maintain a 12-hour turnaround desk for all tickets.
                  </p>

                  <div className="space-y-3.5 pt-2">
                    <div className="flex items-start gap-3">
                      <Mail className="h-4 w-4 text-blue-500 mt-0.5" />
                      <div>
                        <p className="font-bold text-slate-800 dark:text-zinc-200">Email Helpdesk</p>
                        <a 
                          href="mailto:support@pdftoolkitpro.online" 
                          className="text-slate-400 hover:text-blue-500 transition-colors"
                        >
                          support@pdftoolkitpro.online
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-blue-500 mt-0.5" />
                      <div>
                        <p className="font-bold text-slate-800 dark:text-zinc-200">Corporate Location</p>
                        <p className="text-slate-400">Online Service – No Physical Office</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Globe className="h-4 w-4 text-blue-500 mt-0.5" />
                      <div>
                        <p className="font-bold text-slate-800 dark:text-zinc-200">Official Portal</p>
                        <p className="text-slate-400">https://pdftoolkitpro.online</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-zinc-900/50 p-5 rounded-2xl border border-slate-100 dark:border-zinc-900 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900 dark:text-zinc-100 text-sm flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                      Interactive Ticket System
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      If you are registered inside the sandbox workstation, you can file support threads and monitor developer comments live.
                    </p>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={onNavigateToTickets}
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      Open Tickets Dashboard
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
