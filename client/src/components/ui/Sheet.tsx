import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

interface SheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function Sheet({ title, onClose, children, footer }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="flex items-center justify-between px-5 pb-2 pt-4">
        <h2>{title}</h2>
        <button type="button" className="iconbtn -mr-2" onClick={onClose} aria-label="Close">
          <X size={22} strokeWidth={1.75} aria-hidden />
        </button>
      </div>
      <div className="px-5 pb-5">{children}</div>
      {footer && <div className="safe-bottom border-t border-line px-5 py-3">{footer}</div>}
    </dialog>
  );
}

interface ConfirmProps {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmSheet({ title, message, confirmLabel, danger, busy, onConfirm, onCancel }: ConfirmProps) {
  return (
    <Sheet title={title} onClose={onCancel}>
      <p className="mb-5 text-muted">{message}</p>
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <button type="button" className={`btn flex-1 ${danger ? 'btn-primary !bg-bad !text-white' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
          {busy ? 'Working…' : confirmLabel}
        </button>
        <button type="button" className="btn btn-secondary flex-1" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </Sheet>
  );
}
