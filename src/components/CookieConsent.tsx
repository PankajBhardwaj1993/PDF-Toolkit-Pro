import React, { useState, useEffect } from 'react';
import { Cookie, ShieldCheck, Check, X, Settings2, ExternalLink, ChevronRight } from 'lucide-react';

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  advertising: boolean;
  consentGiven: boolean;
  timestamp: string;
}

const STORAGE_KEY = 'pdftoolkitpro_cookie_consent_v1';

export function getStoredCookieConsent(): CookiePreferences | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to read cookie consent from storage', e);
  }
  return null;
}

export function saveCookieConsent(prefs: CookiePreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    // Trigger global event for third-party scripts/Google AdSense
    window.dispatchEvent(new CustomEvent('cookie-consent-updated', { detail: prefs }));
    
    // Update gtag consent mode if available
    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('consent', 'update', {
        analytics_storage: prefs.analytics ? 'granted' : 'denied',
        ad_storage: prefs.advertising ? 'granted' : 'denied',
        ad_user_data: prefs.advertising ? 'granted' : 'denied',
        ad_personalization: prefs.advertising ? 'granted' : 'denied',
      });
    }
  } catch (e) {
    console.error('Failed to persist cookie consent', e);
  }
}

interface CookieConsentProps {
  onOpenPolicy?: () => void;
}

export default function CookieConsent({ onOpenPolicy }: CookieConsentProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  
  // Granular cookie categories
  const [analyticsAllowed, setAnalyticsAllowed] = useState(true);
  const [advertisingAllowed, setAdvertisingAllowed] = useState(true);

  useEffect(() => {
    // Check if user has already made a choice
    const saved = getStoredCookieConsent();
    if (!saved || !saved.consentGiven) {
      // Delay display slightly for smooth entrance
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setAnalyticsAllowed(saved.analytics);
      setAdvertisingAllowed(saved.advertising);
    }
  }, []);

  // Listen to open-cookie-settings custom events
  useEffect(() => {
    const handleOpenSettings = () => {
      const saved = getStoredCookieConsent();
      if (saved) {
        setAnalyticsAllowed(saved.analytics);
        setAdvertisingAllowed(saved.advertising);
      }
      setShowPreferencesModal(true);
    };

    window.addEventListener('open-cookie-settings', handleOpenSettings);
    return () => window.removeEventListener('open-cookie-settings', handleOpenSettings);
  }, []);

  const handleAcceptAll = () => {
    const consent: CookiePreferences = {
      essential: true,
      analytics: true,
      advertising: true,
      consentGiven: true,
      timestamp: new Date().toISOString(),
    };
    saveCookieConsent(consent);
    setAnalyticsAllowed(true);
    setAdvertisingAllowed(true);
    setIsVisible(false);
    setShowPreferencesModal(false);
  };

  const handleRejectNonEssential = () => {
    const consent: CookiePreferences = {
      essential: true,
      analytics: false,
      advertising: false,
      consentGiven: true,
      timestamp: new Date().toISOString(),
    };
    saveCookieConsent(consent);
    setAnalyticsAllowed(false);
    setAdvertisingAllowed(false);
    setIsVisible(false);
    setShowPreferencesModal(false);
  };

  const handleSaveCustomPreferences = () => {
    const consent: CookiePreferences = {
      essential: true,
      analytics: analyticsAllowed,
      advertising: advertisingAllowed,
      consentGiven: true,
      timestamp: new Date().toISOString(),
    };
    saveCookieConsent(consent);
    setIsVisible(false);
    setShowPreferencesModal(false);
  };

  return (
    <>
      {/* 1. Main Bottom Floating Banner */}
      {isVisible && !showPreferencesModal && (
        <div 
          id="cookie-consent-banner"
          role="dialog"
          aria-labelledby="cookie-consent-title"
          aria-describedby="cookie-consent-desc"
          className="fixed bottom-3 sm:bottom-5 left-3 sm:left-6 right-3 sm:right-6 sm:max-w-2xl sm:mx-auto z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xl transition-all duration-300 animate-fade-in"
        >
          <div className="flex items-start gap-3.5">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Cookie className="h-5 w-5 animate-pulse" />
            </div>
            
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center justify-between">
                <h3 id="cookie-consent-title" className="text-sm font-bold text-slate-900 dark:text-zinc-50 flex items-center gap-1.5">
                  We Value Your Privacy &amp; Consent
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  GDPR &amp; CCPA Ready
                </span>
              </div>
              
              <p id="cookie-consent-desc" className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                We use cookies to ensure fast client-side PDF processing, analyze aggregate website performance, and serve relevant advertisements through <strong>Google AdSense</strong>. You can customize your cookie preferences or opt-out of personalized ads anytime.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-zinc-400 order-2 sm:order-1">
              <button
                type="button"
                onClick={() => {
                  setShowPreferencesModal(true);
                }}
                className="inline-flex items-center gap-1 text-slate-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium cursor-pointer transition-colors"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Customize
              </button>
              <span>•</span>
              <a
                href="/privacy"
                onClick={(e) => {
                  if (onOpenPolicy) {
                    e.preventDefault();
                    onOpenPolicy();
                  }
                }}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Cookie &amp; Privacy Policy
              </a>
            </div>

            <div className="flex items-center gap-2 order-1 sm:order-2">
              <button
                type="button"
                onClick={handleRejectNonEssential}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                Essential Only
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10 transition-colors cursor-pointer"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Granular Preferences Customization Modal */}
      {showPreferencesModal && (
        <div 
          id="cookie-preferences-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-preferences-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm animate-fade-in"
        >
          <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Settings2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 id="cookie-preferences-title" className="text-base font-bold text-slate-900 dark:text-zinc-50 font-display">
                    Cookie &amp; Consent Preferences
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Control how data and cookies are used on PDF Toolkit Pro
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPreferencesModal(false)}
                className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 flex items-center justify-center cursor-pointer transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Category 1: Strictly Necessary */}
              <div className="p-3.5 bg-slate-50 dark:bg-zinc-950/40 rounded-xl border border-slate-100 dark:border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                      Strictly Necessary Cookies
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    Always Active
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Required for essential website operation, theme preferences (Dark/Light mode), secure session tokens, and local WebAssembly document processing. These cannot be switched off.
                </p>
              </div>

              {/* Category 2: Performance & Analytics */}
              <div className="p-3.5 bg-slate-50 dark:bg-zinc-950/40 rounded-xl border border-slate-100 dark:border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                      Analytics &amp; Performance
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={analyticsAllowed}
                      onChange={(e) => setAnalyticsAllowed(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Allows us to monitor aggregated, non-personally identifiable metrics such as page response times, tool popularity, and error diagnostic logs to improve platform stability.
                </p>
              </div>

              {/* Category 3: Advertising & Google AdSense */}
              <div className="p-3.5 bg-slate-50 dark:bg-zinc-950/40 rounded-xl border border-slate-100 dark:border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                      Advertising &amp; Google AdSense
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={advertisingAllowed}
                      onChange={(e) => setAdvertisingAllowed(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Used by third-party advertising partners including Google AdSense and DoubleClick to serve relevant ads that finance free access to all our tools. Disabling this displays non-personalized ads instead.
                </p>
                <div className="pt-1">
                  <a
                    href="https://policies.google.com/technologies/ads"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    <span>How Google uses information from sites</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-2.5 sm:justify-end">
              <button
                type="button"
                onClick={handleRejectNonEssential}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                Reject All Non-Essential
              </button>
              <button
                type="button"
                onClick={handleSaveCustomPreferences}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-colors cursor-pointer"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
