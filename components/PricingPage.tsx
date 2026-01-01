
import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Shield, Loader2, Star, Zap, Crown, CheckCircle2, ArrowRight, Lock, ScanLine, Smartphone, QrCode } from 'lucide-react';
import { UserPlan } from '../types';
import { createPaymentOrder, checkPaymentStatus, PaymentStatus } from '../services/payment';

interface PricingPageProps {
  currentPlan: UserPlan;
  onUpgrade: (plan: UserPlan) => void;
  onCancel: () => void;
}

const PricingPage: React.FC<PricingPageProps> = ({ currentPlan, onUpgrade, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [successPlanName, setSuccessPlanName] = useState('');
  const [showFamPayModal, setShowFamPayModal] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<any>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
      return () => {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      };
  }, []);

  const plans = [
    {
      id: UserPlan.FREE,
      name: 'Free',
      price: 0,
      icon: Star,
      features: [
        'Limit: 3 File Uploads',
        'Quick Summary Study Guides',
        'Basic Flashcards',
        'Standard Quiz Mode',
        'Chat with Document',
        'Study Planner (Basic)'
      ],
      missing: [
        'Viva Examiner (Voice Mode)',
        'Detailed & Advanced Guides',
        'Knowledge Graph',
        'Audio Podcast Generation',
        'Essay Grader',
        'Debate Arena'
      ]
    },
    {
      id: UserPlan.SCHOLAR,
      name: 'Scholar',
      price: billingCycle === 'monthly' ? 499 : 4999, // INR Prices
      popular: true,
      icon: Zap,
      features: [
        'Limit: 15 File Uploads',
        'Everything in Free',
        'Viva Examiner (Voice Mode)',
        'Detailed Study Guides',
        'Essay Grader',
        'Debate Arena',
        'Knowledge Graph',
        'Unlimited Quizzes'
      ],
      missing: [
        'Advanced Deep Dive Guides',
        'Audio Podcast Generation (Genius Only)',
        'Priority Support'
      ]
    },
    {
      id: UserPlan.GENIUS,
      name: 'Genius',
      price: billingCycle === 'monthly' ? 999 : 9999, // INR Prices
      icon: Crown,
      features: [
        'Unlimited File Uploads',
        'Everything in Scholar',
        'Advanced Deep Dive Guides',
        'Audio Podcast Generation',
        'Custom Study Personas',
        'Priority API Access',
        'Early Access to New Features'
      ],
      missing: []
    }
  ];

  const startPolling = (orderId: string, planName: string, planId: UserPlan) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    
    pollIntervalRef.current = setInterval(async () => {
        const result = await checkPaymentStatus(orderId);
        if (result.success && result.status === 'paid') {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setSuccessPlanName(planName);
            setPaymentSuccess(true);
            setShowFamPayModal(false);
            setTimeout(() => onUpgrade(planId), 2000);
        }
    }, 2000);
  };

  const handlePaymentInitiate = async (plan: any) => {
    if (plan.id === UserPlan.FREE) {
        onUpgrade(UserPlan.FREE);
        return;
    }
    
    setPendingPlan(plan);
    setLoading(true);
    setShowFamPayModal(true);
    
    // Create Order via Server/Service
    const orderData = await createPaymentOrder({ id: plan.id, price: plan.price, name: plan.name });
    
    if (orderData.success) {
        setCurrentOrderId(orderData.orderId);
        // Generate QR Code URL using a public API for display
        const qr = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(orderData.upiString)}`;
        setQrUrl(qr);
        setLoading(false);
        
        // Start Polling for success
        startPolling(orderData.orderId, plan.name, plan.id);
    } else {
        alert("Failed to initiate payment. Please try again.");
        setShowFamPayModal(false);
        setLoading(false);
    }
  };

  const closeModal = () => {
      setShowFamPayModal(false);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
  };

  if (paymentSuccess) {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl shadow-xl p-10 text-center max-w-md w-full animate-in zoom-in-95 duration-300">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                <h3 className="text-3xl font-bold text-slate-800 mb-2">Payment Successful!</h3>
                <p className="text-slate-500 mb-8">
                    Welcome to <strong>{successPlanName}</strong>. Unlocking your new powers now...
                </p>
                <div className="flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 relative">
      
      {/* FamPay / UPI Modal */}
      {showFamPayModal && pendingPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-[#1a1a1a] rounded-3xl w-full max-w-sm overflow-hidden text-white shadow-2xl border border-gray-800 animate-in zoom-in-95">
                  {/* FamPay Header Style */}
                  <div className="bg-black p-4 flex justify-between items-center border-b border-gray-800">
                      <div className="flex items-center gap-2">
                         <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-black font-bold text-lg">F</div>
                         <span className="font-bold text-lg">FamX Pay</span>
                      </div>
                      <button onClick={closeModal} className="p-2 hover:bg-gray-800 rounded-full">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <div className="p-8 text-center">
                      <p className="text-gray-400 text-sm mb-1">Paying VivaMentor</p>
                      <h3 className="text-4xl font-bold mb-6">₹{pendingPlan.price}</h3>

                      <div className="bg-white p-4 rounded-xl mb-6 mx-auto w-48 h-48 flex items-center justify-center relative overflow-hidden">
                          {loading ? (
                              <Loader2 className="w-12 h-12 text-black animate-spin" />
                          ) : qrUrl ? (
                              <img src={qrUrl} alt="Payment QR" className="w-full h-full object-contain" />
                          ) : (
                              <div className="w-full h-full bg-black flex items-center justify-center text-white">
                                  <ScanLine className="w-20 h-20 animate-pulse" />
                              </div>
                          )}
                          
                          {/* Scan Line Animation */}
                          {!loading && qrUrl && (
                             <div className="absolute inset-0 border-t-2 border-yellow-400 animate-[scan_2s_infinite] bg-gradient-to-b from-yellow-400/20 to-transparent"></div>
                          )}
                      </div>
                      
                      {!loading && (
                          <div className="flex items-center justify-center gap-2 text-xs text-yellow-400 font-medium mb-6 animate-pulse">
                              <Loader2 className="w-3 h-3 animate-spin" /> Waiting for payment...
                          </div>
                      )}

                      <p className="text-xs text-gray-500 max-w-[200px] mx-auto">
                          Scan with any UPI app (FamPay, GPay, PhonePe) to complete your purchase.
                      </p>
                      
                      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-600">
                          <Shield className="w-3 h-3" /> Secured by FamPay
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Pricing Header */}
      <div className="bg-slate-900 pt-20 pb-32 px-4 rounded-b-[3rem] text-center text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
          <div className="relative z-10 max-w-4xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Upgrade your learning potential</h2>
              <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
                  Unlock advanced AI models, real-time voice examiners, and deep-dive analytics to master any subject faster.
              </p>
              
              <div className="inline-flex items-center bg-slate-800 p-1 rounded-full border border-slate-700 mb-8">
                  <button 
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${billingCycle === 'monthly' ? 'bg-teal-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                  >
                      Monthly
                  </button>
                  <button 
                    onClick={() => setBillingCycle('yearly')}
                    className={`px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${billingCycle === 'yearly' ? 'bg-teal-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                  >
                      Yearly <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded uppercase">Save 20%</span>
                  </button>
              </div>
          </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-6xl mx-auto px-4 -mt-20 relative z-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {plans.map((plan) => {
                  const isCurrent = currentPlan === plan.id;
                  const isPopular = plan.popular;

                  return (
                      <div 
                        key={plan.id}
                        className={`bg-white rounded-2xl p-8 shadow-xl border relative flex flex-col ${
                            isPopular 
                            ? 'border-teal-500 ring-4 ring-teal-500/10 scale-105 z-10' 
                            : 'border-slate-100 hover:border-slate-200'
                        }`}
                      >
                          {isPopular && (
                              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
                                  Most Popular
                              </div>
                          )}

                          <div className="mb-6">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                                  plan.id === UserPlan.GENIUS ? 'bg-purple-100 text-purple-600' :
                                  plan.id === UserPlan.SCHOLAR ? 'bg-teal-100 text-teal-600' :
                                  'bg-slate-100 text-slate-600'
                              }`}>
                                  <plan.icon className="w-6 h-6" />
                              </div>
                              <h3 className="text-xl font-bold text-slate-800">{plan.name}</h3>
                              <div className="mt-2 flex items-baseline gap-1">
                                  <span className="text-4xl font-bold text-slate-900">₹{plan.price}</span>
                                  <span className="text-slate-400">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                              </div>
                              <p className="text-sm text-slate-500 mt-2">
                                  {plan.id === UserPlan.FREE ? 'For casual learners.' : 
                                   plan.id === UserPlan.SCHOLAR ? 'For serious students.' : 
                                   'For power users & researchers.'}
                              </p>
                          </div>

                          <div className="flex-1 space-y-4 mb-8">
                              {plan.features.map((feat, i) => (
                                  <div key={i} className="flex items-start gap-3 text-sm text-slate-600">
                                      <Check className="w-5 h-5 text-teal-500 flex-shrink-0" />
                                      {feat}
                                  </div>
                              ))}
                              {plan.missing.map((feat, i) => (
                                  <div key={i} className="flex items-start gap-3 text-sm text-slate-400 opacity-60">
                                      <X className="w-5 h-5 text-slate-300 flex-shrink-0" />
                                      {feat}
                                  </div>
                              ))}
                          </div>

                          <div className="space-y-4">
                            <button
                                onClick={() => handlePaymentInitiate(plan)}
                                disabled={isCurrent || loading}
                                className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                                    isCurrent 
                                    ? 'bg-slate-100 text-slate-400 cursor-default' 
                                    : isPopular 
                                        ? 'bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-500/30 hover:scale-[1.02]' 
                                        : 'bg-slate-900 hover:bg-slate-800 text-white hover:scale-[1.02]'
                                }`}
                            >
                                {isCurrent ? (
                                    'Current Plan'
                                ) : (
                                    <>Choose {plan.name} <ArrowRight className="w-4 h-4" /></>
                                )}
                            </button>

                            {!isCurrent && (
                                <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                                    <QrCode className="w-3 h-3" /> Scan & Pay via FamPay
                                </div>
                            )}
                          </div>
                      </div>
                  );
              })}
          </div>
          
          <div className="mt-12 text-center">
              <button onClick={onCancel} className="text-slate-500 hover:text-slate-800 font-medium">
                  Go back to Dashboard
              </button>
          </div>
      </div>
    </div>
  );
};

export default PricingPage;
