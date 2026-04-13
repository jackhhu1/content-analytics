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
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching accounts:', error);
    return [];
  }
  return data || [];
}

export async function addAccount(userId: string, handle: string) {
  if (!supabase) throw new Error("Supabase not configured");
  
  const { data, error } = await supabase
    .from('niche_accounts')
    .upsert({
      user_id: userId,
      handle: handle
    }, { onConflict: 'id', ignoreDuplicates: false }) // Wait, niche_accounts doesn't have unique constraint on handle in the basic migration
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeAccount(accountId: string) {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase
    .from('niche_accounts')
    .delete()
    .eq('id', accountId);
  if (error) throw error;
}

export async function getFeedPosts(userId: string) {
  if (!supabase) throw new Error("Supabase not configured");

  // Fetch outliers for the user
  const { data: rawPosts, error: rpcError } = await supabase
    .from('posts')
    .select(`
      id, post_url, caption, view_count, follower_count_at_scrape, viral_coefficient, is_outlier, scraped_at, account_id, thumbnail_url, niche_accounts ( handle )
    `)
    .eq('user_id', userId)
    .eq('is_outlier', true)
    .order('scraped_at', { ascending: false })
    .limit(50);

  if (rpcError) throw rpcError;

  // Augment with medianVc
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
