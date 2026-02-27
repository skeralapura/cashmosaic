import { useState, useRef, useEffect } from 'react';
import { useCategories } from '@/hooks/useCategories';
import { useUpdateTransactionCategory } from '@/hooks/useTransactions';
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: categories = [] } = useCategories();
  const updateCategory = useUpdateTransactionCategory();
  const { showToast } = useToast();

  const current = categoryId ? categoryMap[categoryId] : null;

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
          <div className="absolute left-0 top-full mt-1 z-50 w-52 card border border-slate-600 shadow-2xl py-1 max-h-72 overflow-y-auto">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => handleSelect(cat)}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-700 transition-colors"
              >
                <span>{cat.icon}</span>
                <span className="text-slate-200">{cat.name}</span>
                {cat.id === categoryId && <span className="ml-auto text-indigo-400">✓</span>}
              </button>
            ))}
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
