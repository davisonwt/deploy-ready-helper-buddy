import { memo, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';

// Simple virtualized list without react-window for now
interface ListItemProps {
  index: number;
  style: React.CSSProperties;
}

const VirtualizedList: React.FC<{
  height: number;
  itemCount: number;
  itemSize: number;
  children: React.ComponentType<ListItemProps>;
}> = ({ height, itemCount, itemSize, children: ItemComponent }) => {
  const items = Array.from({ length: itemCount }, (_, index) => (
    <ItemComponent
      key={index}
      index={index}
      style={{ height: itemSize }}
    />
  ));

  return (
    <div style={{ height, overflowY: 'auto' }}>
      {items}
    </div>
  );
};

interface Item {
  id: number;
  name: string;
  description?: string;
}

interface OptimizedListProps {
  items: Item[];
  height?: number;
  itemSize?: number;
}

const OptimizedList = memo(({ items, height = 400, itemSize = 80 }: OptimizedListProps) => {
  const sortedItems = useMemo(() => 
    [...items].sort((a, b) => a.name.localeCompare(b.name)), 
    [items]
  );

  const Row = memo(({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <Card className="mx-2 my-1">
        <CardContent className="p-4">
          <h3 className="font-semibold text-primary">{sortedItems[index].name}</h3>
          {sortedItems[index].description && (
            <p className="text-sm text-muted-foreground mt-1">
              {sortedItems[index].description}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  ));

  Row.displayName = 'ListRow';

  if (sortedItems.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No items to display</p>
      </Card>
    );
  }

  return (
    <VirtualizedList
      height={height}
      itemCount={sortedItems.length}
      itemSize={itemSize}
    >
      {Row}
    </VirtualizedList>
  );
});

OptimizedList.displayName = 'OptimizedList';

export default OptimizedList;