import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useCategoryRules, useCreateRule, useDeleteRule } from '@/hooks/useCategoryRules';
import { useCategories, useCreateUserCategory, useDeleteUserCategory } from '@/hooks/useCategories';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { CategoryRule } from '@/lib/types';

export function RulesPage() {
  const { data, isLoading } = useCategoryRules();
  const { data: categories = [] } = useCategories();
  const createRule = useCreateRule();
  const deleteRule = useDeleteRule();
  const createSubCategory = useCreateUserCategory();
  const deleteSubCategory = useDeleteUserCategory();
  const { showToast } = useToast();

  const [newKeyword, setNewKeyword] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [applyToExisting, setApplyToExisting] = useState(true);
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Sub-category form state
  const [subName, setSubName] = useState('');
  const [subIcon, setSubIcon] = useState('');
  const [subColor, setSubColor] = useState('#6366f1');
  const [subParentId, setSubParentId] = useState('');

  const categoryMap = Object.fromEntries(categories.map(c => [c.id, c]));
  const queryClient = useQueryClient();

  // Top-level (global) parent categories only
  const parentCategories = categories.filter(c => c.parent_id === null);
  // User's own sub-categories
  const userSubCategories = categories.filter(c => c.user_id !== null);

  const applyKeywordToTransactions = async (kw: string, categoryId: string): Promise<string> => {
    // Replace spaces with % so "APA TREAS 310" matches "APA  TREAS  310..." (multiple spaces in DB)
    const ilikePattern = '%' + kw.split(/\s+/).join('%') + '%';
    const { data: matches, error: selectErr } = await supabase
      .from('transactions')
      .select('id')
      .ilike('description', ilikePattern)
      .limit(10000);
    if (selectErr) throw new Error(`SELECT error: ${selectErr.message}`);

    const rows = matches ?? [];
    if (rows.length === 0) {
      return '0 matching transactions found';
    }

    const ids = rows.map((r: { id: string }) => r.id);
    const { error: updateErr } = await supabase
      .from('transactions')
      .update({ category_id: categoryId })
      .in('id', ids);
    if (updateErr) throw new Error(`UPDATE error: ${updateErr.message}`);

    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['transactions_uncategorized'] });
    queryClient.invalidateQueries({ queryKey: ['category_totals'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    return `${ids.length} existing transactions updated`;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const kw = newKeyword.trim().toUpperCase();
    if (!kw || !newCategoryId) return;

    // Try rule creation (upsert — requires migration 004 unique index)
    let ruleOk = false;
    let ruleMsg = '';
    try {
      await createRule.mutateAsync({ categoryId: newCategoryId, keyword: kw });
      ruleOk = true;
    } catch (err) {
      ruleMsg = (err as Error).message;
    }

    // Bulk update runs regardless of rule creation result
    // No user check needed — RLS on transactions enforces isolation
    let applyMsg = '';
    if (applyToExisting) {
      try {
        applyMsg = await applyKeywordToTransactions(kw, newCategoryId);
      } catch (err) {
        applyMsg = `Update error: ${(err as Error).message}`;
      }
    }

    const applyDetail = applyMsg || (applyToExisting ? '0 matching transactions' : 'Not applied to existing');
    if (ruleOk) {
      showToast({ type: 'success', title: 'Rule created', message: applyDetail });
      setNewKeyword('');
    } else {
      showToast({ type: 'warning', title: 'Rule not saved', message: `${ruleMsg} · ${applyDetail}` });
    }
  };

  const handleDelete = async (ruleId: string, keyword: string) => {
    if (!confirm(`Delete rule for "${keyword}"?`)) return;
    try {
      await deleteRule.mutateAsync(ruleId);
      showToast({ type: 'success', title: 'Rule deleted' });
    } catch {
      showToast({ type: 'error', title: 'Failed to delete rule' });
    }
  };

  const handleCreateSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = subName.trim();
    if (!name || !subParentId) return;
    const parent = categoryMap[subParentId];
    try {
      await createSubCategory.mutateAsync({
        name,
        icon: subIcon || parent?.icon || '📂',
        color: subColor,
        parentId: subParentId,
        isExpense: parent?.is_expense ?? true,
      });
      showToast({ type: 'success', title: 'Sub-category created', message: `${name} added under ${parent?.name}` });
      setSubName('');
      setSubIcon('');
      setSubColor('#6366f1');
      setSubParentId('');
    } catch (err) {
      showToast({ type: 'error', title: 'Failed to create sub-category', message: (err as Error).message });
    }
  };

  const handleDeleteSubCategory = async (id: string, name: string) => {
    if (!confirm(`Delete sub-category "${name}"? Transactions assigned to it will lose their category.`)) return;
    try {
      await deleteSubCategory.mutateAsync(id);
      showToast({ type: 'success', title: 'Sub-category deleted' });
    } catch {
      showToast({ type: 'error', title: 'Failed to delete sub-category' });
    }
  };

  const filterRules = (rules: CategoryRule[]) => rules.filter(r => {
    const matchesCat = !filterCategory || r.category_id === filterCategory;
    const matchesSearch = !searchQuery || r.keyword.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const filteredUserRules = filterRules(data?.userRules ?? []);
  const filteredGlobalRules = filterRules(data?.globalRules ?? []);

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="page-header">My Categorization Rules</h1>
          <p className="text-slate-400 text-sm -mt-4">
            Keyword rules automatically categorize transactions during import. Your rules take priority over global rules.
          </p>
        </div>

        {/* Add rule form */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">Add New Rule</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="label">Keyword (case-insensitive)</label>
                <input
                  value={newKeyword}
                  onChange={e => setNewKeyword(e.target.value.toUpperCase())}
                  placeholder="e.g. STARBUCKS"
                  className="input font-mono"
                  required
                />
              </div>
              <div className="w-52">
                <label className="label">Category</label>
                <select
                  value={newCategoryId}
                  onChange={e => setNewCategoryId(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">Select...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={createRule.isPending}
                className="btn-primary flex-shrink-0"
              >
                {createRule.isPending ? 'Adding...' : '+ Add Rule'}
              </button>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={applyToExisting}
                onChange={e => setApplyToExisting(e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-500"
              />
              <span className="text-sm text-slate-400">Apply to all existing transactions matching this keyword</span>
            </label>
          </form>
        </div>

        {/* Search & filter */}
        <div className="flex gap-3">
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search keywords..."
            className="input w-48 text-sm py-1.5"
          />
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="input text-sm py-1.5 w-44"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>

        {/* ── Sub-Category Management ─────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-1">My Sub-Categories</h2>
          <p className="text-xs text-slate-500 mb-4">
            Create personal sub-categories under any global category (e.g. Income → Salary, Treasury Dividends).
          </p>

          {/* Create form */}
          <form onSubmit={handleCreateSubCategory} className="flex flex-wrap gap-3 items-end mb-5">
            <div className="w-36">
              <label className="label">Parent Category</label>
              <select
                value={subParentId}
                onChange={e => setSubParentId(e.target.value)}
                className="input text-sm"
                required
              >
                <option value="">Select parent...</option>
                {parentCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-36">
              <label className="label">Sub-Category Name</label>
              <input
                value={subName}
                onChange={e => setSubName(e.target.value)}
                placeholder="e.g. Salary"
                className="input text-sm"
                required
              />
            </div>
            <div className="w-24">
              <label className="label">Icon (emoji)</label>
              <input
                value={subIcon}
                onChange={e => setSubIcon(e.target.value)}
                placeholder="💼"
                className="input text-sm text-center"
                maxLength={4}
              />
            </div>
            <div className="w-24">
              <label className="label">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={subColor}
                  onChange={e => setSubColor(e.target.value)}
                  className="h-9 w-10 rounded cursor-pointer bg-transparent border border-slate-600 p-0.5"
                />
                <span className="text-xs text-slate-500 font-mono">{subColor}</span>
              </div>
            </div>
            <button
              type="submit"
              disabled={createSubCategory.isPending}
              className="btn-primary flex-shrink-0"
            >
              {createSubCategory.isPending ? 'Adding...' : '+ Add Sub-Category'}
            </button>
          </form>

          {/* List of user sub-categories */}
          {userSubCategories.length === 0 ? (
            <p className="text-sm text-slate-500">No sub-categories yet.</p>
          ) : (
            <div className="divide-y divide-slate-700/50 rounded-lg overflow-hidden border border-slate-700">
              {userSubCategories.map(sub => {
                const parent = categoryMap[sub.parent_id ?? ''];
                return (
                  <div key={sub.id} className="flex items-center gap-3 px-4 py-2.5 table-row-hover">
                    {parent && (
                      <span className="text-xs text-slate-500 flex-shrink-0">
                        {parent.icon} {parent.name} ›
                      </span>
                    )}
                    <span
                      className="badge text-xs flex-shrink-0"
                      style={{ backgroundColor: `${sub.color}22`, color: sub.color }}
                    >
                      {sub.icon} {sub.name}
                    </span>
                    <span className="text-xs text-slate-600 flex-1">personal</span>
                    <button
                      onClick={() => handleDeleteSubCategory(sub.id, sub.name)}
                      className="text-xs text-slate-600 hover:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <div className="space-y-6">
            {/* User rules */}
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-200">
                  My Rules <span className="text-slate-500 ml-1">({filteredUserRules.length})</span>
                </h2>
                <Badge className="text-indigo-400 bg-indigo-500/10">Personal — editable</Badge>
              </div>

              {filteredUserRules.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-500">
                  No personal rules yet. Add rules above or create them from the Transactions page.
                </p>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {filteredUserRules.map(rule => {
                    const cat = categoryMap[rule.category_id];
                    return (
                      <div key={rule.id} className="flex items-center gap-3 px-5 py-3 table-row-hover">
                        {cat && (
                          <span
                            className="badge text-xs flex-shrink-0"
                            style={{ backgroundColor: `${cat.color}22`, color: cat.color }}
                          >
                            {cat.icon} {cat.name}
                          </span>
                        )}
                        <code className="text-sm text-slate-200 font-mono flex-1">{rule.keyword}</code>
                        <span className="text-xs text-slate-600">priority {rule.priority}</span>
                        <button
                          onClick={() => handleDelete(rule.id, rule.keyword)}
                          className="text-xs text-slate-600 hover:text-red-400 transition-colors ml-2"
                        >
                          Delete
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Global rules (read-only) */}
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-300">
                  Global Rules <span className="text-slate-500 ml-1">({filteredGlobalRules.length})</span>
                </h2>
                <Badge className="text-slate-400 bg-slate-700/50">Shared · read-only</Badge>
              </div>
              <div className="divide-y divide-slate-700/30">
                {filteredGlobalRules.slice(0, 50).map(rule => {
                  const cat = categoryMap[rule.category_id];
                  return (
                    <div key={rule.id} className="flex items-center gap-3 px-5 py-2.5 opacity-70">
                      {cat && (
                        <span
                          className="badge text-xs flex-shrink-0"
                          style={{ backgroundColor: `${cat.color}22`, color: cat.color }}
                        >
                          {cat.icon} {cat.name}
                        </span>
                      )}
                      <code className="text-sm text-slate-300 font-mono flex-1">{rule.keyword}</code>
                      <span className="text-xs text-slate-600">global</span>
                    </div>
                  );
                })}
                {filteredGlobalRules.length > 50 && (
                  <p className="px-5 py-3 text-xs text-slate-500">
                    +{filteredGlobalRules.length - 50} more global rules (use search to find specific ones)
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
