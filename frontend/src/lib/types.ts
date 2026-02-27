// ============================================================
// CashMosaic — Shared TypeScript Types
// ============================================================

export type UserRole = 'user' | 'admin';

export type AccountType = 'bank' | 'credit_card';

export type AmountColumnType = 'single' | 'split';

export type UploadStatus = 'success' | 'error' | 'partial';

export type UploadStep = 'drop' | 'mapping' | 'preview' | 'importing' | 'done';

// ──────────────────────────────────────────────
// Database row types (match Supabase tables)
// ──────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  institution: string;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  is_expense: boolean;
  sort_order: number;
}

export interface CategoryRule {
  id: string;
  user_id: string | null; // null = global rule
  category_id: string;
  keyword: string;
  priority: number;
  source: string | null;
  created_at: string;
  // Joined
  category?: Category;
}

export interface ExclusionRule {
  id: string;
  user_id: string;
  account_id: string | null;
  keyword: string;
  reason: string;
  min_amount: number | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  date: string; // ISO YYYY-MM-DD
  description: string;
  amount: number; // negative=expense, positive=income
  category_id: string | null;
  original_category: string | null;
  is_excluded: boolean;
  exclude_reason: string | null;
  source_file: string | null;
  row_hash: string;
  created_at: string;
  // Joined
  account?: Account;
  category?: Category;
}

export interface UploadLog {
  id: string;
  user_id: string;
  account_id: string | null;
  filename: string;
  column_mapping: ColumnMapping | null;
  rows_total: number;
  rows_excluded: number;
  rows_duplicate: number;
  rows_imported: number;
  rows_uncategorized: number;
  status: UploadStatus;
  error_message: string | null;
  created_at: string;
  // Joined
  account?: Account;
  user?: UserProfile;
}

// ──────────────────────────────────────────────
// CSV Processing types
// ──────────────────────────────────────────────

export interface ColumnMapping {
  dateColumn: string;
  descriptionColumn: string;
  amountType: AmountColumnType;
  amountColumn?: string;       // for 'single'
  debitColumn?: string;        // for 'split'
  creditColumn?: string;       // for 'split'
  categoryColumn?: string;     // optional
  accountName: string;
  accountType: AccountType;
  institution: string;
}

export interface DetectionConfidence {
  column: string;
  confidence: 'high' | 'medium' | 'low' | 'none';
  reason: string;
}

export interface AutoDetectResult {
  dateColumn: DetectionConfidence;
  descriptionColumn: DetectionConfidence;
  amountType: AmountColumnType;
  amountColumn?: DetectionConfidence;
  debitColumn?: DetectionConfidence;
  creditColumn?: DetectionConfidence;
  categoryColumn?: DetectionConfidence;
}

export interface ParsedTransaction {
  date: string;          // ISO YYYY-MM-DD
  description: string;
  amount: number;        // negative=expense, positive=income
  originalCategory?: string;
}

export interface ProcessedTransaction extends ParsedTransaction {
  accountId: string;
  categoryId: string | null;
  isExcluded: boolean;
  excludeReason: string | null;
  rowHash: string;
  sourceFile: string;
}

export interface UploadPreview {
  total: number;
  excluded: number;
  duplicate: number;
  toImport: number;
  uncategorized: number;
  sampleRows: ProcessedTransaction[];
  exclusionBreakdown: Record<string, number>;
}

// ──────────────────────────────────────────────
// Dashboard / aggregated types
// ──────────────────────────────────────────────

export interface DashboardStats {
  total_income: number;
  total_expenses: number;
  net: number;
  tx_count: number;
}

export interface MonthlySummary {
  user_id: string;
  month: string; // ISO date — first of month
  income: number;
  expenses: number;
  net: number;
}

export interface CategoryTotal {
  user_id: string;
  category_id: string;
  category: string;
  icon: string;
  color: string;
  transaction_count: number;
  total: number;
  avg_amount: number;
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  accountIds?: string[];
  categoryIds?: string[];
  search?: string;
  showExcluded?: boolean;
}

// ──────────────────────────────────────────────
// UI state
// ──────────────────────────────────────────────

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
