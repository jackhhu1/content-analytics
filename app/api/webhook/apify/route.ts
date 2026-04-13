import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ApifyClient } from 'apify-client';
import { calculateVC, getAccountMedian, detectOutliers } from '@/lib/metrics';

const apify = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

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
    let apifyPosts = payload.resource?.defaultDatasetId || payload.data || payload;

    // If Apify sent a dataset ID, fetch the actual dataset items
    if (typeof apifyPosts === 'string') {
      const dataset = await apify.dataset(apifyPosts).listItems();
      apifyPosts = dataset.items;
    }

    if (!Array.isArray(apifyPosts) || apifyPosts.length === 0) {
      return NextResponse.json({ message: 'No posts to process' }, { status: 200 });
    }

    // Process posts grouped by handle to optimize DB queries
    const postsByHandle: Record<string, any[]> = {};
    for (const rawPost of apifyPosts) {
      const handle = rawPost.ownerUsername || rawPost.handle || rawPost.owner?.username;
      if (!handle) continue;

      // Views: prefer playCount (reels reach) > viewCount > likes as last resort
      const views = rawPost.videoPlayCount || rawPost.videoViewCount || rawPost.likesCount || 0;
      const url = rawPost.url || (rawPost.shortCode ? `https://instagram.com/p/${rawPost.shortCode}` : '');
      const caption = rawPost.caption || rawPost.title || '';

      // Profile pic: not at top-level — mine it from comments where the owner replied
      let profilePicUrl: string | null = null;
      const allComments: any[] = [
        ...(rawPost.latestComments || []),
        ...(rawPost.latestComments || []).flatMap((c: any) => c.replies || [])
      ];
      for (const c of allComments) {
        if (c.ownerUsername === handle && c.ownerProfilePicUrl) {
          profilePicUrl = c.ownerProfilePicUrl;
          break;
        }
      }

      // Thumbnail: displayUrl is the cover image for posts/reels
      const thumbnailUrl: string | null =
        rawPost.displayUrl ||
        rawPost.thumbnailUrl ||
        rawPost.previewUrl ||
        rawPost.imageUrl ||
        null;

      const standardizedPost = {
        handle,
        views,
        url,
        caption,
        followers: rawPost.ownerFollowersCount || rawPost.followers || null,
        profilePicUrl,
        thumbnailUrl
      };

      if (!postsByHandle[handle]) postsByHandle[handle] = [];
      postsByHandle[handle].push(standardizedPost);
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
        // Require at least 5 existing posts before using relative outlier detection.
        // Without a baseline, every post from a new account would be marked is_outlier
        // (any vc > 0 beats median=0 * 2.0). Below the threshold, only the absolute
        // floor (vc >= 2.0) applies, so first-scrape results don't flood the feed.
        const hasBaseline = (recentPosts || []).length >= 5;

        // Prepare inserts
        const inserts = posts.map((post) => {
          // Use followers from payload if available, else fallback to account follower count
          const followersAtScrape = post.followers || account.current_follower_count;
          const vc = calculateVC(post.views, followersAtScrape);
          const isOutlier = vc >= 2.0 || (hasBaseline && vc > (currentMedian * 2.0));

          return {
            account_id: account.id,
            user_id: account.user_id,
            post_url: post.url,
            caption: post.caption || '',
            view_count: post.views || 0,
            follower_count_at_scrape: followersAtScrape,
            viral_coefficient: vc,
            is_outlier: isOutlier,
            scraped_at: new Date().toISOString(),
            thumbnail_url: post.thumbnailUrl || null
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

        // Update the account's last scraped timestamp, latest follower count, and profile pic
        const firstPost = posts[0];
        await supabase
          .from('niche_accounts')
          .update({
            last_scraped_at: new Date().toISOString(),
            ...(firstPost?.followers && { current_follower_count: firstPost.followers }),
            ...(firstPost?.profilePicUrl && { profile_pic_url: firstPost.profilePicUrl })
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
