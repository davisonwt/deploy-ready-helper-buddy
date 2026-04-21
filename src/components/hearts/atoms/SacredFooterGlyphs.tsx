/**
 * SacredFooterGlyphs — tree of life · clasped hands · lotus heart row.
 * Inline SVGs to keep it crisp + tiny.
 */
export function SacredFooterGlyphs({ className = '' }: { className?: string }) {
  const stroke = 'hsl(var(--th-gold) / 0.7)';
  return (
    <div className={`flex items-center justify-center gap-6 ${className}`}>
      {/* Tree of life */}
      <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none" stroke={stroke} strokeWidth="1.2">
        <circle cx="16" cy="11" r="7" />
        <path d="M16 18v10M11 28h10M16 8v6M12 11h8" />
      </svg>
      {/* Clasped hands */}
      <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none" stroke={stroke} strokeWidth="1.2">
        <path d="M8 22c0-4 3-7 8-7s8 3 8 7" />
        <path d="M11 22c0-2.5 2.2-5 5-5s5 2.5 5 5" />
        <circle cx="16" cy="10" r="3" />
      </svg>
      {/* Lotus heart */}
      <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none" stroke={stroke} strokeWidth="1.2">
        <path d="M16 26s-8-5-8-12a4 4 0 0 1 8-2 4 4 0 0 1 8 2c0 7-8 12-8 12z" fill={stroke} fillOpacity="0.15" />
        <path d="M6 16c2 0 4 2 4 4M26 16c-2 0-4 2-4 4" />
      </svg>
    </div>
  );
}
