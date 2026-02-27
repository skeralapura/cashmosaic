import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useCreateRule } from '@/hooks/useCategoryRules';
import { useCategories } from '@/hooks/useCategories';
import { useToast } from '@/components/ui/Toast';

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
  const { data: categories = [] } = useCategories();
  const createRule = useCreateRule();
  const { showToast } = useToast();

  const handleCreate = async () => {
    if (!keyword.trim()) return;
    try {
      await createRule.mutateAsync({ categoryId: selectedCategoryId, keyword: keyword.trim() });
      showToast({ type: 'success', title: 'Rule created', message: `"${keyword.trim()}" → ${categoryName}` });
      onClose();
    } catch {
      showToast({ type: 'error', title: 'Failed to create rule' });
    }
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
      </div>
    </Modal>
  );
}
