'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';

// ============================================================================
// TYPES
// ============================================================================

type StripeEventType = 'payment' | 'signup' | 'trial_start' | 'subscription' | 'churn' | 'refund' | 'upgrade';

interface StripeEvent {
  id: string;
  type: StripeEventType;
  description: string;
  amount?: string;
  email: string;
  timestamp: Date;
}

// ============================================================================
// EVENT CONFIG — subtle tinted accents matching the app palette
// ============================================================================

const EVENT_CONFIG: Record<StripeEventType, { icon: string; color: string; label: string }> = {
  payment:      { icon: '↗', color: '#00F5D4', label: 'Payment received' },
  signup:       { icon: '◈', color: '#A855F7', label: 'Checkout started' },
  trial_start:  { icon: '◇', color: '#00D4FF', label: 'Free trial started' },
  subscription: { icon: '↻', color: '#38BDF8', label: 'Subscribed' },
  churn:        { icon: '↘', color: '#94A3B8', label: 'Cancelled' },
  refund:       { icon: '←', color: '#FF6B6B', label: 'Refunded' },
  upgrade:      { icon: '⬆', color: '#06D6A0', label: 'Upgraded' },
};

// ============================================================================
// MOCK DATA
// ============================================================================

const NAMES = [
  'Sarah J.', 'Mike C.', 'Emma W.', 'Alex K.', 'Jessica L.',
  'David R.', 'Olivia M.', 'James B.', 'Sophia T.', 'Daniel H.',
  'Ava C.', 'Noah P.', 'Mia G.', 'Liam S.', 'Charlotte D.',
  'Ben W.', 'Amelia N.', 'Lucas F.',
];

const AMOUNTS = ['$29', '$49', '$49', '$99', '$99', '$149', '$199'];

function generateMockEvents(count: number): StripeEvent[] {
  const types: StripeEventType[] = [
    'payment', 'signup', 'payment', 'trial_start', 'payment',
    'subscription', 'signup', 'payment', 'upgrade', 'signup',
    'payment', 'trial_start', 'churn', 'payment', 'signup',
    'subscription', 'payment', 'refund', 'payment', 'upgrade',
  ];
  const now = Date.now();

  return Array.from({ length: count }, (_, i) => {
    const type = types[i % types.length];
    const name = NAMES[i % NAMES.length];
    const minutesAgo = Math.floor(i * 2.8 + Math.random() * 4);

    return {
      id: `evt_${now}_${i}`,
      type,
      description: name,
      amount: ['payment', 'refund', 'subscription', 'upgrade', 'churn'].includes(type)
        ? AMOUNTS[Math.floor(Math.random() * AMOUNTS.length)]
        : undefined,
      email: '',
      timestamp: new Date(now - minutesAgo * 60 * 1000),
    };
  });
}

// ============================================================================
// TIME + DATE FORMATTING
// ============================================================================

function getDateLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - eventDay.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatEventTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  // Within the last hour, show relative
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  // Otherwise show exact time
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// ============================================================================
// COMPONENT
// ============================================================================

interface StripeLiveFeedProps {
  events?: Array<{
    id: string;
    type: string;
    description: string;
    amount?: string;
    email: string;
    timestamp: string;
  }>;
}

export const StripeLiveFeed: React.FC<StripeLiveFeedProps> = ({ events: externalEvents }) => {
  const [events, setEvents] = useState<StripeEvent[]>([]);
  const [newEventIds, setNewEventIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const [, forceUpdate] = useState(0);
  const prevExternalCountRef = useRef(0);

  // When external events are provided, use them instead of mock
  useEffect(() => {
    if (externalEvents && externalEvents.length > 0) {
      const mapped: StripeEvent[] = externalEvents.map(e => ({
        id: e.id,
        type: (e.type as StripeEventType) || 'payment',
        description: e.description,
        amount: e.amount,
        email: e.email,
        timestamp: new Date(e.timestamp),
      }));

      // Detect newly added events for animation
      if (mapped.length > prevExternalCountRef.current && prevExternalCountRef.current > 0) {
        const newCount = mapped.length - prevExternalCountRef.current;
        const newIds = new Set(mapped.slice(0, newCount).map(e => e.id));
        setNewEventIds(newIds);
        setTimeout(() => setNewEventIds(new Set()), 2500);
      }
      prevExternalCountRef.current = mapped.length;
      setEvents(mapped);
    }
  }, [externalEvents]);

  // Only generate mock events when no external events
  useEffect(() => {
    if (!externalEvents) {
      setEvents(generateMockEvents(30));
    }
  }, [externalEvents]);

  // Simulate new events arriving (mock mode only)
  useEffect(() => {
    if (externalEvents) return; // Skip mock simulation when using real events
    const interval = setInterval(() => {
      const types: StripeEventType[] = ['payment', 'signup', 'trial_start', 'subscription', 'upgrade', 'payment', 'payment'];
      const type = types[Math.floor(Math.random() * types.length)];
      const name = NAMES[Math.floor(Math.random() * NAMES.length)];

      const newEvent: StripeEvent = {
        id: `evt_${Date.now()}`,
        type,
        description: name,
        amount: ['payment', 'refund', 'subscription', 'upgrade', 'churn'].includes(type)
          ? AMOUNTS[Math.floor(Math.random() * AMOUNTS.length)]
          : undefined,
        email: '',
        timestamp: new Date(),
      };

      setNewEventIds(prev => new Set(prev).add(newEvent.id));
      setEvents(prev => [newEvent, ...prev.slice(0, 49)]);

      setTimeout(() => {
        setNewEventIds(prev => {
          const next = new Set(prev);
          next.delete(newEvent.id);
          return next;
        });
      }, 2500);
    }, 6000 + Math.random() * 8000);

    return () => clearInterval(interval);
  }, []);

  // Refresh relative timestamps
  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups: Array<{ label: string; events: Array<{ event: StripeEvent; originalIndex: number }> }> = [];
    let currentLabel = '';

    events.forEach((event, index) => {
      const label = getDateLabel(event.timestamp);
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, events: [] });
      }
      groups[groups.length - 1].events.push({ event, originalIndex: index });
    });

    return groups;
  }, [events]);

  return (
    <div style={{
      width: '100%',
      height: '840px',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        backgroundColor: DESIGN_TOKENS.colors.cardBg,
        border: `1px solid ${DESIGN_TOKENS.colors.border}`,
        borderRadius: DESIGN_TOKENS.effects.cardBorderRadius,
        backdropFilter: DESIGN_TOKENS.effects.backdropBlur,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* ── Header ─────────────────────────────────────── */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${DESIGN_TOKENS.colors.border}`,
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              {/* Live dot */}
              <div style={{ position: 'relative', width: '8px', height: '8px' }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  backgroundColor: DESIGN_TOKENS.colors.accent,
                }} />
                <div style={{
                  position: 'absolute',
                  inset: '-4px',
                  borderRadius: '50%',
                  border: `1.5px solid ${DESIGN_TOKENS.colors.accent}`,
                  opacity: 0.4,
                  animation: 'livePing 2s cubic-bezier(0, 0, 0.2, 1) infinite',
                }} />
              </div>
              <span style={{
                fontSize: '13px',
                fontWeight: 600,
                color: DESIGN_TOKENS.colors.text,
                fontFamily: DESIGN_TOKENS.fonts.body,
                letterSpacing: '0.03em',
              }}>
                Live Activity
              </span>
            </div>
            <span style={{
              fontSize: '10px',
              fontWeight: 500,
              color: DESIGN_TOKENS.colors.textSecondary,
              fontFamily: DESIGN_TOKENS.fonts.body,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              opacity: 0.5,
            }}>
              Stripe
            </span>
          </div>
        </div>

        {/* ── Event list ─────────────────────────────────── */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '4px 0',
          }}
        >
          {events.length === 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              gap: '12px',
              opacity: 0.5,
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: DESIGN_TOKENS.colors.accent,
                animation: 'livePing 2s cubic-bezier(0, 0, 0.2, 1) infinite',
              }} />
              <span style={{
                fontSize: '12px',
                color: DESIGN_TOKENS.colors.textSecondary,
                fontFamily: DESIGN_TOKENS.fonts.body,
                letterSpacing: '0.03em',
              }}>
                Listening for events…
              </span>
            </div>
          )}

          {groupedEvents.map((group, groupIdx) => (
            <div key={group.label}>
              {/* Date separator */}
              <div style={{
                padding: '10px 20px 6px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginTop: groupIdx > 0 ? '4px' : '0',
              }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: DESIGN_TOKENS.colors.textSecondary,
                  fontFamily: DESIGN_TOKENS.fonts.body,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  opacity: 0.5,
                  whiteSpace: 'nowrap',
                }}>
                  {group.label}
                </span>
                <div style={{
                  flex: 1,
                  height: '1px',
                  background: 'linear-gradient(to right, rgba(255,255,255,0.06), transparent)',
                }} />
              </div>

              {/* Events in this group */}
              {group.events.map(({ event, originalIndex }) => {
                const config = EVENT_CONFIG[event.type];
                const isNew = newEventIds.has(event.id);

                return (
                  <div
                    key={event.id}
                    style={{
                      padding: '0 12px',
                      marginBottom: '3px',
                      animation: isNew ? 'feedSlideIn 0.4s ease-out' : undefined,
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: isNew
                        ? `${config.color}08`
                        : originalIndex % 2 === 0
                          ? 'rgba(255, 255, 255, 0.015)'
                          : 'transparent',
                      border: isNew
                        ? `1px solid ${config.color}20`
                        : '1px solid transparent',
                      transition: 'all 0.5s ease',
                      position: 'relative',
                      overflow: 'hidden',
                    }}>

                      {/* Left accent bar */}
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '2px',
                        backgroundColor: config.color,
                        opacity: isNew ? 0.7 : 0.2,
                        borderRadius: '2px 0 0 2px',
                        transition: 'opacity 0.5s ease',
                      }} />

                      {/* Icon */}
                      <div style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '7px',
                        backgroundColor: `${config.color}10`,
                        border: `1px solid ${config.color}18`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: '12px',
                        fontWeight: 700,
                        color: config.color,
                        fontFamily: DESIGN_TOKENS.fonts.body,
                      }}>
                        {config.icon}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: '6px',
                        }}>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 500,
                            color: DESIGN_TOKENS.colors.text,
                            fontFamily: DESIGN_TOKENS.fonts.body,
                            lineHeight: 1.3,
                          }}>
                            {event.description}
                          </span>
                        </div>
                        <div style={{
                          fontSize: '10px',
                          color: DESIGN_TOKENS.colors.textSecondary,
                          fontFamily: DESIGN_TOKENS.fonts.body,
                          marginTop: '1px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          opacity: 0.7,
                        }}>
                          <span style={{ color: config.color, fontWeight: 500, opacity: 0.8 }}>
                            {config.label}
                          </span>
                          <span style={{ opacity: 0.3, fontSize: '6px' }}>●</span>
                          <span>{formatEventTime(event.timestamp)}</span>
                        </div>
                      </div>

                      {/* Amount */}
                      {event.amount && (
                        <span style={{
                          fontSize: '13px',
                          fontWeight: 500,
                          color: (event.type === 'refund' || event.type === 'churn') ? DESIGN_TOKENS.colors.error : DESIGN_TOKENS.colors.accent,
                          fontFamily: DESIGN_TOKENS.fonts.body,
                          letterSpacing: '-0.01em',
                          flexShrink: 0,
                          opacity: 0.85,
                        }}>
                          {(event.type === 'refund' || event.type === 'churn') ? `−${event.amount}` : `+${event.amount}`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Keyframe animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes livePing {
          0% { transform: scale(1); opacity: 0.4; }
          75% { transform: scale(2); opacity: 0; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes feedSlideIn {
          0% { opacity: 0; transform: translateY(-6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
};
