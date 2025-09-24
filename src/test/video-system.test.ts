import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import VideoUpload from '../components/video/VideoUpload';
import VideoPlayer from '../components/video/VideoPlayer';
import VideoComments from '../components/video/VideoComments';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } }
      })
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ 
          data: { publicUrl: 'https://example.com/test-video.mp4' } 
        })
      })
    },
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'test-video-id',
              title: 'Test Video',
              description: 'Test Description',
              video_url: 'https://example.com/test-video.mp4',
              thumbnail_url: 'https://example.com/thumbnail.jpg',
              view_count: 100,
              like_count: 10,
              comment_count: 5,
              tags: ['test', 'video']
            }
          }),
          order: vi.fn().mockReturnValue({
            data: []
          })
        }),
        order: vi.fn().mockReturnValue({
          data: []
        })
      }),
      delete: vi.fn().mockResolvedValue({ error: null })
    }),
    rpc: vi.fn().mockResolvedValue({ error: null })
  }
}));

// Mock hooks
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

vi.mock('@/hooks/useVideoProcessor', () => ({
  useVideoProcessor: () => ({
    processVideoFile: vi.fn().mockResolvedValue({
      compressedFile: new File(['test'], 'test.mp4', { type: 'video/mp4' }),
      thumbnails: []
    }),
    processing: false,
    progress: 0,
    progressMessage: ''
  })
}));

// Mock HTML5 video and canvas
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  writable: true,
  value: vi.fn().mockImplementation(() => Promise.resolve())
});

Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  writable: true,
  value: vi.fn()
});

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  writable: true,
  value: vi.fn().mockReturnValue({
    drawImage: vi.fn(),
  })
});

Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
  writable: true,
  value: vi.fn().mockImplementation((callback) => {
    callback(new Blob(['test'], { type: 'image/jpeg' }));
  })
});

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => 
  React.createElement(QueryClientProvider, { client: createTestQueryClient() }, children);

describe('Video System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('VideoUpload', () => {
    it('renders upload form correctly', () => {
      const component = render(
        React.createElement(TestWrapper, null,
          React.createElement(VideoUpload, null)
        )
      );

      expect(component.container).toBeInTheDocument();
    });
  });

  describe('VideoPlayer', () => {
    it('renders video player', () => {
      const component = render(
        React.createElement(TestWrapper, null,
          React.createElement(VideoPlayer, { videoId: 'test-video-id' })
        )
      );

      expect(component.container).toBeInTheDocument();
    });
  });

  describe('VideoComments', () => {
    it('renders comments section', () => {
      const component = render(
        React.createElement(TestWrapper, null,
          React.createElement(VideoComments, { videoId: 'test-video-id' })
        )
      );

      expect(component.container).toBeInTheDocument();
    });
  });
});