import SEO from './SEO';
import React, { useState } from 'react';
import { Check, ShieldAlert, Sparkles, Receipt, CreditCard, Ticket, Loader2 } from 'lucide-react';
import { Plan, User } from '../types';

interface PricingViewProps {
  user: User | null;
  onLoginRequest: () => void;
  onSubscriptionUpdated: (newSub: 'free' | 'pro' | 'enterprise') => void;
}

export default function PricingView({ user, onLoginRequest, onSubscriptionUpdated }: PricingViewProps) {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [coupon, setCoupon] = useState('');
  const [couponMessage, setCouponMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [discount, setDiscount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Checkout card details
  const [cardNum, setCardNum] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  
  // Invoice state after successful purchase
  const [invoice, setInvoice] = useState<any>(null);

  const plans: Plan[] = [
    {
      id: 'p_free',
      name: 'Basic Suite',
      price: '$0',
      period: 'month',
      features: [
        'Access to 25+ PDF, Image, and Text tools',
        'Max 5 file conversions per day',
        'Up to 10MB per file upload limit',
        'Standard processing speeds',
        'Ad-supported experience',
      ],
      color: 'border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-slate-100',
    },
    {
      id: 'p_pro',
      name: 'Pro Member',
      price: '$9',
      period: 'month',
      features: [
        'Unrestricted, unlimited conversions',
        'Generous 2GB file upload size limits',
        'Gemini AI suite (OCR, Summarizer, Translation)',
        'Sign, password protect, and secure PDFs',
        'Ad-free workspace with ultra-fast servers',
        'Priority 24/7 Email and chat support',
      ],
      popular: true,
      color: 'border-blue-500 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/30',
    },
    {
      id: 'p_enterprise',
      name: 'Enterprise API',
      price: '$49',
      period: 'month',
      features: [
        'All Pro Member benefits included',
        'Full REST API access with custom API keys',
        'Team management dashboard (up to 20 seats)',
        'Custom watermark and brand integrations',
        '99.9% uptime SLA and dedicated account managers',
        'Custom billing and invoicing terms',
      ],
      color: 'border-purple-500 text-purple-600 dark:text-purple-400 ring-1 ring-purple-500/20',
    }
  ];

  const handleApplyCoupon = async () => {
    if (!coupon.trim()) return;
    try {
      const response = await fetch('/api/billing/coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: coupon }),
      });
      const data = await response.json();
      if (response.ok) {
        setDiscount(data.discount);
        setCouponMessage({ type: 'success', text: data.message });
      } else {
        setCouponMessage({ type: 'error', text: data.message });
      }
    } catch (e) {
      setCouponMessage({ type: 'error', text: 'Error applying discount code.' });
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onLoginRequest();
      return;
    }
    if (!selectedPlan) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          email: user.email,
          couponCode: discount === 100 ? 'FREEPRO' : coupon,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setInvoice(data.invoice);
        onSubscriptionUpdated(selectedPlan.id === 'p_enterprise' ? 'enterprise' : 'pro');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateTotal = (priceStr: string): string => {
    const priceNum = parseFloat(priceStr.replace('$', ''));
    if (isNaN(priceNum)) return '0.00';
    const discounted = priceNum * (1 - discount / 100);
    return discounted.toFixed(2);
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <SEO title="Pricing Plans | PDF Toolkit Pro" description="Choose the right plan for your PDF processing needs. Free tier available." canonical="/pricing" />
      
      {/* Heading */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50 mb-4 sm:text-5xl">
          Simple, Honest Pricing.
        </h1>
        <p className="text-lg text-slate-500 dark:text-zinc-400">
          Unleash unlimited power with Pro. Save with 100% off coupon code <span className="font-mono bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded font-bold">FREEPRO</span> for evaluation!
        </p>
      </div>

      {invoice ? (
        /* Invoice Receipt Display */
        <div className="max-w-xl mx-auto bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-8 shadow-xl">
          <div className="flex justify-center mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <Receipt className="h-6 w-6" />
            </div>
          </div>
          <h2 className="text-2xl font-bold font-display text-center text-slate-900 dark:text-zinc-100 mb-2">
            Payment Successful!
          </h2>
          <p className="text-center text-slate-400 dark:text-zinc-500 text-sm mb-6">
            Your Pro privileges have been unlocked instantly on your account.
          </p>

          <div className="border-t border-b border-slate-100 dark:border-zinc-900 py-4 mb-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400 dark:text-zinc-500">Invoice Number:</span>
              <span className="font-mono font-medium text-slate-800 dark:text-zinc-200">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400 dark:text-zinc-500">Transaction ID:</span>
              <span className="font-mono font-medium text-slate-800 dark:text-zinc-200">{invoice.transactionId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400 dark:text-zinc-500">Plan Purchased:</span>
              <span className="font-medium text-slate-800 dark:text-zinc-200">{invoice.planName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400 dark:text-zinc-500">Date/Time (UTC):</span>
              <span className="text-slate-800 dark:text-zinc-200">{new Date(invoice.date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400 dark:text-zinc-500">Billing Account:</span>
              <span className="text-slate-800 dark:text-zinc-200">{invoice.email}</span>
            </div>
            <div className="border-t border-dashed border-slate-200 dark:border-zinc-800 pt-3 flex justify-between text-base font-bold">
              <span className="text-slate-800 dark:text-zinc-100">Amount Paid:</span>
              <span className="text-emerald-600 dark:text-emerald-400">{invoice.amountPaid}</span>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => {
                setInvoice(null);
                setSelectedPlan(null);
                setDiscount(0);
                setCoupon('');
                setCouponMessage(null);
              }}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 text-sm cursor-pointer transition-colors"
            >
              Back to Pricing
            </button>
            <button
              onClick={() => window.print()}
              className="rounded-xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-700 dark:text-zinc-200 font-medium px-4 py-3 text-sm cursor-pointer transition-colors"
            >
              Print Receipt
            </button>
          </div>
        </div>
      ) : selectedPlan ? (
        /* Dynamic Checkout Form */
        <div className="max-w-lg mx-auto bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-8 shadow-xl">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-bold font-display text-slate-900 dark:text-zinc-100">
              Checkout & Activation
            </h2>
            <button
              onClick={() => { setSelectedPlan(null); setDiscount(0); setCoupon(''); setCouponMessage(null); }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 text-sm cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl mb-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-slate-800 dark:text-zinc-200">{selectedPlan.name}</p>
                <p className="text-xs text-slate-400 dark:text-zinc-500">Billed monthly (cancel anytime)</p>
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-zinc-100">{selectedPlan.price}</p>
            </div>
            
            {discount > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-zinc-800 flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <span>Discount applied ({discount}%):</span>
                <span>-${(parseFloat(selectedPlan.price.replace('$', '')) * discount / 100).toFixed(2)}</span>
              </div>
            )}
            
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-zinc-800 flex justify-between font-bold text-slate-800 dark:text-zinc-100">
              <span>Total Price:</span>
              <span>${calculateTotal(selectedPlan.price)}</span>
            </div>
          </div>

          {/* Coupon Entry */}
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">
              Have a Promo Code?
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Ticket className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. FREEPRO"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 rounded-xl outline-none focus:border-blue-500 font-mono text-sm uppercase dark:text-zinc-100"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyCoupon}
                className="bg-slate-800 dark:bg-zinc-800 hover:bg-slate-700 hover:dark:bg-zinc-700 text-white font-medium text-xs rounded-xl px-4 cursor-pointer transition-colors"
              >
                Apply
              </button>
            </div>
            {couponMessage && (
              <p className={`mt-2 text-xs font-medium ${
                couponMessage.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
              }`}>
                {couponMessage.text}
              </p>
            )}
          </div>

          {/* Checkout Credit Card Form */}
          <form onSubmit={handleCheckout} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">
                Cardholder Email
              </label>
              <input
                type="email"
                required
                disabled
                value={user ? user.email : 'Sign in to subscribe'}
                className="w-full px-3 py-2.5 border border-slate-100 dark:border-zinc-900 bg-slate-100/50 dark:bg-zinc-900 text-slate-500 rounded-xl outline-none"
              />
            </div>

            {parseFloat(calculateTotal(selectedPlan.price)) > 0 && (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">
                    Card Number
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="4111 2222 3333 4444"
                      value={cardNum}
                      onChange={(e) => setCardNum(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 rounded-xl outline-none focus:border-blue-500 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">
                      Expiration Code
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 rounded-xl outline-none focus:border-blue-500 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">
                      Security Code (CVC)
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="123"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 rounded-xl outline-none focus:border-blue-500 dark:text-zinc-100"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isProcessing || !user}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:dark:bg-zinc-800 text-white font-medium py-3 rounded-xl cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Activating Subscription...
                </>
              ) : !user ? (
                'Sign In to Subscribe'
              ) : (
                `Activate Pro Membership - $${calculateTotal(selectedPlan.price)}`
              )}
            </button>
          </form>
        </div>
      ) : (
        /* Plans Grid */
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {plans.map((p) => {
            const isUserCurrent = user?.subscription === p.id || (!user?.subscription && p.id === 'p_free');
            return (
              <div 
                key={p.id}
                className={`relative flex flex-col p-8 bg-white dark:bg-zinc-950 rounded-2xl border ${p.color} transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1`}
              >
                {p.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-xs uppercase px-4 py-1.5 rounded-full shadow-md shadow-blue-500/20">
                    <Sparkles className="h-3.5 w-3.5" />
                    RECOMMENDED
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="font-display text-2xl font-bold text-slate-900 dark:text-zinc-50 mb-2">
                    {p.name}
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50">{p.price}</span>
                    <span className="text-sm text-slate-400 dark:text-zinc-500">/{p.period}</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8 flex-1">
                  {p.features.map((feat, i) => (
                    <li key={i} className="flex gap-2.5 text-slate-600 dark:text-zinc-300 text-sm">
                      <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <button
                  id={`select-plan-${p.id}`}
                  onClick={() => {
                    if (p.id === 'p_free') return;
                    if (!user) {
                      onLoginRequest();
                    } else {
                      setSelectedPlan(p);
                    }
                  }}
                  disabled={isUserCurrent || p.id === 'p_free'}
                  className={`w-full py-3 rounded-xl font-semibold text-sm cursor-pointer transition-all ${
                    isUserCurrent
                      ? 'bg-slate-100 dark:bg-zinc-900 text-slate-400 cursor-not-allowed border border-dashed border-slate-200 dark:border-zinc-800'
                      : p.popular
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10'
                      : 'border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-700 dark:text-zinc-200'
                  }`}
                >
                  {isUserCurrent ? 'Your Active Plan' : p.id === 'p_free' ? 'Default Access' : 'Select Plan'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
