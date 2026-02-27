-- ============================================================
-- CashMosaic — Migration 003: Server-Side Functions
-- ============================================================

-- Dashboard KPI stats for current user
CREATE OR REPLACE FUNCTION get_dashboard_stats(
  p_start_date DATE DEFAULT NULL,
  p_end_date   DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_result  JSON;
BEGIN
  SELECT json_build_object(
    'total_income',   COALESCE(SUM(CASE WHEN amount > 0 AND NOT is_excluded THEN amount  ELSE 0 END), 0),
    'total_expenses', COALESCE(SUM(CASE WHEN amount < 0 AND NOT is_excluded THEN ABS(amount) ELSE 0 END), 0),
    'net',            COALESCE(SUM(CASE WHEN NOT is_excluded THEN amount ELSE 0 END), 0),
    'tx_count',       COUNT(*) FILTER (WHERE NOT is_excluded)
  )
  INTO v_result
  FROM transactions
  WHERE user_id = v_user_id
    AND (p_start_date IS NULL OR date >= p_start_date)
    AND (p_end_date   IS NULL OR date <= p_end_date);

  RETURN v_result;
END;
$$;
