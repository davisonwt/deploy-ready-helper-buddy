import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import VideoGeneration from '../components/ai/VideoGeneration';
import ContentCreationWorkflow from '../components/ai/ContentCreationWorkflow';
import { useUsageLimit } from '../hooks/useUsageLimit';

// Mock Supabase
vi.mock('@supabase/auth-helpers-react', () => ({
  useUser: vi.fn().mockReturnValue({ id: 'user1' }),
  useSupabaseClient: vi.fn().mockReturnValue({
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
      render(
        <BrowserRouter>
          <VideoGeneration />
        </BrowserRouter>
      );

      expect(screen.getByText('Generate Video')).toBeInTheDocument();
      expect(screen.getByText('Remaining: 5/10')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Describe the video (e.g., \'A cat dancing in space with colorful lights\')')).toBeInTheDocument();
    });

    it('generates video with valid prompt', async () => {
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
                    video_url: 'test-video.mp4' 
                  } 
                }, 
                error: null 
              }),
            }),
          }),
        }),
        functions: {
          invoke: vi.fn().mockResolvedValue({ 
            data: { success: true, prediction_id: 'pred1' }, 
            error: null 
          }),
        },
      };

      vi.mocked(require('@supabase/auth-helpers-react').useSupabaseClient).mockReturnValue(mockSupabase);

      render(
        <BrowserRouter>
          <VideoGeneration />
        </BrowserRouter>
      );

      const promptInput = screen.getByPlaceholderText('Describe the video (e.g., \'A cat dancing in space with colorful lights\')');
      const generateButton = screen.getByText('Generate Video');

      fireEvent.change(promptInput, { target: { value: 'A dancing cat in space' } });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('generate-video', {
          body: { generation_id: 'gen1', prompt: 'A dancing cat in space' },
        });
      });
    });

    it('enforces usage limits', async () => {
      mockUseUsageLimit.mockReturnValue({
        remaining: 0,
        used: 10,
        limit: 10,
        loading: false,
      });

      render(
        <BrowserRouter>
          <VideoGeneration />
        </BrowserRouter>
      );

      const generateButton = screen.getByText('Generate Video');
      expect(generateButton).toBeDisabled();
      expect(screen.getByText('Remaining: 0/10')).toBeInTheDocument();
    });
  });

  describe('ContentCreationWorkflow', () => {
    it('renders workflow steps', () => {
      render(
        <BrowserRouter>
          <ContentCreationWorkflow />
        </BrowserRouter>
      );

      expect(screen.getByText('Content Creation Workflow')).toBeInTheDocument();
      expect(screen.getByText('Concept')).toBeInTheDocument();
      expect(screen.getByText('Text Generation')).toBeInTheDocument();
      expect(screen.getByText('Image Generation')).toBeInTheDocument();
      expect(screen.getByText('Video Generation')).toBeInTheDocument();
    });

    it('progresses through workflow steps', async () => {
      const mockSupabase = {
        functions: {
          invoke: vi.fn()
            .mockResolvedValueOnce({ 
              data: { script: 'Generated script content' }, 
              error: null 
            })
            .mockResolvedValueOnce({ 
              data: { imageUrl: 'generated-image.jpg' }, 
              error: null 
            })
            .mockResolvedValueOnce({ 
              data: { video_url: 'generated-video.mp4' }, 
              error: null 
            }),
        },
      };

      vi.mocked(require('@supabase/auth-helpers-react').useSupabaseClient).mockReturnValue(mockSupabase);

      render(
        <BrowserRouter>
          <ContentCreationWorkflow />
        </BrowserRouter>
      );

      // Step 1: Enter concept
      const conceptInput = screen.getByPlaceholderText('Describe your content idea (e.g., \'A promotional video for organic honey highlighting natural benefits and sustainable beekeeping\')');
      fireEvent.change(conceptInput, { 
        target: { value: 'Promotional video for organic honey' } 
      });

      fireEvent.click(screen.getByText('Start Generation'));

      // Should progress to step 2
      await waitFor(() => {
        expect(screen.getByText('Generate Script')).toBeInTheDocument();
      });

      // Step 2: Generate script
      fireEvent.click(screen.getByText('Generate Script'));

      await waitFor(() => {
        expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('generate-script', 
          expect.objectContaining({
            body: expect.objectContaining({
              productDescription: 'Promotional video for organic honey'
            })
          })
        );
      });
    });

    it('shows usage limits for each step', () => {
      mockUseUsageLimit
        .mockReturnValueOnce({ remaining: 8, used: 2, limit: 10, loading: false }) // script
        .mockReturnValueOnce({ remaining: 3, used: 2, limit: 5, loading: false })  // image
        .mockReturnValueOnce({ remaining: 1, used: 2, limit: 3, loading: false }); // video

      render(
        <BrowserRouter>
          <ContentCreationWorkflow />
        </BrowserRouter>
      );

      expect(screen.getByText('Remaining: 8')).toBeInTheDocument();
      expect(screen.getByText('Remaining: 3')).toBeInTheDocument();
      expect(screen.getByText('Remaining: 1')).toBeInTheDocument();
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

      render(
        <BrowserRouter>
          <VideoGeneration />
        </BrowserRouter>
      );

      expect(screen.getByText('Remaining: 7/10')).toBeInTheDocument();
    });

    it('handles loading state', () => {
      mockUseUsageLimit.mockReturnValue({
        remaining: 0,
        used: 0,
        limit: 10,
        loading: true,
      });

      render(
        <BrowserRouter>
          <VideoGeneration />
        </BrowserRouter>
      );

      expect(screen.getByText('Loading limits...')).toBeInTheDocument();
    });
  });
});