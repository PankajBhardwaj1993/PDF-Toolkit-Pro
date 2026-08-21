import SEO from './SEO';
import React, { useState } from 'react';
import { Terminal, Copy, Check, Server, Shield, Globe, Key, FileCode } from 'lucide-react';

export default function DocumentationView() {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const codeSnippets = {
    auth: `// All requests must include your API Bearer token in headers
const headers = {
  "Authorization": "Bearer YOUR_API_TOKEN_KEY",
  "Content-Type": "application/json"
};`,
    ocr: `// Extract text from base64 document or image
fetch("https://api.pdftoolkitpro.online/api/v1/ai/ocr", {
  method: "POST",
  headers: {
    "Authorization": "Bearer sec_pro_927384",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    imageBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
    mimeType: "image/png"
  })
})
.then(res => res.json())
.then(data => console.log("Extracted Text:", data.text));`,
    summarize: `// Summarize a text block using Gemini models
fetch("https://api.pdftoolkitpro.online/api/v1/ai/summarize", {
  method: "POST",
  headers: {
    "Authorization": "Bearer sec_pro_927384",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    text: "Your long document text content here...",
    level: "concise" // concise, detailed, or bullets
  })
})
.then(res => res.json())
.then(data => console.log("Summary:", data.summary));`,
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <SEO title="API Documentation | PDF Toolkit Pro" description="Learn how to integrate our powerful PDF APIs into your own applications." canonical="/docs" />
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 font-bold font-mono text-xs uppercase px-3 py-1 rounded-full">
              Developer Ecosystem
            </span>
          </div>
          <h1 className="font-display text-4xl font-extrabold text-slate-900 dark:text-zinc-50 mb-3 sm:text-5xl">
            PDF Toolkit Pro API
          </h1>
          <p className="text-lg text-slate-500 dark:text-zinc-400 leading-relaxed">
            Integrate high-speed PDF, image, and AI document capabilities directly inside your own databases, web applications, and scripts.
          </p>
        </div>

        {/* Quick Config Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
            <Server className="h-5 w-5 text-blue-500 mb-3" />
            <h3 className="font-semibold text-slate-800 dark:text-zinc-200 text-sm mb-1">Base Endpoint</h3>
            <p className="font-mono text-xs text-slate-500 dark:text-zinc-400">api.pdftoolkitpro.online/v1</p>
          </div>
          <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
            <Shield className="h-5 w-5 text-purple-500 mb-3" />
            <h3 className="font-semibold text-slate-800 dark:text-zinc-200 text-sm mb-1">Encryption</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">SSL, AES-256 secure transfers</p>
          </div>
          <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
            <Globe className="h-5 w-5 text-emerald-500 mb-3" />
            <h3 className="font-semibold text-slate-800 dark:text-zinc-200 text-sm mb-1">Rate Limits</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Up to 10,000 requests/min (Enterprise)</p>
          </div>
        </div>

        {/* API Tutorial Section */}
        <div className="space-y-10">
          
          {/* Authentication */}
          <section className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <Key className="h-5 w-5 text-blue-500" />
              <h2 className="text-xl font-bold font-display text-slate-900 dark:text-zinc-100">
                1. Authenticating Requests
              </h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed mb-6">
              All API endpoints authenticate through a bearer token standard. Enterprise members can issue persistent API credentials from their dashboard instantly.
            </p>
            
            <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
              <button
                onClick={() => copyToClipboard(codeSnippets.auth, 'auth')}
                className="absolute right-3 top-3 p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-slate-400 hover:text-white cursor-pointer transition-colors"
                title="Copy Code"
              >
                {copiedText === 'auth' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
              <pre className="p-5 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre">
                <code>{codeSnippets.auth}</code>
              </pre>
            </div>
          </section>

          {/* AI OCR endpoint details */}
          <section className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <Terminal className="h-5 w-5 text-purple-500" />
              <h2 className="text-xl font-bold font-display text-slate-900 dark:text-zinc-100">
                2. AI Optical Character Recognition (OCR)
              </h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed mb-6">
              Send images, scanned invoices, receipts, or photos to instantly extract text strings. Ideal for database processing, automated expense filing, and catalog archiving.
            </p>
            
            <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
              <button
                onClick={() => copyToClipboard(codeSnippets.ocr, 'ocr')}
                className="absolute right-3 top-3 p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-slate-400 hover:text-white cursor-pointer transition-colors"
                title="Copy Code"
              >
                {copiedText === 'ocr' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
              <pre className="p-5 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre">
                <code>{codeSnippets.ocr}</code>
              </pre>
            </div>
          </section>

          {/* AI Summarizer endpoint details */}
          <section className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <FileCode className="h-5 w-5 text-emerald-500" />
              <h2 className="text-xl font-bold font-display text-slate-900 dark:text-zinc-100">
                3. AI Document Summarizer
              </h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed mb-6">
              Extract semantic, structural summaries from large blocks of texts, books, or raw legal contracts. Supports multiple summary outputs.
            </p>
            
            <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
              <button
                onClick={() => copyToClipboard(codeSnippets.summarize, 'summarize')}
                className="absolute right-3 top-3 p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-slate-400 hover:text-white cursor-pointer transition-colors"
                title="Copy Code"
              >
                {copiedText === 'summarize' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
              <pre className="p-5 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre">
                <code>{codeSnippets.summarize}</code>
              </pre>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
