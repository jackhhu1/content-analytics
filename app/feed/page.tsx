'use client';
import { createClient } from '@supabase/supabase-js';
import SignalCard from '@/components/SignalCard';
import { useEffect, useState, useMemo } from 'react';
import { getFeedPosts } from '@/lib/db-actions';

// Shared function from components
function formatNumber(num: number) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

type SortOption = 'signal' | 'views';

export default function FeedPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and Sorts
  const [alphaOnly, setAlphaOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('signal');

  // Hardcoded mock user for now, consistent with Setup page
  const MOCK_USER_ID = '5d1def1e-507a-426b-b859-49f1e3b8ca52';

  useEffect(() => {
    async function loadData() {
      try {
        const augmented = await getFeedPosts(MOCK_USER_ID);
        setPosts(augmented);
      } catch (err: any) {
        console.warn("Using mock data:", err);
        // Fallback Mock Data for UI Visualization
        setPosts([
          {
            id: '1',
            post_url: 'https://instagram.com/p/mock_ohnohanajo_viral1',
            caption: 'This AI pattern changed my whole workflow \uD83E\uDD2F wait for the end...',
            view_count: 85000,
            follower_count_at_scrape: 15400,
            viral_coefficient: 5.51,  // VC
            medianVc: 0.9,            // Multiplier = 6.1x (Predicted Alpha)
            multiplier: 6.1,
            niche_accounts: { handle: 'ohnohanajo' }
          },
          {
            id: '2',
            post_url: 'https://instagram.com/p/mock_annataha_viral1',
            caption: 'How I grew my newsletter in 30 days using one simple trick',
            view_count: 144000,
            follower_count_at_scrape: 32000,
            viral_coefficient: 4.5,
            medianVc: 1.1,            // Multiplier = 4.1x
            multiplier: 4.1,
            niche_accounts: { handle: 'annataha' }
          },
          {
            id: '3',
            post_url: 'https://instagram.com/p/mock_annataha_viral2',
            caption: 'Stop overthinking your hooks. Do THIS instead \uD83D\uDC47',
            view_count: 320000,
            follower_count_at_scrape: 32000,
            viral_coefficient: 10.0,
            medianVc: 1.1,            // Multiplier = 9.0x (Predicted Alpha)
            multiplier: 9.0,
            niche_accounts: { handle: 'annataha' }
          }
        ]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredAndSortedPosts = useMemo(() => {
    let result = [...posts];

    // Filter
    if (alphaOnly) {
      result = result.filter(p => p.multiplier >= 5.0);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'signal') {
        return b.multiplier - a.multiplier; // Highest signal first
      } else {
        return b.view_count - a.view_count; // Highest absolute views first
      }
    });

    return result;
  }, [posts, alphaOnly, sortBy]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-12 font-sans selection:bg-emerald-500/30">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex flex-col space-y-3">
            <h1 className="text-3xl font-bold text-white tracking-tight">Signal Feed</h1>
            <p className="text-slate-400">
              High-velocity content curated from your tracked niche.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-slate-900/50 p-3 rounded-xl border border-white/5">
            {/* Filter Toggle */}
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={alphaOnly}
                  onChange={(e) => setAlphaOnly(e.target.checked)}
                />
                <div className={`w-10 h-6 rounded-full transition-colors ${alphaOnly ? 'bg-amber-500' : 'bg-slate-700'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${alphaOnly ? 'translate-x-4' : 'translate-x-0'}`}></div>
              </div>
              <span className={`text-sm font-semibold uppercase tracking-wider ${alphaOnly ? 'text-amber-500' : 'text-slate-500 group-hover:text-slate-300'} transition-colors`}>
                Alpha Only (5x+)
              </span>
            </label>

            <div className="h-6 w-px bg-white/10 hidden sm:block"></div>

            {/* Sort Select */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-sm font-medium">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-black/50 border border-white/10 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 hover:bg-slate-800 transition-colors appearance-none cursor-pointer pr-8"
                style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em' }}
              >
                <option value="signal">Highest Signal</option>
                <option value="views">Absolute Views</option>
              </select>
            </div>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="py-32 text-center text-slate-500 animate-pulse">
            Analyzing signals...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredAndSortedPosts.length === 0 ? (
              <div className="col-span-full py-32 text-center flex flex-col items-center justify-center">
                <h3 className="text-slate-200 font-serif text-2xl italic tracking-wide">
                  "Ichi-go ichi-e"
                </h3>
                <p className="text-slate-500 mt-4 max-w-md font-light leading-relaxed">
                  {alphaOnly ? 'No Alpha signals found matching your criteria. Try disabling the 5x filter.' : 'Every moment is a unique encounter. We are currently searching for the signal in your niche.'}
                </p>
              </div>
            ) : (
              filteredAndSortedPosts.map((post) => (
                <SignalCard
                  key={post.id}
                  handle={post.niche_accounts?.handle || 'unknown'}
                  postUrl={post.post_url}
                  caption={post.caption}
                  viewCount={post.view_count}
                  followerCount={post.follower_count_at_scrape}
                  viralCoefficient={post.viral_coefficient}
                  medianVc={post.medianVc}
                />
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}
