import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  ClockIcon,
  ChartBarIcon,
  ArrowRightIcon,
  CheckIcon,
  StarIcon,
  EyeIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

/* ── Stars field (CSS-only) for hero background ── */
function StarsField() {
  const stars = [];
  for (let i = 0; i < 50; i++) {
    const size = Math.random() > 0.7 ? 3 : 2;
    stars.push(
      <div
        key={i}
        className="absolute rounded-full bg-white"
        style={{
          width: size,
          height: size,
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          opacity: 0.15 + Math.random() * 0.35,
          animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 3}s`,
        }}
      />
    );
  }
  return <>{stars}</>;
}

const features = [
  {
    icon: SparklesIcon,
    title: 'AI Proposal Generation',
    description:
      'Generate all 18 FAR-compliant proposal sections in minutes using advanced AI trained on winning government proposals.',
  },
  {
    icon: MagnifyingGlassIcon,
    title: 'Opportunity Search',
    description:
      'Search SAM.gov and USASpending.gov for federal contract opportunities by keyword, NAICS code, or agency.',
  },
  {
    icon: ChartBarIcon,
    title: 'Market Research',
    description:
      'Access labor rate intelligence with real government benchmark data to price your proposals competitively.',
  },
  {
    icon: CurrencyDollarIcon,
    title: 'Pricing Intelligence',
    description:
      'Analyze competitor awards, historical bid data, and get AI-powered pricing strategy recommendations.',
  },
  {
    icon: EyeIcon,
    title: 'Draft Preview & Share',
    description:
      'Preview proposals with DRAFT watermark, customize themes and fonts, and share secure links with your team.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Audit Trail',
    description:
      'Full audit logging of all proposal actions — generation, edits, exports, and shares — for compliance tracking.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Set Up Your Vendor Profile',
    description: 'Enter your company info, CAGE code, DUNS, NAICS codes, and capabilities once. Reuse across all proposals.',
  },
  {
    number: '02',
    title: 'Find or Enter an Opportunity',
    description: 'Search SAM.gov for active opportunities or manually enter the RFP details, requirements, and evaluation criteria.',
  },
  {
    number: '03',
    title: 'Generate & Customize',
    description: 'Select your sections, let AI generate the content, then refine with the rich text editor and pricing builder.',
  },
  {
    number: '04',
    title: 'Export & Submit',
    description: 'Preview with DRAFT watermark, share with your team, then download as PDF or DOCX and submit to win.',
  },
];

const pricingPlans = [
  {
    name: 'Starter',
    price: '$999',
    period: '/month',
    cancelNote: 'Cancel anytime',
    description: 'Single user, perfect for getting started',
    features: [
      '1 user account',
      '2 proposals per month',
      'SAM.gov & USASpending.gov search',
      'All 18 proposal sections',
      'PDF export',
      'Image uploads in proposals',
      'Email support',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '$2,999',
    period: '/month',
    cancelNote: 'Cancel anytime',
    description: 'For growing teams and contractors',
    features: [
      '2 user accounts',
      '5 proposals per user/month',
      'All 18 proposal sections',
      'Interactive pricing builder',
      'PDF & DOCX export',
      'Template library (8+ templates)',
      'Priority AI generation',
      'Multi-source opportunity search',
      'Market Research & Pricing Intelligence',
      'Dedicated account manager',
    ],
    cta: 'Get Started',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large teams and agencies',
    features: [
      'Everything in Professional',
      'Unlimited users & proposals',
      'Custom templates & branding',
      'API access',
      'Dedicated support & onboarding',
      'SSO / SAML integration',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

const testimonials = [
  {
    quote: 'GovProposal AI cut our proposal writing time from 3 weeks to 2 days. The FAR compliance checks alone saved us from costly mistakes.',
    name: 'Sarah Mitchell',
    role: 'CEO, Federal Solutions Group',
    rating: 5,
  },
  {
    quote: 'The market research module gave us pricing intelligence we never had before. We won our first $1.2M contract using their competitor analysis.',
    name: 'James Rodriguez',
    role: 'BD Director, TechGov Partners',
    rating: 5,
  },
  {
    quote: 'As a small business, we could never afford a proposal team. This platform levels the playing field against the big primes.',
    name: 'Angela Washington',
    role: 'Owner, AW Consulting LLC',
    rating: 5,
  },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Libre Franklin', 'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@400;500;600;700;800&display=swap');

        @keyframes twinkle {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.6; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes stripesMove {
          0% { background-position: 0 0; }
          100% { background-position: 60px 0; }
        }
        .animate-fadeInUp { animation: fadeInUp 0.8s ease-out forwards; }
        .animate-slideInLeft { animation: slideInLeft 0.7s ease-out forwards; }
        .animate-scaleIn { animation: scaleIn 0.6s ease-out forwards; }
        .delay-100 { animation-delay: 0.1s; opacity: 0; animation-fill-mode: forwards; }
        .delay-200 { animation-delay: 0.2s; opacity: 0; animation-fill-mode: forwards; }
        .delay-300 { animation-delay: 0.3s; opacity: 0; animation-fill-mode: forwards; }
        .delay-400 { animation-delay: 0.4s; opacity: 0; animation-fill-mode: forwards; }
        .delay-500 { animation-delay: 0.5s; opacity: 0; animation-fill-mode: forwards; }
        .delay-600 { animation-delay: 0.6s; opacity: 0; animation-fill-mode: forwards; }

        .hero-bg {
          background:
            radial-gradient(ellipse 80% 60% at 20% 80%, rgba(196, 30, 58, 0.08) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 80% 20%, rgba(212, 168, 83, 0.06) 0%, transparent 50%),
            linear-gradient(175deg, #0d1f3c 0%, #1e3a5f 35%, #1a3355 65%, #152d4a 100%);
        }

        .capitol-silhouette {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          max-width: 900px;
          height: 200px;
          opacity: 0.06;
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 200' fill='white'%3E%3Cpath d='M0 200 L0 160 L80 160 L80 130 L120 130 L120 120 L140 120 L140 110 L160 110 L160 100 L200 100 L200 90 L240 90 L240 100 L280 100 L280 90 L320 90 L320 80 L340 80 L340 70 L360 70 L360 55 L380 55 L380 40 L400 40 L400 30 L420 30 L420 20 L435 20 L435 10 L445 5 L450 0 L455 5 L465 10 L465 20 L480 20 L480 30 L500 30 L500 40 L520 40 L520 55 L540 55 L540 70 L560 70 L560 80 L580 80 L580 90 L620 90 L620 100 L660 100 L660 90 L700 90 L700 100 L740 100 L740 110 L760 110 L760 120 L780 120 L780 130 L820 130 L820 160 L900 160 L900 200 Z'/%3E%3C/svg%3E") no-repeat bottom center;
          background-size: contain;
        }

        .stripes-accent {
          background: repeating-linear-gradient(
            90deg,
            rgba(196, 30, 58, 0.5) 0px,
            rgba(196, 30, 58, 0.5) 4px,
            transparent 4px,
            transparent 12px
          );
        }

        .gold-line {
          height: 2px;
          background: linear-gradient(90deg, transparent, #d4a853, transparent);
        }

        .feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(30, 58, 95, 0.12);
        }

        .pricing-card-pop {
          transform: scale(1.03);
          box-shadow: 0 20px 60px rgba(196, 30, 58, 0.15), 0 8px 24px rgba(0,0,0,0.1);
        }
      `}</style>

      {/* ═══ NAVBAR ═══ */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-md shadow-md'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-patriot-red rounded-lg p-1.5 shadow-sm">
              <DocumentTextIcon className="w-6 h-6 text-white" />
            </div>
            <span className={`text-xl font-bold transition-colors duration-300 ${scrolled ? 'text-navy' : 'text-white'}`}>
              GovProposal{' '}
              <span className="text-gold">AI</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {['Features', 'How It Works', 'Pricing'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                className={`text-sm font-medium transition-colors no-underline ${
                  scrolled
                    ? 'text-gray-600 hover:text-navy'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {item}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className={`text-sm font-semibold transition-colors no-underline ${
                scrolled ? 'text-navy hover:text-navy-light' : 'text-white/80 hover:text-white'
              }`}
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="bg-patriot-red hover:bg-patriot-red-dark text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-lg no-underline"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO SECTION ═══ */}
      <section className="hero-bg relative overflow-hidden pt-28 pb-24 px-6 min-h-[90vh] flex items-center">
        {/* Stars */}
        <div className="absolute inset-0 overflow-hidden">
          <StarsField />
        </div>

        {/* Capitol silhouette */}
        <div className="capitol-silhouette" />

        {/* Subtle stripes at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1 stripes-accent" />

        {/* Gold accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent 10%, #d4a853 50%, transparent 90%)' }} />

        <div className="max-w-6xl mx-auto text-center relative z-10 w-full">
          {/* Badge */}
          <div className="animate-fadeInUp inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold mb-8"
            style={{
              background: 'linear-gradient(135deg, rgba(212,168,83,0.15), rgba(212,168,83,0.05))',
              border: '1px solid rgba(212,168,83,0.3)',
              color: '#e8c675',
            }}
          >
            <ShieldCheckIcon className="w-4 h-4" />
            Trusted by Federal Contractors Nationwide
          </div>

          {/* Headline */}
          <h1
            className="animate-fadeInUp delay-100 text-5xl md:text-7xl font-extrabold text-white leading-tight mb-6"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Win Federal Contracts
            <br />
            <span style={{ color: '#d4a853' }}>with AI-Powered Proposals</span>
          </h1>

          {/* Sub-headline */}
          <p className="animate-fadeInUp delay-200 text-xl md:text-2xl max-w-3xl mx-auto mb-10 leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Generate FAR-compliant government proposals{' '}
            <span className="font-bold text-white">10x faster</span>.
            AI writes professional content while you focus on winning the contract.
          </p>

          {/* CTA Buttons */}
          <div className="animate-fadeInUp delay-300 flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              to="/register"
              className="flex items-center gap-2 text-white px-9 py-4 rounded-xl text-lg font-bold transition-all shadow-lg hover:shadow-2xl no-underline"
              style={{ background: 'linear-gradient(135deg, #c41e3a, #a01830)' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              Start Writing Proposals
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 px-9 py-4 rounded-xl text-lg font-semibold transition-all no-underline"
              style={{
                color: '#d4a853',
                border: '2px solid rgba(212,168,83,0.4)',
                background: 'rgba(212,168,83,0.05)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(212,168,83,0.7)';
                e.currentTarget.style.background = 'rgba(212,168,83,0.1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(212,168,83,0.4)';
                e.currentTarget.style.background = 'rgba(212,168,83,0.05)';
              }}
            >
              See How It Works
            </a>
          </div>

          {/* Stats Bar */}
          <div className="animate-fadeInUp delay-400 grid grid-cols-2 md:grid-cols-4 gap-0 max-w-4xl mx-auto rounded-2xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {[
              { value: '18', label: 'Proposal Sections', icon: DocumentDuplicateIcon },
              { value: '8+', label: 'Templates', icon: DocumentTextIcon },
              { value: '<2min', label: 'Generation Time', icon: ClockIcon },
              { value: '100%', label: 'FAR Compliant', icon: ShieldCheckIcon },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="flex flex-col items-center py-6 px-4"
                  style={{
                    borderRight: i < 3 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  }}
                >
                  <Icon className="w-5 h-5 mb-2" style={{ color: '#d4a853' }} />
                  <p className="text-3xl font-extrabold text-white">{stat.value}</p>
                  <p className="text-xs mt-1 tracking-wide uppercase" style={{ color: 'rgba(255,255,255,0.45)' }}>{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Gold divider */}
      <div className="gold-line" />

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="py-24 px-6" style={{ background: '#faf6f0' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold tracking-widest uppercase mb-3" style={{ color: '#c41e3a' }}>
              Capabilities
            </p>
            <h2
              className="text-3xl md:text-5xl font-bold text-navy mb-5"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Everything You Need to Win
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#6b7280' }}>
              From opportunity discovery to proposal submission — one platform to handle it all.
            </p>
            <div className="gold-line max-w-24 mx-auto mt-6" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="feature-card bg-white rounded-2xl p-8 transition-all duration-300 cursor-default"
                  style={{
                    border: '1px solid rgba(30,58,95,0.08)',
                    boxShadow: '0 4px 16px rgba(30,58,95,0.05)',
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-5"
                    style={{ background: 'linear-gradient(135deg, #1e3a5f, #2a4a73)' }}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-navy mb-2">{feature.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how-it-works" className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold tracking-widest uppercase mb-3" style={{ color: '#d4a853' }}>
              Process
            </p>
            <h2
              className="text-3xl md:text-5xl font-bold text-navy mb-5"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Four Steps to Your Proposal
            </h2>
            <p className="text-lg" style={{ color: '#6b7280' }}>
              From zero to a professional government proposal in minutes.
            </p>
            <div className="gold-line max-w-24 mx-auto mt-6" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className="flex gap-5 p-7 rounded-2xl transition-all duration-300 hover:shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, rgba(30,58,95,0.02), rgba(30,58,95,0.05))',
                  border: '1px solid rgba(30,58,95,0.08)',
                }}
              >
                <div
                  className="flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center"
                  style={{
                    background: index === 3
                      ? 'linear-gradient(135deg, #c41e3a, #a01830)'
                      : 'linear-gradient(135deg, #1e3a5f, #2a4a73)',
                  }}
                >
                  <span className="text-white font-extrabold text-xl">{step.number}</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-navy mb-2">{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section className="py-24 px-6" style={{ background: '#1e3a5f' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold tracking-widest uppercase mb-3" style={{ color: '#d4a853' }}>
              Testimonials
            </p>
            <h2
              className="text-3xl md:text-4xl font-bold text-white mb-5"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Trusted by Federal Contractors
            </h2>
            <div className="h-[2px] max-w-24 mx-auto mt-4" style={{ background: 'linear-gradient(90deg, transparent, #d4a853, transparent)' }} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="rounded-2xl p-8"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {/* Stars */}
                <div className="flex gap-1 mb-5">
                  {[...Array(t.rating)].map((_, i) => (
                    <StarSolid key={i} className="w-5 h-5" style={{ color: '#d4a853' }} />
                  ))}
                </div>
                <p className="text-base leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.8)', fontStyle: 'italic' }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: 'linear-gradient(135deg, #c41e3a, #a01830)' }}
                  >
                    {t.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{t.name}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" className="py-24 px-6" style={{ background: '#faf6f0' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold tracking-widest uppercase mb-3" style={{ color: '#c41e3a' }}>
              Pricing
            </p>
            <h2
              className="text-3xl md:text-5xl font-bold text-navy mb-5"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg" style={{ color: '#6b7280' }}>
              Start free. Upgrade when you&apos;re ready to scale.
            </p>
            <div className="gold-line max-w-24 mx-auto mt-6" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 transition-all duration-300 ${
                  plan.highlighted ? 'pricing-card-pop' : ''
                }`}
                style={{
                  background: plan.highlighted
                    ? 'linear-gradient(180deg, #ffffff 0%, #fefcf8 100%)'
                    : '#ffffff',
                  border: plan.highlighted
                    ? '2px solid #d4a853'
                    : '2px solid rgba(30,58,95,0.08)',
                  boxShadow: plan.highlighted
                    ? undefined
                    : '0 4px 16px rgba(0,0,0,0.04)',
                }}
              >
                {plan.highlighted && (
                  <div className="text-center mb-5">
                    <span
                      className="text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider"
                      style={{ background: 'linear-gradient(135deg, #c41e3a, #a01830)' }}
                    >
                      Most Popular
                    </span>
                  </div>
                )}
                <h3 className="text-xl font-bold text-navy">{plan.name}</h3>
                <p className="text-sm mt-1 mb-4" style={{ color: '#9ca3af' }}>{plan.description}</p>
                <div className="mb-2">
                  <span className="text-4xl font-extrabold text-navy">{plan.price}</span>
                  {plan.period && (
                    <span className="text-base" style={{ color: '#9ca3af' }}>{plan.period}</span>
                  )}
                </div>
                {plan.cancelNote ? (
                  <p className="text-xs font-semibold mb-6" style={{ color: '#c41e3a' }}>{plan.cancelNote}</p>
                ) : (
                  <div className="mb-6" />
                )}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: '#4b5563' }}>
                      <CheckIcon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#d4a853' }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`block text-center py-3.5 rounded-xl font-semibold text-sm transition-all no-underline ${
                    plan.highlighted
                      ? 'text-white shadow-md hover:shadow-lg'
                      : 'text-navy hover:shadow-md'
                  }`}
                  style={{
                    background: plan.highlighted
                      ? 'linear-gradient(135deg, #c41e3a, #a01830)'
                      : 'rgba(30,58,95,0.06)',
                  }}
                  onMouseEnter={e => {
                    if (!plan.highlighted) e.currentTarget.style.background = 'rgba(30,58,95,0.12)';
                  }}
                  onMouseLeave={e => {
                    if (!plan.highlighted) e.currentTarget.style.background = 'rgba(30,58,95,0.06)';
                  }}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA SECTION ═══ */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <div
            className="rounded-3xl p-12 md:p-20 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #0d1f3c 0%, #1e3a5f 50%, #152d4a 100%)',
            }}
          >
            {/* Decorative stars */}
            <div className="absolute inset-0 overflow-hidden opacity-30">
              <StarsField />
            </div>
            {/* Gold border accent */}
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, transparent, #d4a853, transparent)' }} />

            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-8" style={{ background: 'linear-gradient(135deg, #c41e3a, #a01830)' }}>
                <SparklesIcon className="w-8 h-8 text-white" />
              </div>
              <h2
                className="text-3xl md:text-5xl font-bold text-white mb-5"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Ready to Win More Contracts?
              </h2>
              <p className="text-lg mb-10 max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Join government contractors who use AI to write better proposals faster.
                Start for free — no credit card required.
              </p>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 text-white px-10 py-4 rounded-xl text-lg font-bold transition-all shadow-lg hover:shadow-2xl no-underline"
                style={{ background: 'linear-gradient(135deg, #c41e3a, #a01830)' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Get Started Free
                <ArrowRightIcon className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ background: '#0d1f3c' }} className="py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="bg-patriot-red rounded-lg p-1.5">
                <DocumentTextIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">
                GovProposal <span style={{ color: '#d4a853' }}>AI</span>
              </span>
            </div>
            <div className="flex items-center gap-6">
              {['Features', 'How It Works', 'Pricing'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                  className="text-sm transition-colors no-underline"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'white'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                >
                  {item}
                </a>
              ))}
              <Link
                to="/login"
                className="text-sm transition-colors no-underline"
                style={{ color: 'rgba(255,255,255,0.4)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'white'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
              >
                Sign In
              </Link>
            </div>
          </div>
          <div className="mt-10 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                &copy; {new Date().getFullYear()} GovProposal AI. All rights reserved.
              </p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Empowering federal contractors with AI-powered proposal intelligence
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
