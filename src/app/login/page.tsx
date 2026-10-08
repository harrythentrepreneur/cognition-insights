'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || isLoading) return;

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/ad-tracker');
          router.refresh();
        }, 600);
      } else {
        setShake(true);
        setError('Wrong password');
        setTimeout(() => setShake(false), 500);
        setPassword('');
        inputRef.current?.focus();
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Animated background orbs */}
      <div style={styles.orbContainer}>
        <div style={{ ...styles.orb, ...styles.orb1 }} />
        <div style={{ ...styles.orb, ...styles.orb2 }} />
        <div style={{ ...styles.orb, ...styles.orb3 }} />
      </div>

      {/* Noise texture overlay */}
      <div style={styles.noiseOverlay} />

      {/* Main card */}
      <div
        style={{
          ...styles.card,
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          ...(success ? styles.cardSuccess : {}),
        }}
      >
        {/* Logo */}
        <div style={styles.logoWrap}>
          <Logo size="medium" variant="default" />
        </div>

        {/* Heading */}
        <div style={styles.headingWrap}>
          <h1 style={styles.heading}>Welcome back</h1>
          <p style={styles.subheading}>Enter your password to continue</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <div
              style={{
                ...styles.inputWrap,
                ...(error ? styles.inputWrapError : {}),
                ...(shake ? styles.inputWrapShake : {}),
              }}
              className={shake ? 'shake-anim' : ''}
            >
              {/* Lock icon */}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={styles.lockIcon}
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>

              <input
                ref={inputRef}
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Password"
                style={styles.input}
                disabled={isLoading || success}
                autoComplete="current-password"
              />
            </div>

            {/* Error message */}
            <div
              style={{
                ...styles.errorWrap,
                opacity: error ? 1 : 0,
                transform: error ? 'translateY(0)' : 'translateY(-4px)',
              }}
            >
              <span style={styles.errorText}>{error}</span>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={!password || isLoading || success}
            style={{
              ...styles.button,
              ...(password && !isLoading && !success ? styles.buttonActive : {}),
              ...(success ? styles.buttonSuccess : {}),
            }}
          >
            {success ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : isLoading ? (
              <div style={styles.spinner} />
            ) : (
              'Continue'
            )}
          </button>
        </form>
      </div>

      {/* Inline styles for animations */}
      <style>{`
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-40px, 20px) scale(1.1); }
          66% { transform: translate(25px, -15px) scale(0.9); }
        }
        @keyframes float3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20px, 40px) scale(0.95); }
          66% { transform: translate(-30px, -20px) scale(1.05); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .shake-anim {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes shake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-3px); }
          40%, 60% { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}

/* ─── Styles ─────────────────────────────────── */

const styles: Record<string, React.CSSProperties> = {
  page: {
    position: 'relative',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#060611',
    overflow: 'hidden',
    padding: '24px',
  },

  // Background orbs
  orbContainer: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  orb: {
    position: 'absolute',
    borderRadius: '50%',
    filter: 'blur(100px)',
    opacity: 0.15,
  },
  orb1: {
    width: '600px',
    height: '600px',
    background: 'radial-gradient(circle, #00F5D4, transparent 70%)',
    top: '-15%',
    right: '-10%',
    animation: 'float1 20s ease-in-out infinite',
  },
  orb2: {
    width: '500px',
    height: '500px',
    background: 'radial-gradient(circle, #7B61FF, transparent 70%)',
    bottom: '-20%',
    left: '-10%',
    animation: 'float2 25s ease-in-out infinite',
  },
  orb3: {
    width: '400px',
    height: '400px',
    background: 'radial-gradient(circle, #00A3FF, transparent 70%)',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    animation: 'float3 22s ease-in-out infinite',
  },

  noiseOverlay: {
    position: 'absolute',
    inset: 0,
    opacity: 0.03,
    background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
    pointerEvents: 'none',
  },

  // Card
  card: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    maxWidth: '400px',
    padding: '48px 40px',
    borderRadius: '24px',
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(40px)',
    WebkitBackdropFilter: 'blur(40px)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    boxShadow: '0 0 80px rgba(0, 245, 212, 0.03), 0 32px 64px rgba(0, 0, 0, 0.4)',
    transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '32px',
  },
  cardSuccess: {
    borderColor: 'rgba(0, 245, 212, 0.2)',
    boxShadow: '0 0 80px rgba(0, 245, 212, 0.08), 0 32px 64px rgba(0, 0, 0, 0.4)',
  },

  logoWrap: {
    display: 'flex',
    justifyContent: 'center',
  },

  headingWrap: {
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  heading: {
    fontSize: '28px',
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.95)',
    letterSpacing: '-0.02em',
    margin: 0,
    fontFamily: "'Inter', sans-serif",
  },
  subheading: {
    fontSize: '15px',
    color: 'rgba(255, 255, 255, 0.35)',
    margin: 0,
    fontWeight: 400,
    fontFamily: "'Inter', sans-serif",
  },

  // Form
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  inputWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '0 16px',
    height: '52px',
    borderRadius: '14px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    transition: 'all 0.2s ease',
  },
  inputWrapError: {
    borderColor: 'rgba(255, 80, 80, 0.4)',
    background: 'rgba(255, 80, 80, 0.04)',
  },
  inputWrapShake: {},
  lockIcon: {
    color: 'rgba(255, 255, 255, 0.25)',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '15px',
    fontFamily: "'Inter', sans-serif",
    letterSpacing: '0.04em',
  },

  errorWrap: {
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    paddingLeft: '4px',
    transition: 'all 0.2s ease',
  },
  errorText: {
    fontSize: '13px',
    color: 'rgba(255, 100, 100, 0.9)',
    fontFamily: "'Inter', sans-serif",
  },

  // Button
  button: {
    width: '100%',
    height: '52px',
    borderRadius: '14px',
    border: 'none',
    background: 'rgba(255, 255, 255, 0.06)',
    color: 'rgba(255, 255, 255, 0.25)',
    fontSize: '15px',
    fontWeight: 500,
    fontFamily: "'Inter', sans-serif",
    cursor: 'not-allowed',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    letterSpacing: '-0.01em',
  },
  buttonActive: {
    background: '#00F5D4',
    color: '#060611',
    cursor: 'pointer',
    boxShadow: '0 0 30px rgba(0, 245, 212, 0.15), 0 4px 12px rgba(0, 245, 212, 0.1)',
  },
  buttonSuccess: {
    background: '#00F5D4',
    color: '#060611',
    cursor: 'default',
  },

  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(6, 6, 17, 0.2)',
    borderTopColor: '#060611',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite',
  },
};