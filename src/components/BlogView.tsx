import SEO from './SEO';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, User, Clock, Trash2, PlusCircle, ArrowLeft, Loader2, Image as ImageIcon } from 'lucide-react';
import { BlogPost, User as UserType } from '../types';

interface BlogViewProps {
  user: UserType | null;
  postId?: string;
}

// Custom compiler to render Markdown syntax including interactive, crawler-friendly internal links
function parseContentToReact(text: string, navigate: (path: string) => void) {
  if (!text) return null;
  
  // Split into lines/blocks
  const blocks = text.split('\n');
  
  return blocks.map((block, idx) => {
    const trimmed = block.trim();
    if (!trimmed) return <div key={idx} className="h-4" />;
    
    // Check for Headings
    if (trimmed.startsWith('#### ')) {
      return (
        <h4 key={idx} className="text-base font-extrabold text-slate-900 dark:text-zinc-50 mt-5 mb-2">
          {parseInline(trimmed.substring(5), navigate)}
        </h4>
      );
    }
    if (trimmed.startsWith('### ')) {
      return (
        <h3 key={idx} className="text-lg font-bold text-slate-900 dark:text-zinc-50 mt-6 mb-3">
          {parseInline(trimmed.substring(4), navigate)}
        </h3>
      );
    }
    if (trimmed.startsWith('## ')) {
      return (
        <h2 key={idx} className="text-xl font-extrabold text-slate-900 dark:text-zinc-50 mt-8 mb-4 border-b border-slate-100 dark:border-zinc-900 pb-2">
          {parseInline(trimmed.substring(3), navigate)}
        </h2>
      );
    }
    if (trimmed.startsWith('# ')) {
      return (
        <h1 key={idx} className="text-2xl font-black text-slate-900 dark:text-zinc-50 mt-10 mb-6">
          {parseInline(trimmed.substring(2), navigate)}
        </h1>
      );
    }
    
    // Check for List Items
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return (
        <li key={idx} className="ml-6 list-disc text-slate-600 dark:text-zinc-300 mb-2">
          {parseInline(trimmed.substring(2), navigate)}
        </li>
      );
    }
    
    // Check for numbered list (e.g. "1. ")
    const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
    if (numMatch) {
      return (
        <li key={idx} className="ml-6 list-decimal text-slate-600 dark:text-zinc-300 mb-2">
          {parseInline(numMatch[2], navigate)}
        </li>
      );
    }
    
    // Regular paragraph
    return (
      <p key={idx} className="text-slate-600 dark:text-zinc-300 leading-relaxed mb-4">
        {parseInline(trimmed, navigate)}
      </p>
    );
  });
}

function parseInline(text: string, navigate: (path: string) => void): React.ReactNode[] {
  let parts: React.ReactNode[] = [];
  let currentIndex = 0;
  
  while (currentIndex < text.length) {
    const linkIndex = text.indexOf('[', currentIndex);
    const boldIndex = text.indexOf('**', currentIndex);
    
    // If no more markdown elements, push remaining text
    if (linkIndex === -1 && boldIndex === -1) {
      parts.push(text.substring(currentIndex));
      break;
    }
    
    // Process whichever comes first
    if (boldIndex !== -1 && (linkIndex === -1 || boldIndex < linkIndex)) {
      // Bold syntax
      if (boldIndex > currentIndex) {
        parts.push(text.substring(currentIndex, boldIndex));
      }
      const boldEndIndex = text.indexOf('**', boldIndex + 2);
      if (boldEndIndex !== -1) {
        parts.push(
          <strong key={`b-${boldIndex}`} className="font-extrabold text-slate-900 dark:text-zinc-50">
            {text.substring(boldIndex + 2, boldEndIndex)}
          </strong>
        );
        currentIndex = boldEndIndex + 2;
      } else {
        parts.push('**');
        currentIndex = boldIndex + 2;
      }
    } else {
      // Link syntax
      if (linkIndex > currentIndex) {
        parts.push(text.substring(currentIndex, linkIndex));
      }
      const linkTextEnd = text.indexOf(']', linkIndex);
      const urlStart = text.indexOf('(', linkTextEnd);
      const urlEnd = text.indexOf(')', urlStart);
      
      if (linkTextEnd !== -1 && urlStart === linkTextEnd + 1 && urlEnd !== -1) {
        const linkText = text.substring(linkIndex + 1, linkTextEnd);
        const url = text.substring(urlStart + 1, urlEnd);
        
        // Handle internal linking smoothly using React Router instead of full page reloads if it starts with '/'
        const isInternal = url.startsWith('/');
        
        parts.push(
          isInternal ? (
            <span
              key={`l-${linkIndex}`}
              onClick={(e) => {
                e.preventDefault();
                navigate(url);
              }}
              className="text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
            >
              {linkText}
            </span>
          ) : (
            <a
              key={`l-${linkIndex}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline font-bold"
            >
              {linkText}
            </a>
          )
        );
        currentIndex = urlEnd + 1;
      } else {
        parts.push('[');
        currentIndex = linkIndex + 1;
      }
    }
  }
  
  return parts;
}

export default function BlogView({ user, postId }: BlogViewProps) {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Create post states
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('AI Technology');
  const [image, setImage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/blogs');
      const data = await res.json();
      setPosts(data.posts);
      
      // If a postId is supplied in the URL, automatically select that post
      if (postId) {
        const found = data.posts.find((p: BlogPost) => p.id === postId);
        if (found) {
          setSelectedPost(found);
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
    if (posts.length > 0) {
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
    }
  }, [postId, posts]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || !excerpt) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          excerpt,
          content,
          category,
          author: user?.username || 'Guest Admin',
          image,
        }),
      });
      if (res.ok) {
        setTitle('');
        setExcerpt('');
        setContent('');
        setImage('');
        setIsAdding(false);
        fetchBlogs();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePost = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const res = await fetch(`/api/blogs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedPost?.id === id) {
          setSelectedPost(null);
        }
        fetchBlogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 xl:px-12 w-full max-w-[1850px] mx-auto">
      
      {selectedPost ? (
        <SEO 
          title={`${selectedPost.title} | PDF Toolkit Pro`} 
          description={selectedPost.content.substring(0, 150) + '...'} 
          canonical={`/blog/${selectedPost.id}`} 
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
        <SEO title="PDF Tips & Tricks Blog | PDF Toolkit Pro" description="Read our latest articles, tutorials, and updates about PDF management and productivity." canonical="/blog" />
      )}

      {selectedPost ? (
        /* Detailed Reader View */
        <article className="max-w-3xl mx-auto bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-10 shadow-xl">
          <button
            onClick={() => { setSelectedPost(null); navigate('/blog'); }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline mb-8 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Insights
          </button>
          
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
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Staff Writer</p>
            </div>
          </div>

          <div className="prose dark:prose-invert prose-blue max-w-none text-slate-600 dark:text-zinc-300 leading-relaxed">
            {parseContentToReact(selectedPost.content, navigate)}
          </div>
        </article>
      ) : isAdding ? (
        /* Create Post Form (Admin) */
        <div className="max-w-2xl mx-auto bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-8 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold font-display text-slate-900 dark:text-zinc-100">
              Create New Article
            </h2>
            <button
              onClick={() => setIsAdding(false)}
              className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreatePost} className="space-y-4">
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
                  <option value="AI Technology">AI Technology</option>
                  <option value="Legal & Security">Legal & Security</option>
                  <option value="Tutorials">Tutorials</option>
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
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Short Excerpt</label>
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
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Publishing Post...
                </>
              ) : (
                'Publish Article'
              )}
            </button>
          </form>
        </div>
      ) : (
        /* Blog Listings Grid */
        <div className="w-full">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12">
            <div>
              <h1 className="font-display text-4xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50 mb-2">
                PDF Toolkit Insights
              </h1>
              <p className="text-slate-500 dark:text-zinc-400">
                Guides, tutorials, and deep-dives from our industry experts on document optimization.
              </p>
            </div>
            
            {user?.role === 'admin' && (
              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl cursor-pointer shadow-md shadow-purple-500/10 transition-colors"
              >
                <PlusCircle className="h-4 w-4" />
                Add Article
              </button>
            )}
          </div>

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
                        <button
                          onClick={(e) => handleDeletePost(post.id, e)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/25 cursor-pointer transition-colors"
                          title="Delete Post"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
