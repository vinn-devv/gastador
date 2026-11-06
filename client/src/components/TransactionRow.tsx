import { Link } from "react-router-dom";
import { formatDate, formatTime } from "../domain/dates";
import { formatMoney } from "../domain/money";
import { methodLabel, type Transaction } from "../domain/types";
import { CategoryIcon } from "./CategoryIcon";
import { Tag } from "./ui/Bits";

interface Props {
  tx: Transaction;
  categoryName: string;
  showDate?: boolean;
  to?: string;
}

export function TransactionRow({ tx, categoryName, showDate, to }: Props) {
  return (
    <Link to={to ?? "/activity/" + tx.id} className="finance-transaction">
      <span className="finance-transaction__icon"><CategoryIcon name={categoryName} size={19} /></span>
      <span className="finance-transaction__copy">
        <span className="finance-transaction__title">
          <strong>{tx.merchant}</strong>
          {tx.isSplurge && <Tag tone="splurge">Splurge</Tag>}
        </span>
        <small>
          {showDate
            ? categoryName + " · " + formatDate(tx.date, false)
            : categoryName + " · " + methodLabel(tx.paymentMethod) + " · " + formatTime(tx.occurredAt)}
        </small>
      </span>
      <span className="finance-transaction__amount num">
        <span aria-hidden="true">−</span><span className="sr-only">Expense </span>{formatMoney(tx.amountCentavos)}
      </span>
    </Link>
  );
}
