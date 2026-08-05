import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';
export type Toast = { id: number; message: string; type: ToastType };

let toastId = 0;
const listeners = new Set<(toasts: Toast[]) => void>();
let toasts: Toast[] = [];

export function showToast(message: string, type: ToastType = 'success') {
  const id = ++toastId;
  toasts = [...toasts, { id, message, type }];
  listeners.forEach((fn) => fn(toasts));
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    listeners.forEach((fn) => fn(toasts));
  }, 3500);
}

export function ToastContainer() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    const fn = (next: Toast[]) => setItems(next);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-amber-600" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    info: <AlertCircle className="w-5 h-5 text-stone-500" />,
  };

  return (
    <div className="fixed bottom-4 right-4 z-[60] space-y-2 pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-3 bg-white border border-stone-200 rounded-xl shadow-lg px-4 py-3 pr-6 min-w-[280px] animate-slide-in"
        >
          {icons[t.type]}
          <span className="text-sm text-stone-700 font-medium">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
