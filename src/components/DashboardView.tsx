import SEO from './SEO';
import React, { useState, useEffect } from 'react';
import { 
  FileText, History, Star, ShieldAlert, CheckCircle2, 
  ArrowUpRight, Download, Sparkles, Database, ArrowRight, Trash2, Clock
} from 'lucide-react';
import { RecentFile, Tool, User } from '../types';

interface DashboardViewProps {
  user: User | null;
  favorites: string[];
  onSelectTool: (toolId: string) => void;
  allToolsList: Tool[];
}

export default function DashboardView({
  user,
  favorites,
  onSelectTool,
  allToolsList,
}: DashboardViewProps) {
  const [files, setFiles] = useState<RecentFile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/recent-files');
      const data = await res.json();
      setFiles(data.files);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const favoriteTools = allToolsList.filter(t => favorites.includes(t.id));

  const handleDeleteFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const calculateUsedLimit = () => {
    if (!user) return 0;
    if (user.subscription === 'free') return 40; // 40% used
    if (user.subscription === 'pro') return 5;
    return 1;
  };

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 xl:px-12">
      <SEO title="My Dashboard | PDF Toolkit Pro" description="Access your recent files, favorite tools, and account settings." canonical="/dashboard" />
      <div className="w-full max-w-[1850px] mx-auto space-y-8">
        
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 text-white p-6 sm:p-8 rounded-2xl shadow-xl shadow-blue-500/10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[10px] uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-md font-bold">
                User Dashboard
              </span>
              {user?.subscription !== 'free' && (
                <span className="inline-flex items-center gap-1 bg-amber-400 text-zinc-950 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  <Sparkles className="h-3 w-3" />
                  PRO MEMBER
                </span>
              )}
            </div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight mb-1">
              Welcome Back, {user?.username || 'Guest'}!
            </h1>
            <p className="text-blue-100 text-sm max-w-md leading-relaxed">
              Analyze document processing histories, download recently generated files, and launch your favorite workspace tools.
            </p>
          </div>

          <div className="flex gap-4">
            <div className="text-center bg-white/10 px-4 py-3 rounded-xl border border-white/15">
              <p className="text-[10px] text-blue-200 uppercase tracking-wider">Processed Files</p>
              <p className="text-2xl font-extrabold font-display">12</p>
            </div>
            <div className="text-center bg-white/10 px-4 py-3 rounded-xl border border-white/15">
              <p className="text-[10px] text-blue-200 uppercase tracking-wider">Storage Limit</p>
              <p className="text-2xl font-extrabold font-display">{user?.subscription === 'free' ? '10MB' : '2GB'}</p>
            </div>
          </div>
        </div>

        {/* Dashboard Grid split into Favorites & Limits and Recent Files */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Favorites & Limits Left Side */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Storage Quota Card */}
            <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
              <h2 className="font-display font-bold text-base text-slate-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <Database className="h-4.5 w-4.5 text-blue-500" />
                Resource Limits & Storage
              </h2>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-2 text-slate-500 dark:text-zinc-400">
                    <span>Daily conversion quota</span>
                    <span>{user?.subscription === 'free' ? '2 of 5 conversions' : 'Unlimited'}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-zinc-900 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: user?.subscription === 'free' ? '40%' : '1%' }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-2 text-slate-500 dark:text-zinc-400">
                    <span>Cloud Storage Used</span>
                    <span>{user?.subscription === 'free' ? '4MB of 10MB' : '102MB of 2GB'}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-zinc-900 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-purple-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${calculateUsedLimit()}%` }}
                    />
                  </div>
                </div>

                <div className="text-slate-400 dark:text-zinc-500 text-xs leading-relaxed border-t border-slate-100 dark:border-zinc-900 pt-3 flex gap-2">
                  <Clock className="h-4 w-4 text-slate-300 flex-shrink-0" />
                  <span>Cloud files are auto-purged from memory exactly 60 minutes after generation for security.</span>
                </div>
              </div>
            </div>

            {/* Favorite Tools Card */}
            <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
              <h2 className="font-display font-bold text-base text-slate-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <Star className="h-4.5 w-4.5 text-amber-500" />
                Favorite Workspaces ({favoriteTools.length})
              </h2>

              {favoriteTools.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-zinc-500 leading-relaxed">
                  You do not have any favorite workspaces. Star tools from the home directory directory for instant, rapid access.
                </p>
              ) : (
                <div className="space-y-2">
                  {favoriteTools.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => onSelectTool(t.id)}
                      className="w-full flex items-center justify-between text-left p-3 rounded-xl border border-slate-100 dark:border-zinc-900/50 hover:bg-slate-50 dark:hover:bg-zinc-900 cursor-pointer transition-all group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-1">
                          {t.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{t.description}</p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Recent Files Right Side */}
          <div className="lg:col-span-8 bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-6">
            <h2 className="font-display font-bold text-base text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <History className="h-4.5 w-4.5 text-blue-500" />
              Recent File Processings & Downloads
            </h2>

            {loading ? (
              <div className="text-center py-20">
                <p className="text-slate-400 text-sm animate-pulse">Retreiving history logs...</p>
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-20 bg-slate-50 dark:bg-zinc-900/40 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800">
                <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No files converted yet. Try out a tool above!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-zinc-900 text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      <th className="pb-3 pl-2">File Name</th>
                      <th className="pb-3 hidden sm:table-cell">Workspace</th>
                      <th className="pb-3 hidden sm:table-cell">Size</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 pr-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-zinc-900/50">
                    {files.map((file) => (
                      <tr 
                        key={file.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors"
                      >
                        <td className="py-4 pl-2 font-medium text-slate-800 dark:text-zinc-200 max-w-[180px] sm:max-w-xs truncate">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{file.name}</span>
                          </div>
                        </td>
                        <td className="py-4 hidden sm:table-cell text-xs text-slate-500 dark:text-zinc-400 font-semibold">{file.toolUsed}</td>
                        <td className="py-4 hidden sm:table-cell text-xs text-slate-400 dark:text-zinc-500 font-mono">{file.size}</td>
                        <td className="py-4">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="h-3 w-3" />
                            {file.status}
                          </span>
                        </td>
                        <td className="py-4 pr-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                // Simulate download
                                alert(`Simulating file download for ${file.name}`);
                              }}
                              className="p-1.5 rounded-lg border border-slate-100 dark:border-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                              title="Download File"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteFile(file.id, e)}
                              className="p-1.5 rounded-lg border border-slate-100 dark:border-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                              title="Delete Log"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
