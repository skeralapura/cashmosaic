# CashMosaic

A self-hosted personal finance dashboard. Upload CSV exports from any bank, automatically categorize transactions with two-tier keyword rules, and explore your spending through interactive charts — all on your own Supabase instance.

## Features

**CSV Import**
- Works with any bank's CSV format — Chase, Wells Fargo, Citi, and others
- Smart column auto-detection (date, description, amount, debit/credit)
- Side-by-side column mapper UI with live preview
- Duplicate prevention via SHA-256 row hashing
- Per-user exclusion rules to filter out transfers, payments, and noise
- Import summary: total / excluded / duplicates / to import / uncategorized

**Categorization**
- Two-tier keyword rules: 100+ global merchant rules + your personal rules
- Personal rules take priority (priority 5 vs global priority 0)
- Post-import batch review for uncategorized transactions
- Inline category edit on any transaction with one-click rule creation
- User-defined sub-categories (e.g. Income → Salary, Treasury Dividends)

**Dashboard**
- KPI cards: Total Income, Total Expenses, Net Savings, Savings Rate
- Income vs Expenses bar chart (monthly)
- Spending by Category donut (click to filter transactions)
- Cumulative savings trends line chart
- Daily Expense Heatmap — GitHub-style calendar view, color-coded green → red by spend intensity
- Recent transactions widget

**Transactions**
- Filter by date range, account, category, and free-text search
- Inline category assignment with rule-creation toast
- Show/hide excluded transactions
- Export filtered view to CSV

**Rules & Categories**
- Manage personal keyword rules with optional bulk-apply to existing transactions
- View global rules (read-only reference)
- Create and delete personal sub-categories under any global category

**Admin Panel** *(admin role only)*
- User management: list, promote, delete
- Global keyword rules manager
- Upload audit log across all users

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript |
| Styling | Tailwind CSS v3 (dark theme) |
| Charts | Recharts |
| State | TanStack Query v5 |
| Forms | React Hook Form |
| CSV | PapaParse |
| Backend | Supabase (Postgres, Auth, RLS) |
| Routing | React Router v6 |

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Open the **SQL Editor** and run the migrations in order:

```
supabase/migrations/001_initial_schema.sql   — tables, RLS, triggers
supabase/migrations/002_views.sql            — monthly_summary, category_totals
supabase/migrations/003_functions.sql        — get_dashboard_stats RPC
supabase/migrations/004_rule_uniqueness.sql  — unique constraint on keyword rules
supabase/migrations/005_subcategories.sql    — user sub-categories support
```

3. Run the seed file to populate global categories and keyword rules:

```
supabase/seed.sql
```

4. Copy your **Project URL** and **anon public key** from Project Settings → API.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local and fill in your Supabase URL and anon key
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), sign up, and start importing CSVs.

## Project Structure

```
cashmosaic/
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── dashboard/       # KPICard, charts, ExpenseHeatmap, RecentTransactions
│       │   ├── upload/          # DropZone, ColumnMapper, PreviewTable, UploadProgress
│       │   ├── categorization/  # CategoryDropdown, UncategorizedReview, CreateRulePrompt
│       │   ├── transactions/    # TransactionTable, CategoryBadge, TransactionFilters
│       │   ├── admin/           # UserTable, GlobalRulesManager, UploadLogTable
│       │   ├── layout/          # AppShell, Sidebar, Topbar
│       │   └── ui/              # Button, Input, Modal, Toast, Spinner, Badge
│       ├── hooks/               # useTransactions, useDashboard, useCategories, ...
│       ├── pages/               # DashboardPage, UploadPage, TransactionsPage, ...
│       ├── lib/                 # supabase client, CSV parser, categorizer, formatters
│       └── context/             # AuthContext, DateRangeContext
└── supabase/
    ├── migrations/              # 5 migration files (run in order)
    └── seed.sql                 # Global categories + 100+ keyword rules
```

## Database Overview

- **`categories`** — 19 global categories (system-owned); users can add sub-categories with `parent_id`
- **`category_rules`** — `user_id = NULL` for global rules, `user_id = <uid>` for personal rules
- **`transactions`** — row-hashed for dedup; `amount < 0` = expense, `amount > 0` = income
- **`accounts`** — user-labelled bank/credit card accounts
- **`exclusion_rules`** — per-user rules to skip transfers, payments, etc.
- **`upload_logs`** — import audit trail with column mapping stored as JSONB

All tables have Row Level Security enabled. Users only see their own data.

## First Import

1. Go to **Upload** and drop a CSV file from your bank
2. Confirm the auto-detected column mapping (date, description, amount)
3. Review the import summary and click **Import**
4. If any transactions are uncategorized, the batch review modal will open
5. Assign categories and optionally save keyword rules for future imports
