'use client';

import React, { useEffect, useCallback } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { HelpCircle } from 'lucide-react';

const TOUR_STORAGE_KEY = 'llm_observer_has_seen_tour';

export function OnboardingTour() {
  const startTour = useCallback((force: boolean = false) => {
    // If not forcing and elements aren't mounted yet, skip
    if (!document.querySelector('#tour-metrics')) return;

    const driverObj = driver({
      showProgress: true,
      animate: true,
      overlayColor: 'rgba(0, 0, 0, 0.78)',
      popoverClass: 'llm-observer-tour',
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: 'Finish Tour ✓',
      onDestroyStarted: () => {
        try {
          localStorage.setItem(TOUR_STORAGE_KEY, 'true');
        } catch {
          // Ignore localStorage errors in private browsing
        }
        driverObj.destroy();
      },
      steps: [
        {
          element: '#tour-metrics',
          popover: {
            title: '⚡ Token Economics & Volume',
            description:
              'Real-time aggregation of your LLM token economics. Monitor total model invocations, cumulative USD costs, tokens consumed, and p99 latency heatmaps.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-traces',
          popover: {
            title: '📊 Live Trace Stream',
            description:
              'Watch agent spans stream in live as your local models execute. Inspect status codes, duration, token usage, and jump directly into the detailed Waterfall View.',
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '#tour-health',
          popover: {
            title: '🛡️ System Health & Infrastructure',
            description:
              'Monitor your Go ingestion, TimescaleDB, and Redpanda Docker containers in real-time with sub-second TCP socket probes.',
            side: 'left',
            align: 'start',
          },
        },
        {
          element: '#tour-purge',
          popover: {
            title: '🗑️ Purge Data & Reset',
            description:
              'Instantly wipe your TimescaleDB and reset the dashboard without needing external database tools or manual migrations.',
            side: 'bottom',
            align: 'end',
          },
        },
      ],
    });

    driverObj.drive();
  }, []);

  useEffect(() => {
    try {
      const hasSeenTour = localStorage.getItem(TOUR_STORAGE_KEY);
      if (!hasSeenTour) {
        const timer = setTimeout(() => {
          startTour(false);
        }, 750);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore localStorage exceptions
    }
  }, [startTour]);

  return (
    <button
      type="button"
      onClick={() => startTour(true)}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 transition-all duration-200 cursor-pointer shadow-sm hover:text-white"
      title="Start Interactive Dashboard Tour"
    >
      <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
      <span>Tour</span>
    </button>
  );
}

export default OnboardingTour;
