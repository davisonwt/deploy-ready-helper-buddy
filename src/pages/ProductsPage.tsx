import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/products/ProductCard';
import CategoryFilter from '@/components/products/CategoryFilter';
import { Loader2, TrendingUp, Sparkles, Upload, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

// Helper function to check if a product is an album
function isAlbum(product: any): boolean {
  // Check metadata field
  if (product.metadata?.is_album === true) return true;
  
  // Check tags array
  if (product.tags && Array.isArray(product.tags)) {
    const tagStr = product.tags.join(' ').toLowerCase();
    if (tagStr.includes('album') || tagStr.includes('lp') || tagStr.includes('ep')) {
      return true;
    }
  }
  
  // Check if file_url points to a manifest.json (album manifest)
  if (product.file_url && product.file_url.includes('manifest.json')) {
    return true;
  }
  
  return false;
}

export default function ProductsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedFormat, setSelectedFormat] = useState<string>('all'); // 'all', 'single', 'album'

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  const filteredProducts = products?.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesType = selectedType === 'all' || product.type === selectedType;
    const matchesFormat = selectedFormat === 'all' || (selectedFormat === 'single' && !isAlbum(product)) || (selectedFormat === 'album' && isAlbum(product));
    return matchesCategory && matchesType && matchesFormat;
  }) || [];

  const quickPicks = filteredProducts; // Show all products
  const topProducts = filteredProducts; // Show all products
  const mostBestowed = [...filteredProducts]
    .filter(p => p.bestowal_count > 0)
    .sort((a, b) => b.bestowal_count - a.bestowal_count);

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center' style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 25%, #1d4ed8 50%, #1e40af 75%, #1e3a8a 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradient 15s ease infinite'
      }}>
        <Loader2 className='w-12 h-12 animate-spin text-white' />
      </div>
    );
  }

  return (
    <div className='min-h-screen relative overflow-hidden'>
      {/* Creative Animated Background */}
      <div className='fixed inset-0 z-0'>
        <div className='absolute inset-0' style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 25%, #1d4ed8 50%, #1e40af 75%, #1e3a8a 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradient 20s ease infinite'
        }} />
        <div className='absolute inset-0 bg-black/20' />
        {/* Floating orbs */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className='absolute rounded-full blur-3xl opacity-30'
            style={{
              width: `${200 + i * 100}px`,
              height: `${200 + i * 100}px`,
              background: `radial-gradient(circle, rgba(${59 - i * 2}, ${130 - i * 3}, ${246 - i * 2}, 0.6), transparent)`,
              left: `${10 + i * 15}%`,
              top: `${10 + i * 12}%`,
            }}
            animate={{
              x: [0, 100, 0],
              y: [0, 50, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className='relative z-10'>
        {/* Hero Header */}
        <div className='relative overflow-hidden border-b border-white/20 backdrop-blur-md bg-white/10'>
          <div className='relative container mx-auto px-4 py-16'>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className='text-center max-w-4xl mx-auto'
            >
              <div className='flex items-center justify-center gap-4 mb-6'>
                <div className='p-4 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30'>
                  <Package className='w-16 h-16 text-white' />
                </div>
                <h1 className='text-6xl font-bold text-white drop-shadow-2xl'>
                  S2G Community Products
                </h1>
              </div>
              <p className='text-white/90 text-xl mb-4 backdrop-blur-sm bg-white/10 rounded-lg p-4 border border-white/20'>
                Discover amazing music, art, and digital content from our community of creators. Support creators and grow together.
              </p>
              <Link to="/products/upload">
                <Button size="lg" className='backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30'>
                  <Upload className="w-5 h-5 mr-2" />
                  Upload Your Creation
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>

        <div className='container mx-auto px-4 py-8'>
          {/* Quick Picks Section */}
          {quickPicks.length > 0 && (
            <section className='mb-16'>
              <div className='flex items-center justify-between mb-6'>
                <div className='flex items-center gap-3'>
                  <Sparkles className='w-6 h-6 text-white' />
                  <h2 className='text-3xl font-bold text-white'>Quick Picks</h2>
                </div>
              </div>
              <div className='relative px-12'>
                <Carousel
                  opts={{
                    align: "start",
                    loop: true,
                  }}
                  className='w-full'
                >
                  <CarouselContent className='-ml-2 md:-ml-4'>
                    {quickPicks.map((product, index) => (
                      <CarouselItem key={product.id} className='pl-2 md:pl-4 md:basis-1/2 lg:basis-1/4'>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(index * 0.1, 0.5) }}
                        >
                          <ProductCard product={product} />
                        </motion.div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className='absolute -left-4 top-1/2 -translate-y-1/2 backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30' />
                  <CarouselNext className='absolute -right-4 top-1/2 -translate-y-1/2 backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30' />
                </Carousel>
              </div>
            </section>
          )}

          {/* Category Filter */}
          <CategoryFilter
            selectedCategory={selectedCategory}
            selectedType={selectedType}
            selectedFormat={selectedFormat}
            onCategoryChange={setSelectedCategory}
            onTypeChange={setSelectedType}
            onFormatChange={setSelectedFormat}
          />

          {/* Top Category Section */}
          <section className='mb-16'>
            <h2 className='text-3xl font-bold mb-6 text-white'>
              {selectedCategory === 'all' ? 'All Content' : `Top ${selectedCategory}`}
            </h2>
            {topProducts.length === 0 ? (
              <div className='text-center py-12'>
                <p className='text-white/80 text-lg'>No products found in this category</p>
              </div>
            ) : (
              <div className='relative px-12'>
                <Carousel
                  opts={{
                    align: "start",
                    loop: true,
                  }}
                  className='w-full'
                >
                  <CarouselContent className='-ml-2 md:-ml-4'>
                    {topProducts.map((product) => (
                      <CarouselItem key={product.id} className='pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4'>
                        <ProductCard product={product} />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className='absolute -left-4 top-1/2 -translate-y-1/2 backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30' />
                  <CarouselNext className='absolute -right-4 top-1/2 -translate-y-1/2 backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30' />
                </Carousel>
              </div>
            )}
          </section>

          {/* Today's Most Bestowed */}
          {mostBestowed.length > 0 && (
            <section className='mb-16'>
              <div className='flex items-center gap-3 mb-6'>
                <TrendingUp className='w-6 h-6 text-white' />
                <h2 className='text-3xl font-bold text-white'>Most Bestowed</h2>
              </div>
              <div className='relative px-12'>
                <Carousel
                  opts={{
                    align: "start",
                    loop: true,
                  }}
                  className='w-full'
                >
                  <CarouselContent className='-ml-2 md:-ml-4'>
                    {mostBestowed.map((product) => (
                      <CarouselItem key={product.id} className='pl-2 md:pl-4 md:basis-1/2 lg:basis-1/4'>
                        <ProductCard product={product} featured />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className='absolute -left-4 top-1/2 -translate-y-1/2 backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30' />
                  <CarouselNext className='absolute -right-4 top-1/2 -translate-y-1/2 backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30' />
                </Carousel>
              </div>
            </section>
          )}
        </div>
      </div>

      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
