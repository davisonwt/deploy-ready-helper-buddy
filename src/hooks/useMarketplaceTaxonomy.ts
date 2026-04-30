import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MarketplaceCategory {
  id: string;
  slug: string;
  label: string;
  icon: string | null;
  sort_order: number;
}

export interface MarketplaceSubcategory {
  id: string;
  category_id: string;
  slug: string;
  label: string;
  sort_order: number;
}

export type TagGroup = 'trust' | 'logistics' | 'condition' | 'service' | 'travel' | 'quality';

export interface MarketplaceTag {
  id: string;
  slug: string;
  label: string;
  tag_group: TagGroup;
  description: string | null;
  requires_verification: boolean;
  required_credential_type: string | null;
  sort_order: number;
}

export type CredentialType = 'identity' | 'license' | 'insurance' | 'background_check';

export interface SellerCredential {
  id: string;
  user_id: string;
  credential_type: CredentialType;
  file_url: string | null;
  notes: string | null;
  status: 'pending' | 'verified' | 'rejected' | 'not_submitted' | 'expired';
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  expires_at: string | null;
}

export function useMarketplaceCategories() {
  return useQuery({
    queryKey: ['marketplace-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketplace_categories' as any)
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as unknown as MarketplaceCategory[];
    },
    staleTime: 1000 * 60 * 30,
  });
}

export function useMarketplaceSubcategories(categoryId?: string) {
  return useQuery({
    queryKey: ['marketplace-subcategories', categoryId],
    queryFn: async () => {
      let q = supabase
        .from('marketplace_subcategories' as any)
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (categoryId) q = q.eq('category_id', categoryId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as MarketplaceSubcategory[];
    },
    staleTime: 1000 * 60 * 30,
    enabled: !!categoryId || categoryId === undefined,
  });
}

export function useMarketplaceTags() {
  return useQuery({
    queryKey: ['marketplace-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketplace_tags' as any)
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as unknown as MarketplaceTag[];
    },
    staleTime: 1000 * 60 * 30,
  });
}

export function useMyVerifiedCredentials(userId?: string) {
  return useQuery({
    queryKey: ['my-verified-credentials', userId],
    queryFn: async () => {
      if (!userId) return [] as SellerCredential[];
      const { data, error } = await supabase
        .from('seller_credentials' as any)
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'verified');
      if (error) throw error;
      return (data || []) as unknown as SellerCredential[];
    },
    enabled: !!userId,
  });
}

export function useMyCredentials(userId?: string) {
  return useQuery({
    queryKey: ['my-credentials', userId],
    queryFn: async () => {
      if (!userId) return [] as SellerCredential[];
      const { data, error } = await supabase
        .from('seller_credentials' as any)
        .select('*')
        .eq('user_id', userId)
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as SellerCredential[];
    },
    enabled: !!userId,
  });
}

export function useListingTags(listingType: string, listingId?: string) {
  return useQuery({
    queryKey: ['listing-tags', listingType, listingId],
    queryFn: async () => {
      if (!listingId) return [];
      const { data, error } = await supabase
        .from('listing_tags' as any)
        .select('tag_id, marketplace_tags(*)')
        .eq('listing_type', listingType)
        .eq('listing_id', listingId);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!listingId,
  });
}

export const TAG_GROUP_LABELS: Record<TagGroup, string> = {
  trust: '🛡️ Trust & Verification',
  logistics: '📦 Delivery & Logistics',
  condition: '✨ Condition',
  quality: '🌿 Quality',
  service: '🔧 Service Details',
  travel: '✈️ Travel Details',
};
