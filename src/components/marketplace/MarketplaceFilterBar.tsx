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

      {/* Tag groups as compact dropdowns to save space */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(grouped) as TagGroup[]).map((group) => {
          const list = grouped[group];
          if (!list.length) return null;
          const selectedInGroup = list.filter((t) => tagIds.includes(t.id));
          const label = TAG_GROUP_LABELS[group];
          const buttonLabel = selectedInGroup.length
            ? `${label} (${selectedInGroup.length})`
            : label;

          return (
            <Select
              key={group}
              value="__none__"
              onValueChange={(v) => {
                if (v && v !== '__none__') toggle(v);
              }}
            >
              <SelectTrigger
                className={`h-8 w-auto min-w-[140px] text-xs ${
                  selectedInGroup.length ? 'border-primary text-primary' : ''
                }`}
              >
                <SelectValue placeholder={buttonLabel}>{buttonLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {list.map((t) => {
                  const active = tagIds.includes(t.id);
                  return (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className={`inline-block h-3 w-3 rounded-sm border ${
                            active ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                          }`}
                        />
                        {t.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          );
        })}
      </div>

      {/* Selected tag chips (so users can see/remove their picks) */}
      {tagIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags
            .filter((t) => tagIds.includes(t.id))
            .map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggle(t.id)}
                className="px-2.5 py-1 rounded-full text-xs bg-primary text-primary-foreground border border-primary inline-flex items-center gap-1"
              >
                {t.label}
                <X className="w-3 h-3" />
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
