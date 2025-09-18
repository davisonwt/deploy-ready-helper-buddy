import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import CommissionDashboard from '../CommissionDashboard';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

describe('CommissionDashboard', () => {
  it('renders commission dashboard', () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <CommissionDashboard />
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Commission Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Your Referral Link')).toBeInTheDocument();
  });

  it('copies referral link when copy button is clicked', async () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <CommissionDashboard />
        </BrowserRouter>
      </QueryClientProvider>
    );

    const copyButton = screen.getByRole('button');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });
});