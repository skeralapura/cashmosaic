// ============================================================
// CashMosaic — Global Constants
// ============================================================

// The 19 fixed categories — mirrors the seed.sql global categories
export const CATEGORY_NAMES = [
  'Housing',
  'Groceries',
  'Dining',
  'Travel',
  'Subscriptions',
  'Insurance',
  'Utilities',
  'Gas & Fuel',
  'Shopping',
  'Health & Fitness',
  'Automotive',
  'Entertainment',
  'Education',
  'Taxes',
  'Legal/Professional',
  'Zelle/Transfers',
  'Fees',
  'Income',
  'Uncategorized',
] as const;

export type CategoryName = (typeof CATEGORY_NAMES)[number];

// Color assignments per category
export const CATEGORY_COLORS: Record<string, string> = {
  Housing: '#EF4444',          // red-500
  Groceries: '#F97316',        // orange-500
  Dining: '#F59E0B',           // amber-500
  Travel: '#10B981',           // emerald-500
  Subscriptions: '#6366F1',    // indigo-500
  Insurance: '#8B5CF6',        // violet-500
  Utilities: '#06B6D4',        // cyan-500
  'Gas & Fuel': '#84CC16',     // lime-500
  Shopping: '#EC4899',         // pink-500
  'Health & Fitness': '#14B8A6', // teal-500
  Automotive: '#F43F5E',       // rose-500
  Entertainment: '#A855F7',    // purple-500
  Education: '#3B82F6',        // blue-500
  Taxes: '#D97706',            // amber-600
  'Legal/Professional': '#64748B', // slate-500
  'Zelle/Transfers': '#0EA5E9', // sky-500
  Fees: '#78716C',             // stone-500
  Income: '#22C55E',           // green-500
  Uncategorized: '#94A3B8',    // slate-400
};

// Emoji icons per category
export const CATEGORY_ICONS: Record<string, string> = {
  Housing: '🏠',
  Groceries: '🛒',
  Dining: '🍽️',
  Travel: '✈️',
  Subscriptions: '📺',
  Insurance: '🛡️',
  Utilities: '💡',
  'Gas & Fuel': '⛽',
  Shopping: '🛍️',
  'Health & Fitness': '💪',
  Automotive: '🚗',
  Entertainment: '🎬',
  Education: '📚',
  Taxes: '🧾',
  'Legal/Professional': '⚖️',
  'Zelle/Transfers': '💸',
  Fees: '🏦',
  Income: '💰',
  Uncategorized: '❓',
};

// Maps bank-provided category strings to our category names
// Used as fallback when no keyword rule matches
export const BANK_CATEGORY_MAP: Record<string, string> = {
  // Chase CC categories
  'Food & Drink': 'Dining',
  'Restaurants': 'Dining',
  'Coffee Shops': 'Dining',
  'Fast Food': 'Dining',
  'Groceries': 'Groceries',
  'Shopping': 'Shopping',
  'Travel': 'Travel',
  'Entertainment': 'Entertainment',
  'Health & Wellness': 'Health & Fitness',
  'Gas': 'Gas & Fuel',
  'Automotive': 'Automotive',
  'Bills & Utilities': 'Utilities',
  'Personal': 'Uncategorized',
  'Education': 'Education',
  'Fees & Adjustments': 'Fees',
  'Home': 'Housing',
  'Insurance': 'Insurance',
  'Subscriptions': 'Subscriptions',
  'Transfer': 'Zelle/Transfers',
  'Payments': 'Uncategorized',
  // Generic
  'Income': 'Income',
  'Other': 'Uncategorized',
};

// Minimum transaction amount (global exclusion rule)
export const MIN_TRANSACTION_AMOUNT = 0.50;

// Batch size for upsert operations
export const UPLOAD_BATCH_SIZE = 50;

// Default priority for user-created rules
export const USER_RULE_PRIORITY = 5;

// Global rule priority
export const GLOBAL_RULE_PRIORITY = 0;
