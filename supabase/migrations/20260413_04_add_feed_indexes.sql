-- Migration: Add indexes to speed up the feed query and median lookup
-- Run this in the Supabase SQL editor

-- Index 1: Powers the main feed query
-- Covers: .eq('user_id').eq('is_outlier', true).order('viral_coefficient', desc).limit(50)
-- Turns a full table scan into a fast index-only scan as posts grows.
CREATE INDEX IF NOT EXISTS idx_posts_feed
  ON posts (user_id, is_outlier, viral_coefficient DESC)
  WHERE is_outlier = TRUE;

-- Index 2: Powers the median lookup batch query
-- Covers: .in('account_id', [...]).order('scraped_at', desc).limit(N)
CREATE INDEX IF NOT EXISTS idx_posts_account_scraped
  ON posts (account_id, scraped_at DESC);
