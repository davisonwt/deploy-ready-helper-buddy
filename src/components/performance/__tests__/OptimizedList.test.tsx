import { render, screen } from '@testing-library/react';
import OptimizedList from '../OptimizedList';

const mockItems = [
  { id: 1, name: 'Apple', description: 'Red fruit' },
  { id: 2, name: 'Banana', description: 'Yellow fruit' },
  { id: 3, name: 'Cherry', description: 'Small red fruit' },
];

describe('OptimizedList', () => {
  it('renders list items correctly', () => {
    render(<OptimizedList items={mockItems} />);
    
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Banana')).toBeInTheDocument();
    expect(screen.getByText('Cherry')).toBeInTheDocument();
  });

  it('shows empty state when no items provided', () => {
    render(<OptimizedList items={[]} />);
    
    expect(screen.getByText('No items to display')).toBeInTheDocument();
  });

  it('sorts items alphabetically', () => {
    const unsortedItems = [
      { id: 1, name: 'Zebra' },
      { id: 2, name: 'Apple' },
      { id: 3, name: 'Banana' },
    ];
    
    render(<OptimizedList items={unsortedItems} />);
    
    // Items should be sorted: Apple, Banana, Zebra
    const items = screen.getAllByRole('heading', { level: 3 });
    expect(items[0]).toHaveTextContent('Apple');
    expect(items[1]).toHaveTextContent('Banana');
    expect(items[2]).toHaveTextContent('Zebra');
  });
});