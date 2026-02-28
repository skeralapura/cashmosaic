-- ============================================================
-- Migration 004: Enforce unique (user_id, keyword) for user rules
-- ============================================================

-- Step 1: Remove duplicate user rules, keeping the most recently created one
DELETE FROM category_rules
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, UPPER(keyword)
             ORDER BY created_at DESC
           ) AS rn
    FROM category_rules
    WHERE user_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Step 2: Standard unique constraint on (user_id, keyword) for user-owned rules.
-- NULL != NULL in Postgres, so this constraint alone won't prevent duplicate global rules.
-- A standard constraint (not partial index) is required for PostgREST ON CONFLICT upsert to work.
DROP INDEX IF EXISTS category_rules_user_keyword_unique;
ALTER TABLE category_rules
  ADD CONSTRAINT category_rules_user_keyword_unique
  UNIQUE (user_id, keyword);

-- Step 3: Partial unique index for global rules (user_id IS NULL) so seed.sql is idempotent.
-- ON CONFLICT DO NOTHING in seed.sql will use this index to skip duplicate keyword inserts.
CREATE UNIQUE INDEX IF NOT EXISTS category_rules_global_keyword_uniq
  ON category_rules (keyword)
  WHERE user_id IS NULL;
