import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { DropZone } from '@/components/upload/DropZone';
import { ColumnMapper } from '@/components/upload/ColumnMapper';
import { PreviewTable } from '@/components/upload/PreviewTable';
import { UploadProgress } from '@/components/upload/UploadProgress';
import { UncategorizedReview } from '@/components/categorization/UncategorizedReview';
import { useUpload } from '@/hooks/useUpload';
import { useCategories } from '@/hooks/useCategories';
import { clsx } from 'clsx';

const STEPS = [
  { id: 'drop', label: 'Upload File', icon: '📂' },
  { id: 'mapping', label: 'Map Columns', icon: '🗺' },
  { id: 'preview', label: 'Preview', icon: '👁' },
  { id: 'importing', label: 'Import', icon: '⚙️' },
  { id: 'done', label: 'Done', icon: '✅' },
] as const;

const stepIndex = (step: string) => STEPS.findIndex(s => s.id === step);

export function UploadPage() {
  const { state, handleFileSelect, handleMappingConfirm, handleImport, reset } = useUpload();
  const { data: categories = [] } = useCategories();

  // Build a simple id->category map for preview
  const catDisplay = Object.fromEntries(
    categories.map(c => [c.id, { name: c.name, icon: c.icon, color: c.color }])
  );

  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    if (state.step === 'done' && (state.preview?.uncategorized ?? 0) > 0) {
      setShowReview(true);
    }
  }, [state.step, state.preview]);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="page-header">Upload Transactions</h1>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {STEPS.slice(0, 4).map((s, i) => {
            const current = stepIndex(state.step);
            const isDone = i < current;
            const isActive = i === current;
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                    isActive
                      ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-600/40'
                      : isDone
                      ? 'bg-green-600/20 text-green-400'
                      : 'bg-slate-700/30 text-slate-500'
                  )}
                >
                  {isDone ? '✓' : s.icon} {s.label}
                </div>
                {i < 3 && <div className="w-4 h-px bg-slate-700 flex-shrink-0" />}
              </div>
            );
          })}
        </div>

        {/* Error */}
        {state.error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {state.error}
          </div>
        )}

        {/* Step content */}
        {state.step === 'drop' && (
          <DropZone onFileSelect={handleFileSelect} />
        )}

        {state.step === 'mapping' && state.mapping && state.file && (
          <ColumnMapper
            headers={state.headers}
            sampleData={state.sampleData}
            initialMapping={state.mapping}
            onConfirm={handleMappingConfirm}
            onBack={reset}
            filename={state.file.name}
          />
        )}

        {state.step === 'preview' && state.preview && (
          <PreviewTable
            preview={state.preview}
            categories={catDisplay}
            onConfirm={handleImport}
            onBack={() => {}}
          />
        )}

        {state.step === 'importing' && state.preview && (
          <UploadProgress
            progress={state.progress}
            total={state.preview.toImport}
          />
        )}

        {state.step === 'done' && (
          <div className="card p-8 text-center space-y-4">
            <div className="text-5xl">🎉</div>
            <h2 className="text-xl font-bold text-slate-100">Import Complete!</h2>
            <p className="text-slate-400">
              <span className="text-green-400 font-semibold">{state.importedCount}</span> transactions imported.
              {(state.preview?.uncategorized ?? 0) > 0 && (
                <> <span className="text-amber-400 font-semibold">{state.preview!.uncategorized}</span> need categories.</>
              )}
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={reset} className="btn-secondary">
                Upload Another File
              </button>
              {(state.preview?.uncategorized ?? 0) > 0 && (
                <button onClick={() => setShowReview(true)} className="btn-primary">
                  Review Uncategorized →
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Uncategorized Review Modal */}
      {showReview && (
        <UncategorizedReview onClose={() => setShowReview(false)} />
      )}
    </AppShell>
  );
}

