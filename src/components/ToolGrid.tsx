import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, Image as ImageIcon, FileSignature, Sparkles, Sliders, Type, Star, 
  Search, ArrowRight, Zap, TrendingUp, Cpu, Compass, Briefcase, Layers, FileSpreadsheet, ArrowLeftRight
} from 'lucide-react';
import { Tool, ToolCategory } from '../types';

interface ToolGridProps {
  onSelectTool: (toolId: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  favorites: string[];
  onToggleFavorite: (toolId: string, e: React.MouseEvent) => void;
  allToolsList: Tool[];
}

export default function ToolGrid({
  onSelectTool,
  searchQuery,
  setSearchQuery,
  favorites,
  onToggleFavorite,
  allToolsList,
}: ToolGridProps) {
  const [activeCategory, setActiveCategory] = useState<ToolCategory | 'all' | 'converter'>('all');

  const categories: Array<{ id: ToolCategory | 'all' | 'converter'; name: string; icon: any }> = [
    { id: 'all', name: 'Explore All', icon: Compass },
    { id: 'pdf', name: 'PDF Document Tools', icon: FileText },
    { id: 'office', name: 'Office Tools', icon: Briefcase },
    { id: 'image', name: 'Image Processing', icon: ImageIcon },
    { id: 'ai', name: 'AI & Voice Tools', icon: Sparkles },
    { id: 'signature', name: 'Sign & Forms', icon: FileSignature },
    { id: 'utilities', name: 'Extra Utilities', icon: Sliders },
    { id: 'converter', name: 'Converter Tools', icon: ArrowLeftRight },
  ];

  const isConverterTool = (tool: Tool) => {
    return (
      (tool.id.includes('_to_') && tool.id !== 'text_to_speech') ||
      tool.id.includes('converter') ||
      tool.name.toLowerCase().includes('converter') ||
      tool.id === 'convert_image' ||
      tool.id === 'batch_processor'
    );
  };

  const filteredTools = allToolsList.filter((tool) => {
    if (tool.hidden || tool.adminOnly) return false;
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = 
      activeCategory === 'all' 
        ? true 
        : activeCategory === 'converter'
        ? isConverterTool(tool)
        : tool.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const popularTools = allToolsList.filter(t => t.popular && !t.hidden && !t.adminOnly);

  return (
    <div className="py-6 sm:py-8 px-3 sm:px-6 lg:px-8 xl:px-12 w-full max-w-[1850px] mx-auto space-y-6 sm:space-y-10">
      
      {/* Hero Banner Section (Only show if search/category is default) */}
      {searchQuery === '' && activeCategory === 'all' ? (
        <section className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-indigo-950 via-slate-900 to-blue-950 border border-white/10 text-white p-4 sm:p-7 lg:p-8 shadow-xl">
          <div className="absolute -right-20 -top-20 w-48 h-48 bg-blue-500/10 blur-[60px] rounded-full pointer-events-none"></div>
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 relative z-10">
            <div className="space-y-2 max-w-3xl">
              <div className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                <Zap className="h-3 w-3 animate-pulse" />
                Next-Gen Browser Processing
              </div>
              
              <h1 className="font-display text-lg sm:text-2xl lg:text-3xl font-bold tracking-tight break-words">
                Free Online PDF Tools –{' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">Edit, Convert & Secure</span> Documents
              </h1>
              
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl">
                Unlock premium browser-native tools for editing PDFs, resizing images, drawing transparent signatures, formatting text, and organizing documents securely.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-stretch sm:self-start lg:self-center shrink-0">
              <button
                onClick={() => setActiveCategory('signature')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs sm:text-sm px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl shadow-md cursor-pointer transition-transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <FileSignature className="h-4 w-4 shrink-0" />
                <span>Sign & Fill PDFs</span>
              </button>
              <button
                onClick={() => setActiveCategory('pdf')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 text-white font-semibold text-xs sm:text-sm px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-white/10 cursor-pointer transition-colors"
              >
                <span>Browse PDF Tools</span>
              </button>
            </div>
          </div>
        </section>
      ) : (
        <div className="pt-2">
          <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-zinc-50 tracking-tight break-words">
            {searchQuery ? `Search Results for "${searchQuery}"` : `${categories.find(c => c.id === activeCategory)?.name || 'Document'} Tools`}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
            Browse all {filteredTools.length} free online PDF and conversion tools matching your selection.
          </p>
        </div>
      )}

      {/* Categories Horizontal Selector */}
      <section className="space-y-3 sm:space-y-4">
        <h2 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-zinc-100 flex items-center gap-2">
          <TrendingUp className="h-4.5 w-4.5 text-blue-500" />
          Navigate Tool Categories
        </h2>
        
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar max-w-full touch-pan-x">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all border shrink-0 ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/10'
                    : 'bg-white dark:bg-[#0f172a]/30 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-white/25'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Tools Directory Cards Grid */}
      <section className="space-y-3 sm:space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-display font-bold text-sm sm:text-base text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <Cpu className="h-4.5 w-4.5 text-blue-500" />
            Available Utilities ({filteredTools.length})
          </h2>
        </div>

        {filteredTools.length === 0 ? (
          <div className="text-center py-12 sm:py-16 bg-white dark:bg-[#0f172a]/20 rounded-3xl border border-slate-200 dark:border-white/5 p-4">
            <Compass className="h-8 w-8 text-slate-300 mx-auto mb-2 animate-spin-slow" />
            <h3 className="font-bold text-slate-800 dark:text-zinc-200 text-sm mb-1">No matching tools found</h3>
            <p className="text-slate-500 dark:text-zinc-400 text-xs">Try searching for other keywords like "Merge", "OCR", "Compress", or "Sign".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4">
            {filteredTools.map((tool) => {
              const isFavorite = favorites.includes(tool.id);
              return (
                <div
                  key={tool.id}
                  onClick={() => onSelectTool(tool.id)}
                  className={`group relative flex flex-col justify-between p-3 sm:p-3.5 bg-white dark:bg-[#0f172a]/15 border rounded-xl transition-all duration-200 min-w-0 hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${
                    tool.id === 'online_pdf_editor' 
                      ? 'border-emerald-500/70 bg-gradient-to-br from-emerald-50/50 via-emerald-50/10 to-transparent dark:from-emerald-950/30 shadow-md ring-1 ring-emerald-500/30 hover:border-emerald-600/50' 
                      : 'border-slate-200 dark:border-white/5 ' + (
                        tool.category === 'office' ? 'hover:border-blue-600/50 dark:hover:border-blue-500/50' :
                        tool.category === 'pdf' ? 'hover:border-rose-500/30 dark:hover:border-rose-500/30' :
                        tool.category === 'image' ? 'hover:border-sky-500/30 dark:hover:border-sky-500/30' :
                        tool.category === 'ai' ? 'hover:border-purple-500/30 dark:hover:border-purple-500/30' :
                        tool.category === 'signature' ? 'hover:border-emerald-500/30 dark:hover:border-emerald-500/30' :
                        tool.category === 'text' ? 'hover:border-amber-500/30 dark:hover:border-amber-500/30' :
                        'hover:border-blue-500/30 dark:hover:border-blue-500/30'
                      )
                  }`}
                >
                  
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      {/* Category color themed icons */}
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-white shrink-0 ${
                        tool.id === 'online_pdf_editor' ? 'bg-gradient-to-tr from-emerald-700 to-teal-600 shadow-sm' :
                        tool.id === 'excel_editor' ? 'bg-gradient-to-tr from-emerald-700 to-green-600 shadow-sm' :
                        tool.id === 'batch_processor' ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-sm' :
                        tool.id === 'passport_photo' ? 'bg-gradient-to-tr from-sky-500 to-blue-600' :
                        tool.category === 'office' ? 'bg-gradient-to-tr from-blue-700 via-indigo-700 to-blue-600' :
                        tool.category === 'pdf' ? 'bg-rose-500' :
                        tool.category === 'image' ? 'bg-sky-500' :
                        tool.category === 'ai' ? 'bg-gradient-to-tr from-indigo-600 to-purple-500' :
                        tool.category === 'signature' ? 'bg-emerald-500' :
                        tool.category === 'text' ? 'bg-amber-500' :
                        'bg-slate-600'
                      }`}>
                        {tool.id === 'excel_editor' ? (
                          <FileSpreadsheet className="h-4 w-4" />
                        ) : tool.id === 'batch_processor' ? (
                          <Layers className="h-4 w-4" />
                        ) : tool.category === 'office' ? (
                          <Briefcase className="h-4 w-4" />
                        ) : tool.category === 'pdf' ? (
                          <FileText className="h-4 w-4" />
                        ) : tool.category === 'image' ? (
                          <ImageIcon className="h-4 w-4" />
                        ) : tool.category === 'ai' ? (
                          <Sparkles className="h-4 w-4" />
                        ) : tool.category === 'signature' ? (
                          <FileSignature className="h-4 w-4" />
                        ) : tool.category === 'text' ? (
                          <Type className="h-4 w-4" />
                        ) : (
                          <Sliders className="h-4 w-4" />
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider shrink-0 ${
                          tool.id === 'online_pdf_editor' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-extrabold border border-emerald-500/30' :
                          tool.id.includes('_to_') || tool.id.includes('converter') || tool.name.toLowerCase().includes('converter') ? 'bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-bold' :
                          tool.category === 'ai' ? 'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold' :
                          'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 font-bold'
                        }`}>
                          {tool.id === 'online_pdf_editor' ? 'editor pro' : 
                           (tool.id.includes('_to_') || tool.id.includes('converter') || tool.name.toLowerCase().includes('converter')) ? 'converter' : tool.category}
                        </span>

                        {/* Star Toggle Favorite */}
                        <button
                          id={`fav-${tool.id}`}
                          onClick={(e) => onToggleFavorite(tool.id, e)}
                          className="p-1 rounded-md text-slate-300 hover:text-amber-500 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Star className={`h-3.5 w-3.5 ${isFavorite ? 'fill-amber-500 text-amber-500' : 'text-slate-300'}`} />
                        </button>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <h3 className={`font-display text-xs sm:text-sm leading-snug flex items-center gap-1.5 flex-wrap min-w-0 ${
                        tool.id === 'online_pdf_editor'
                          ? 'font-black text-emerald-800 dark:text-emerald-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 tracking-tight'
                          : 'font-bold text-slate-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                      }`}>
                        <span className="truncate">{tool.name}</span>
                        <ArrowRight className={`h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transform translate-x-[-4px] group-hover:translate-x-0 transition-all shrink-0 ${
                          tool.id === 'online_pdf_editor' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'
                        }`} />
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-normal line-clamp-2 mt-0.5">
                        {tool.description}
                      </p>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
