-- Migration: Add thumbnail_url to posts table
-- Run this in the Supabase SQL editor

ALTER TABLE posts ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
