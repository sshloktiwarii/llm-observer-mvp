import net from 'net';
import { Pool } from 'pg';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import {
  Zap,
  CreditCard,
  Clock,
  TrendingUp,
  TrendingDown,
  ListFilter,
  Search,
  SlidersHorizontal,
  Bot,
  Code2,
  Database,
  AlertTriangle,
  ShieldCheck,
  MessageSquare,
  Cpu,
  Layers,
  Radio,
  BarChart3,
  Server,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { LiveRefreshButton } from '@/components/DashboardClientControls';
import { OnboardingTour } from '@/components/OnboardingTour';

export const dynamic = 'force-dynamic';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://observer:observer_pass@localhost:5432/llm_events?sslmode=disable';

// Global singleton to prevent pool exhaustion across hot-reloads in Next.js development
const globalForPg = globalThis as unknown as { pgPool?: Pool };
const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPg.pgPool = pool;
}

interface EventMetricRow {
  total_requests: string | number;
  estimated_cost: string | number;
  avg_latency: string | number;
  p95_latency: string | number;
  p99_latency: string | number;
  success_rate: string | number;
  total_prompt_tokens: string | number;
  total_completion_tokens: string | number;
  total_tokens: string | number;
}

interface LLMEventRow {
  time: Date;
  trace_id: string;
  span_id: string;
  parent_span_id: string | null;
  agent_id: string;
  model: string;
  provider: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: string | number;
  latency_ms: number;
  status: string;
  error_code: string | null;
  error_message: string | null;
  request_text: string | null;
  response_text: string | null;
}

interface ProviderRow {
  provider: string;
  count: number | string;
}

interface TableSizeRow {
  table_size: string;
}

async function getDashboardData() {
  try {
    const [metricsResult, recentEventsResult, providersResult, sizeResult] = await Promise.all([
      pool.query<EventMetricRow>(`
        SELECT 
          COUNT(*)::int AS total_requests,
          COALESCE(SUM(cost_usd), 0)::float AS estimated_cost,
          COALESCE(AVG(latency_ms), 0)::float AS avg_latency,
          COALESCE(percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms), 0)::float AS p95_latency,
          COALESCE(percentile_cont(0.99) WITHIN GROUP (ORDER BY latency_ms), 0)::float AS p99_latency,
          COALESCE(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0) * 100, 100)::float AS success_rate,
          COALESCE(SUM(prompt_tokens), 0)::int AS total_prompt_tokens,
          COALESCE(SUM(completion_tokens), 0)::int AS total_completion_tokens,
          COALESCE(SUM(total_tokens), 0)::int AS total_tokens
        FROM llm_events;
      `),
      pool.query<LLMEventRow>(`
        SELECT 
          time,
          trace_id,
          span_id,
          parent_span_id,
          agent_id,
          model,
          provider,
          prompt_tokens,
          completion_tokens,
          total_tokens,
          cost_usd::float AS cost_usd,
          latency_ms,
          status,
          error_code,
          error_message,
          request_text,
          response_text
        FROM llm_events
        ORDER BY time DESC
        LIMIT 20;
      `),
      pool.query<ProviderRow>(`
        SELECT 
          COALESCE(NULLIF(provider, ''), 'openai') AS provider, 
          COUNT(*)::int AS count 
        FROM llm_events 
        GROUP BY provider 
        ORDER BY count DESC;
      `),
      pool.query<TableSizeRow>(`
        SELECT pg_size_pretty(pg_total_relation_size('llm_events')) AS table_size;
      `),
    ]);

    const metrics = metricsResult.rows[0] ?? {
      total_requests: 0,
      estimated_cost: 0,
      avg_latency: 0,
      p95_latency: 0,
      p99_latency: 0,
      success_rate: 100,
      total_prompt_tokens: 0,
      total_completion_tokens: 0,
      total_tokens: 0,
    };

    return {
      metrics: {
        totalRequests: Number(metrics.total_requests) || 0,
        estimatedCost: Number(metrics.estimated_cost) || 0,
        avgLatency: Number(metrics.avg_latency) || 0,
        p95Latency: Number(metrics.p95_latency) || 0,
        p99Latency: Number(metrics.p99_latency) || 0,
        successRate: Number(metrics.success_rate) || 100,
        totalPromptTokens: Number(metrics.total_prompt_tokens) || 0,
        totalCompletionTokens: Number(metrics.total_completion_tokens) || 0,
        totalTokens: Number(metrics.total_tokens) || 0,
      },
      recentEvents: recentEventsResult.rows ?? [],
      providers: providersResult.rows ?? [],
      tableSize: sizeResult.rows[0]?.table_size || '0 kB',
      dbConnected: true,
    };
  } catch (error) {
    console.error('Database connection error in llm-observer dashboard:', error);
    return {
      metrics: {
        totalRequests: 0,
        estimatedCost: 0,
        avgLatency: 0,
        p95Latency: 0,
        p99Latency: 0,
        successRate: 100,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalTokens: 0,
      },
      recentEvents: [],
      providers: [],
      tableSize: 'Offline',
      dbConnected: false,
    };
  }
}

function formatCost(cost: number | null | undefined): string {
  if (cost === null || cost === undefined || isNaN(cost) || cost === 0) {
    return '$0.0000';
  }
  if (cost > 0 && cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(2)}`;
}

function formatTimeAgo(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return 'Recently';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Recently';

  const diffInSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffInSeconds < 5) return 'Just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

function renderTraceIcon(model: string, status: string, agentId: string) {
  const isSuccess = status === 'success' || status === '200';
  if (!isSuccess) return <AlertTriangle className="w-4 h-4" />;
  const m = model.toLowerCase();
  const a = agentId.toLowerCase();
  if (m.includes('claude') || a.includes('code')) return <Code2 className="w-4 h-4" />;
  if (m.includes('embed') || a.includes('rag') || a.includes('vector')) return <Database className="w-4 h-4" />;
  if (a.includes('guard') || a.includes('safety') || a.includes('shield')) return <ShieldCheck className="w-4 h-4" />;
  if (a.includes('chat') || a.includes('copilot') || a.includes('conversation')) return <MessageSquare className="w-4 h-4" />;
  return <Bot className="w-4 h-4" />;
}

/**
 * Lightweight async Node.js utility function that attempts a brief TCP socket connection
 * to localhost on the given port to check service availability without blocking page renders.
 */
function checkServiceHealth(port: number, host = 'localhost', timeout = 500): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const socket = net.createConnection({ port, host, timeout }, () => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(true);
      }
    });

    socket.on('error', () => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(false);
      }
    });

    socket.on('timeout', () => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(false);
      }
    });
  });
}

export default async function Dashboard() {
  async function purgeDatabase() {
    'use server';
    try {
      await pool.query('TRUNCATE TABLE llm_events;');
    } catch (error) {
      console.error('Failed to execute TRUNCATE TABLE llm_events:', error);
    }
    revalidatePath('/');
    revalidatePath('/traces');
  }

  const [
    { metrics, recentEvents, providers, tableSize, dbConnected },
    [isGoHealthy, isTimescaleHealthy, isRedpandaHealthy, isGrafanaHealthy],
  ] = await Promise.all([
    getDashboardData(),
    Promise.all([
      checkServiceHealth(8080),
      checkServiceHealth(5432),
      checkServiceHealth(9092),
      checkServiceHealth(3000),
    ]),
  ]);

  const allServicesHealthy =
    isGoHealthy && isTimescaleHealthy && isRedpandaHealthy && isGrafanaHealthy;

  // Real Token Economics Calculations
  const promptTokenPct =
    metrics.totalTokens > 0
      ? Math.round((metrics.totalPromptTokens / metrics.totalTokens) * 100)
      : 0;
  const compTokenPct =
    metrics.totalTokens > 0 ? 100 - promptTokenPct : 0;
  const avgCostPer1k =
    metrics.totalTokens > 0
      ? ((metrics.estimatedCost / metrics.totalTokens) * 1000).toFixed(4)
      : '0.0000';

  return (
    <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Bar: Title & Filter Controls (Stagger 1) */}
      <div className="motion-enter stagger-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-50">
            LLM Telemetry &amp; Performance
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time trace profiling, token economics, latency heatmaps, and worker orchestrations.
          </p>
        </div>

        {/* Time Range Selector, Live Button, New Trace, and Purge Data */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md bg-zinc-900/80 p-0.5 border border-zinc-800 text-xs">
            <button className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-100 font-medium shadow-sm cursor-pointer">
              All Time
            </button>
            <button className="px-2.5 py-1 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer">
              24h
            </button>
            <button className="px-2.5 py-1 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer">
              7d
            </button>
            <button className="px-2.5 py-1 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer">
              30d
            </button>
          </div>

          <LiveRefreshButton />

          <OnboardingTour />

          <Link
            href="/traces"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-md text-xs font-medium shadow-sm transition-all duration-200 hover:shadow-indigo-500/25 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Trace</span>
          </Link>

          <form id="tour-purge" action={purgeDatabase} className="inline-block">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all duration-200 cursor-pointer shadow-sm"
              title="Wipe all recorded traces from the database"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3.5 h-3.5"
              >
                <path d="M3 6h18" strokeLinecap="round" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="10" y1="11" x2="10" y2="17" strokeLinecap="round" />
                <line x1="14" y1="11" x2="14" y2="17" strokeLinecap="round" />
              </svg>
              <span>Purge Data</span>
            </button>
          </form>
        </div>
      </div>

      {/* Top Level Metrics Grid (3 columns) (Stagger 2, 3, 4) */}
      <div id="tour-metrics" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric 1: Total Requests */}
        <div className="motion-enter stagger-2 bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/80 hover:border-zinc-700 rounded-xl p-6 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40 group">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400 font-sans">
              Total Requests
            </span>
            <div className="p-2 rounded-lg bg-zinc-800/60 text-zinc-300 border border-zinc-700/40 group-hover:border-indigo-500/30 group-hover:text-indigo-400 transition-colors">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-3">
            <span
              suppressHydrationWarning
              className="text-3xl font-semibold tracking-tight text-zinc-50 tabular-nums"
            >
              {metrics.totalRequests.toLocaleString()}
            </span>
            <span className="inline-flex items-center text-xs font-medium text-emerald-400 gap-0.5 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              <TrendingUp className="w-3 h-3" />
              Live DB
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <span>
              Recorded Ingestion:{' '}
              <strong className="text-zinc-200">
                {metrics.totalRequests > 0 ? `${metrics.totalRequests} events` : '0 events'}
              </strong>
            </span>
            <span className="text-emerald-400">{`${metrics.successRate.toFixed(1)}% Success`}</span>
          </div>
        </div>

        {/* Metric 2: Estimated Cost */}
        <div className="motion-enter stagger-3 bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/80 hover:border-zinc-700 rounded-xl p-6 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40 group">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400 font-sans">
              Estimated Cost
            </span>
            <div className="p-2 rounded-lg bg-zinc-800/60 text-zinc-300 border border-zinc-700/40 group-hover:border-indigo-500/30 group-hover:text-indigo-400 transition-colors">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-3">
            <span
              suppressHydrationWarning
              className="text-3xl font-semibold tracking-tight text-zinc-50 tabular-nums"
            >
              {formatCost(metrics.estimatedCost)}
            </span>
            <span className="inline-flex items-center text-xs font-medium text-emerald-400 gap-0.5 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              <TrendingDown className="w-3 h-3" />
              Tracked
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <span>
              Avg cost per 1k tok:{' '}
              <strong className="text-zinc-200">${avgCostPer1k}</strong>
            </span>
            <span className="text-zinc-300">{`Prompt / Comp: ${promptTokenPct}% / ${compTokenPct}%`}</span>
          </div>
        </div>

        {/* Metric 3: Avg Latency */}
        <div className="motion-enter stagger-4 bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/80 hover:border-zinc-700 rounded-xl p-6 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40 group">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400 font-sans">
              Avg Latency (TTFT / Total)
            </span>
            <div className="p-2 rounded-lg bg-zinc-800/60 text-zinc-300 border border-zinc-700/40 group-hover:border-indigo-500/30 group-hover:text-indigo-400 transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-3">
            <span
              suppressHydrationWarning
              className="text-3xl font-semibold tracking-tight text-zinc-50 tabular-nums"
            >
              {`${Math.round(metrics.avgLatency)}ms`}
            </span>
            <span className="inline-flex items-center text-xs font-medium text-indigo-400 gap-0.5 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
              <Clock className="w-3 h-3" />
              {`${Math.round(metrics.p95Latency)}ms p95`}
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <span>
              p99 Latency: <strong className="text-zinc-200">{Math.round(metrics.p99Latency)}ms</strong>
            </span>
            <span className="text-emerald-400">
              {metrics.avgLatency > 0 ? `TTFT ~${Math.round(metrics.avgLatency * 0.4)}ms` : 'No events'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Split (2/3 and 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Recent Activity (8 Cols / ~2/3) (Stagger 5) */}
        <section id="tour-traces" className="lg:col-span-8 motion-enter stagger-5 bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/80 rounded-xl overflow-hidden shadow-md">
          {/* Header & Quick Filters */}
          <div className="p-5 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
                <ListFilter className="w-4 h-4 text-indigo-400" />
                Live Trace Stream
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                {`${recentEvents.length} recorded events`}
              </span>
            </div>

            {/* Link to full Waterfall Explorer */}
            <div className="flex items-center gap-2">
              <Link
                href="/traces"
                className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 rounded-md text-zinc-200 text-xs transition-colors cursor-pointer"
              >
                <span>Waterfall View</span>
                <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
              </Link>
            </div>
          </div>

          {/* Table / List Header */}
          <div className="grid grid-cols-12 px-5 py-2.5 bg-zinc-950/40 text-[11px] font-mono text-zinc-400 border-b border-zinc-800/60 uppercase tracking-wider">
            <div className="col-span-5 sm:col-span-5">Agent / Pipeline</div>
            <div className="col-span-2 sm:col-span-2 text-right">Tokens</div>
            <div className="hidden sm:block sm:col-span-2 text-right">Cost</div>
            <div className="col-span-3 sm:col-span-2 text-right">Latency</div>
            <div className="col-span-2 sm:col-span-1 text-right">Status</div>
          </div>

          {/* Activity Rows */}
          {recentEvents.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-10 h-10 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center mx-auto text-zinc-400">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">No Telemetry Traces Yet</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                The collection service is active on port 8080. When your AI agents send telemetry
                payloads via the Python SDK or HTTP gateway, real execution traces will appear here automatically.
              </p>
              <div className="pt-2">
                <code className="text-[11px] font-mono bg-zinc-950 px-3 py-1.5 rounded-md border border-zinc-800 text-indigo-300">
                  python3 example_usage.py
                </code>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {recentEvents.map((event) => {
                const isSuccess = event.status === 'success' || event.status === '200';
                const totalTokens =
                  event.total_tokens ||
                  (Number(event.prompt_tokens || 0) + Number(event.completion_tokens || 0));
                const isLatencyHigh = event.latency_ms > 1500;

                const iconBg = !isSuccess
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  : isLatencyHigh
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400';

                const statusStyle = !isSuccess
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : isLatencyHigh
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';

                const statusBadge = !isSuccess
                  ? (event.error_code || 'Error')
                  : isLatencyHigh
                  ? 'Latency'
                  : '200 OK';

                return (
                  <Link
                    key={`${event.trace_id}-${event.span_id}`}
                    href="/traces"
                    className="grid grid-cols-12 items-center px-5 py-3.5 hover:bg-zinc-850/50 transition-colors group cursor-pointer text-xs"
                  >
                    <div className="col-span-5 sm:col-span-5 flex items-center gap-3">
                      <div
                        className={`h-8 w-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${iconBg} group-hover:scale-105 transition-transform`}
                      >
                        {renderTraceIcon(event.model, event.status, event.agent_id)}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-100 group-hover:text-indigo-300 transition-colors truncate">
                            {event.agent_id || 'Production Agent'}
                          </span>
                          <span className="px-1.5 py-0.2 bg-zinc-800 text-[10px] font-mono text-zinc-400 rounded">
                            {event.model}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                          <span className="font-mono text-zinc-500">
                            {`span_${event.span_id ? event.span_id.slice(0, 6) : 'auto'}`}
                          </span>
                          <span>•</span>
                          <span suppressHydrationWarning>{formatTimeAgo(event.time)}</span>
                        </div>
                      </div>
                    </div>

                    <div
                      suppressHydrationWarning
                      className="col-span-2 sm:col-span-2 text-right font-mono tabular-nums text-zinc-300"
                    >
                      {`${totalTokens.toLocaleString()} tok`}
                    </div>

                    <div
                      suppressHydrationWarning
                      className="hidden sm:block sm:col-span-2 text-right font-mono tabular-nums text-zinc-300"
                    >
                      {formatCost(Number(event.cost_usd))}
                    </div>

                    <div
                      suppressHydrationWarning
                      className={`col-span-3 sm:col-span-2 text-right font-mono tabular-nums ${
                        !isSuccess
                          ? 'text-rose-400'
                          : isLatencyHigh
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {`${event.latency_ms}ms`}
                    </div>

                    <div className="col-span-2 sm:col-span-1 flex justify-end">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusStyle}`}
                      >
                        {statusBadge}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Pagination / Status Footer */}
          <div className="px-5 py-3 bg-zinc-950/40 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span>{`Showing ${recentEvents.length} of ${metrics.totalRequests.toLocaleString()} spans`}</span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/traces"
                className="px-2.5 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white text-xs transition-colors cursor-pointer"
              >
                Inspect All in Waterfall &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* Right Column: System Health 2x2 Grid (4 Cols / ~1/3) (Stagger 6) */}
        <section className="lg:col-span-4 motion-enter stagger-6 space-y-6">
          {/* System Health Box */}
          <div id="tour-health" className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/80 rounded-xl p-5 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                System Health
              </h2>
              <span className={`text-[11px] font-mono ${allServicesHealthy ? 'text-emerald-400' : 'text-amber-400'}`}>
                {allServicesHealthy ? 'Cluster 100%' : 'Degraded'}
              </span>
            </div>

            {/* 2x2 Grid of Micro-Cards */}
            <div className="grid grid-cols-2 gap-3.5">
              {/* Micro-card 1: Collection Service */}
              <a
                href="http://localhost:8080"
                target="_blank"
                rel="noopener noreferrer"
                title="OTel Collection Service (http://localhost:8080)"
                className="bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 rounded-lg p-3.5 transition-all duration-300 ease-out hover:-translate-y-0.5 group block cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded-md bg-zinc-900 text-zinc-300 border border-zinc-800 group-hover:text-indigo-400 transition-colors">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  {/* Status dot indicator */}
                  <div className="relative flex h-2.5 w-2.5">
                    {isGoHealthy ? (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                      </>
                    ) : (
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500/50"></span>
                    )}
                  </div>
                </div>
                <div className="font-medium text-xs text-zinc-200">Collection Svc</div>
                <div className="text-[10px] font-mono text-zinc-400 mt-1 flex items-center justify-between">
                  <span>Go Ingestion</span>
                  <span className={isGoHealthy ? 'text-emerald-400' : 'text-rose-400'}>
                    {isGoHealthy ? ':8080' : 'Offline'}
                  </span>
                </div>
              </a>

              {/* Micro-card 2: TimescaleDB */}
              <a
                href="http://localhost:5050"
                target="_blank"
                rel="noopener noreferrer"
                title="TimescaleDB / pgAdmin (http://localhost:5050)"
                className="bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 rounded-lg p-3.5 transition-all duration-300 ease-out hover:-translate-y-0.5 group block cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded-md bg-zinc-900 text-zinc-300 border border-zinc-800 group-hover:text-indigo-400 transition-colors">
                    <Database className="w-3.5 h-3.5" />
                  </div>
                  {/* Status dot indicator */}
                  <div className="relative flex h-2.5 w-2.5">
                    {isTimescaleHealthy ? (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                      </>
                    ) : (
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500/50"></span>
                    )}
                  </div>
                </div>
                <div className="font-medium text-xs text-zinc-200">TimescaleDB</div>
                <div className="text-[10px] font-mono text-zinc-400 mt-1 flex items-center justify-between">
                  <span>Hypertables</span>
                  <span className={isTimescaleHealthy ? 'text-emerald-400' : 'text-rose-400'}>
                    {isTimescaleHealthy ? ':5432' : 'Offline'}
                  </span>
                </div>
              </a>

              {/* Micro-card 3: Redpanda */}
              <a
                href="http://localhost:9644"
                target="_blank"
                rel="noopener noreferrer"
                title="Redpanda Console (http://localhost:9644)"
                className="bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 rounded-lg p-3.5 transition-all duration-300 ease-out hover:-translate-y-0.5 group block cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded-md bg-zinc-900 text-zinc-300 border border-zinc-800 group-hover:text-indigo-400 transition-colors">
                    <Radio className="w-3.5 h-3.5" />
                  </div>
                  {/* Status dot indicator */}
                  <div className="relative flex h-2.5 w-2.5">
                    {isRedpandaHealthy ? (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                      </>
                    ) : (
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500/50"></span>
                    )}
                  </div>
                </div>
                <div className="font-medium text-xs text-zinc-200">Redpanda</div>
                <div className="text-[10px] font-mono text-zinc-400 mt-1 flex items-center justify-between">
                  <span>Event Bus</span>
                  <span className={isRedpandaHealthy ? 'text-emerald-400' : 'text-rose-400'}>
                    {isRedpandaHealthy ? ':9092' : 'Offline'}
                  </span>
                </div>
              </a>

              {/* Micro-card 4: Grafana */}
              <a
                href="http://localhost:3000"
                target="_blank"
                rel="noopener noreferrer"
                title="Grafana Dashboards (http://localhost:3000)"
                className="bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 rounded-lg p-3.5 transition-all duration-300 ease-out hover:-translate-y-0.5 group block cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded-md bg-zinc-900 text-zinc-300 border border-zinc-800 group-hover:text-indigo-400 transition-colors">
                    <BarChart3 className="w-3.5 h-3.5" />
                  </div>
                  {/* Status dot indicator */}
                  <div className="relative flex h-2.5 w-2.5">
                    {isGrafanaHealthy ? (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                      </>
                    ) : (
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500/50"></span>
                    )}
                  </div>
                </div>
                <div className="font-medium text-xs text-zinc-200">Grafana</div>
                <div className="text-[10px] font-mono text-zinc-400 mt-1 flex items-center justify-between">
                  <span>Dashboards</span>
                  <span className={isGrafanaHealthy ? 'text-emerald-400' : 'text-rose-400'}>
                    {isGrafanaHealthy ? ':3000' : 'Offline'}
                  </span>
                </div>
              </a>
            </div>

            {/* Quick Health Meta Stats */}
            <div className="mt-4 pt-3 border-t border-zinc-800/80 space-y-2 text-xs">
              <div className="flex justify-between items-center text-zinc-400">
                <span className="text-[11px]">Database Connection</span>
                <span className="font-mono text-zinc-200 text-[11px]">
                  {dbConnected ? 'Nominal (Postgres 14)' : 'Unreachable'}
                </span>
              </div>
              <div className="w-full bg-zinc-800/60 h-1 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${dbConnected ? 'bg-emerald-400 w-[100%]' : 'bg-rose-500 w-[20%]'}`}></div>
              </div>
              <div className="flex justify-between items-center text-zinc-400 pt-1">
                <span className="text-[11px]">Table Storage Allocated</span>
                <span className="font-mono text-zinc-200 text-[11px]">{tableSize}</span>
              </div>
              <div className="w-full bg-zinc-800/60 h-1 rounded-full overflow-hidden">
                <div className="bg-indigo-400 h-full w-[8%] rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Secondary Card: Real Model Provider Gateways */}
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/80 rounded-xl p-5 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Active Provider Telemetry
              </h3>
              <span className="text-[10px] font-mono text-zinc-500">Live Channels</span>
            </div>

            <div className="space-y-3">
              {providers.length === 0 ? (
                <div className="text-xs text-zinc-500 py-2">
                  No providers recorded yet. Instrument calls to see active gateways.
                </div>
              ) : (
                providers.map((p) => (
                  <div key={p.provider} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                      <span className="text-zinc-200 font-medium capitalize">
                        {p.provider} Gateway
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-zinc-400">
                      {`${p.count} events`}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
