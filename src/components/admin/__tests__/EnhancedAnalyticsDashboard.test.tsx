import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import EnhancedAnalyticsDashboard from '../EnhancedAnalyticsDashboard';
import { supabase } from '@/integrations/supabase/client';

// Mock the supabase client
vi.mocked(supabase.from).mockImplementation((table: string) => {
  const mockData = {
    profiles: { count: 150 },
    orchards: { count: 45 },
    payments: { count: 230 },
    sessions: { count: 1250 },
  };

  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ 
      data: mockData[table as keyof typeof mockData], 
      error: null 
    }),
  } as any;
});

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

describe('EnhancedAnalyticsDashboard', () => {
  it('renders analytics dashboard with metrics', async () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <EnhancedAnalyticsDashboard />
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <EnhancedAnalyticsDashboard />
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});