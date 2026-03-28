'use client';

import { useToastStore, type Toast } from '@/stores/use-toast-store';

const TYPE_STYLES: Record<string, string> = {
  success: 'border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-200',
  warning: 'border-yellow-500 bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200',
  error: 'border-red-500 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-200',
  info: 'border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-200',
};

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  return (
    <div
      className={`border-l-4 rounded-r-lg p-3 shadow-lg max-w-sm animate-in slide-in-from-right ${TYPE_STYLES[toast.type] || TYPE_STYLES.info}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{toast.title}</p>
          <p className="text-xs mt-0.5 opacity-80">{toast.message}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-current opacity-50 hover:opacity-100 text-sm"
        >
          &times;
        </button>
      </div>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}
