import { useMemo } from 'react';
import { useBooksCurrency } from '@/lib/books/currency';

interface Source {
  label: string;
  amount: number;
}

interface Props {
  /** Paid invoices, grouped by client. */
  inflows: Source[];
  /** Expenses, grouped by category. */
  outflows: Source[];
  net: number;
}

const IN_COLOR = 'hsl(152 70% 50%)';
const OUT_COLOR = 'hsl(20 90% 62%)';

/**
 * "Money river" — an animated SVG showing money flowing from paying clients,
 * through the business, out to expense categories.
 */
export default function MoneyRiver({ inflows, outflows, net }: Props) {
  const { fmt, currency, symbol } = useBooksCurrency();
  const W = 900;
  const H = 360;
  const CX = W / 2;
  const CY = H / 2;

  const left = useMemo(
    () => inflows.filter((s) => s.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 5),
    [inflows]
  );
  const right = useMemo(
    () => outflows.filter((s) => s.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 6),
    [outflows]
  );

  const maxIn = Math.max(1, ...left.map((s) => s.amount));
  const maxOut = Math.max(1, ...right.map((s) => s.amount));

  const yFor = (i: number, count: number) => {
    if (count <= 1) return CY;
    const top = 48;
    const bottom = H - 48;
    return top + ((bottom - top) * i) / (count - 1);
  };

  const width = (amount: number, max: number) => 2 + (amount / max) * 16;

  if (left.length === 0 && right.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-border/60 bg-card/40 text-sm text-muted-foreground">
        No money has flowed yet — mark an invoice paid or log an expense to fill the river.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-border/60 bg-card/40 p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[320px] w-full min-w-[680px]" role="img"
        aria-label="Animated diagram of money flowing from paid invoices through the business to expense categories">
        <defs>
          <linearGradient id="riverIn" x1="0" x2="1">
            <stop offset="0%" stopColor={IN_COLOR} stopOpacity="0.15" />
            <stop offset="100%" stopColor={IN_COLOR} stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="riverOut" x1="0" x2="1">
            <stop offset="0%" stopColor={OUT_COLOR} stopOpacity="0.85" />
            <stop offset="100%" stopColor={OUT_COLOR} stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {left.map((s, i) => {
          const y = yFor(i, left.length);
          const d = `M 150 ${y} C ${CX - 140} ${y}, ${CX - 120} ${CY}, ${CX - 62} ${CY}`;
          return (
            <g key={`in-${s.label}-${i}`}>
              <path d={d} fill="none" stroke="url(#riverIn)" strokeWidth={width(s.amount, maxIn)} strokeLinecap="round" />
              <circle r="4" fill={IN_COLOR}>
                <animateMotion dur={`${2.6 + i * 0.35}s`} repeatCount="indefinite" path={d} />
              </circle>
              <text x="140" y={y - 10} textAnchor="end" className="fill-foreground" fontSize="13">{s.label}</text>
              <text x="140" y={y + 8} textAnchor="end" fill={IN_COLOR} fontSize="12">{fmt(s.amount)}</text>
            </g>
          );
        })}

        {right.map((s, i) => {
          const y = yFor(i, right.length);
          const d = `M ${CX + 62} ${CY} C ${CX + 120} ${CY}, ${CX + 140} ${y}, ${W - 150} ${y}`;
          return (
            <g key={`out-${s.label}-${i}`}>
              <path d={d} fill="none" stroke="url(#riverOut)" strokeWidth={width(s.amount, maxOut)} strokeLinecap="round" />
              <circle r="4" fill={OUT_COLOR}>
                <animateMotion dur={`${2.4 + i * 0.3}s`} repeatCount="indefinite" path={d} />
              </circle>
              <text x={W - 140} y={y - 10} className="fill-foreground" fontSize="13">{s.label}</text>
              <text x={W - 140} y={y + 8} fill={OUT_COLOR} fontSize="12">{fmt(s.amount)}</text>
            </g>
          );
        })}

        <circle cx={CX} cy={CY} r="58" className="fill-card" stroke="hsl(var(--primary))" strokeWidth="2" />
        <circle cx={CX} cy={CY} r="58" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" opacity="0.35">
          <animate attributeName="r" values="58;70;58" dur="3.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.35;0;0.35" dur="3.2s" repeatCount="indefinite" />
        </circle>
        <text x={CX} y={CY - 6} textAnchor="middle" className="fill-muted-foreground" fontSize="11">NET</text>
        <text x={CX} y={CY + 14} textAnchor="middle" fill={net >= 0 ? IN_COLOR : OUT_COLOR} fontSize="15" fontWeight="600">
          {fmt(net)}
        </text>
      </svg>
    </div>
  );
}
