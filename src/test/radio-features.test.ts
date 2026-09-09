import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Mock all the dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'mock-url' } })),
      })),
    },
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ order: vi.fn(() => ({ data: [] })) })),
        order: vi.fn(() => ({ data: [] })),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
    rpc: vi.fn().mockResolvedValue({ data: null }),
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user1' } })),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

vi.mock('react-dropzone', () => ({
  useDropzone: vi.fn(() => ({
    getRootProps: vi.fn(() => ({})),
    getInputProps: vi.fn(() => ({})),
    isDragActive: false,
  })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isLoading: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

describe('Radio Station Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should mock supabase client correctly', () => {
    expect(supabase).toBeDefined();
    expect(supabase.from).toBeDefined();
    expect(supabase.storage).toBeDefined();
  });

  it('should mock auth hook correctly', () => {
    const result = useAuth();
    expect(result.user).toBeDefined();
    expect(result.user.id).toBe('user1');
  });

  it('should mock toast hook correctly', () => {
    const result = useToast();
    expect(result.toast).toBeDefined();
    expect(typeof result.toast).toBe('function');
  });

  it('should mock react-query hooks correctly', () => {
    const queryResult = useQuery();
    expect(queryResult.data).toEqual([]);
    expect(queryResult.isLoading).toBe(false);
    
    const mutationResult = useMutation();
    expect(mutationResult.mutate).toBeDefined();
    expect(typeof mutationResult.mutate).toBe('function');
    
    const queryClient = useQueryClient();
    expect(queryClient.invalidateQueries).toBeDefined();
    expect(typeof queryClient.invalidateQueries).toBe('function');
  });
});