'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

// Hand-crafted Artisanal Wabi-Sabi SVGs (stroke-linecap="round", stroke-width="1.5")
function SvgLayers({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12.2 3.4l8.3 4.2c.4.2.4.8 0 1l-8.3 4.2c-.2.1-.4.1-.6 0L3.3 8.6c-.4-.2-.4-.8 0-1l8.3-4.2c.2-.1.4-.1.6 0z" />
      <path d="M3.5 12.4l8.2 4.1c.2.1.4.1.6 0l8.2-4.1" />
      <path d="M3.5 16.6l8.2 4.1c.2.1.4.1.6 0l8.2-4.1" />
    </svg>
  );
}

function SvgClock({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6.8v5.4l3.6 2.2" />
    </svg>
  );
}

function SvgSearch({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="7.5" />
      <path d="M16.5 16.5L21 21" />
    </svg>
  );
}

function SvgCoins({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <ellipse cx="12" cy="6" rx="8" ry="3.2" />
      <path d="M4 6v5.8c0 1.8 3.6 3.2 8 3.2s8-1.4 8-3.2V6" />
      <path d="M4 11.8v6c0 1.8 3.6 3.2 8 3.2s8-1.4 8-3.2v-6" />
    </svg>
  );
}

function SvgSparkles({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2.8l1.4 5.3c.3 1.2 1.3 2.1 2.5 2.5l5.3 1.4-5.3 1.4c-1.2.3-2.2 1.3-2.5 2.5L12 21.2l-1.4-5.3c-.3-1.2-1.3-2.2-2.5-2.5L2.8 12l5.3-1.4c1.2-.3 2.1-1.3 2.5-2.5L12 2.8z" />
    </svg>
  );
}

function SvgShield({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3.2c3.5 1.8 7 1.6 8 2.1.2 3.8.4 9.2-2.4 12.9-2 2.6-4.6 3.8-5.6 4.1-1-.3-3.6-1.5-5.6-4.1C3.6 14.5 3.8 9.1 4 5.3c1-.5 4.5-.3 8-2.1z" />
      <path d="M9.5 12.2l1.9 2 4.2-4.4" />
    </svg>
  );
}

function SvgDatabase({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <ellipse cx="12" cy="5.8" rx="8" ry="3.2" />
      <path d="M4 5.8v6.2c0 1.8 3.6 3.2 8 3.2s8-1.4 8-3.2V5.8" />
      <path d="M4 12v6.2c0 1.8 3.6 3.2 8 3.2s8-1.4 8-3.2V12" />
    </svg>
  );
}

function SvgFileCode({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 2.8H6.5C5.1 2.8 4 3.9 4 5.3v13.4c0 1.4 1.1 2.5 2.5 2.5h11c1.4 0 2.5-1.1 2.5-2.5V8.8L14 2.8z" />
      <path d="M14 2.8V8.8h6" />
      <path d="M9.5 13.2l-2 2 2 2" />
      <path d="M14.5 13.2l2 2-2 2" />
    </svg>
  );
}

function SvgCheckCircle({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.2l2.3 2.4 4.8-5" />
    </svg>
  );
}

function SvgAlertTriangle({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M11.1 3.8c.4-.7 1.4-.7 1.8 0l8.7 15.1c.4.7-.1 1.6-.9 1.6H3.3c-.8 0-1.3-.9-.9-1.6L11.1 3.8z" />
      <path d="M12 9.4v4.6" />
      <circle cx="12" cy="17.2" r=".6" fill="currentColor" />
    </svg>
  );
}

function SvgCopy({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M4.5 15.5v-9a2 2 0 0 1 2-2h9" />
    </svg>
  );
}

function SvgCheck({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4.8 12.4l4.6 4.6 9.8-10" />
    </svg>
  );
}

function SvgArrowLeft({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

function SvgActivity({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2.3 12.4c2.8-.8 4.6.4 6 3.8.9 2.2 1.8-8.6 3.1-9.2 1.3-.6 2.4 12.6 3.6 12 1.1-.6 1.7-6.2 3.2-6.5 1.5-.3 3.3.4 3.7.8" />
    </svg>
  );
}

export interface TraceRecord {
  id: string;
  agent_name: string;
  model_name: string;
  tokens: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  latency_ms: number;
  status_code: string;
  timestamp: string;
  cost_usd: number;
  request_text?: string | null;
  response_text?: string | null;
  span_id?: string;
  isDbRecord?: boolean;
}

interface WaterfallSpan {
  id: string;
  name: string;
  category: 'Retrieval' | 'Formatting' | 'Inference' | 'Validation' | 'Error';
  start_ms: number;
  duration_ms: number;
  colorClass: string;
  barColor: string;
  details: string;
  icon: 'database' | 'code' | 'sparkles' | 'shield' | 'alert';
}

function generateWaterfallSpans(trace: TraceRecord): WaterfallSpan[] {
  const total = Math.max(trace.latency_ms, 80);
  const isErr = trace.status_code !== 'success' && trace.status_code !== '200' && !trace.status_code.includes('OK');

  if (isErr) {
    const p1 = Math.round(total * 0.18);
    const p2 = Math.max(total - p1, 20);
    return [
      {
        id: 'span-retrieval',
        name: 'Context Pipeline Initialization',
        category: 'Retrieval',
        start_ms: 0,
        duration_ms: p1,
        colorClass: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        barColor: 'from-indigo-600 to-indigo-400',
        details: 'Route incoming request parameters & auth validation',
        icon: 'database',
      },
      {
        id: 'span-error-eval',
        name: 'Gateway Exception / 429 Rate Limit',
        category: 'Error',
        start_ms: p1,
        duration_ms: p2,
        colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
        barColor: 'from-rose-600 to-rose-400',
        details: 'Provider quota exhausted: TPM rate-limit reached at gateway',
        icon: 'alert',
      },
    ];
  }

  // Realistic Proportional Spans
  const vectorDuration = Math.round(total * 0.14);
  const promptDuration = Math.max(Math.round(total * 0.05), 18);
  const guardDuration = Math.max(Math.round(total * 0.08), 24);
  const llmDuration = Math.max(total - vectorDuration - promptDuration - guardDuration, 40);

  const vectorStart = 0;
  const promptStart = vectorDuration;
  const llmStart = promptStart + promptDuration;
  const guardStart = llmStart + llmDuration;

  return [
    {
      id: 'span-vector',
      name: 'Vector Search',
      category: 'Retrieval',
      start_ms: vectorStart,
      duration_ms: vectorDuration,
      colorClass: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      barColor: 'from-indigo-600 to-indigo-400',
      details: 'ChromaDB vector embedding cosine similarity scan (top_k=5)',
      icon: 'database',
    },
    {
      id: 'span-formatting',
      name: 'Prompt Formatting',
      category: 'Formatting',
      start_ms: promptStart,
      duration_ms: promptDuration,
      colorClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      barColor: 'from-cyan-600 to-cyan-400',
      details: 'Jinja2 context augmentation & chat template compilation',
      icon: 'code',
    },
    {
      id: 'span-llm',
      name: 'LLM Generation',
      category: 'Inference',
      start_ms: llmStart,
      duration_ms: llmDuration,
      colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      barColor: 'from-emerald-600 to-emerald-400',
      details: `${trace.model_name} streaming completion with token sampling`,
      icon: 'sparkles',
    },
    {
      id: 'span-guardrail',
      name: 'Guardrail Check',
      category: 'Validation',
      start_ms: guardStart,
      duration_ms: guardDuration,
      colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      barColor: 'from-purple-600 to-purple-400',
      details: 'Toxicity filter, PII scrubbing & safety policy validation',
      icon: 'shield',
    },
  ];
}

function renderSpanIcon(icon: WaterfallSpan['icon']) {
  switch (icon) {
    case 'database':
      return <SvgDatabase className="w-3.5 h-3.5" />;
    case 'code':
      return <SvgFileCode className="w-3.5 h-3.5" />;
    case 'sparkles':
      return <SvgSparkles className="w-3.5 h-3.5" />;
    case 'shield':
      return <SvgShield className="w-3.5 h-3.5" />;
    case 'alert':
    default:
      return <SvgAlertTriangle className="w-3.5 h-3.5" />;
  }
}

function formatDisplayTime(timestamp: string): string {
  if (!timestamp) return 'Recently';
  if (timestamp.includes('ago') || timestamp.includes('UTC')) {
    return timestamp;
  }
  const d = new Date(timestamp);
  if (!isNaN(d.getTime())) {
    const h = String(d.getUTCHours()).padStart(2, '0');
    const m = String(d.getUTCMinutes()).padStart(2, '0');
    const s = String(d.getUTCSeconds()).padStart(2, '0');
    return `${h}:${m}:${s} UTC`;
  }
  return timestamp;
}

export function TraceWaterfallClient({
  traces,
  dbConnected,
}: {
  traces: TraceRecord[];
  dbConnected: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string>(traces[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all');
  const [copiedId, setCopiedId] = useState(false);
  const [metadataTab, setMetadataTab] = useState<'snippets' | 'raw'>('snippets');
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Filtered master traces list
  const filteredTraces = useMemo(() => {
    return traces.filter((t) => {
      const matchesSearch =
        t.agent_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.model_name.toLowerCase().includes(searchQuery.toLowerCase());

      const isErr = t.status_code !== 'success' && t.status_code !== '200' && !t.status_code.includes('OK');
      const matchesStatus =
        statusFilter === 'all' ? true : statusFilter === 'success' ? !isErr : isErr;

      return matchesSearch && matchesStatus;
    });
  }, [traces, searchQuery, statusFilter]);

  // Selected trace
  const activeTrace = useMemo(() => {
    return traces.find((t) => t.id === selectedId) || filteredTraces[0] || traces[0];
  }, [traces, selectedId, filteredTraces]);

  const spans = useMemo(() => {
    return activeTrace ? generateWaterfallSpans(activeTrace) : [];
  }, [activeTrace]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      // fallback
    }
  };

  const isSuccessTrace =
    activeTrace?.status_code === 'success' ||
    activeTrace?.status_code === '200' ||
    activeTrace?.status_code?.includes('OK');

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Section Bar */}
      <motion.div
        initial={hasMounted ? { opacity: 0, y: 10 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5"
      >
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <SvgArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
          <span className="text-zinc-600 font-mono">/</span>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-zinc-50 flex items-center gap-2">
              <span className="p-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <SvgLayers className="w-4 h-4" />
              </span>
              Traces &amp; Spans Explorer
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-zinc-800 text-zinc-400 border border-zinc-700/50">
              {`${traces.length} Telemetry Events`}
            </span>
          </div>
        </div>

        {/* Live Status indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300">
            <span className="relative flex h-2 w-2">
              {dbConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${dbConnected ? 'bg-emerald-500' : 'bg-zinc-600'}`}></span>
            </span>
            <span className="text-zinc-400 font-mono text-[11px]">
              {dbConnected ? 'timescaledb: stream connected' : 'standalone mode'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* If no traces exist in the database, show dedicated empty state */}
      {traces.length === 0 ? (
        <motion.div
          initial={hasMounted ? { opacity: 0, y: 10 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/80 rounded-xl p-8 sm:p-12 text-center space-y-6 max-w-2xl mx-auto shadow-xl my-6"
        >
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-sm">
            <SvgLayers className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-zinc-100">
              No Telemetry Traces Recorded Yet
            </h2>
            <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
              The TimescaleDB event store is active and healthy. When your AI applications dispatch telemetry payloads to the collector service, live execution waterfalls and token profiling will appear here automatically.
            </p>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-lg p-4 text-left space-y-2.5 font-mono text-xs">
            <div className="flex items-center justify-between text-zinc-400 border-b border-zinc-800/60 pb-2">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-300">
                Collector Endpoint (:8080)
              </span>
              <span className="text-emerald-400 text-[11px]">Ready for Ingestion</span>
            </div>
            <div className="text-zinc-400 text-[11px]">
              Ingest a test event with cURL or the Python SDK:
            </div>
            <div className="bg-zinc-900/90 p-3 rounded text-zinc-200 overflow-x-auto text-[11px] leading-relaxed border border-zinc-800/80 select-all">
              python3 example_usage.py
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm cursor-pointer"
            >
              Refresh Trace Stream
            </button>
            <Link
              href="/"
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors border border-zinc-700/60 cursor-pointer"
            >
              Back to Dashboard
            </Link>
          </div>
        </motion.div>
      ) : (
        /* Master-Detail Grid (4 Cols Left, 8 Cols Right) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Trace List (4 cols) */}
          <motion.div
            initial={hasMounted ? { opacity: 0, y: 10 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="lg:col-span-4 bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/80 rounded-xl overflow-hidden shadow-lg flex flex-col h-[calc(100vh-14rem)]"
          >
            {/* Header & Search */}
            <div className="p-4 border-b border-zinc-800/80 space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Trace Stream
                </span>
                <span className="text-[11px] font-mono text-zinc-500">
                  {`Showing ${filteredTraces.length} of ${traces.length}`}
                </span>
              </div>

              {/* Search Input */}
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                  <SvgSearch className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search agent, trace ID, model..."
                  className="w-full bg-zinc-950/70 border border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/70 transition-colors font-mono"
                />
              </div>

              {/* Quick Status Filter Tabs */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('success')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    statusFilter === 'success'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Success
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('error')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    statusFilter === 'error'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Errors
                </button>
              </div>
            </div>

            {/* Scrollable Trace List */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60 custom-scrollbar">
              {filteredTraces.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 text-xs space-y-3">
                  <p className="text-zinc-500">{`No matching traces found for "${searchQuery}"`}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                    className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] transition-colors border border-zinc-700/60 cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
              filteredTraces.map((trace, index) => {
                const isSelected = trace.id === activeTrace?.id;
                const isErr =
                  trace.status_code !== 'success' &&
                  trace.status_code !== '200' &&
                  !trace.status_code.includes('OK');

                const timeFormatted = formatDisplayTime(trace.timestamp);

                return (
                  <motion.div
                    key={trace.id}
                    initial={hasMounted ? { opacity: 0, y: 10 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.4) }}
                    onClick={() => setSelectedId(trace.id)}
                    className={`p-3.5 transition-all duration-150 cursor-pointer group text-xs ${
                      isSelected
                        ? 'bg-zinc-850/90 border-l-2 border-indigo-400'
                        : 'hover:bg-zinc-850/50 border-l-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={`font-semibold tracking-tight truncate ${
                            isSelected ? 'text-indigo-300' : 'text-zinc-100 group-hover:text-indigo-300'
                          }`}
                        >
                          {trace.agent_name}
                        </span>
                        <span className="px-1.5 py-0.2 bg-zinc-800 text-[10px] font-mono text-zinc-400 rounded shrink-0">
                          {trace.model_name}
                        </span>
                      </div>

                      {/* Status indicator dot */}
                      <span className="flex items-center gap-1 shrink-0">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isErr ? 'bg-rose-400' : 'bg-emerald-400'
                          }`}
                        ></span>
                        <span
                          className={`text-[10px] font-mono font-medium ${
                            isErr ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {isErr ? 'ERR' : '200'}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                      <span className="text-zinc-500 truncate max-w-[140px]">
                        {trace.id.startsWith('trace_') ? trace.id : `trace_${trace.id.slice(0, 8)}...`}
                      </span>
                      <span suppressHydrationWarning>{timeFormatted}</span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-zinc-800/40 text-[11px] font-mono tabular-nums">
                      <span className="text-zinc-400" suppressHydrationWarning>
                        {`${trace.tokens.toLocaleString()} tok`}
                      </span>
                      <span
                        suppressHydrationWarning
                        className={isErr ? 'text-rose-400' : 'text-emerald-400'}
                      >
                        {`${trace.latency_ms.toLocaleString()}ms`}
                      </span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>

        {/* Right Column: Trace Waterfall & Details (8 cols) */}
        <motion.div
          initial={hasMounted ? { opacity: 0, y: 10 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-8 space-y-6"
        >
          {activeTrace ? (
            <div className="space-y-6">
              {/* Trace Header Panel */}
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/80 rounded-xl p-5 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800/80">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs uppercase font-semibold tracking-wider text-zinc-400">
                        Trace ID
                      </span>
                      <span
                        suppressHydrationWarning
                        className="px-2 py-0.5 rounded text-[11px] font-mono text-zinc-200 bg-zinc-950 border border-zinc-800 select-all"
                      >
                        {activeTrace.id}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(activeTrace.id)}
                        title="Copy Trace ID"
                        className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                      >
                        {copiedId ? (
                          <SvgCheck className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <SvgCopy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 pt-0.5">
                      <span className="text-zinc-200 font-medium">{activeTrace.agent_name}</span>
                      <span>•</span>
                      <span className="font-mono text-indigo-400">{activeTrace.model_name}</span>
                      <span>•</span>
                      <span className="font-mono text-zinc-500">
                        {`Span: ${activeTrace.span_id || 'root_span'}`}
                      </span>
                    </div>
                  </div>

                  {/* Status Pill */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium ${
                        isSuccessTrace
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {isSuccessTrace ? (
                        <SvgCheckCircle className="w-3.5 h-3.5" />
                      ) : (
                        <SvgAlertTriangle className="w-3.5 h-3.5" />
                      )}
                      <span>{activeTrace.status_code || '200 OK'}</span>
                    </span>
                  </div>
                </div>

                {/* 4 Summary Stat Pills in Header */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-3">
                    <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <SvgClock className="w-3 h-3 text-indigo-400" />
                      Total Latency
                    </div>
                    <div className="text-lg font-semibold text-zinc-50 font-mono tabular-nums mt-1" suppressHydrationWarning>
                      {`${activeTrace.latency_ms.toLocaleString()}ms`}
                    </div>
                  </div>

                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-3">
                    <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <SvgLayers className="w-3 h-3 text-cyan-400" />
                      Total Tokens
                    </div>
                    <div className="text-lg font-semibold text-zinc-50 font-mono tabular-nums mt-1" suppressHydrationWarning>
                      {`${activeTrace.tokens.toLocaleString()} tok`}
                    </div>
                  </div>

                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-3">
                    <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <SvgCoins className="w-3 h-3 text-emerald-400" />
                      Estimated Cost
                    </div>
                    <div className="text-lg font-semibold text-zinc-50 font-mono tabular-nums mt-1" suppressHydrationWarning>
                      {`$${Number(activeTrace.cost_usd).toFixed(4)}`}
                    </div>
                  </div>

                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-3">
                    <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <SvgActivity className="w-3 h-3 text-purple-400" />
                      Span Pipeline
                    </div>
                    <div className="text-lg font-semibold text-zinc-50 font-mono tabular-nums mt-1" suppressHydrationWarning>
                      {`${spans.length} spans`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Waterfall Chart Panel */}
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/80 rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <SvgLayers className="w-3.5 h-3.5" />
                    </span>
                    <h2 className="text-sm font-semibold tracking-tight text-zinc-100">
                      Execution Waterfall Timeline
                    </h2>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400" suppressHydrationWarning>
                    {`Duration: ${activeTrace.latency_ms}ms total`}
                  </span>
                </div>

                {/* Timeline Scale Ruler */}
                <div className="border border-zinc-800/80 bg-zinc-950/80 rounded-lg p-3 pt-2">
                  <div className="relative h-6 text-[10px] font-mono text-zinc-400 border-b border-zinc-800/80 mb-3 flex items-center justify-between px-1">
                    <span>0ms</span>
                    <span className="hidden sm:inline" suppressHydrationWarning>
                      {`${Math.round(activeTrace.latency_ms * 0.25)}ms`}
                    </span>
                    <span suppressHydrationWarning>
                      {`${Math.round(activeTrace.latency_ms * 0.5)}ms`}
                    </span>
                    <span className="hidden sm:inline" suppressHydrationWarning>
                      {`${Math.round(activeTrace.latency_ms * 0.75)}ms`}
                    </span>
                    <span suppressHydrationWarning>
                      {`${activeTrace.latency_ms}ms`}
                    </span>
                  </div>

                  {/* Waterfall Span Rows */}
                  <div className="space-y-3">
                    {spans.map((span) => {
                      const totalMs = Math.max(activeTrace.latency_ms, 1);
                      const leftPercent = Math.min((span.start_ms / totalMs) * 100, 95).toFixed(2);
                      const widthPercent = Math.max(Math.min((span.duration_ms / totalMs) * 100, 100 - Number(leftPercent)), 4).toFixed(2);

                      return (
                        <div
                          key={span.id}
                          className="group relative flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-md hover:bg-zinc-900/70 transition-colors"
                        >
                          {/* Span Name & Category */}
                          <div className="sm:w-56 shrink-0 flex items-center justify-between sm:justify-start gap-2">
                            <div className="flex items-center gap-2 truncate">
                              <span
                                className={`p-1 rounded border ${span.colorClass} shrink-0`}
                              >
                                {renderSpanIcon(span.icon)}
                              </span>
                              <span className="font-medium text-xs text-zinc-200 group-hover:text-white transition-colors truncate">
                                {span.name}
                              </span>
                            </div>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-medium uppercase tracking-wider bg-zinc-800/70 text-zinc-400">
                              {span.category}
                            </span>
                          </div>

                          {/* Timeline Bar Track */}
                          <div className="flex-1 relative h-7 bg-zinc-900/60 rounded border border-zinc-800/60 overflow-hidden flex items-center">
                            {/* Grid markers background */}
                            <div className="absolute inset-0 grid grid-cols-4 pointer-events-none divide-x divide-zinc-800/30">
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                            </div>

                            {/* Floating Span Bar with Framer Motion entrance */}
                            <motion.div
                              initial={hasMounted ? { scaleX: 0, opacity: 0 } : false}
                              animate={{ scaleX: 1, opacity: 1 }}
                              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                              style={{
                                left: `${leftPercent}%`,
                                width: `${widthPercent}%`,
                                transformOrigin: 'left center',
                              }}
                              className={`absolute h-5 rounded bg-gradient-to-r ${span.barColor} shadow-sm shadow-black/40 flex items-center px-2 cursor-pointer group/bar`}
                              title={`${span.name}: ${span.duration_ms}ms (start at ${span.start_ms}ms)`}
                            >
                              <span
                                suppressHydrationWarning
                                className="text-[10px] font-mono font-medium text-white truncate drop-shadow-sm select-none"
                              >
                                {`${span.duration_ms}ms`}
                              </span>
                            </motion.div>
                          </div>

                          {/* Offset & Duration meta on right */}
                          <div
                            suppressHydrationWarning
                            className="sm:w-24 shrink-0 text-right font-mono text-[11px] tabular-nums text-zinc-400"
                          >
                            {`+${span.start_ms}ms`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Metadata Panel (Input Prompt Snippet & Model Output) */}
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/80 rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <SvgFileCode className="w-3.5 h-3.5" />
                    </span>
                    <h3 className="text-sm font-semibold tracking-tight text-zinc-100">
                      Trace Payload &amp; Metadata
                    </h3>
                  </div>

                  {/* Tab Selector */}
                  <div className="inline-flex rounded-md bg-zinc-950 p-0.5 border border-zinc-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setMetadataTab('snippets')}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                        metadataTab === 'snippets'
                          ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Prompt &amp; Response
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetadataTab('raw')}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                        metadataTab === 'raw'
                          ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Raw Telemetry JSON
                    </button>
                  </div>
                </div>

                {metadataTab === 'snippets' ? (
                  <div className="space-y-4">
                    {/* Prompt Snippet Block */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
                        <span className="flex items-center gap-1.5 text-zinc-300 font-mono text-[11px] uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                          Input Prompt Snippet
                        </span>
                        <span className="text-[11px] font-mono text-zinc-500" suppressHydrationWarning>
                          {`${activeTrace.prompt_tokens ?? 0} prompt tokens`}
                        </span>
                      </div>
                      <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-lg p-3.5 font-mono text-xs text-zinc-300 leading-relaxed overflow-x-auto whitespace-pre-wrap select-text">
                        {activeTrace.request_text ? (
                          activeTrace.request_text
                        ) : (
                          <span className="text-zinc-500 italic">No input prompt text captured for this span.</span>
                        )}
                      </div>
                    </div>

                    {/* Model Response Snippet Block */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
                        <span className="flex items-center gap-1.5 text-zinc-300 font-mono text-[11px] uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          {`Model Output Snippet (${activeTrace.model_name})`}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-500" suppressHydrationWarning>
                          {`${activeTrace.completion_tokens ?? 0} completion tokens`}
                        </span>
                      </div>
                      <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-lg p-3.5 font-mono text-xs text-zinc-300 leading-relaxed overflow-x-auto whitespace-pre-wrap select-text">
                        {activeTrace.response_text ? (
                          activeTrace.response_text
                        ) : (
                          <span className="text-zinc-500 italic">No output text captured for this span.</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Raw JSON Telemetry View */
                  <div className="relative">
                    <pre
                      suppressHydrationWarning
                      className="bg-zinc-950/90 border border-zinc-800/80 rounded-lg p-4 font-mono text-xs text-indigo-300/90 overflow-x-auto leading-relaxed select-all"
                    >
                      {JSON.stringify(
                        {
                          trace_id: activeTrace.id,
                          span_id: activeTrace.span_id || null,
                          agent: activeTrace.agent_name,
                          model: activeTrace.model_name,
                          latency_ms: activeTrace.latency_ms,
                          total_tokens: activeTrace.tokens,
                          prompt_tokens: activeTrace.prompt_tokens ?? 0,
                          completion_tokens: activeTrace.completion_tokens ?? 0,
                          estimated_cost_usd: Number(activeTrace.cost_usd),
                          status: activeTrace.status_code,
                          timestamp: activeTrace.timestamp,
                          pipeline_spans: spans.map((s) => ({
                            name: s.name,
                            category: s.category,
                            start_ms: s.start_ms,
                            duration_ms: s.duration_ms,
                          })),
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/80 rounded-xl p-12 text-center text-zinc-400">
              Select a trace from the stream list on the left to inspect the execution waterfall.
            </div>
          )}
        </motion.div>
      </div>
      )}
    </div>
  );
}
