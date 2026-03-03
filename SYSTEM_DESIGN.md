# CashMosaic — System Design

## 1. Overview

CashMosaic is a browser-based personal finance dashboard. Users upload CSV exports from their banks, the app categorizes transactions using a keyword rule engine, and the results are visualized through interactive charts including a daily expense heatmap.

The architecture is a **single-page application** backed by **Supabase** (managed Postgres + Auth). There is no custom server — all backend logic runs in Postgres (functions, views, RLS) or in the browser (CSV parsing, categorization, hashing). Supabase Edge Functions are used only for admin user provisioning.

```
┌──────────────────────────────────────────────────────────────┐
│                      Browser (SPA)                           │
│                                                              │
│  React + Vite + TypeScript                                   │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │  Pages /   │  │   Hooks      │  │  Client-Side Logic  │  │
│  │  Components│  │  (TanStack   │  │  ─ CSV parse        │  │
│  │            │  │   Query)     │  │  ─ categorizer.ts   │  │
│  └─────┬──────┘  └──────┬───────┘  │  ─ exclusionEngine  │  │
│        │                │          │  ─ duplicateDetect   │  │
│        └────────────────┘          └──────────┬──────────┘  │
│                 │                             │              │
│                 └──────────── supabase-js ────┘              │
└──────────────────────────────────────┬───────────────────────┘
                                       │ HTTPS (REST + Realtime)
┌──────────────────────────────────────┼───────────────────────┐
│                Supabase              │                        │
│  ┌───────────┐  ┌────────────────────┴──────┐                │
│  │  Auth     │  │  Postgres                 │                │
│  │  (JWT)    │  │  ─ Tables + RLS           │                │
│  └───────────┘  │  ─ Views                  │                │
│                 │  ─ Functions (RPCs)        │                │
│                 │  ─ Triggers               │                │
│                 └───────────────────────────┘                │
│  ┌────────────────────┐                                      │
│  │  Edge Functions    │  (admin-create-user only)            │
│  └────────────────────┘                                      │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Architecture

### Context Layer (global state)

| Context | Purpose |
|---|---|
| `AuthContext` | Holds Supabase session and `user` object; exposes `signIn`, `signUp`, `signOut` |
| `DateRangeContext` | Global date range picker state; all dashboard hooks read from it |
| `ToastProvider` | Queue-based toast notification system |

### Data Fetching (TanStack Query)

All server data is fetched via custom hooks that wrap `useQuery` / `useMutation`. Query keys include `user.id` and date range so caches are properly scoped per user and per time period.

```
useDashboardStats()     → get_dashboard_stats RPC     → KPI cards
useMonthlySummary()     → monthly_summary view        → bar chart, trends chart
useCategoryTotals()     → transactions table          → donut chart
useDailyExpenses()      → transactions table          → expense heatmap
useTransactions()       → transactions table          → transaction table
useCategories()         → categories table            → dropdowns, filters
useCategoryRules()      → category_rules table        → rules page
useExclusionRules()     → exclusion_rules table       → upload pipeline
useAccounts()           → accounts table              → account selector
```

Default query config: `retry: 1`, `refetchOnWindowFocus: false`.

### Routing

```
/auth          → AuthPage            (public)
/              → DashboardPage       (protected)
/upload        → UploadPage          (protected)
/transactions  → TransactionsPage    (protected)
/rules         → RulesPage           (protected)
/admin         → AdminPage           (protected + admin role)
```

`ProtectedRoute` checks `AuthContext` on every navigation and redirects to `/auth` if unauthenticated. `AdminRoute` additionally checks `user_profiles.role = 'admin'`.

---

## 3. CSV Import Pipeline

The entire import pipeline runs in the browser. Nothing is streamed to a server for processing.

```
┌─────────────┐
│  Drop file  │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│  PapaParse       │  preview(10 rows) → headers + sample rows
│  auto-detect     │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  columnAutoDetect│  Heuristic matching: DATE_HINTS, DESC_HINTS,
│  (lib/column     │  AMOUNT_HINTS, DEBIT_HINTS, CREDIT_HINTS
│   AutoDetect.ts) │  Validates column by checking 80%+ of rows parse correctly
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  ColumnMapper UI │  User confirms or corrects auto-detected columns
│  (4-step wizard) │  Account name, type, institution also captured here
└──────┬───────────┘
       │  Full PapaParse pass
       ▼
┌──────────────────────────────────────────────────┐
│  For each row:                                   │
│  1. Apply column mapping → (date, desc, amount)  │
│  2. evaluateExclusion() → is_excluded + reason   │
│  3. categorize()        → category_id or null    │
│  4. computeRowHash()    → SHA-256 for dedup      │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────┐
│  Pre-flight check│  SELECT existing hashes → count duplicates
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Preview summary │  total / excluded / duplicates / to import / uncategorized
│  (user confirms) │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Chunked upsert  │  50 rows/batch, ON CONFLICT(user_id, row_hash) DO NOTHING
│  (progress bar)  │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Write upload_log│  Audit record with column_mapping JSONB, row counts
└──────┬───────────┘
       │  if rows_uncategorized > 0
       ▼
┌──────────────────┐
│  Uncategorized   │  Batch review modal: assign categories + optionally
│  Review modal    │  create keyword rules for future imports
└──────────────────┘
```

### Duplicate Detection

`row_hash = SHA-256( accountId | date | amount | description )`

Computed in the browser using the Web Crypto API (`crypto.subtle.digest`). The DB enforces `UNIQUE(user_id, row_hash)`, so re-uploading the same file is safe — duplicate rows are silently skipped.

---

## 4. Categorization Engine

Two-tier system. Rules are merged and sorted by priority descending before the import pipeline runs. User rules win over global rules for the same keyword.

```
Priority 5+  │  User rules     (per-user, full CRUD)
Priority 0   │  Global rules   (100+ pre-seeded merchants, admin-managed)
```

**Matching logic** (`lib/categorizer.ts`):

```
1. Normalize whitespace in description: "APA  TREAS  310" → "APA TREAS 310"
2. For each rule (sorted by priority DESC):
     if UPPER(description) contains UPPER(keyword) → assign category_id
3. Fallback: map bank's original category string via BANK_CATEGORY_MAP
4. Return null → transaction is uncategorized
```

**Post-import** — uncategorized transactions surface in the batch review modal where users can assign categories and optionally save the keyword as a rule for future imports.

**Inline** — in the Transactions table, clicking a category badge opens a dropdown. Selecting a category shows a toast with a "Create rule for this keyword?" action.

---

## 5. Exclusion Engine

Per-user exclusion rules filter out noise before import (`lib/exclusionEngine.ts`):

```
1. Global hard threshold: |amount| < $0.50 → always excluded
2. For each user exclusion rule:
     - Skip if rule is for a different account
     - If UPPER(description) contains UPPER(keyword):
         - If rule has min_amount, only exclude if |amount| ≥ min_amount
         - Otherwise exclude and record reason
```

Default rules seeded per user on first login: `AUTOPAY`, `PAYMENT THANK YOU`, `AUTOMATIC PAYMENT`, investment account keywords (`ROBINHOOD`, `MSPBNA`, etc.).

---

## 6. Database Schema

### Tables

```
user_profiles        id, email, full_name, role ('user'|'admin')
categories           id, name, icon, color, is_expense, sort_order,
                     parent_id (→ categories), user_id (→ auth.users)
accounts             id, user_id, name, type, institution, is_active
category_rules       id, user_id (NULL=global), category_id, keyword, priority
exclusion_rules      id, user_id, account_id (nullable), keyword, reason, min_amount
transactions         id, user_id, account_id, date, description, amount,
                     category_id, is_excluded, exclude_reason, row_hash, ...
upload_logs          id, user_id, account_id, filename, column_mapping (JSONB),
                     rows_total/excluded/duplicate/imported/uncategorized, status
```

### Views

```sql
monthly_summary   → (user_id, month, income, expenses, net)
                     Grouped by calendar month, excludes is_excluded rows.

category_totals   → (user_id, category_id, category, total, transaction_count)
                     Expenses only (amount < 0), excludes is_excluded rows.
```

### Functions

```sql
get_dashboard_stats(p_start_date, p_end_date)
  → JSON { total_income, total_expenses, net, tx_count }
  SECURITY DEFINER — runs as owner but reads only auth.uid()'s rows
```

### Triggers

```
on_auth_user_created  → AFTER INSERT ON auth.users
                        → INSERT INTO user_profiles (id, email, full_name)
                        Ensures every Supabase Auth user has a profile row.

trg_user_profiles_updated_at → BEFORE UPDATE ON user_profiles
                                → SET updated_at = now()
```

---

## 7. Security Model

### Row Level Security (RLS)

All tables have RLS enabled. Every policy checks `auth.uid()`.

| Table | Read | Write |
|---|---|---|
| `categories` | `user_id IS NULL` (global) or `user_id = uid()` | `user_id = uid()` (sub-cats) or `is_admin()` (global) |
| `category_rules` | `user_id = uid() OR user_id IS NULL` | `user_id = uid()` or admin for `NULL` rules |
| `accounts` | `user_id = uid()` or admin | `user_id = uid()` |
| `exclusion_rules` | `user_id = uid()` | `user_id = uid()` |
| `transactions` | `user_id = uid()` or admin | `user_id = uid()` |
| `user_profiles` | `id = uid()` or admin | `id = uid()` or admin |
| `upload_logs` | `user_id = uid()` or admin | `user_id = uid()` |

`is_admin()` is a `SECURITY DEFINER` helper function that checks `user_profiles.role = 'admin'` for `auth.uid()`.

### Authentication

Supabase Auth handles email/password sign-up and sign-in. The browser receives a JWT stored in localStorage. `supabase-js` attaches this JWT to every API request, which Postgres uses to resolve `auth.uid()` in RLS policies.

### No Secrets in the Browser

The frontend uses only the Supabase **anon key** (public, safe to expose). RLS policies ensure users can only read and write their own data regardless of what the client sends. The service role key (which bypasses RLS) is only used in Edge Functions running server-side.

---

## 8. Category Hierarchy

```
Global categories (user_id = NULL, parent_id = NULL)
  ├── Income
  │   ├── Salary          ← user sub-category (user_id = uid(), parent_id = Income.id)
  │   ├── Treasury Dividends  ← user sub-category
  │   └── Refunds         ← user sub-category
  ├── Housing
  ├── Dining
  └── ... (16 more)
```

Sub-categories are user-owned and one level deep. In the **transaction table** and **donut chart**, transactions retain their leaf category assignment.

---

## 9. Data Flow — Dashboard

```
DateRangeContext
      │ (startDate, endDate)
      ├──→ useDashboardStats()   → get_dashboard_stats RPC  → KPI cards
      ├──→ useMonthlySummary()   → monthly_summary view     → bar chart + trends
      ├──→ useCategoryTotals()   → transactions table       → donut chart
      └──→ useDailyExpenses()    → transactions table          → expense heatmap
```

All four queries share the same date range and are independently cached by TanStack Query. Changing the date range picker invalidates all four simultaneously.

---

## 10. Key Design Decisions

| Decision | Rationale |
|---|---|
| All processing in the browser | No server infra to manage; CSV files never leave the user's machine |
| Supabase anon key only on client | RLS handles authorization; no proxy server needed |
| SHA-256 row hash for dedup | Deterministic across re-uploads; computed client-side via Web Crypto API |
| Global categories are system-owned (`user_id = NULL`) | Single shared taxonomy; no per-user category UUIDs in foreign keys |
| Two-tier rules at priority levels (5 vs 0) | User rules naturally override global without custom merge logic |
| Sub-categories preserved at leaf level | Transaction table and donut chart show the actual assigned sub-category; no rollup needed |
| `SECURITY DEFINER` on `get_dashboard_stats` | Aggregation function needs to run as owner to avoid per-row RLS overhead |
| `column_mapping` stored as JSONB in `upload_logs` | Foundation for future "remember my Wells Fargo format" auto-suggest feature |
