import { useState, useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProductBasket } from '@/contexts/ProductBasketContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Music, Book, Image, Video, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { launchConfetti, floatingScore, playSoundEffect } from '@/utils/confetti';
import { resolveAudioUrl } from '@/utils/resolveAudioUrl';
import { SocialActionButtons } from '@/components/social/SocialActionButtons';

const ITEMS_PER_PAGE = 20;

// Helper function to check if a product is an album
function isAlbum(product: any): boolean {
  if (product.metadata?.is_album === true) return true;
  if (product.tags && Array.isArray(product.tags)) {
    const tagStr = product.tags.join(' ').toLowerCase();
    if (tagStr.includes('album') || tagStr.includes('lp') || tagStr.includes('ep')) {
      return true;
    }
  }
  if (product.file_url && product.file_url.includes('manifest.json')) {
    return true;
  }
  return false;
}

// Get category icon
function getCategoryIcon(category: string) {
  switch (category?.toLowerCase()) {
    case 'music':
      return <Music className="w-4 h-4" />;
    case 'book':
    case 'ebook':
    case 'library':
      return <Book className="w-4 h-4" />;
    case 'art':
    case 'image':
      return <Image className="w-4 h-4" />;
    case 'video':
      return <Video className="w-4 h-4" />;
    default:
      return <Music className="w-4 h-4" />;
  }
}

// Get category color
function getCategoryColor(category: string) {
  switch (category?.toLowerCase()) {
    case 'music':
      return 'text-pink-300';
    case 'book':
    case 'ebook':
    case 'library':
      return 'text-green-300';
    case 'art':
    case 'image':
      return 'text-purple-300';
    case 'video':
      return 'text-blue-300';
    default:
      return 'text-yellow-300';
  }
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get('filter') || 'all';
  
  // Initialize state from URL params
  const getInitialCategory = () => {
    if (filterParam === 'all' || !filterParam) return 'all';
    if (filterParam === 'trending') return 'trending';
    if (filterParam === 'ebook') return 'book';
    return filterParam;
  };

  const getInitialSort = () => {
    return filterParam === 'trending' ? 'Trending' : 'Most Recent';
  };

  const [selectedCategory, setSelectedCategory] = useState<string>(getInitialCategory());
  const [selectedSort, setSelectedSort] = useState<string>(getInitialSort());
  const [activeFilter, setActiveFilter] = useState<string>(filterParam);
  const { addToBasket } = useProductBasket();
  const navigate = useNavigate();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['products', selectedCategory, selectedSort],
    initialPageParam: 0,
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      let query = supabase
        .from('products')
        .select(`
          *,
          sowers (
            user_id,
            display_name,
            logo_url,
            is_verified
          )
        `)
        .range(pageParam, pageParam + ITEMS_PER_PAGE - 1);

      // Apply category filter
      if (selectedCategory !== 'all' && selectedCategory !== 'trending') {
        query = query.eq('category', selectedCategory);
      }

      // Apply sorting - if trending filter is selected, sort by bestowal_count
      if (selectedCategory === 'trending' || selectedSort === 'Trending') {
        query = query.order('bestowal_count', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.length < ITEMS_PER_PAGE) return undefined;
      return allPages.length * ITEMS_PER_PAGE;
    },
  });

  const allProducts = data?.pages.flatMap(page => page) || [];
  const quickPicks = allProducts.slice(0, 4);

  // 30s preview playback (one at a time)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewStopTimerRef = useRef<number | null>(null);
  const [previewPlayingId, setPreviewPlayingId] = useState<string | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);

  const stopPreview = useCallback(() => {
    const audio = previewAudioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    if (previewStopTimerRef.current) {
      window.clearTimeout(previewStopTimerRef.current);
      previewStopTimerRef.current = null;
    }
    setPreviewPlayingId(null);
  }, []);

  useEffect(() => {
    return () => stopPreview();
  }, [stopPreview]);

  const getPreviewSourceUrl = useCallback(async (product: any): Promise<string> => {
    // Prefer an explicit preview URL if available, otherwise fall back to the main file.
    let url: string | undefined = product.preview_url || product.file_url;

    // If this is an album manifest, preview the first track.
    if (url && isAlbum(product) && String(url).includes('manifest.json')) {
      try {
        const res = await fetch(url);
        const manifest = await res.json();
        url = manifest?.tracks?.[0]?.url || url;
      } catch {
        // Fall back to manifest URL
      }
    }

    if (!url) throw new Error('Missing preview URL');
    return resolveAudioUrl(url);
  }, []);

  const handlePlay30s = useCallback(
    async (product: any, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (previewPlayingId === product.id) {
        stopPreview();
        return;
      }

      stopPreview();
      setPreviewLoadingId(product.id);

      try {
        const resolvedUrl = await getPreviewSourceUrl(product);

        if (!previewAudioRef.current) {
          previewAudioRef.current = new Audio();
        }

        const audio = previewAudioRef.current;
        audio.src = resolvedUrl;
        audio.currentTime = 0;
        audio.volume = 0.85;

        await audio.play();
        setPreviewPlayingId(product.id);

        previewStopTimerRef.current = window.setTimeout(() => {
          stopPreview();
          toast.info('Preview ended. Bestow to access the full track!');
        }, 30_000);

        audio.onended = () => stopPreview();
      } catch (err) {
        console.error('Preview playback error:', err);
        toast.error('Failed to play 30s preview');
        stopPreview();
      } finally {
        setPreviewLoadingId(null);
      }
    },
    [getPreviewSourceUrl, previewPlayingId, stopPreview]
  );

  const handleFilter = (filterType: string) => {
    setActiveFilter(filterType);
    
    // Update URL query parameter
    if (filterType === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ filter: filterType });
    }
    
    if (filterType === 'trending') {
      setSelectedCategory('trending');
      setSelectedSort('Trending');
    } else if (filterType === 'all') {
      setSelectedCategory('all');
      setSelectedSort('Most Recent');
    } else {
      // Map 'ebook' to 'book' for database query
      const dbCategory = filterType === 'ebook' ? 'book' : filterType;
      setSelectedCategory(dbCategory);
      setSelectedSort('Most Recent');
    }
  };

  // Infinite scroll observer
  const observerTarget = useRef<HTMLDivElement>(null);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [handleLoadMore, hasNextPage, isFetchingNextPage]);

  const handleBestow = (product: any, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      if (!product.id) {
        toast.error('Invalid product');
        return;
      }
      const amount = parseFloat(product.price || 0);
      addToBasket({
        id: product.id,
        title: product.title,
        price: amount,
        cover_image_url: product.cover_image_url,
        sower_id: product.sower_id,
        bestowal_count: product.bestowal_count || 0,
        sowers: product.sowers
      });
      // Show floating score at click position
      const x = e?.clientX ?? window.innerWidth / 2;
      const y = e?.clientY ?? window.innerHeight / 2;
      floatingScore(amount || 2, x, y);
      launchConfetti();
      playSoundEffect('bestow', 0.8);
      toast.success('Added to basket!', {
        action: {
          label: 'View Basket',
          onClick: () => navigate('/products/basket')
        }
      });
      navigate('/products/basket');
    } catch (error) {
      console.error('Bestow error:', error);
      toast.error('Failed to add to basket');
    }
  };

  const handleQuickRain = () => {
    if (!allProducts || allProducts.length === 0) {
      toast.error('No products available for Quick Rain');
      return;
    }
    
    // Randomly select a product
    const randomProduct = allProducts[Math.floor(Math.random() * allProducts.length)];
    
    // Add to basket with 0.50 USDC price override for Quick Rain
    try {
      const rainAmount = 0.50;
      addToBasket({
        id: randomProduct.id,
        title: randomProduct.title,
        price: rainAmount,
        cover_image_url: randomProduct.cover_image_url,
        sower_id: randomProduct.sower_id,
        bestowal_count: randomProduct.bestowal_count || 0,
        sowers: randomProduct.sowers
      });
      // Show floating score near the Quick Rain button (bottom right)
      floatingScore(rainAmount, window.innerWidth - 100, window.innerHeight - 100);
      launchConfetti();
      playSoundEffect('quickRain', 1.0);
      toast.success(`Quick Rain! Added ${randomProduct.title} to basket`, {
        action: {
          label: 'View Basket',
          onClick: () => navigate('/products/basket')
        }
      });
      navigate('/products/basket');
    } catch (error) {
      console.error('Quick Rain error:', error);
      toast.error('Failed to add Quick Rain');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-indigo-950 via-purple-900 to-teal-900 min-h-screen flex items-center justify-center text-white">
        <Loader2 className="w-12 h-12 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-950 via-purple-900 to-teal-900 min-h-screen text-white">
      {/* Header */}
      <div className="text-center py-12 px-6">
        <h1 className="text-5xl md:text-6xl font-bold flex items-center justify-center gap-4">
          <span className="text-7xl">Community Creations</span>
        </h1>
        <p className="text-yellow-200 text-xl mt-4 max-w-2xl mx-auto">
          Discover amazing music, art, courses & digital gifts from our family of creators.<br />
          Every bestow helps someone's orchard grow 🌱
        </p>
      </div>

      {/* Quick Picks Carousel */}
      {quickPicks.length > 0 && (
        <div className="px-6 pb-8">
          <h2 className="text-3xl font-bold text-center mb-6 flex items-center justify-center gap-3">
            <span className="text-5xl">Quick Picks Today</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickPicks.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-lg rounded-3xl overflow-hidden hover:scale-105 transition-all shadow-2xl"
              >
                {product.cover_image_url ? (
                  <img 
                    src={product.cover_image_url} 
                    alt={product.title}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://picsum.photos/400/300?random=${product.id}`;
                    }}
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    {getCategoryIcon(product.category)}
                  </div>
                )}
                <div className="p-5">
                  <div className={`flex items-center gap-2 text-sm ${getCategoryColor(product.category)}`}>
                    {getCategoryIcon(product.category)}
                    <span className="capitalize">{product.category || 'Product'}</span>
                  </div>
                  <h3 className="font-bold text-lg mt-1">{product.title}</h3>
                  <p className="text-sm opacity-80">{product.sowers?.display_name || 'Unknown Creator'}</p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-2xl font-bold text-yellow-400">
                      {formatCurrency(product.price || 0)}
                    </span>
                    <button
                      onClick={(e) => handleBestow(product, e)}
                      className="bg-gradient-to-r from-teal-500 to-cyan-400 px-6 py-3 rounded-full font-bold hover:scale-110 transition"
                    >
                      Bestow Now
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Infinite scroll grid */}
      <div className="px-6 pb-20">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <h2 className="text-4xl font-bold flex items-center gap-3 flex-wrap">
            <span className="text-6xl">All Fresh Creations</span>
            <span className="text-2xl text-yellow-300 animate-pulse">Live • {allProducts.length} available</span>
          </h2>
        </div>

        {/* Filter candy bar */}
        <div className="flex flex-wrap justify-center gap-4 my-10 px-6">
          <button
            onClick={() => handleFilter('all')}
            className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
          >
            All Creations
          </button>
          <button
            onClick={() => handleFilter('music')}
            className={`filter-btn ${activeFilter === 'music' ? 'active' : ''}`}
          >
            Music
          </button>
          <button
            onClick={() => handleFilter('ebook')}
            className={`filter-btn ${activeFilter === 'ebook' ? 'active' : ''}`}
          >
            E-Books & Courses
          </button>
          <button
            onClick={() => handleFilter('art')}
            className={`filter-btn ${activeFilter === 'art' ? 'active' : ''}`}
          >
            Art & Assets
          </button>
          <button
            onClick={() => handleFilter('video')}
            className={`filter-btn ${activeFilter === 'video' ? 'active' : ''}`}
          >
            Videos
          </button>
          <button
            onClick={() => handleFilter('trending')}
            className={`filter-btn ${activeFilter === 'trending' ? 'active' : ''}`}
          >
            Trending Now
          </button>
        </div>

        <div id="creations-container" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 px-6 pb-20">
          {allProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.05, 0.5) }}
              className="bg-white/10 backdrop-blur-lg rounded-3xl overflow-hidden hover:scale-105 transition-all shadow-2xl group"
            >
              <div className="relative">
                {product.cover_image_url ? (
                  <img
                    src={product.cover_image_url}
                    alt={product.title}
                    className="w-full h-64 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://picsum.photos/400/400?random=${product.id}`;
                    }}
                  />
                ) : (
                  <div className="w-full h-64 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    {getCategoryIcon(product.category)}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition"></div>
                {product.type === 'music' && (
                  <button
                    onClick={(e) => handlePlay30s(product, e)}
                    className="absolute top-4 right-4 bg-teal-500 p-4 rounded-full opacity-0 group-hover:opacity-100 transition hover:scale-125"
                    aria-label="Play 30 second preview"
                  >
                    {previewLoadingId === product.id
                      ? 'Loading…'
                      : previewPlayingId === product.id
                        ? 'Stop'
                        : 'Play 30s'}
                  </button>
                )}
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 text-sm">
                  <span className={getCategoryColor(product.category)}>
                    {product.category || 'Product'}
                  </span>
                  {product.bestowal_count > 0 && (
                    <>
                      {' • '}
                      <span className="text-yellow-300">{product.bestowal_count} bestows</span>
                    </>
                  )}
                </div>
                <h3 className="text-2xl font-bold mt-2">{product.title}</h3>
                <p className="text-lg opacity-80">{product.sowers?.display_name || 'Unknown Creator'}</p>
                <div className="flex items-center justify-between mt-6">
                  <div>
                    <div className="text-3xl font-bold text-yellow-400">
                      {formatCurrency(product.price || 0)}
                    </div>
                    <div className="text-sm opacity-70">to download</div>
                  </div>
                  <button
                    onClick={(e) => handleBestow(product, e)}
                    className="bg-gradient-to-r from-teal-500 to-cyan-400 px-8 py-4 rounded-full font-bold text-xl hover:scale-110 transition shadow-lg"
                  >
                    Bestow
                  </button>
                </div>

                {/* Like / Share / Follow */}
                {product?.sowers?.user_id && (
                  <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                    <SocialActionButtons
                      type="product"
                      itemId={product.id}
                      ownerId={product.sowers.user_id}
                      ownerName={product.sowers.display_name}
                      title={product.title}
                      likeCount={product.like_count || 0}
                      isOwner={false}
                      variant="compact"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Infinite scroll trigger element */}
        <div ref={observerTarget} className="h-10" />

        {/* Loading indicator - shows when fetching more */}
        {isFetchingNextPage && (
          <div id="loader" className="text-center py-12">
            <span className="text-6xl animate-bounce">Growing…</span>
          </div>
        )}

        {/* Load more button (fallback for manual loading) */}
        {hasNextPage && !isFetchingNextPage && (
          <div className="text-center mt-16" id="load-more-section">
            <button
              onClick={() => {
                fetchNextPage();
                launchConfetti();
              }}
              className="bg-white/20 hover:bg-white/30 backdrop-blur px-12 py-6 rounded-full text-2xl font-bold transition hover:scale-110"
            >
              More Creations Growing…
            </button>
          </div>
        )}

        {/* End message */}
        {!hasNextPage && allProducts.length > 0 && !isFetchingNextPage && (
          <div className="text-center mt-16">
            <p className="text-xl opacity-70">You've seen everything for now 🌱 Come back soon!</p>
          </div>
        )}

        {allProducts.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-white/80 text-lg">No products found in this category</p>
          </div>
        )}
      </div>

      {/* Floating "Quick Rain" button */}
      <button
        onClick={handleQuickRain}
        className="fixed bottom-8 right-8 bg-red-600 hover:bg-red-500 text-white rounded-full p-6 shadow-2xl hover:scale-110 transition z-40 flex items-center gap-3 text-xl font-bold"
      >
        Quick Rain 0.50 USDC
      </button>

      {/* Filter button styles */}
      <style>{`
        .filter-btn {
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          padding: 1rem 2rem;
          border-radius: 9999px;
          font-weight: bold;
          transition: all 0.3s;
          color: white;
          border: none;
          cursor: pointer;
        }
        .filter-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
        }
        .filter-btn.active {
          background: linear-gradient(to right, #14b8a6, #06b6d4);
          color: white;
        }
      `}</style>
    </div>
  );
}
