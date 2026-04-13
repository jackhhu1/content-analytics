'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { triggerScrapeAction } from '@/lib/apify-trigger';
import { getAccounts, addAccount, removeAccount } from '@/lib/db-actions';

function formatNumber(num: number) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

function formatLastFetched(ts: string | null) {
  if (!ts) return 'Never fetched';
  const date = new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}

export default function SetupPanel({
  onAccountsChanged,
  selectedIds,
  onSelectionChange,
}: {
  onAccountsChanged?: () => void;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}) {
  const [handleInput, setHandleInput] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [triggering, setTriggering] = useState(false);
  const [scrapingId, setScrapingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevScrapedRef = useRef<Record<string, string | null>>({});
  // Client-side filter/sort — no extra DB calls
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'followers' | 'az'>('recent');

  const MOCK_USER_ID = '5d1def1e-507a-426b-b859-49f1e3b8ca52';

  const refreshAccounts = async () => {
    const data = await getAccounts(MOCK_USER_ID);
    setAccounts(data);
    return data;
  };

  // Initialise — select all accounts on first load
  useEffect(() => {
    async function load() {
      const data = await refreshAccounts();
      const snapshot: Record<string, string | null> = {};
      data.forEach((a: any) => { snapshot[a.id] = a.last_scraped_at; });
      prevScrapedRef.current = snapshot;
      onSelectionChange(new Set(data.map((a: any) => a.id)));
      setLoading(false);
    }
    load();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handleInput.trim()) return;

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
      // Auto-select the newly added account
      onSelectionChange(new Set([...selectedIds, newAcc.id]));
      onAccountsChanged?.();
    } catch (err: any) {
      setStatus(err.message || 'Error adding account');
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeAccount(id, MOCK_USER_ID);
      setAccounts(accounts.filter(a => a.id !== id));
      // Remove from selection too
      const next = new Set(selectedIds);
      next.delete(id);
      onSelectionChange(next);
      onAccountsChanged?.();
    } catch (err: any) {
      setStatus(err.message || 'Error removing account');
    }
  };

  const startPolling = (watchId: string | null, snapshot: Record<string, string | null>) => {
    prevScrapedRef.current = snapshot;
    const MAX_POLLS = 120; // 10 minutes at 5s intervals before giving up
    let pollCount = 0;
    pollRef.current = setInterval(async () => {
      pollCount++;
      const fresh = await refreshAccounts();
      const updated = watchId
        ? fresh.some((a: any) => a.id === watchId && a.last_scraped_at !== snapshot[a.id])
        : fresh.some((a: any) => a.last_scraped_at !== snapshot[a.id]);

      if (updated) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setTriggering(false);
        setScrapingId(null);
        setStatus('✓ Scrape complete — feed updating...');
        onAccountsChanged?.();   // ← immediately refresh the feed
        setTimeout(() => setStatus(''), 4000);
      } else if (pollCount >= MAX_POLLS) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setTriggering(false);
        setScrapingId(null);
        setStatus('Scrape may have failed — try again or check Apify.');
      }
    }, 5000);
  };

  const handleTrigger = async () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setTriggering(true);
    setStatus('Triggering crawler for all accounts...');
    try {
      const res = await triggerScrapeAction(MOCK_USER_ID);
      setStatus(`${res.message} — Waiting for data...`);
      const snapshot: Record<string, string | null> = {};
      accounts.forEach(a => { snapshot[a.id] = a.last_scraped_at; });
      startPolling(null, snapshot);
    } catch (e: any) {
      setStatus(e.message || 'Trigger failed');
      setTriggering(false);
    }
  };

  const handleTriggerOne = async (acc: any) => {
    if (pollRef.current) clearInterval(pollRef.current);
    setScrapingId(acc.id);
    setStatus(`Triggering scrape for @${acc.handle}...`);
    try {
      const res = await triggerScrapeAction(MOCK_USER_ID, acc.handle);
      setStatus(`${res.message} — Waiting for data...`);
      const snapshot: Record<string, string | null> = {};
      accounts.forEach(a => { snapshot[a.id] = a.last_scraped_at; });
      startPolling(acc.id, snapshot);
    } catch (e: any) {
      setStatus(e.message || 'Trigger failed');
      setScrapingId(null);
    }
  };

  const isBusy = triggering || scrapingId !== null;

  const toggleSelected = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  };

  const allSelected = accounts.length > 0 && accounts.every(a => selectedIds.has(a.id));
  const toggleAll = () => {
    onSelectionChange(allSelected ? new Set() : new Set(accounts.map(a => a.id)));
  };

  // Client-side filtered + sorted accounts — derived from existing state, zero extra DB calls
  const visibleAccounts = useMemo(() => {
    let result = [...accounts];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(a => a.handle.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      if (sortBy === 'followers') return (b.current_follower_count || 0) - (a.current_follower_count || 0);
      if (sortBy === 'az') return a.handle.localeCompare(b.handle);
      // 'recent': fetched first, then never-fetched
      if (a.last_scraped_at && !b.last_scraped_at) return -1;
      if (!a.last_scraped_at && b.last_scraped_at) return 1;
      return new Date(b.last_scraped_at || 0).getTime() - new Date(a.last_scraped_at || 0).getTime();
    });
    return result;
  }, [accounts, search, sortBy]);

  return (
    <div className="flex flex-col space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-bold text-white tracking-tight">Intelligence Targets</h2>
        <p className="text-sm text-slate-400">Track competitors and top performers in your niche.</p>
      </header>

      {/* Input Form */}
      <section className="bg-slate-900 border border-white/10 rounded-xl p-5 backdrop-blur-sm shadow-xl">
        <form onSubmit={handleAdd} className="flex gap-3 text-sm">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">@</span>
            <input
              type="text"
              value={handleInput}
              onChange={e => setHandleInput(e.target.value)}
              placeholder="instagram_handle"
              className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 pl-8 pr-3 focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="bg-white hover:bg-slate-200 text-black font-semibold px-5 rounded-lg transition-colors shadow-sm"
          >
            Add
          </button>
        </form>
        {status && <p className="text-xs mt-3 text-emerald-400 font-medium">{status}</p>}
      </section>

      {/* List */}
      <section className="space-y-4">
        <div className="flex justify-between items-center bg-slate-900/50 px-4 py-3 rounded-t-xl border-b border-white/10">
          <div className="flex items-center gap-2">
            {/* Select-all toggle */}
            <button
              onClick={toggleAll}
              title={allSelected ? 'Deselect all' : 'Select all'}
              className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                allSelected ? 'bg-emerald-500 border-emerald-500' : 'border-white/20 hover:border-white/40'
              }`}
            >
              {allSelected && (
                <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <h3 className="font-semibold text-sm text-slate-300">Tracked Accounts ({accounts.length})</h3>
          </div>
          <button
            id="scrape-all-btn"
            onClick={handleTrigger}
            disabled={isBusy || accounts.length === 0}
            className="text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-3 py-1.5 rounded shadow-[0_0_15px_rgba(79,70,229,0.2)] transition-all"
          >
            {triggering ? 'Running all...' : 'Scrape All ↗'}
          </button>
        </div>

        {/* Search + Sort controls — client-side only */}
        {accounts.length > 1 && (
          <div className="flex gap-2 pt-1">
            <div className="relative flex-1">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search handles..."
                className="w-full bg-black/40 border border-white/8 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'recent' | 'followers' | 'az')}
              className="bg-black/40 border border-white/8 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 transition-colors appearance-none cursor-pointer pr-6"
              style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.3rem center', backgroundSize: '0.9em' }}
            >
              <option value="recent">Last Fetched</option>
              <option value="followers">Most Followers</option>
              <option value="az">A → Z</option>
            </select>
          </div>
        )}

        <ul className="space-y-2 pb-8">
          {visibleAccounts.map(acc => {
            const isThisOne = scrapingId === acc.id;
            const isSelected = selectedIds.has(acc.id);
            return (
              <li
                key={acc.id}
                onClick={() => toggleSelected(acc.id)}
                className={`flex flex-col xl:flex-row xl:items-center justify-between gap-3 rounded-lg p-3.5 cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-emerald-950/30 border-emerald-500/30 hover:border-emerald-500/50'
                    : 'bg-slate-900/40 border-white/5 hover:border-white/10 opacity-50 hover:opacity-70'
                }`}
              >
                <div className="flex gap-3 items-center min-w-0">
                  {/* Selection indicator */}
                  <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-white/20'
                  }`}>
                    {isSelected && (
                      <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="w-9 h-9 rounded-full bg-slate-800 flex-shrink-0 overflow-hidden flex items-center justify-center text-slate-400 font-bold border border-white/5">
                    {acc.profile_pic_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/image-proxy?url=${encodeURIComponent(acc.profile_pic_url)}`}
                        alt={`@${acc.handle}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      acc.handle.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-200 text-sm truncate">@{acc.handle}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {acc.current_follower_count > 0 ? `${formatNumber(acc.current_follower_count)} fol · ` : ''}
                      <span className={acc.last_scraped_at ? 'text-emerald-600' : 'text-slate-600'}>
                        {acc.last_scraped_at ? `Fetched ${formatLastFetched(acc.last_scraped_at)}` : 'Never fetched'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end xl:self-auto ml-12 xl:ml-0">
                  <button
                    onClick={() => handleTriggerOne(acc)}
                    disabled={isBusy}
                    title={`Scrape @${acc.handle}`}
                    className={`
                      text-[11px] font-semibold px-2.5 py-1 rounded border transition-all whitespace-nowrap
                      ${isThisOne
                        ? 'border-indigo-500 text-indigo-400 bg-indigo-950 animate-pulse cursor-wait'
                        : 'border-white/10 text-slate-400 hover:border-indigo-500 hover:text-indigo-300 hover:bg-indigo-950/40 disabled:opacity-30 disabled:cursor-not-allowed'
                      }
                    `}
                  >
                    {isThisOne ? 'Scraping…' : '↗ Scrape'}
                  </button>

                  <button
                    onClick={() => handleRemove(acc.id)}
                    disabled={isBusy}
                    className="text-slate-500 hover:text-red-400 p-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </li>
            );
          })}
          {visibleAccounts.length === 0 && !loading && accounts.length > 0 && (
            <li className="text-center py-6 text-sm text-slate-500 border border-dashed border-white/10 rounded-lg">
              No accounts match &ldquo;{search}&rdquo;
            </li>
          )}
          {accounts.length === 0 && !loading && (
            <li className="text-center py-6 text-sm text-slate-500 border border-dashed border-white/10 rounded-lg">
              No accounts tracked. Add a handle to start.
            </li>
          )}
          {loading && (
            <li className="text-center py-6 text-sm text-slate-500 animate-pulse border border-dashed border-white/10 rounded-lg">
              Loading accounts...
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
