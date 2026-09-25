import IntegrationsPanel from '@/components/IntegrationsPanel';

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="border-b border-zinc-800/80 pb-5">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-50">
            System &amp; Agent Integrations
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Configure external agent runtimes, local model providers, and environment telemetry parameters.
          </p>
        </header>

        <IntegrationsPanel />
      </div>
    </div>
  );
}
