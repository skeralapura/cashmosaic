import { useState, useRef, useEffect } from 'react';
import { useCategories } from '@/hooks/useCategories';
import { useUpdateTransactionCategory, useExcludeTransaction } from '@/hooks/useTransactions';
import { useToast } from '@/components/ui/Toast';
import { CreateRulePrompt } from '@/components/categorization/CreateRulePrompt';
import type { Category } from '@/lib/types';

interface CategoryBadgeProps {
  categoryId: string | null;
  transactionId: string;
  description: string;
  categoryMap: Record<string, Category>;
  readOnly?: boolean;
}

export function CategoryBadge({ categoryId, transactionId, description, categoryMap, readOnly = false }: CategoryBadgeProps) {
  const [open, setOpen] = useState(false);
  const [showRulePrompt, setShowRulePrompt] = useState(false);
  const [pendingCategory, setPendingCategory] = useState<Category | null>(null);
  const [excludeMode, setExcludeMode] = useState(false);
  const [excludeReason, setExcludeReason] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: categories = [] } = useCategories();
  const updateCategory = useUpdateTransactionCategory();
  const excludeTransaction = useExcludeTransaction();
  const { showToast } = useToast();

  const current = categoryId ? categoryMap[categoryId] : null;

  // Reset exclude mode when dropdown closes
  useEffect(() => {
    if (!open) {
      setExcludeMode(false);
      setExcludeReason('');
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = async (cat: Category) => {
    setOpen(false);
    try {
      await updateCategory.mutateAsync({ transactionId, categoryId: cat.id });
      setPendingCategory(cat);
      showToast({
        type: 'success',
        title: `Categorized as ${cat.name}`,
        action: {
          label: `+ Create rule for "${description.split(/\s+/).slice(0, 2).join(' ')}"`,
          onClick: () => setShowRulePrompt(true),
        },
      });
    } catch {
      showToast({ type: 'error', title: 'Failed to update category' });
    }
  };

  const handleExclude = async () => {
    setOpen(false);
    try {
      await excludeTransaction.mutateAsync({ transactionId, reason: excludeReason.trim(), excluded: true });
      showToast({ type: 'info', title: 'Transaction excluded', message: excludeReason.trim() || undefined });
    } catch {
      showToast({ type: 'error', title: 'Failed to exclude transaction' });
    }
  };

  const badge = current ? (
    <span
      className="badge cursor-pointer hover:opacity-80 transition-opacity"
      style={{ backgroundColor: `${current.color}22`, color: current.color }}
      onClick={() => !readOnly && setOpen(true)}
    >
      {current.icon} {current.name}
    </span>
  ) : (
    <span
      className="badge bg-slate-700/50 text-slate-500 cursor-pointer hover:bg-slate-600/50 transition-colors"
      onClick={() => !readOnly && setOpen(true)}
    >
      ❓ Uncategorized
    </span>
  );

  if (readOnly) return badge;

  return (
    <>
      <div className="relative inline-block" ref={dropdownRef}>
        {badge}

        {open && (
          <div className="absolute left-0 top-full mt-1 z-50 w-56 card border border-slate-600 shadow-2xl py-1 max-h-80 overflow-y-auto">
            {!excludeMode ? (
              <>
                {(() => {
                  const parents = categories.filter(c => c.parent_id === null);
                  const childrenMap = new Map<string, Category[]>();
                  for (const c of categories) {
                    if (c.parent_id) {
                      const arr = childrenMap.get(c.parent_id) ?? [];
                      arr.push(c);
                      childrenMap.set(c.parent_id, arr);
                    }
                  }
                  return parents.map(parent => {
                    const children = childrenMap.get(parent.id) ?? [];
                    return (
                      <div key={parent.id}>
                        <button
                          onClick={() => handleSelect(parent)}
                          className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-700 transition-colors"
                        >
                          <span>{parent.icon}</span>
                          <span className="text-slate-200">{parent.name}</span>
                          {parent.id === categoryId && <span className="ml-auto text-indigo-400">✓</span>}
                        </button>
                        {children.map(child => (
                          <button
                            key={child.id}
                            onClick={() => handleSelect(child)}
                            className="w-full text-left pl-7 pr-3 py-1.5 text-sm flex items-center gap-2 hover:bg-slate-700/70 transition-colors"
                          >
                            <span className="text-slate-500 text-xs">↳</span>
                            <span>{child.icon}</span>
                            <span className="text-slate-300">{child.name}</span>
                            {child.id === categoryId && <span className="ml-auto text-indigo-400">✓</span>}
                          </button>
                        ))}
                      </div>
                    );
                  });
                })()}
                <div className="border-t border-slate-700 my-1" />
                <button
                  onClick={() => setExcludeMode(true)}
                  className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-700/80 transition-colors text-red-400"
                >
                  <span>⊘</span>
                  <span>Exclude this transaction</span>
                </button>
              </>
            ) : (
              <div className="p-3 space-y-2">
                <p className="text-xs text-slate-400 font-medium">Reason for exclusion</p>
                <input
                  autoFocus
                  value={excludeReason}
                  onChange={e => setExcludeReason(e.target.value)}
                  placeholder="e.g. Transfer, Payment..."
                  className="input text-sm py-1.5 w-full"
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleExclude();
                    if (e.key === 'Escape') setOpen(false);
                  }}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setExcludeMode(false)}
                    className="btn-secondary text-xs py-1 px-2"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleExclude}
                    className="text-xs py-1 px-2 rounded bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
                  >
                    Exclude
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showRulePrompt && pendingCategory && (
        <CreateRulePrompt
          open={showRulePrompt}
          onClose={() => setShowRulePrompt(false)}
          description={description}
          categoryId={pendingCategory.id}
          categoryName={pendingCategory.name}
        />
      )}
    </>
  );
}
