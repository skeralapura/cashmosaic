-- ============================================================
-- CashMosaic — Migration 002: Dashboard Views
-- ============================================================

-- Monthly income vs expenses summary
CREATE OR REPLACE VIEW monthly_summary AS
SELECT
  t.user_id,
  date_trunc('month', t.date)::DATE                                                 AS month,
  SUM(CASE WHEN t.amount > 0 AND NOT t.is_excluded THEN t.amount    ELSE 0 END)    AS income,
  SUM(CASE WHEN t.amount < 0 AND NOT t.is_excluded THEN ABS(t.amount) ELSE 0 END)  AS expenses,
  SUM(CASE WHEN NOT t.is_excluded THEN t.amount ELSE 0 END)                         AS net
FROM transactions t
GROUP BY t.user_id, date_trunc('month', t.date)
ORDER BY month;

-- Category totals (expenses only, non-excluded)
CREATE OR REPLACE VIEW category_totals AS
SELECT
  t.user_id,
  c.id                    AS category_id,
  c.name                  AS category,
  c.icon,
  c.color,
  COUNT(*)                AS transaction_count,
  SUM(ABS(t.amount))      AS total,
  AVG(ABS(t.amount))      AS avg_amount
FROM transactions t
JOIN categories c ON t.category_id = c.id
WHERE t.amount < 0
  AND NOT t.is_excluded
GROUP BY t.user_id, c.id, c.name, c.icon, c.color
ORDER BY total DESC;
