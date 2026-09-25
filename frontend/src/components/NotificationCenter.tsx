'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  ArrowRight,
  X,
  ExternalLink,
} from 'lucide-react';

export interface SystemAlert {
  id: string;
  type: 'latency' | 'error' | 'loop' | 'security' | 'system';
  severity: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  timestamp: string;
  trace_id?: string;
}

const STORAGE_KEY_READ_ALERTS = 'llm_observer_read_alert_ids';

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load read alert IDs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_READ_ALERTS);
      if (stored) {
        setReadIds(new Set(JSON.parse(stored)));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Fetch alerts from /api/alerts
  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/alerts');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error('Failed to load telemetry alerts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Poll alerts every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  // Dismiss dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const unreadCount = alerts.filter((a) => !readIds.has(a.id)).length;

  const markAllRead = () => {
    const updated = new Set([...Array.from(readIds), ...alerts.map((a) => a.id)]);
    setReadIds(updated);
    try {
      localStorage.setItem(STORAGE_KEY_READ_ALERTS, JSON.stringify(Array.from(updated)));
    } catch {
      // Ignore
    }
  };

  const markAsRead = (id: string) => {
    if (!readIds.has(id)) {
      const updated = new Set([...Array.from(readIds), id]);
      setReadIds(updated);
      try {
        localStorage.setItem(STORAGE_KEY_READ_ALERTS, JSON.stringify(Array.from(updated)));
      } catch {
        // Ignore
      }
    }
  };

  const getAlertIcon = (type: SystemAlert['type'], severity: SystemAlert['severity']) => {
    switch (type) {
      case 'latency':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-rose-400" />;
      case 'security':
        return <ShieldCheck className="w-4 h-4 text-indigo-400" />;
      case 'system':
        return <Cpu className="w-4 h-4 text-emerald-400" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    try {
      const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
      if (diff < 10) return 'Just now';
      if (diff < 60) return `${diff}s ago`;
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return `${Math.floor(diff / 86400)}d ago`;
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchAlerts();
        }}
        className={`p-1.5 rounded-md border transition-all relative cursor-pointer ${
          isOpen
            ? 'bg-zinc-800 text-zinc-100 border-zinc-700 shadow-sm'
            : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/70 border-transparent hover:border-zinc-800'
        }`}
        title="System Alerts & Telemetry Notifications"
        aria-label="System Alerts"
        aria-expanded={isOpen}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500 shadow-sm shadow-indigo-500/50"></span>
          </span>
        )}
      </button>

      {/* Flyout Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-zinc-900/95 backdrop-blur-md border border-zinc-800/90 shadow-2xl z-50 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/40">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-100 text-xs">Alerts &amp; Notifications</span>
              {unreadCount > 0 ? (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {unreadCount} unread
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  All clear
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                title="Mark all notifications as read"
              >
                <CheckCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Mark read</span>
              </button>
            )}
          </div>

          {/* Alert Items List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800/50">
            {alerts.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                <p className="text-zinc-300 font-medium text-xs">Zero System Alerts</p>
                <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                  All agent trajectories and telemetry streams are operating within nominal thresholds.
                </p>
              </div>
            ) : (
              alerts.map((alert) => {
                const isRead = readIds.has(alert.id);
                return (
                  <div
                    key={alert.id}
                    onClick={() => markAsRead(alert.id)}
                    className={`p-3.5 transition-colors cursor-pointer flex gap-3 items-start ${
                      isRead ? 'bg-zinc-900/30 hover:bg-zinc-800/40 opacity-75' : 'bg-zinc-900/80 hover:bg-zinc-850'
                    }`}
                  >
                    <div className="mt-0.5 p-1 rounded-md bg-zinc-800/80 border border-zinc-700/50 flex-shrink-0">
                      {getAlertIcon(alert.type, alert.severity)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`font-medium tracking-tight truncate ${isRead ? 'text-zinc-300' : 'text-zinc-100 font-semibold'}`}>
                          {alert.title}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500 flex-shrink-0">
                          {formatRelativeTime(alert.timestamp)}
                        </span>
                      </div>

                      <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">
                        {alert.description}
                      </p>

                      {alert.trace_id && (
                        <div className="mt-2">
                          <Link
                            href={`/traces?trace_id=${alert.trace_id}`}
                            onClick={() => setIsOpen(false)}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-400 hover:text-indigo-300 hover:underline transition-all"
                          >
                            <span>Inspect Trace</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      )}
                    </div>

                    {!isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1 flex-shrink-0"></span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between text-[11px]">
            <span className="text-zinc-500 font-mono">Live anomaly heuristics</span>
            <Link
              href="/traces"
              onClick={() => setIsOpen(false)}
              className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
            >
              <span>Waterfall Explorer</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationCenter;
