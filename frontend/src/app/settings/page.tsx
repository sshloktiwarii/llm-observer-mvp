export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="border-b border-zinc-800/80 pb-5">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-50">Settings &amp; Platform Configuration</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Configure telemetry retention policies, collection service endpoints, and notification alerts.
          </p>
        </header>
        
        {/* General Settings */}
        <div className="bg-zinc-900/50 backdrop-blur-sm rounded-xl border border-zinc-800/80 p-6 shadow-md">
          <h2 className="text-base font-semibold text-zinc-100 tracking-tight mb-4">General Preferences</h2>
          <div className="space-y-4 divide-y divide-zinc-800/60 text-xs">
            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="font-medium text-zinc-200">Interface Theme</div>
                <div className="text-[11px] text-zinc-500">Dark aesthetic optimized for high-density observability</div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                <span className="font-medium text-zinc-300 font-mono text-[11px]">Deep Zinc (Default)</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-3">
              <div>
                <div className="font-medium text-zinc-200">Telemetry Polling Interval</div>
                <div className="text-[11px] text-zinc-500">Frequency of background telemetry metric recalculation</div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">30 seconds</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-3">
              <div>
                <div className="font-medium text-zinc-200">Real-time Stream Alerts</div>
                <div className="text-[11px] text-zinc-500">Notify on error rate surges or latency SLA threshold spikes</div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Enabled</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Data Retention */}
        <div className="bg-zinc-900/50 backdrop-blur-sm rounded-xl border border-zinc-800/80 p-6 shadow-md">
          <h2 className="text-base font-semibold text-zinc-100 tracking-tight mb-4">Storage &amp; TimescaleDB Retention</h2>
          <div className="space-y-4 divide-y divide-zinc-800/60 text-xs">
            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="font-medium text-zinc-200">Telemetry Event Retention</div>
                <div className="text-[11px] text-zinc-500">Hypertables drop chunk policy for spans older than threshold</div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">90 days</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-3">
              <div>
                <div className="font-medium text-zinc-200">Log Verbosity</div>
                <div className="text-[11px] text-zinc-500">Go collector daemon logging level</div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">INFO</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* API Configuration */}
        <div className="bg-zinc-900/50 backdrop-blur-sm rounded-xl border border-zinc-800/80 p-6 shadow-md">
          <h2 className="text-base font-semibold text-zinc-100 tracking-tight mb-4">Collector &amp; Gateway Configuration</h2>
          <div className="space-y-4 divide-y divide-zinc-800/60 text-xs">
            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="font-medium text-zinc-200">Collection Service URL</div>
                <div className="text-[11px] text-zinc-500">HTTP REST endpoint for ingesting agent spans</div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-[11px] px-2.5 py-1 rounded bg-zinc-950 text-indigo-300 border border-zinc-800 select-all">http://localhost:8080</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-3">
              <div>
                <div className="font-medium text-zinc-200">Connection Timeout</div>
                <div className="text-[11px] text-zinc-500">Default HTTP timeout for asynchronous batch dispatch</div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">5000ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
