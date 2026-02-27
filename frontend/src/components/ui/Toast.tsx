import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ToastMessage } from '@/lib/types';

interface ToastContextValue {
  toasts: ToastMessage[];
  showToast: (msg: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((msg: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    const toast: ToastMessage = { ...msg, id };
    setToasts(prev => [...prev, toast]);

    // Auto-dismiss after 5s (longer if has action)
    const delay = msg.action ? 8000 : 5000;
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, delay);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const typeStyles = {
  success: 'border-green-500/30 bg-green-500/10 text-green-400',
  error: 'border-red-500/30 bg-red-500/10 text-red-400',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  info: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400',
};

const icons = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`card border animate-slide-up ${typeStyles[toast.type]} p-4 flex items-start gap-3 shadow-xl`}
        >
          <span className="text-lg flex-shrink-0">{icons[toast.type]}</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-slate-100">{toast.title}</p>
            {toast.message && (
              <p className="text-xs text-slate-400 mt-0.5">{toast.message}</p>
            )}
            {toast.action && (
              <button
                onClick={() => {
                  toast.action!.onClick();
                  onDismiss(toast.id);
                }}
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300 mt-1 underline"
              >
                {toast.action.label}
              </button>
            )}
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-slate-500 hover:text-slate-300 flex-shrink-0"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
