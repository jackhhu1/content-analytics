-- Migration: Initialize Viral Intelligence Feed MVP
-- Tables: niche_accounts, posts, playbook

-- 1. niche_accounts
CREATE TABLE niche_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    handle TEXT NOT NULL,
    current_follower_count INTEGER DEFAULT 0,
    last_scraped_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: user_id = auth.uid()
ALTER TABLE niche_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own niche accounts" 
    ON niche_accounts 
    FOR ALL 
    USING (auth.uid() = user_id);

-- 2. posts
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES niche_accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_url TEXT NOT NULL,
    caption TEXT,
    view_count INTEGER DEFAULT 0,
    follower_count_at_scrape INTEGER DEFAULT 0,
    viral_coefficient NUMERIC DEFAULT 0.0,
    is_outlier BOOLEAN DEFAULT false,
    scraped_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(account_id, post_url)
);

-- RLS: user_id = auth.uid()
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own tracked posts" 
    ON posts 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "System can insert/update posts" 
    ON posts 
    FOR ALL 
    USING (auth.uid() = user_id);

-- 3. playbook
CREATE TABLE playbook (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    hook_draft TEXT,
    format_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: user_id = auth.uid()
ALTER TABLE playbook ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their playbook" 
    ON playbook 
    FOR ALL 
    USING (auth.uid() = user_id);
