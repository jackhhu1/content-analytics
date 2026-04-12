-- Migration: Add profile_pic_url to niche_accounts
ALTER TABLE niche_accounts ADD COLUMN IF NOT EXISTS profile_pic_url TEXT;
