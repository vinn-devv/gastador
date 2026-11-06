import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface PageHeaderProps {
  title: string;
  back?: boolean | string;
  action?: ReactNode;
  subtitle?: string;
}

export function PageHeader({ title, back, action, subtitle }: PageHeaderProps) {
  const navigate = useNavigate();
  return (
    <header className="page-heading safe-top">
      <div className="page-heading__inner">
        {back && (
          <button
            type="button"
            className="iconbtn page-heading__back"
            onClick={() => (typeof back === "string" ? navigate(back) : navigate(-1))}
            aria-label="Back"
          >
            <ChevronLeft size={24} strokeWidth={1.75} aria-hidden />
          </button>
        )}
        <div className="page-heading__copy">
          <h1 className="truncate">{title}</h1>
          {subtitle && <p className="truncate">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

export function Page({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={"page-container " + className}>{children}</div>;
}

export function Section({
  title, action, children, className = "",
}: {
  title?: string; action?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={"mb-6 " + className}>
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
