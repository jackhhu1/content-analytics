'use client';
import React, { useState, useEffect, useRef } from 'react';
import { triggerScrapeAction } from '@/lib/apify-trigger';
import { getAccounts, addAccount, removeAccount } from '@/lib/db-actions';

function formatLastFetched(ts: string | null) {
  if (!ts) return 'Never fetched';
  const date = new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}

export default function SetupPage() {
  const [handleInput, setHandleInput] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [triggering, setTriggering] = useState(false);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevScrapedRef = useRef<Record<string, string | null>>({});

  // Hardcoded mock user for now
  const MOCK_USER_ID = '5d1def1e-507a-426b-b859-49f1e3b8ca52';

  const refreshAccounts = async () => {
    const data = await getAccounts(MOCK_USER_ID);
    setAccounts(data);
    return data;
  };

  useEffect(() => {
    async function load() {
      const data = await refreshAccounts();
      // Snapshot current scraped_at values as baseline
      const snapshot: Record<string, string | null> = {};
      data.forEach((a: any) => { snapshot[a.id] = a.last_scraped_at; });
      prevScrapedRef.current = snapshot;
      setLoading(false);
    }
    load();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [MOCK_USER_ID]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handleInput.trim()) return;

    // Validation: Strip @ and validate characters
    let raw = handleInput.trim().replace(/^@/, '');
    if (!/^[a-zA-Z0-9_.]+$/.test(raw)) {
      setStatus('Invalid Instagram handle. Only letters, numbers, dots, and underscores allowed.');
      return;
    }

    try {
      setStatus('Adding...');
      const newAcc = await addAccount(MOCK_USER_ID, raw);
      setAccounts([newAcc, ...accounts]);
      setHandleInput('');
      setStatus('');
    } catch (err: any) {
      setStatus(err.message || 'Error adding account');
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeAccount(id);
      setAccounts(accounts.filter(a => a.id !== id));
    } catch (err: any) {
      setStatus(err.message || 'Error removing account');
    }
  };

  const handleTrigger = async () => {
    setTriggering(true);
    setStatus('Triggering crawler...');

    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        setStatus('Trigger simulated (mock mode). Check server logs.');
        setTimeout(() => setStatus(''), 3000);
        setTriggering(false);
        return;
      }
      const res = await triggerScrapeAction(MOCK_USER_ID);
      setStatus(`${res.message} — Waiting for data...`);

      // Snapshot the current last_scraped_at for each account before polling
      const snapshot: Record<string, string | null> = {};
      accounts.forEach(a => { snapshot[a.id] = a.last_scraped_at; });
      prevScrapedRef.current = snapshot;

      // Poll every 5s, stop when any account's last_scraped_at changes
      pollRef.current = setInterval(async () => {
        const fresh = await refreshAccounts();
        const updated = fresh.some(
          (a: any) => a.last_scraped_at !== prevScrapedRef.current[a.id]
        );
        if (updated) {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setTriggering(false);
          setStatus('✓ Scrape complete — accounts updated!');
          setTimeout(() => setStatus(''), 4000);
        }
      }, 5000);

    } catch (e: any) {
      setStatus(e.message || 'Trigger failed');
      setTriggering(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-200 px-4 py-12 font-sans">
      <div className="max-w-2xl mx-auto space-y-10">

        <header className="space-y-3">
          <h1 className="text-3xl font-bold text-white tracking-tight">Niche Intelligence Setup</h1>
          <p className="text-slate-400">Add the top performers in your niche to build your signal baseline.</p>
        </header>

        {/* Input Form */}
        <section className="bg-slate-900 border border-white/10 rounded-xl p-6 backdrop-blur-sm shadow-xl">
          <form onSubmit={handleAdd} className="flex gap-4">
            <div className="flex-1 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">@</span>
              <input
                type="text"
                value={handleInput}
                onChange={e => setHandleInput(e.target.value)}
                placeholder="instagram_handle"
                className="w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-9 pr-4 focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="bg-white hover:bg-slate-200 text-black font-semibold px-6 rounded-lg transition-colors"
            >
              Add
            </button>
          </form>
          {status && <p className="text-sm mt-3 text-emerald-400 font-medium">{status}</p>}
        </section>

        {/* List */}
        <section className="space-y-4">
          <div className="flex justify-between items-center bg-slate-900/50 px-5 py-3 rounded-t-xl border-b border-white/10">
            <h2 className="font-semibold text-slate-300">Tracked Accounts ({accounts.length})</h2>
            <button
              onClick={handleTrigger}
              disabled={triggering || accounts.length === 0}
              className="text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white px-4 py-2 rounded shadow-[0_0_15px_rgba(79,70,229,0.2)] transition-all"
            >
              {triggering ? "Starting..." : "Trigger Scrape Now ↗"}
            </button>
          </div>

          <ul className="space-y-2">
            {accounts.map(acc => (
              <li key={acc.id} className="flex justify-between items-center bg-slate-900/80 border border-white/5 rounded-lg p-4">
                <div className="flex gap-4 items-center">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex-shrink-0 overflow-hidden flex items-center justify-center text-slate-400 font-bold">
                    {acc.profile_pic_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={acc.profile_pic_url}
                        alt={`@${acc.handle}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Gracefully fall back to letter on 403s
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      acc.handle.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200">@{acc.handle}</p>
                    <p className="text-xs text-slate-500">
                      {acc.current_follower_count > 0 ? `${acc.current_follower_count.toLocaleString()} followers · ` : ''}
                      <span className={acc.last_scraped_at ? 'text-emerald-600' : 'text-slate-600'}>
                        {acc.last_scraped_at ? `Last fetched ${formatLastFetched(acc.last_scraped_at)}` : 'Never fetched'}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(acc.id)}
                  className="text-slate-500 hover:text-red-400 p-2 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
            {accounts.length === 0 && !loading && (
              <li className="text-center py-8 text-slate-500 border border-dashed border-white/10 rounded-lg">
                No accounts tracked. Add your first handle above.
              </li>
            )}
            {loading && (
              <li className="text-center py-8 text-slate-500 border border-dashed border-white/10 rounded-lg">
                Loading accounts...
              </li>
            )}
          </ul>
        </section>

      </div>
    </div>
  );
}
