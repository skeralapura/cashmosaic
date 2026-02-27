import { ProgressBar } from '@/components/ui/ProgressBar';
import { Spinner } from '@/components/ui/Spinner';

interface UploadProgressProps {
  progress: number;
  total: number;
}

export function UploadProgress({ progress, total }: UploadProgressProps) {
  const imported = Math.round((progress / 100) * total);

  return (
    <div className="card p-8 text-center space-y-4">
      <div className="flex justify-center">
        <Spinner size="lg" />
      </div>
      <h3 className="text-lg font-semibold text-slate-100">Importing transactions...</h3>
      <p className="text-slate-400 text-sm">
        {imported} / {total} rows imported
      </p>
      <ProgressBar value={progress} animated showLabel />
    </div>
  );
}
