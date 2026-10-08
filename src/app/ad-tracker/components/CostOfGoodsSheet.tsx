'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// ─── Types ──────────────────────────────────────────────────
type Category = 'Hosting' | 'Software' | 'Labor' | 'Subscriptions' | 'Materials' | 'Other';

interface CogEntry {
  id: string;
  date: string;
  category: Category;
  description: string;
  amount: number;
  notes: string;
}

const CATEGORIES: Category[] = ['Hosting', 'Software', 'Labor', 'Subscriptions', 'Materials', 'Other'];

const CATEGORY_COLORS: Record<Category, string> = {
  Hosting: '#7B61FF',
  Software: '#00B4D8',
  Labor: '#FF6B6B',
  Subscriptions: '#FFB347',
  Materials: '#4ECDC4',
  Other: '#8080A0',
};

const CATEGORY_ICONS: Record<Category, string> = {
  Hosting: '🖥️',
  Software: '💿',
  Labor: '👷',
  Subscriptions: '🔄',
  Materials: '📦',
  Other: '📋',
};

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  Hosting: ['hosting', 'server', 'aws', 'vercel', 'netlify', 'heroku', 'digitalocean', 'cloudflare', 'domain', 'dns'],
  Software: ['software', 'license', 'app', 'tool', 'figma', 'adobe', 'notion', 'slack', 'github', 'jira'],
  Labor: ['labor', 'freelance', 'contractor', 'developer', 'designer', 'writer', 'consultant', 'salary', 'wage', 'hire'],
  Subscriptions: ['subscription', 'monthly', 'annual', 'plan', 'saas', 'service', 'membership', 'recurring'],
  Materials: ['material', 'supply', 'hardware', 'equipment', 'shipping', 'inventory', 'print', 'packaging'],
  Other: [],
};

const STORAGE_KEY = 'cog-entries';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PLACEHOLDER_EXAMPLES = [
  '$49 Vercel hosting',
  '$29 Figma subscription monthly',
  '$150 freelancer logo design',
  '$12.99 domain renewal',
  '$500 developer contractor',
  '$9.99 Notion team plan',
];

function genId(): string {
  return Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatCurrency(val: number): string {
  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

// ─── Smart Parsing ──────────────────────────────────────────
function detectCategory(text: string): Category {
  const lower = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as [Category, string[]][]) {
    if (keywords.some(kw => lower.includes(kw))) return cat;
  }
  return 'Other';
}

function detectDate(text: string): string {
  const lower = text.toLowerCase();
  const now = new Date();

  if (lower.includes('today')) return todayStr();
  if (lower.includes('yesterday')) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // Match month name + optional day
  for (let i = 0; i < MONTHS.length; i++) {
    const monthName = MONTHS[i].toLowerCase();
    const regex = new RegExp(`${monthName}\\s*(\\d{1,2})?`, 'i');
    const match = lower.match(regex);
    if (match) {
      const day = match[1] ? parseInt(match[1], 10) : now.getDate();
      const year = now.getFullYear();
      return `${year}-${String(i + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return todayStr();
}

function parseQuickAdd(text: string): Partial<CogEntry> {
  // Extract amount: $49, $49.99, 49, 49.99
  const amountMatch = text.match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;

  // Remove the amount from text to get description
  let description = text
    .replace(/\$?\s*\d+(?:\.\d{1,2})?/, '')
    .replace(/\b(today|yesterday)\b/gi, '')
    .replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*\d{0,2}\b/gi, '')
    .trim()
    .replace(/\s+/g, ' ');

  // Capitalize first letter
  if (description) {
    description = description.charAt(0).toUpperCase() + description.slice(1);
  }

  const category = detectCategory(text);
  const date = detectDate(text);

  return { amount, description, category, date };
}

// ─── CSV Parsing ────────────────────────────────────────────
function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  return lines.map(line => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if ((ch === ',' || ch === '\t') && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    return cells;
  });
}

function detectColumnMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  const lower = headers.map(h => h.toLowerCase().replace(/[^a-z]/g, ''));

  lower.forEach((h, i) => {
    if (['date', 'day', 'time', 'when'].includes(h)) mapping.date = i;
    if (['amount', 'cost', 'price', 'value', 'total', 'sum'].includes(h)) mapping.amount = i;
    if (['description', 'desc', 'item', 'name', 'what', 'detail', 'details'].includes(h)) mapping.description = i;
    if (['category', 'cat', 'type', 'group'].includes(h)) mapping.category = i;
    if (['notes', 'note', 'comment', 'comments', 'memo'].includes(h)) mapping.notes = i;
  });

  return mapping;
}

function csvToEntries(rows: string[][], hasHeaders: boolean): CogEntry[] {
  const dataRows = hasHeaders ? rows.slice(1) : rows;
  const headers = hasHeaders ? rows[0] : [];
  const mapping = hasHeaders ? detectColumnMapping(headers) : {};

  return dataRows.map(cells => {
    const rawAmount = cells[mapping.amount ?? 1] || '0';
    const amount = parseFloat(rawAmount.replace(/[^0-9.-]/g, '')) || 0;
    const description = cells[mapping.description ?? 2] || '';
    const rawCategory = (cells[mapping.category ?? 3] || '').trim();
    const category = CATEGORIES.includes(rawCategory as Category) ? rawCategory as Category : detectCategory(description || rawCategory);
    const notes = cells[mapping.notes ?? 4] || '';
    const rawDate = cells[mapping.date ?? 0] || '';
    let date = todayStr();
    try {
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) {
        date = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
      }
    } catch (_e) { /* keep today */ }

    return { id: genId(), date, category, description, amount, notes };
  }).filter(e => e.amount > 0 || e.description);
}

// ─── Component ──────────────────────────────────────────────
export default function CostOfGoodsSheet() {
  const [entries, setEntries] = useState<CogEntry[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const newRowRef = useRef<HTMLInputElement>(null);

  // Quick-add state
  const [quickText, setQuickText] = useState('');
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successText, setSuccessText] = useState('');
  const quickInputRef = useRef<HTMLInputElement>(null);

  // Voice state
  const [isListening, setIsListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Import state
  const [importPreview, setImportPreview] = useState<CogEntry[] | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setEntries(JSON.parse(raw) as CogEntry[]);
    } catch (_e) {}
    setLoaded(true);
  }, []);

  // Persist
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch (_e) {}
  }, [entries, loaded]);

  // Placeholder cycling
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIdx(i => (i + 1) % PLACEHOLDER_EXAMPLES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // ─── Quick Add ─────────────────────────────────────────────
  const handleQuickAdd = useCallback(() => {
    if (!quickText.trim()) return;
    const parsed = parseQuickAdd(quickText);
    const entry: CogEntry = {
      id: genId(),
      date: parsed.date || todayStr(),
      category: parsed.category || 'Other',
      description: parsed.description || quickText.trim(),
      amount: parsed.amount || 0,
      notes: '',
    };
    setEntries(prev => [...prev, entry]);
    setSuccessText(`Added ${formatCurrency(entry.amount)} — ${entry.description}`);
    setShowSuccess(true);
    setQuickText('');
    setTimeout(() => setShowSuccess(false), 2500);
  }, [quickText]);

  // ─── Voice Input ───────────────────────────────────────────
  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognitionAPI = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      alert('Speech recognition not supported in this browser. Try Chrome or Edge.');
      return;
    }
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results as ArrayLike<any>)
        .map((r: any) => r[0].transcript)
        .join('');
      setQuickText(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  // ─── File Import ───────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      const rows = parseCSV(text);
      if (rows.length < 1) return;

      // Guess if first row is headers
      const firstRow = rows[0];
      const hasHeaders = firstRow.some(cell =>
        /^(date|amount|cost|description|category|notes|item|type|name|total|price)/i.test(cell.trim())
      );

      const preview = csvToEntries(rows, hasHeaders);
      if (preview.length > 0) {
        setImportPreview(preview);
      }
    };
    reader.readAsText(file);
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;
    // Only trigger CSV parsing if the paste looks tabular (has tabs or multiple commas)
    if (text.includes('\t') || (text.split(',').length > 2 && text.includes('\n'))) {
      e.preventDefault();
      const rows = parseCSV(text);
      if (rows.length > 0) {
        const firstRow = rows[0];
        const hasHeaders = firstRow.some(cell =>
          /^(date|amount|cost|description|category|notes|item|type|name|total|price)/i.test(cell.trim())
        );
        const preview = csvToEntries(rows, hasHeaders);
        if (preview.length > 0) {
          setImportPreview(preview);
        }
      }
    }
  }, []);

  const confirmImport = useCallback(() => {
    if (!importPreview) return;
    setEntries(prev => [...prev, ...importPreview]);
    setSuccessText(`Imported ${importPreview.length} entries!`);
    setShowSuccess(true);
    setImportPreview(null);
    setTimeout(() => setShowSuccess(false), 2500);
  }, [importPreview]);

  // ─── Drag & Drop ──────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.tsv') || file.name.endsWith('.txt'))) {
      handleFile(file);
    }
  }, [handleFile]);

  // ─── Entry CRUD ───────────────────────────────────────────
  const handleAdd = useCallback(() => {
    setEntries(prev => [...prev, {
      id: genId(), date: todayStr(), category: 'Other',
      description: '', amount: 0, notes: '',
    }]);
    setTimeout(() => newRowRef.current?.focus(), 80);
  }, []);

  const handleUpdate = useCallback((id: string, field: keyof CogEntry, value: string | number) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setDeletingId(id);
    setTimeout(() => {
      setEntries(prev => prev.filter(e => e.id !== id));
      setDeletingId(null);
    }, 280);
  }, []);

  // ─── Computed ─────────────────────────────────────────────
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(e => {
      if (e.date) {
        const [y, m] = e.date.split('-');
        if (y && m) set.add(`${y}-${m}`);
      }
    });
    return Array.from(set).sort().reverse();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (filter === 'all') return entries;
    return entries.filter(e => e.date.startsWith(filter));
  }, [entries, filter]);

  const filteredTotal = useMemo(() =>
    filteredEntries.reduce((sum, e) => sum + (e.amount || 0), 0),
  [filteredEntries]);

  const grandTotal = useMemo(() =>
    entries.reduce((sum, e) => sum + (e.amount || 0), 0),
  [entries]);

  const formatMonthLabel = (ym: string) => {
    const [y, m] = ym.split('-');
    return `${MONTHS[parseInt(m, 10) - 1]} ${y}`;
  };

  if (!loaded) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} onPaste={handlePaste}>

      {/* ─── Quick-Add Command Bar ─── */}
      <div className="cog-quick-add-container">
        <div className="cog-quick-add-header">
          <span className="cog-quick-add-icon">⚡</span>
          <span className="cog-quick-add-title">Quick Add</span>
          <span className="cog-quick-add-hint">Type naturally or speak — we&apos;ll figure out the rest</span>
        </div>
        <div className="cog-quick-add-bar">
          <div className="cog-quick-add-input-wrap">
            <span className="cog-quick-add-dollar">$</span>
            <input
              ref={quickInputRef}
              type="text"
              className="cog-quick-add-input"
              placeholder={PLACEHOLDER_EXAMPLES[placeholderIdx]}
              value={quickText}
              onChange={e => setQuickText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleQuickAdd(); }}
            />
            <button
              className={`cog-voice-btn ${isListening ? 'listening' : ''}`}
              onClick={isListening ? stopListening : startListening}
              title={isListening ? 'Stop listening' : 'Voice input'}
            >
              {isListening ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              )}
            </button>
          </div>
          <button
            className="cog-quick-add-submit"
            onClick={handleQuickAdd}
            disabled={!quickText.trim()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add
          </button>
        </div>

        {/* Live preview of parsed input */}
        {quickText.trim() && (() => {
          const parsed = parseQuickAdd(quickText);
          return (
            <div className="cog-quick-add-preview">
              <div className="cog-preview-chip">
                <span style={{ color: CATEGORY_COLORS[parsed.category || 'Other'], fontSize: '11px' }}>
                  {CATEGORY_ICONS[parsed.category || 'Other']}
                </span>
                <span>{parsed.category || 'Other'}</span>
              </div>
              {parsed.amount ? (
                <div className="cog-preview-chip highlight">
                  {formatCurrency(parsed.amount)}
                </div>
              ) : null}
              {parsed.description && (
                <div className="cog-preview-chip">
                  {parsed.description}
                </div>
              )}
              <div className="cog-preview-chip">
                📅 {parsed.date || todayStr()}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ─── Success Toast ─── */}
      {showSuccess && (
        <div className="cog-success-toast">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {successText}
        </div>
      )}

      {/* ─── Import Zone ─── */}
      <div
        className={`cog-import-zone ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.txt"
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />
        <div className="cog-import-icon-row">
          <span className="cog-import-icon">📄</span>
          <span className="cog-import-icon">📊</span>
          <span className="cog-import-icon">📋</span>
        </div>
        <div className="cog-import-text">
          <strong>Import from spreadsheet</strong>
          <span>Drop a CSV file here, click to browse, or paste from clipboard</span>
        </div>
      </div>

      {/* ─── Import Preview Modal ─── */}
      {importPreview && (
        <div className="cog-import-preview">
          <div className="cog-import-preview-header">
            <div>
              <strong>Preview Import</strong>
              <span className="cog-import-count">{importPreview.length} entries detected</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="cog-import-cancel" onClick={() => setImportPreview(null)}>
                Cancel
              </button>
              <button className="cog-import-confirm" onClick={confirmImport}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Import All
              </button>
            </div>
          </div>
          <div className="cog-import-preview-table">
            <div className="cog-import-preview-row header-row">
              <span>Date</span>
              <span>Category</span>
              <span>Description</span>
              <span style={{ textAlign: 'right' }}>Amount</span>
            </div>
            {importPreview.slice(0, 10).map((e, i) => (
              <div key={i} className="cog-import-preview-row">
                <span>{e.date}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '12px' }}>{CATEGORY_ICONS[e.category]}</span>
                  {e.category}
                </span>
                <span>{e.description || '—'}</span>
                <span style={{ textAlign: 'right', color: '#00F5D4', fontWeight: 600 }}>{formatCurrency(e.amount)}</span>
              </div>
            ))}
            {importPreview.length > 10 && (
              <div className="cog-import-preview-more">
                + {importPreview.length - 10} more entries
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── KPI Summary Cards ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginBottom: '4px',
      }}>
        <KPICard
          label="Total COGS"
          value={formatCurrency(filter === 'all' ? grandTotal : filteredTotal)}
          sublabel={filter !== 'all' ? formatMonthLabel(filter) : 'All Time'}
          color="#00F5D4"
          icon="📊"
        />
        <KPICard
          label="Entries"
          value={String(filteredEntries.length)}
          sublabel={filter !== 'all' ? formatMonthLabel(filter) : 'Total'}
          color="#45B7D1"
          icon="📝"
        />
        <KPICard
          label="Avg / Entry"
          value={filteredEntries.length > 0
            ? formatCurrency(filteredTotal / filteredEntries.length)
            : '$0.00'}
          sublabel="Average cost"
          color="#A855F7"
          icon="📈"
        />
        <TopCategoryCard entries={filteredEntries} />
      </div>

      {/* ─── Month Filter Pills ─── */}
      {availableMonths.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '6px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          <button
            className={`cog-month-pill ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Time
          </button>
          {availableMonths.map(ym => (
            <button
              key={ym}
              className={`cog-month-pill ${filter === ym ? 'active' : ''}`}
              onClick={() => setFilter(ym)}
            >
              {formatMonthLabel(ym)}
            </button>
          ))}
        </div>
      )}

      {/* ─── Main Spreadsheet ─── */}
      <div style={{
        borderRadius: '16px',
        background: 'linear-gradient(165deg, rgba(20,20,38,0.6) 0%, rgba(14,14,28,0.8) 100%)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden',
        boxShadow: '0 16px 48px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.02) inset',
      }}>
        {/* Column Headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '32px 110px 140px 1fr 100px 1fr',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '0 16px',
          background: 'rgba(255,255,255,0.01)',
        }}>
          <div style={headerStyle}></div>
          <div style={headerStyle}>Date</div>
          <div style={headerStyle}>Category</div>
          <div style={headerStyle}>Description</div>
          <div style={headerStyle}>Amount</div>
          <div style={headerStyle}>Notes</div>
        </div>

        {/* Rows */}
        {filteredEntries.length === 0 ? (
          <div style={{
            padding: '64px 20px',
            textAlign: 'center',
            animation: 'cogFadeIn 0.5s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'rgba(0,245,212,0.06)',
              border: '1px solid rgba(0,245,212,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <span style={{ fontSize: '24px' }}>📦</span>
            </div>
            <div style={{
              color: '#8080A0',
              fontSize: '14px',
              fontFamily: "'Inter','Lato',sans-serif",
              fontWeight: 500,
              marginBottom: '6px',
            }}>
              No entries yet
            </div>
            <div style={{
              color: '#4A4A60',
              fontSize: '12px',
              fontFamily: "'Inter','Lato',sans-serif",
            }}>
              Use Quick Add above, import a spreadsheet, or add entries manually below
            </div>
          </div>
        ) : (
          <div style={{ padding: '6px 16px' }}>
            {filteredEntries.map((entry, idx) => {
              const isLast = idx === filteredEntries.length - 1;
              const isNew = idx === entries.length - 1;
              const catColor = CATEGORY_COLORS[entry.category];
              return (
                <div
                  key={entry.id}
                  className={`cog-row ${deletingId === entry.id ? 'deleting' : ''}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '32px 110px 140px 1fr 100px 1fr',
                    alignItems: 'center',
                    borderBottom: !isLast ? '1px solid rgba(255,255,255,0.03)' : 'none',
                    padding: '6px 0',
                    animationDelay: `${idx * 25}ms`,
                  }}
                >
                  {/* Delete */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                      className="cog-delete-btn"
                      onClick={() => handleDelete(entry.id)}
                      title="Delete"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>

                  {/* Date */}
                  <div>
                    <input
                      type="date"
                      className="cog-cell-input"
                      value={entry.date}
                      onChange={e => handleUpdate(entry.id, 'date', e.target.value)}
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>

                  {/* Category */}
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      position: 'absolute',
                      left: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '4px',
                      height: '16px',
                      borderRadius: '2px',
                      backgroundColor: catColor,
                      boxShadow: `0 0 6px ${catColor}40`,
                      pointerEvents: 'none',
                      zIndex: 1,
                    }} />
                    <select
                      className="cog-select"
                      value={entry.category}
                      onChange={e => handleUpdate(entry.id, 'category', e.target.value)}
                      style={{
                        paddingLeft: '20px',
                        color: '#D0D0E8',
                      }}
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <input
                      ref={isNew ? newRowRef : undefined}
                      type="text"
                      className="cog-cell-input"
                      placeholder="Enter description..."
                      value={entry.description}
                      onChange={e => handleUpdate(entry.id, 'description', e.target.value)}
                    />
                  </div>

                  {/* Amount */}
                  <div>
                    <input
                      type="number"
                      className="cog-cell-input"
                      placeholder="0.00"
                      value={entry.amount || ''}
                      onChange={e => handleUpdate(entry.id, 'amount', parseFloat(e.target.value) || 0)}
                      step="0.01"
                      min="0"
                      style={{ textAlign: 'right' }}
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <input
                      type="text"
                      className="cog-cell-input"
                      placeholder="Optional notes..."
                      value={entry.notes}
                      onChange={e => handleUpdate(entry.id, 'notes', e.target.value)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary Bar */}
        {entries.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(0,245,212,0.05) 0%, rgba(0,245,212,0.01) 100%)',
            borderTop: '1px solid rgba(0,245,212,0.08)',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '5px', height: '5px', borderRadius: '50%',
                background: '#00F5D4',
                boxShadow: '0 0 6px rgba(0,245,212,0.5)',
              }} />
              <span style={{
                fontSize: '11px', fontFamily: "'Inter','Lato',sans-serif", fontWeight: 500,
                color: '#6B6B80',
              }}>
                {filter === 'all' ? 'All Time' : formatMonthLabel(filter)}
                <span style={{ color: '#4A4A60', marginLeft: '6px' }}>
                  ({filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'})
                </span>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
              {filter !== 'all' && (
                <span style={{
                  fontSize: '11px', fontFamily: "'Inter','Lato',sans-serif", fontWeight: 400,
                  color: '#5A5A70',
                }}>
                  All: {formatCurrency(grandTotal)}
                </span>
              )}
              <span style={{
                fontSize: '18px', fontFamily: "'Inter','Lato',sans-serif", fontWeight: 700,
                color: '#00F5D4',
                fontVariantNumeric: 'tabular-nums',
                textShadow: '0 0 24px rgba(0,245,212,0.15)',
                letterSpacing: '-0.02em',
              }}>
                {formatCurrency(filteredTotal)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ─── Add Entry Button ─── */}
      <button className="cog-add-btn" onClick={handleAdd}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add Entry Manually
      </button>

      {/* ─── Category Breakdown ─── */}
      {filteredEntries.length > 0 && (
        <CategoryBreakdown entries={filteredEntries} />
      )}
    </div>
  );
}

// ─── Shared Styles ──────────────────────────────────────────
const headerStyle: React.CSSProperties = {
  fontSize: '10px',
  fontFamily: "'Inter','Lato',sans-serif",
  fontWeight: 600,
  color: '#4A4A60',
  letterSpacing: '0.8px',
  textTransform: 'uppercase',
  padding: '14px 6px',
  userSelect: 'none',
};

// ─── KPI Card ───────────────────────────────────────────────
function KPICard({ label, value, sublabel, color, icon }: {
  label: string; value: string; sublabel: string; color: string; icon: string;
}) {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  return (
    <div style={{
      padding: '16px 18px',
      borderRadius: '12px',
      background: 'rgba(255,255,255,0.02)',
      border: `0.5px solid rgba(${r},${g},${b},0.18)`,
      boxShadow: `0 0 20px ${color}15`,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: '11px',
          fontFamily: "'Inter','Lato',sans-serif",
          fontWeight: 500,
          color: '#6B6B80',
          letterSpacing: '0.3px',
        }}>
          {label}
        </span>
        <span style={{ fontSize: '14px', lineHeight: 1, opacity: 0.7 }}>{icon}</span>
      </div>
      <span style={{
        fontSize: '22px',
        fontFamily: "'Inter','Lato',sans-serif",
        fontWeight: 700,
        color: '#E5E7EB',
        letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </span>
      <span style={{
        fontSize: '10px',
        fontFamily: "'Inter','Lato',sans-serif",
        fontWeight: 400,
        color: '#5A5A70',
      }}>
        {sublabel}
      </span>
    </div>
  );
}

// ─── Top Category Card ──────────────────────────────────────
function TopCategoryCard({ entries }: { entries: CogEntry[] }) {
  const top = useMemo((): { cat: Category; amount: number } | null => {
    const map: Record<string, number> = {};
    entries.forEach(e => {
      map[e.category] = (map[e.category] || 0) + (e.amount || 0);
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return null;
    return { cat: sorted[0][0] as Category, amount: sorted[0][1] };
  }, [entries]);

  const cat: Category = top ? top.cat : 'Other';
  const color = CATEGORY_COLORS[cat];
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  return (
    <div style={{
      padding: '16px 18px',
      borderRadius: '12px',
      background: 'rgba(255,255,255,0.02)',
      border: `0.5px solid rgba(${r},${g},${b},0.18)`,
      boxShadow: `0 0 20px ${color}15`,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: '11px',
          fontFamily: "'Inter','Lato',sans-serif",
          fontWeight: 500,
          color: '#6B6B80',
          letterSpacing: '0.3px',
        }}>
          Top Category
        </span>
        <span style={{ fontSize: '14px', lineHeight: 1, opacity: 0.7 }}>
          {CATEGORY_ICONS[cat]}
        </span>
      </div>
      <span style={{
        fontSize: '22px',
        fontFamily: "'Inter','Lato',sans-serif",
        fontWeight: 700,
        color: color,
        letterSpacing: '-0.02em',
      }}>
        {top ? cat : '—'}
      </span>
      <span style={{
        fontSize: '10px',
        fontFamily: "'Inter','Lato',sans-serif",
        fontWeight: 400,
        color: '#5A5A70',
      }}>
        {top ? formatCurrency(top.amount) : 'No data'}
      </span>
    </div>
  );
}

// ─── Category Breakdown ─────────────────────────────────────
function CategoryBreakdown({ entries }: { entries: CogEntry[] }) {
  const breakdown = useMemo(() => {
    const map: Record<string, number> = {};
    entries.forEach(e => { map[e.category] = (map[e.category] || 0) + (e.amount || 0); });
    return Object.entries(map)
      .map(([cat, amount]) => ({ category: cat as Category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [entries]);

  const total = useMemo(() => breakdown.reduce((s, b) => s + b.amount, 0), [breakdown]);

  if (breakdown.length === 0) return null;

  return (
    <div style={{
      borderRadius: '16px',
      background: 'linear-gradient(165deg, rgba(20,20,38,0.6) 0%, rgba(14,14,28,0.8) 100%)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,255,255,0.06)',
      padding: '20px 24px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    }}>
      <div style={{
        fontSize: '10px',
        fontFamily: "'Inter','Lato',sans-serif",
        fontWeight: 600,
        color: '#4A4A60',
        letterSpacing: '0.8px',
        textTransform: 'uppercase',
        marginBottom: '16px',
      }}>
        Breakdown by Category
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {breakdown.map(item => {
          const pct = total > 0 ? (item.amount / total) * 100 : 0;
          const color = CATEGORY_COLORS[item.category];
          return (
            <div key={item.category} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '3px',
                backgroundColor: color,
                boxShadow: `0 0 8px ${color}40`,
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: '12px',
                fontFamily: "'Inter','Lato',sans-serif",
                fontWeight: 500,
                color: '#9CA3AF',
                width: '110px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <span style={{ fontSize: '12px' }}>{CATEGORY_ICONS[item.category]}</span>
                {item.category}
              </span>
              <div style={{
                flex: 1,
                height: '6px',
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${color}CC, ${color}88)`,
                  borderRadius: '3px',
                  transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
                  boxShadow: `0 0 8px ${color}25`,
                }} />
              </div>
              <span style={{
                fontSize: '12px',
                fontFamily: "'Inter','Lato',sans-serif",
                fontWeight: 600,
                color: '#E5E7EB',
                fontVariantNumeric: 'tabular-nums',
                width: '80px',
                textAlign: 'right',
                flexShrink: 0,
              }}>
                {formatCurrency(item.amount)}
              </span>
              <span style={{
                fontSize: '10px',
                fontFamily: "'Inter','Lato',sans-serif",
                fontWeight: 500,
                color: '#5A5A70',
                width: '36px',
                textAlign: 'right',
                flexShrink: 0,
              }}>
                {pct.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
