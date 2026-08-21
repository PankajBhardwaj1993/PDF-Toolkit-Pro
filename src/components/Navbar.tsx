import React, { useState } from 'react';
import { 
  FileText, Search, Sun, Moon, LogIn, User, Laptop, 
  Settings, LogOut, Ticket, Heart, CreditCard, Sparkles, X
} from 'lucide-react';
import { User as UserType } from '../types';

interface NavbarProps {
  user: UserType | null;
  onLoginClick: () => void;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  favorites: string[];
  setSelectedToolId: (id: string | null) => void;
  isDonationDisabled?: boolean;
}

export default function Navbar({
  user,
  onLoginClick,
  onLogout,
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
  searchQuery,
  setSearchQuery,
  favorites,
  setSelectedToolId,
  isDonationDisabled = false,
}: NavbarProps) {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const handleLogoClick = () => {
    setActiveTab('tools');
    setSearchQuery('');
  };

  const handleAdminClick = () => {
    setActiveTab('admin');
    setShowProfileDropdown(false);
  };

  const handleBillingClick = () => {
    setActiveTab('donation');
    setShowProfileDropdown(false);
  };

  const handleDashboardClick = () => {
    setActiveTab('dashboard');
    setShowProfileDropdown(false);
  };

  const handleContactClick = () => {
    setActiveTab('contact');
    setShowProfileDropdown(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-white/5 bg-white/85 dark:bg-[#0f172a]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1850px] items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-12">
        
        {/* Brand Logo */}
        <button 
          id="nav-logo-btn"
          onClick={handleLogoClick}
          className="flex items-center gap-2 text-left cursor-pointer focus:outline-none"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-blue-500 to-purple-500 text-white shadow-md shadow-blue-500/20">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <span className="font-display text-lg font-bold tracking-tight text-slate-800 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:to-slate-400">
              PDF Toolkit <span className="text-blue-500">Pro</span>
            </span>
            <span className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
              High-Speed Utilities
            </span>
          </div>
        </button>

        {/* Global Tools Search */}
        <div className="relative hidden max-w-xs flex-1 sm:block md:max-w-md lg:max-w-xl xl:max-w-2xl mx-4 sm:mx-6">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          </div>
          <input
            id="nav-search-input"
            type="text"
            placeholder="Search PDF, Image, Text & utility tools..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (activeTab !== 'tools') setActiveTab('tools');
            }}
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 py-2 pl-9 pr-8 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 dark:text-zinc-100 focus:ring-1 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              id="clear-search"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <nav className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1">
            <button
              id="nav-tools-tab"
              onClick={() => setActiveTab('tools')}
              className={`text-xs sm:text-sm font-medium px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'tools' 
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-500/10' 
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              All Tools
            </button>

            <button
              id="nav-converter-tab"
              onClick={() => setActiveTab('converter')}
              className={`text-xs sm:text-sm font-medium px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'converter' 
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-500/10 font-semibold' 
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <span>Converter</span>
              <span className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-red-600 text-white rounded-md border border-red-400 shadow-sm shadow-red-500/50 animate-beta-pop">
                Beta
              </span>
            </button>

            <button
              id="nav-blog-tab"
              onClick={() => setActiveTab('blog')}
              className={`text-xs sm:text-sm font-medium px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'blog' 
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-500/10' 
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              Insights
            </button>

            {user?.role === 'admin' && (
              <button
                id="nav-admin-tab"
                onClick={() => setActiveTab('admin')}
                className={`text-xs sm:text-sm font-bold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shadow-xs ${
                  activeTab === 'admin' 
                    ? 'text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 border border-purple-500/30 font-bold' 
                    : 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-500/20 font-semibold'
                }`}
              >
                <Laptop className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                <span>Admin Console</span>
              </button>
            )}

            {(!isDonationDisabled || user?.role === 'admin') && (
              <button
                id="nav-donation-tab"
                onClick={() => setActiveTab('donation')}
                className={`text-xs sm:text-sm font-medium px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors cursor-pointer relative flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'donation' || activeTab === 'pricing'
                    ? 'text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-500/10 font-semibold' 
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                <Heart className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isDonationDisabled ? 'text-slate-400' : 'fill-rose-500 text-rose-500 animate-pulse'}`} />
                <span>Donate</span>
                {isDonationDisabled && user?.role === 'admin' ? (
                  <span className="px-1 py-0.2 text-[8px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 rounded">
                    Disabled
                  </span>
                ) : (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                )}
              </button>
            )}
          </nav>

          {/* Controls: Theme & User Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 relative">
            {/* Theme Toggle */}
            <button
              id="theme-toggle"
              onClick={() => setDarkMode(!darkMode)}
              className="rounded-lg p-2 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900 cursor-pointer transition-colors"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5 text-slate-700" />}
            </button>

            {/* Auth State */}
            {user ? (
              <div className="relative">
                <button
                  id="profile-dropdown-btn"
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-850 cursor-pointer transition-all"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-white font-bold text-xs uppercase shadow-sm">
                    {user.username.charAt(0)}
                  </div>
                  <span className="max-w-[100px] truncate hidden sm:inline font-semibold">{user.username}</span>
                  {user.subscription !== 'free' && (
                    <Sparkles className="h-3.5 w-3.5 text-purple-500 animate-pulse" />
                  )}
                </button>

                {/* Profile Dropdown */}
                {showProfileDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowProfileDropdown(false)} 
                    />
                    <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2.5 shadow-2xl ring-1 ring-black/10 z-50 animate-fade-in">
                      <div className="px-3 py-2 border-b border-slate-100 dark:border-zinc-900">
                        <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider">Signed in as</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-zinc-100 truncate">{user.email}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            user.subscription === 'enterprise' 
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-500/20' 
                              : user.subscription === 'pro'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-500/20'
                              : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}>
                            {user.subscription} Account
                          </span>
                        </div>
                      </div>
                      
                      <div className="py-1.5 space-y-0.5">
                        <button
                          onClick={handleDashboardClick}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-900 cursor-pointer transition-colors"
                        >
                          <Settings className="h-4 w-4 text-slate-500" />
                          My Dashboard
                        </button>
                        {(!isDonationDisabled || user.role === 'admin') && (
                          <button
                            onClick={handleBillingClick}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-900 cursor-pointer transition-colors"
                          >
                            <Heart className={`h-4 w-4 ${isDonationDisabled ? 'text-slate-400' : 'text-rose-500 fill-current'}`} />
                            <span>Support & Donation</span>
                            {isDonationDisabled && (
                              <span className="ml-auto text-[9px] font-black uppercase text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                OFF
                              </span>
                            )}
                          </button>
                        )}
                        {user.role !== 'admin' && (
                          <button
                            onClick={handleContactClick}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-900 cursor-pointer transition-colors"
                          >
                            <Ticket className="h-4 w-4 text-slate-500" />
                            Support Tickets
                          </button>
                        )}
                        
                        {user.role === 'admin' && (
                          <button
                            onClick={handleAdminClick}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-extrabold text-purple-700 dark:text-purple-300 bg-purple-50/80 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-500/20 cursor-pointer transition-colors"
                          >
                            <Laptop className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            Admin Console
                          </button>
                        )}
                      </div>
                      
                      <div className="border-t border-slate-100 dark:border-zinc-900 pt-1.5">
                        <button
                          onClick={() => { onLogout(); setShowProfileDropdown(false); }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer transition-colors"
                        >
                          <LogOut className="h-4 w-4 text-rose-500" />
                          Log Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                id="nav-login-btn"
                onClick={onLoginClick}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10 px-4 py-2 text-sm font-medium cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
