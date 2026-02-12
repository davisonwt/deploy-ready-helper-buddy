import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Music, FileText, Palette, Grid3x3, Disc, Disc3, BookOpen, PlayCircle, PauseCircle, ShoppingBag, Apple, BookOpenCheck } from 'lucide-react';

interface CategoryFilterProps {
  selectedCategory: string;
  selectedType: string;
  selectedFormat?: string;
  selectedStatus?: string;
  onCategoryChange: (category: string) => void;
  onTypeChange: (type: string) => void;
  onFormatChange?: (format: string) => void;
  onStatusChange?: (status: string) => void;
}

export default function CategoryFilter({
  selectedCategory,
  selectedType,
  selectedFormat = 'all',
  selectedStatus = 'all',
  onCategoryChange,
  onTypeChange,
  onFormatChange,
  onStatusChange
}: CategoryFilterProps) {
  const types = [
    { value: 'all', label: 'All', icon: Grid3x3 },
    { value: 'music', label: 'Music', icon: Music },
    { value: 'art', label: 'Art', icon: Palette },
    { value: 'file', label: 'Files', icon: FileText },
    { value: 'book', label: 'Books', icon: BookOpen },
    { value: 'produce', label: 'Produce', icon: Apple },
    { value: 'product', label: 'Products', icon: ShoppingBag },
    { value: 'ebook', label: 'E-Books', icon: BookOpenCheck }
  ];

  const categories = [
    'all',
    'education',
    'entertainment',
    'business',
    'health',
    'technology',
    'lifestyle',
    'spiritual',
    'kitchenware',
    'properties',
    'vehicles',
    'fashion',
    'food'
  ];

  const formats = [
    { value: 'all', label: 'All', icon: Grid3x3 },
    { value: 'single', label: 'Singles', icon: Disc },
    { value: 'album', label: 'Albums', icon: Disc3 }
  ];

  const statuses = [
    { value: 'all', label: 'All', icon: Grid3x3 },
    { value: 'active', label: 'Active', icon: PlayCircle },
    { value: 'paused', label: 'Paused', icon: PauseCircle }
  ];

  return (
    <div className="mb-12 space-y-6">
      {/* Type Filter */}
      <div className="flex justify-center">
        <Tabs value={selectedType} onValueChange={onTypeChange} className="w-full max-w-3xl">
          <TabsList className="grid w-full grid-cols-4 sm:grid-cols-8 bg-muted/50 backdrop-blur-md bg-white/20 border-white/30">
            {types.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="data-[state=active]:bg-white/30 data-[state=active]:text-white text-white/80"
              >
                <Icon className="w-4 h-4 mr-2" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Status Filter - Only show if onStatusChange is provided (for owner pages) */}
      {onStatusChange && (
        <div className="flex justify-center">
          <Tabs value={selectedStatus} onValueChange={onStatusChange} className="w-full max-w-md">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50 backdrop-blur-md bg-white/20 border-white/30">
              {statuses.map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="data-[state=active]:bg-white/30 data-[state=active]:text-white text-white/80"
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Format Filter (Singles/Albums) - Only show for music type */}
      {selectedType === 'music' && onFormatChange && (
        <div className="flex justify-center">
          <Tabs value={selectedFormat} onValueChange={onFormatChange} className="w-full max-w-xl">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50 backdrop-blur-md bg-white/20 border-white/30">
              {formats.map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="data-[state=active]:bg-white/30 data-[state=active]:text-white text-white/80"
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Category Dropdown */}
      <div className="flex justify-center">
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-[280px] backdrop-blur-md bg-amber-600 border-amber-500 text-white font-bold shadow-lg shadow-amber-600/30">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent className="bg-card border border-border z-50 max-h-[300px]">
            {categories.map((category) => (
            <SelectItem key={category} value={category} className="capitalize">
                {category === 'all' ? 'All Categories' : `Gift of ${category.charAt(0).toUpperCase() + category.slice(1)}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
