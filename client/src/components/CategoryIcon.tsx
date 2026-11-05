import { Bus, Ellipsis, GraduationCap, HeartPulse, ReceiptText, Tag, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { STANDARD_CATEGORIES } from '../domain/categories';

const ICONS: Record<string, LucideIcon> = {
  food: UtensilsCrossed,
  transport: Bus,
  school: GraduationCap,
  bills: ReceiptText,
  personal: HeartPulse,
  others: Ellipsis
};

export function categoryKey(name: string): string | null {
  return STANDARD_CATEGORIES.find((d) => d.match.test(name))?.key ?? null;
}

export function CategoryIcon({ name, size = 20 }: { name: string; size?: number }) {
  const key = categoryKey(name);
  const Icon = (key && ICONS[key]) || Tag;
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-soft text-primary">
      <Icon size={size} strokeWidth={1.75} aria-hidden />
    </span>
  );
}
