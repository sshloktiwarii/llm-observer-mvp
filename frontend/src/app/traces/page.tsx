import { Pool } from 'pg';
import { TraceWaterfallClient, type TraceRecord } from './TraceWaterfallClient';

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

interface RawTraceRow {
  id: string;
  agent_name: string;
  model_name: string;
  tokens: number | string;
  prompt_tokens?: number | string | null;
  completion_tokens?: number | string | null;
  latency_ms: number | string;
  status_code: string;
  timestamp: Date | string;
  cost_usd: number | string | null;
  request_text?: string | null;
  response_text?: string | null;
  span_id?: string | null;
}

function formatTimestampString(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return 'Recently';
  if (typeof dateInput === 'string' && (dateInput.includes('ago') || dateInput.includes('UTC'))) {
    return dateInput;
  }
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Recently';
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds} UTC`;
}

async function fetchTracesData(): Promise<{ traces: TraceRecord[]; dbConnected: boolean }> {
  try {
    const result = await pool.query<RawTraceRow>(`
      SELECT 
        trace_id AS id, 
        agent_id AS agent_name, 
        model AS model_name, 
        COALESCE(total_tokens, prompt_tokens + completion_tokens, 0) AS tokens, 
        prompt_tokens,
        completion_tokens,
        latency_ms, 
        status AS status_code, 
        time AS timestamp,
        cost_usd::float AS cost_usd,
        request_text,
        response_text,
        span_id
      FROM llm_events 
      ORDER BY time DESC 
      LIMIT 100;
    `);

    const dbTraces: TraceRecord[] = result.rows.map((row) => ({
      id: row.id,
      agent_name: row.agent_name || 'Production Agent',
      model_name: row.model_name || 'unknown-model',
      tokens: Number(row.tokens) || 0,
      prompt_tokens: row.prompt_tokens != null ? Number(row.prompt_tokens) : 0,
      completion_tokens: row.completion_tokens != null ? Number(row.completion_tokens) : 0,
      latency_ms: Number(row.latency_ms) || 0,
      status_code: row.status_code === 'success' ? '200 OK' : row.status_code || '200 OK',
      timestamp: formatTimestampString(row.timestamp),
      cost_usd: Number(row.cost_usd) || 0,
      request_text: row.request_text,
      response_text: row.response_text,
      span_id: row.span_id ? `span_${row.span_id.slice(0, 8)}` : undefined,
      isDbRecord: true,
    }));

    return {
      traces: dbTraces,
      dbConnected: true,
    };
  } catch (error) {
    console.error('Database query error in /traces/page.tsx:', error);
    return {
      traces: [],
      dbConnected: false,
    };
  }
}

export default async function TracesPage() {
  const { traces, dbConnected } = await fetchTracesData();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 font-sans antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TraceWaterfallClient traces={traces} dbConnected={dbConnected} />
      </div>
    </main>
  );
}
