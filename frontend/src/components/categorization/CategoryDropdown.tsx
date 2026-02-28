import { useCategories } from '@/hooks/useCategories';
import type { Category } from '@/lib/types';

interface CategoryDropdownProps {
  value: string | null;
  onChange: (categoryId: string) => void;
  className?: string;
  placeholder?: string;
}

export function CategoryDropdown({ value, onChange, className = '', placeholder = 'Select category...' }: CategoryDropdownProps) {
  const { data: categories = [] } = useCategories();

  // Split into top-level parents and sub-categories
  const parents = categories.filter(c => c.parent_id === null);
  const childrenByParent = new Map<string, Category[]>();
  for (const c of categories) {
    if (c.parent_id) {
      const arr = childrenByParent.get(c.parent_id) ?? [];
      arr.push(c);
      childrenByParent.set(c.parent_id, arr);
    }
  }

  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      className={`input text-sm ${className}`}
    >
      <option value="">{placeholder}</option>
      {parents.map((parent: Category) => {
        const children = childrenByParent.get(parent.id) ?? [];
        if (children.length === 0) {
          return (
            <option key={parent.id} value={parent.id}>
              {parent.icon} {parent.name}
            </option>
          );
        }
        // Has sub-categories: render as optgroup
        return (
          <optgroup key={parent.id} label={`${parent.icon} ${parent.name}`}>
            <option value={parent.id}>{parent.icon} {parent.name}</option>
            {children.map(child => (
              <option key={child.id} value={child.id}>
                {'  ↳ '}{child.icon} {child.name}
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}
