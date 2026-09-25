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

const fallbackSupplementalTraces: TraceRecord[] = [
  {
    id: 'trace_88f21c3b-41da-45e2-8921-93bf01',
    agent_name: 'Research Agent',
    model_name: 'GPT-4o',
    tokens: 3412,
    prompt_tokens: 2800,
    completion_tokens: 612,
    latency_ms: 814,
    status_code: '200 OK',
    timestamp: '12s ago',
    cost_usd: 0.0241,
    request_text:
      'Analyze multimodal sensor telemetry logs across distributed edge gateways. Correlate temperature fluctuations with CPU frequency throttling.',
    response_text:
      'Correlation index of 0.89 confirmed between thermal spikes (>78°C) and gateway clock frequency throttling on edge nodes 04 and 09. Suggested remedy: dynamic fan curve adjustment.',
    span_id: 'span_88f21c',
  },
  {
    id: 'trace_49d09ae7-502a-416e-a320-cb9110',
    agent_name: 'Code Synthesizer',
    model_name: 'Claude 3.5 Sonnet',
    tokens: 8920,
    prompt_tokens: 6120,
    completion_tokens: 2800,
    latency_ms: 1840,
    status_code: '200 OK',
    timestamp: '41s ago',
    cost_usd: 0.0624,
    request_text:
      'Refactor Next.js WebSocket telemetry transport handler to support automatic exponential backoff reconnection and client heartbeat checks.',
    response_text:
      'Exported reconnecting WebSocket provider with configured maxAttempts=5, initialDelay=500ms, and heartbeat ping interval of 15 seconds.',
    span_id: 'span_49d09a',
  },
  {
    id: 'trace_77b31e90-f04b-4c27-91a1-dd65a3',
    agent_name: 'Document RAG Classifier',
    model_name: 'text-embedding-3',
    tokens: 1120,
    prompt_tokens: 1120,
    completion_tokens: 0,
    latency_ms: 164,
    status_code: '200 OK',
    timestamp: '1m ago',
    cost_usd: 0.0001,
    request_text:
      'Generate 1536-dimensional dense vector embeddings for ingested enterprise audit policy PDF chunks.',
    response_text:
      'Generated 12 embedding vectors with L2 normalization across batch chunk tokens. Stored to vector hypertable.',
    span_id: 'span_77b31e',
  },
  {
    id: 'trace_91a04cc8-aa12-4091-bf99-195c88',
    agent_name: 'Customer Query Router',
    model_name: 'GPT-4-Turbo',
    tokens: 0,
    prompt_tokens: 0,
    completion_tokens: 0,
    latency_ms: 504,
    status_code: '429 Rate Limit',
    timestamp: '2m ago',
    cost_usd: 0.0,
    request_text:
      'Route user billing dispute inquiry to appropriate tier-2 account management queue.',
    response_text:
      'HTTP 429 Too Many Requests: TPM rate limit exceeded on upstream OpenAI gateway for organization tier 5.',
    span_id: 'span_91a04c',
  },
  {
    id: 'trace_12c77f0a-7bb1-4190-8cf9-bb0299',
    agent_name: 'Guardrail Safety Filter',
    model_name: 'Llama-3-70B',
    tokens: 512,
    prompt_tokens: 420,
    completion_tokens: 92,
    latency_ms: 198,
    status_code: '200 OK',
    timestamp: '3m ago',
    cost_usd: 0.0031,
    request_text:
      'Evaluate user prompt for prompt injection vulnerabilities, jailbreak heuristics, and toxicity scores.',
    response_text:
      'Safety policy check passed with 0.00 prompt injection score and 0 toxicity flags. Safe to forward to model pipeline.',
    span_id: 'span_12c77f',
  },
  {
    id: 'trace_31f90bc1-6cc2-4df2-a320-ee9821',
    agent_name: 'Chat Copilot Engine',
    model_name: 'GPT-4o mini',
    tokens: 2180,
    prompt_tokens: 1650,
    completion_tokens: 530,
    latency_ms: 272,
    status_code: '200 OK',
    timestamp: '5m ago',
    cost_usd: 0.0016,
    request_text:
      'Summarize multi-turn customer chat transcript and output next best support action items.',
    response_text:
      'Summary: User requested assistance configuring SSO via Okta SAML 2.0. Action: Dispatch knowledge base document KB-401.',
    span_id: 'span_31f90b',
  },
];

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
      LIMIT 15;
    `);

    const dbTraces: TraceRecord[] = result.rows.map((row) => ({
      id: row.id,
      agent_name: row.agent_name || 'Production Agent',
      model_name: row.model_name || 'GPT-4',
      tokens: Number(row.tokens) || 0,
      prompt_tokens: Number(row.prompt_tokens) || 0,
      completion_tokens: Number(row.completion_tokens) || 0,
      latency_ms: Number(row.latency_ms) || 0,
      status_code: row.status_code === 'success' ? '200 OK' : row.status_code || '200 OK',
      timestamp: row.timestamp,
      cost_usd: Number(row.cost_usd) || 0,
      request_text: row.request_text,
      response_text: row.response_text,
      span_id: row.span_id ? `span_${row.span_id.slice(0, 8)}` : undefined,
      isDbRecord: true,
    }));

    // If database has records, place them at top and supplement if needed to provide 8+ traces
    const combined = [
      ...dbTraces,
      ...fallbackSupplementalTraces.slice(dbTraces.length),
    ].slice(0, 15);

    return {
      traces: combined.length > 0 ? combined : fallbackSupplementalTraces,
      dbConnected: true,
    };
  } catch (error) {
    console.error('Database query error in /traces/page.tsx:', error);
    return {
      traces: fallbackSupplementalTraces,
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
