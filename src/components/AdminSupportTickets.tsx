import React, { useState, useEffect } from 'react';
import { 
  Ticket, Send, RefreshCw, Trash2, CheckCircle2, Clock, 
  AlertCircle, Search, Filter, MessageSquare, User as UserIcon, 
  ShieldCheck, ArrowRight, CornerDownLeft, Sparkles, Mail, Tag,
  Check, X, CheckCheck, Inbox, MessageCircle
} from 'lucide-react';
import { SupportTicket, User } from '../types';

interface AdminSupportTicketsProps {
  user: User;
  onNavigateTab?: (tab: string) => void;
}

export default function AdminSupportTickets({ user }: AdminSupportTicketsProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'pending' | 'resolved'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Reply state
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [targetStatusOnReply, setTargetStatusOnReply] = useState<'resolved' | 'pending' | 'open'>('resolved');
  const [statusActionLoading, setStatusActionLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/support/tickets');
      if (res.ok) {
        const data = await res.json();
        const ticketList: SupportTicket[] = data.tickets || [];
        setTickets(ticketList);
        
        // If currently selected ticket is still available, keep it; else select the first one
        if (ticketList.length > 0) {
          if (!selectedTicketId || !ticketList.some(t => t.id === selectedTicketId)) {
            setSelectedTicketId(ticketList[0].id);
          }
        } else {
          setSelectedTicketId(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch support tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const selectedTicket = tickets.find(t => t.id === selectedTicketId) || null;

  const handleSendAdminReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTicket || !replyMessage.trim() || isSendingReply) return;

    setIsSendingReply(true);
    setActionNotice(null);
    try {
      // 1. Send reply as 'support'
      const replyRes = await fetch(`/api/support/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyMessage.trim(),
          sender: 'support'
        })
      });

      if (!replyRes.ok) throw new Error('Failed to submit reply');

      // 2. If desired status is different, update status
      if (targetStatusOnReply !== 'resolved') {
        await fetch(`/api/support/tickets/${selectedTicket.id}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: targetStatusOnReply })
        });
      }

      setReplyMessage('');
      setActionNotice({ type: 'success', text: 'Reply sent successfully to user!' });
      setTimeout(() => setActionNotice(null), 4000);

      // Refresh list
      const updatedRes = await fetch('/api/support/tickets');
      if (updatedRes.ok) {
        const data = await updatedRes.json();
        setTickets(data.tickets || []);
      }
    } catch (err: any) {
      console.error('Error replying to ticket:', err);
      setActionNotice({ type: 'error', text: err.message || 'Failed to send reply' });
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: 'open' | 'pending' | 'resolved') => {
    setStatusActionLoading(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ticket) {
          setTickets(prev => prev.map(t => t.id === ticketId ? data.ticket : t));
        }
        setActionNotice({ type: 'success', text: `Ticket status updated to "${newStatus.toUpperCase()}"` });
        setTimeout(() => setActionNotice(null), 3000);
      }
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setStatusActionLoading(false);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || tickets.filter(t => t.id !== ticketId));
        if (selectedTicketId === ticketId) {
          const remaining = (data.tickets || tickets).filter((t: SupportTicket) => t.id !== ticketId);
          setSelectedTicketId(remaining.length > 0 ? remaining[0].id : null);
        }
        setDeleteConfirmId(null);
        setActionNotice({ type: 'success', text: 'Ticket deleted successfully.' });
        setTimeout(() => setActionNotice(null), 3000);
      }
    } catch (err) {
      console.error('Error deleting ticket:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Quick reply snippet insertions
  const insertTemplate = (templateText: string) => {
    setReplyMessage(prev => prev ? `${prev}\n\n${templateText}` : templateText);
  };

  // Filtered tickets
  const filteredTickets = tickets.filter(t => {
    const matchesSearch = 
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.userEmail && t.userEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      t.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Calculate ticket counts
  const totalCount = tickets.length;
  const openCount = tickets.filter(t => t.status === 'open').length;
  const pendingCount = tickets.filter(t => t.status === 'pending').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length;

  const categories = Array.from(new Set(tickets.map(t => t.category).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Notice Banner */}
      {actionNotice && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-semibold animate-fade-in ${
          actionNotice.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-500/20'
        }`}>
          {actionNotice.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          )}
          <span>{actionNotice.text}</span>
        </div>
      )}

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div 
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-white dark:bg-zinc-900 border-blue-500 ring-2 ring-blue-500/10 shadow-sm'
              : 'bg-white/60 dark:bg-zinc-950/60 border-slate-200 dark:border-zinc-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Tickets</span>
            <Inbox className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 dark:text-zinc-100">{totalCount}</span>
            <span className="text-[10px] text-slate-400 font-medium">all time</span>
          </div>
        </div>

        <div 
          onClick={() => setStatusFilter('open')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'open'
              ? 'bg-white dark:bg-zinc-900 border-blue-500 ring-2 ring-blue-500/10 shadow-sm'
              : 'bg-white/60 dark:bg-zinc-950/60 border-slate-200 dark:border-zinc-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Open Tickets</span>
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-display text-blue-600 dark:text-blue-400">{openCount}</span>
            <span className="text-[10px] text-slate-400 font-medium">awaiting admin</span>
          </div>
        </div>

        <div 
          onClick={() => setStatusFilter('pending')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'pending'
              ? 'bg-white dark:bg-zinc-900 border-amber-500 ring-2 ring-amber-500/10 shadow-sm'
              : 'bg-white/60 dark:bg-zinc-950/60 border-slate-200 dark:border-zinc-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">In Progress</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-display text-amber-600 dark:text-amber-400">{pendingCount}</span>
            <span className="text-[10px] text-slate-400 font-medium">under review</span>
          </div>
        </div>

        <div 
          onClick={() => setStatusFilter('resolved')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'resolved'
              ? 'bg-white dark:bg-zinc-900 border-emerald-500 ring-2 ring-emerald-500/10 shadow-sm'
              : 'bg-white/60 dark:bg-zinc-950/60 border-slate-200 dark:border-zinc-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Resolved</span>
            <CheckCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-display text-emerald-600 dark:text-emerald-400">{resolvedCount}</span>
            <span className="text-[10px] text-slate-400 font-medium">closed</span>
          </div>
        </div>
      </div>

      {/* Main Ticket Console Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Tickets Directory */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Search & Filters Header */}
          <div className="bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-3 shadow-sm">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket subject, email, or content..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter controls row */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
                {(['all', 'open', 'pending', 'resolved'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all cursor-pointer shrink-0 ${
                      statusFilter === st
                        ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Category Filter */}
              {categories.length > 0 && (
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-2 py-1 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-zinc-300 outline-none cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Tickets List */}
          <div className="space-y-2.5 max-h-[650px] overflow-y-auto pr-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-3">
                <RefreshCw className="h-6 w-6 text-blue-500 animate-spin" />
                <p className="text-xs text-slate-400 font-medium">Loading customer support tickets...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 space-y-2">
                <MessageSquare className="h-8 w-8 text-slate-300 mx-auto mb-1" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200">No Tickets Found</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                    ? 'No support tickets match your active search or status filters.'
                    : 'Great job! No support tickets are registered yet.'}
                </p>
                {(searchQuery || statusFilter !== 'all' || categoryFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      setCategoryFilter('all');
                    }}
                    className="mt-2 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const isSelected = ticket.id === selectedTicketId;
                const replyCount = ticket.replies?.length || 1;
                const lastReply = ticket.replies && ticket.replies.length > 0 
                  ? ticket.replies[ticket.replies.length - 1] 
                  : null;

                return (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-blue-50/70 dark:bg-blue-950/25 border-blue-500 dark:border-blue-500 shadow-sm ring-1 ring-blue-500/20'
                        : 'bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    {/* Active Left Indicator Bar */}
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-l-2xl" />
                    )}

                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        {/* Status & Category Row */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                            ticket.status === 'open'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-500/20'
                              : ticket.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-500/20'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-500/20'
                          }`}>
                            {ticket.status}
                          </span>

                          <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 flex items-center gap-1 bg-slate-100 dark:bg-zinc-900 px-2 py-0.5 rounded-md">
                            <Tag className="h-2.5 w-2.5" />
                            {ticket.category}
                          </span>

                          <span className="text-[10px] text-slate-400 font-mono ml-auto">
                            {new Date(ticket.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>

                        {/* Subject */}
                        <h4 className={`text-xs font-bold truncate leading-snug ${
                          isSelected ? 'text-blue-900 dark:text-blue-200' : 'text-slate-900 dark:text-zinc-100'
                        }`}>
                          {ticket.subject}
                        </h4>

                        {/* User Email & Snippet */}
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-zinc-400">
                          <Mail className="h-3 w-3 shrink-0 text-slate-400" />
                          <span className="truncate font-medium">{ticket.userEmail || 'Visitor'}</span>
                        </div>

                        {/* Message Preview */}
                        <p className="text-[11px] text-slate-400 dark:text-zinc-500 line-clamp-1 leading-relaxed">
                          {lastReply ? lastReply.message : ticket.message}
                        </p>
                      </div>

                      {/* Reply Count Bubble */}
                      <div className="flex flex-col items-end shrink-0 gap-2">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 text-[10px] font-bold rounded-full flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {replyCount}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Ticket Details & Reply Thread */}
        <div className="lg:col-span-7">
          {selectedTicket ? (
            <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xl overflow-hidden flex flex-col min-h-[600px]">
              
              {/* Ticket Top Header & Actions */}
              <div className="p-5 sm:p-6 bg-slate-50/80 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        selectedTicket.status === 'open'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-500/20'
                          : selectedTicket.status === 'pending'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-500/20'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-500/20'
                      }`}>
                        Status: {selectedTicket.status.toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-zinc-400 font-semibold bg-white dark:bg-zinc-800 px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-zinc-700">
                        {selectedTicket.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Ticket ID: {selectedTicket.id}
                      </span>
                    </div>

                    <h2 className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-zinc-50 pt-1">
                      {selectedTicket.subject}
                    </h2>
                  </div>

                  {/* Quick Action Status Changer */}
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      disabled={statusActionLoading}
                      value={selectedTicket.status}
                      onChange={(e) => handleUpdateStatus(selectedTicket.id, e.target.value as any)}
                      className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-200 outline-none cursor-pointer focus:border-blue-500"
                    >
                      <option value="open">🔵 Set Status: Open</option>
                      <option value="pending">🟡 Set Status: Pending Review</option>
                      <option value="resolved">🟢 Set Status: Resolved</option>
                    </select>

                    {deleteConfirmId === selectedTicket.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDeleteTicket(selectedTicket.id)}
                          disabled={isDeleting}
                          className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all disabled:opacity-50"
                        >
                          {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1.5 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-lg text-xs font-medium cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(selectedTicket.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-zinc-800"
                        title="Delete Ticket"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Submitter Info Card */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-zinc-400 bg-white/70 dark:bg-zinc-950/70 p-3 rounded-xl border border-slate-200 dark:border-zinc-800/80">
                  <div className="flex items-center gap-1.5">
                    <UserIcon className="h-3.5 w-3.5 text-blue-500" />
                    <span className="font-semibold text-slate-800 dark:text-zinc-200">Customer:</span>
                    <span>{selectedTicket.userEmail || 'Anonymous Visitor'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>Filed on {new Date(selectedTicket.date).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Message History Thread */}
              <div className="flex-1 p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[420px] bg-slate-50/30 dark:bg-zinc-950/30">
                {selectedTicket.replies && selectedTicket.replies.length > 0 ? (
                  selectedTicket.replies.map((reply, idx) => {
                    const isSupport = reply.sender === 'support';
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col max-w-[88%] rounded-2xl p-4 text-xs sm:text-sm shadow-sm space-y-2 ${
                          isSupport
                            ? 'bg-purple-600 text-white rounded-br-none ml-auto border border-purple-500/30'
                            : 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 rounded-bl-none mr-auto'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 border-b pb-1.5 border-white/20 dark:border-zinc-800">
                          <span className={`text-[10px] font-extrabold flex items-center gap-1 uppercase tracking-wider ${
                            isSupport ? 'text-purple-100' : 'text-blue-600 dark:text-blue-400'
                          }`}>
                            {isSupport ? (
                              <>
                                <ShieldCheck className="h-3.5 w-3.5 text-amber-300" />
                                <span>Official Support Response (Admin)</span>
                              </>
                            ) : (
                              <>
                                <UserIcon className="h-3.5 w-3.5" />
                                <span>{selectedTicket.userEmail || 'Customer Inquiry'}</span>
                              </>
                            )}
                          </span>
                          <span className={`text-[9px] font-mono ${isSupport ? 'text-purple-200' : 'text-slate-400'}`}>
                            {new Date(reply.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                          </span>
                        </div>

                        <p className="leading-relaxed whitespace-pre-wrap font-sans font-normal">
                          {reply.message}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800">
                    <p className="text-sm text-slate-700 dark:text-zinc-300">{selectedTicket.message}</p>
                  </div>
                )}
              </div>

              {/* Quick Reply Presets / Templates */}
              <div className="px-5 py-2.5 bg-slate-100/70 dark:bg-zinc-900/40 border-t border-slate-200 dark:border-zinc-800 flex items-center gap-1.5 overflow-x-auto text-[11px]">
                <span className="font-bold text-slate-400 shrink-0 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-purple-500" /> Quick Replies:
                </span>
                <button
                  type="button"
                  onClick={() => insertTemplate("Hello, thank you for reaching out! We have investigated the issue and pushed a fix. Please try again and let us know if everything works smoothly.")}
                  className="px-2.5 py-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700 font-medium cursor-pointer shrink-0"
                >
                  Issue Resolved &amp; Fixed
                </button>
                <button
                  type="button"
                  onClick={() => insertTemplate("Could you please provide the original file format, approximate size, and which browser or device you were using when this error occurred?")}
                  className="px-2.5 py-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700 font-medium cursor-pointer shrink-0"
                >
                  Request File Info
                </button>
                <button
                  type="button"
                  onClick={() => insertTemplate("Thank you for your valuable suggestion! Our engineering team has logged this request in our feature roadmap.")}
                  className="px-2.5 py-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700 font-medium cursor-pointer shrink-0"
                >
                  Feature Feedback Logged
                </button>
              </div>

              {/* Admin Reply Composer Form */}
              <form onSubmit={handleSendAdminReply} className="p-4 sm:p-5 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                  <span className="font-bold flex items-center gap-1 text-purple-600 dark:text-purple-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Replying as Admin to {selectedTicket.userEmail || 'Customer'}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-400">Set status to:</span>
                    <select
                      value={targetStatusOnReply}
                      onChange={(e) => setTargetStatusOnReply(e.target.value as any)}
                      className="px-2 py-0.5 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-md text-[11px] font-bold text-slate-700 dark:text-zinc-300 outline-none cursor-pointer"
                    >
                      <option value="resolved">🟢 Resolved (Default)</option>
                      <option value="pending">🟡 Pending User Follow-up</option>
                      <option value="open">🔵 Keep Open</option>
                    </select>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    rows={3}
                    required
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        e.preventDefault();
                        handleSendAdminReply();
                      }
                    }}
                    placeholder="Type your official administrative reply here... (Press Ctrl+Enter to send)"
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 rounded-xl outline-none focus:border-purple-500 dark:text-zinc-100 text-xs sm:text-sm resize-none placeholder:text-slate-400"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400">
                    Press <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-zinc-800 rounded font-mono border border-slate-200 dark:border-zinc-700">Ctrl + Enter</kbd> to quick-send
                  </span>

                  <button
                    type="submit"
                    disabled={isSendingReply || !replyMessage.trim()}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 dark:disabled:bg-zinc-800 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:cursor-not-allowed"
                  >
                    {isSendingReply ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Sending Reply...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Send Official Reply</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-900 text-slate-400 mx-auto flex items-center justify-center">
                <Ticket className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">No Ticket Selected</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Select a ticket from the left panel to review message threads, send official support responses, and manage ticket status.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
