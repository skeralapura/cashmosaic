import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { parseCSV, parseCSVPreview, applyMapping } from '@/lib/csvParser';
import { autoDetectColumns } from '@/lib/columnAutoDetect';
import { evaluateExclusion } from '@/lib/exclusionEngine';
import { categorize, buildSortedRules } from '@/lib/categorizer';
import { computeRowHash } from '@/lib/duplicateDetector';
import type {
  ColumnMapping,
  UploadStep,
  ProcessedTransaction,
  UploadPreview,
  ExclusionRule,
  CategoryRule,
  Category,
} from '@/lib/types';
import { UPLOAD_BATCH_SIZE } from '@/lib/constants';
import { useAuthContext } from '@/context/AuthContext';

interface UploadState {
  step: UploadStep;
  file: File | null;
  headers: string[];
  sampleData: Record<string, string>[];
  mapping: ColumnMapping | null;
  processed: ProcessedTransaction[];
  preview: UploadPreview | null;
  progress: number;
  error: string | null;
  importedCount: number;
  accountId: string | null;
}

const initial: UploadState = {
  step: 'drop',
  file: null,
  headers: [],
  sampleData: [],
  mapping: null,
  processed: [],
  preview: null,
  progress: 0,
  error: null,
  importedCount: 0,
  accountId: null,
};

export function useUpload() {
  const [state, setState] = useState<UploadState>(initial);
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  const updateState = useCallback((updates: Partial<UploadState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const reset = useCallback(() => setState(initial), []);

  // Step 1: File selected — parse headers and preview
  const handleFileSelect = useCallback(async (file: File) => {
    try {
      const { headers, data } = await parseCSVPreview(file, 20);
      const autoDetect = autoDetectColumns(headers, data);

      updateState({
        step: 'mapping',
        file,
        headers,
        sampleData: data,
        // Pre-fill mapping from auto-detection
        mapping: {
          dateColumn: autoDetect.dateColumn.column,
          descriptionColumn: autoDetect.descriptionColumn.column,
          amountType: autoDetect.amountType,
          amountColumn: autoDetect.amountColumn?.column,
          debitColumn: autoDetect.debitColumn?.column,
          creditColumn: autoDetect.creditColumn?.column,
          categoryColumn: autoDetect.categoryColumn?.column,
          accountName: '',
          accountType: 'bank',
          institution: '',
        },
        error: null,
      });
    } catch (err) {
      updateState({ error: `Failed to read file: ${(err as Error).message}` });
    }
  }, [updateState]);

  // Step 2: Mapping confirmed — process all rows
  const handleMappingConfirm = useCallback(async (mapping: ColumnMapping) => {
    if (!state.file || !user) return;

    updateState({ step: 'preview', mapping, error: null });

    try {
      // Full parse
      const { data: allData } = await parseCSV(state.file);

      // Apply column mapping
      const parsed = applyMapping(allData, mapping);

      // Load exclusion rules and category rules from Supabase
      const [{ data: exclusionRules }, { data: globalRules }, { data: userRules }, { data: categories }] =
        await Promise.all([
          supabase.from('exclusion_rules').select('*').eq('user_id', user.id),
          supabase.from('category_rules').select('*').is('user_id', null),
          supabase.from('category_rules').select('*').eq('user_id', user.id),
          supabase.from('categories').select('*'),
        ]);

      const sortedRules = buildSortedRules(
        (globalRules ?? []) as CategoryRule[],
        (userRules ?? []) as CategoryRule[]
      );

      const categoryNameToId: Record<string, string> = {};
      for (const cat of (categories ?? []) as Category[]) {
        categoryNameToId[cat.name] = cat.id;
      }

      // Get or create account
      let accountId = state.accountId;
      if (!accountId) {
        const { data: existing } = await supabase
          .from('accounts')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', mapping.accountName)
          .maybeSingle();

        if (existing) {
          accountId = existing.id;
        } else {
          const { data: created, error: createErr } = await supabase
            .from('accounts')
            .insert({
              user_id: user.id,
              name: mapping.accountName,
              type: mapping.accountType,
              institution: mapping.institution,
            })
            .select()
            .single();
          if (createErr) throw createErr;
          accountId = created.id;
        }
      }

      // Process each transaction
      const processed: ProcessedTransaction[] = [];
      const exclusionBreakdown: Record<string, number> = {};

      for (const tx of parsed) {
        const exclusion = evaluateExclusion(tx, (exclusionRules ?? []) as ExclusionRule[], accountId!);
        const categoryId = exclusion.isExcluded ? null : categorize(
          tx.description,
          sortedRules,
          categoryNameToId,
          tx.originalCategory
        );
        const rowHash = await computeRowHash(accountId!, tx.date, tx.amount, tx.description);

        if (exclusion.isExcluded && exclusion.reason) {
          exclusionBreakdown[exclusion.reason] = (exclusionBreakdown[exclusion.reason] ?? 0) + 1;
        }

        processed.push({
          ...tx,
          accountId: accountId!,
          categoryId,
          isExcluded: exclusion.isExcluded,
          excludeReason: exclusion.reason ?? null,
          rowHash,
          sourceFile: state.file!.name,
        });
      }

      // Pre-flight duplicate check
      const allHashes = processed.map(p => p.rowHash);
      const { data: existingHashes } = await supabase
        .from('transactions')
        .select('row_hash')
        .eq('user_id', user.id)
        .in('row_hash', allHashes);

      const existingSet = new Set((existingHashes ?? []).map((h: { row_hash: string }) => h.row_hash));
      const duplicateCount = processed.filter(p => existingSet.has(p.rowHash)).length;

      const excluded = processed.filter(p => p.isExcluded).length;
      const uncategorized = processed.filter(
        p => !p.isExcluded && (p.categoryId === categoryNameToId['Uncategorized'] || !p.categoryId)
      ).length;

      const preview: UploadPreview = {
        total: processed.length,
        excluded,
        duplicate: duplicateCount,
        toImport: processed.length - excluded - duplicateCount,
        uncategorized,
        sampleRows: processed.slice(0, 10),
        exclusionBreakdown,
      };

      updateState({ processed, preview, accountId, error: null });
    } catch (err) {
      updateState({ error: `Processing failed: ${(err as Error).message}` });
    }
  }, [state.file, state.accountId, user, updateState]);

  // Step 3: Import confirmed
  const handleImport = useCallback(async () => {
    if (!state.processed.length || !user) return;

    updateState({ step: 'importing', progress: 0, error: null });

    try {
      const toImport = state.processed.filter(p => !p.isExcluded);
      const total = toImport.length;
      let imported = 0;
      let duplicates = 0;

      for (let i = 0; i < toImport.length; i += UPLOAD_BATCH_SIZE) {
        const batch = toImport.slice(i, i + UPLOAD_BATCH_SIZE);
        const rows = batch.map(tx => ({
          user_id: user.id,
          account_id: tx.accountId,
          date: tx.date,
          description: tx.description,
          amount: tx.amount,
          category_id: tx.categoryId,
          original_category: tx.originalCategory ?? null,
          is_excluded: false,
          source_file: tx.sourceFile,
          column_mapping: state.mapping,
          row_hash: tx.rowHash,
        }));

        const { error } = await supabase
          .from('transactions')
          .upsert(rows, { onConflict: 'row_hash', ignoreDuplicates: true });

        if (error) throw error;
        imported += batch.length;
        updateState({ progress: Math.round((imported / total) * 100) });
      }

      // Also insert excluded transactions (so they're stored but flagged)
      const excluded = state.processed.filter(p => p.isExcluded);
      for (let i = 0; i < excluded.length; i += UPLOAD_BATCH_SIZE) {
        const batch = excluded.slice(i, i + UPLOAD_BATCH_SIZE);
        await supabase.from('transactions').upsert(
          batch.map(tx => ({
            user_id: user.id,
            account_id: tx.accountId,
            date: tx.date,
            description: tx.description,
            amount: tx.amount,
            category_id: null,
            is_excluded: true,
            exclude_reason: tx.excludeReason,
            source_file: tx.sourceFile,
            column_mapping: state.mapping,
            row_hash: tx.rowHash,
          })),
          { onConflict: 'row_hash', ignoreDuplicates: true }
        );
      }

      // Write upload log
      const preview = state.preview!;
      await supabase.from('upload_logs').insert({
        user_id: user.id,
        account_id: state.accountId,
        filename: state.file!.name,
        column_mapping: state.mapping,
        rows_total: preview.total,
        rows_excluded: preview.excluded,
        rows_duplicate: duplicates,
        rows_imported: preview.toImport - duplicates,
        rows_uncategorized: preview.uncategorized,
        status: 'success',
      });

      // Invalidate all data-dependent queries
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions_recent'] });
      queryClient.invalidateQueries({ queryKey: ['transactions_uncategorized'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['monthly_summary'] });
      queryClient.invalidateQueries({ queryKey: ['category_totals'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });

      updateState({ step: 'done', importedCount: preview.toImport - duplicates });
    } catch (err) {
      updateState({ error: `Import failed: ${(err as Error).message}`, step: 'preview' });
    }
  }, [state, user, queryClient, updateState]);

  return {
    state,
    handleFileSelect,
    handleMappingConfirm,
    handleImport,
    reset,
    updateState,
  };
}
