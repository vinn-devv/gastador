import { formatMoney, formatMoneyCompact } from "../domain/money";

export interface Datum {
  label: string;
  value: number;
}

export function ColumnChart({ data, title }: { data: Datum[]; title: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const w = 320;
  const h = 150;
  const gap = data.length > 40 ? 1 : 3;
  const bw = Math.max(2, (w - gap * (data.length - 1)) / data.length);
  const every = Math.ceil(data.length / 5);
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <figure>
      <svg
        viewBox={`0 0 ${w} ${h + 22}`}
        className="w-full"
        role="img"
        aria-label={`${title}. Total ${formatMoney(total)} across ${data.length} periods. Highest ${formatMoney(max)}.`}
      >
        <line x1="0" x2={w} y1={h} y2={h} stroke="rgb(var(--line))" />
        <line
          x1="0"
          x2={w}
          y1={h * 0.5}
          y2={h * 0.5}
          stroke="rgb(var(--line))"
          strokeDasharray="3 4"
        />
        {data.map((d, i) => {
          const bh = d.value > 0 ? Math.max(3, (d.value / max) * (h - 6)) : 0;
          const x = i * (bw + gap);
          return (
            <g key={d.label + i}>
              <rect
                x={x}
                y={h - bh}
                width={bw}
                height={bh}
                rx={Math.min(3, bw / 2)}
                fill="rgb(var(--primary))"
              />
              {i % every === 0 && (
                <text x={x} y={h + 16} fontSize="10" fill="rgb(var(--muted))">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
        <text
          x={w}
          y="10"
          fontSize="10"
          textAnchor="end"
          fill="rgb(var(--muted))"
        >
          {formatMoneyCompact(max)}
        </text>
      </svg>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d, i) => (
            <tr key={d.label + i}>
              <th scope="row">{d.label}</th>
              <td>{formatMoney(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function DonutChart({ data, title }: { data: Datum[]; title: string }) {
  const palette = ["#398BFF", "#63A7FF", "#91C5FF", "#B9D9FF", "#2A5D98"];
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <figure aria-label={title}>
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <div className="relative h-44 w-44 shrink-0">
          <svg
            viewBox="0 0 120 120"
            className="h-full w-full -rotate-90"
            role="img"
            aria-label={`${title}: ${formatMoney(total)} total`}
          >
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="rgb(var(--line))"
              strokeWidth="13"
            />
            {total > 0 &&
              data.map((item, index) => {
                const length = Math.max(0, item.value / total) * circumference;
                const dashOffset = offset;
                offset += length;
                return (
                  <circle
                    key={item.label}
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke={palette[index % palette.length]}
                    strokeWidth="13"
                    strokeDasharray={`${length} ${circumference - length}`}
                    strokeDashoffset={-dashOffset}
                  />
                );
              })}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs text-muted">Total spent</span>
            <strong className="num mt-1 text-lg font-semibold text-ink">
              {formatMoney(total)}
            </strong>
          </div>
        </div>
        <ul className="w-full space-y-2.5" aria-label={`${title} legend`}>
          {data.map((item, index) => (
            <li key={item.label} className="flex items-center gap-2.5 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: palette[index % palette.length] }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              <span className="num text-right text-muted">
                {total > 0 ? Math.round((item.value / total) * 100) : 0}%
              </span>
            </li>
          ))}
        </ul>
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((item) => (
            <tr key={item.label}>
              <th scope="row">{item.label}</th>
              <td>{formatMoney(item.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function BarList({ data, title }: { data: Datum[]; title: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="space-y-3.5" aria-label={title}>
      {data.map((d) => (
        <li key={d.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate font-medium">{d.label}</span>
            <span className="num shrink-0 text-sm font-semibold">
              {formatMoney(d.value)}
            </span>
          </div>
          <div
            className="h-2.5 overflow-hidden rounded-full bg-sunken"
            aria-hidden
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
