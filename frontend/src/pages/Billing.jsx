import { useState, useEffect } from 'react';
import {
  CheckIcon,
  CreditCardIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const planFeatures = {
  starter: {
    name: 'Starter',
    priceUSD: 'Free',
    priceINR: 'Free',
    period: '',
    description: 'For individual contractors getting started',
    features: [
      '3 proposals per month',
      'SAM.gov opportunity search',
      '9 proposal sections',
      'PDF export',
      'Demo mode',
    ],
  },
  professional: {
    name: 'Professional',
    priceUSD: '$49',
    priceINR: '₹3,999',
    period: '/month',
    description: 'For growing government contractors',
    features: [
      'Unlimited proposals',
      'All 18 proposal sections',
      'Interactive pricing builder',
      'PDF & DOCX export',
      'Template library (8+ templates)',
      'Priority AI generation',
    ],
    highlighted: true,
  },
  enterprise: {
    name: 'Enterprise',
    priceUSD: '$199',
    priceINR: '₹14,999',
    period: '/month',
    description: 'For large teams and agencies',
    features: [
      'Everything in Professional',
      'Multi-user team accounts',
      'Custom templates',
      'API access',
      'Dedicated support',
      'SSO / SAML integration',
    ],
  },
};

export default function Billing() {
  const { user } = useAuth();
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedGateway, setSelectedGateway] = useState('stripe');

  useEffect(() => {
    fetchPaymentConfig();
    // Check URL for payment result
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      setSuccess(`Successfully subscribed to the ${params.get('plan') || 'Professional'} plan!`);
    }
  }, []);

  const fetchPaymentConfig = async () => {
    try {
      const res = await api.get('/api/payments/config');
      setPaymentConfig(res.data);
      // Auto-select available gateway
      if (res.data.razorpay?.configured && !res.data.stripe?.configured) {
        setSelectedGateway('razorpay');
      }
    } catch {
      // ignore
    }
  };

  const handleSubscribe = async (plan) => {
    if (plan === 'starter') return;
    setLoading(true);
    setError('');

    try {
      if (selectedGateway === 'stripe') {
        const res = await api.post('/api/payments/stripe/checkout', {
          plan,
          base_url: window.location.origin,
        });
        // Redirect to Stripe Checkout
        window.location.href = res.data.checkout_url;
      } else {
        // Razorpay
        const res = await api.post('/api/payments/razorpay/order', { plan });
        openRazorpay(res.data, plan);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Payment failed. Please check payment gateway configuration.');
    } finally {
      setLoading(false);
    }
  };

  const openRazorpay = (orderData, plan) => {
    const options = {
      key: orderData.key_id,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'GovProposal AI',
      description: `${planFeatures[plan]?.name || 'Professional'} Plan Subscription`,
      order_id: orderData.order_id,
      handler: async function (response) {
        try {
          await api.post('/api/payments/razorpay/verify', {
            order_id: response.razorpay_order_id,
            payment_id: response.razorpay_payment_id,
            signature: response.razorpay_signature,
            plan,
          });
          setSuccess('Payment successful! Your subscription is now active.');
        } catch {
          setError('Payment verification failed. Please contact support.');
        }
      },
      prefill: {
        email: user?.email || '',
        name: user?.full_name || '',
      },
      theme: {
        color: '#1e3a5f',
      },
    };

    if (window.Razorpay) {
      const rzp = new window.Razorpay(options);
      rzp.open();
    } else {
      setError('Razorpay SDK not loaded. Please refresh the page.');
    }
  };

  const currentTier = user?.subscription_tier || 'free';

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy">Billing & Subscription</h1>
        <p className="text-gray-500 mt-1">
          Manage your subscription plan and payment method
        </p>
      </div>

      {/* Current Plan Banner */}
      <div className="bg-navy/5 border border-navy/10 rounded-xl p-5 mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Current Plan</p>
          <p className="text-xl font-bold text-navy">
            {currentTier === 'paid' ? 'Professional' : currentTier === 'free' ? 'Starter (Free)' : currentTier}
          </p>
        </div>
        {currentTier === 'paid' && (
          <span className="bg-accent text-white text-xs font-bold px-3 py-1.5 rounded-full">
            Active
          </span>
        )}
      </div>

      {/* Success / Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Payment Gateway Selector */}
      <div className="mb-6">
        <p className="text-sm font-semibold text-gray-600 mb-3">Payment Method</p>
        <div className="flex gap-3">
          <button
            onClick={() => setSelectedGateway('stripe')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium border-2 transition-all cursor-pointer ${
              selectedGateway === 'stripe'
                ? 'border-blue bg-blue/5 text-blue'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            <CreditCardIcon className="w-5 h-5" />
            Stripe (USD)
            {paymentConfig?.stripe?.configured && (
              <CheckCircleIcon className="w-4 h-4 text-green-500" />
            )}
          </button>
          <button
            onClick={() => setSelectedGateway('razorpay')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium border-2 transition-all cursor-pointer ${
              selectedGateway === 'razorpay'
                ? 'border-blue bg-blue/5 text-blue'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            <CreditCardIcon className="w-5 h-5" />
            Razorpay (INR)
            {paymentConfig?.razorpay?.configured && (
              <CheckCircleIcon className="w-4 h-4 text-green-500" />
            )}
          </button>
        </div>
      </div>

      {/* Pricing Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(planFeatures).map(([key, plan]) => {
          const isCurrentPlan =
            (key === 'starter' && currentTier === 'free') ||
            (key === 'professional' && currentTier === 'paid');
          const price = selectedGateway === 'razorpay' ? plan.priceINR : plan.priceUSD;

          return (
            <div
              key={key}
              className={`rounded-2xl p-7 border-2 transition-all ${
                plan.highlighted
                  ? 'border-accent bg-white shadow-lg'
                  : 'border-gray-100 bg-white shadow-sm'
              }`}
            >
              {plan.highlighted && (
                <div className="text-center mb-3">
                  <span className="bg-accent text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Most Popular
                  </span>
                </div>
              )}
              <h3 className="text-lg font-bold text-navy">{plan.name}</h3>
              <p className="text-xs text-gray-400 mt-1 mb-3">{plan.description}</p>
              <div className="mb-5">
                <span className="text-3xl font-extrabold text-navy">{price}</span>
                {plan.period && (
                  <span className="text-gray-400 text-sm">{plan.period}</span>
                )}
              </div>
              <ul className="space-y-2.5 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckIcon className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              {isCurrentPlan ? (
                <div className="text-center py-3 rounded-xl bg-gray-100 text-gray-500 text-sm font-semibold">
                  Current Plan
                </div>
              ) : key === 'starter' ? (
                <div className="text-center py-3 rounded-xl bg-gray-50 text-gray-400 text-sm font-medium">
                  Free Forever
                </div>
              ) : (
                <button
                  onClick={() => handleSubscribe(key)}
                  disabled={loading}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer disabled:opacity-50 ${
                    plan.highlighted
                      ? 'bg-accent hover:bg-accent-dark text-white shadow-md'
                      : 'bg-navy hover:bg-navy-light text-white'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    <>
                      <SparklesIcon className="w-4 h-4 inline mr-1" />
                      Subscribe
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Setup Instructions */}
      {paymentConfig && !paymentConfig.stripe?.configured && !paymentConfig.razorpay?.configured && (
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-amber-800 mb-2">Payment Setup Required</h3>
          <p className="text-sm text-amber-700 mb-3">
            To accept payments, add your API keys to the backend .env file:
          </p>
          <div className="bg-white rounded-lg p-4 font-mono text-xs text-gray-700 space-y-1">
            <p className="text-gray-400"># Stripe (USD payments)</p>
            <p>STRIPE_SECRET_KEY=sk_live_xxx</p>
            <p>STRIPE_PUBLISHABLE_KEY=pk_live_xxx</p>
            <p className="mt-2 text-gray-400"># Razorpay (INR payments)</p>
            <p>RAZORPAY_KEY_ID=rzp_live_xxx</p>
            <p>RAZORPAY_KEY_SECRET=xxx</p>
          </div>
        </div>
      )}
    </div>
  );
}
