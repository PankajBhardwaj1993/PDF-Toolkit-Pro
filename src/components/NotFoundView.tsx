import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, FileText, ImageIcon, Sparkles, Sliders, FileSignature, Compass, Home } from 'lucide-react';
import { Tool } from '../types';
import SEO from './SEO';

interface NotFoundViewProps {
  allToolsList: Tool[];
}

export default function NotFoundView({ allToolsList }: NotFoundViewProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Find popular or featured tools to suggest
  const suggestedTools = allToolsList.filter(t => t.popular).slice(0, 4);

  // Filter tools based on search query
  const filteredTools = searchQuery.trim()
    ? allToolsList.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'pdf': return <FileText className="h-4 w-4 text-rose-500" />;
      case 'image': return <ImageIcon className="h-4 w-4 text-emerald-500" />;
      case 'ai': return <Sparkles className="h-4 w-4 text-indigo-500" />;
      case 'signature': return <FileSignature className="h-4 w-4 text-blue-500" />;
      default: return <Sliders className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 bg-slate-50 dark:bg-zinc-950">
      <SEO 
        title="404 Page Not Found | PDF Toolkit Pro" 
        description="The page you are looking for does not exist on PDF Toolkit Pro. Search our free browser-native PDF, Image, and AI tools."
        canonical="/404"
      />
      
      <div className="max-w-2xl w-full text-center space-y-8 animate-fade-in">
        {/* Error Code display */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 text-xs font-bold tracking-wider uppercase">
            <Compass className="h-3.5 w-3.5 animate-spin-slow" />
            <span>Error 404</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-black text-slate-900 dark:text-zinc-50 tracking-tight leading-none">
            Page Not Found
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
            The document, workspace, or link you are trying to access doesn&apos;t exist or has been relocated.
          </p>
        </div>

        {/* Search bar helper */}
        <div className="max-w-md mx-auto relative bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
          <div className="flex items-center gap-2 px-2">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search 40+ free document tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-800 dark:text-zinc-200 outline-none border-none py-1.5"
            />
          </div>

          {/* Search results dropdown */}
          {searchQuery && (
            <div className="absolute left-0 right-0 mt-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden z-20 text-left divide-y divide-slate-100 dark:divide-zinc-900">
              {filteredTools.length > 0 ? (
                <>
                  <div className="px-3 py-1.5 bg-slate-50 dark:bg-zinc-900/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Tools Found ({filteredTools.length})
                  </div>
                  {filteredTools.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => navigate(`/tools/${tool.id}`)}
                      className="w-full px-4 py-3 hover:bg-slate-50 dark:hover:bg-zinc-900/60 flex items-center justify-between transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-slate-100 dark:bg-zinc-900 rounded-lg">
                          {getCategoryIcon(tool.category)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-zinc-100">{tool.name}</p>
                          <p className="text-[10px] text-slate-400 line-clamp-1">{tool.description}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                  ))}
                </>
              ) : (
                <div className="p-4 text-center text-xs text-slate-400">
                  No tools found matching &quot;{searchQuery}&quot;
                </div>
              )}
            </div>
          )}
        </div>

        {/* Suggestion & Popular tools */}
        <div className="space-y-3 max-w-lg mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Or Jump Directly Into Popular Workspaces
          </p>
          <div className="grid grid-cols-2 gap-3">
            {suggestedTools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => navigate(`/tools/${tool.id}`)}
                className="p-3.5 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-xl text-left transition-all hover:scale-[1.01] hover:shadow-md flex flex-col justify-between h-24 cursor-pointer group"
              >
                <div className="p-1.5 bg-slate-50 dark:bg-zinc-950 rounded-lg w-fit">
                  {getCategoryIcon(tool.category)}
                </div>
                <div className="flex items-center justify-between w-full mt-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-blue-500 transition-colors">
                    {tool.name}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-500 transform group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Home actions */}
        <div className="flex justify-center gap-4 pt-4 border-t border-slate-200/60 dark:border-zinc-900/60 max-w-sm mx-auto">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer transition-all"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Go Back Home</span>
          </button>
          <button
            onClick={() => navigate('/docs')}
            className="px-4 py-2 bg-slate-200/60 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-bold rounded-xl cursor-pointer transition-all"
          >
            View Help Docs
          </button>
        </div>
      </div>
    </div>
  );
}
