import React from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const PROPERTY_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'game_lodge', label: '🦁 Game Lodge' },
  { value: 'guesthouse', label: '🏠 Guesthouse' },
  { value: 'bnb', label: '☕ B&B' },
  { value: 'farm_stay', label: '🌾 Farm Stay' },
  { value: 'self_catering', label: '🍳 Self-Catering' },
  { value: 'glamping', label: '⛺ Glamping' },
  { value: 'backpackers', label: '🎒 Backpackers' },
  { value: 'eco_retreat', label: '🌿 Eco Retreat' },
  { value: 'treehouse', label: '🌳 Treehouse' },
  { value: 'bush_camp', label: '🏕️ Bush Camp' },
  { value: 'boutique_hotel', label: '🏨 Boutique Hotel' },
  { value: 'vineyard_stay', label: '🍇 Vineyard Stay' },
  { value: 'mountain_hut', label: '⛰️ Mountain Hut' },
  { value: 'coastal_cottage', label: '🌊 Coastal Cottage' },
  { value: 'family_farm', label: '👨‍👩‍👧 Family Farm' },
];

interface StayFiltersProps {
  search: string;
  setSearch: (v: string) => void;
  propertyType: string;
  setPropertyType: (v: string) => void;
  petFriendly: boolean;
  setPetFriendly: (v: boolean) => void;
  onClear: () => void;
}

const StayFilters: React.FC<StayFiltersProps> = ({
  search, setSearch, propertyType, setPropertyType, petFriendly, setPetFriendly, onClear,
}) => {
  const hasFilters = search || propertyType !== 'all' || petFriendly;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search destinations, properties..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card border-border"
        />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={propertyType} onValueChange={setPropertyType}>
          <SelectTrigger className="w-[180px] bg-card">
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Property Type" />
          </SelectTrigger>
          <SelectContent>
            {PROPERTY_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Switch id="pet" checked={petFriendly} onCheckedChange={setPetFriendly} />
          <Label htmlFor="pet" className="text-sm text-muted-foreground cursor-pointer">🐾 Pet-Friendly</Label>
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
            <X className="w-4 h-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Quick filter tags */}
      <div className="flex flex-wrap gap-2">
        {['Farm Stay', 'Game Lodge', 'Glamping', 'Eco Retreat', 'Coastal'].map(tag => (
          <Badge
            key={tag}
            variant={propertyType === tag.toLowerCase().replace(/\s+/g, '_') ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            onClick={() => setPropertyType(tag.toLowerCase().replace(/\s+/g, '_'))}
          >
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  );
};

export default StayFilters;
