import { createClient } from '@supabase/supabase-js';
import type {
  UserProfile,
  Account,
  Category,
  CategoryRule,
  ExclusionRule,
  Transaction,
  UploadLog,
  MonthlySummary,
  CategoryTotal,
  DashboardStats,
} from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Create frontend/.env.local with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

// Define the database schema types for Supabase client
export type Database = {
  public: {
    Tables: {
      user_profiles: { Row: UserProfile; Insert: Omit<UserProfile, 'created_at' | 'updated_at'>; Update: Partial<UserProfile> };
      accounts: { Row: Account; Insert: Omit<Account, 'id' | 'created_at'>; Update: Partial<Account> };
      categories: { Row: Category; Insert: Omit<Category, 'id'>; Update: Partial<Category> };
      category_rules: { Row: CategoryRule; Insert: Omit<CategoryRule, 'id' | 'created_at' | 'category'>; Update: Partial<CategoryRule> };
      exclusion_rules: { Row: ExclusionRule; Insert: Omit<ExclusionRule, 'id' | 'created_at'>; Update: Partial<ExclusionRule> };
      transactions: { Row: Transaction; Insert: Omit<Transaction, 'id' | 'created_at' | 'account' | 'category'>; Update: Partial<Transaction> };
      upload_logs: { Row: UploadLog; Insert: Omit<UploadLog, 'id' | 'created_at' | 'account' | 'user'>; Update: Partial<UploadLog> };
    };
    Views: {
      monthly_summary: { Row: MonthlySummary };
      category_totals: { Row: CategoryTotal };
    };
    Functions: {
      get_dashboard_stats: {
        Args: { p_start_date?: string; p_end_date?: string };
        Returns: DashboardStats;
      };
      is_admin: { Args: Record<never, never>; Returns: boolean };
    };
  };
};

// Using untyped client — proper types require `supabase gen types typescript`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = (createClient as any)(supabaseUrl, supabaseAnonKey);
