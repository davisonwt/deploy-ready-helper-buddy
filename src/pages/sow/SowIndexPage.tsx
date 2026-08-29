import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Music, Palette, FileText, Package, Wrench, TreeDeciduous, Lock, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LAST_KIND_KEY = 'sow:lastKind';

interface Tile {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  route: string | null; // null = not built yet
}

const TILES: Tile[] = [
  { key: 'music', label: 'Music', icon: Music, route: '/sow/music' },
  { key: 'artwork', label: 'Artwork / image', icon: Palette, route: null },
  { key: 'document', label: 'Document / e-book', icon: FileText, route: null },
  { key: 'physical', label: 'Physical product', icon: Package, route: null },
  { key: 'service', label: 'Service', icon: Wrench, route: null },
  { key: 'orchard', label: 'Orchard', icon: TreeDeciduous, route: null },
];

/**
 * Step 0 of the new sowing flow — spec-sowing-forms.md. One screen, big
 * tiles, no other fields. Only Music is wired up so far; the rest are
 * visible (so the shape of the whole flow is clear) but disabled.
 */
export default function SowIndexPage() {
  const navigate = useNavigate();
  const [lastKind, setLastKind] = useState<string | null>(null);

  useEffect(() => {
    try { setLastKind(window.localStorage.getItem(LAST_KIND_KEY)); } catch { /* private browsing */ }
  }, []);

  const choose = (tile: Tile) => {
    if (!tile.route) return;
    try { window.localStorage.setItem(LAST_KIND_KEY, tile.key); } catch { /* private browsing */ }
    navigate(tile.route);
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="mb-4 -ml-2">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Dashboard
      </Button>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">What are you sowing?</h1>
        <p className="text-muted-foreground mt-1">Pick a kind — we'll only ask what it needs.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          const enabled = !!tile.route;
          const isLast = lastKind === tile.key && enabled;
          return (
            <button
              key={tile.key}
              type="button"
              disabled={!enabled}
              onClick={() => choose(tile)}
              className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-5 aspect-square transition-all
                ${enabled
                  ? isLast
                    ? 'border-primary bg-primary/5 hover:bg-primary/10'
                    : 'border-border hover:border-primary/60 hover:bg-muted/50'
                  : 'border-border/50 opacity-50 cursor-not-allowed'}`}
            >
              {isLast && (
                <span className="absolute top-2 right-2 text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 rounded-full px-2 py-0.5">
                  Last time
                </span>
              )}
              {!enabled && (
                <Lock className="absolute top-2 right-2 w-3.5 h-3.5 text-muted-foreground" />
              )}
              <Icon className="w-8 h-8 text-primary" />
              <span className="text-sm font-medium text-center">{tile.label}</span>
              {!enabled && <span className="text-[11px] text-muted-foreground">Coming soon</span>}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => navigate('/dashboard/sower/upload')}
        className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-border p-3 text-sm text-muted-foreground hover:border-primary/60 hover:text-foreground transition-colors"
      >
        <Upload className="w-4 h-4" />
        Got a lot to add at once? Bulk upload
      </button>
    </div>
  );
}
