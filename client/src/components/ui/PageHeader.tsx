import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  back?: boolean | string;
  action?: ReactNode;
  subtitle?: string;
}

export function PageHeader({ title, back, action, subtitle }: PageHeaderProps) {
  const navigate = useNavigate();
  return (
    <header className="safe-top sticky top-0 z-30 border-b border-line bg-bg">
      <div className="mx-auto flex min-h-[64px] w-full max-w-[1440px] items-center gap-1 px-4 py-2 md:px-8 xl:px-10">
        {back && (
          <button type="button" className="iconbtn -ml-3" onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))} aria-label="Back">
            <ChevronLeft size={26} strokeWidth={1.75} aria-hidden />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate">{title}</h1>
          {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

export function Page({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`page-container ${className}`}>{children}</div>;
}

export function Section({ title, action, children, className = '' }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`mb-6 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-4">
          {title && <h2>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
