import { CheckCircle2, CircleAlert } from 'lucide-react';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

type ToastKind = 'success' | 'error';
interface ToastState {
  id: number;
  message: string;
  kind: ToastKind;
}

const ToastContext = createContext<(message: string, kind?: ToastKind) => void>(() => undefined);
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<number>();
  const push = useCallback((message: string, kind: ToastKind = 'success') => {
    window.clearTimeout(timer.current);
    setToast({ id: Date.now(), message, kind });
    timer.current = window.setTimeout(() => setToast(null), 3800);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-nav z-[70] flex justify-center px-4 pb-3 md:bottom-6 md:pb-0">
        {toast && (
          <div key={toast.id} className="pointer-events-auto flex max-w-md items-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-medium text-bg shadow-lift" style={{ animation: 'toast-in 220ms cubic-bezier(0.22,1,0.36,1)' }}>
            {toast.kind === 'success' ? <CheckCircle2 size={18} strokeWidth={1.75} aria-hidden /> : <CircleAlert size={18} strokeWidth={1.75} aria-hidden />}
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
