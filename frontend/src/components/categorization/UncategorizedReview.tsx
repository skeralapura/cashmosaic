import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { CategoryDropdown } from './CategoryDropdown';
import { useUncategorizedTransactions, useBulkUpdateCategories, useExcludeTransaction } from '@/hooks/useTransactions';
import { useCreateRule } from '@/hooks/useCategoryRules';
import { useToast } from '@/components/ui/Toast';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { formatDate, formatAmount } from '@/lib/formatters';

interface UncategorizedReviewProps {
  onClose: () => void;
}

export function UncategorizedReview({ onClose }: UncategorizedReviewProps) {
  const { data: transactions = [], isLoading } = useUncategorizedTransactions();
  const bulkUpdate = useBulkUpdateCategories();
  const createRule = useCreateRule();
  const excludeTransaction = useExcludeTransaction();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Local state: selections and rule checkboxes per transaction
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [createRuleFor, setCreateRuleFor] = useState<Record<string, boolean>>({});
  const [excludingId, setExcludingId] = useState<string | null>(null);

  const setCategory = (txId: string, catId: string) => {
    setSelections(prev => ({ ...prev, [txId]: catId }));
    setCreateRuleFor(prev => ({ ...prev, [txId]: true })); // default checked
  };

  const handleExclude = async (txId: string) => {
    setExcludingId(txId);
    try {
      await excludeTransaction.mutateAsync({ transactionId: txId, excluded: true });
      // Remove from local selections if it was assigned
      setSelections(prev => { const n = { ...prev }; delete n[txId]; return n; });
      setCreateRuleFor(prev => { const n = { ...prev }; delete n[txId]; return n; });
    } catch {
      showToast({ type: 'error', title: 'Failed to exclude transaction' });
    } finally {
      setExcludingId(null);
    }
  };

  const handleConfirmAll = async () => {
    // Only include rows with a real category selection (non-empty string)
    const validUpdates = Object.entries(selections)
      .filter(([, catId]) => !!catId)
      .map(([txId, catId]) => ({ transactionId: txId, categoryId: catId }));

    if (!validUpdates.length) { onClose(); return; }

    // Step 1: Update selected transactions — abort if this fails
    try {
      await bulkUpdate.mutateAsync(validUpdates);
    } catch (err) {
      showToast({ type: 'error', title: 'Failed to update categories', message: (err as Error).message });
      return;
    }

    // Step 2: Collect rules info for checked rows (uses stable closure values, runs after step 1)
    const rulesInfo = Object.entries(createRuleFor)
      .filter(([txId, checked]) => checked && selections[txId])
      .map(([txId]) => {
        const tx = transactions.find(t => t.id === txId);
        if (!tx) return null;
        const keyword = tx.description.split(/\s+/).slice(0, 3).join(' ').toUpperCase();
        return { keyword, categoryId: selections[txId] };
      })
      .filter(Boolean) as { keyword: string; categoryId: string }[];

    // Step 3: Create rules (upsert, non-fatal)
    await Promise.allSettled(
      rulesInfo.map(({ keyword, categoryId }) =>
        createRule.mutateAsync({ categoryId, keyword })
      )
    );

    // Step 4: ILIKE bulk apply — runs independently of rule creation result
    let totalApplied = 0;
    await Promise.allSettled(
      rulesInfo.map(async ({ keyword, categoryId }) => {
        // Replace spaces with % so "APA TREAS 310" matches "APA  TREAS  310..." (multiple spaces in DB)
        const ilikePattern = '%' + keyword.split(/\s+/).join('%') + '%';
        const { data: matches, error: selectErr } = await supabase
          .from('transactions')
          .select('id')
          .ilike('description', ilikePattern)
          .limit(10000);
        if (selectErr) return;
        const ids = (matches ?? []).map((r: { id: string }) => r.id);
        if (ids.length === 0) return;
        const { error: updateErr } = await supabase
          .from('transactions')
          .update({ category_id: categoryId })
          .in('id', ids);
        if (!updateErr) totalApplied += ids.length;
      })
    );

    // Step 5: Invalidate and close
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['transactions_uncategorized'] });
    queryClient.invalidateQueries({ queryKey: ['category_totals'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });

    const appliedPart = totalApplied > 0 ? ` · ${totalApplied} existing transactions updated` : '';
    showToast({
      type: 'success',
      title: `${validUpdates.length} transactions categorized`,
      message: rulesInfo.length > 0
        ? `${rulesInfo.length} keyword rules created${appliedPart}`
        : undefined,
    });
    onClose();
  };

  const assignedCount = Object.values(selections).filter(Boolean).length;

  return (
    <Modal
      open
      onClose={onClose}
      title={`Review Uncategorized Transactions (${transactions.length})`}
      size="xl"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Skip for now</button>
          <button
            onClick={handleConfirmAll}
            disabled={bulkUpdate.isPending || assignedCount === 0}
            className="btn-primary"
          >
            {bulkUpdate.isPending
              ? 'Saving...'
              : `Confirm ${assignedCount} Assignment${assignedCount !== 1 ? 's' : ''}`}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-400">
          Assign categories to uncategorized transactions. Check "+ Rule" to automatically
          categorize <em>all</em> existing and future transactions with that keyword.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : transactions.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No uncategorized transactions — great job!</p>
        ) : (
          <div className="overflow-y-auto max-h-[50vh] space-y-1.5 pr-1">
            {transactions.map(tx => (
              <div
                key={tx.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-700/30 border border-slate-700/50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{tx.description}</p>
                  <p className="text-xs text-slate-500">{formatDate(tx.date)} · {tx.account?.name}</p>
                </div>
                <p className={`text-sm font-medium flex-shrink-0 ${tx.amount >= 0 ? 'text-green-400' : 'text-slate-300'}`}>
                  {formatAmount(tx.amount)}
                </p>
                <div className="w-44 flex-shrink-0">
                  <CategoryDropdown
                    value={selections[tx.id] ?? null}
                    onChange={catId => setCategory(tx.id, catId)}
                    placeholder="Assign..."
                  />
                </div>
                {selections[tx.id] && (
                  <label className="flex items-center gap-1.5 flex-shrink-0 cursor-pointer" title="Create keyword rule and apply to all matching transactions">
                    <input
                      type="checkbox"
                      checked={createRuleFor[tx.id] ?? true}
                      onChange={e => setCreateRuleFor(prev => ({ ...prev, [tx.id]: e.target.checked }))}
                      className="accent-indigo-500"
                    />
                    <span className="text-xs text-slate-400 whitespace-nowrap">+ Rule</span>
                  </label>
                )}
                <button
                  onClick={() => handleExclude(tx.id)}
                  disabled={excludingId === tx.id}
                  title="Exclude this transaction"
                  className="flex-shrink-0 text-slate-600 hover:text-red-400 transition-colors text-base leading-none"
                >
                  ⊘
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
