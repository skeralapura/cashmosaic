import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useCreateRule } from '@/hooks/useCategoryRules';
import { useCategories } from '@/hooks/useCategories';
import { useToast } from '@/components/ui/Toast';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface CreateRulePromptProps {
  open: boolean;
  onClose: () => void;
  description: string;
  categoryId: string;
  categoryName: string;
}

export function CreateRulePrompt({ open, onClose, description, categoryId, categoryName }: CreateRulePromptProps) {
  const [keyword, setKeyword] = useState(() => {
    // Pre-fill with first meaningful word/phrase from description
    return description.split(/\s+/).slice(0, 3).join(' ').toUpperCase();
  });
  const [selectedCategoryId, setSelectedCategoryId] = useState(categoryId);
  const [applyToExisting, setApplyToExisting] = useState(true);
  const { data: categories = [] } = useCategories();
  const createRule = useCreateRule();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  const handleCreate = async () => {
    if (!keyword.trim()) return;

    // Try rule creation (upsert — requires migration 004 unique index)
    let ruleOk = false;
    try {
      await createRule.mutateAsync({ categoryId: selectedCategoryId, keyword: keyword.trim() });
      ruleOk = true;
    } catch {
      // Rule creation failed (e.g. missing DB index) — still proceed with bulk update
    }

    // Bulk update — runs regardless of rule creation result (RLS enforces user isolation)
    let applyNote = applyToExisting ? '' : 'Not applied to existing transactions';
    if (applyToExisting) {
      try {
        // Replace spaces with % so "APA TREAS 310" matches "APA  TREAS  310..." (multiple spaces in DB)
        const ilikePattern = '%' + keyword.trim().split(/\s+/).join('%') + '%';
        const { data: matches, error: selectErr } = await supabase
          .from('transactions')
          .select('id')
          .ilike('description', ilikePattern)
          .limit(10000);
        if (selectErr) {
          applyNote = `Find error: ${selectErr.message}`;
        } else {
          const ids = (matches ?? []).map((r: { id: string }) => r.id);
          if (ids.length === 0) {
            applyNote = `0 matching transactions found`;
          } else {
            const { error: updateErr } = await supabase
              .from('transactions')
              .update({ category_id: selectedCategoryId })
              .in('id', ids);
            if (updateErr) {
              applyNote = `Update error: ${updateErr.message}`;
            } else {
              applyNote = `${ids.length} existing transactions updated`;
              queryClient.invalidateQueries({ queryKey: ['transactions'] });
              queryClient.invalidateQueries({ queryKey: ['transactions_uncategorized'] });
              queryClient.invalidateQueries({ queryKey: ['category_totals'] });
              queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            }
          }
        }
      } catch (err) {
        applyNote = `Error: ${(err as Error).message}`;
      }
    }

    showToast({
      type: ruleOk ? 'success' : 'warning',
      title: ruleOk ? 'Rule created' : 'Rule not saved — run migration 004',
      message: `"${keyword.trim()}" → ${selectedCategory?.name ?? categoryName} · ${applyNote}`,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Keyword Rule"
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleCreate} disabled={createRule.isPending || !keyword.trim()} className="btn-primary">
            {createRule.isPending ? 'Creating...' : 'Create Rule'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          Automatically categorize future transactions containing this keyword.
        </p>
        <div>
          <label className="label">Keyword (case-insensitive)</label>
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value.toUpperCase())}
            className="input font-mono"
            placeholder="e.g. STARBUCKS"
          />
          <p className="text-xs text-slate-500 mt-1">
            Any transaction description containing this will be categorized automatically.
          </p>
        </div>
        <div>
          <label className="label">Category</label>
          <select
            value={selectedCategoryId}
            onChange={e => setSelectedCategoryId(e.target.value)}
            className="input"
          >
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={applyToExisting}
            onChange={e => setApplyToExisting(e.target.checked)}
            className="w-4 h-4 rounded accent-indigo-500"
          />
          <span className="text-sm text-slate-300">Apply to all existing transactions matching this keyword</span>
        </label>
      </div>
    </Modal>
  );
}
