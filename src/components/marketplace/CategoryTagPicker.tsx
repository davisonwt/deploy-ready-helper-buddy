import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  useMarketplaceCategories,
  useMarketplaceSubcategories,
  useMarketplaceTags,
  useMyVerifiedCredentials,
  TAG_GROUP_LABELS,
  type TagGroup,
} from '@/hooks/useMarketplaceTaxonomy';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Lock, ShieldCheck } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Link } from 'react-router-dom';

interface Props {
  categoryId: string | null;
  subcategoryIds: string[];
  tagIds: string[];
  onChange: (next: { categoryId: string | null; subcategoryIds: string[]; tagIds: string[] }) => void;
}

export default function CategoryTagPicker({ categoryId, subcategoryIds, tagIds, onChange }: Props) {
  const { user } = useAuth();
  const { data: categories = [] } = useMarketplaceCategories();
  const { data: subcategories = [] } = useMarketplaceSubcategories(categoryId || undefined);
  const { data: tags = [] } = useMarketplaceTags();
  const { data: verifiedCreds = [] } = useMyVerifiedCredentials(user?.id);

  const verifiedTypes = useMemo(
    () => new Set(verifiedCreds.map((c) => c.credential_type)),
    [verifiedCreds],
  );

  const groupedTags = useMemo(() => {
    const g: Record<TagGroup, typeof tags> = {
      trust: [], logistics: [], condition: [], quality: [], service: [], travel: [],
    };
    tags.forEach((t) => g[t.tag_group]?.push(t));
    return g;
  }, [tags]);

  const toggleSub = (id: string) => {
    const next = subcategoryIds.includes(id)
      ? subcategoryIds.filter((x) => x !== id)
      : [...subcategoryIds, id];
    onChange({ categoryId, subcategoryIds: next, tagIds });
  };

  const toggleTag = (id: string) => {
    const next = tagIds.includes(id) ? tagIds.filter((x) => x !== id) : [...tagIds, id];
    onChange({ categoryId, subcategoryIds, tagIds: next });
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-semibold mb-2 block">Category *</Label>
        <Select
          value={categoryId || ''}
          onValueChange={(v) => onChange({ categoryId: v, subcategoryIds: [], tagIds })}
        >
          <SelectTrigger><SelectValue placeholder="Choose a category" /></SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.icon} {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {categoryId && subcategories.length > 0 && (
        <div>
          <Label className="text-base font-semibold mb-2 block">Subcategories</Label>
          <div className="flex flex-wrap gap-2">
            {subcategories.map((s) => {
              const active = subcategoryIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSub(s.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:bg-muted'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <Label className="text-base font-semibold">Tags</Label>
        {(Object.keys(groupedTags) as TagGroup[]).map((group) => {
          const list = groupedTags[group];
          if (!list.length) return null;
          return (
            <div key={group}>
              <div className="text-sm font-medium text-muted-foreground mb-2">
                {TAG_GROUP_LABELS[group]}
              </div>
              <div className="flex flex-wrap gap-2">
                {list.map((t) => {
                  const active = tagIds.includes(t.id);
                  const blocked =
                    t.requires_verification &&
                    t.required_credential_type &&
                    !verifiedTypes.has(t.required_credential_type as any);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={blocked && !active}
                      onClick={() => !blocked && toggleTag(t.id)}
                      title={blocked ? `Requires verified ${t.required_credential_type}` : t.description || ''}
                      className={`px-3 py-1.5 rounded-full text-sm border transition flex items-center gap-1.5 ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : blocked
                          ? 'bg-muted/50 text-muted-foreground border-dashed cursor-not-allowed'
                          : 'bg-background border-border hover:bg-muted'
                      }`}
                    >
                      {t.requires_verification && (blocked ? <Lock className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />)}
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {groupedTags.trust.some(
          (t) => t.requires_verification && !verifiedTypes.has(t.required_credential_type as any),
        ) && (
          <div className="text-xs text-muted-foreground bg-muted/40 border rounded-lg p-3">
            🔒 Trust tags are locked until you upload and verify proof.{' '}
            <Link to="/seller/credentials" className="text-primary underline">
              Submit credentials →
            </Link>
          </div>
        )}
      </div>

      {tagIds.length > 0 && (
        <div className="pt-2 border-t">
          <div className="text-xs text-muted-foreground mb-2">Selected ({tagIds.length})</div>
          <div className="flex flex-wrap gap-1">
            {tagIds.map((id) => {
              const t = tags.find((x) => x.id === id);
              return t ? <Badge key={id} variant="secondary">{t.label}</Badge> : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
