import React, { useState, useEffect } from 'react';
import { 
  Server, RefreshCw, Loader2, FileCheck, ShieldCheck, Key,
  Heart, HeartOff, Eye, EyeOff, CheckCircle2, AlertCircle, Sparkles, Settings,
  Link as LinkIcon, Compass, Sliders, Globe
} from 'lucide-react';
import { User } from '../types';
import CanonicalTestWorkstation from './CanonicalTestWorkstation';

interface AdminViewProps {
  user?: User | null;
  onLoginRequest?: () => void;
  isDonationDisabled?: boolean;
  onToggleDonation?: (disabled: boolean) => void;
  onAddRecentFile?: (file: { name: string; size: string; type: string; toolUsed: string }) => void;
}

export default function AdminView({ user, onLoginRequest, isDonationDisabled = false, onToggleDonation, onAddRecentFile }: AdminViewProps) {
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 bg-slate-50 dark:bg-zinc-950">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-5 shadow-xl">
          <div className="mx-auto w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold font-display text-slate-900 dark:text-zinc-50">
              Admin Access Restricted
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              This area and the <strong>SEO &amp; Canonical Tag Tester</strong> are strictly restricted to system administrators. Please log in with an administrator account to manage settings and access administrative tools.
            </p>
          </div>
          {onLoginRequest ? (
            <button
              onClick={onLoginRequest}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Key className="h-4 w-4" />
              Sign In as Administrator
            </button>
          ) : (
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-slate-900 dark:bg-zinc-100 text-white dark:text-slate-900 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
            >
              Return to Homepage
            </a>
          )}
        </div>
      </div>
    );
  }

  const [activeAdminTab, setActiveAdminTab] = useState<'controls' | 'seo_tester'>('controls');
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [donationDisabledState, setDonationDisabledState] = useState<boolean>(isDonationDisabled);
  const [savingConfig, setSavingConfig] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  useEffect(() => {
    setDonationDisabledState(isDonationDisabled);
  }, [isDonationDisabled]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const analyticsRes = await fetch('/api/admin/analytics');
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData.analytics);
      }

      // Also fetch live config to ensure alignment
      const configRes = await fetch('/api/config');
      if (configRes.ok) {
        const configData = await configRes.json();
        if (typeof configData.isDonationDisabled === 'boolean') {
          setDonationDisabledState(configData.isDonationDisabled);
          if (onToggleDonation) onToggleDonation(configData.isDonationDisabled);
        }
      }
    } catch (e) {
      console.error('Error fetching admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleDonationClick = async (targetDisabled: boolean) => {
    setSavingConfig(true);
    setStatusNotice(null);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          userId: user.id,
          isDonationDisabled: targetDisabled
        })
      });

      if (res.ok) {
        const data = await res.json();
        const updatedDisabled = !!data.isDonationDisabled;
        setDonationDisabledState(updatedDisabled);
        if (onToggleDonation) {
          onToggleDonation(updatedDisabled);
        }
        setStatusNotice(
          updatedDisabled
            ? 'Donation tab has been DISABLED and hidden live from all website visitors!'
            : 'Donation tab has been ENABLED and is now live & visible on the website!'
        );
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed to update config' }));
        setStatusNotice(`Error: ${err.error || 'Failed to update configuration'}`);
      }
    } catch (e) {
      console.error('Failed to toggle donation setting:', e);
      setStatusNotice('Error connecting to server to update setting.');
    } finally {
      setSavingConfig(false);
    }
  };

  if (loading || !analytics) {
    return (
      <div className="flex justify-center items-center py-40">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 xl:px-12 bg-slate-50 dark:bg-[#0b0e14] min-h-[80vh]">
      <div className="w-full max-w-[1850px] mx-auto space-y-6 animate-fade-in">
        
        {/* Title / Header with Sub-Tabs Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-950 px-6 py-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50 flex items-center gap-2">
                <Server className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                Administrative Console
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-500/20 uppercase tracking-wider">
                Admin Only
              </span>
            </div>
            <p className="text-slate-500 dark:text-zinc-400 text-xs mt-1">
              Signed in as <span className="font-semibold text-slate-700 dark:text-zinc-200">{user.email}</span> &bull; Manage live controls, metrics, and admin SEO tools.
            </p>
          </div>

          {/* Admin Navigation Tabs */}
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl border border-slate-200 dark:border-zinc-800">
              <button
                onClick={() => setActiveAdminTab('controls')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeAdminTab === 'controls'
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-50 shadow-sm'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                <Sliders className="h-3.5 w-3.5 text-blue-500" />
                <span>Controls &amp; Metrics</span>
              </button>

              <button
                onClick={() => setActiveAdminTab('seo_tester')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeAdminTab === 'seo_tester'
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/20'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400'
                }`}
              >
                <Globe className="h-3.5 w-3.5" />
                <span>SEO &amp; Canonical Tester</span>
                <span className="px-1.5 py-0.2 text-[9px] font-black uppercase rounded bg-purple-200/20 dark:bg-white/20 text-current">
                  Tool
                </span>
              </button>
            </div>

            <button
              onClick={fetchAdminData}
              className="p-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded-xl transition-all cursor-pointer shrink-0"
              title="Refresh Metrics & Config"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab 1: Controls & Metrics */}
        {activeAdminTab === 'controls' && (
          <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
            {/* Quick Link Card to SEO Tester */}
            <div className="bg-gradient-to-r from-purple-900/20 via-indigo-900/10 to-blue-900/20 border border-purple-500/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-600 text-white rounded-xl shadow-md shadow-purple-500/20">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                    SEO &amp; Canonical Tag Tester Tool
                    <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                      Shifted to Admin
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Inspect, validate, and debug search-engine canonical links and security compliance across all workspace routes.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveAdminTab('seo_tester')}
                className="shrink-0 px-4 py-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-600/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Launch SEO Tester</span>
                <LinkIcon className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* DONATION TAB & BUTTON ENABLE/DISABLE CONTROL CARD */}
            <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 shadow-sm space-y-6 relative overflow-hidden">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${
                    donationDisabledState 
                      ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400' 
                      : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {donationDisabledState ? <HeartOff className="h-6 w-6" /> : <Heart className="h-6 w-6 fill-current" />}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                      Donation Button &amp; Tab Control
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                        Live Toggle
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                      Control the visibility of the "Donate" button across the entire live website in real time.
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Message Alert Toast if updated */}
              {statusNotice && (
                <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-fade-in ${
                  statusNotice.startsWith('Error')
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
                }`}>
                  {statusNotice.startsWith('Error') ? (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  )}
                  <span>{statusNotice}</span>
                </div>
              )}

              {/* Current Status Box */}
              <div className={`p-4 rounded-xl border transition-all ${
                donationDisabledState
                  ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200'
                  : 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${
                        donationDisabledState ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'
                      }`} />
                      <span className="font-extrabold text-xs uppercase tracking-wider">
                        {donationDisabledState ? 'Status: OFF (Hidden from Website)' : 'Status: ON (Live & Visible)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-zinc-300">
                      {donationDisabledState ? (
                        <span>The "Donate" button, profile menu link, and donation popup are <strong>completely hidden</strong> from all users.</span>
                      ) : (
                        <span>The "Donate" button and support section are <strong>active and visible</strong> in Navbar, Footer, and Download popup.</span>
                      )}
                    </p>
                  </div>

                  {/* Action Toggle Switch Button */}
                  <div className="shrink-0">
                    {donationDisabledState ? (
                      <button
                        onClick={() => handleToggleDonationClick(false)}
                        disabled={savingConfig}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                      >
                        {savingConfig ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        <span>Enable Donation Button</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleDonationClick(true)}
                        disabled={savingConfig}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                      >
                        {savingConfig ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                        <span>Disable Donation Button</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Processed Files Counter Card */}
            <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-8 sm:p-12 shadow-sm text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
              
              <div className="relative space-y-6">
                <div className="inline-flex items-center justify-center p-4 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-full ring-8 ring-blue-500/5 mb-2">
                  <FileCheck className="h-10 w-10" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                    Total Files Processed
                  </h2>
                  <p className="text-slate-500 dark:text-zinc-400 text-[11px] max-w-sm mx-auto">
                    Real-time tracking of successful document conversions, merges, signatures, and AI edits.
                  </p>
                </div>

                <div className="py-2">
                  <span className="font-display text-6xl sm:text-7xl font-black text-slate-900 dark:text-zinc-50 tracking-tight block">
                    {analytics.totalFilesProcessed ?? 0}
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/10 text-xs font-bold shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  System Online &amp; Logging Events
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: SEO & Canonical Tag Tester */}
        {activeAdminTab === 'seo_tester' && (
          <div className="animate-fade-in">
            <CanonicalTestWorkstation 
              user={user} 
              onBackToTools={() => setActiveAdminTab('controls')}
              onAddRecentFile={onAddRecentFile}
            />
          </div>
        )}

      </div>
    </div>
  );
}


