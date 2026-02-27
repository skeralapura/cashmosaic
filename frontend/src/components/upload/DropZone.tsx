import { useCallback, useState } from 'react';
import { clsx } from 'clsx';

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  loading?: boolean;
}

export function DropZone({ onFileSelect, loading = false }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please upload a CSV file.');
      return;
    }
    onFileSelect(file);
  }, [onFileSelect]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  }, [handleFile]);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={clsx(
        'relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-150 cursor-pointer',
        isDragging
          ? 'border-indigo-500 bg-indigo-500/10'
          : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/20'
      )}
    >
      <input
        type="file"
        accept=".csv"
        onChange={onInputChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={loading}
      />
      <div className="text-4xl mb-3">{loading ? '⏳' : '📂'}</div>
      <p className="text-slate-200 font-medium text-lg">
        {loading ? 'Reading file...' : 'Drop your CSV file here'}
      </p>
      <p className="text-slate-400 text-sm mt-1">
        {loading ? 'Please wait' : 'or click to browse — any bank export works'}
      </p>
      <p className="text-xs text-slate-600 mt-3">Supports .csv files from any bank or credit card</p>
    </div>
  );
}
