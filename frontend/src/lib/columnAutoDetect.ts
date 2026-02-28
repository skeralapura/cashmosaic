// ============================================================
// CashMosaic — Smart Column Auto-Detection
// Heuristically identifies which columns map to required fields
// from any bank's CSV export.
// ============================================================

import { parseDateString } from './formatters';
import type { AutoDetectResult, DetectionConfidence, AmountColumnType } from './types';

// Header keyword hints (case-insensitive match)
const DATE_HINTS = ['date', 'posting date', 'transaction date', 'post date', 'trans date', 'value date'];
const DESC_HINTS = ['description', 'memo', 'merchant', 'narrative', 'payee', 'reference', 'name'];
const AMOUNT_HINTS = ['amount', 'amt', 'transaction amount'];
const DEBIT_HINTS = ['debit', 'charge', 'withdrawal', 'dr', 'debit amount'];
const CREDIT_HINTS = ['credit', 'deposit', 'payment', 'cr', 'credit amount'];
const CATEGORY_HINTS = ['category', 'type', 'class', 'transaction type', 'merchant category'];

// Validation thresholds
const DATE_THRESHOLD = 0.75;
const NUMBER_THRESHOLD = 0.75;

function scoreHeader(header: string, hints: string[]): number {
  const h = header.trim().toLowerCase();
  for (const hint of hints) {
    if (h === hint) return 1.0;               // exact match
    if (h.includes(hint)) return 0.8;         // contains hint
    if (hint.includes(h) && h.length > 2) return 0.6; // hint contains header
  }
  return 0;
}

function validateDateColumn(values: string[]): boolean {
  const nonEmpty = values.filter(v => v?.trim());
  if (nonEmpty.length === 0) return false;
  const parseable = nonEmpty.filter(v => parseDateString(v) !== null);
  return parseable.length / nonEmpty.length >= DATE_THRESHOLD;
}

function validateNumberColumn(values: string[]): boolean {
  const nonEmpty = values.filter(v => v?.trim());
  if (nonEmpty.length === 0) return false;
  const numeric = nonEmpty.filter(v => {
    const cleaned = v.replace(/[$,\s()]/g, '').replace(/^\((.+)\)$/, '-$1');
    return !isNaN(parseFloat(cleaned)) && cleaned !== '';
  });
  return numeric.length / nonEmpty.length >= NUMBER_THRESHOLD;
}

function validateTextColumn(values: string[]): boolean {
  const nonEmpty = values.filter(v => v?.trim());
  if (nonEmpty.length === 0) return false;
  // Not all numeric
  const allNumeric = nonEmpty.every(v => !isNaN(parseFloat(v.replace(/[$,]/g, ''))));
  const hasReasonableLength = nonEmpty.some(v => v.trim().length > 5);
  return !allNumeric && hasReasonableLength;
}

function getConfidenceLevel(score: number, validated: boolean): 'high' | 'medium' | 'low' | 'none' {
  if (score >= 0.8 && validated) return 'high';
  if (score >= 0.6 && validated) return 'medium';
  if (score > 0 && validated) return 'low';
  if (score >= 0.8) return 'medium'; // good header match but unvalidated
  return 'none';
}

function detectBestColumn(
  headers: string[],
  sampleData: Record<string, string>[],
  hints: string[],
  validator: (values: string[]) => boolean
): DetectionConfidence {
  let bestHeader = '';
  let bestScore = 0;

  for (const header of headers) {
    const score = scoreHeader(header, hints);
    if (score > bestScore) {
      bestScore = score;
      bestHeader = header;
    }
  }

  if (bestHeader === '') {
    // Try validation-only approach for any column
    for (const header of headers) {
      const values = sampleData.map(row => row[header] ?? '');
      if (validator(values)) {
        return { column: header, confidence: 'low', reason: 'Inferred from data values only' };
      }
    }
    return { column: '', confidence: 'none', reason: 'Could not detect column' };
  }

  const values = sampleData.map(row => row[bestHeader] ?? '');
  const validated = validator(values);

  return {
    column: bestHeader,
    confidence: getConfidenceLevel(bestScore, validated),
    reason: validated
      ? `Header matches "${bestHeader}" and data validates`
      : `Header matches "${bestHeader}" but data validation uncertain`,
  };
}

export function autoDetectColumns(
  headers: string[],
  sampleData: Record<string, string>[]
): AutoDetectResult {
  const dateResult = detectBestColumn(headers, sampleData, DATE_HINTS, validateDateColumn);
  const descResult = detectBestColumn(headers, sampleData, DESC_HINTS, validateTextColumn);

  // Detect amount columns
  const amountResult = detectBestColumn(headers, sampleData, AMOUNT_HINTS, validateNumberColumn);
  const debitResult = detectBestColumn(headers, sampleData, DEBIT_HINTS, validateNumberColumn);
  const creditResult = detectBestColumn(headers, sampleData, CREDIT_HINTS, validateNumberColumn);
  const categoryResult = detectBestColumn(headers, sampleData, CATEGORY_HINTS, validateTextColumn);

  // Determine amount type: prefer split if both debit+credit detected with high confidence
  const hasSplitColumns =
    debitResult.confidence !== 'none' && creditResult.confidence !== 'none';
  const hasSingleColumn = amountResult.confidence !== 'none';

  let amountType: AmountColumnType = 'single';
  if (hasSplitColumns && (!hasSingleColumn || debitResult.confidence === 'high')) {
    amountType = 'split';
  }

  const result: AutoDetectResult = {
    dateColumn: dateResult,
    descriptionColumn: descResult,
    amountType,
    categoryColumn: categoryResult.confidence !== 'none' ? categoryResult : undefined,
  };

  if (amountType === 'single') {
    result.amountColumn = amountResult;
  } else {
    result.debitColumn = debitResult;
    result.creditColumn = creditResult;
  }

  return result;
}

export function validateMapping(
  _headers: string[],
  sampleData: Record<string, string>[],
  mapping: {
    dateColumn: string;
    descriptionColumn: string;
    amountType: AmountColumnType;
    amountColumn?: string;
    debitColumn?: string;
    creditColumn?: string;
  }
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  // Validate date column
  if (!mapping.dateColumn) {
    errors.dateColumn = 'Date column is required.';
  } else {
    const values = sampleData.map(row => row[mapping.dateColumn] ?? '');
    if (!validateDateColumn(values)) {
      errors.dateColumn = "Date column contains values we can't parse as dates. Try a different column.";
    }
  }

  // Validate description column
  if (!mapping.descriptionColumn) {
    errors.descriptionColumn = 'Description column is required.';
  }

  // Validate amount columns
  if (mapping.amountType === 'single') {
    if (!mapping.amountColumn) {
      errors.amountColumn = 'Amount column is required.';
    } else {
      const values = sampleData.map(row => row[mapping.amountColumn!] ?? '');
      if (!validateNumberColumn(values)) {
        errors.amountColumn = 'Amount column contains non-numeric values. Try a different column.';
      }
    }
  } else {
    if (!mapping.debitColumn) {
      errors.debitColumn = 'Debit column is required.';
    }
    if (!mapping.creditColumn) {
      errors.creditColumn = 'Credit column is required.';
    }
    if (mapping.debitColumn) {
      const values = sampleData.map(row => row[mapping.debitColumn!] ?? '');
      if (!validateNumberColumn(values.filter(v => v !== ''))) {
        errors.debitColumn = 'Debit column contains non-numeric values.';
      }
    }
    if (mapping.creditColumn) {
      const values = sampleData.map(row => row[mapping.creditColumn!] ?? '');
      if (!validateNumberColumn(values.filter(v => v !== ''))) {
        errors.creditColumn = 'Credit column contains non-numeric values.';
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
