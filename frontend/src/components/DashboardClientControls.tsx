'use client';

import React, { useState } from 'react';
import { RefreshCw, Copy, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function LiveRefreshButton() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={isRefreshing}
      title="Refresh live telemetry stream"
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
    >
      <RefreshCw className={`w-3.5 h-3.5 text-zinc-400 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
      <span>{isRefreshing ? 'Syncing...' : 'Live (5s)'}</span>
    </button>
  );
}

export function CopyTraceButton({ traceId }: { traceId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(traceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Copied Trace ID!' : 'Copy Trace ID'}
      className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-emerald-400" />
          <span className="text-[11px] text-emerald-400">Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3 text-zinc-500 hover:text-zinc-300" />
          <span className="text-[11px] text-zinc-400 hover:text-zinc-200">{traceId.slice(0, 11)}...</span>
        </>
      )}
    </button>
  );
}

