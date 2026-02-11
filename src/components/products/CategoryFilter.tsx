import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    'spiritual'
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

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 justify-center">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            onClick={() => onCategoryChange(category)}
            className={`capitalize backdrop-blur-md border ${
              selectedCategory === category
                ? 'bg-amber-600 border-amber-500 text-white font-bold shadow-lg shadow-amber-600/30 hover:bg-amber-700'
                : 'bg-white/10 border-white/30 text-white/70 hover:bg-white/20 hover:text-white'
            }`}
          >
            {category}
          </Button>
        ))}
      </div>
    </div>
  );
}
