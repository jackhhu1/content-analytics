'use client';
import React, { useState } from 'react';
// Assuming we wire API/DB calls
import { triggerScrapeAction } from '@/lib/apify-trigger';

export default function SetupPage() {
  const [handleInput, setHandleInput] = useState('');
  const [accounts, setAccounts] = useState([
    { id: '1', handle: 'ohnohanajo', followers: 15400 },
    { id: '2', handle: 'annataha', followers: 32000 }
  ]);
  const [status, setStatus] = useState('');
  const [triggering, setTriggering] = useState(false);

  // Hardcoded mock user for now
  const MOCK_USER_ID = '00000000-0000-0000-0000-000000000000';

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handleInput.trim()) return;

    // Validation: Strip @ and validate characters
    let raw = handleInput.trim().replace(/^@/, '');
    if (!/^[a-zA-Z0-9_.]+$/.test(raw)) {
      setStatus('Invalid Instagram handle. Only letters, numbers, dots, and underscores allowed.');
      return;
    }

    setAccounts([...accounts, { id: Date.now().toString(), handle: raw, followers: 0 }]);
    setHandleInput('');
    setStatus('');
  };

  const removeHandle = (id: string) => {
    setAccounts(accounts.filter(a => a.id !== id));
  };

  const handleTrigger = async () => {
    setTriggering(true);
    setStatus('Triggering crawler...');
    
    // Call server action (Wait: we're partially mock, so we intercept if no Supabase keys exist)
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
         setStatus('Trigger simulated (mock mode). Check server logs.');
         setTimeout(() => setStatus(''), 3000);
      } else {
         const res = await triggerScrapeAction(MOCK_USER_ID);
         setStatus(res.message);
      }
    } catch (e: any) {
      setStatus(e.message || 'Trigger failed');
    }
    
    setTriggering(false);
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
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold">
                    {acc.handle.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200">@{acc.handle}</p>
                    <p className="text-xs text-slate-500">{acc.followers > 0 ? `${acc.followers} followers` : 'Pending fetch...'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => removeHandle(acc.id)}
                  className="text-slate-500 hover:text-red-400 p-2 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
            {accounts.length === 0 && (
              <li className="text-center py-8 text-slate-500 border border-dashed border-white/10 rounded-lg">
                No accounts tracked. Add your first handle above.
              </li>
            )}
          </ul>
        </section>

      </div>
    </div>
  );
}
