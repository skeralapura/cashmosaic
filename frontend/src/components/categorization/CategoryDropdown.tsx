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

  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      className={`input text-sm ${className}`}
    >
      <option value="">{placeholder}</option>
      {categories.map((cat: Category) => (
        <option key={cat.id} value={cat.id}>
          {cat.icon} {cat.name}
        </option>
      ))}
    </select>
  );
}
