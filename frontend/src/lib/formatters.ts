// ============================================================
// CashMosaic — Formatting Utilities
// ============================================================

import { format, parseISO, isValid } from 'date-fns';

export function formatCurrency(amount: number, showSign = false): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);

  if (showSign) {
    return amount >= 0 ? `+${formatted}` : `-${formatted}`;
  }
  return formatted;
}

export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(dateStr: string, fmt = 'MMM d, yyyy'): string {
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    return format(date, fmt);
  } catch {
    return dateStr;
  }
}

export function formatMonthLabel(dateStr: string): string {
  return formatDate(dateStr, 'MMM yyyy');
}

export function formatShortDate(dateStr: string): string {
  return formatDate(dateStr, 'MMM d');
}

export function formatCompactCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

export function parseDateString(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Try common formats
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,  // MM/DD/YYYY or M/D/YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/,          // YYYY-MM-DD
  ];

  for (const fmt of formats) {
    const match = dateStr.trim().match(fmt);
    if (match) {
      if (fmt === formats[0]) {
        // MM/DD/YYYY
        const [, month, day, year] = match;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (isValid(date)) return date;
      } else {
        // YYYY-MM-DD
        const date = parseISO(dateStr.trim());
        if (isValid(date)) return date;
      }
    }
  }

  // Last resort: native Date
  const d = new Date(dateStr);
  return isValid(d) ? d : null;
}

export function toISODate(dateStr: string): string | null {
  const d = parseDateString(dateStr);
  if (!d) return null;
  return format(d, 'yyyy-MM-dd');
}
