import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Check } from 'lucide-react';

export interface OnePickerOption {
  value: string;
  label: string;
}

interface Props {
  label: string;
  placeholder?: string;
  /** localStorage key this picker's last choice is remembered under, e.g. "sow:lastGenre". */
  storageKey: string;
  options: OnePickerOption[];
  value: string | null;
  onChange: (value: string) => void;
}

/**
 * Single-select, searchable, with the sower's last choice pinned to the
 * top — spec-sowing-forms.md's "one picker for 'where does this belong'".
 * Replaces free-text tags and the multi-select CategoryTagPicker entirely
 * for the new forms.
 */
export default function OnePicker({ label, placeholder, storageKey, options, value, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const lastValue = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
    if (!lastValue) return base;
    const last = base.find((o) => o.value === lastValue);
    if (!last) return base;
    return [last, ...base.filter((o) => o.value !== lastValue)];
  }, [options, query, lastValue]);

  const selected = options.find((o) => o.value === value);

  const pick = (opt: OnePickerOption) => {
    onChange(opt.value);
    try { window.localStorage.setItem(storageKey, opt.value); } catch { /* private browsing */ }
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-left hover:border-primary/60"
        >
          <span className={selected ? '' : 'text-muted-foreground'}>
            {selected ? selected.label : (placeholder ?? `Choose a ${label.toLowerCase()}`)}
          </span>
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      ) : (
        <div className="rounded-md border border-input bg-background overflow-hidden">
          <div className="relative border-b">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              className="pl-9 border-0 focus-visible:ring-0"
              onBlur={() => setTimeout(() => setOpen(false), 150)}
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">No matches.</li>
            )}
            {filtered.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(opt)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-muted"
                >
                  {opt.label}
                  {opt.value === value && <Check className="w-4 h-4 text-primary" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
