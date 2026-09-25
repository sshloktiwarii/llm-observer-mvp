import './globals.css';
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import Link from 'next/link';
import { Activity, Plus } from 'lucide-react';
import { NotificationCenter } from '@/components/NotificationCenter';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'LLM Observer — AI Observability Platform',
  description: 'Real-time trace profiling, token economics, latency heatmaps, and worker orchestrations.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${jetbrainsMono.variable} min-h-screen bg-zinc-950 text-zinc-50 font-sans antialiased selection:bg-indigo-500/30 selection:text-indigo-200`}
      >
        {/* Subtle ambient background glow */}
        <div className="fixed inset-0 pointer-events-none hero-glow z-0"></div>

        {/* Top Navigation (Sticky Frosted Glass) */}
        <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/75 backdrop-blur-md transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Left: Brand Logo & Links */}
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-indigo-400 p-[1px] shadow-sm shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all duration-300">
                  <div className="h-full w-full bg-zinc-950 rounded-[7px] flex items-center justify-center">
                    <Activity className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform duration-200" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm tracking-tight text-zinc-50 font-sans">LLM Observer</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-800/80 text-zinc-400 border border-zinc-700/50 font-mono">v1.4</span>
                </div>
              </Link>

              {/* Nav Links */}
              <nav className="hidden md:flex items-center gap-1">
                <Link
                  href="/"
                  className="relative px-3 py-1.5 text-xs font-medium text-zinc-100 rounded-md bg-zinc-900/80 border border-zinc-800 transition-all flex items-center gap-2 shadow-sm"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                  Dashboard
                </Link>
                <Link
                  href="/traces"
                  className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 rounded-md hover:bg-zinc-900/40 transition-all"
                >
                  Traces &amp; Spans
                </Link>
                <Link
                  href="/settings"
                  className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 rounded-md hover:bg-zinc-900/40 transition-all"
                >
                  Settings
                </Link>
              </nav>
            </div>

            {/* Right: Environment, Live Telemetry Status & Actions */}
            <div className="flex items-center gap-3">
              {/* Live Cluster Status Badge */}
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900/70 border border-zinc-800 text-xs text-zinc-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-zinc-400 font-mono text-[11px]">telemetry.stream: active</span>
              </div>

              {/* Environment Indicator */}
              <div
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-zinc-900/50 border border-zinc-800 text-xs text-zinc-200 shadow-sm"
                title="Active Telemetry Environment: Local Development Cluster (localhost:8080)"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="font-medium font-mono text-[11px]">local-dev</span>
              </div>

              <div className="h-4 w-[1px] bg-zinc-800"></div>

              {/* Notification & Alert Center */}
              <NotificationCenter />

              <button
                type="button"
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-md text-xs font-medium shadow-sm transition-all duration-200 hover:shadow-indigo-500/25 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Trace</span>
              </button>
            </div>
          </div>
        </header>

        {children}
      </body>
    </html>
  );
}

