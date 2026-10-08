'use client';

import React, { useEffect, useState } from 'react';
import PageLayout from '@/components/shared/PageLayout';
import CustomersTable, { CustomerData } from '../components/CustomersTable';

// Design tokens matching the table component
const T = {
  cardBg: '#1F1F35',
  cardBorder: '#2A2A45',
  textMuted: '#5E5E7A',
  accent: '#00F5D4',
  shimmer: '#252540',
};

export default function CustomersPage() {
  const [users, setUsers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const res = await fetch('/api/ad-tracker/customers');
        if (!res.ok) throw new Error('Failed to fetch customers');
        const data = await res.json();

        const mapped: CustomerData[] = (data.customers || []).map((c: any) => ({
          id: c.id,
          email: c.email || '',
          firstName: c.name?.split(' ')[0] || null,
          lastName: c.name?.split(' ').slice(1).join(' ') || null,
          createdAt: c.createdAt,
          metadata: c.metadata || {},
        }));

        setUsers(mapped);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchCustomers();
  }, []);

  return (
    <PageLayout activeSection="ad-tracker" hideBottomNav={true}>
      <div style={{ minHeight: '100vh', padding: '96px 16px 48px', maxWidth: 1280, margin: '0 auto', width: '100%' }}>

        {/* ── HEADER ──────────────────────────────────────────── */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <div style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: T.accent,
              boxShadow: `0 0 10px ${T.accent}80`,
              animation: 'pulse 2s infinite',
            }} />
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase' as const,
              color: `${T.accent}AA`,
              fontFamily: "'Inter', 'Lato', sans-serif",
            }}>
              Attribution Analytics
            </span>
          </div>
          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: 700,
            color: '#EEEEF5',
            letterSpacing: '-0.03em',
            margin: '0 0 16px',
            fontFamily: "'Inter', 'Lato', sans-serif",
            lineHeight: 1.1,
          }}>
            Customer Origins
          </h1>
          <p style={{
            fontSize: 15,
            color: T.textMuted,
            maxWidth: 520,
            lineHeight: 1.6,
            fontWeight: 500,
            margin: 0,
            fontFamily: "'Inter', 'Lato', sans-serif",
          }}>
            Where your customers come from. UTM parameters and click IDs are captured at checkout and stored on each Stripe customer record.
          </p>
        </div>

        {/* ── CONTENT ─────────────────────────────────────────── */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 20 }}>
            {/* Skeleton stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{
                  borderRadius: 16,
                  backgroundColor: T.cardBg,
                  border: `1px solid ${T.cardBorder}`,
                  padding: 20,
                  position: 'relative' as const,
                  overflow: 'hidden',
                }}>
                  <div style={{ width: 80, height: 10, borderRadius: 6, backgroundColor: T.shimmer, marginBottom: 16 }} />
                  <div style={{ width: 60, height: 28, borderRadius: 8, backgroundColor: T.shimmer, marginBottom: 10 }} />
                  <div style={{ width: 48, height: 8, borderRadius: 4, backgroundColor: T.shimmer }} />
                  {/* Shimmer overlay */}
                  <div style={{
                    position: 'absolute' as const,
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)`,
                    animation: 'shimmerSlide 1.5s infinite',
                  }} />
                </div>
              ))}
            </div>

            {/* Skeleton source bar */}
            <div style={{
              borderRadius: 16,
              backgroundColor: T.cardBg,
              border: `1px solid ${T.cardBorder}`,
              padding: 20,
              position: 'relative' as const,
              overflow: 'hidden',
            }}>
              <div style={{ width: 120, height: 10, borderRadius: 6, backgroundColor: T.shimmer, marginBottom: 16 }} />
              <div style={{ width: '100%', height: 10, borderRadius: 6, backgroundColor: T.shimmer }} />
              <div style={{
                position: 'absolute' as const,
                top: 0, left: 0, right: 0, bottom: 0,
                background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)`,
                animation: 'shimmerSlide 1.5s infinite',
              }} />
            </div>

            {/* Skeleton table rows */}
            <div style={{
              borderRadius: 16,
              backgroundColor: T.cardBg,
              border: `1px solid ${T.cardBorder}`,
              overflow: 'hidden',
              position: 'relative' as const,
            }}>
              {[0, 1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '14px 20px',
                  borderBottom: `1px solid ${T.cardBorder}`,
                }}>
                  <div style={{ width: 88, height: 10, borderRadius: 5, backgroundColor: T.shimmer }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: T.shimmer }} />
                    <div>
                      <div style={{ width: 100, height: 10, borderRadius: 5, backgroundColor: T.shimmer, marginBottom: 6 }} />
                      <div style={{ width: 140, height: 8, borderRadius: 4, backgroundColor: T.shimmer }} />
                    </div>
                  </div>
                  <div style={{ width: 72, height: 22, borderRadius: 6, backgroundColor: T.shimmer }} />
                  <div style={{ width: 80, height: 10, borderRadius: 5, backgroundColor: T.shimmer }} />
                </div>
              ))}
              <div style={{
                position: 'absolute' as const,
                top: 0, left: 0, right: 0, bottom: 0,
                background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.025) 50%, transparent 100%)`,
                animation: 'shimmerSlide 1.5s infinite',
              }} />
            </div>

            {/* Animation keyframes */}
            <style>{`
              @keyframes shimmerSlide {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
              }
            `}</style>
          </div>
        ) : error ? (
          <div style={{
            borderRadius: 16,
            padding: '48px 24px',
            textAlign: 'center' as const,
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}>
            <p style={{ color: '#F87171', fontSize: 14, fontWeight: 500, margin: 0 }}>{error}</p>
          </div>
        ) : (
          <CustomersTable initialUsers={users} />
        )}
      </div>
    </PageLayout>
  );
}
