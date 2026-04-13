'use server';

import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';

// ---------------------------------------------------------------------------
// Helper: get the current user's ID from the session cookie.
// Throws if not authenticated — callers can catch and redirect.
// ---------------------------------------------------------------------------
async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Not authenticated');
  return user.id;
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

  const { data, error } = await supabase
    .from('niche_accounts')
    .upsert(
      { user_id: userId, handle, is_tracked: true },
      { onConflict: 'user_id, handle', ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) throw error;
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

  // Query 2: fetch outlier posts for ALL tracked accounts.
  // Generous limit so every account can contribute, then we cap per-account in JS.
  const PER_ACCOUNT_CAP = 15;
  const { data: rawPosts, error: rpcError } = await supabase
    .from('posts')
    .select(`
      id, post_url, caption, view_count, follower_count_at_scrape, viral_coefficient, is_outlier, scraped_at, account_id, thumbnail_url,
      niche_accounts ( handle )
    `)
    .in('account_id', accountIds)
    .eq('is_outlier', true)
    .order('viral_coefficient', { ascending: false })
    .limit(accountIds.length * PER_ACCOUNT_CAP * 2);

  if (rpcError) throw rpcError;
  if (!rawPosts || rawPosts.length === 0) return [];

  // Cap per account in JS — every tracked account gets up to PER_ACCOUNT_CAP slots
  const countPerAccount: Record<string, number> = {};
  const cappedPosts = rawPosts.filter((p: any) => {
    countPerAccount[p.account_id] = (countPerAccount[p.account_id] || 0) + 1;
    return countPerAccount[p.account_id] <= PER_ACCOUNT_CAP;
  });

  // Query 3: batch-fetch recent VCs for all accounts (for median calculation).
  // Order by account_id first, then scraped_at DESC so the JS cap-at-10 loop
  // correctly takes the 10 most recent posts *per account* rather than the 10
  // most recent posts globally (which could all come from one active account).
  const { data: recentPosts } = await supabase
    .from('posts')
    .select('account_id, viral_coefficient, scraped_at')
    .in('account_id', accountIds)
    .order('account_id', { ascending: true })
    .order('scraped_at', { ascending: false })
    .limit(accountIds.length * 10);

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

  // Augment with signal multiplier and return
  return cappedPosts.map((post: any) => {
    const medianVc = medians[post.account_id] ?? 0;
    const multiplier = medianVc > 0 ? post.viral_coefficient / medianVc : post.viral_coefficient;
    return { ...post, medianVc, multiplier };
  });
}

