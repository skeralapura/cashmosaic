import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { CategoryDropdown } from './CategoryDropdown';
import { useUncategorizedTransactions, useBulkUpdateCategories } from '@/hooks/useTransactions';
import { useCreateRule } from '@/hooks/useCategoryRules';
import { useToast } from '@/components/ui/Toast';
import { formatDate, formatAmount } from '@/lib/formatters';
interface UncategorizedReviewProps {
  onClose: () => void;
}

export function UncategorizedReview({ onClose }: UncategorizedReviewProps) {
  const { data: transactions = [], isLoading } = useUncategorizedTransactions();
  const bulkUpdate = useBulkUpdateCategories();
  const createRule = useCreateRule();
  const { showToast } = useToast();

  // Local state: selections and rule checkboxes per transaction
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [createRuleFor, setCreateRuleFor] = useState<Record<string, boolean>>({});

  const setCategory = (txId: string, catId: string) => {
    setSelections(prev => ({ ...prev, [txId]: catId }));
    setCreateRuleFor(prev => ({ ...prev, [txId]: true })); // default checked
  };

  const handleConfirmAll = async () => {
    const updates = Object.entries(selections).map(([txId, catId]) => ({
      transactionId: txId,
      categoryId: catId,
    }));

    if (!updates.length) { onClose(); return; }

    try {
      await bulkUpdate.mutateAsync(updates);

      // Create rules for checked items
      const ruleCreations = Object.entries(createRuleFor)
        .filter(([txId, checked]) => checked && selections[txId])
        .map(([txId]) => {
          const tx = transactions.find(t => t.id === txId);
          if (!tx) return null;
          // Use first 3 words of description as keyword
          const keyword = tx.description.split(/\s+/).slice(0, 3).join(' ').toUpperCase();
          return createRule.mutateAsync({ categoryId: selections[txId], keyword });
        })
        .filter(Boolean);

      await Promise.allSettled(ruleCreations);

      showToast({
        type: 'success',
        title: `${updates.length} transactions categorized`,
        message: ruleCreations.length > 0 ? `${ruleCreations.length} keyword rules created` : undefined,
      });
      onClose();
    } catch {
      showToast({ type: 'error', title: 'Failed to update some categories' });
    }
  };

  const assignedCount = Object.keys(selections).length;

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
          Assign categories to uncategorized transactions. Check "Save as rule" to automatically
          categorize similar transactions in future imports.
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
                  <label className="flex items-center gap-1.5 flex-shrink-0 cursor-pointer" title="Create keyword rule for future imports">
                    <input
                      type="checkbox"
                      checked={createRuleFor[tx.id] ?? true}
                      onChange={e => setCreateRuleFor(prev => ({ ...prev, [tx.id]: e.target.checked }))}
                      className="accent-indigo-500"
                    />
                    <span className="text-xs text-slate-400 whitespace-nowrap">+ Rule</span>
                  </label>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
