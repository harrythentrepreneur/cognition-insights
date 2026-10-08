'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { buildRelativeUrlWithSession } from '@/utils/sessionUtils';

// ─── Calendar helpers ────────────────────────────────────────
const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const daysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const isInRange = (day: Date, start: Date | null, end: Date | null) => {
  if (!start || !end) return false;
  const t = day.getTime();
  return t > start.getTime() && t < end.getTime();
};

const formatRange = (start: Date | null, end: Date | null) => {
  if (!start) return 'Select start date';
  if (!end) return `${SHORT_MONTHS[start.getMonth()]} ${start.getDate()} → …`;
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  if (sameMonth)
    return `${SHORT_MONTHS[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`;
  if (sameYear)
    return `${SHORT_MONTHS[start.getMonth()]} ${start.getDate()} – ${SHORT_MONTHS[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
  return `${SHORT_MONTHS[start.getMonth()]} ${start.getDate()}, ${start.getFullYear()} – ${SHORT_MONTHS[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
};

// ─── Component ───────────────────────────────────────────────

interface HamburgerMenuProps { className?: string; }

export default function HamburgerMenu({ className }: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showForecastPicker, setShowForecastPicker] = useState(false);
  const [forecastHorizon, setForecastHorizon] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('global-forecast-horizon');
        if (stored) return parseInt(stored, 10);
      } catch {}
    }
    return 0;
  });
  const [trialAttribution, setTrialAttribution] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('global-trial-attribution');
        if (stored) return stored === 'true';
      } catch {}
    }
    return true; // ON by default — aligned attribution
  });
  const [togglePulseKey, setTogglePulseKey] = useState(0);
  const [rangeStart, setRangeStart] = useState<Date | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('global-date-range');
        if (stored) {
          const { start } = JSON.parse(stored);
          if (start) return new Date(start);
        }
      } catch {}
    }
    return null;
  });
  const [rangeEnd, setRangeEnd] = useState<Date | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('global-date-range');
        if (stored) {
          const { end } = JSON.parse(stored);
          if (end) return new Date(end);
        }
      } catch {}
    }
    return null;
  });
  const [selectingEnd, setSelectingEnd] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);
  const [viewMonth, setViewMonth] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('global-date-range');
        if (stored) {
          const { end } = JSON.parse(stored);
          if (end) {
            const endDate = new Date(end);
            return new Date(endDate.getFullYear(), endDate.getMonth(), 1);
          }
        }
      } catch {}
    }
    return new Date();
  });
  const [activePreset, setActivePreset] = useState<number | null>(null);

  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowDatePicker(false);
        setShowForecastPicker(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const toggleMenu = () => {
    setIsOpen(v => !v);
    if (!isOpen) {
      // Intentionally leave submenus mostly closed or alone
    } else {
      setShowDatePicker(false);
      setShowForecastPicker(false);
    }
  };

  // Calendar grid
  const calendarDays = useMemo(() => {
    const first = startOfMonth(viewMonth);
    let startDow = first.getDay(); // 0 = Sun
    startDow = startDow === 0 ? 6 : startDow - 1; // convert to Mon-based
    const count = daysInMonth(viewMonth);
    const days: (Date | null)[] = Array(startDow).fill(null);
    for (let d = 1; d <= count; d++) {
      days.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
    }
    // Pad to fill 6 rows
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [viewMonth]);

  const prevMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  const nextMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));

  const handleDayClick = (day: Date) => {
    if (!selectingEnd || !rangeStart) {
      // Start a new selection
      setRangeStart(day);
      setRangeEnd(null);
      setSelectingEnd(true);
      setActivePreset(null);
    } else {
      // Complete the selection
      if (day.getTime() < rangeStart.getTime()) {
        setRangeEnd(rangeStart);
        setRangeStart(day);
      } else {
        setRangeEnd(day);
      }
      setSelectingEnd(false);
      setActivePreset(null);
    }
  };

  const applyPreset = (days: number, index: number) => {
    const end = new Date();
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    setRangeStart(start);
    setRangeEnd(end);
    setSelectingEnd(false);
    setActivePreset(index);
    setViewMonth(new Date(end.getFullYear(), end.getMonth(), 1));
  };

  const handleApply = () => {
    if (!rangeStart || !rangeEnd) return;
    const start = new Date(rangeStart); start.setHours(0, 0, 0, 0);
    const end = new Date(rangeEnd); end.setHours(23, 59, 59, 999);

    try {
      localStorage.setItem('global-date-range', JSON.stringify({
        start: start.toISOString(), end: end.toISOString(),
      }));
    } catch {}

    window.dispatchEvent(new CustomEvent('dateRangeChange', { detail: { start, end } }));
    setIsOpen(false);
    setShowDatePicker(false);
  };

  const handleSaveData = () => {
    const blob = new Blob([document.documentElement.outerHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cognition-analysis-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  const handleUploadAgain = () => {
    router.push(buildRelativeUrlWithSession('/welcome'));
    setIsOpen(false);
  };

  const presets = [
    { label: '7d', days: 7 },
    { label: '30d', days: 30 },
    { label: '90d', days: 90 },
    { label: '1y', days: 365 },
    { label: 'All', days: 365 * 3 },
  ];

  const ready = rangeStart && rangeEnd;

  // Determine effective "end" for hover preview
  const effectiveEnd = selectingEnd && hoveredDay && rangeStart
    ? (hoveredDay.getTime() >= rangeStart.getTime() ? hoveredDay : rangeStart)
    : rangeEnd;
  const effectiveStart = selectingEnd && hoveredDay && rangeStart
    ? (hoveredDay.getTime() < rangeStart.getTime() ? hoveredDay : rangeStart)
    : rangeStart;

  const today = new Date();

  return (
    <div ref={menuRef} {...(className ? { className } : {})} style={{ position: 'relative' }}>
      {/* Hamburger */}
      <button onClick={toggleMenu} aria-label="Menu" style={{
        backgroundColor: 'transparent', border: 'none', width: '32px', height: '32px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '4px', cursor: 'pointer', outline: 'none', padding: '0',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: '24px', height: '2px', backgroundColor: '#00F5D4', borderRadius: '1px',
            transition: 'all 0.3s ease',
            transform: i === 0 ? (isOpen ? 'rotate(45deg) translateY(6px)' : 'none')
              : i === 2 ? (isOpen ? 'rotate(-45deg) translateY(-6px)' : 'none') : undefined,
            opacity: i === 1 ? (isOpen ? 0 : 1) : 1,
            filter: 'drop-shadow(0 0 3px rgba(0,245,212,0.6)) drop-shadow(0 0 6px rgba(0,245,212,0.3))',
          }} />
        ))}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute', top: '48px', right: '0',
          background: 'rgba(16,16,30,0.97)',
          backdropFilter: 'blur(40px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(40px) saturate(1.4)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '14px',
          width: showDatePicker ? '320px' : '220px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset',
          zIndex: 1000,
          animation: 'hmSlideIn 0.22s cubic-bezier(0.16,1,0.3,1)',
          overflow: 'hidden',
          transition: 'width 0.25s cubic-bezier(0.16,1,0.3,1)',
        }}>

          {/* ─── Controls Section ─── */}
          <div style={{ padding: '4px 4px 0' }}>

            {/* Date Range */}
            <button
              onClick={() => { setShowDatePicker(v => !v); setShowForecastPicker(false); }}
              style={{
                width: '100%', padding: '10px 12px',
                background: showDatePicker ? 'rgba(0,245,212,0.06)' : 'transparent',
                border: 'none', borderRadius: '10px',
                color: showDatePicker ? '#00F5D4' : '#7A7A92',
                fontSize: '13px', fontFamily: "'Inter',sans-serif", fontWeight: 500,
                textAlign: 'left', cursor: 'pointer', outline: 'none',
                display: 'flex', alignItems: 'center', gap: '10px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { if (!showDatePicker) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#A0A0B8'; }}}
              onMouseLeave={e => { if (!showDatePicker) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#7A7A92'; }}}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7, flexShrink: 0 }}>
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Date Range
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ marginLeft: 'auto', opacity: 0.3, transition: 'transform 0.2s ease', transform: showDatePicker ? 'rotate(180deg)' : 'none' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {/* Calendar Panel */}
            {showDatePicker && (
              <div style={{
                margin: '2px 0 4px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                animation: 'hmPanelIn 0.25s cubic-bezier(0.16,1,0.3,1)',
                overflow: 'hidden',
              }}>
                {/* Range Summary */}
                <div style={{
                  padding: '9px 12px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <div style={{
                    width: '5px', height: '5px', borderRadius: '50%',
                    background: ready ? '#00F5D4' : 'rgba(255,255,255,0.12)',
                    boxShadow: ready ? '0 0 6px rgba(0,245,212,0.35)' : 'none',
                    transition: 'all 0.2s ease', flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: '11.5px', fontFamily: "'Inter',sans-serif", fontWeight: 500,
                    color: ready ? '#B8B8D0' : '#50506A',
                    letterSpacing: '0.15px',
                  }}>
                    {formatRange(effectiveStart, selectingEnd ? effectiveEnd : rangeEnd)}
                  </span>
                </div>

                {/* Preset Chips */}
                <div style={{ padding: '8px 8px 4px', display: 'flex', gap: '3px' }}>
                  {presets.map((p, i) => {
                    const active = activePreset === i;
                    return (
                      <button key={p.days} onClick={() => applyPreset(p.days, i)} style={{
                        flex: 1, padding: '5px 0', fontSize: '10px',
                        fontFamily: "'Inter',sans-serif", fontWeight: active ? 600 : 500,
                        color: active ? '#0A0A16' : '#5A5A70',
                        background: active
                          ? '#00F5D4'
                          : 'rgba(255,255,255,0.03)',
                        border: active ? 'none' : '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '6px', cursor: 'pointer', outline: 'none',
                        transition: 'all 0.15s ease', letterSpacing: '0.2px',
                      }}
                      onMouseEnter={e => { if (!active) { e.currentTarget.style.color = '#9090A8'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}}
                      onMouseLeave={e => { if (!active) { e.currentTarget.style.color = '#5A5A70'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                {/* Month Nav */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '4px 10px 2px',
                }}>
                  <button onClick={prevMonth} style={{
                    background: 'none', border: 'none', cursor: 'pointer', outline: 'none',
                    color: '#50506A', padding: '3px', borderRadius: '5px',
                    transition: 'all 0.15s ease', display: 'flex',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#A0A0B8'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#50506A'; e.currentTarget.style.background = 'none'; }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <span style={{
                    fontSize: '11.5px', fontFamily: "'Inter',sans-serif", fontWeight: 600,
                    color: '#A0A0B8', letterSpacing: '0.2px',
                  }}>
                    {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
                  </span>
                  <button onClick={nextMonth} style={{
                    background: 'none', border: 'none', cursor: 'pointer', outline: 'none',
                    color: '#50506A', padding: '3px', borderRadius: '5px',
                    transition: 'all 0.15s ease', display: 'flex',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#A0A0B8'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#50506A'; e.currentTarget.style.background = 'none'; }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>

                {/* Day Headers */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                  padding: '2px 8px 3px',
                }}>
                  {DAYS.map(d => (
                    <div key={d} style={{
                      textAlign: 'center', fontSize: '9px',
                      fontFamily: "'Inter',sans-serif", fontWeight: 600,
                      color: '#3A3A4E', letterSpacing: '0.4px',
                      padding: '2px 0', textTransform: 'uppercase' as const,
                    }}>{d}</div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                  padding: '0 6px 6px', gap: '1px',
                }}>
                  {calendarDays.map((day, idx) => {
                    if (!day) return <div key={`e-${idx}`} />;

                    const isStart = effectiveStart && isSameDay(day, effectiveStart);
                    const isEnd = effectiveEnd && !selectingEnd && isSameDay(day, effectiveEnd);
                    const isEndPreview = selectingEnd && effectiveEnd && isSameDay(day, effectiveEnd);
                    const inRange = isInRange(day, effectiveStart, selectingEnd ? effectiveEnd : rangeEnd);
                    const isToday = isSameDay(day, today);
                    const isSelected = isStart || isEnd || isEndPreview;
                    const isFuture = day.getTime() > today.getTime() + 86400000;

                    return (
                      <div
                        key={idx}
                        onClick={() => !isFuture && handleDayClick(day)}
                        onMouseEnter={() => selectingEnd && setHoveredDay(day)}
                        onMouseLeave={() => selectingEnd && setHoveredDay(null)}
                        style={{
                          position: 'relative',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          height: '28px', fontSize: '10.5px',
                          fontFamily: "'Inter',sans-serif",
                          fontWeight: isSelected ? 700 : isToday ? 600 : 400,
                          color: isFuture ? '#2A2A3A'
                            : isSelected ? '#0A0A16'
                            : inRange ? '#B8D0CC'
                            : isToday ? '#00F5D4'
                            : '#7A7A96',
                          background: isSelected
                            ? '#00F5D4'
                            : inRange
                              ? 'rgba(0,245,212,0.07)'
                              : 'transparent',
                          borderRadius: isStart && (inRange || isEnd || isEndPreview) ? '7px 0 0 7px'
                            : (isEnd || isEndPreview) && inRange ? '0 7px 7px 0'
                            : isSelected ? '7px'
                            : '0',
                          cursor: isFuture ? 'default' : 'pointer',
                          transition: 'all 0.12s ease',
                        }}
                      >
                        {isToday && !isSelected && (
                          <div style={{
                            position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)',
                            width: '3px', height: '3px', borderRadius: '50%',
                            backgroundColor: '#00F5D4', opacity: 0.5,
                          }} />
                        )}
                        {day.getDate()}
                      </div>
                    );
                  })}
                </div>

                {/* Apply */}
                <div style={{ padding: '3px 8px 8px' }}>
                  <button onClick={handleApply} disabled={!ready} style={{
                    width: '100%', padding: '8px', fontSize: '11px',
                    fontFamily: "'Inter',sans-serif", fontWeight: 600, letterSpacing: '0.3px',
                    color: ready ? '#0A0A16' : '#3A3A4E',
                    background: ready ? '#00F5D4' : 'rgba(255,255,255,0.025)',
                    border: ready ? 'none' : '1px solid rgba(255,255,255,0.04)',
                    borderRadius: '8px', cursor: ready ? 'pointer' : 'default',
                    transition: 'all 0.2s ease', outline: 'none',
                    opacity: ready ? 1 : 0.35,
                  }}
                  onMouseEnter={e => { if (ready) e.currentTarget.style.opacity = '0.85'; }}
                  onMouseLeave={e => { if (ready) e.currentTarget.style.opacity = '1'; }}
                  >
                    Apply Range
                  </button>
                </div>
              </div>
            )}

            {/* Forecast Window */}
            <button
              onClick={() => { setShowForecastPicker(v => !v); setShowDatePicker(false); }}
              style={{
                width: '100%', padding: '10px 12px',
                background: showForecastPicker ? 'rgba(0,245,212,0.06)' : 'transparent',
                border: 'none', borderRadius: '10px',
                color: showForecastPicker ? '#00F5D4' : '#7A7A92',
                fontSize: '13px', fontFamily: "'Inter',sans-serif", fontWeight: 500,
                textAlign: 'left', cursor: 'pointer', outline: 'none',
                display: 'flex', alignItems: 'center', gap: '10px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { if (!showForecastPicker) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#A0A0B8'; }}}
              onMouseLeave={e => { if (!showForecastPicker) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#7A7A92'; }}}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7, flexShrink: 0 }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              Forecast Window
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ marginLeft: 'auto', opacity: 0.3, transition: 'transform 0.2s ease', transform: showForecastPicker ? 'rotate(180deg)' : 'none' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {/* Forecast Panel */}
            {showForecastPicker && (
              <div style={{
                margin: '2px 0 4px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                animation: 'hmPanelIn 0.25s cubic-bezier(0.16,1,0.3,1)',
                overflow: 'hidden',
                padding: '4px'
              }}>
                {[
                  { label: 'Today (Actuals)', days: 0 },
                  { label: '7-Day Estimate', days: 7 },
                  { label: '37-Day Estimate', days: 37 },
                  { label: '67-Day Estimate', days: 67 },
                  { label: '97-Day Estimate', days: 97 },
                  { label: '1-Year LTV', days: 365 },
                ].map((preset, idx) => {
                  const active = forecastHorizon === preset.days;
                  return (
                    <button
                      key={preset.days}
                      onClick={() => {
                        setForecastHorizon(preset.days);
                        try { localStorage.setItem('global-forecast-horizon', preset.days.toString()); } catch {}
                        window.dispatchEvent(new CustomEvent('forecastHorizonChange', { detail: { days: preset.days } }));
                        setIsOpen(false);
                        setShowForecastPicker(false);
                      }}
                      style={{
                        width: '100%', padding: '7px 10px',
                        background: active ? 'rgba(0,245,212,0.08)' : 'transparent',
                        border: active ? '1px solid rgba(0,245,212,0.15)' : '1px solid transparent',
                        borderRadius: '7px',
                        color: active ? '#00F5D4' : '#7A7A96',
                        fontSize: '11.5px', fontFamily: "'Inter',sans-serif", fontWeight: active ? 600 : 500,
                        textAlign: 'left', cursor: 'pointer', outline: 'none',
                        marginBottom: idx < 5 ? '2px' : '0',
                        transition: 'all 0.15s ease',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                      }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      {preset.label}
                      {active && <div style={{width: '5px', height: '5px', borderRadius: '50%', background: '#00F5D4', boxShadow: '0 0 6px rgba(0,245,212,0.35)'}} />}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Attribution Toggle */}
            <button
              onClick={() => {
                const next = !trialAttribution;
                setTrialAttribution(next);
                setTogglePulseKey(k => k + 1);
                try { localStorage.setItem('global-trial-attribution', next.toString()); } catch {}
                window.dispatchEvent(new CustomEvent('attributionModelChange', { detail: { enabled: next } }));
              }}
              style={{
                width: '100%', padding: '10px 12px',
                background: 'transparent',
                border: 'none', borderRadius: '10px',
                color: '#7A7A92',
                fontSize: '13px', fontFamily: "'Inter',sans-serif", fontWeight: 500,
                textAlign: 'left', cursor: 'pointer', outline: 'none',
                display: 'flex', alignItems: 'center', gap: '10px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#A0A0B8'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#7A7A92'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7, flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span style={{ flex: 1 }}>1-Week Attribution</span>
              {/* Toggle */}
              <div style={{
                width: '34px', height: '18px', borderRadius: '9px',
                background: trialAttribution
                  ? 'linear-gradient(135deg, #00F5D4, #00D4AA)'
                  : 'rgba(255,255,255,0.06)',
                border: trialAttribution ? '1px solid rgba(0,245,212,0.3)' : '1px solid rgba(255,255,255,0.08)',
                position: 'relative',
                transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                flexShrink: 0,
                boxShadow: trialAttribution
                  ? '0 0 12px rgba(0,245,212,0.25), 0 0 4px rgba(0,245,212,0.15) inset'
                  : '0 1px 3px rgba(0,0,0,0.2) inset',
              }}>
                {/* Glow pulse on toggle */}
                <div key={togglePulseKey} style={{
                  position: 'absolute',
                  inset: '-4px',
                  borderRadius: '14px',
                  background: trialAttribution
                    ? 'radial-gradient(circle, rgba(0,245,212,0.25) 0%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
                  animation: togglePulseKey > 0 ? 'toggleGlowPulse 0.6s cubic-bezier(0.16,1,0.3,1) forwards' : 'none',
                  pointerEvents: 'none',
                }} />
                {/* Sliding dot */}
                <div style={{
                  width: '14px', height: '14px', borderRadius: '50%',
                  background: trialAttribution
                    ? '#0A0A16'
                    : 'linear-gradient(135deg, #6A6A80, #5A5A70)',
                  position: 'absolute',
                  top: '1px',
                  left: trialAttribution ? '17px' : '1px',
                  transition: 'left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease',
                  boxShadow: trialAttribution
                    ? '0 1px 4px rgba(0,0,0,0.4), 0 0 6px rgba(0,245,212,0.2)'
                    : '0 1px 2px rgba(0,0,0,0.3)',
                  transform: togglePulseKey > 0 ? 'scale(1)' : 'scale(1)',
                  animation: togglePulseKey > 0 ? 'toggleDotBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
                }} />
              </div>
            </button>
          </div>

          {/* ─── Divider ─── */}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '2px 12px' }} />

          {/* ─── Links Section ─── */}
          <div style={{ padding: '4px 4px 4px' }}>
            {[
              { label: 'Customer Origins', action: () => { router.push(buildRelativeUrlWithSession('/ad-tracker/customers')); setIsOpen(false); },
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
              { label: 'Cost of Goods', action: () => { router.push(buildRelativeUrlWithSession('/ad-tracker/cost-of-goods')); setIsOpen(false); },
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
              { label: 'Upload Again', action: handleUploadAgain,
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg> },
              { label: 'Save Your Data', action: handleSaveData,
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> },
              { label: 'Contact Support', action: () => { window.location.href = 'mailto:support@cognition.cv'; setIsOpen(false); },
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></svg> },
            ].map(item => (
              <button key={item.label} onClick={item.action} style={{
                width: '100%', padding: '10px 12px', backgroundColor: 'transparent',
                border: 'none', borderRadius: '10px', color: '#7A7A92',
                fontSize: '13px', fontFamily: "'Inter',sans-serif", fontWeight: 500,
                textAlign: 'left', cursor: 'pointer', outline: 'none',
                display: 'flex', alignItems: 'center', gap: '10px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#A0A0B8'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#7A7A92'; }}
              >
                <span style={{ opacity: 0.7, flexShrink: 0, display: 'flex' }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes hmSlideIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes hmPanelIn {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 600px; }
        }
        @keyframes toggleGlowPulse {
          0% { opacity: 0; transform: scale(0.8); }
          30% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 0; transform: scale(1.4); }
        }
        @keyframes toggleDotBounce {
          0% { transform: scale(1); }
          40% { transform: scale(0.8); }
          70% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}