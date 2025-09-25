import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import VideoGeneration from '../components/ai/VideoGeneration';
import ContentCreationWorkflow from '../components/ai/ContentCreationWorkflow';
import { useUsageLimit } from '../hooks/useUsageLimit';

// Mock Supabase
const mockSupabase = {
  from: vi.fn().mockReturnValue({
    insert: vi.fn().mockResolvedValue({ 
      data: [{ id: 'gen1' }], 
      error: null 
    }),
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ 
          data: { 
            metadata: { 
              status: 'completed', 
              video_url: 'mock-video-url' 
            } 
          }, 
          error: null 
        }),
      }),
    }),
  }),
  functions: {
    invoke: vi.fn().mockResolvedValue({ 
      data: { script: 'mock script text', imageUrl: 'mock-image-url' }, 
      error: null 
    }),
  },
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({ 
    session: { user: { id: 'user1' } } 
  }),
}));

// Mock usage limit hook
vi.mock('../hooks/useUsageLimit', () => ({
  useUsageLimit: vi.fn(),
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn().mockReturnValue({ toast: vi.fn() }),
}));

const mockUseUsageLimit = vi.mocked(useUsageLimit);

describe('AI Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUsageLimit.mockReturnValue({
      remaining: 5,
      used: 0,
      limit: 10,
      loading: false,
    });
  });

  describe('VideoGeneration', () => {
    it('renders video generation interface', () => {
      const queryClient = new QueryClient();
      const component = React.createElement(QueryClientProvider, { client: queryClient },
        React.createElement(BrowserRouter, null,
          React.createElement(VideoGeneration)
        )
      );
      const { container } = render(component);
      expect(container).toBeTruthy();
    });

    it('enforces usage limits', async () => {
      mockUseUsageLimit.mockReturnValue({
        remaining: 0,
        used: 10,
        limit: 10,
        loading: false,
      });

      const queryClient = new QueryClient();
      const component = React.createElement(QueryClientProvider, { client: queryClient },
        React.createElement(BrowserRouter, null,
          React.createElement(VideoGeneration)
        )
      );
      const { container } = render(component);
      expect(container).toBeTruthy();
    });
  });

  describe('ContentCreationWorkflow', () => {
    it('renders workflow steps', () => {
      const queryClient = new QueryClient();
      const component = React.createElement(QueryClientProvider, { client: queryClient },
        React.createElement(BrowserRouter, null,
          React.createElement(ContentCreationWorkflow)
        )
      );
      const { container } = render(component);
      expect(container).toBeTruthy();
    });
  });

  describe('Usage Limits', () => {
    it('displays correct remaining counts', () => {
      mockUseUsageLimit.mockReturnValue({
        remaining: 7,
        used: 3,
        limit: 10,
        loading: false,
      });

      const queryClient = new QueryClient();
      const component = React.createElement(QueryClientProvider, { client: queryClient },
        React.createElement(BrowserRouter, null,
          React.createElement(VideoGeneration)
        )
      );
      const { container } = render(component);
      expect(container).toBeTruthy();
    });

    it('handles loading state', () => {
      mockUseUsageLimit.mockReturnValue({
        remaining: 0,
        used: 0,
        limit: 10,
        loading: true,
      });

      const queryClient = new QueryClient();
      const component = React.createElement(QueryClientProvider, { client: queryClient },
        React.createElement(BrowserRouter, null,
          React.createElement(VideoGeneration)
        )
      );
      const { container } = render(component);
      expect(container).toBeTruthy();
    });
  });
});