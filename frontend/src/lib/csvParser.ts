// ============================================================
// CashMosaic — CSV Parser
// Parses any CSV file using a confirmed ColumnMapping.
// ============================================================

import Papa from 'papaparse';
import { toISODate } from './formatters';
import type { ColumnMapping, ParsedTransaction } from './types';

export function parseCSV(file: File): Promise<{ headers: string[]; data: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
      complete: (results) => {
        const headers = results.meta.fields ?? [];
        resolve({ headers, data: results.data });
      },
      error: (err: Error) => reject(err),
    });
  });
}

export function parseCSVPreview(
  file: File,
  rows = 10
): Promise<{ headers: string[]; data: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      preview: rows,
      transformHeader: (h: string) => h.trim(),
      complete: (results) => {
        const headers = results.meta.fields ?? [];
        resolve({ headers, data: results.data });
      },
      error: (err: Error) => reject(err),
    });
  });
}

function parseAmount(raw: string): number {
  if (!raw || raw.trim() === '') return NaN;
  // Remove $, commas, spaces. Handle parentheses as negative: (1,234.56) -> -1234.56
  const cleaned = raw.trim().replace(/[$,\s]/g, '').replace(/^\((.+)\)$/, '-$1');
  return parseFloat(cleaned);
}

export function applyMapping(
  data: Record<string, string>[],
  mapping: ColumnMapping
): ParsedTransaction[] {
  const result: ParsedTransaction[] = [];

  for (const row of data) {
    const dateRaw = row[mapping.dateColumn]?.trim() ?? '';
    const descRaw = row[mapping.descriptionColumn]?.trim() ?? '';

    let amount: number;

    if (mapping.amountType === 'single' && mapping.amountColumn) {
      amount = parseAmount(row[mapping.amountColumn] ?? '');
    } else if (
      mapping.amountType === 'split' &&
      mapping.debitColumn &&
      mapping.creditColumn
    ) {
      const debitRaw = row[mapping.debitColumn]?.trim() ?? '';
      const creditRaw = row[mapping.creditColumn]?.trim() ?? '';
      if (creditRaw !== '' && parseAmount(creditRaw) > 0) {
        amount = parseAmount(creditRaw); // positive = income/credit
      } else if (debitRaw !== '' && parseAmount(debitRaw) > 0) {
        amount = -parseAmount(debitRaw); // negative = expense/debit
      } else {
        continue; // skip row with no amount
      }
    } else {
      continue;
    }

    const isoDate = toISODate(dateRaw);
    if (!isoDate || isNaN(amount)) continue;
    if (descRaw === '') continue;

    const originalCategory = mapping.categoryColumn
      ? (row[mapping.categoryColumn]?.trim() ?? undefined)
      : undefined;

    result.push({
      date: isoDate,
      description: descRaw,
      amount,
      originalCategory,
    });
  }

  return result;
}
