'use server';

import { createClient } from '@supabase/supabase-js';

// Using SERVICE ROLE KEY to bypass RLS in the MVP since auth isn't fully hooked up to cookies
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

export async function getAccounts(userId: string) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('niche_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_tracked', true)       // Only show actively tracked accounts
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching accounts:', error);
    return [];
  }
  return data || [];
}

export async function addAccount(userId: string, handle: string) {
  if (!supabase) throw new Error("Supabase not configured");
  
  // Upsert on (user_id, handle) — if they previously removed this account, re-track it.
  // This requires the unique constraint: niche_accounts_user_handle_unique
  const { data, error } = await supabase
    .from('niche_accounts')
    .upsert({
      user_id: userId,
      handle: handle,
      is_tracked: true,
    }, { onConflict: 'user_id, handle', ignoreDuplicates: false })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Soft-delete: marks the account as untracked for this user.
 * - The niche_accounts row is KEPT so last_scraped_at, profile_pic_url, and
 *   follower data are preserved and can be shared with other users tracking the same handle.
 * - Posts linked to this account are also KEPT (no cascade delete).
 */
export async function removeAccount(accountId: string) {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase
    .from('niche_accounts')
    .update({ is_tracked: false })
    .eq('id', accountId);
  if (error) throw error;
}

export async function getFeedPosts(userId: string) {
  if (!supabase) throw new Error("Supabase not configured");

  // Only fetch posts for accounts the user is actively tracking
  const { data: rawPosts, error: rpcError } = await supabase
    .from('posts')
    .select(`
      id, post_url, caption, view_count, follower_count_at_scrape, viral_coefficient, is_outlier, scraped_at, account_id, thumbnail_url,
      niche_accounts!inner ( handle, is_tracked )
    `)
    .eq('user_id', userId)
    .eq('is_outlier', true)
    .eq('niche_accounts.is_tracked', true)  // Only show posts from currently tracked accounts
    .order('scraped_at', { ascending: false })
    .limit(50);

  if (rpcError) throw rpcError;

  // Augment with medianVc per account
  const augmented = await Promise.all((rawPosts || []).map(async (post: any) => {
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

    const multiplier = medianVc > 0 ? (post.viral_coefficient / medianVc) : post.viral_coefficient;

    return { ...post, medianVc, multiplier };
  }));

  return augmented;
}
