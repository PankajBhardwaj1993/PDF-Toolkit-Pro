import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Tag, 
  User, 
  Calendar, 
  ShieldCheck, 
  Sparkles, 
  Layers, 
  Info, 
  FileCode, 
  Copy, 
  Check, 
  Plus, 
  X, 
  ArrowLeft, 
  Save, 
  Eye, 
  SlidersHorizontal,
  FileCheck
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { PDFDocument } from 'pdf-lib';
import { getPDFMetadata, updatePDFMetadata, PDFMetadataInfo } from '../utils/pdfUtils';

interface PdfMetadataEditorWorkstationProps {
  onAddRecentFile?: (file: { name: string; size: string; type: string; toolUsed: string }) => void;
  user?: any;
  onBackToTools?: () => void;
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function PdfMetadataEditorWorkstation({
  onAddRecentFile,
  user,
  onBackToTools
}: PdfMetadataEditorWorkstationProps) {
  const [file, setFile] = useState<File | null>(null);
  const [originalMeta, setOriginalMeta] = useState<PDFMetadataInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Editable Form Fields
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [subject, setSubject] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [creator, setCreator] = useState('');
  const [producer, setProducer] = useState('');
  const [creationDate, setCreationDate] = useState<string>('');
  const [modificationDate, setModificationDate] = useState<string>('');

  const [activeViewMode, setActiveViewMode] = useState<'editor' | 'diff'>('editor');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  // Load Metadata when file is selected
  const handleFileChange = async (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.pdf') && selectedFile.type !== 'application/pdf') {
      setErrorMessage('Please select a valid PDF document (.pdf).');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const meta = await getPDFMetadata(selectedFile);
      setFile(selectedFile);
      setOriginalMeta(meta);

      // Populate form state
      setTitle(meta.title);
      setAuthor(meta.author);
      setSubject(meta.subject);
      setKeywords([...meta.keywords]);
      setCreator(meta.creator);
      setProducer(meta.producer);
      setCreationDate(meta.creationDate ? meta.creationDate.toISOString().slice(0, 16) : '');
      setModificationDate(meta.modificationDate ? meta.modificationDate.toISOString().slice(0, 16) : '');
    } catch (err: any) {
      console.error('Error reading PDF metadata:', err);
      setErrorMessage('Failed to read PDF metadata. The file may be password protected or corrupted.');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate a sample PDF for quick testing
  const handleLoadSamplePDF = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4
      
      pdfDoc.setTitle('Sample Business Proposal 2026');
      pdfDoc.setAuthor('Acme Global Solutions');
      pdfDoc.setSubject('Quarterly Strategic Growth & Enterprise Operations');
      pdfDoc.setKeywords(['business', 'strategy', 'q3-report', 'enterprise', 'proposal', 'confidential']);
      pdfDoc.setCreator('PDF Toolkit Pro Workstation');
      pdfDoc.setProducer('pdf-lib engine');
      pdfDoc.setCreationDate(new Date());
      pdfDoc.setModificationDate(new Date());

      const pdfBytes = await pdfDoc.save();
      const sampleBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      const sampleFile = new File([sampleBlob], 'Sample_Document_Proposal.pdf', { type: 'application/pdf' });

      await handleFileChange(sampleFile);
    } catch (err) {
      console.error('Failed to create sample PDF:', err);
      setErrorMessage('Failed to create sample PDF.');
      setIsLoading(false);
    }
  };

  // Add keyword tag
  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    setKeywords(keywords.filter(k => k !== kwToRemove));
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  // Quick preset keyword suggestion
  const handleQuickAddKeyword = (kw: string) => {
    if (!keywords.includes(kw)) {
      setKeywords([...keywords, kw]);
    }
  };

  // Reset to original values
  const handleReset = () => {
    if (!originalMeta) return;
    setTitle(originalMeta.title);
    setAuthor(originalMeta.author);
    setSubject(originalMeta.subject);
    setKeywords([...originalMeta.keywords]);
    setCreator(originalMeta.creator);
    setProducer(originalMeta.producer);
    setCreationDate(originalMeta.creationDate ? originalMeta.creationDate.toISOString().slice(0, 16) : '');
    setModificationDate(originalMeta.modificationDate ? originalMeta.modificationDate.toISOString().slice(0, 16) : '');
    setSuccessMessage('Reset all properties back to original document values.');
  };

  // Wipe / Strip all identifying metadata
  const handleStripAll = () => {
    setTitle('');
    setAuthor('');
    setSubject('');
    setKeywords([]);
    setCreator('');
    setProducer('');
    setCreationDate('');
    setModificationDate('');
    setSuccessMessage('Cleared all document metadata fields for privacy & anonymization.');
  };

  // Copy field helper
  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Calculate has changes
  const hasChanges = originalMeta ? (
    title !== originalMeta.title ||
    author !== originalMeta.author ||
    subject !== originalMeta.subject ||
    keywords.join(',') !== originalMeta.keywords.join(',') ||
    creator !== originalMeta.creator ||
    producer !== originalMeta.producer ||
    creationDate !== (originalMeta.creationDate ? originalMeta.creationDate.toISOString().slice(0, 16) : '')
  ) : false;

  // Save and Download updated PDF
  const handleSaveAndDownload = async () => {
    if (!file) return;

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const parsedCreationDate = creationDate ? new Date(creationDate) : null;
      const parsedModDate = modificationDate ? new Date(modificationDate) : new Date();

      const updatedBytes = await updatePDFMetadata(file, {
        title: title.trim(),
        author: author.trim(),
        subject: subject.trim(),
        keywords: keywords,
        creator: creator.trim(),
        producer: producer.trim(),
        creationDate: parsedCreationDate,
        modificationDate: parsedModDate,
      });

      const updatedBlob = new Blob([updatedBytes], { type: 'application/pdf' });
      const baseName = file.name.replace(/\.pdf$/i, '');
      const downloadName = `${baseName}_metadata_updated.pdf`;

      saveAs(updatedBlob, downloadName);

      // Trigger recent file update
      if (onAddRecentFile) {
        onAddRecentFile({
          name: downloadName,
          size: formatBytes(updatedBytes.length),
          type: 'PDF Document',
          toolUsed: 'PDF Metadata Editor'
        });
      }

      setSuccessMessage(`Document properties updated successfully! Saved as "${downloadName}".`);
    } catch (err: any) {
      console.error('Error updating PDF metadata:', err);
      setErrorMessage('Failed to update PDF document metadata. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const sampleKeywords = ['Confidential', 'Report', 'Invoice', 'Final', 'Draft', 'Contract', 'Policy', 'Official', 'Proposal', 'Archive'];

  return (
    <div id="pdf-metadata-editor-workstation" className="space-y-6 animate-fade-in pb-12">
      {/* Top Header Bar */}
      <div id="metadata-editor-header" className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBackToTools && (
            <button
              id="metadata-back-btn"
              onClick={onBackToTools}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Back to Tools"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-rose-500 to-rose-600 flex items-center justify-center text-white shadow-sm">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">PDF Metadata Editor</h1>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50">
                  Properties & SEO
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                View, modify, and sanitize PDF document properties, author, title, and search tags.
              </p>
            </div>
          </div>
        </div>

        {file && (
          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Upload different PDF"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Change PDF</span>
            </button>
            <button
              id="metadata-strip-btn"
              onClick={handleStripAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 transition-colors cursor-pointer"
              title="Remove all identifying metadata fields"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Strip All</span>
            </button>
            <button
              id="metadata-reset-btn"
              onClick={handleReset}
              disabled={!hasChanges}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold transition-colors ${
                hasChanges 
                  ? 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer' 
                  : 'text-slate-400 dark:text-zinc-600 opacity-50 cursor-not-allowed'
              }`}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
            <button
              id="metadata-save-btn"
              onClick={handleSaveAndDownload}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  <span>Download PDF</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      {errorMessage && (
        <div id="metadata-error-banner" className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 flex items-start gap-3 text-red-700 dark:text-red-300 text-sm animate-fade-in">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Error</p>
            <p className="text-xs">{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div id="metadata-success-banner" className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-start gap-3 text-emerald-700 dark:text-emerald-300 text-sm animate-fade-in">
          <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Success</p>
            <p className="text-xs">{successMessage}</p>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Upload Zone when no file is active */}
      {!file ? (
        <div id="metadata-upload-container" className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl p-8 sm:p-12 text-center shadow-xs">
          <div 
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileChange(e.dataTransfer.files[0]);
              }
            }}
            className="border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-rose-500 dark:hover:border-rose-500 rounded-2xl p-8 sm:p-12 transition-all flex flex-col items-center justify-center gap-4 bg-slate-50/50 dark:bg-zinc-900/30 cursor-pointer select-none"
          >
            <div className="h-16 w-16 rounded-2xl bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Upload className="h-8 w-8 animate-bounce-subtle" />
            </div>

            <div className="max-w-md space-y-1">
              <h3 className="text-base font-bold text-slate-800 dark:text-zinc-100">
                Choose a PDF file or drag & drop here
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Instantly inspect and update Title, Author, Subject, Keywords, Creator, and timestamps.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
                e.target.value = '';
              }}
            />

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                id="select-pdf-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                disabled={isLoading}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm shadow-sm transition-colors cursor-pointer"
              >
                {isLoading ? 'Reading Document...' : 'Select PDF File'}
              </button>

              <button
                type="button"
                id="load-sample-pdf-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLoadSamplePDF();
                }}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-semibold text-sm transition-colors cursor-pointer flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>Try with Sample PDF</span>
              </button>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-slate-400 dark:text-zinc-500 pt-4 border-t border-slate-200/60 dark:border-zinc-800 w-full max-w-sm justify-center">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                100% Client-Side
              </span>
              <span>•</span>
              <span>No file size limits</span>
              <span>•</span>
              <span>Total Privacy</span>
            </div>
          </div>
        </div>
      ) : (
        /* Workstation Layout when PDF is loaded */
        <div id="metadata-workstation-content" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Document Card & Quick Summary */}
          <div className="lg:col-span-4 space-y-5">
            <div id="document-overview-card" className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-zinc-100 truncate" title={file.name}>
                      {file.name}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-zinc-500">
                      {formatBytes(file.size)} • {originalMeta?.pageCount} {originalMeta?.pageCount === 1 ? 'page' : 'pages'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2 text-xs">
                <div className="flex justify-between py-1 text-slate-600 dark:text-zinc-400">
                  <span className="font-medium">Status</span>
                  <span className={`font-bold px-2 py-0.5 rounded-md ${
                    hasChanges 
                      ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' 
                      : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                  }`}>
                    {hasChanges ? 'Modified (Unsaved)' : 'Original Loaded'}
                  </span>
                </div>
                <div className="flex justify-between py-1 text-slate-600 dark:text-zinc-400">
                  <span className="font-medium">Page Count</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">{originalMeta?.pageCount || 1}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-600 dark:text-zinc-400">
                  <span className="font-medium">Active Keywords</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">{keywords.length} tags</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex gap-2">
                <button
                  id="replace-pdf-btn"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer text-center"
                >
                  Choose Different File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />
              </div>
            </div>

            {/* Quick Actions & Privacy Toolkit */}
            <div id="metadata-privacy-card" className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-slate-800 dark:text-zinc-100 font-bold text-xs">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Privacy & Metadata Sanitization</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                PDF files often contain hidden author names, software versions, and internal file paths. Strip metadata before sharing documents externally.
              </p>
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={handleStripAll}
                  className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs font-semibold border border-rose-200/60 dark:border-rose-900/40 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Sanitize & Strip All Metadata</span>
                </button>
              </div>
            </div>

            {/* Quick Keyword Presets */}
            <div id="keyword-presets-card" className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-slate-800 dark:text-zinc-100 font-bold text-xs">
                <Tag className="h-4 w-4 text-rose-500" />
                <span>Quick Keyword Tags</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Click any tag below to quickly attach it to your PDF document:
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {sampleKeywords.map((kw) => {
                  const isAttached = keywords.includes(kw);
                  return (
                    <button
                      key={kw}
                      onClick={() => isAttached ? handleRemoveKeyword(kw) : handleQuickAddKeyword(kw)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer flex items-center gap-1 ${
                        isAttached
                          ? 'bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200'
                          : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <span>{kw}</span>
                      {isAttached ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Metadata Form Editor */}
          <div className="lg:col-span-8 space-y-5">
            <div id="metadata-form-card" className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-xs space-y-6">
              
              {/* Form Tab Switches */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Document Properties</h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Modify the standard metadata embedded inside the PDF binary header.
                  </p>
                </div>
                <div className="flex items-center bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl">
                  <button
                    onClick={() => setActiveViewMode('editor')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      activeViewMode === 'editor'
                        ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900'
                    }`}
                  >
                    Editor
                  </button>
                  <button
                    onClick={() => setActiveViewMode('diff')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      activeViewMode === 'diff'
                        ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900'
                    }`}
                  >
                    Original vs New Diff
                  </button>
                </div>
              </div>

              {activeViewMode === 'editor' ? (
                <div className="space-y-5">
                  {/* 1. Document Title */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-zinc-300">
                      <label htmlFor="meta-title" className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-rose-500" />
                        <span>Document Title</span>
                      </label>
                      <div className="flex items-center gap-2 text-[11px] font-normal text-slate-400">
                        <span>{title.length} characters</span>
                        {title && (
                          <button
                            onClick={() => handleCopy(title, 'title')}
                            className="hover:text-slate-700 dark:hover:text-zinc-200 cursor-pointer"
                            title="Copy Title"
                          >
                            {copiedField === 'title' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      id="meta-title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Strategic Plan 2026 - Q3 Summary"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all outline-none"
                    />
                  </div>

                  {/* 2. Author & Subject (2 columns) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-zinc-300">
                        <label htmlFor="meta-author" className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-rose-500" />
                          <span>Author / Organization</span>
                        </label>
                        {author && (
                          <button
                            onClick={() => handleCopy(author, 'author')}
                            className="hover:text-slate-700 dark:hover:text-zinc-200 cursor-pointer text-[11px]"
                            title="Copy Author"
                          >
                            {copiedField === 'author' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          </button>
                        )}
                      </div>
                      <input
                        id="meta-author"
                        type="text"
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        placeholder="e.g. John Doe, Acme Corp"
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-zinc-300">
                        <label htmlFor="meta-subject" className="flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-rose-500" />
                          <span>Subject / Description</span>
                        </label>
                        {subject && (
                          <button
                            onClick={() => handleCopy(subject, 'subject')}
                            className="hover:text-slate-700 dark:hover:text-zinc-200 cursor-pointer text-[11px]"
                            title="Copy Subject"
                          >
                            {copiedField === 'subject' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          </button>
                        )}
                      </div>
                      <input
                        id="meta-subject"
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g. Annual Budget Assessment"
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all outline-none"
                      />
                    </div>
                  </div>

                  {/* 3. Keywords / Search Tags */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-zinc-300">
                      <label htmlFor="meta-keywords-input" className="flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-rose-500" />
                        <span>Keywords & Search Tags</span>
                      </label>
                      <span className="text-[11px] font-normal text-slate-400">
                        Type tag and press Enter or comma
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900 min-h-[50px] flex flex-wrap items-center gap-1.5 focus-within:ring-2 focus-within:ring-rose-500/20 focus-within:border-rose-500 transition-all">
                      {keywords.map((kw) => (
                        <span
                          key={kw}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800 text-xs font-semibold"
                        >
                          <span>{kw}</span>
                          <button
                            onClick={() => handleRemoveKeyword(kw)}
                            className="text-rose-600 hover:text-rose-900 dark:hover:text-white cursor-pointer"
                            title="Remove tag"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      <input
                        id="meta-keywords-input"
                        type="text"
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        onKeyDown={handleKeywordKeyDown}
                        onBlur={handleAddKeyword}
                        placeholder={keywords.length === 0 ? "Add tags like 'invoice, confidential, 2026'..." : "Add tag..."}
                        className="flex-1 min-w-[140px] bg-transparent text-sm text-slate-900 dark:text-zinc-100 outline-none px-1"
                      />
                    </div>
                  </div>

                  {/* 4. Advanced Technical Fields Section */}
                  <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                      <span>Software & Engine Properties</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="meta-creator" className="text-xs font-medium text-slate-600 dark:text-zinc-400">
                          Application / Creator Tool
                        </label>
                        <input
                          id="meta-creator"
                          type="text"
                          value={creator}
                          onChange={(e) => setCreator(e.target.value)}
                          placeholder="e.g. Microsoft Word, Google Docs, InDesign"
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="meta-producer" className="text-xs font-medium text-slate-600 dark:text-zinc-400">
                          PDF Producer Engine
                        </label>
                        <input
                          id="meta-producer"
                          type="text"
                          value={producer}
                          onChange={(e) => setProducer(e.target.value)}
                          placeholder="e.g. pdf-lib, Adobe PDF Library, Quartz"
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label htmlFor="meta-creation-date" className="text-xs font-medium text-slate-600 dark:text-zinc-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            <span>Creation Timestamp</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setCreationDate(new Date().toISOString().slice(0, 16))}
                            className="text-[10px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                          >
                            Set to Now
                          </button>
                        </div>
                        <input
                          id="meta-creation-date"
                          type="datetime-local"
                          value={creationDate}
                          onChange={(e) => setCreationDate(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label htmlFor="meta-mod-date" className="text-xs font-medium text-slate-600 dark:text-zinc-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            <span>Modification Timestamp</span>
                          </label>
                          <span className="text-[10px] text-slate-400">
                            Auto-updates on save
                          </span>
                        </div>
                        <input
                          id="meta-mod-date"
                          type="datetime-local"
                          value={modificationDate || new Date().toISOString().slice(0, 16)}
                          onChange={(e) => setModificationDate(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all outline-none"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                /* Original vs New Comparison Diff */
                <div className="space-y-4">
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 dark:bg-zinc-800/60 text-slate-700 dark:text-zinc-300 font-bold border-b border-slate-200 dark:border-zinc-700">
                        <tr>
                          <th className="p-3 w-1/4">Property</th>
                          <th className="p-3 w-3/8">Original Value</th>
                          <th className="p-3 w-3/8">Updated Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                        <tr>
                          <td className="p-3 font-semibold text-slate-600 dark:text-zinc-400">Title</td>
                          <td className="p-3 text-slate-500 dark:text-zinc-500">{originalMeta?.title || <span className="italic text-slate-400">Empty</span>}</td>
                          <td className={`p-3 font-medium ${title !== originalMeta?.title ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-zinc-300'}`}>
                            {title || <span className="italic text-slate-400">Empty</span>}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 font-semibold text-slate-600 dark:text-zinc-400">Author</td>
                          <td className="p-3 text-slate-500 dark:text-zinc-500">{originalMeta?.author || <span className="italic text-slate-400">Empty</span>}</td>
                          <td className={`p-3 font-medium ${author !== originalMeta?.author ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-zinc-300'}`}>
                            {author || <span className="italic text-slate-400">Empty</span>}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 font-semibold text-slate-600 dark:text-zinc-400">Subject</td>
                          <td className="p-3 text-slate-500 dark:text-zinc-500">{originalMeta?.subject || <span className="italic text-slate-400">Empty</span>}</td>
                          <td className={`p-3 font-medium ${subject !== originalMeta?.subject ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-zinc-300'}`}>
                            {subject || <span className="italic text-slate-400">Empty</span>}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 font-semibold text-slate-600 dark:text-zinc-400">Keywords</td>
                          <td className="p-3 text-slate-500 dark:text-zinc-500">{originalMeta?.keywords.join(', ') || <span className="italic text-slate-400">None</span>}</td>
                          <td className={`p-3 font-medium ${keywords.join(', ') !== originalMeta?.keywords.join(', ') ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-zinc-300'}`}>
                            {keywords.join(', ') || <span className="italic text-slate-400">None</span>}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 font-semibold text-slate-600 dark:text-zinc-400">Creator</td>
                          <td className="p-3 text-slate-500 dark:text-zinc-500">{originalMeta?.creator || <span className="italic text-slate-400">Empty</span>}</td>
                          <td className={`p-3 font-medium ${creator !== originalMeta?.creator ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-zinc-300'}`}>
                            {creator || <span className="italic text-slate-400">Empty</span>}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 font-semibold text-slate-600 dark:text-zinc-400">Producer</td>
                          <td className="p-3 text-slate-500 dark:text-zinc-500">{originalMeta?.producer || <span className="italic text-slate-400">Empty</span>}</td>
                          <td className={`p-3 font-medium ${producer !== originalMeta?.producer ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-zinc-300'}`}>
                            {producer || <span className="italic text-slate-400">Empty</span>}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Bottom Action Footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>Files are processed locally in your browser with zero server uploads.</span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleSaveAndDownload}
                    disabled={isSaving}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Updating Properties...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        <span>Save & Download PDF</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}
    </div>
  );
}
