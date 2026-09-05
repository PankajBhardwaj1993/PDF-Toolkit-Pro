import SEO from './SEO';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, Calendar, User, Clock, Trash2, PlusCircle, ArrowLeft, 
  Loader2, Image as ImageIcon, Edit3, Sparkles, ShieldCheck, PenTool, ExternalLink 
} from 'lucide-react';
import { BlogPost, User as UserType } from '../types';
import { initialBlogPosts, getCachedBlogPosts, setCachedBlogPosts } from '../data/blogData';

interface BlogViewProps {
  user: UserType | null;
  postId?: string;
}

// Custom compiler to render Markdown syntax including interactive, crawler-friendly internal links
function parseContentToReact(text: string, navigate: (path: string) => void) {
  if (!text) return null;
  
  // Split into lines/blocks
  const rawLines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      elements.push(<div key={`empty-${i}`} className="h-3" />);
      i++;
      continue;
    }

    // Check for Markdown Tables (starts with |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith('|') && rawLines[i].trim().endsWith('|')) {
        tableLines.push(rawLines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerCells = tableLines[0].split('|').slice(1, -1).map(c => c.trim());
        const isSeparator = /^\|?[\s:-|]+\|?$/.test(tableLines[1]);
        const dataRows = tableLines.slice(isSeparator ? 2 : 1).map(row => 
          row.split('|').slice(1, -1).map(c => c.trim())
        );

        elements.push(
          <div key={`table-${i}`} className="my-6 overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-100 dark:bg-zinc-800/80 text-slate-800 dark:text-zinc-200 font-bold">
                <tr>
                  {headerCells.map((h, hIdx) => (
                    <th key={hIdx} className="p-3 border-b border-slate-200 dark:border-zinc-700">
                      {parseInline(h, navigate)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900/50">
                {dataRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-3 text-slate-600 dark:text-zinc-300">
                        {parseInline(cell, navigate)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // Check for Horizontal Rules (--- or ***)
    if (trimmed === '---' || trimmed === '***') {
      elements.push(<hr key={`hr-${i}`} className="my-8 border-slate-200 dark:border-zinc-800" />);
      i++;
      continue;
    }
    
    // Check for Headings
    if (trimmed.startsWith('#### ')) {
      elements.push(
        <h4 key={`h4-${i}`} className="text-base font-extrabold text-slate-900 dark:text-zinc-50 mt-6 mb-2">
          {parseInline(trimmed.substring(5), navigate)}
        </h4>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-lg font-bold text-slate-900 dark:text-zinc-50 mt-7 mb-3">
          {parseInline(trimmed.substring(4), navigate)}
        </h3>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-xl font-extrabold text-slate-900 dark:text-zinc-50 mt-9 mb-4 border-b border-slate-100 dark:border-zinc-800 pb-2">
          {parseInline(trimmed.substring(3), navigate)}
        </h2>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${i}`} className="text-2xl font-black text-slate-900 dark:text-zinc-50 mt-10 mb-6">
          {parseInline(trimmed.substring(2), navigate)}
        </h1>
      );
      i++;
      continue;
    }
    
    // Check for List Items
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <li key={`li-${i}`} className="ml-6 list-disc text-slate-600 dark:text-zinc-300 mb-2 leading-relaxed">
          {parseInline(trimmed.substring(2), navigate)}
        </li>
      );
      i++;
      continue;
    }
    
    // Check for numbered list (e.g. "1. ")
    const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
    if (numMatch) {
      elements.push(
        <li key={`num-${i}`} className="ml-6 list-decimal text-slate-600 dark:text-zinc-300 mb-2 leading-relaxed">
          {parseInline(numMatch[2], navigate)}
        </li>
      );
      i++;
      continue;
    }
    
    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="text-slate-600 dark:text-zinc-300 leading-relaxed mb-4">
        {parseInline(trimmed, navigate)}
      </p>
    );
    i++;
  }

  return elements;
}

function parseInline(text: string, navigate: (path: string) => void): React.ReactNode[] {
  if (!text) return [];

  // Helper to create SEO & crawler-friendly do-follow links
  const createLinkElement = (key: string | number, href: string, label: React.ReactNode) => {
    const isPdftoolkitDomain = /^https?:\/\/(www\.)?pdftoolkitpro\.online/i.test(href);
    const isInternalPath = href.startsWith('/');
    const isSiteLink = isInternalPath || isPdftoolkitDomain;
    const localRoute = isPdftoolkitDomain 
      ? href.replace(/^https?:\/\/(www\.)?pdftoolkitpro\.online/i, '') || '/'
      : href;

    return (
      <a
        key={key}
        href={href}
        onClick={(e) => {
          if (isSiteLink) {
            e.preventDefault();
            navigate(localRoute);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        target={isSiteLink ? '_self' : '_blank'}
        rel={isSiteLink ? undefined : 'noopener noreferrer'}
        className="text-blue-600 dark:text-blue-400 hover:underline font-bold inline-flex items-center gap-0.5 cursor-pointer"
      >
        {label}
      </a>
    );
  };

  const parts: React.ReactNode[] = [];
  let currentIndex = 0;

  while (currentIndex < text.length) {
    const linkIndex = text.indexOf('[', currentIndex);
    const boldIndex = text.indexOf('**', currentIndex);
    
    // Search for raw URLs starting with http:// or https://
    const remainingText = text.substring(currentIndex);
    const rawUrlMatch = remainingText.match(/https?:\/\/[^\s\)\],<]+/);
    const rawUrlIndex = rawUrlMatch && rawUrlMatch.index !== undefined ? currentIndex + rawUrlMatch.index : -1;

    // Determine which token comes next
    const candidates: { type: 'link' | 'bold' | 'rawUrl'; index: number }[] = [];
    if (linkIndex !== -1) candidates.push({ type: 'link', index: linkIndex });
    if (boldIndex !== -1) candidates.push({ type: 'bold', index: boldIndex });
    if (rawUrlIndex !== -1) candidates.push({ type: 'rawUrl', index: rawUrlIndex });

    if (candidates.length === 0) {
      parts.push(text.substring(currentIndex));
      break;
    }

    candidates.sort((a, b) => a.index - b.index);
    const first = candidates[0];

    // Push text before the token
    if (first.index > currentIndex) {
      parts.push(text.substring(currentIndex, first.index));
      currentIndex = first.index;
    }

    if (first.type === 'bold') {
      const boldEndIndex = text.indexOf('**', currentIndex + 2);
      if (boldEndIndex !== -1) {
        const innerBoldText = text.substring(currentIndex + 2, boldEndIndex);
        parts.push(
          <strong key={`b-${currentIndex}`} className="font-extrabold text-slate-900 dark:text-zinc-50">
            {parseInline(innerBoldText, navigate)}
          </strong>
        );
        currentIndex = boldEndIndex + 2;
      } else {
        parts.push('**');
        currentIndex += 2;
      }
    } else if (first.type === 'link') {
      const linkTextEnd = text.indexOf(']', currentIndex);
      const urlStart = text.indexOf('(', linkTextEnd);
      const urlEnd = text.indexOf(')', urlStart);

      if (linkTextEnd !== -1 && urlStart === linkTextEnd + 1 && urlEnd !== -1) {
        const linkText = text.substring(currentIndex + 1, linkTextEnd);
        const url = text.substring(urlStart + 1, urlEnd);
        parts.push(createLinkElement(`l-${currentIndex}`, url, parseInline(linkText, navigate)));
        currentIndex = urlEnd + 1;
      } else {
        parts.push('[');
        currentIndex += 1;
      }
    } else if (first.type === 'rawUrl' && rawUrlMatch) {
      const rawUrl = rawUrlMatch[0];
      parts.push(createLinkElement(`u-${currentIndex}`, rawUrl, rawUrl));
      currentIndex += rawUrl.length;
    }
  }

  return parts;
}

export default function BlogView({ user, postId }: BlogViewProps) {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>(() => {
    const cached = getCachedBlogPosts();
    if (cached !== null) return cached;
    return [];
  });
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(() => {
    const cached = getCachedBlogPosts();
    if (postId && cached) {
      return cached.find(p => p.id === postId) || null;
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(() => {
    return getCachedBlogPosts() === null;
  });
  
  // Create/Edit post states
  const [isAdding, setIsAdding] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Tutorials');
  const [image, setImage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchBlogs = async () => {
    try {
      const res = await fetch('/api/blogs');
      if (res.ok) {
        const data = await res.json();
        if (data.posts && Array.isArray(data.posts)) {
          setPosts(data.posts);
          setCachedBlogPosts(data.posts);
          
          // If a postId is supplied in the URL, automatically select that post
          if (postId) {
            const found = data.posts.find((p: BlogPost) => p.id === postId);
            if (found) {
              setSelectedPost(found);
            } else {
              setSelectedPost(null);
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  // Sync selectedPost when postId prop changes
  useEffect(() => {
    if (postId) {
      const found = posts.find(p => p.id === postId);
      if (found) {
        setSelectedPost(found);
      } else {
        setSelectedPost(null);
      }
    } else {
      setSelectedPost(null);
    }
  }, [postId, posts]);

  const handleStartCreate = () => {
    setEditingPostId(null);
    setTitle('');
    setExcerpt('');
    setContent('');
    setCategory('Tutorials');
    setImage('https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&auto=format&fit=crop&q=80');
    setIsAdding(true);
  };

  const handleStartEdit = (post: BlogPost, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingPostId(post.id);
    setTitle(post.title);
    setExcerpt(post.excerpt);
    setContent(post.content);
    setCategory(post.category);
    setImage(post.image);
    setIsAdding(true);
  };

  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || !excerpt) return;

    setIsSaving(true);
    try {
      const isEditing = Boolean(editingPostId);
      const endpoint = isEditing ? `/api/blogs/${editingPostId}` : '/api/blogs';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          excerpt,
          content,
          category,
          author: user?.username || 'Admin / SEO Team',
          image: image || 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&auto=format&fit=crop&q=80',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.posts && Array.isArray(data.posts)) {
          setPosts(data.posts);
          setCachedBlogPosts(data.posts);
        } else {
          fetchBlogs();
        }
        setTitle('');
        setExcerpt('');
        setContent('');
        setImage('');
        setIsAdding(false);
        setEditingPostId(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePost = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this article?')) return;

    // Optimistically update posts state and cache immediately
    const updated = posts.filter(p => p.id !== id);
    setPosts(updated);
    setCachedBlogPosts(updated);
    if (selectedPost?.id === id) {
      setSelectedPost(null);
    }

    try {
      const res = await fetch(`/api/blogs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        if (data.posts && Array.isArray(data.posts)) {
          setPosts(data.posts);
          setCachedBlogPosts(data.posts);
        }
      } else {
        fetchBlogs();
      }
    } catch (err) {
      console.error(err);
      fetchBlogs();
    }
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 xl:px-12 w-full max-w-[1850px] mx-auto">
      
      {selectedPost ? (
        <SEO 
          title={`${selectedPost.title} | PDF Toolkit Pro`} 
          description={selectedPost.content.substring(0, 150) + '...'} 
          canonical={`https://pdftoolkitpro.online/blog/${selectedPost.id}`} 
          schema={{
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": selectedPost.title,
            "datePublished": selectedPost.date,
            "author": {
              "@type": "Person",
              "name": selectedPost.author
            }
          }}
        />
      ) : (
        <SEO 
          title="PDF Tips, Guides & Tutorials | PDF Toolkit Pro" 
          description="Read expert guides, tutorials, and practical tips on editing, converting, securing, compressing, and managing PDF documents online." 
          canonical="https://pdftoolkitpro.online/blog" 
          keywords={['PDF tips and guides', 'PDF tutorials', 'PDF guides', 'PDF how-to']}
        />
      )}

      {selectedPost ? (
        /* Detailed Reader View */
        <article className="max-w-3xl mx-auto bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-10 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => { setSelectedPost(null); navigate('/blog'); }}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Blog
            </button>

            {user?.role === 'admin' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleStartEdit(selectedPost)}
                  className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 font-bold text-xs rounded-xl border border-purple-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit Post</span>
                </button>
                <button
                  onClick={(e) => handleDeletePost(selectedPost.id, e)}
                  className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 font-bold text-xs rounded-xl border border-rose-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Post</span>
                </button>
              </div>
            )}
          </div>
          
          <img
            src={selectedPost.image}
            alt={selectedPost.title}
            className="w-full h-80 object-cover rounded-2xl mb-8 shadow-md"
          />

          <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-zinc-500 mb-4">
            <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
              {selectedPost.category}
            </span>
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>{new Date(selectedPost.date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{selectedPost.readTime}</span>
            </div>
          </div>

          <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-zinc-50 sm:text-4xl mb-6">
            {selectedPost.title}
          </h1>

          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-900 pb-6 mb-8">
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white text-xs">
              {selectedPost.author.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">{selectedPost.author}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Editorial Staff</p>
            </div>
          </div>

          <div className="prose dark:prose-invert prose-blue max-w-none text-slate-600 dark:text-zinc-300 leading-relaxed">
            {parseContentToReact(selectedPost.content, navigate)}
          </div>
        </article>
      ) : isAdding ? (
        /* Create/Edit Post Form (Admin) */
        <div className="max-w-2xl mx-auto bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-8 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Admin Post Editor
              </span>
              <h2 className="text-2xl font-bold font-display text-slate-900 dark:text-zinc-100">
                {editingPostId ? 'Edit Blog Article' : 'Create New Article'}
              </h2>
            </div>
            <button
              onClick={() => { setIsAdding(false); setEditingPostId(null); }}
              className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSavePost} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Title</label>
              <input
                type="text"
                required
                placeholder="How to Sign Documents Securely"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 rounded-xl outline-none focus:border-blue-500 dark:text-zinc-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 rounded-xl outline-none focus:border-blue-500 dark:text-zinc-100"
                >
                  <option value="Tutorials">Tutorials</option>
                  <option value="AI Technology">AI Technology</option>
                  <option value="Legal & Security">Legal & Security</option>
                  <option value="Productivity">Productivity</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Feature Image URL</label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 rounded-xl outline-none focus:border-blue-500 dark:text-zinc-100 text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Short Excerpt (Meta Description)</label>
              <input
                type="text"
                required
                placeholder="A brief summary showing up on listings..."
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 rounded-xl outline-none focus:border-blue-500 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Body Content (Markdown/Text)</label>
              <textarea
                required
                rows={8}
                placeholder="Write your article content here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 rounded-xl outline-none focus:border-blue-500 dark:text-zinc-100 text-sm font-sans"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium py-3 rounded-xl cursor-pointer shadow-md transition-all"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Article...
                </>
              ) : (
                editingPostId ? 'Update & Save Article' : 'Publish Article Live'
              )}
            </button>
          </form>
        </div>
      ) : (
        /* Blog Listings Grid */
        <div className="w-full space-y-8">
          
          {/* Top Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="font-display text-4xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50 mb-2">
                PDF Tips, Guides &amp; Tutorials
              </h1>
              <p className="text-slate-500 dark:text-zinc-400">
                Guides, tutorials, and deep-dives from our industry experts on document optimization.
              </p>
            </div>
            
            {user?.role === 'admin' && (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => navigate('/admin')}
                  className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-bold text-xs px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors"
                  title="Open Admin SEO Workstation"
                >
                  <PenTool className="h-3.5 w-3.5 text-purple-500" />
                  <span>SEO Workstation</span>
                </button>

                <button
                  onClick={handleStartCreate}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-md shadow-purple-500/20 transition-all"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Write Article</span>
                </button>
              </div>
            )}
          </div>

          {/* Admin Bar if logged in as Admin */}
          {user?.role === 'admin' && (
            <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-purple-900 dark:text-purple-300 font-semibold">
                <ShieldCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span>Admin SEO Mode Active: You can create, edit, or delete articles to boost website organic search traffic.</span>
              </div>
              <button
                onClick={() => navigate('/admin')}
                className="text-purple-700 dark:text-purple-300 font-bold underline flex items-center gap-1 cursor-pointer shrink-0"
              >
                <span>Launch Full SEO Suite</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-900">
              <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No blog posts available. Log in as Admin to post!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => { setSelectedPost(post); navigate(`/blog/${post.id}`); }}
                  className="group bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col"
                >
                  <div className="relative overflow-hidden h-48">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-3 left-3 bg-blue-600 text-white text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full shadow">
                      {post.category}
                    </span>
                  </div>

                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-zinc-500 mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(post.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{post.readTime}</span>
                      </div>
                    </div>

                    <h3 className="font-display font-bold text-lg text-slate-900 dark:text-zinc-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-snug mb-2 line-clamp-2">
                      {post.title}
                    </h3>

                    <p className="text-sm text-slate-500 dark:text-zinc-400 line-clamp-3 mb-4 leading-relaxed">
                      {post.excerpt}
                    </p>

                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-zinc-900 pt-4 mt-auto">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-blue-500 text-white font-bold text-[10px] flex items-center justify-center">
                          {post.author.charAt(0)}
                        </div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">{post.author}</span>
                      </div>

                      {user?.role === 'admin' && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleStartEdit(post, e)}
                            className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/25 cursor-pointer transition-colors"
                            title="Edit Post"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeletePost(post.id, e)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/25 cursor-pointer transition-colors"
                            title="Delete Post"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
