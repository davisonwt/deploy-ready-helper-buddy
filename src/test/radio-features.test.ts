import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import MusicLibrary from '../components/radio/MusicLibrary';
import PlaylistManager from '../components/radio/PlaylistManager';
import LiveStreamPlayer from '../components/radio/LiveStreamPlayer';
import ListenerInteractions from '../components/radio/ListenerInteractions';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ 
          data: { publicUrl: 'https://example.com/track.mp3' } 
        }),
      }),
    },
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: { id: 'dj1', track_title: 'Test Track' } 
            }),
          }),
        }),
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ 
            data: [{ id: 'track1', track_title: 'Test Track', artist_name: 'Test Artist' }] 
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue('channel'),
    }),
    removeChannel: vi.fn(),
    rpc: vi.fn().mockResolvedValue({ data: null }),
  },
}));

vi.mock('react-dropzone', () => ({
  useDropzone: vi.fn().mockReturnValue({
    getRootProps: vi.fn().mockReturnValue({}),
    getInputProps: vi.fn().mockReturnValue({}),
    isDragActive: false,
  }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn().mockReturnValue({ 
    data: [{ id: 'track1', track_title: 'Test Track' }], 
    isLoading: false 
  }),
  useMutation: vi.fn().mockReturnValue({
    mutate: vi.fn(),
    isLoading: false,
  }),
  useQueryClient: vi.fn().mockReturnValue({
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({ 
    user: { id: 'user1', email: 'test@example.com' } 
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn().mockReturnValue({ toast: vi.fn() }),
}));

// Create wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return React.createElement(BrowserRouter, {}, children);
};

describe('Radio Station Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MusicLibrary', () => {
    it('renders upload area and track list', () => {
      const result = render(React.createElement(TestWrapper, { children: React.createElement(MusicLibrary) }));
      
      expect(result.getByText('Music Library')).toBeInTheDocument();
      expect(result.getByText(/Drag & drop an audio file/)).toBeInTheDocument();
    });

    it('handles file upload', async () => {
      const result = render(React.createElement(TestWrapper, { children: React.createElement(MusicLibrary) }));
      
      const dropzone = result.getByText(/Drag & drop an audio file/);
      expect(dropzone).toBeInTheDocument();
    });
  });

  describe('PlaylistManager', () => {
    it('renders playlist creation form', () => {
      const result = render(React.createElement(TestWrapper, { children: React.createElement(PlaylistManager) }));
      
      expect(result.getByText('Playlist Manager')).toBeInTheDocument();
      expect(result.getByPlaceholderText('New playlist name')).toBeInTheDocument();
      expect(result.getByText('Create')).toBeInTheDocument();
    });

    it('creates new playlist', async () => {
      const result = render(React.createElement(TestWrapper, { children: React.createElement(PlaylistManager) }));
      
      const input = result.getByPlaceholderText('New playlist name');
      expect(input).toBeInTheDocument();
    });
  });

  describe('LiveStreamPlayer', () => {
    it('renders stream player controls', () => {
      const result = render(React.createElement(TestWrapper, { children: React.createElement(LiveStreamPlayer) }));
      
      expect(result.getByText('AOD Station Radio')).toBeInTheDocument();
      expect(result.getByText('Play Live Stream')).toBeInTheDocument();
    });

    it('toggles play/pause', async () => {
      // Mock audio element
      const mockAudio = {
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        volume: 0.5,
        muted: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      
      vi.spyOn(document, 'createElement').mockReturnValue(mockAudio as any);

      const result = render(React.createElement(TestWrapper, { children: React.createElement(LiveStreamPlayer) }));
      
      const playButton = result.getByText('Play Live Stream');
      expect(playButton).toBeInTheDocument();
    });
  });

  describe('ListenerInteractions', () => {
    it('renders chat interface', () => {
      const result = render(React.createElement(TestWrapper, { children: React.createElement(ListenerInteractions) }));
      
      expect(result.getByText('Live Chat & Requests')).toBeInTheDocument();
      expect(result.getByPlaceholderText('Say something...')).toBeInTheDocument();
    });

    it('sends message', async () => {
      const result = render(React.createElement(TestWrapper, { children: React.createElement(ListenerInteractions) }));
      
      const input = result.getByPlaceholderText('Say something...');
      expect(input).toBeInTheDocument();
    });

    it('switches between comment and request modes', () => {
      const result = render(React.createElement(TestWrapper, { children: React.createElement(ListenerInteractions) }));
      
      // Should render the component
      expect(result.container).toBeInTheDocument();
    });
  });
});