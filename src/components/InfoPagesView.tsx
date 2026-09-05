import SEO from './SEO';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const activeTab = initialSection;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
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
                  navigate('/' + tab.id);
                  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
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
                  <p className="text-xs text-slate-400 dark:text-zinc-500">Last Updated: September 2026 • Data Protection &amp; Cookie Policy</p>
                </div>
              </div>

              <div className="prose prose-slate dark:prose-invert max-w-none text-xs leading-relaxed text-slate-600 dark:text-zinc-300 space-y-6">
                <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-500/20 text-emerald-900 dark:text-emerald-200">
                  <p className="font-semibold text-sm mb-1">
                    Your Privacy and Document Confidentiality Are Guaranteed
                  </p>
                  <p className="text-xs text-slate-700 dark:text-zinc-300">
                    At <strong>PDF Toolkit Pro (pdftoolkitpro.online)</strong>, accessible from <span className="font-mono text-blue-600 dark:text-blue-400">https://pdftoolkitpro.online</span>, the privacy of our visitors and the confidentiality of their files are paramount priorities. This Privacy Policy outlines the types of information we collect and how we safeguard it.
                  </p>
                </div>

                {/* Core Privacy Guarantees */}
                <div className="bg-slate-50 dark:bg-zinc-900/40 p-5 rounded-2xl border border-slate-100 dark:border-zinc-900/80 space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide">Key Privacy Guarantees</h3>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <p><strong>Zero Permanent Server Retention:</strong> All uploaded files and converted outputs are processed in-browser or purged automatically immediately upon task completion.</p>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <p><strong>No Selling or Sharing:</strong> We never sell, rent, monetize, or disclose your documents, images, or personal details to third parties.</p>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <p><strong>End-to-End HTTPS Encryption:</strong> All data transmissions between your browser and our servers are encrypted via industry-grade TLS/SSL certificates.</p>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <p><strong>Client-Side Processing:</strong> Wherever possible, document manipulation executes directly on your device via compiled WebAssembly.</p>
                  </div>
                </div>

                {/* Section: Log Files */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide mb-1.5">
                    1. Log Files &amp; Technical Telemetry
                  </h3>
                  <p>
                    PDF Toolkit Pro follows a standard procedure of utilizing log files. These files log visitors when they visit websites. The information collected by log files includes internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks. These are not linked to any personally identifiable information and are used solely for analyzing trends, administering the site, and defending against automated DDoS attacks.
                  </p>
                </div>

                {/* Section: Cookies and Web Beacons */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide mb-1.5">
                    2. Cookies and Web Beacons
                  </h3>
                  <p>
                    Like any other website, PDF Toolkit Pro uses 'cookies'. These cookies are used to store information including visitors' preferences, dark/light theme choice, and the pages on the website that the visitor accessed or visited. The information is used to optimize the users' experience by customizing our web page content based on visitors' browser type and/or other information.
                  </p>
                </div>

                {/* Section: Google AdSense & DoubleClick DART Cookie */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide mb-1.5">
                    3. Google DoubleClick DART Cookie &amp; Advertising Partners
                  </h3>
                  <p className="mb-2">
                    Google is one of the third-party vendors on our site. It also uses cookies, known as DART cookies, to serve ads to our site visitors based upon their visit to pdftoolkitpro.online and other sites on the internet.
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 mt-2 text-slate-700 dark:text-zinc-300">
                    <li>
                      Third-party ad servers or ad networks use technologies like cookies, JavaScript, or Web Beacons that are used in their respective advertisements and links that appear on PDF Toolkit Pro, which are sent directly to users' browsers.
                    </li>
                    <li>
                      They automatically receive your IP address when this occurs. These technologies are used to measure the effectiveness of their advertising campaigns and/or to personalize the advertising content that you see on websites that you visit.
                    </li>
                    <li>
                      Visitors may choose to decline the use of DART cookies by visiting the Google ad and content network Privacy Policy at the following URL: <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline font-mono">https://policies.google.com/technologies/ads</a>.
                    </li>
                  </ul>
                </div>

                {/* Section: CCPA & GDPR */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide mb-1.5">
                    4. CCPA &amp; GDPR Data Protection Rights
                  </h3>
                  <p>
                    We would like to make sure you are fully aware of all of your data protection rights. Every user is entitled to the following: the right to access, rectification, erasure, restrict processing, object to processing, and data portability. If you make a request, we have one month to respond to you. If you would like to exercise any of these rights, please contact us.
                  </p>
                </div>

                {/* Section: Children's Information */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide mb-1.5">
                    5. Children's Information
                  </h3>
                  <p>
                    Another part of our priority is adding protection for children while using the internet. We encourage parents and guardians to observe, participate in, and/or monitor and guide their online activity. PDF Toolkit Pro does not knowingly collect any Personal Identifiable Information from children under the age of 13.
                  </p>
                </div>

                {/* Section: Contact */}
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide mb-1.5">
                    6. Contacting Us
                  </h3>
                  <p>
                    If you have additional questions or require more information about our Privacy Policy, do not hesitate to contact us at <a href="mailto:support@pdftoolkitpro.online" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">support@pdftoolkitpro.online</a>.
                  </p>
                </div>
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
                  <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50 font-display">Terms of Service</h2>
                  <p className="text-xs text-slate-400 dark:text-zinc-500">Last Updated: September 2026 • Official Terms &amp; Conditions</p>
                </div>
              </div>

              <div className="prose prose-slate dark:prose-invert max-w-none text-xs leading-relaxed text-slate-600 dark:text-zinc-300 space-y-6">
                <div className="bg-slate-50 dark:bg-zinc-900/60 p-4 rounded-xl border border-slate-200/70 dark:border-zinc-800">
                  <p className="font-semibold text-slate-800 dark:text-zinc-200 mb-1">
                    Welcome to PDF Toolkit Pro!
                  </p>
                  <p className="text-slate-600 dark:text-zinc-400">
                    These Terms of Service ("Terms", "Agreement") govern your access to and use of <strong>pdftoolkitpro.online</strong> ("Website", "Platform", "we", "our", or "us"), including all online PDF tools, image compressors, document editors, OCR extractors, and related digital utilities. By accessing, browsing, or using any part of this Website, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree to these Terms, please do not use our services.
                  </p>
                </div>

                {/* Section 1 */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide mb-1.5">
                    1. Eligibility &amp; User Accounts
                  </h3>
                  <p>
                    By using this Website, you represent and warrant that you are at least 13 years of age (or 16 years of age in the European Economic Area) or have obtained parental/guardian consent to use the Platform. If you register an account, you are responsible for maintaining the confidentiality of your login credentials and for all activities conducted under your account.
                  </p>
                </div>

                {/* Section 2 */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide mb-1.5">
                    2. Acceptable Use Policy &amp; Prohibited Activities
                  </h3>
                  <p>
                    You agree to utilize our tools solely for lawful, authorized purposes. You strictly agree NOT to:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 mt-2 text-slate-700 dark:text-zinc-300">
                    <li>Upload or process any document containing malware, viruses, worms, trojan horses, malicious scripts, or harmful executable code.</li>
                    <li>Upload or process content that infringes upon third-party copyrights, trademarks, patents, trade secrets, or privacy rights.</li>
                    <li>Engage in automated scraping, mass data harvesting, denial-of-service (DoS/DDoS) attacks, or attempt to bypass rate limiters or security firewalls.</li>
                    <li>Decompile, reverse-engineer, disassemble, or derive the source code of the Platform's client or server infrastructure.</li>
                    <li>Utilize the services to generate or distribute fraudulent, deceptive, defamatory, or unlawful materials.</li>
                  </ul>
                </div>

                {/* Section 3 */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide mb-1.5">
                    3. Content Ownership &amp; Intellectual Property
                  </h3>
                  <p className="mb-2">
                    <strong>Your Content:</strong> You retain 100% full and exclusive ownership, copyright, and intellectual property rights over all documents, images, text, and files that you upload, process, or download via PDF Toolkit Pro. We do not claim any ownership rights over your content.
                  </p>
                  <p>
                    <strong>Our Platform:</strong> The visual interfaces, graphic design, custom icons, source code, compilation algorithms, database structures, and trademarks of PDF Toolkit Pro are the intellectual property of PDF Toolkit Pro and are protected by applicable intellectual property and copyright laws.
                  </p>
                </div>

                {/* Section 4 - Crucial for Google AdSense */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide mb-1.5">
                    4. Third-Party Advertisements &amp; Google AdSense
                  </h3>
                  <p className="mb-2">
                    PDF Toolkit Pro displays third-party advertisements, primarily through <strong>Google AdSense</strong>, to help finance free, publicly accessible document utilities for users worldwide.
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 mt-2 text-slate-700 dark:text-zinc-300">
                    <li>Google, as a third-party vendor, uses cookies (including the DoubleClick DART cookie) to serve ads based on users' prior visits to this Website or other websites across the Internet.</li>
                    <li>Users may opt out of personalized advertising by visiting Google's <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Ads Settings</a> or by visiting <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">aboutads.info</a>.</li>
                    <li>We strictly prohibit artificial ad clicks, misleading ad placements, or unauthorized automated interactions in compliance with Google AdSense Publisher Policies.</li>
                  </ul>
                </div>

                {/* Section 5 */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide mb-1.5">
                    5. Privacy &amp; Data Security
                  </h3>
                  <p>
                    Your privacy is our core priority. Most document processing (such as page rotation, splitting, local merging, and metadata inspection) is executed entirely within your local browser sandbox via WebAssembly and JavaScript. When files require temporary server processing, they are held in ephemeral memory and automatically purged immediately upon task completion. For full details on data collection and analytics, please refer to our <a href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Privacy Policy</a>.
                  </p>
                </div>

                {/* Section 6 */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide mb-1.5">
                    6. Disclaimer of Warranties
                  </h3>
                  <p>
                    PDF Toolkit Pro is provided on an <strong>"AS IS"</strong> and <strong>"AS AVAILABLE"</strong> basis without warranties of any kind, whether express, implied, statutory, or otherwise. We make no guarantees that the services will be uninterrupted, error-free, timely, secure, or that conversion outputs will be 100% defect-free across all legacy formats. Users are advised to keep original backups of important files.
                  </p>
                </div>

                {/* Section 7 */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide mb-1.5">
                    7. Limitation of Liability
                  </h3>
                  <p>
                    To the maximum extent permitted by applicable law, in no event shall PDF Toolkit Pro, its founders, operators, employees, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data, loss of business revenue, or work interruption arising out of or related to your use of the Platform.
                  </p>
                </div>

                {/* Section 8 */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide mb-1.5">
                    8. Indemnification
                  </h3>
                  <p>
                    You agree to defend, indemnify, and hold harmless PDF Toolkit Pro and its representatives from and against any claims, damages, liabilities, costs, and expenses (including reasonable attorney fees) arising from your violation of these Terms, your unauthorized use of the services, or any unlawful material you process.
                  </p>
                </div>

                {/* Section 9 */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide mb-1.5">
                    9. Modifications to Services &amp; Terms
                  </h3>
                  <p>
                    We reserve the right to modify, enhance, or discontinue any feature or service at our discretion with or without notice. We may update these Terms periodically. Continued use of the Platform following any posted modifications constitutes your binding acceptance of the revised Terms.
                  </p>
                </div>

                {/* Section 10 */}
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide mb-1.5">
                    10. Contact Information
                  </h3>
                  <p>
                    If you have any questions, clarifications, or concerns regarding these Terms of Service, please contact us:
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
