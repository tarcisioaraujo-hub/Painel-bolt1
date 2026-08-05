import { useEffect } from 'react';
import { X } from 'lucide-react';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
};

export default function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass = size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={`relative w-full ${sizeClass} max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl animate-scale-in`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-base font-semibold text-stone-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
