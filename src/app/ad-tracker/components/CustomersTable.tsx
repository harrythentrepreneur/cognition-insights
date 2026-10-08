'use client';

import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, ArrowDown, ArrowUp, Filter, Users, TrendingUp, Globe, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export interface CustomerData {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  metadata: Record<string, any>;
}

interface CustomersTableProps {
  initialUsers: CustomerData[];
}

type SortField = 'createdAt' | 'email' | 'name' | 'source';
type SortDirection = 'asc' | 'desc';

const ROWS_PER_PAGE = 25;

// ============================================================================
// DESIGN TOKENS — matches ad-tracker dark theme (#1A1A2E base)
// ============================================================================
const T = {
  cardBg: '#1F1F35',         // slightly lighter than #1A1A2E page bg
  cardBorder: '#2A2A45',     // visible border
  cardBgHover: '#242440',
  tableBg: '#1C1C32',
  tableRowHover: '#222240',
  tableHeaderBg: '#1E1E36',
  inputBg: '#252540',
  accent: '#00F5D4',
  accentDim: 'rgba(0, 245, 212, 0.15)',
  accentBorder: 'rgba(0, 245, 212, 0.25)',
  textPrimary: '#EEEEF5',
  textSecondary: '#9595B2',
  textMuted: '#5E5E7A',
  divider: '#2A2A42',
  shadow: '0 4px 24px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.25)',
  shadowLg: '0 8px 40px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.3)',
};

// ============================================================================
// SOURCE HELPERS
// ============================================================================

function getSourceLabel(source: string): string {
  const s = source.toLowerCase();
  if (s.includes('facebook') || s.includes('fb') || s.includes('ig') || s.includes('instagram')) return 'Meta Ads';
  if (s.includes('google') || s.includes('gads')) return 'Google Ads';
  if (s.includes('tiktok') || s.includes('tt')) return 'TikTok';
  if (s.includes('youtube') || s.includes('yt')) return 'YouTube';
  if (s.includes('twitter') || s.includes('x.com')) return 'X / Twitter';
  if (s.includes('pre-auth-checkout') || s === 'direct/organic') return 'Organic';
  return source;
}

function getSourceConfig(source: string): { color: string; bg: string; border: string; icon: string } {
  const label = getSourceLabel(source);
  switch (label) {
    case 'Meta Ads':
      return { color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.12)', border: 'rgba(96, 165, 250, 0.25)', icon: '📘' };
    case 'Google Ads':
      return { color: '#F87171', bg: 'rgba(248, 113, 113, 0.12)', border: 'rgba(248, 113, 113, 0.25)', icon: '🔍' };
    case 'TikTok':
      return { color: '#F472B6', bg: 'rgba(244, 114, 182, 0.12)', border: 'rgba(244, 114, 182, 0.25)', icon: '🎵' };
    case 'YouTube':
      return { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.25)', icon: '▶️' };
    case 'Organic':
      return { color: '#8B8BA8', bg: 'rgba(139, 139, 168, 0.10)', border: 'rgba(139, 139, 168, 0.20)', icon: '🌿' };
    default:
      return { color: '#A78BFA', bg: 'rgba(167, 139, 250, 0.12)', border: 'rgba(167, 139, 250, 0.25)', icon: '🔗' };
  }
}

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

function StatCard({ icon, label, value, subtext, accentColor, delay }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  accentColor: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'relative',
        flex: '1 1 0',
        minWidth: 160,
        borderRadius: 16,
        backgroundColor: T.cardBg,
        border: `1px solid ${T.cardBorder}`,
        boxShadow: T.shadow,
        overflow: 'hidden',
        padding: '20px 20px 18px',
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: `linear-gradient(90deg, transparent 10%, ${accentColor}80 50%, transparent 90%)`,
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: `${accentColor}18`,
          border: `1px solid ${accentColor}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {icon}
        </div>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.1em',
          color: T.textMuted,
          fontFamily: "'Inter', 'Lato', sans-serif",
        }}>
          {label}
        </span>
      </div>

      <div style={{
        fontSize: 28,
        fontWeight: 700,
        color: T.textPrimary,
        letterSpacing: '-0.02em',
        fontFamily: "'Inter', 'Lato', sans-serif",
        lineHeight: 1,
      }}>
        {value}
      </div>

      {subtext && (
        <div style={{
          fontSize: 11,
          color: T.textMuted,
          marginTop: 8,
          fontWeight: 500,
          fontFamily: "'Inter', 'Lato', sans-serif",
        }}>
          {subtext}
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// SOURCE BAR — visual breakdown
// ============================================================================

function SourceBar({ sources }: { sources: Array<{ label: string; count: number; config: ReturnType<typeof getSourceConfig> }> }) {
  const total = sources.reduce((s, src) => s + src.count, 0);
  if (total === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      style={{
        borderRadius: 16,
        backgroundColor: T.cardBg,
        border: `1px solid ${T.cardBorder}`,
        boxShadow: T.shadow,
        padding: '20px 24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.1em',
          color: T.textMuted,
          fontFamily: "'Inter', 'Lato', sans-serif",
        }}>
          Source Breakdown
        </span>
        <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 500 }}>
          {total} total
        </span>
      </div>

      {/* Segmented bar */}
      <div style={{
        display: 'flex',
        width: '100%',
        height: 10,
        borderRadius: 6,
        overflow: 'hidden',
        gap: 2,
        backgroundColor: '#151528',
        marginBottom: 16,
      }}>
        {sources.map(src => (
          <motion.div
            key={src.label}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{
              width: `${(src.count / total) * 100}%`,
              backgroundColor: src.config.color,
              borderRadius: 4,
              opacity: 0.75,
              transformOrigin: 'left',
            }}
          />
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '8px 20px' }}>
        {sources.map(src => (
          <div key={src.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: 3,
              backgroundColor: src.config.color,
              opacity: 0.75,
            }} />
            <span style={{ fontSize: 12, color: T.textSecondary, fontWeight: 500, fontFamily: "'Inter', 'Lato', sans-serif" }}>
              {src.label}
            </span>
            <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 600, fontFamily: "'Inter', 'Lato', sans-serif" }}>
              {src.count}
            </span>
            <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 500 }}>
              ({Math.round((src.count / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN TABLE COMPONENT
// ============================================================================

export default function CustomersTable({ initialUsers }: CustomersTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [page, setPage] = useState(0);

  const uniqueSources = useMemo(() => {
    const sources = new Set<string>();
    initialUsers.forEach(user => {
      const source = user.metadata.utm_source || user.metadata.source || 'Direct/Organic';
      sources.add(source);
    });
    return Array.from(sources).sort();
  }, [initialUsers]);

  const sourceBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    initialUsers.forEach(user => {
      const raw = user.metadata.utm_source || user.metadata.source || 'Direct/Organic';
      const label = getSourceLabel(raw);
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count, config: getSourceConfig(label) }))
      .sort((a, b) => b.count - a.count);
  }, [initialUsers]);

  const attributedCount = useMemo(() => {
    return initialUsers.filter(u => {
      const s = (u.metadata.utm_source || u.metadata.source || '').toLowerCase();
      return s && s !== 'direct/organic' && s !== 'pre-auth-checkout';
    }).length;
  }, [initialUsers]);

  const recentCount = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return initialUsers.filter(u => new Date(u.createdAt).getTime() > weekAgo).length;
  }, [initialUsers]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredAndSortedUsers = useMemo(() => {
    return initialUsers
      .filter(user => {
        const matchSearch =
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (user.firstName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (user.lastName || '').toLowerCase().includes(searchTerm.toLowerCase());

        let matchSource = true;
        if (filterSource !== 'all') {
          const uSource = user.metadata.utm_source || user.metadata.source || 'Direct/Organic';
          matchSource = uSource === filterSource;
        }

        return matchSearch && matchSource;
      })
      .sort((a, b) => {
        let compareValue = 0;
        switch (sortField) {
          case 'createdAt':
            compareValue = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            break;
          case 'email':
            compareValue = a.email.localeCompare(b.email);
            break;
          case 'name': {
            const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim();
            const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim();
            compareValue = nameA.localeCompare(nameB);
            break;
          }
          case 'source': {
            const srcA = a.metadata.utm_source || a.metadata.source || 'Direct/Organic';
            const srcB = b.metadata.utm_source || b.metadata.source || 'Direct/Organic';
            compareValue = (srcA as string).localeCompare(srcB as string);
            break;
          }
        }
        return sortDirection === 'asc' ? compareValue : -compareValue;
      });
  }, [initialUsers, searchTerm, sortField, sortDirection, filterSource]);

  const totalPages = Math.ceil(filteredAndSortedUsers.length / ROWS_PER_PAGE);
  const paginatedUsers = filteredAndSortedUsers.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);

  // Reset page when filters change
  useMemo(() => setPage(0), [searchTerm, filterSource]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown style={{ width: 13, height: 13, color: T.textMuted, marginLeft: 6 }} />;
    return sortDirection === 'asc'
      ? <ArrowUp style={{ width: 13, height: 13, color: T.accent, marginLeft: 6 }} />
      : <ArrowDown style={{ width: 13, height: 13, color: T.accent, marginLeft: 6 }} />;
  };

  const renderSourceBadge = (source: string) => {
    const label = getSourceLabel(source);
    const config = getSourceConfig(source);
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '4px 10px',
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.02em',
        color: config.color,
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        fontFamily: "'Inter', 'Lato', sans-serif",
      }}>
        <span style={{ fontSize: 10 }}>{config.icon}</span>
        {label}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>

      {/* ── STAT CARDS ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard
          icon={<Users style={{ width: 16, height: 16, color: T.accent }} />}
          label="Total Customers"
          value={initialUsers.length.toLocaleString()}
          subtext="All time"
          accentColor={T.accent}
          delay={0}
        />
        <StatCard
          icon={<Zap style={{ width: 16, height: 16, color: '#F59E0B' }} />}
          label="Last 7 Days"
          value={recentCount}
          subtext="New signups"
          accentColor="#F59E0B"
          delay={0.05}
        />
        <StatCard
          icon={<TrendingUp style={{ width: 16, height: 16, color: '#60A5FA' }} />}
          label="Attributed"
          value={attributedCount}
          subtext={`${initialUsers.length > 0 ? Math.round((attributedCount / initialUsers.length) * 100) : 0}% trackable`}
          accentColor="#60A5FA"
          delay={0.1}
        />
        <StatCard
          icon={<Globe style={{ width: 16, height: 16, color: '#A78BFA' }} />}
          label="Sources"
          value={sourceBreakdown.length}
          subtext="Unique channels"
          accentColor="#A78BFA"
          delay={0.15}
        />
      </div>

      {/* ── SOURCE BAR ─────────────────────────────────────────── */}
      <SourceBar sources={sourceBreakdown} />

      {/* ── CONTROLS BAR ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        style={{
          display: 'flex',
          flexWrap: 'wrap' as const,
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          borderRadius: 16,
          padding: '12px 16px',
          backgroundColor: T.cardBg,
          border: `1px solid ${T.cardBorder}`,
          boxShadow: T.shadow,
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: 420 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <Search style={{ width: 15, height: 15, color: T.textMuted }} />
          </div>
          <input
            type="text"
            style={{
              width: '100%',
              paddingLeft: 38,
              paddingRight: 12,
              paddingTop: 10,
              paddingBottom: 10,
              border: `1px solid ${T.cardBorder}`,
              borderRadius: 12,
              background: T.inputBg,
              color: T.textPrimary,
              fontSize: 13,
              outline: 'none',
              fontFamily: "'Inter', 'Lato', sans-serif",
            }}
            placeholder="Search by email or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 14px',
            borderRadius: 12,
            backgroundColor: T.inputBg,
            border: `1px solid ${T.cardBorder}`,
          }}>
            <Filter style={{ width: 13, height: 13, color: T.textMuted, marginRight: 8, flexShrink: 0 }} />
            <select
              style={{
                background: 'transparent',
                fontSize: 12,
                color: T.textSecondary,
                border: 'none',
                outline: 'none',
                cursor: 'pointer',
                fontWeight: 500,
                fontFamily: "'Inter', 'Lato', sans-serif",
                appearance: 'none' as const,
                paddingRight: 8,
              }}
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
            >
              <option value="all" style={{ background: T.cardBg, color: T.textPrimary }}>All Sources</option>
              {uniqueSources.map(src => (
                <option key={src} value={src} style={{ background: T.cardBg, color: T.textPrimary }}>{src}</option>
              ))}
            </select>
          </div>

          <div style={{
            padding: '8px 14px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap' as const,
            color: T.accent,
            backgroundColor: T.accentDim,
            border: `1px solid ${T.accentBorder}`,
            fontFamily: "'Inter', 'Lato', sans-serif",
          }}>
            <Users style={{ width: 13, height: 13 }} />
            {filteredAndSortedUsers.length}
          </div>
        </div>
      </motion.div>

      {/* ── TABLE ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        style={{
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: T.tableBg,
          border: `1px solid ${T.cardBorder}`,
          boxShadow: T.shadowLg,
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left' as const, borderCollapse: 'collapse' as const }}>
            <thead>
              <tr style={{ backgroundColor: T.tableHeaderBg, borderBottom: `1px solid ${T.divider}` }}>
                {[
                  { field: 'createdAt' as SortField, label: 'Date' },
                  { field: 'name' as SortField, label: 'Customer' },
                  { field: 'source' as SortField, label: 'Origin' },
                ].map(col => (
                  <th
                    key={col.field}
                    onClick={() => handleSort(col.field)}
                    style={{
                      padding: '14px 20px',
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.1em',
                      color: T.textMuted,
                      cursor: 'pointer',
                      transition: 'color 0.15s',
                      fontFamily: "'Inter', 'Lato', sans-serif",
                      userSelect: 'none',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableCellElement).style.color = T.textSecondary; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableCellElement).style.color = T.textMuted; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {col.label} <SortIcon field={col.field} />
                    </div>
                  </th>
                ))}
                <th style={{
                  padding: '14px 20px',
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.1em',
                  color: T.textMuted,
                  fontFamily: "'Inter', 'Lato', sans-serif",
                }}>
                  Campaign
                </th>
                <th style={{
                  padding: '14px 20px',
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.1em',
                  color: T.textMuted,
                  textAlign: 'right' as const,
                  fontFamily: "'Inter', 'Lato', sans-serif",
                }}>
                  Click ID
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user, idx) => {
                    const source = user.metadata.utm_source || user.metadata.source || 'Direct/Organic';
                    const campaign = user.metadata.utm_campaign || '';
                    const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unknown';
                    const isNew = new Date(user.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000;
                    const initials = name !== 'Unknown'
                      ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
                      : '?';

                    const hash = user.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
                    const hue1 = hash % 360;
                    const hue2 = (hash * 7) % 360;

                    return (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15, delay: idx * 0.012 }}
                        style={{
                          borderBottom: `1px solid ${T.divider}`,
                          cursor: 'default',
                          transition: 'background-color 0.15s',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = T.tableRowHover; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent'; }}
                      >
                        {/* Date */}
                        <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' as const }}>
                          <span style={{
                            fontSize: 13,
                            color: T.textSecondary,
                            fontWeight: 500,
                            fontFamily: "'Inter', 'Lato', sans-serif",
                            fontVariantNumeric: 'tabular-nums',
                          }}>
                            {format(new Date(user.createdAt), 'MMM d, yyyy')}
                          </span>
                          <span style={{ fontSize: 11, color: T.textMuted, marginLeft: 8, fontWeight: 500 }}>
                            {format(new Date(user.createdAt), 'h:mm a')}
                          </span>
                        </td>

                        {/* Customer */}
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 34,
                              height: 34,
                              borderRadius: '50%',
                              background: `linear-gradient(135deg, hsl(${hue1}, 45%, 30%), hsl(${hue2}, 55%, 22%))`,
                              border: '1px solid rgba(255,255,255,0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 11,
                              fontWeight: 700,
                              color: 'rgba(255,255,255,0.8)',
                              flexShrink: 0,
                              fontFamily: "'Inter', 'Lato', sans-serif",
                            }}>
                              {initials}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: T.textPrimary,
                                  fontFamily: "'Inter', 'Lato', sans-serif",
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap' as const,
                                }}>
                                  {name}
                                </span>
                                {isNew && (
                                  <span style={{
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    fontSize: 9,
                                    fontWeight: 800,
                                    textTransform: 'uppercase' as const,
                                    letterSpacing: '0.06em',
                                    color: T.accent,
                                    backgroundColor: T.accentDim,
                                    border: `1px solid ${T.accentBorder}`,
                                    flexShrink: 0,
                                  }}>
                                    New
                                  </span>
                                )}
                              </div>
                              <div style={{
                                fontSize: 11,
                                color: T.textMuted,
                                fontWeight: 500,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap' as const,
                                marginTop: 2,
                                fontFamily: "'Inter', 'Lato', sans-serif",
                              }}>
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Origin */}
                        <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' as const }}>
                          {renderSourceBadge(source)}
                        </td>

                        {/* Campaign */}
                        <td style={{ padding: '14px 20px' }}>
                          {campaign ? (
                            <div style={{ maxWidth: 220 }}>
                              <div style={{
                                fontSize: 12,
                                color: T.textSecondary,
                                fontWeight: 500,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap' as const,
                                fontFamily: "'Inter', 'Lato', sans-serif",
                              }} title={campaign}>
                                {campaign}
                              </div>
                              {user.metadata.utm_content && (
                                <div style={{
                                  fontSize: 10,
                                  color: T.textMuted,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap' as const,
                                  marginTop: 2,
                                }} title={user.metadata.utm_content}>
                                  {user.metadata.utm_content}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: T.textMuted, fontSize: 13 }}>—</span>
                          )}
                        </td>

                        {/* Click ID */}
                        <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' as const, textAlign: 'right' as const }}>
                          {user.metadata.fbclid ? (
                            <span
                              style={{
                                fontSize: 11,
                                color: T.textMuted,
                                fontFamily: "'SF Mono', 'Fira Code', monospace",
                                transition: 'color 0.15s',
                                cursor: 'default',
                              }}
                              title={user.metadata.fbclid}
                            >
                              ...{user.metadata.fbclid.slice(-8)}
                            </span>
                          ) : (
                            <span style={{ color: T.textMuted, fontSize: 13 }}>—</span>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: '60px 20px', textAlign: 'center' as const }}>
                      <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 12 }}>
                        <Search style={{ width: 28, height: 28, color: T.textMuted, opacity: 0.4 }} />
                        <p style={{ fontSize: 13, color: T.textMuted, fontWeight: 500 }}>No customers found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION ──────────────────────────────────────── */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderTop: `1px solid ${T.divider}`,
            backgroundColor: T.tableHeaderBg,
          }}>
            <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 500, fontFamily: "'Inter', 'Lato', sans-serif" }}>
              {page * ROWS_PER_PAGE + 1}–{Math.min((page + 1) * ROWS_PER_PAGE, filteredAndSortedUsers.length)} of {filteredAndSortedUsers.length}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${T.cardBorder}`,
                  backgroundColor: 'transparent',
                  cursor: page === 0 ? 'default' : 'pointer',
                  opacity: page === 0 ? 0.3 : 1,
                  transition: 'all 0.15s',
                }}
              >
                <ChevronLeft style={{ width: 15, height: 15, color: T.textSecondary }} />
              </button>

              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) { pageNum = i; }
                else if (page < 3) { pageNum = i; }
                else if (page >= totalPages - 3) { pageNum = totalPages - 5 + i; }
                else { pageNum = page - 2 + i; }
                const isActive = page === pageNum;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      color: isActive ? T.accent : T.textMuted,
                      backgroundColor: isActive ? T.accentDim : 'transparent',
                      border: isActive ? `1px solid ${T.accentBorder}` : '1px solid transparent',
                      fontFamily: "'Inter', 'Lato', sans-serif",
                    }}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}

              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${T.cardBorder}`,
                  backgroundColor: 'transparent',
                  cursor: page >= totalPages - 1 ? 'default' : 'pointer',
                  opacity: page >= totalPages - 1 ? 0.3 : 1,
                  transition: 'all 0.15s',
                }}
              >
                <ChevronRight style={{ width: 15, height: 15, color: T.textSecondary }} />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
