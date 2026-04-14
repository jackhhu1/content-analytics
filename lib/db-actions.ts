'use server';

import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';

// ---------------------------------------------------------------------------
// Helper: get the current user's ID from the session cookie.
// Throws if not authenticated — callers can catch and redirect.
// ---------------------------------------------------------------------------
async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  // getSession() reads the JWT from the cookie without a network call.
  // Safe for server actions — the session is already validated by middleware.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  return session.user.id;
}

export async function getAccounts() {
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('niche_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_tracked', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching accounts:', error);
    return [];
  }
  return data || [];
}

export async function addAccount(handle: string) {
  const userId = await requireUserId();
  const supabase = await createClient();

  // Check if any other user has already scraped this handle.
  // If so, seed this new account row with their metadata so it doesn't
  // show "Never fetched" and their posts get copied across immediately.
  const { data: existing } = await adminClient
    .from('niche_accounts')
    .select('id, last_scraped_at, current_follower_count, profile_pic_url')
    .eq('handle', handle)
    .neq('user_id', userId)
    .not('last_scraped_at', 'is', null)
    .order('last_scraped_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from('niche_accounts')
    .upsert(
      {
        user_id: userId,
        handle,
        is_tracked: true,
        // Seed from existing scraped data if available
        ...(existing && {
          last_scraped_at: existing.last_scraped_at,
          current_follower_count: existing.current_follower_count,
          profile_pic_url: existing.profile_pic_url,
        }),
      },
      { onConflict: 'user_id, handle', ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) throw error;

  // Copy posts from the source account into this user's account.
  // Uses admin client to read across user boundaries, then inserts with
  // the new account_id and user_id so RLS lets this user see them.
  if (existing) {
    // Only copy outlier posts (what the feed shows) + enough recent posts for
    // the median VC calculation (needs 10). Copying every post is unbounded
    // and causes multi-second upserts when an account has hundreds of posts.
    const [{ data: outlierPosts }, { data: recentPosts }] = await Promise.all([
      adminClient
        .from('posts')
        .select('post_url, caption, view_count, follower_count_at_scrape, viral_coefficient, is_outlier, scraped_at, thumbnail_url')
        .eq('account_id', existing.id)
        .eq('is_outlier', true)
        .order('viral_coefficient', { ascending: false })
        .limit(50),
      adminClient
        .from('posts')
        .select('post_url, caption, view_count, follower_count_at_scrape, viral_coefficient, is_outlier, scraped_at, thumbnail_url')
        .eq('account_id', existing.id)
        .order('scraped_at', { ascending: false })
        .limit(10),
    ]);

    const seen = new Set<string>();
    const sourcePosts = [...(outlierPosts || []), ...(recentPosts || [])].filter(p => {
      if (seen.has(p.post_url)) return false;
      seen.add(p.post_url);
      return true;
    });

    if (sourcePosts.length > 0) {
      await adminClient
        .from('posts')
        .upsert(
          sourcePosts.map(p => ({
            ...p,
            account_id: data.id,
            user_id: userId,
          })),
          { onConflict: 'account_id, post_url', ignoreDuplicates: true }
        );
    }
  }

  return data;
}

export async function removeAccount(accountId: string) {
  const userId = await requireUserId();
  const supabase = await createClient();

  const { error } = await supabase
    .from('niche_accounts')
    .update({ is_tracked: false })
    .eq('id', accountId)
    .eq('user_id', userId); // ownership check — never soft-delete another user's account

  if (error) throw error;
}

export async function getFeedPosts() {
  const userId = await requireUserId();
  const supabase = await createClient();

  // Query 1: get all tracked account IDs for this user
  const { data: trackedAccounts } = await supabase
    .from('niche_accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('is_tracked', true);

  if (!trackedAccounts || trackedAccounts.length === 0) return [];
  const accountIds = trackedAccounts.map((a: any) => a.id);

  // Queries 2, 3, 4: independent once accountIds is known — run in parallel.
  const PER_ACCOUNT_CAP = 15;
  const [
    { data: rawPosts, error: rpcError },
    { data: recentPosts },
    { data: savedRows },
  ] = await Promise.all([
    // Query 2: fetch outlier posts for ALL tracked accounts.
    // Generous limit so every account can contribute, then we cap per-account in JS.
    supabase
      .from('posts')
      .select(`
      id, post_url, caption, view_count, follower_count_at_scrape, viral_coefficient, is_outlier, scraped_at, account_id, thumbnail_url,
      niche_accounts ( handle )
    `)
      .in('account_id', accountIds)
      .eq('is_outlier', true)
      .order('viral_coefficient', { ascending: false })
      .limit(accountIds.length * PER_ACCOUNT_CAP * 2),
    // Query 3: batch-fetch recent VCs for all accounts (for median calculation).
    // Order by account_id first, then scraped_at DESC so the JS cap-at-10 loop
    // correctly takes the 10 most recent posts *per account* rather than the 10
    // most recent posts globally (which could all come from one active account).
    supabase
      .from('posts')
      .select('account_id, viral_coefficient, scraped_at')
      .in('account_id', accountIds)
      .order('account_id', { ascending: true })
      .order('scraped_at', { ascending: false })
      .limit(accountIds.length * 10),
    // Query 4: fetch the user's saved playbook post IDs in one shot so the feed
    // can render a "saved" state without a per-card round trip.
    supabase
      .from('playbook')
      .select('post_id')
      .eq('user_id', userId),
  ]);

  if (rpcError) throw rpcError;
  if (!rawPosts || rawPosts.length === 0) return [];

  // Cap per account in JS — every tracked account gets up to PER_ACCOUNT_CAP slots
  const countPerAccount: Record<string, number> = {};
  const cappedPosts = rawPosts.filter((p: any) => {
    countPerAccount[p.account_id] = (countPerAccount[p.account_id] || 0) + 1;
    return countPerAccount[p.account_id] <= PER_ACCOUNT_CAP;
  });

  // Group into account → last 10 VCs
  const recentByAccount: Record<string, number[]> = {};
  for (const p of recentPosts || []) {
    if (!recentByAccount[p.account_id]) recentByAccount[p.account_id] = [];
    if (recentByAccount[p.account_id].length < 10) {
      recentByAccount[p.account_id].push(p.viral_coefficient);
    }
  }

  // Compute median per account in memory
  const medians: Record<string, number> = {};
  for (const [acctId, vcs] of Object.entries(recentByAccount)) {
    const sorted = [...vcs].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    medians[acctId] = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  const savedSet = new Set((savedRows || []).map((r: any) => r.post_id));

  // Augment with signal multiplier and return
  return cappedPosts.map((post: any) => {
    const medianVc = medians[post.account_id] ?? 0;
    const multiplier = medianVc > 0 ? post.viral_coefficient / medianVc : post.viral_coefficient;
    return { ...post, medianVc, multiplier, isSaved: savedSet.has(post.id) };
  });
}

export async function saveToPlaybook(postId: string) {
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('playbook')
    .select('id')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from('playbook')
    .insert({ user_id: userId, post_id: postId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeFromPlaybook(postId: string) {
  const userId = await requireUserId();
  const supabase = await createClient();

  const { error } = await supabase
    .from('playbook')
    .delete()
    .eq('user_id', userId)
    .eq('post_id', postId);

  if (error) throw error;
}

export async function getPlaybookPosts() {
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('playbook')
    .select(`
      id, hook_draft, format_notes, created_at,
      posts (
        id, post_url, caption, view_count, thumbnail_url,
        niche_accounts ( handle )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching playbook:', error);
    return [];
  }
  return data || [];
}

export async function updateHookDraft(playbookId: string, draft: string) {
  const userId = await requireUserId();
  const supabase = await createClient();

  const { error } = await supabase
    .from('playbook')
    .update({ hook_draft: draft })
    .eq('id', playbookId)
    .eq('user_id', userId);

  if (error) throw error;
}

