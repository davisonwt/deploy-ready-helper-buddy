import { useMemo } from 'react';
import {
  useMarketplaceCategories,
  useMarketplaceTags,
  TAG_GROUP_LABELS,
  type TagGroup,
} from '@/hooks/useMarketplaceTaxonomy';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';

interface Props {
  categoryId: string | null;
  tagIds: string[];
  onCategoryChange: (id: string | null) => void;
  onTagsChange: (ids: string[]) => void;
}

export default function MarketplaceFilterBar({ categoryId, tagIds, onCategoryChange, onTagsChange }: Props) {
  const { data: categories = [] } = useMarketplaceCategories();
  const { data: tags = [] } = useMarketplaceTags();

  const grouped = useMemo(() => {
    const g: Record<TagGroup, typeof tags> = {
      trust: [], logistics: [], condition: [], quality: [], service: [], travel: [],
    };
    tags.forEach((t) => g[t.tag_group]?.push(t));
    return g;
  }, [tags]);

  const toggle = (id: string) =>
    onTagsChange(tagIds.includes(id) ? tagIds.filter((x) => x !== id) : [...tagIds, id]);

  return (
    <div className="rounded-xl border bg-card/60 backdrop-blur p-4 mb-6 space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
          <Select value={categoryId || 'all'} onValueChange={(v) => onCategoryChange(v === 'all' ? null : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.icon} {c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(tagIds.length > 0 || categoryId) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { onTagsChange([]); onCategoryChange(null); }}
          >
            <X className="w-3 h-3 mr-1" /> Clear
          </Button>
        )}
      </div>

      {(Object.keys(grouped) as TagGroup[]).map((group) => {
        const list = grouped[group];
        if (!list.length) return null;
        return (
          <div key={group}>
            <div className="text-xs font-medium text-muted-foreground mb-1.5">
              {TAG_GROUP_LABELS[group]}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {list.map((t) => {
                const active = tagIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggle(t.id)}
                    className={`px-2.5 py-1 rounded-full text-xs border transition ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:bg-muted'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
