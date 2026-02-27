import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useCategoryRules, useCreateRule, useDeleteRule } from '@/hooks/useCategoryRules';
import { useCategories } from '@/hooks/useCategories';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import type { CategoryRule } from '@/lib/types';

export function RulesPage() {
  const { data, isLoading } = useCategoryRules();
  const { data: categories = [] } = useCategories();
  const createRule = useCreateRule();
  const deleteRule = useDeleteRule();
  const { showToast } = useToast();

  const [newKeyword, setNewKeyword] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const categoryMap = Object.fromEntries(categories.map(c => [c.id, c]));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim() || !newCategoryId) return;
    try {
      await createRule.mutateAsync({ categoryId: newCategoryId, keyword: newKeyword.trim().toUpperCase() });
      showToast({ type: 'success', title: 'Rule created' });
      setNewKeyword('');
    } catch {
      showToast({ type: 'error', title: 'Failed to create rule' });
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
          <form onSubmit={handleCreate} className="flex gap-3 items-end">
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
