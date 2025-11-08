import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Music, FileText, Palette, Grid3x3 } from 'lucide-react';

interface CategoryFilterProps {
  selectedCategory: string;
  selectedType: string;
  onCategoryChange: (category: string) => void;
  onTypeChange: (type: string) => void;
}

export default function CategoryFilter({
  selectedCategory,
  selectedType,
  onCategoryChange,
  onTypeChange
}: CategoryFilterProps) {
  const types = [
    { value: 'all', label: 'All', icon: Grid3x3 },
    { value: 'music', label: 'Music', icon: Music },
    { value: 'art', label: 'Art', icon: Palette },
    { value: 'file', label: 'Files', icon: FileText }
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

  return (
    <div className="mb-12 space-y-6">
      {/* Type Filter */}
      <div className="flex justify-center">
        <Tabs value={selectedType} onValueChange={onTypeChange} className="w-full max-w-2xl">
          <TabsList className="grid w-full grid-cols-4 bg-muted/50">
            {types.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Icon className="w-4 h-4 mr-2" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 justify-center">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            onClick={() => onCategoryChange(category)}
            className="capitalize"
          >
            {category}
          </Button>
        ))}
      </div>
    </div>
  );
}
