import SEO from './SEO';
import React, { useState, useEffect } from 'react';
import { Ticket, Send, MessageSquare, ShieldAlert, CheckCircle2, Clock, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { SupportTicket, User } from '../types';

interface ContactViewProps {
  user: User | null;
  onLoginRequest: () => void;
}

export default function ContactView({ user, onLoginRequest }: ContactViewProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Submit Ticket form
  const [emailInput, setEmailInput] = useState(user?.email || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('Feedback');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Message reply
  const [replyMessage, setReplyMessage] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  // Sync email input when logged-in user changes
  useEffect(() => {
    if (user) {
      setEmailInput(user.email);
    }
  }, [user]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/support/tickets');
      const data = await res.json();
      const allTickets: SupportTicket[] = data.tickets || [];
      
      if (user && user.role === 'admin') {
        setTickets(allTickets);
      } else {
        // Normal visitors see only their own tickets tracked via localStorage
        const submittedIds: string[] = JSON.parse(localStorage.getItem('my_support_tickets') || '[]');
        const visitorTickets = allTickets.filter(t => submittedIds.includes(t.id));
        setTickets(visitorTickets);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [user]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalEmail = user?.email || emailInput.trim();
    if (!finalEmail) {
      alert('Please provide a valid email address.');
      return;
    }
    if (!message.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          subject: subject || `Problem Report from ${finalEmail.split('@')[0]}`, 
          message, 
          category,
          email: finalEmail 
        }),
      });
      if (res.ok) {
        const data = await res.json();
        
        // Save ticket ID in localStorage for tracking
        if (data.ticket && data.ticket.id) {
          const submittedIds: string[] = JSON.parse(localStorage.getItem('my_support_tickets') || '[]');
          submittedIds.push(data.ticket.id);
          localStorage.setItem('my_support_tickets', JSON.stringify(submittedIds));
        }

        setSubject('');
        setMessage('');
        setSubmitSuccess(true);
        fetchTickets();
        setTimeout(() => setSubmitSuccess(false), 5000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    setIsReplying(true);
    try {
      // User reply
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyMessage, sender: 'user' }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data.ticket);
        setReplyMessage('');
        fetchTickets();

        // Simulate an automated support response
        setTimeout(async () => {
          try {
            await fetch(`/api/support/tickets/${selectedTicket.id}/reply`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                message: "Thank you for your update! Our support team has been notified and we are reviewing your ticket. We will update you here soon.", 
                sender: 'support' 
              }),
            });
            fetchTickets();
            // Refresh detail view
            const freshTicketRes = await fetch('/api/support/tickets');
            const freshData = await freshTicketRes.json();
            const matchingTicket = freshData.tickets.find((t: any) => t.id === selectedTicket.id);
            if (matchingTicket) {
              setSelectedTicket(matchingTicket);
            }
          } catch (e) {
            console.error(e);
          }
        }, 1200);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsReplying(false);
    }
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 xl:px-12">
      <SEO 
        title="Support & Helpdesk Tickets | PDF Toolkit Pro" 
        description="Submit a technical support ticket or track filed issues and developer comments in real-time." 
        canonical="https://pdftoolkitpro.online/tickets" 
        keywords={['submit support ticket', 'PDF Toolkit Pro support', 'PDF helpdesk tickets', 'developer support']}
      />
      
      <div className="w-full max-w-[1850px] mx-auto mb-8 text-center sm:text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-display text-slate-900 dark:text-zinc-50 tracking-tight sm:text-4xl">
            Support &amp; Helpdesk Tickets
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
            Submit an engineering support ticket or track live replies from our technical team.
          </p>
        </div>
        <a 
          href="/contact"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 rounded-xl text-xs font-semibold transition-colors shrink-0"
        >
          <span>Need General Contact / Email?</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="w-full max-w-[1850px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Ticket Submission / Creation Form */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-950 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xl">
          <h2 className="text-2xl font-bold font-display text-slate-900 dark:text-zinc-50 mb-2">
            Submit a Support Ticket
          </h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mb-6">
            Experiencing conversion or processing issues? Detail your problem below, and our engineering team will assist you.
          </p>

          {submitSuccess && (
            <div className="mb-6 flex items-center gap-2.5 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 p-4 rounded-xl border border-emerald-500/20">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              <div>
                <p>Support ticket filed successfully!</p>
                <p className="font-normal text-[10px] text-slate-400">View thread status under Your Tickets section.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleCreateTicket} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Your Email Address
              </label>
              <input
                type="email"
                required
                disabled={!!user}
                placeholder="you@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 rounded-xl outline-none focus:border-blue-500 dark:text-zinc-100 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Ticket Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 rounded-xl outline-none focus:border-blue-500 dark:text-zinc-100 text-sm"
              >
                <option value="Feedback">Suggestions & Feedback</option>
                <option value="AI Tools">AI Utilities (OCR, Translate, Summarizer)</option>
                <option value="PDF Manipulation">PDF Operations (Merge, Split, Watermark)</option>
                <option value="Billing">Billing & Stripe Checkout</option>
                <option value="API Keys">Developer & API Integration</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Subject
              </label>
              <input
                type="text"
                required
                placeholder="Unable to sign PDF on mobile"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 rounded-xl outline-none focus:border-blue-500 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Message Description / Problem Details
              </label>
              <textarea
                required
                rows={5}
                placeholder="Describe your error details, including file types and sizes..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 rounded-xl outline-none focus:border-blue-500 text-sm dark:text-zinc-100"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium py-3 rounded-xl cursor-pointer transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Filing Support Ticket...
                </>
              ) : (
                'Submit Support Ticket'
              )}
            </button>
          </form>
        </div>

        {/* Tickets Thread List */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex justify-between items-center bg-white dark:bg-zinc-950 px-6 py-4 rounded-xl border border-slate-200 dark:border-zinc-800">
            <h2 className="font-display font-bold text-lg text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Ticket className="h-5 w-5 text-blue-500" />
              Your Support Tickets ({tickets.length})
            </h2>
            <button
              onClick={fetchTickets}
              className="p-1.5 rounded-lg border border-slate-100 dark:border-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Refresh Tickets"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-900">
              <MessageSquare className="h-8 w-8 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">You do not have any filed support tickets.</p>
            </div>
          ) : selectedTicket ? (
            /* Selected Ticket Conversation Thread */
            <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xl overflow-hidden">
              <div className="p-4 sm:p-6 bg-slate-50 dark:bg-zinc-900/60 border-b border-slate-100 dark:border-zinc-900 flex justify-between items-start gap-4">
                <div>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 ${
                    selectedTicket.status === 'open'
                      ? 'bg-blue-100 text-blue-800'
                      : selectedTicket.status === 'pending'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {selectedTicket.status}
                  </span>
                  <h3 className="font-display font-bold text-base text-slate-900 dark:text-zinc-50 leading-snug">
                    {selectedTicket.subject}
                  </h3>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">{selectedTicket.category}</p>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  Close Thread
                </button>
              </div>

              {/* Message scroll list */}
              <div className="p-4 sm:p-6 space-y-4 max-h-[350px] overflow-y-auto bg-slate-50/20">
                {selectedTicket.replies.map((rep, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col max-w-[85%] rounded-2xl p-4 text-sm shadow-sm ${
                      rep.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none ml-auto'
                        : 'bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 border border-slate-100 dark:border-zinc-800 rounded-bl-none mr-auto'
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-line">{rep.message}</p>
                    <span className={`text-[9px] mt-1.5 self-end ${rep.sender === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                      {new Date(rep.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>

              {/* Reply box */}
              <form onSubmit={handleSendReply} className="p-4 border-t border-slate-100 dark:border-zinc-900 flex gap-2 bg-white dark:bg-zinc-950">
                <input
                  type="text"
                  required
                  placeholder="Type your reply message..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none text-sm dark:text-zinc-100 focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={isReplying}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl flex items-center justify-center cursor-pointer disabled:bg-slate-300"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          ) : (
            /* Ticket Quick Summary items */
            <div className="space-y-3">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className="group bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        t.status === 'open'
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                          : t.status === 'pending'
                          ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
                          : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                      }`}>
                        {t.status}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">{t.category}</span>
                    </div>
                    <h3 className="font-semibold text-slate-800 dark:text-zinc-200 group-hover:text-blue-600 truncate">
                      {t.subject}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1 line-clamp-1">{t.message}</p>
                  </div>

                  <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
