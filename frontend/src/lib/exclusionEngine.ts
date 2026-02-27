// ============================================================
// CashMosaic — Exclusion Engine
// Evaluates per-user exclusion rules + global $0.50 threshold.
// ============================================================

import type { ExclusionRule, ParsedTransaction } from './types';
import { MIN_TRANSACTION_AMOUNT } from './constants';

export interface ExclusionResult {
  isExcluded: boolean;
  reason?: string;
}

export function evaluateExclusion(
  tx: ParsedTransaction,
  exclusionRules: ExclusionRule[],
  accountId?: string // when provided, also check account-specific rules
): ExclusionResult {
  // Global rule: skip tiny transactions
  if (Math.abs(tx.amount) < MIN_TRANSACTION_AMOUNT) {
    return { isExcluded: true, reason: `Amount below $${MIN_TRANSACTION_AMOUNT} threshold` };
  }

  const descUpper = tx.description.toUpperCase();

  for (const rule of exclusionRules) {
    // Skip rules for a different account
    if (rule.account_id && accountId && rule.account_id !== accountId) {
      continue;
    }

    const keyUpper = rule.keyword.toUpperCase();
    if (descUpper.includes(keyUpper)) {
      // Check optional min_amount condition
      if (rule.min_amount !== null && rule.min_amount !== undefined) {
        if (Math.abs(tx.amount) < rule.min_amount) {
          continue; // rule has a minimum — this transaction doesn't meet it
        }
      }
      return { isExcluded: true, reason: rule.reason };
    }
  }

  return { isExcluded: false };
}
