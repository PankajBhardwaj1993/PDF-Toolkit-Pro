import SEO from './SEO';
import React, { useState, useEffect } from 'react';
import { Heart, Compass, QrCode, Eye, EyeOff, ShieldCheck, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import QRCode from 'qrcode';
import { User } from '../types';

interface DonationViewProps {
  onBackToTools: () => void;
  user?: User | null;
  isDonationDisabled?: boolean;
  onToggleDonation?: (disabled: boolean) => void;
}

export default function DonationView({ onBackToTools, user, isDonationDisabled = false, onToggleDonation }: DonationViewProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const upiId = "bhardwajpankaj267-2@okaxis";
  const upiOwnerName = "Pankaj Bhardwaj";

  useEffect(() => {
    // Generate a mathematically perfect, ultra-crisp QR code for the UPI payment link
    const upiUri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiOwnerName)}&cu=INR`;
    
    QRCode.toDataURL(upiUri, {
      width: 600, // Very high resolution for clean, crisp scanning
      margin: 1,  // Minimal margin to maximize the code's active area
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H' // High error correction level for maximum scanning success
    })
    .then(url => {
      setQrDataUrl(url);
    })
    .catch(err => {
      console.error('Failed to generate secure QR code:', err);
    });
  }, []);

  const handleToggleDonationClick = async (targetDisabled: boolean) => {
    if (!user || user.role !== 'admin') return;
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
        if (onToggleDonation) {
          onToggleDonation(updatedDisabled);
        }
        setStatusNotice(
          updatedDisabled
            ? 'Donation option is now DISABLED and hidden from live visitors.'
            : 'Donation option is now ENABLED and visible on live website.'
        );
      } else {
        setStatusNotice('Failed to update config.');
      }
    } catch (e) {
      console.error(e);
      setStatusNotice('Error connecting to server.');
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 xl:px-12 max-w-5xl 2xl:max-w-6xl mx-auto animate-fade-in space-y-6">
      <SEO title="Support PDF Toolkit Pro | PDF Toolkit Pro" description="Support the development of PDF Toolkit Pro. Help keep the tools free." canonical="/donation" />
      
      {/* ADMIN CONTROL PANEL BANNER (Shown strictly if user is Admin) */}
      {user?.role === 'admin' && (
        <div className="bg-purple-900 text-white p-5 rounded-2xl shadow-xl border border-purple-500/30 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-800 rounded-xl">
                <ShieldCheck className="h-6 w-6 text-purple-300" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-300 bg-purple-800 px-2 py-0.5 rounded-full">
                  Admin Live Controls
                </span>
                <h3 className="text-sm font-extrabold text-white">
                  Donation Button Control: {isDonationDisabled ? 'DISABLED (Hidden)' : 'ENABLED (Live & Visible)'}
                </h3>
              </div>
            </div>

            <div>
              {isDonationDisabled ? (
                <button
                  onClick={() => handleToggleDonationClick(false)}
                  disabled={savingConfig}
                  className="w-full sm:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  <span>Enable Donation Button</span>
                </button>
              ) : (
                <button
                  onClick={() => handleToggleDonationClick(true)}
                  disabled={savingConfig}
                  className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />}
                  <span>Disable Donation Button</span>
                </button>
              )}
            </div>
          </div>

          {statusNotice && (
            <p className="text-xs font-semibold text-emerald-300 bg-purple-950/60 p-2.5 rounded-xl border border-purple-500/20 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              {statusNotice}
            </p>
          )}
        </div>
      )}

      {/* Title Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border border-rose-500/10 mb-4 animate-pulse">
          <Heart className="h-3.5 w-3.5 fill-current" />
          Keep pdftoolkitpro.online Alive & Free
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50 mb-3 sm:text-4xl">
          Support Our Free Mission
        </h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
          We do not sell your personal files or place intrusive paywalls. This entire browser-native toolkit is built to protect your privacy and run blisteringly fast.
        </p>
      </div>

      {/* Main Donation Container Card */}
      <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl p-4 sm:p-8 lg:p-10 shadow-xl max-w-lg mx-auto space-y-6 sm:space-y-8 text-center">
        
        {/* Rendered QR Code Wrapper (Large, Crisp, matching Google Pay screenshot design) */}
        <div className="flex flex-col items-center justify-center py-6 px-3 sm:py-8 sm:px-6 bg-slate-50 dark:bg-zinc-900/30 rounded-2xl border border-slate-200 dark:border-zinc-800 relative w-full">
          
          {/* Scan & Pay Banner */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-zinc-950 rounded-full border border-slate-200 dark:border-zinc-800 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Scan to Pay</span>
          </div>

          {/* User Name & Profile Indicator matching the top of the screenshot */}
          <div className="flex items-center gap-3 mb-4 mt-2">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 font-extrabold text-base border border-blue-200 dark:border-blue-900 shadow-sm">
              PB
            </div>
            <div className="text-left">
              <h4 className="font-extrabold text-sm text-slate-800 dark:text-zinc-200 tracking-wide">
                {upiOwnerName}
              </h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Verified Merchant</p>
            </div>
          </div>

          {/* Large QR Display Container */}
          <div className="w-full max-w-[260px] xs:max-w-[300px] sm:max-w-[360px] aspect-square bg-white rounded-3xl shadow-xl overflow-hidden flex items-center justify-center p-4 sm:p-6 border-2 border-slate-100 relative mx-auto">
            {qrDataUrl ? (
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Mathematical QR Image */}
                <img loading="lazy" 
                  src={qrDataUrl} 
                  alt="UPI QR Code" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />

                {/* Google Pay Style Central Overlay Icon */}
                <div className="absolute w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center shadow-lg border border-slate-100 p-2">
                  <svg viewBox="0 0 40 40" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14.5 13.5C14.5 11.01 16.51 9 19 9H21C23.49 9 25.5 11.01 25.5 13.5V15.5H14.5V13.5Z" fill="#34A853" />
                    <path d="M25.5 26.5C25.5 28.99 23.49 31 21 31H19C16.51 31 14.5 28.99 14.5 26.5V24.5H25.5V26.5Z" fill="#F9BC05" />
                    <path d="M13.5 14.5H15.5V25.5H13.5C11.01 25.5 9 23.49 9 21V19C9 16.51 11.01 14.5 13.5 14.5Z" fill="#EA4335" />
                    <path d="M24.5 14.5H26.5C28.99 14.5 31 16.51 31 19V21C31 23.49 28.99 25.5 26.5 25.5H24.5V14.5Z" fill="#4285F4" />
                    <circle cx="20" cy="20" r="4.5" fill="#FFFFFF" />
                    <path d="M19 19H21V21H19V19Z" fill="#4285F4" />
                  </svg>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs">Generating high-contrast QR...</p>
              </div>
            )}
          </div>

          {/* Secure verified UPI ID text below QR code */}
          <div className="mt-5 sm:mt-6 flex flex-col items-center gap-1.5 w-full">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Scan to Pay with any UPI app</span>
            <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-zinc-100 font-mono tracking-wider bg-white dark:bg-zinc-900 px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl border border-slate-250 dark:border-zinc-800 shadow-sm flex items-center gap-2 max-w-full truncate">
              <QrCode className="h-4 w-4 text-blue-500 shrink-0" />
              <span className="truncate">UPI ID: {upiId}</span>
            </span>
          </div>
        </div>

        {/* Supporting message requesting Rs 10, 20, 50 */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg text-slate-900 dark:text-zinc-100 font-display leading-snug">
            A Tiny Support Keeps This Platform Running ❤️
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-300 leading-relaxed max-w-sm mx-auto font-medium">
            You can donate any small amount of your choice. Your small contribution helps keep our servers running and maintains the domain so we can continue serving you completely free tools!
          </p>
        </div>

        {/* Return Button */}
        <div className="pt-2">
          <button
            onClick={onBackToTools}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-blue-500/15"
          >
            <Compass className="h-4 w-4" />
            Back to Free Tools
          </button>
        </div>
      </div>
    </div>
  );
}
