// ============================================================
// CashMosaic — Two-Tier Categorization Engine
// Checks user rules first (priority 5+), then global rules (priority 0).
// Falls back to bank-provided category string if no rule matches.
// ============================================================

import type { CategoryRule } from './types';
import { BANK_CATEGORY_MAP } from './constants';

// categoryRules must be pre-sorted by priority DESC (user rules first)
export function categorize(
  description: string,
  categoryRules: CategoryRule[],
  categoryNameToId: Record<string, string>, // category name -> id map
  originalCategory?: string
): string | null {
  // Normalize whitespace so "APA  TREAS  310" matches a rule keyword "APA TREAS 310"
  const upper = description.replace(/\s+/g, ' ').toUpperCase();

  for (const rule of categoryRules) {
    if (upper.includes(rule.keyword.replace(/\s+/g, ' ').toUpperCase())) {
      return rule.category_id;
    }
  }

  // Fallback: map bank's own category string to our category
  if (originalCategory) {
    const ourCategoryName = BANK_CATEGORY_MAP[originalCategory];
    if (ourCategoryName) {
      return categoryNameToId[ourCategoryName] ?? null;
    }
  }

  // Return null — NULL is the signal for "needs categorization"
  return null;
}

// Build a sorted rules list for the categorizer
// User rules (user_id !== null) default to priority 5, global to 0
// Merge and sort descending by priority
export function buildSortedRules(
  globalRules: CategoryRule[],
  userRules: CategoryRule[]
): CategoryRule[] {
  const all = [...userRules, ...globalRules];
  return all.sort((a, b) => b.priority - a.priority);
}
