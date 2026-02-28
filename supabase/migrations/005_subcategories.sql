-- ============================================================
-- CashMosaic — Migration 005: User Sub-Categories
-- Run in Supabase SQL Editor after 004_rule_uniqueness.sql
-- ============================================================

-- Add parent_id (reference to a global parent category)
-- and user_id (NULL = global/system category, non-NULL = user-created)
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id   UUID REFERENCES auth.users(id)  ON DELETE CASCADE;

-- Drop the old global UNIQUE constraint on name
-- (global names stay unique globally; user sub-category names only need to be
--  unique per user+parent combination)
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;

-- Unique name among global categories
CREATE UNIQUE INDEX IF NOT EXISTS categories_name_global_uniq
  ON categories (name)
  WHERE user_id IS NULL;

-- Unique name per user per parent (prevents duplicate "Salary" under same parent)
CREATE UNIQUE INDEX IF NOT EXISTS categories_name_user_parent_uniq
  ON categories (user_id, parent_id, name)
  WHERE user_id IS NOT NULL;

-- Index for fast child lookups
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_user   ON categories(user_id);

-- ── Update RLS policies ────────────────────────────────────────────────────

-- Drop old policies
DROP POLICY IF EXISTS "categories_read"  ON categories;
DROP POLICY IF EXISTS "categories_write" ON categories;

-- Read: global categories (user_id IS NULL) visible to everyone;
--       user sub-categories visible to their owner only.
CREATE POLICY "categories_read" ON categories
  FOR SELECT
  USING (user_id IS NULL OR user_id = auth.uid() OR is_admin());

-- Insert: only for own sub-categories (admin can insert global via is_admin path below)
CREATE POLICY "categories_insert" ON categories
  FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_admin());

-- Update: own sub-categories or admin
CREATE POLICY "categories_update" ON categories
  FOR UPDATE
  USING (user_id = auth.uid() OR is_admin());

-- Delete: own sub-categories or admin
CREATE POLICY "categories_delete" ON categories
  FOR DELETE
  USING (user_id = auth.uid() OR is_admin());
