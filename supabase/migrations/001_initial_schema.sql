-- ============================================================
-- CashMosaic — Migration 001: Initial Schema
-- Run in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USER PROFILES
-- Auto-created when a user signs up via Supabase Auth.
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  full_name    TEXT,
  role         TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Keep updated_at current
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- CATEGORIES — GLOBAL (no user_id, shared by all users)
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  icon       TEXT NOT NULL DEFAULT '❓',
  color      TEXT NOT NULL DEFAULT '#94A3B8',
  is_expense BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0
);

-- ============================================================
-- ACCOUNTS — per user
-- ============================================================
CREATE TABLE IF NOT EXISTS accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('bank', 'credit_card')),
  institution TEXT NOT NULL DEFAULT '',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);

-- ============================================================
-- CATEGORY RULES — two-tier (user_id NULL = global)
-- ============================================================
CREATE TABLE IF NOT EXISTS category_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = global
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  keyword     TEXT NOT NULL,
  priority    INT NOT NULL DEFAULT 0,
  source      TEXT, -- reserved for future use
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_category_rules_user ON category_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_category_rules_category ON category_rules(category_id);

-- ============================================================
-- EXCLUSION RULES — per user
-- ============================================================
CREATE TABLE IF NOT EXISTS exclusion_rules (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE, -- NULL = all accounts
  keyword    TEXT NOT NULL,
  reason     TEXT NOT NULL,
  min_amount NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exclusion_rules_user ON exclusion_rules(user_id);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id        UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date              DATE NOT NULL,
  description       TEXT NOT NULL,
  amount            NUMERIC(12,2) NOT NULL,
  category_id       UUID REFERENCES categories(id) ON DELETE SET NULL,
  original_category TEXT,
  is_excluded       BOOLEAN NOT NULL DEFAULT false,
  exclude_reason    TEXT,
  source_file       TEXT,
  column_mapping    JSONB,
  row_hash          TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, row_hash)
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_excluded ON transactions(is_excluded);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(row_hash);

-- ============================================================
-- UPLOAD LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS upload_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id        UUID REFERENCES accounts(id) ON DELETE SET NULL,
  filename          TEXT NOT NULL,
  column_mapping    JSONB,
  rows_total        INT NOT NULL DEFAULT 0,
  rows_excluded     INT NOT NULL DEFAULT 0,
  rows_duplicate    INT NOT NULL DEFAULT 0,
  rows_imported     INT NOT NULL DEFAULT 0,
  rows_uncategorized INT NOT NULL DEFAULT 0,
  status            TEXT NOT NULL CHECK (status IN ('success', 'error', 'partial')),
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_upload_logs_user ON upload_logs(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE user_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_rules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE exclusion_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_logs     ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM public.user_profiles WHERE id = auth.uid()),
    false
  )
$$;

-- user_profiles: own row + admin sees all
DROP POLICY IF EXISTS "user_profiles_policy" ON user_profiles;
CREATE POLICY "user_profiles_policy" ON user_profiles
  FOR ALL USING (id = auth.uid() OR is_admin());

-- categories: everyone can read (global); only admin can write
DROP POLICY IF EXISTS "categories_read" ON categories;
CREATE POLICY "categories_read" ON categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "categories_write" ON categories;
CREATE POLICY "categories_write" ON categories
  FOR ALL USING (is_admin());

-- accounts: own data + admin
DROP POLICY IF EXISTS "accounts_policy" ON accounts;
CREATE POLICY "accounts_policy" ON accounts
  FOR ALL USING (user_id = auth.uid() OR is_admin());

-- category_rules: read global + own; write own only (admin writes global)
DROP POLICY IF EXISTS "category_rules_read" ON category_rules;
CREATE POLICY "category_rules_read" ON category_rules
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "category_rules_insert" ON category_rules;
CREATE POLICY "category_rules_insert" ON category_rules
  FOR INSERT WITH CHECK (user_id = auth.uid() OR (user_id IS NULL AND is_admin()));

DROP POLICY IF EXISTS "category_rules_update" ON category_rules;
CREATE POLICY "category_rules_update" ON category_rules
  FOR UPDATE USING (user_id = auth.uid() OR (user_id IS NULL AND is_admin()));

DROP POLICY IF EXISTS "category_rules_delete" ON category_rules;
CREATE POLICY "category_rules_delete" ON category_rules
  FOR DELETE USING (user_id = auth.uid() OR (user_id IS NULL AND is_admin()));

-- exclusion_rules: own data
DROP POLICY IF EXISTS "exclusion_rules_policy" ON exclusion_rules;
CREATE POLICY "exclusion_rules_policy" ON exclusion_rules
  FOR ALL USING (user_id = auth.uid() OR is_admin());

-- transactions: own data + admin
DROP POLICY IF EXISTS "transactions_policy" ON transactions;
CREATE POLICY "transactions_policy" ON transactions
  FOR ALL USING (user_id = auth.uid() OR is_admin());

-- upload_logs: own data + admin
DROP POLICY IF EXISTS "upload_logs_policy" ON upload_logs;
CREATE POLICY "upload_logs_policy" ON upload_logs
  FOR ALL USING (user_id = auth.uid() OR is_admin());
