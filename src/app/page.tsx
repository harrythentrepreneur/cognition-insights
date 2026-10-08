'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Logo from '@/components/Logo';
import './landing.css';

// ─── Feature pills ────────────────────────────────────────────
const FEATURE_PILLS = [
  'Creative DNA Extraction',
  'Competitor Ad Autopsy',
  'Lego-Block Brief Builder',
  'Intelligence Lab Heatmaps',
  'Stripe × Meta Attribution',
  'Avatar Performance Matrix',
  'One-Click Customer Export',
  'Fatigue & Decay Detection',
];

// ─── Bento feature cards ──────────────────────────────────────
const BENTO_CARDS = [
  {
    icon: '🧬',
    title: 'Creative DNA Extraction',
    description: 'Every ad in your account gets dissected by AI into queryable dimensions — hook type, persuasion angle, visual format, target avatar, emotional trigger, CTA mechanics. Creative "art" becomes structured, filterable math you can sort by ROAS.',
    wide: false,
  },
  {
    icon: '🔬',
    title: 'Competitor Ad Autopsy',
    description: 'Drop any winning ad into the system. The AI strips the skeleton from the meat — isolating the narrative pacing, psychological hooks, and structural framework. Save it as a reusable template your brand can remix infinitely.',
    wide: false,
  },
  {
    icon: '📊',
    title: 'The Intelligence Lab',
    description: 'Cross-ad pattern heatmaps reveal which Hook × Angle × Format × Avatar combinations actually print money across your entire account. See what\'s scaling, what\'s fatiguing, and exactly what to test next — backed by real Stripe revenue, not Meta\'s guesswork.',
    wide: true,
  },
  {
    icon: '🧱',
    title: 'Lego-Block Brief Builder',
    description: 'Pick a competitor\'s proven structure. Slot in your highest-ROAS angle. Inject a trending hook. Choose your best-converting avatar. Hit synthesize — and get a shoot-ready script backed by cross-account intelligence, not gut instinct.',
    wide: false,
  },
  {
    icon: '💰',
    title: 'Full Customer Intelligence',
    description: 'Export complete buyer profiles — every ad touchpoint, every conversion event, every dollar attributed. Download as JSON, CSV, or TXT. Build precision lookalikes from your highest-LTV customers, not your cheapest clicks.',
    wide: false,
  },
];

// ─── Intersection Observer hook ───────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible');
          observer.unobserve(el);
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

// ─── Mouse-tracking glow for bento cards ──────────────────────
function BentoCard({ icon, title, description, wide }: {
  icon: string; title: string; description: string; wide: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty('--mouse-x', `${x}%`);
    card.style.setProperty('--mouse-y', `${y}%`);
  }, []);

  return (
    <div
      ref={cardRef}
      className={`landing-bento-card${wide ? ' landing-bento-card--wide' : ''}`}
      onMouseMove={handleMouseMove}
    >
      <div className="landing-bento-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const videoRef = useReveal();
  const featuresRef = useReveal();
  const waitlistRef = useReveal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting) return;
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    setSubmitted(true);
    setIsSubmitting(false);
  };

  const scrollToVideo = () => {
    document.getElementById('demo-video')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToWaitlist = () => {
    document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-root">
      {/* ── Ambient layers ────────────────────────────────── */}
      <div className="landing-grid-bg" />
      <div className="landing-glow-orb landing-glow-orb--hero" />
      <div className="landing-glow-orb landing-glow-orb--accent" />
      <div className="landing-glow-orb landing-glow-orb--bottom" />
      <div className="landing-glow-orb landing-glow-orb--mid" />

      {/* ── Nav ───────────────────────────────────────────── */}
      <nav className="landing-nav">
        <Logo size="small" />
        <div className="landing-nav-actions">
          <a href="/login" className="landing-btn-ghost">Log in</a>
          <button onClick={scrollToWaitlist} className="landing-btn-primary">
            Get Early Access
          </button>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-badge">
          <span className="landing-badge-dot" />
          Now in Early Access
        </div>

        <h1>
          Turn every ad into{' '}
          <span className="landing-gradient-text">predictable math</span>
        </h1>

        <p className="landing-hero-sub">
          Cognition is the creative strategy engine that dissects every ad in your account
          into structured, queryable intelligence — extracts the DNA of what&apos;s working,
          maps spend to real Stripe revenue, and exports full buyer profiles
          so you never wonder what to make next.
        </p>

        <div className="landing-hero-ctas">
          <button onClick={scrollToWaitlist} className="landing-btn-primary landing-btn-large">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            Request Access
          </button>
          <button onClick={scrollToVideo} className="landing-btn-outline-large">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Watch Demo
          </button>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────── */}
      <div className="landing-stats">
        <div className="landing-stat">
          <div className="landing-stat-value">
            <span className="landing-stat-accent">Every</span>&nbsp;Ad
          </div>
          <div className="landing-stat-label">AI-Dissected</div>
        </div>
        <div className="landing-stat-divider" />
        <div className="landing-stat">
          <div className="landing-stat-value">
            <span className="landing-stat-accent">True</span>&nbsp;ROAS
          </div>
          <div className="landing-stat-label">Stripe × Meta</div>
        </div>
        <div className="landing-stat-divider" />
        <div className="landing-stat">
          <div className="landing-stat-value">
            <span className="landing-stat-accent">Full</span>&nbsp;Export
          </div>
          <div className="landing-stat-label">JSON · CSV · TXT</div>
        </div>
      </div>

      {/* ── Feature Pills ─────────────────────────────────── */}
      <div className="landing-pills">
        {FEATURE_PILLS.map((pill) => (
          <span key={pill} className="landing-pill">{pill}</span>
        ))}
      </div>

      {/* ── Demo Video ────────────────────────────────────── */}
      <section id="demo-video" className="landing-video-section">
        <div ref={videoRef} className="landing-reveal">
          <p className="landing-video-label">See the engine in action</p>
          <div className="landing-video-card-wrapper">
            <div className="landing-video-card">
              <video controls preload="metadata" playsInline>
                <source src="/videos/story-ready-video.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Bento Grid ───────────────────────────── */}
      <section className="landing-features">
        <div ref={featuresRef} className="landing-reveal">
          <div className="landing-features-heading">
            <h2>The operating system for performance creative</h2>
            <p>
              From raw ad account data → to AI-structured intelligence → to your next winning creative.
              Every ad scored. Every pattern surfaced. Every buyer identified and exportable.
            </p>
          </div>
          <div className="landing-bento-grid">
            {BENTO_CARDS.map((card) => (
              <BentoCard key={card.title} {...card} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Waitlist CTA ──────────────────────────────────── */}
      <section id="waitlist" className="landing-waitlist">
        <div ref={waitlistRef} className="landing-reveal">
          <h2>
            They guess what ad to make next.<br />
            <span className="landing-gradient-text">You&apos;ll have the blueprint.</span>
          </h2>
          <p>
            We&apos;re onboarding select brands and agencies
            building at the intersection of creative and data.
            If that&apos;s you — drop your email.
          </p>

          {!submitted ? (
            <form className="landing-waitlist-form" onSubmit={handleSubmit}>
              <input
                type="email"
                required
                className="landing-waitlist-input"
                placeholder="you@agency.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
              />
              <button
                type="submit"
                className="landing-btn-primary landing-btn-large"
                disabled={isSubmitting}
                style={{ opacity: isSubmitting ? 0.7 : 1, flexShrink: 0 }}
              >
                {isSubmitting ? 'Joining…' : 'Request Access'}
              </button>
            </form>
          ) : (
            <div className="landing-waitlist-success">
              <div className="landing-waitlist-success-icon">✓</div>
              <h3>You&apos;re on the list</h3>
              <p>We&apos;ll be in touch soon. Keep an eye on your inbox.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="landing-footer">
        <span className="landing-footer-copy">
          © {new Date().getFullYear()} Cognition. All rights reserved.
        </span>
        <div className="landing-footer-links">
          <a href="/tos">Terms</a>
          <a href="/privacy-policy">Privacy</a>
        </div>
      </footer>
    </div>
  );
}