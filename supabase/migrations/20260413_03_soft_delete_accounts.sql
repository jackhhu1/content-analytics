-- Migration: Soft-delete support for niche_accounts
-- "Removing" an account now hides it from the user's panel
-- but preserves all posts and metadata for shared-scrape cost savings.

-- 1. Add the soft-delete flag
ALTER TABLE niche_accounts ADD COLUMN IF NOT EXISTS is_tracked BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Add a unique constraint on (user_id, handle) so we can upsert correctly
--    and never duplicate a tracked account per user.
--    (Drop first in case of re-run)
ALTER TABLE niche_accounts DROP CONSTRAINT IF EXISTS niche_accounts_user_handle_unique;
ALTER TABLE niche_accounts ADD CONSTRAINT niche_accounts_user_handle_unique UNIQUE (user_id, handle);
