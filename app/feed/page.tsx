import { createClient } from '@supabase/supabase-js';
import SignalCard from '@/components/SignalCard';

// Ensures dynamic rendering so you get fresh data
export const dynamic = 'force-dynamic';

export default async function FeedPage() {
  let augmentedPosts: any[] = [];

  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase credentials, falling back to mock data.");
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        id, post_url, caption, view_count, follower_count_at_scrape, viral_coefficient, is_outlier, scraped_at, account_id, niche_accounts ( handle )
      `)
      .eq('is_outlier', true)
      .order('scraped_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    augmentedPosts = await Promise.all((posts || []).map(async (post: any) => {
      const { data: recent } = await supabase
        .from('posts')
        .select('viral_coefficient')
        .eq('account_id', post.account_id)
        .order('scraped_at', { ascending: false })
        .limit(10);
        
      let medianVc = 0;
      if (recent && recent.length > 0) {
        const vcs = recent.map(r => r.viral_coefficient).sort((a,b) => a-b);
        const mid = Math.floor(vcs.length / 2);
        medianVc = vcs.length % 2 === 0 ? (vcs[mid-1] + vcs[mid]) / 2 : vcs[mid];
      }

      return { ...post, medianVc };
    }));

  } catch (err) {
    console.warn("Using mock data:", err);
    // Fallback Mock Data for UI Visualization
    augmentedPosts = [
      {
        id: '1',
        post_url: 'https://instagram.com/p/mock_ohnohanajo_viral1',
        caption: 'This AI pattern changed my whole workflow 🤯 wait for the end...',
        view_count: 85000,
        follower_count_at_scrape: 15400,
        viral_coefficient: 5.51,  // VC
        medianVc: 0.9,            // Multiplier = 6.1x (Predicted Alpha)
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
        niche_accounts: { handle: 'annataha' }
      },
      {
        id: '3',
        post_url: 'https://instagram.com/p/mock_annataha_viral2',
        caption: 'Stop overthinking your hooks. Do THIS instead 👇',
        view_count: 320000,
        follower_count_at_scrape: 32000,
        viral_coefficient: 10.0,
        medianVc: 1.1,            // Multiplier = 9.0x (Predicted Alpha)
        niche_accounts: { handle: 'annataha' }
      }
    ];
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-12 font-sans selection:bg-emerald-500/30">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col space-y-3">
          <h1 className="text-3xl font-bold text-white tracking-tight">Signal Feed</h1>
          <p className="text-slate-400">
            High-velocity content curated from your tracked niche.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {augmentedPosts.length === 0 ? (
            <div className="col-span-full border border-dashed border-white/10 rounded-xl p-12 text-center flex flex-col items-center justify-center">
               <svg className="w-12 h-12 text-slate-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="text-slate-300 font-medium text-lg">No signals detected yet</h3>
              <p className="text-slate-500 mt-2 max-w-sm">
                We are still calibrating baselines and waiting for an outlier to emerge. Check back soon.
              </p>
            </div>
          ) : (
            augmentedPosts.map((post) => (
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

      </div>
    </div>
  );
}
