import React from 'react';
import { Loader2 } from 'lucide-react';

export default function PageSkeleton() {
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 xl:px-12 w-full max-w-[1850px] mx-auto animate-pulse space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-900 pb-4">
        <div className="h-5 w-28 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
        <div className="h-5 w-20 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <div className="h-7 w-48 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
            <div className="h-4 w-72 bg-slate-100 dark:bg-zinc-900 rounded-md"></div>
          </div>
          <div className="h-44 rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/10 flex items-center justify-center">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span>Loading workstation...</span>
            </div>
          </div>
          <div className="h-12 bg-slate-200 dark:bg-zinc-800 rounded-xl"></div>
        </div>

        <div className="lg:col-span-5 bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 space-y-4">
          <div className="h-6 w-36 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
          <div className="h-20 bg-slate-100 dark:bg-zinc-900 rounded-xl"></div>
          <div className="h-20 bg-slate-100 dark:bg-zinc-900 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
}
