import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  color?: string;    // hex color
  className?: string;
  variant?: 'solid' | 'subtle';
}

export function Badge({ children, color, className, variant = 'subtle' }: BadgeProps) {
  if (color) {
    const bgColor = variant === 'solid' ? color : `${color}22`;
    const textColor = variant === 'solid' ? '#fff' : color;
    return (
      <span
        className={clsx('badge', className)}
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        {children}
      </span>
    );
  }

  return (
    <span className={clsx('badge bg-slate-700 text-slate-300', className)}>
      {children}
    </span>
  );
}
