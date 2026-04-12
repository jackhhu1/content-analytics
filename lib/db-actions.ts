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
