import React, { useState, useEffect } from 'react';
import { 
  Server, RefreshCw, Loader2, FileCheck, ShieldCheck, Key,
  Heart, HeartOff, Eye, EyeOff, CheckCircle2, AlertCircle, Sparkles, Settings
} from 'lucide-react';
import { User } from '../types';

interface AdminViewProps {
  user?: User | null;
  onLoginRequest?: () => void;
  isDonationDisabled?: boolean;
  onToggleDonation?: (disabled: boolean) => void;
}

export default function AdminView({ user, onLoginRequest, isDonationDisabled = false, onToggleDonation }: AdminViewProps) {
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
              This area is strictly restricted to system administrators. Please log in with an administrator account to manage settings and view system metrics.
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
    <div className="py-10 px-4 sm:px-6 lg:px-8 xl:px-12 bg-slate-50 dark:bg-[#0b0e14] min-h-[80vh]">
      <div className="w-full max-w-6xl 2xl:max-w-7xl mx-auto space-y-8 animate-fade-in">
        
        {/* Title / Header */}
        <div className="flex justify-between items-center bg-white dark:bg-zinc-950 px-6 py-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div>
            <h1 className="font-display text-xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50 flex items-center gap-2">
              <Server className="h-5 w-5 text-blue-500" />
              Administrative Dashboard
            </h1>
            <p className="text-slate-500 dark:text-zinc-400 text-xs mt-1">
              Live configuration & website controls for administrators.
            </p>
          </div>
          <button
            onClick={fetchAdminData}
            className="p-2 border border-slate-100 dark:border-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded-xl transition-all cursor-pointer"
            title="Refresh Metrics & Config"
          >
            <RefreshCw className="h-4 w-4" />
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
          {/* Subtle Decorative Background Effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
          
          <div className="relative space-y-6">
            {/* Visual Icon with Ring */}
            <div className="inline-flex items-center justify-center p-4 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-full ring-8 ring-blue-500/5 mb-2">
              <FileCheck className="h-10 w-10" />
            </div>

            {/* Header Text */}
            <div className="space-y-1">
              <h2 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                Total Files Processed
              </h2>
              <p className="text-slate-500 dark:text-zinc-400 text-[11px] max-w-sm mx-auto">
                Real-time tracking of successful document conversions, merges, signatures, and AI edits.
              </p>
            </div>

            {/* Giant Count */}
            <div className="py-2">
              <span className="font-display text-6xl sm:text-7xl font-black text-slate-900 dark:text-zinc-50 tracking-tight block">
                {analytics.totalFilesProcessed ?? 0}
              </span>
            </div>

            {/* Status indicator */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/10 text-xs font-bold shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              System Online &amp; Logging Events
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

