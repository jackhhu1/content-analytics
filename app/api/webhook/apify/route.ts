import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateVC, getAccountMedian, detectOutliers } from '@/lib/metrics';

// Initialize Supabase admin client to bypass RLS in the webhook
// Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in env
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    // 1. Authenticate via Webhook Secret
    const authHeader = req.headers.get('Authorization');
    const secret = process.env.APIFY_WEBHOOK_SECRET;

    if (!secret || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    // Assuming the specific actor payload pushes the result array or we map it
    const apifyPosts = payload.data || payload;

    if (!Array.isArray(apifyPosts) || apifyPosts.length === 0) {
      return NextResponse.json({ message: 'No posts to process' }, { status: 200 });
    }

    // Process posts grouped by handle to optimize DB queries
    // Expected post payload: { handle, url, caption, views, followers }
    const postsByHandle: Record<string, any[]> = {};
    for (const post of apifyPosts) {
      if (!post.handle) continue;
      if (!postsByHandle[post.handle]) postsByHandle[post.handle] = [];
      postsByHandle[post.handle].push(post);
    }

    for (const [handle, posts] of Object.entries(postsByHandle)) {
      // Find the tracked account(s) for this handle 
      // Note: If multiple users track the same handle (v1 RLS decision), 
      // we must insert posts for each user.
      const { data: accounts, error: accountErr } = await supabase
        .from('niche_accounts')
        .select('id, user_id, current_follower_count')
        .eq('handle', handle);

      if (accountErr || !accounts || accounts.length === 0) continue;

      for (const account of accounts) {
        // Fetch last 10 posts for account baseline
        const { data: recentPosts } = await supabase
          .from('posts')
          .select('viral_coefficient')
          .eq('account_id', account.id)
          .order('scraped_at', { ascending: false })
          .limit(10);

        const currentMedian = getAccountMedian((recentPosts || []) as { viral_coefficient: number }[]);

        // Prepare inserts
        const inserts = posts.map((post) => {
          // Use followers from payload if available, else fallback to account follower count
          const followersAtScrape = post.followers || account.current_follower_count;
          const vc = calculateVC(post.views, followersAtScrape);
          const isOutlier = vc >= 2.0 || vc > (currentMedian * 2.0);

          return {
            account_id: account.id,
            user_id: account.user_id,
            post_url: post.url,
            caption: post.caption || '',
            view_count: post.views || 0,
            follower_count_at_scrape: followersAtScrape,
            viral_coefficient: vc,
            is_outlier: isOutlier,
            scraped_at: new Date().toISOString()
          };
        });

        // Upsert posts (Ensure idempotency with ON CONFLICT DO UPDATE)
        const { error: upsertErr } = await supabase
          .from('posts')
          .upsert(inserts, {
            onConflict: 'account_id, post_url',
            ignoreDuplicates: false // We DO NOT ignore duplicates; we want to update metrics
          });

        if (upsertErr) {
          console.error('Failed to upsert posts for handle', handle, upsertErr);
        }

        // Update the account's last scraped timestamp and latest follower count
        await supabase
          .from('niche_accounts')
          .update({
            last_scraped_at: new Date().toISOString(),
            current_follower_count: posts[0]?.followers || account.current_follower_count
          })
          .eq('id', account.id);
      }
    }

    return NextResponse.json({ success: true, message: 'Posts processed and upserted successfully.' });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
