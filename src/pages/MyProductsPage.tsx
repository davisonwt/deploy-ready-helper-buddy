import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import ProductCard from '@/components/products/ProductCard';
import CategoryFilter from '@/components/products/CategoryFilter';
import SowerBooksSection from '@/components/products/SowerBooksSection';
import { Loader2, Package, Upload, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

export default function MyProductsPage() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedFormat, setSelectedFormat] = useState<string>('all'); // 'all', 'single', 'album'
  const [selectedStatus, setSelectedStatus] = useState<string>('all'); // 'all', 'active', 'paused'

  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['my-products', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // First get user's sower profile
      const { data: sowerData } = await supabase
        .from('sowers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!sowerData) return [];

      // Then get products for that sower
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
        .eq('sower_id', sowerData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  const filteredProducts = products?.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory || (selectedCategory === 'entertainment' && product.type === 'music');
    const matchesType = selectedType === 'all' || product.type === selectedType;
    const matchesFormat = selectedFormat === 'all' || (selectedFormat === 'single' && !isAlbum(product)) || (selectedFormat === 'album' && isAlbum(product));
    const matchesStatus = selectedStatus === 'all' || (product.status || 'active') === selectedStatus;
    return matchesCategory && matchesType && matchesFormat && matchesStatus;
  }) || [];

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center' style={{
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 25%, #b45309 50%, #92400e 75%, #78350f 100%)',
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
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 25%, #b45309 50%, #92400e 75%, #78350f 100%)',
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
              background: `radial-gradient(circle, rgba(${245 - i * 5}, ${158 - i * 3}, ${11 - i * 1}, 0.6), transparent)`,
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
                  {user?.first_name || 'Friend'}, Welcome to Your S2G Seeds
                </h1>
              </div>
              <p className='text-white/90 text-xl mb-4 backdrop-blur-sm bg-white/10 rounded-lg p-4 border border-white/20'>
                Manage your uploaded seeds — music, books, art, produce & digital content.
              </p>
              <Link to="/products/upload">
                <Button size="lg" className='backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30'>
                   <Upload className="w-5 h-5 mr-2" />

                  Upload New Seed
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>

        <div className='container mx-auto px-4 py-8'>
          {/* Category Filter - always visible */}
          <CategoryFilter
            selectedCategory={selectedCategory}
            selectedType={selectedType}
            selectedFormat={selectedFormat}
            selectedStatus={selectedStatus}
            onCategoryChange={setSelectedCategory}
            onTypeChange={setSelectedType}
            onFormatChange={setSelectedFormat}
            onStatusChange={setSelectedStatus}
          />

          {/* Section heading */}
          <h2 className='text-3xl font-bold mb-6 text-white'>
            {selectedCategory === 'all' ? 'All Your Seeds' : `Your ${selectedCategory} Seeds`}
          </h2>

          {/* Sower Books Section (books filtered by category) */}
          <SowerBooksSection selectedCategory={selectedCategory} />

          {/* Products Grid */}
          {filteredProducts.length > 0 ? (
            <section className='mb-16'>
              <div className='relative px-12'>
                <Carousel
                  opts={{
                    align: "start",
                    loop: true,
                  }}
                  className='w-full'
                >
                  <CarouselContent className='-ml-2 md:-ml-4'>
                    {filteredProducts.map((product) => (
                      <CarouselItem key={product.id} className='pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4'>
                        <ProductCard 
                          product={product} 
                          showActions={true} 
                        />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className='absolute -left-4 top-1/2 -translate-y-1/2 backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30' />
                  <CarouselNext className='absolute -right-4 top-1/2 -translate-y-1/2 backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30' />
                </Carousel>
              </div>
            </section>
          ) : !products || products.length === 0 ? (
            <Card className='max-w-2xl mx-auto mt-12 backdrop-blur-md bg-white/20 border-white/30 shadow-2xl'>
              <CardContent className='p-12 text-center'>
                <Package className='w-20 h-20 mx-auto text-white/70 mb-4' />
                <h3 className='text-2xl font-bold mb-2 text-white'>No Seeds Yet</h3>
                <p className='text-white/70 mb-6'>
                  Start sharing your creativity by uploading your first seed
                </p>
                <Link to="/products/upload">
                  <Button size="lg" className='backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30'>
                    <Plus className="w-5 h-5 mr-2" />
                    Upload Your First Seed
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : null}
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