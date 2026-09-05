import React, { useState } from 'react';
import { Tool } from '../types';
import { allToolsList } from '../data/tools';
import { getToolSeoContent } from '../data/seo';
import { 
  ArrowRight, HelpCircle, Sparkles, CheckCircle2, ShieldCheck, 
  Lock, Lightbulb, Zap, ChevronDown, Check, ExternalLink,
  Layers, Star, Shield, Smartphone
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';

interface ToolSeoFooterProps {
  tool: Tool;
}

export const getToolSlug = (t: { id: string; name?: string; slug?: string }) => t.slug || t.id;

export default function ToolSeoFooter({ tool }: ToolSeoFooterProps) {
  const toolId = tool.id;
  const seoData = getToolSeoContent(toolId);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  // Fallback defaults if a tool has no dedicated custom content entry
  const title = seoData?.h1 || tool.h1 || tool.name;
  const intro = seoData?.intro || tool.description;
  const whatIsTitle = seoData?.whatIsTitle || `About ${tool.name}`;
  const whatIsContent = seoData?.whatIsContent || [
    `${tool.name} on PDF Toolkit Pro is a high-speed, browser-native utility designed to streamline document workflows with zero desktop software requirements.`,
    `Engineered with modern web standards, it ensures your files are processed with maximum fidelity, speed, and privacy directly on your device.`
  ];
  const howToTitle = seoData?.howToTitle || `How to Use ${tool.name} Online`;
  const howToSteps = seoData?.howToSteps || [
    { step: 1, title: 'Select or Drag Your Files', description: 'Upload your documents directly into the active workstation canvas.' },
    { step: 2, title: 'Configure Tool Settings', description: 'Adjust compression levels, page orientations, or layout parameters as desired.' },
    { step: 3, title: 'Execute Processing', description: 'Click the process button to initiate fast client-side calculations.' },
    { step: 4, title: 'Download Result File', description: 'Save your completed, high-resolution document directly to your device.' }
  ];
  const featuresTitle = seoData?.featuresTitle || `Features of ${tool.name}`;
  const features = seoData?.features || [
    { title: '100% Free Access', description: 'Unlimited daily conversions with zero subscription fees or watermarks.' },
    { title: 'Browser-Native Privacy', description: 'Files are processed locally on your device with zero server retention.' },
    { title: 'High-Fidelity Output', description: 'Preserves original document formatting, typography, and image resolution.' },
    { title: 'Cross-Device Compatibility', description: 'Works seamlessly across Windows, macOS, Linux, iOS, and Android browsers.' }
  ];
  const useCasesTitle = seoData?.useCasesTitle || `Who Can Benefit from ${tool.name}?`;
  const useCases = seoData?.useCases || [
    { title: 'Office Professionals', description: 'Prepare executive presentations, reports, and signed contracts effortlessly.' },
    { title: 'Students & Academics', description: 'Organize research papers, lecture handouts, and homework submissions.' },
    { title: 'Small Business Owners', description: 'Manage client invoices, agreements, and receipts without expensive software licenses.' }
  ];
  const tipsTitle = seoData?.tipsTitle || `Tips for Optimal ${tool.name} Results`;
  const tips = seoData?.tips || [
    'Ensure source documents have clear typography for the best extraction fidelity.',
    'For multi-document tasks, organize files in your target order before batch processing.'
  ];
  const securityTitle = seoData?.securityTitle || 'Privacy & Document Security';
  const securityContent = seoData?.securityContent || 'PDF Toolkit Pro prioritizes your data confidentiality. Core operations run directly in your web browser with zero remote file storage, eliminating risks of data breaches or leaks.';
  
  const faqs = seoData?.faqs && seoData.faqs.length > 0 ? seoData.faqs : (
    tool.faqs && tool.faqs.length > 0 ? tool.faqs : [
      {
        question: `Is ${tool.name} free to use?`,
        answer: `Yes, ${tool.name} on PDF Toolkit Pro is 100% free with zero subscription requirements, credit card forms, or hidden fees.`
      },
      {
        question: `Are my documents safe when using ${tool.name}?`,
        answer: `Absolutely. All processing runs locally in your browser sandbox with zero permanent server storage.`
      },
      {
        question: `Does ${tool.name} work on mobile devices?`,
        answer: `Yes, the tool is fully responsive and functions smoothly on iOS Safari, Android Chrome, and modern desktop browsers.`
      }
    ]
  );

  // Related tools linking
  const relatedLinks = seoData?.relatedTools || [];
  const dynamicRelatedTools = relatedLinks.length > 0 
    ? relatedLinks.map(link => {
        const matched = allToolsList.find(t => t.id === link.id || t.id.replace(/_/g, '-') === link.id);
        return {
          id: link.id,
          name: link.title,
          description: link.anchor || matched?.description || 'Free browser-native online tool.',
          slug: matched ? getToolSlug(matched) : link.id
        };
      })
    : allToolsList
        .filter(t => t.category === tool.category && t.id !== tool.id && !t.hidden)
        .slice(0, 4)
        .map(t => ({
          id: t.id,
          name: t.name,
          description: t.description,
          slug: getToolSlug(t)
        }));

  // Construct Structured Data JSON-LD
  const canonicalUrl = seoData?.canonicalUrl || `https://pdftoolkitpro.online/tools/${toolId}`;
  
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };

  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: howToTitle,
    description: intro,
    totalTime: 'PT1M',
    step: howToSteps.map(step => ({
      '@type': 'HowToStep',
      position: step.step,
      name: step.title,
      text: step.description
    }))
  };

  const softwareAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: title,
    url: canonicalUrl,
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'All (Web Browser)',
    browserRequirements: 'Requires HTML5 compatible browser',
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD'
    }
  };

  return (
    <article className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16 border-t border-slate-200 dark:border-zinc-800 animate-fade-in text-slate-700 dark:text-zinc-300">
      
      {/* Schema.org Structured Data Injection */}
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(howToSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(softwareAppSchema)}
        </script>
      </Helmet>

      {/* 1. Header & Overview Intro */}
      <header className="space-y-4 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Complete User Guide &amp; Technical Overview</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-zinc-50 tracking-tight">
          {whatIsTitle}
        </h2>
        <p className="text-base leading-relaxed text-slate-600 dark:text-zinc-300 font-medium">
          {intro}
        </p>
      </header>

      {/* 2. In-Depth Multi-Paragraph Educational Content */}
      <section className="bg-slate-50/70 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
          <Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Understanding the Technology Behind {tool.name}
        </h3>
        <div className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-zinc-300">
          {whatIsContent.map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </div>
      </section>

      {/* 3. Step-by-Step How-To Guide */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            {howToTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
            Follow this simple walkthrough to process your files in seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {howToSteps.map((step) => (
            <div 
              key={step.step}
              className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-between group hover:border-blue-500/50 transition-all"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-black text-sm flex items-center justify-center border border-blue-200 dark:border-blue-800">
                    {step.step}
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                    Step {step.step} of {howToSteps.length}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {step.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Core Features & Capabilities */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
            <Zap className="h-6 w-6 text-amber-500" />
            {featuresTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
            Engineered for high performance, ease-of-use, and precision document control.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, idx) => (
            <div 
              key={idx}
              className="p-5 bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-2 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-zinc-100">
                <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{feature.title}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed pl-6">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Real-World Use Cases */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 dark:text-zinc-50">
            {useCasesTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
            Discover how professionals and individuals utilize this tool across diverse workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {useCases.map((useCase, idx) => (
            <div 
              key={idx}
              className="p-5 bg-slate-50/50 dark:bg-zinc-900/30 rounded-2xl border border-slate-200 dark:border-zinc-800/80 space-y-2"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">
                {idx + 1}
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-zinc-100">
                {useCase.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                {useCase.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Pro Tips & Security Guarantee (2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pro Tips */}
        <section className="p-6 bg-amber-50/40 dark:bg-amber-950/10 rounded-3xl border border-amber-200/70 dark:border-amber-900/30 space-y-4">
          <h3 className="text-base font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            {tipsTitle}
          </h3>
          <ul className="space-y-2.5">
            {tips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-amber-950 dark:text-amber-200 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Security Guarantee */}
        <section className="p-6 bg-emerald-50/40 dark:bg-emerald-950/10 rounded-3xl border border-emerald-200/70 dark:border-emerald-900/30 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              {securityTitle}
            </h3>
            <p className="text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed">
              {securityContent}
            </p>
          </div>
          <div className="pt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            <span className="px-2.5 py-1 bg-white/80 dark:bg-zinc-950 rounded-lg border border-emerald-300/40">✓ Client-Side Sandbox</span>
            <span className="px-2.5 py-1 bg-white/80 dark:bg-zinc-950 rounded-lg border border-emerald-300/40">✓ Zero Server Retention</span>
            <span className="px-2.5 py-1 bg-white/80 dark:bg-zinc-950 rounded-lg border border-emerald-300/40">✓ HTTPS Encrypted</span>
          </div>
        </section>

      </div>

      {/* 7. Comprehensive FAQ Accordion */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
            Find answers to common questions about capabilities, limitations, and privacy.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div 
                key={idx} 
                className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-slate-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span>{faq.question}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-slate-600 dark:text-zinc-400 leading-relaxed border-t border-slate-100 dark:border-zinc-900 pt-3 animate-fade-in">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. Related Tools & Complete Production URL Cross-Linking */}
      {dynamicRelatedTools.length > 0 && (
        <section className="space-y-6 pt-4 border-t border-slate-200 dark:border-zinc-800">
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 dark:text-zinc-50">
              Related Online PDF &amp; Document Utilities
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
              Explore complementary tools to convert, edit, sign, and optimize your files.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {dynamicRelatedTools.map((related) => (
              <a
                key={related.id}
                href={`https://pdftoolkitpro.online/tools/${related.slug}`}
                className="p-5 bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all flex flex-col justify-between group shadow-sm hover:shadow-md"
              >
                <div className="space-y-2">
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {related.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                    {related.description}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-900 flex items-center justify-between text-[11px] font-bold text-blue-600 dark:text-blue-400">
                  <span>Launch Tool</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

    </article>
  );
}

