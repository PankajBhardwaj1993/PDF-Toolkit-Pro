import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Sparkles, Send, Plus, Loader2, Check, Copy, FileText, 
  X, Download, Languages, AlertCircle, FileUp, RefreshCw, Mail, 
  CheckCircle2, Brain, Edit3, ClipboardCopy, FileCode, CheckCircle 
} from 'lucide-react';

interface Message {
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  taskType?: string;
  fileName?: string;
}

interface GrammarWorkstationProps {
  onBackToTools: () => void;
  user: any;
  onAddRecentFile: (file: any) => void;
}

export default function GrammarWorkstation({ onBackToTools, user, onAddRecentFile }: GrammarWorkstationProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: `Hello! I am your AI Grammar and Polish Workstation. How can I assist you with your document today?

You can write or paste text below, or upload a document using the **[ + ]** button, and then run any of these tasks:
• 🔍 **Grammar Check**: Identify syntax and grammar mistakes with structural feedback.
• 📧 **Mail Writing**: Draft professional emails from raw inputs or rough details.
• ✨ **Professional Polish**: Rephrase and elevate the vocabulary for a corporate tone.
• 💼 **Tone Tuning**: Adjust text to sound highly professional, persuasive, or warm & friendly.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedFileText, setExtractedFileText] = useState<string>('');
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [fileStatusMsg, setFileStatusMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing, isReadingFile]);

  // Handle document upload selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setUploadedFile(file);
    setIsReadingFile(true);
    setFileStatusMsg(`Reading ${file.name}...`);
    setError(null);

    try {
      const fileType = file.type;
      const extension = file.name.split('.').pop()?.toLowerCase();

      // 1. Text files (.txt, .md, .csv, .json, etc.)
      if (fileType.startsWith('text/') || ['txt', 'md', 'json', 'csv', 'xml'].includes(extension || '')) {
        const text = await file.text();
        if (text.trim()) {
          setExtractedFileText(text);
          setFileStatusMsg(`Loaded text file: ${text.length} characters`);
          // Automatically append user notification message
          addSystemNotification(`📎 Attached file **${file.name}** (${formatBytes(file.size)}). Ready for editing.`);
        } else {
          throw new Error('This text file is empty.');
        }
      }
      // 2. Images (.png, .jpg, .jpeg, .webp) - Run Vision OCR automatically!
      else if (fileType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp'].includes(extension || '')) {
        setFileStatusMsg(`Running Gemini Vision OCR on ${file.name}...`);
        
        // Convert to base64
        const reader = new FileReader();
        reader.readAsDataURL(file);
        const base64: string = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result as string);
        });

        // Call backend OCR route
        const response = await fetch('/api/ai/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType: fileType || 'image/jpeg' }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Gemini OCR failed on this image.');

        if (data.text && data.text.trim()) {
          setExtractedFileText(data.text);
          setFileStatusMsg(`Vision OCR complete! Extracted ${data.text.length} characters.`);
          addSystemNotification(`📸 Extracted text from **${file.name}** via AI Vision OCR:\n\n*${data.text.slice(0, 150)}...*`);
        } else {
          throw new Error('Could not detect any text inside this image.');
        }
      }
      // 3. PDFs or other documents
      else if (fileType === 'application/pdf' || extension === 'pdf') {
        // PDF fallback: Inform the user we can read text or use AI summarizer/chat
        setFileStatusMsg(`Processing PDF context...`);
        const text = `Please process this PDF file: ${file.name}`;
        setExtractedFileText(text);
        addSystemNotification(`📎 PDF **${file.name}** attached as workflow context.`);
      } else {
        // Fallback: Read as text
        const text = await file.text();
        setExtractedFileText(text);
        setFileStatusMsg(`Loaded file context: ${file.name}`);
        addSystemNotification(`📎 Loaded **${file.name}** text context.`);
      }
    } catch (err: any) {
      console.error('File parsing error:', err);
      setError(`Failed to read file: ${err.message || 'Unknown error'}`);
      setUploadedFile(null);
      setExtractedFileText('');
      setFileStatusMsg(null);
    } finally {
      setIsReadingFile(false);
    }
  };

  const addSystemNotification = (text: string) => {
    setMessages(prev => [
      ...prev,
      {
        sender: 'ai',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setExtractedFileText('');
    setFileStatusMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Convert bytes size nicely
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Process specific AI Grammar/Polish Action Task
  const executeTask = async (taskType: string, customPromptText?: string) => {
    const rawContent = extractedFileText || inputText;
    
    if (!rawContent.trim() && !customPromptText) {
      setError('Please write some text in the input box, or click " + " to upload a document first!');
      return;
    }

    setIsProcessing(true);
    setError(null);

    // User message logic
    const userPromptText = customPromptText || `Execute ${taskType} on current text block`;
    const userMsgText = rawContent.trim() 
      ? `**Task: ${taskType}**\n\nText Block:\n"${rawContent.slice(0, 300)}${rawContent.length > 300 ? '...' : ''}"`
      : `**Prompt:** ${userPromptText}`;

    setMessages(prev => [
      ...prev,
      {
        sender: 'user',
        text: userMsgText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    try {
      let endpoint = '/api/ai/grammar';
      let payload: any = { text: rawContent };

      if (taskType === 'Mail Writing') {
        endpoint = '/api/ai/rewrite';
        payload = { text: rawContent || userPromptText, tone: 'Professional' };
        // We can craft a custom message for mail writing
        if (rawContent) {
          payload.text = `Draft a well-structured, professional corporate email using these raw notes/parameters:\n\n${rawContent}`;
        }
      } else if (taskType === 'Professional Polish') {
        endpoint = '/api/ai/rewrite';
        payload = { text: rawContent, tone: 'Professional' };
      } else if (taskType === 'Casual Tone') {
        endpoint = '/api/ai/rewrite';
        payload = { text: rawContent, tone: 'Casual' };
      } else if (taskType === 'Executive Summary') {
        endpoint = '/api/ai/summarize';
        payload = { text: rawContent, level: 'bullets' };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'The server encountered an error processing the task.');
      }

      // Format AI output response
      let resultText = '';
      if (endpoint === '/api/ai/grammar') {
        resultText = data.result;
      } else if (endpoint === '/api/ai/rewrite') {
        resultText = data.rewrittenText;
      } else if (endpoint === '/api/ai/summarize') {
        resultText = data.summary;
      }

      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: resultText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          taskType,
          fileName: uploadedFile?.name
        }
      ]);

      // Add to recent files if successful
      onAddRecentFile({
        name: `polished_document_${Date.now().toString().slice(-4)}.md`,
        size: formatBytes(resultText.length),
        type: 'text/markdown',
        toolUsed: `AI Grammar & Polish (${taskType})`,
      });

      // Clear input text if custom prompt was sent
      if (customPromptText) {
        setInputText('');
      }

    } catch (err: any) {
      console.error('Task execution error:', err);
      setError(err.message || 'An error occurred during AI processing.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Chat submit form (Enter key / click Send)
  const handleSendPrompt = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    // Run standard grammar check if no specific task card is clicked, or custom instruction
    const isCustomInstruction = inputText.toLowerCase().includes('write') || 
                                inputText.toLowerCase().includes('draft') || 
                                inputText.toLowerCase().includes('summarize') ||
                                inputText.toLowerCase().includes('translate');

    if (isCustomInstruction) {
      executeTask('AI Assist', inputText);
    } else {
      executeTask('Grammar Check');
    }
  };

  // Helper copy to clipboard
  const copyTextToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Optional feedback can be displayed
  };

  // Quick preset loading helper to let users try easily
  const loadPresetSample = (sampleText: string) => {
    setInputText(sampleText);
    setError(null);
  };

  return (
    <div className="bg-slate-50 dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col lg:flex-row h-[720px] max-w-7xl mx-auto">
      
      {/* LEFT SIDE PANEL: Tasks, Drafting Templates & Context */}
      <div className="w-full lg:w-80 bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800 flex flex-col h-1/3 lg:h-full shrink-0">
        <div className="p-5 border-b border-slate-150 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/40">
          <button
            onClick={onBackToTools}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>
          <span className="text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-lg border border-purple-200 dark:border-purple-900/50">
            Gemini Pro
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Active Document Status */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Document Workspace</h4>
            {uploadedFile ? (
              <div className="p-3.5 bg-indigo-50/70 dark:bg-zinc-900 border border-indigo-100 dark:border-zinc-800 rounded-2xl flex flex-col gap-2 relative">
                <button 
                  onClick={handleRemoveFile}
                  className="absolute top-2.5 right-2.5 p-1 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 dark:bg-zinc-800 dark:hover:bg-rose-950/40 rounded-full transition-colors cursor-pointer"
                  title="Remove attached file"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 dark:text-zinc-100 truncate pr-4">{uploadedFile.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{formatBytes(uploadedFile.size)}</p>
                  </div>
                </div>
                {fileStatusMsg && (
                  <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-zinc-900 border border-indigo-100 dark:border-zinc-800 px-2 py-1 rounded-lg mt-1 text-center truncate">
                    {fileStatusMsg}
                  </p>
                )}
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-4 border border-dashed border-slate-200 dark:border-zinc-800 hover:border-purple-400 dark:hover:border-purple-600 rounded-2xl flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-zinc-900/20 hover:bg-purple-50/20 dark:hover:bg-purple-950/10 group transition-all duration-300 cursor-pointer"
              >
                <FileUp className="h-6 w-6 text-slate-400 group-hover:text-purple-500 transition-colors mb-1.5" />
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-200">Upload Text, PDF or Image</span>
                <span className="text-[10px] text-slate-400 mt-1">Reads text or transcribes via Vision OCR</span>
              </button>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept=".txt,.md,.pdf,.png,.jpg,.jpeg,.webp" 
            />
          </div>

          {/* Quick Task Triggers */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Correction Task</h4>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => executeTask('Grammar Check')}
                disabled={isProcessing || isReadingFile}
                className="p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 hover:border-purple-500 dark:hover:border-purple-500 rounded-xl flex items-center gap-3 text-left transition-all duration-200 group cursor-pointer disabled:opacity-50"
              >
                <div className="p-2 bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-lg group-hover:scale-110 transition-transform">
                  <Brain className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-zinc-100">Grammar Check</p>
                  <p className="text-[10px] text-slate-400">Fix grammar, punctuation & typos</p>
                </div>
              </button>

              <button
                onClick={() => executeTask('Mail Writing')}
                disabled={isProcessing || isReadingFile}
                className="p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 hover:border-purple-500 dark:hover:border-purple-500 rounded-xl flex items-center gap-3 text-left transition-all duration-200 group cursor-pointer disabled:opacity-50"
              >
                <div className="p-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg group-hover:scale-110 transition-transform">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-zinc-100">Mail Writing</p>
                  <p className="text-[10px] text-slate-400">Draft clean structured corporate emails</p>
                </div>
              </button>

              <button
                onClick={() => executeTask('Professional Polish')}
                disabled={isProcessing || isReadingFile}
                className="p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 hover:border-purple-500 dark:hover:border-purple-500 rounded-xl flex items-center gap-3 text-left transition-all duration-200 group cursor-pointer disabled:opacity-50"
              >
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:scale-110 transition-transform">
                  <Edit3 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-zinc-100">Professional Polish</p>
                  <p className="text-[10px] text-slate-400">Upgrade vocabulary and sentences</p>
                </div>
              </button>

              <button
                onClick={() => executeTask('Casual Tone')}
                disabled={isProcessing || isReadingFile}
                className="p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 hover:border-purple-500 dark:hover:border-purple-500 rounded-xl flex items-center gap-3 text-left transition-all duration-200 group cursor-pointer disabled:opacity-50"
              >
                <div className="p-2 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-lg group-hover:scale-110 transition-transform">
                  <Languages className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-zinc-100">Casual Tone</p>
                  <p className="text-[10px] text-slate-400">Rephrase friendly and warm</p>
                </div>
              </button>

              <button
                onClick={() => executeTask('Executive Summary')}
                disabled={isProcessing || isReadingFile}
                className="p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 hover:border-purple-500 dark:hover:border-purple-500 rounded-xl flex items-center gap-3 text-left transition-all duration-200 group cursor-pointer disabled:opacity-50"
              >
                <div className="p-2 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-lg group-hover:scale-110 transition-transform">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-zinc-100">Executive Summary</p>
                  <p className="text-[10px] text-slate-400">Summarize block into short bullets</p>
                </div>
              </button>
            </div>
          </div>

          {/* Interactive Presets */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Try Sample Presets</h4>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => loadPresetSample("i is writing to inform you that the report has been send by myself yesterday but nobody didnt reply yet")}
                className="text-left text-[11px] font-medium text-slate-600 dark:text-zinc-400 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900/60 dark:hover:bg-zinc-900 p-2.5 rounded-lg border border-slate-150 dark:border-zinc-800 truncate"
                title="Click to load sample grammar error"
              >
                ✍️ "i is writing..." (Grammar typo)
              </button>
              <button
                type="button"
                onClick={() => loadPresetSample("Hi John, please join meeting tomorrow at 3pm. We need to discuss project budget details and timeline. Bring reports.")}
                className="text-left text-[11px] font-medium text-slate-600 dark:text-zinc-400 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900/60 dark:hover:bg-zinc-900 p-2.5 rounded-lg border border-slate-150 dark:border-zinc-800 truncate"
                title="Click to load raw email notes"
              >
                📧 "Hi John, join meeting..." (Email Notes)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT CHAT AREA: ChatGPT-like conversational flow */}
      <div className="flex-1 flex flex-col h-2/3 lg:h-full bg-slate-50 dark:bg-zinc-900/50">
        
        {/* Chat Stream Viewport */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg, index) => {
            const isAI = msg.sender === 'ai';
            return (
              <div
                key={index}
                className={`flex gap-3 max-w-[85%] ${isAI ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
              >
                {/* Profile Icon */}
                <div className={`h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs ${
                  isAI 
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20' 
                    : 'bg-zinc-700 text-white'
                }`}>
                  {isAI ? 'AI' : 'ME'}
                </div>

                {/* Message Bubble Container */}
                <div className="space-y-1">
                  <div className={`p-4 rounded-2xl text-xs leading-relaxed ${
                    isAI 
                      ? 'bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 border border-slate-200/60 dark:border-zinc-800 rounded-tl-xs shadow-xs' 
                      : 'bg-indigo-600 text-white rounded-tr-xs shadow-md shadow-indigo-500/10 font-medium'
                  }`}>
                    <div className="whitespace-pre-wrap font-sans">
                      {msg.text}
                    </div>

                    {/* AI action bar inside bubble */}
                    {isAI && index > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-850 flex items-center gap-2">
                        <button
                          onClick={() => copyTextToClipboard(msg.text)}
                          className="px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 bg-slate-50 hover:bg-purple-50/50 dark:bg-zinc-900 rounded-lg flex items-center gap-1 transition-all cursor-pointer border border-slate-100 dark:border-zinc-800"
                        >
                          <Copy className="h-3 w-3" />
                          Copy Text
                        </button>
                        
                        <button
                          onClick={() => setInputText(msg.text)}
                          className="px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 hover:bg-indigo-50/50 dark:bg-zinc-900 rounded-lg flex items-center gap-1 transition-all cursor-pointer border border-slate-100 dark:border-zinc-800"
                        >
                          <ClipboardCopy className="h-3 w-3" />
                          Use as Input
                        </button>

                        <a
                          href={`data:text/plain;charset=utf-8,${encodeURIComponent(msg.text)}`}
                          download={`ai_polished_${msg.taskType || 'grammar'}.txt`}
                          className="px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 bg-slate-50 hover:bg-emerald-50/50 dark:bg-zinc-900 rounded-lg flex items-center gap-1 transition-all cursor-pointer border border-slate-100 dark:border-zinc-800"
                        >
                          <Download className="h-3 w-3" />
                          Download .txt
                        </a>
                      </div>
                    )}
                  </div>
                  <p className={`text-[9px] text-slate-400 font-mono ${isAI ? 'text-left pl-1' : 'text-right pr-1'}`}>
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Active Processing Loader */}
          {isProcessing && (
            <div className="flex gap-3 max-w-[85%] mr-auto">
              <div className="h-8 w-8 rounded-full bg-purple-600 text-white flex-shrink-0 flex items-center justify-center animate-pulse">
                AI
              </div>
              <div className="p-4 bg-white dark:bg-zinc-950 text-slate-400 rounded-2xl rounded-tl-xs shadow-xs border border-slate-200/60 dark:border-zinc-800 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                <span className="text-xs font-semibold animate-pulse">Gemini AI is parsing and writing...</span>
              </div>
            </div>
          )}

          {/* Active File Reading Loader */}
          {isReadingFile && (
            <div className="flex gap-3 max-w-[85%] mr-auto">
              <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex-shrink-0 flex items-center justify-center">
                AI
              </div>
              <div className="p-4 bg-white dark:bg-zinc-950 text-slate-400 rounded-2xl rounded-tl-xs shadow-xs border border-slate-200/60 dark:border-zinc-800 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                <span className="text-xs font-semibold">{fileStatusMsg || 'Reading document context...'}</span>
              </div>
            </div>
          )}

          {/* Error Feed Block */}
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-4 flex gap-3 text-rose-800 dark:text-rose-300 max-w-lg mx-auto">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-500" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-0.5">Processing Issue</p>
                <p className="text-xs leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Floating selected file indicator inside the main workspace bar */}
        {uploadedFile && (
          <div className="mx-5 mb-1 px-3 py-1.5 bg-indigo-50 dark:bg-zinc-900/80 border border-indigo-100 dark:border-zinc-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-[10px] font-bold text-slate-700 dark:text-zinc-200 truncate">
                Using file: {uploadedFile.name} ({formatBytes(uploadedFile.size)})
              </span>
            </div>
            <button 
              onClick={handleRemoveFile} 
              className="text-slate-400 hover:text-rose-600 p-0.5"
              title="Deselect file"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ChatGPT Style Bottom Input Bar */}
        <div className="p-5 pt-2 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40">
          <form onSubmit={handleSendPrompt} className="relative flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl px-4 py-2 shadow-lg focus-within:ring-2 focus-within:ring-purple-500/20 transition-all">
            
            {/* "+" Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isReadingFile || isProcessing}
              className="h-9 w-9 rounded-xl bg-slate-50 dark:bg-zinc-800/60 hover:bg-purple-100 hover:text-purple-600 dark:hover:bg-purple-950/40 text-slate-500 dark:text-zinc-400 flex items-center justify-center transition-all cursor-pointer shrink-0 border border-slate-100 dark:border-zinc-800"
              title="Upload text file, PDF, or run image OCR"
            >
              <Plus className="h-5 w-5" />
            </button>

            {/* Prompt Input Textarea */}
            <textarea
              rows={1}
              required
              disabled={isProcessing}
              placeholder={uploadedFile ? `Describe task for ${uploadedFile.name} (e.g. "Draft an email" or "Grammar check")...` : "Paste grammar copy or ask 'Write corporate email'..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendPrompt();
                }
              }}
              className="flex-1 max-h-32 min-h-[36px] py-2 bg-transparent outline-none border-0 ring-0 text-xs text-slate-800 dark:text-zinc-100 font-sans resize-none placeholder-slate-400"
            />

            {/* Submit Arrow Button */}
            <button
              type="submit"
              disabled={isProcessing || !inputText.trim()}
              className="h-9 w-9 rounded-xl bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center transition-all cursor-pointer disabled:bg-slate-200 dark:disabled:bg-zinc-800 disabled:text-slate-400 shrink-0 shadow-md shadow-purple-500/20"
              title="Submit Prompt"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

          {/* Quick inline task suggestion labels */}
          <div className="flex flex-wrap gap-2 mt-3 text-[10px] text-slate-400 font-semibold items-center">
            <span>Suggestions:</span>
            <button
              type="button"
              onClick={() => {
                setInputText("Correct the spelling and grammar for this paragraph:");
              }}
              className="px-2 py-0.5 bg-slate-100 hover:bg-purple-50 dark:bg-zinc-800 dark:hover:bg-purple-950/20 text-slate-600 dark:text-zinc-300 rounded-md transition-colors cursor-pointer"
            >
              📝 Grammar Check Prompt
            </button>
            <button
              type="button"
              onClick={() => {
                setInputText("Draft a polite follow-up email about the pending contract agreement:");
              }}
              className="px-2 py-0.5 bg-slate-100 hover:bg-purple-50 dark:bg-zinc-800 dark:hover:bg-purple-950/20 text-slate-600 dark:text-zinc-300 rounded-md transition-colors cursor-pointer"
            >
              📧 Email Writer Prompt
            </button>
            <button
              type="button"
              onClick={() => {
                setInputText("Rewrite this paragraph to sound highly professional and energetic:");
              }}
              className="px-2 py-0.5 bg-slate-100 hover:bg-purple-50 dark:bg-zinc-800 dark:hover:bg-purple-950/20 text-slate-600 dark:text-zinc-300 rounded-md transition-colors cursor-pointer"
            >
              ✨ Professional Polish Prompt
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
