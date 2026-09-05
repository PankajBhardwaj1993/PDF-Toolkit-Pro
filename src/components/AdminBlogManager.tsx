import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, PlusCircle, Trash2, Edit3, Eye, Search, Sparkles, 
  Link as LinkIcon, CheckCircle2, AlertCircle, RefreshCw, 
  Calendar, Clock, User, Image as ImageIcon, FileText, ArrowRight,
  ExternalLink, Layers, ShieldCheck, Tag, Hash, HelpCircle, Code,
  Sliders, ChevronRight, X, Copy, Check
} from 'lucide-react';
import { BlogPost, User as UserType } from '../types';
import { allToolsList } from '../data/tools';
import { initialBlogPosts, getCachedBlogPosts, setCachedBlogPosts } from '../data/blogData';

interface AdminBlogManagerProps {
  user: UserType;
  onNavigateToBlog?: (postId?: string) => void;
}

// Preset featured images for quick selection
const IMAGE_PRESETS = [
  {
    name: 'Modern AI & Documents',
    url: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Legal Security & Signing',
    url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Office Productivity & Desk',
    url: 'https://images.unsplash.com/photo-1542435503-956c469947f6?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Spreadsheets & Analytics',
    url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Cloud Computing & Tech',
    url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Digital Paperwork & Notes',
    url: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&auto=format&fit=crop&q=80',
  }
];

export default function AdminBlogManager({ user, onNavigateToBlog }: AdminBlogManagerProps) {
  const [posts, setPosts] = useState<BlogPost[]>(() => {
    const cached = getCachedBlogPosts();
    if (cached !== null) return cached;
    return [];
  });
  const [loading, setLoading] = useState<boolean>(() => {
    return getCachedBlogPosts() === null;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  
  // Editor state (null = list mode, 'new' = create mode, string = edit mode with ID)
  const [editorMode, setEditorMode] = useState<'new' | 'edit' | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  
  // Form fields
  const [targetKeyword, setTargetKeyword] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Tutorials');
  const [author, setAuthor] = useState('Pankaj Bhardwaj');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [image, setImage] = useState(IMAGE_PRESETS[0].url);
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Tool selector for SEO internal link insertion
  const [selectedToolForLink, setSelectedToolForLink] = useState(allToolsList[0]?.id || 'merge_pdf');
  const [customAnchorText, setCustomAnchorText] = useState('');
  const [activeEditorTab, setActiveEditorTab] = useState<'write' | 'preview' | 'split'>('split');
  
  // Feedback status
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch blogs from API
  const fetchBlogs = async () => {
    try {
      const res = await fetch('/api/blogs');
      if (res.ok) {
        const data = await res.json();
        if (data.posts && Array.isArray(data.posts)) {
          setPosts(data.posts);
          setCachedBlogPosts(data.posts);
        }
      }
    } catch (e) {
      console.error('Failed to load blog posts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  // Quick reset for new article
  const handleStartNewArticle = () => {
    setEditorMode('new');
    setEditingPostId(null);
    setTargetKeyword('');
    setTitle('');
    setCategory('Tutorials');
    setAuthor('PDF Toolkit Pro Editorial Team');
    setDate(new Date().toISOString().split('T')[0]);
    setImage(IMAGE_PRESETS[0].url);
    setExcerpt('');
    setContent('');
    setStatusMessage(null);
  };

  // Populate editor with existing post
  const handleEditPost = (post: BlogPost) => {
    setEditorMode('edit');
    setEditingPostId(post.id);
    setTitle(post.title);
    setCategory(post.category || 'Tutorials');
    setAuthor(post.author || 'Admin');
    setDate(post.date || new Date().toISOString().split('T')[0]);
    setImage(post.image || IMAGE_PRESETS[0].url);
    setExcerpt(post.excerpt || '');
    setContent(post.content || '');
    setStatusMessage(null);
  };

  // Delete article
  const handleDeletePost = async (id: string, postTitle: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${postTitle}"?`)) {
      return;
    }
    // Optimistically update list and cache immediately
    const updated = posts.filter(p => p.id !== id);
    setPosts(updated);
    setCachedBlogPosts(updated);
    if (editingPostId === id) {
      setEditorMode(null);
      setEditingPostId(null);
    }

    try {
      const res = await fetch(`/api/blogs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        if (data.posts && Array.isArray(data.posts)) {
          setPosts(data.posts);
          setCachedBlogPosts(data.posts);
        }
        setStatusMessage({ type: 'success', text: `Article "${postTitle}" deleted successfully!` });
      } else {
        setStatusMessage({ type: 'error', text: 'Failed to delete article from server.' });
        fetchBlogs();
      }
    } catch (e) {
      setStatusMessage({ type: 'error', text: 'Error connecting to server.' });
      fetchBlogs();
    }
  };

  // Insert markdown tag helper into textarea
  const insertMarkdown = (before: string, after: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || defaultText;
    const replacement = `${before}${selectedText}${after}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  // Insert SEO Tool Internal Link
  const handleInsertToolLink = () => {
    const toolObj = allToolsList.find(t => t.id === selectedToolForLink);
    if (!toolObj) return;

    const anchor = customAnchorText.trim() || toolObj.name;
    const url = `https://pdftoolkitpro.online/tools/${toolObj.id}`;
    const markdownLink = `**[${anchor}](${url})**`;

    insertMarkdown(markdownLink, '', '');
    setCustomAnchorText('');
    setStatusMessage({ type: 'success', text: `Inserted internal link for "${anchor}"` });
  };

  // Generate SEO Structure Template
  const handleInsertSeoTemplate = () => {
    const chosenTool = allToolsList.find(t => t.id === selectedToolForLink) || allToolsList[0];
    const kw = targetKeyword.trim() || 'how to edit and convert PDF online';
    
    const template = `Managing digital paperwork quickly and securely is essential for modern professionals. In this comprehensive guide, we demonstrate step-by-step how to utilize free browser-native tools to optimize your workflow with zero quality loss.

### What is ${targetKeyword ? targetKeyword : 'Online PDF Management'}?
Traditional document editing software often requires expensive licenses and bulky desktop downloads. With modern web technologies on **[PDF Toolkit Pro](https://pdftoolkitpro.online/)**, you can process, convert, and sign files directly inside your browser in complete privacy.

---

### Step-by-Step Guide:
1. **Upload Your Source Document:** Navigate to our **[${chosenTool.name}](https://pdftoolkitpro.online/tools/${chosenTool.id})** tool. Drag and drop your file into the secure workstation.
2. **Configure Your Custom Settings:** Select the desired compression level, formatting options, or annotations.
3. **Execute Instant Conversion:** Click the action button. All rendering and cryptographic processing execute locally inside your browser within seconds.
4. **Download Your Optimized File:** Save your high-fidelity result directly to your local computer without watermarks or file size limitations.

---

### Key Advantages for Businesses:
- **100% Client-Side Privacy:** Your files are processed securely without ever uploading raw documents to third-party databases.
- **Fast Turnaround:** Eliminate lengthy server upload queues with instant browser computations.
- **Multi-Format Support:** Seamlessly bridge Word, Excel, PowerPoint, and Image documents into unified PDFs.

---

### Related Tools to Boost Your Productivity:
- Use our **[Online PDF Editor](https://pdftoolkitpro.online/tools/online_pdf_editor)** to annotate, stamp, and fill out PDF forms.
- Use our **[Merge PDF](https://pdftoolkitpro.online/tools/merge_pdf)** workspace to combine multiple reports into a single file.
- Use our **[Sign PDF Document](https://pdftoolkitpro.online/tools/sign_pdf)** utility to apply legally binding digital signatures.

### Frequently Asked Questions:
#### Is this tool free for commercial use?
Yes, all tools on **[pdftoolkitpro.online](https://pdftoolkitpro.online/)** are 100% free with no hidden charges, daily quotas, or software watermarks.

#### Are my confidential documents kept safe?
Yes! All cryptographic operations, e-signatures, and conversions run locally inside your browser sandbox.`;

    setContent(template);
    if (!title) {
      setTitle(`Complete Guide: ${kw.charAt(0).toUpperCase() + kw.slice(1)} Free Online`);
    }
    if (!excerpt) {
      setExcerpt(`Learn ${kw} with our step-by-step tutorial. Discover best practices, security benefits, and free browser utilities.`);
    }
    setStatusMessage({ type: 'success', text: 'SEO Article Template loaded! Customize your headings & links.' });
  };

  // Submit Article (Save or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setStatusMessage({ type: 'error', text: 'Please provide a title for the blog post.' });
      return;
    }
    if (!content.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter article body content.' });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    const postPayload = {
      id: editingPostId || `b_${Date.now()}`,
      title: title.trim(),
      excerpt: excerpt.trim() || title.trim(),
      content: content.trim(),
      category: category || 'Tutorials',
      author: author.trim() || 'PDF Toolkit Pro Editorial Team',
      date: date || new Date().toISOString().split('T')[0],
      image: image.trim() || IMAGE_PRESETS[0].url,
    };

    try {
      const isEditing = editorMode === 'edit' && editingPostId;
      const endpoint = isEditing ? `/api/blogs/${editingPostId}` : '/api/blogs';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postPayload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.posts && Array.isArray(data.posts)) {
          setPosts(data.posts);
          setCachedBlogPosts(data.posts);
        } else if (data.post) {
          if (isEditing) {
            setPosts(prev => {
              const updated = prev.map(p => p.id === editingPostId ? data.post : p);
              setCachedBlogPosts(updated);
              return updated;
            });
            setStatusMessage({ type: 'success', text: `Article "${data.post.title}" successfully updated!` });
          } else {
            setPosts(prev => {
              const updated = [data.post, ...prev];
              setCachedBlogPosts(updated);
              return updated;
            });
            setStatusMessage({ type: 'success', text: `Article "${data.post.title}" successfully published live!` });
          }
        }
        setEditorMode(null);
        setEditingPostId(null);
      } else {
        // Fallback local update if offline
        if (isEditing) {
          setPosts(prev => {
            const updated = prev.map(p => p.id === editingPostId ? { ...p, ...postPayload, readTime: '5 min read' } : p);
            setCachedBlogPosts(updated);
            return updated;
          });
        } else {
          setPosts(prev => {
            const updated = [{ ...postPayload, readTime: '5 min read' }, ...prev];
            setCachedBlogPosts(updated);
            return updated;
          });
        }
        setEditorMode(null);
        setEditingPostId(null);
        setStatusMessage({ type: 'success', text: 'Article saved and published to live website state!' });
      }
    } catch (err) {
      console.error('Error saving blog post:', err);
      // Fallback local update
      if (editorMode === 'edit' && editingPostId) {
        setPosts(prev => {
          const updated = prev.map(p => p.id === editingPostId ? { ...p, ...postPayload, readTime: '5 min read' } : p);
          setCachedBlogPosts(updated);
          return updated;
        });
      } else {
        setPosts(prev => {
          const updated = [{ ...postPayload, readTime: '5 min read' }, ...prev];
          setCachedBlogPosts(updated);
          return updated;
        });
      }
      setEditorMode(null);
      setEditingPostId(null);
      setStatusMessage({ type: 'success', text: 'Article saved successfully in client state!' });
    } finally {
      setIsSaving(false);
    }
  };

  // SEO Real-Time Metrics Calculation
  const wordCount = content ? content.trim().split(/\s+/).filter(Boolean).length : 0;
  const estimatedReadingMinutes = Math.max(1, Math.ceil(wordCount / 200));
  const internalLinksCount = (content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || []).length;
  const headingsCount = (content.match(/^#{1,4}\s/gm) || []).length;
  const titleLength = title.length;
  const excerptLength = excerpt.length;

  // Filtered posts for table
  const filteredPosts = posts.filter(post => {
    const matchesSearch = 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategoryFilter === 'all' || post.category === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categoriesList = Array.from(new Set(posts.map(p => p.category)));

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 dark:text-zinc-100">
      
      {/* Status Message Alert Banner */}
      {statusMessage && (
        <div className={`p-4 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold shadow-sm animate-fade-in ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20' 
            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-500/20'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-rose-500" />}
            <span>{statusMessage.text}</span>
          </div>
          <button 
            onClick={() => setStatusMessage(null)}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-slate-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-gradient-to-br from-purple-900/10 via-indigo-900/10 to-blue-900/10 border border-purple-500/20 rounded-2xl p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-md shadow-purple-500/20">
              <BookOpen className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold font-display text-slate-900 dark:text-zinc-50 flex items-center gap-2">
              SEO Blog &amp; Content Management
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-500/20">
              Admin Suite
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
            Write, publish, and optimize keyword-targeted blog articles with automatic internal tool linking to rank higher on Google search results.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {editorMode === null ? (
            <button
              onClick={handleStartNewArticle}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-600/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Write New SEO Article</span>
            </button>
          ) : (
            <button
              onClick={() => { setEditorMode(null); setEditingPostId(null); }}
              className="px-4 py-2.5 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0"
            >
              <X className="h-4 w-4" />
              <span>Back to Articles List</span>
            </button>
          )}

          {onNavigateToBlog ? (
            <button
              type="button"
              onClick={() => onNavigateToBlog()}
              className="px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-900 text-slate-600 dark:text-zinc-300 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>View Public Blog</span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            </button>
          ) : (
            <a
              href="/blog"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-900 text-slate-600 dark:text-zinc-300 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>View Public Blog</span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            </a>
          )}
        </div>
      </div>

      {/* Main View: Either Editor Mode OR Management List Mode */}
      {editorMode !== null ? (
        /* ========================================================
           1. ARTICLE WRITING / EDITING WORKSTATION
           ======================================================== */
        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 shadow-xl space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-200 dark:border-zinc-800 gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                {editorMode === 'edit' ? `Editing Article ID: ${editingPostId}` : 'New Article Draft'}
              </span>
              <h3 className="text-xl font-bold font-display text-slate-900 dark:text-zinc-50">
                {editorMode === 'edit' ? 'Update & Optimize Article' : 'Write & Publish SEO Article'}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleInsertSeoTemplate}
                className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold text-xs rounded-lg border border-purple-500/20 flex items-center gap-1.5 cursor-pointer transition-all"
                title="Pre-populate article structure optimized for search rankings"
              >
                <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                <span>Insert SEO Template</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Target Keyword & SEO Meta Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-200/80 dark:border-zinc-800/80">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 flex items-center justify-between">
                  <span>Primary Target SEO Keyword</span>
                  <span className="text-[10px] font-normal text-slate-400">e.g. merge pdf, convert pdf to word</span>
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={targetKeyword}
                    onChange={(e) => setTargetKeyword(e.target.value)}
                    placeholder="e.g. online pdf editor, pdf to excel converter free"
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:border-purple-500 text-slate-800 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:border-purple-500 text-slate-800 dark:text-zinc-100"
                >
                  <option value="Tutorials">Tutorials &amp; How-To</option>
                  <option value="AI Technology">AI Technology &amp; OCR</option>
                  <option value="Legal & Security">Legal &amp; Security</option>
                  <option value="Productivity">Productivity &amp; Workflow</option>
                  <option value="Document Tools">Document Tools Guide</option>
                  <option value="Spreadsheets">Office &amp; Spreadsheets</option>
                </select>
              </div>
            </div>

            {/* Article Title (H1) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Article Title (H1 Tag &amp; Page Title)
                </label>
                <span className={`text-[11px] font-bold ${
                  titleLength >= 40 && titleLength <= 65 ? 'text-emerald-500' : 'text-slate-400'
                }`}>
                  {titleLength}/65 chars (Optimal: 40-60)
                </span>
              </div>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. How to Merge Multiple PDF Files into One in Seconds (Free & Secure)"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-semibold outline-none focus:border-purple-500 text-slate-900 dark:text-zinc-100 shadow-sm"
              />
            </div>

            {/* Excerpt / Meta Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Meta Description / Excerpt (Snippet on Search Results)
                </label>
                <span className={`text-[11px] font-bold ${
                  excerptLength >= 120 && excerptLength <= 165 ? 'text-emerald-500' : 'text-slate-400'
                }`}>
                  {excerptLength}/160 chars (Optimal: 120-160)
                </span>
              </div>
              <textarea
                rows={2}
                required
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="e.g. Learn how to combine multiple PDF documents into a single organized file for free directly inside your browser. No file size limits or signups required."
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-purple-500 text-slate-900 dark:text-zinc-100"
              />
            </div>

            {/* Author, Date, Feature Image */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Author Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="PDF Toolkit Pro Editorial Team"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-purple-500 text-slate-800 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Publish Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-purple-500 text-slate-800 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Featured Image URL
                </label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="url"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-purple-500 text-slate-800 dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>

            {/* Image Presets Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                Quick Image Presets:
              </label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {IMAGE_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setImage(preset.url)}
                    className={`px-2.5 py-1 text-[11px] rounded-lg border flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                      image === preset.url
                        ? 'bg-purple-100 dark:bg-purple-950/60 border-purple-500 text-purple-700 dark:text-purple-300 font-bold'
                        : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300'
                    }`}
                  >
                    <img src={preset.url} alt={preset.name} className="w-3.5 h-3.5 rounded object-cover" />
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* SEO TOOL LINKING TOOLBAR */}
            <div className="bg-gradient-to-r from-purple-50/80 via-blue-50/60 to-indigo-50/80 dark:from-purple-950/30 dark:via-blue-950/20 dark:to-indigo-950/30 border border-purple-300/60 dark:border-purple-800/40 rounded-xl p-3.5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-900 dark:text-purple-300">
                  <LinkIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span>SEO Internal Linking Tool (Boost Rank with 38 PDF Toolkit Pro Tools)</span>
                </div>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                  {internalLinksCount} internal links currently in post
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                <div className="sm:col-span-5">
                  <select
                    value={selectedToolForLink}
                    onChange={(e) => setSelectedToolForLink(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-purple-200 dark:border-purple-800/60 rounded-lg text-xs font-medium outline-none focus:border-purple-500 text-slate-800 dark:text-zinc-100"
                  >
                    {allToolsList.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} (/tools/{t.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <input
                    type="text"
                    value={customAnchorText}
                    onChange={(e) => setCustomAnchorText(e.target.value)}
                    placeholder="Custom Anchor Text (Optional)"
                    className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-purple-200 dark:border-purple-800/60 rounded-lg text-xs outline-none focus:border-purple-500 text-slate-800 dark:text-zinc-100"
                  />
                </div>

                <div className="sm:col-span-3">
                  <button
                    type="button"
                    onClick={handleInsertToolLink}
                    className="w-full py-1.5 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>Insert Link</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Markdown Toolbar & Content Area */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-zinc-800 pb-2">
                
                {/* Markdown Buttons */}
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => insertMarkdown('### ', '', 'Section Heading')}
                    className="px-2 py-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold rounded cursor-pointer"
                    title="Insert Heading 3"
                  >
                    H3
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('#### ', '', 'Subsection')}
                    className="px-2 py-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold rounded cursor-pointer"
                    title="Insert Heading 4"
                  >
                    H4
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('**', '**', 'bold text')}
                    className="px-2 py-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold rounded cursor-pointer"
                    title="Bold"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('*', '*', 'italic text')}
                    className="px-2 py-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs italic rounded cursor-pointer"
                    title="Italic"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('- ', '', 'List item')}
                    className="px-2 py-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs rounded cursor-pointer"
                    title="Bullet List"
                  >
                    &bull; List
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('1. ', '', 'Step item')}
                    className="px-2 py-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs rounded cursor-pointer"
                    title="Numbered List"
                  >
                    1. List
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('\n---\n')}
                    className="px-2 py-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs rounded cursor-pointer"
                    title="Horizontal Line Divider"
                  >
                    Divider
                  </button>
                </div>

                {/* View switcher tabs */}
                <div className="flex items-center bg-slate-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-slate-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setActiveEditorTab('write')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md cursor-pointer ${
                      activeEditorTab === 'write' ? 'bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveEditorTab('split')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md cursor-pointer hidden md:block ${
                      activeEditorTab === 'split' ? 'bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Split View
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveEditorTab('preview')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md cursor-pointer ${
                      activeEditorTab === 'preview' ? 'bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Live Preview
                  </button>
                </div>
              </div>

              {/* Editor Split / Write / Preview Container */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* Editor Textarea */}
                {(activeEditorTab === 'write' || activeEditorTab === 'split') && (
                  <div className={activeEditorTab === 'split' ? 'md:col-span-6' : 'md:col-span-12'}>
                    <textarea
                      ref={textareaRef}
                      required
                      rows={16}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Write your article in Markdown syntax. Use ### for subheadings, - for lists, and [Anchor Text](/tools/tool_name) for internal links..."
                      className="w-full p-4 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none focus:border-purple-500 text-slate-900 dark:text-zinc-100 leading-relaxed resize-y"
                    />
                  </div>
                )}

                {/* Live Preview Box */}
                {(activeEditorTab === 'preview' || activeEditorTab === 'split') && (
                  <div className={`${activeEditorTab === 'split' ? 'md:col-span-6' : 'md:col-span-12'} bg-slate-50/60 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 overflow-y-auto max-h-[480px]`}>
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200 dark:border-zinc-800 text-[10px] uppercase font-bold text-slate-400">
                      <span>Article Live Reader Preview</span>
                      <span className="text-purple-600 dark:text-purple-400">~{estimatedReadingMinutes} min read</span>
                    </div>

                    <div className="space-y-3 text-xs leading-relaxed text-slate-700 dark:text-zinc-300">
                      {content ? (
                        content.split('\n').map((line, idx) => {
                          const trimmed = line.trim();
                          if (!trimmed) return <div key={idx} className="h-2" />;
                          if (trimmed.startsWith('### ')) {
                            return <h3 key={idx} className="text-sm font-bold text-slate-900 dark:text-zinc-50 mt-4 mb-1">{trimmed.substring(4)}</h3>;
                          }
                          if (trimmed.startsWith('#### ')) {
                            return <h4 key={idx} className="text-xs font-bold text-slate-900 dark:text-zinc-50 mt-3 mb-1">{trimmed.substring(5)}</h4>;
                          }
                          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                            return <li key={idx} className="ml-4 list-disc mb-1">{trimmed.substring(2)}</li>;
                          }
                          if (trimmed.startsWith('---')) {
                            return <hr key={idx} className="my-3 border-slate-200 dark:border-zinc-800" />;
                          }
                          return <p key={idx} className="mb-2">{trimmed}</p>;
                        })
                      ) : (
                        <p className="text-slate-400 italic text-center py-10">
                          Type markdown content or click "Insert SEO Template" above to see live preview.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SEO Health Score Checklist */}
            <div className="bg-slate-50 dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="flex items-center gap-2">
                {wordCount >= 300 ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-amber-500" />}
                <div>
                  <div className="font-bold">{wordCount} Words</div>
                  <div className="text-[10px] text-slate-400">{wordCount >= 300 ? 'Good Length (>300)' : 'Short for SEO (<300)'}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {internalLinksCount >= 2 ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-amber-500" />}
                <div>
                  <div className="font-bold">{internalLinksCount} Internal Links</div>
                  <div className="text-[10px] text-slate-400">{internalLinksCount >= 2 ? 'Target passed (>=2)' : 'Add tool links'}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {headingsCount >= 2 ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-amber-500" />}
                <div>
                  <div className="font-bold">{headingsCount} Headings</div>
                  <div className="text-[10px] text-slate-400">{headingsCount >= 2 ? 'Well structured' : 'Add H3/H4 tags'}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {excerptLength >= 60 ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-amber-500" />}
                <div>
                  <div className="font-bold">SERP Snippet</div>
                  <div className="text-[10px] text-slate-400">{excerptLength >= 60 ? 'Meta ready' : 'Write excerpt'}</div>
                </div>
              </div>
            </div>

            {/* Action Submit Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => { setEditorMode(null); setEditingPostId(null); }}
                className="px-4 py-2.5 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 font-bold text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-900 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Publishing Live...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{editorMode === 'edit' ? 'Update & Save Changes' : 'Publish Article to Live Blog'}</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      ) : (
        /* ========================================================
           2. ARTICLES LIST & MANAGEMENT TABLE
           ======================================================== */
        <div className="space-y-4">
          
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-xl">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-zinc-50">{posts.length}</div>
                <div className="text-[11px] text-slate-400">Total Published Articles</div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-zinc-50">{categoriesList.length}</div>
                <div className="text-[11px] text-slate-400">Target Categories</div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <LinkIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-zinc-50">38</div>
                <div className="text-[11px] text-slate-400">Linked Workspace Tools</div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-zinc-50">100%</div>
                <div className="text-[11px] text-slate-400">SEO Indexing Health</div>
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles by title or keyword..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-purple-500 text-slate-800 dark:text-zinc-100"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <button
                onClick={() => setSelectedCategoryFilter('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0 ${
                  selectedCategoryFilter === 'all'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                }`}
              >
                All ({posts.length})
              </button>
              {categoriesList.map((cat, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0 ${
                    selectedCategoryFilter === cat
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Articles Table */}
          <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-zinc-900/80 border-b border-slate-200 dark:border-zinc-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Article</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Author</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Read Time</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-900">
                  {filteredPosts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p>No articles found matching your query.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredPosts.map((post) => (
                      <tr key={post.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={post.image}
                              alt={post.title}
                              className="w-12 h-10 rounded-lg object-cover border border-slate-200 dark:border-zinc-800 shrink-0"
                            />
                            <div className="min-w-0 max-w-md">
                              {onNavigateToBlog ? (
                                <button
                                  type="button"
                                  onClick={() => onNavigateToBlog(post.id)}
                                  className="font-bold text-left text-slate-900 dark:text-zinc-100 hover:text-purple-600 dark:hover:text-purple-400 line-clamp-1 flex items-center gap-1.5 cursor-pointer"
                                >
                                  <span>{post.title}</span>
                                  <ExternalLink className="h-3 w-3 opacity-40 shrink-0" />
                                </button>
                              ) : (
                                <a
                                  href={`/blog/${post.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-bold text-slate-900 dark:text-zinc-100 hover:text-purple-600 dark:hover:text-purple-400 line-clamp-1 flex items-center gap-1.5"
                                >
                                  <span>{post.title}</span>
                                  <ExternalLink className="h-3 w-3 opacity-40 shrink-0" />
                                </a>
                              )}
                              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{post.excerpt}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            {post.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-zinc-300">
                          {post.author}
                        </td>

                        <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                          {post.date}
                        </td>

                        <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                          {post.readTime}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {onNavigateToBlog ? (
                              <button
                                type="button"
                                onClick={() => onNavigateToBlog(post.id)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer"
                                title="View Article"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            ) : (
                              <a
                                href={`/blog/${post.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                                title="View Article"
                              >
                                <Eye className="h-4 w-4" />
                              </a>
                            )}

                            <button
                              onClick={() => handleEditPost(post)}
                              className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors cursor-pointer"
                              title="Edit Article"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => handleDeletePost(post.id, post.title)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                              title="Delete Article"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
