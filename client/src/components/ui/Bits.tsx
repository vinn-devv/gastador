import { AlertTriangle, CircleAlert, Info, WifiOff, type LucideIcon } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

export function ProgressBar({ percent, tone = 'primary', label, onDark }: { percent: number; tone?: 'primary' | 'mint' | 'warn' | 'bad'; label?: string; onDark?: boolean }) {
  const p = Math.max(0, Math.min(100, percent));
  const color = onDark ? { primary: 'bg-white', mint: 'bg-mint', warn: 'bg-[#FFC857]', bad: 'bg-[#FF8A93]' }[tone] : { primary: 'bg-primary', mint: 'bg-mint', warn: 'bg-warn', bad: 'bg-bad' }[tone];
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full ${onDark ? 'bg-white/20' : 'bg-sunken'}`} role="progressbar" aria-valuenow={Math.round(p)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={`h-full rounded-full transition-[width] duration-500 ease-out ${color}`} style={{ width: `${p}%` }} />
    </div>
  );
}

type BannerTone = 'info' | 'warn' | 'bad' | 'good';

export function Banner({ tone = 'info', icon, title, children, action }: { tone?: BannerTone; icon?: LucideIcon; title?: string; children?: ReactNode; action?: ReactNode }) {
  const styles: Record<BannerTone, string> = {
    info: 'bg-soft text-ink',
    warn: 'bg-warnsoft text-ink',
    bad: 'bg-badsoft text-ink',
    good: 'bg-tealsoft text-ink'
  };
  const iconColor: Record<BannerTone, string> = { info: 'text-primary', warn: 'text-warn', bad: 'text-bad', good: 'text-teal' };
  const Icon = icon ?? (tone === 'bad' ? CircleAlert : tone === 'warn' ? AlertTriangle : Info);
  return (
    <div className={`mb-4 flex gap-3 rounded-md p-3.5 ${styles[tone]}`} role={tone === 'bad' ? 'alert' : 'status'}>
      <Icon size={20} strokeWidth={1.75} className={`mt-0.5 shrink-0 ${iconColor[tone]}`} aria-hidden />
      <div className="min-w-0 flex-1 text-sm">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5 text-muted' : ''}>{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-soft text-primary">
        <Icon size={26} strokeWidth={1.75} aria-hidden />
      </span>
      <h2 className="mb-1">{title}</h2>
      {children && <p className="mb-5 max-w-sm text-muted">{children}</p>}
      {action}
    </div>
  );
}

export function ScreenSkeleton() {
  return (
    <div className="space-y-4 px-4 pt-6" role="status" aria-label="Loading">
      <div className="skeleton h-8 w-40" />
      <div className="skeleton h-44 w-full rounded-lg" />
      <div className="skeleton h-14 w-full" />
      <div className="skeleton h-14 w-full" />
    </div>
  );
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export function OfflineNotice() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-sunken px-4 py-2 text-sm text-muted" role="status">
      <WifiOff size={16} strokeWidth={1.75} aria-hidden />
      <span>You are offline. Everything saved on this device still works.</span>
    </div>
  );
}

export function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'splurge' | 'info' | 'warn' | 'good' }) {
  const styles = {
    neutral: 'bg-sunken text-muted',
    splurge: 'bg-warnsoft text-warn',
    info: 'bg-soft text-primary',
    warn: 'bg-warnsoft text-warn',
    good: 'bg-tealsoft text-teal'
  }[tone];
  return <span className={`tag ${styles}`}>{children}</span>;
}
