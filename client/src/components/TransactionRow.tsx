import { Link } from 'react-router-dom';
import { formatDate, formatTime } from '../domain/dates';
import { formatMoney } from '../domain/money';
import { methodLabel, type Transaction } from '../domain/types';
import { CategoryIcon } from './CategoryIcon';
import { Tag } from './ui/Bits';

interface Props {
  tx: Transaction;
  categoryName: string;
  showDate?: boolean;
  to?: string;
}

export function TransactionRow({ tx, categoryName, showDate, to }: Props) {
  return (
    <Link to={to ?? `/activity/${tx.id}`} className="flex min-h-[64px] items-center gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-sunken active:bg-sunken">
      <CategoryIcon name={categoryName} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-medium">{tx.merchant}</span>
          {tx.isSplurge && <Tag tone="splurge">Splurge</Tag>}
        </span>
        <span className="block truncate text-sm text-muted">
          {showDate ? `${categoryName} · ${formatDate(tx.date, false)}` : `${categoryName} · ${methodLabel(tx.paymentMethod)} · ${formatTime(tx.occurredAt)}`}
        </span>
      </span>
      <span className="num shrink-0 font-semibold"><span aria-hidden="true">−</span><span className="sr-only">Expense </span>{formatMoney(tx.amountCentavos)}</span>
    </Link>
  );
}
