import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface StayListing {
  id: string;
  sower_id: string;
  business_name: string;
  property_type: string;
  description: string | null;
  short_description: string | null;
  country: string;
  province: string | null;
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  amenities: string[];
  activities: string[];
  farm_produce: string[];
  photos: string[];
  cover_photo: string | null;
  pet_friendly: boolean;
  check_in_time: string;
  check_out_time: string;
  cancellation_policy: string;
  house_rules: string | null;
  linked_orchard_id: string | null;
  status: string;
  is_featured: boolean;
  avg_rating: number;
  total_reviews: number;
  created_at: string;
  updated_at: string;
}

export interface StayUnit {
  id: string;
  listing_id: string;
  name: string;
  description: string | null;
  unit_type: string;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  beds_description: string | null;
  price_per_night: number;
  currency: string;
  weekend_price: number | null;
  photos: string[];
  amenities: string[];
  is_active: boolean;
}

export interface StayBooking {
  id: string;
  listing_id: string;
  unit_id: string;
  guest_id: string;
  sower_id: string;
  check_in: string;
  check_out: string;
  guests_count: number;
  total_price: number;
  currency: string;
  status: string;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  special_requests: string | null;
  sower_message: string | null;
  payment_status: string;
  created_at: string;
}

export interface StayReview {
  id: string;
  booking_id: string;
  listing_id: string;
  reviewer_id: string;
  rating: number;
  review_text: string | null;
  host_response: string | null;
  created_at: string;
}

export function useStayListings(filters?: {
  propertyType?: string;
  city?: string;
  petFriendly?: boolean;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}) {
  const [listings, setListings] = useState<StayListing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('stay_listings')
        .select('*')
        .eq('status', 'approved')
        .order('is_featured', { ascending: false })
        .order('avg_rating', { ascending: false });

      if (filters?.propertyType && filters.propertyType !== 'all') {
        query = query.eq('property_type', filters.propertyType);
      }
      if (filters?.city) {
        query = query.ilike('city', `%${filters.city}%`);
      }
      if (filters?.petFriendly) {
        query = query.eq('pet_friendly', true);
      }
      if (filters?.search) {
        query = query.or(`business_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,city.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setListings((data as StayListing[]) || []);
    } catch (error: any) {
      console.error('Error fetching stay listings:', error);
    } finally {
      setLoading(false);
    }
  }, [filters?.propertyType, filters?.city, filters?.petFriendly, filters?.search]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  return { listings, loading, refetch: fetchListings };
}

export function useStayListing(listingId: string | undefined) {
  const [listing, setListing] = useState<StayListing | null>(null);
  const [units, setUnits] = useState<StayUnit[]>([]);
  const [reviews, setReviews] = useState<StayReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!listingId) return;
    const fetch = async () => {
      try {
        setLoading(true);
        const [listingRes, unitsRes, reviewsRes] = await Promise.all([
          supabase.from('stay_listings').select('*').eq('id', listingId).single(),
          supabase.from('stay_units').select('*').eq('listing_id', listingId).eq('is_active', true),
          supabase.from('stay_reviews').select('*').eq('listing_id', listingId).order('created_at', { ascending: false }),
        ]);
        if (listingRes.error) throw listingRes.error;
        setListing(listingRes.data as StayListing);
        setUnits((unitsRes.data as StayUnit[]) || []);
        setReviews((reviewsRes.data as StayReview[]) || []);
      } catch (error: any) {
        console.error('Error fetching stay listing:', error);
        toast.error('Failed to load property details');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [listingId]);

  return { listing, units, reviews, loading };
}

export function useSowerStays() {
  const { user } = useAuth();
  const [listings, setListings] = useState<StayListing[]>([]);
  const [bookings, setBookings] = useState<StayBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      try {
        setLoading(true);
        const [listingsRes, bookingsRes] = await Promise.all([
          supabase.from('stay_listings').select('*').eq('sower_id', user.id).order('created_at', { ascending: false }),
          supabase.from('stay_bookings').select('*').eq('sower_id', user.id).order('created_at', { ascending: false }),
        ]);
        setListings((listingsRes.data as StayListing[]) || []);
        setBookings((bookingsRes.data as StayBooking[]) || []);
      } catch (error: any) {
        console.error('Error fetching sower stays:', error);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user]);

  return { listings, bookings, loading };
}

export function useStayWishlist() {
  const { user } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    supabase.from('stay_wishlists').select('listing_id').eq('user_id', user.id)
      .then(({ data }) => {
        setWishlistIds(new Set((data || []).map((w: any) => w.listing_id)));
      });
  }, [user]);

  const toggleWishlist = async (listingId: string) => {
    if (!user) { toast.error('Please sign in to save stays'); return; }
    const isWished = wishlistIds.has(listingId);
    if (isWished) {
      await supabase.from('stay_wishlists').delete().eq('user_id', user.id).eq('listing_id', listingId);
      setWishlistIds(prev => { const n = new Set(prev); n.delete(listingId); return n; });
      toast.success('Removed from wishlist');
    } else {
      await supabase.from('stay_wishlists').insert({ user_id: user.id, listing_id: listingId });
      setWishlistIds(prev => new Set(prev).add(listingId));
      toast.success('Added to wishlist ❤️');
    }
  };

  return { wishlistIds, toggleWishlist };
}
