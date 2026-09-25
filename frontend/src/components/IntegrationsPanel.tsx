'use client';

import React, { useState, useEffect } from 'react';
import { fs } from '@/lib/fs';

export default function IntegrationsPanel() {
  const [codexConfig, setCodexConfig] = useState('');
  const [claudeConfig, setClaudeConfig] = useState('');
  const [codexSaving, setCodexSaving] = useState(false);
  const [claudeSaving, setClaudeSaving] = useState(false);
  const [codexError, setCodexError] = useState<string | null>(null);
  const [claudeError, setClaudeError] = useState<string | null>(null);
  const [codexSuccess, setCodexSuccess] = useState<boolean | null>(null);
  const [claudeSuccess, setClaudeSuccess] = useState<boolean | null>(null);

  const loadCodexConfig = async () => {
    setCodexError(null);
    setCodexSuccess(null);
    try {
      const config = await fs.readFile('~/.codex/config.toml');
      setCodexConfig(config);
      setCodexSuccess(true);
      setTimeout(() => setCodexSuccess(null), 3000);
    } catch {
      // File might not exist yet
      setCodexConfig('');
      setCodexError('Configuration file not found (~/.codex/config.toml)');
      setTimeout(() => setCodexError(null), 5000);
    }
  };

  const loadClaudeConfig = async () => {
    setClaudeError(null);
    setClaudeSuccess(null);
    try {
      const env = await fs.readFile('~/.fcc/.env');
      setClaudeConfig(env);
      setClaudeSuccess(true);
      setTimeout(() => setClaudeSuccess(null), 3000);
    } catch {
      // File might not exist yet
      setClaudeConfig('');
      setClaudeError('Environment file not found (~/.fcc/.env)');
      setTimeout(() => setClaudeError(null), 5000);
    }
  };

  const saveCodexConfig = async () => {
    setCodexSaving(true);
    setCodexError(null);
    setCodexSuccess(null);
    try {
      await fs.writeFile('~/.codex/config.toml', codexConfig);
      setCodexSuccess(true);
      setTimeout(() => setCodexSuccess(null), 3000);
    } catch (error) {
      setCodexError(`Failed to save: ${error instanceof Error ? error.message : String(error)}`);
      setTimeout(() => setCodexError(null), 5000);
    } finally {
      setCodexSaving(false);
    }
  };

  const saveClaudeConfig = async () => {
    setClaudeSaving(true);
    setClaudeError(null);
    setClaudeSuccess(null);
    try {
      await fs.writeFile('~/.fcc/.env', claudeConfig);
      setClaudeSuccess(true);
      setTimeout(() => setClaudeSuccess(null), 3000);
    } catch (error) {
      setClaudeError(`Failed to save: ${error instanceof Error ? error.message : String(error)}`);
      setTimeout(() => setClaudeError(null), 5000);
    } finally {
      setClaudeSaving(false);
    }
  };

  // Load configs on mount
  useEffect(() => {
    loadCodexConfig();
    loadClaudeConfig();
  }, []);

  return (
    <div className="space-y-6">
      {/* Codex Integration Card */}
      <div className="bg-zinc-900/50 backdrop-blur-sm rounded-xl border border-zinc-800/80 p-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-100 tracking-tight">Codex Integration</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Manage local agent execution settings</p>
          </div>
          <button
            type="button"
            onClick={loadCodexConfig}
            disabled={codexSaving}
            className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-xs text-zinc-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {codexSaving ? 'Saving...' : 'Refresh'}
          </button>
        </div>
        
        {codexError && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg p-3 mb-4 font-mono">
            {codexError}
          </div>
        )}
        
        {codexSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg p-3 mb-4 font-mono">
            Configuration loaded/saved successfully!
          </div>
        )}
        
        <div className="space-y-2">
          <label htmlFor="codex-config" className="text-xs font-medium text-zinc-300">
            Configuration File (~/.codex/config.toml)
          </label>
          <textarea
            id="codex-config"
            value={codexConfig}
            onChange={(e) => setCodexConfig(e.target.value)}
            className="w-full min-h-[160px] rounded-lg border border-zinc-800 bg-zinc-950/80 p-3 text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/70 resize-y"
            disabled={codexSaving}
            placeholder="# ~/.codex/config.toml configuration"
          />
        </div>
        <button
          type="button"
          onClick={saveCodexConfig}
          disabled={codexSaving || !codexConfig.trim()}
          className="w-full mt-4 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
        >
          {codexSaving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      {/* Claude Code Integration Card */}
      <div className="bg-zinc-900/50 backdrop-blur-sm rounded-xl border border-zinc-800/80 p-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-100 tracking-tight">Claude Code Integration</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Manage local environment API keys and endpoint flags</p>
          </div>
          <button
            type="button"
            onClick={loadClaudeConfig}
            disabled={claudeSaving}
            className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-xs text-zinc-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {claudeSaving ? 'Saving...' : 'Refresh'}
          </button>
        </div>
        
        {claudeError && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg p-3 mb-4 font-mono">
            {claudeError}
          </div>
        )}
        
        {claudeSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg p-3 mb-4 font-mono">
            Environment loaded/saved successfully!
          </div>
        )}
        
        <div className="space-y-2">
          <label htmlFor="claude-config" className="text-xs font-medium text-zinc-300">
            Environment File (~/.fcc/.env)
          </label>
          <textarea
            id="claude-config"
            value={claudeConfig}
            onChange={(e) => setClaudeConfig(e.target.value)}
            className="w-full min-h-[160px] rounded-lg border border-zinc-800 bg-zinc-950/80 p-3 text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/70 resize-y"
            disabled={claudeSaving}
            placeholder="# ~/.fcc/.env environment variables"
          />
        </div>
        <button
          type="button"
          onClick={saveClaudeConfig}
          disabled={claudeSaving || !claudeConfig.trim()}
          className="w-full mt-4 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
        >
          {claudeSaving ? 'Saving...' : 'Save Environment'}
        </button>
      </div>
    </div>
  );
}
