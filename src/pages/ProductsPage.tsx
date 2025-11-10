import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/products/ProductCard';
import CategoryFilter from '@/components/products/CategoryFilter';
import { Loader2, TrendingUp, Sparkles, Upload } from 'lucide-react';
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

export default function ProductsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

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
    return matchesCategory && matchesType;
  }) || [];

  const quickPicks = filteredProducts; // Show all products
  const topProducts = filteredProducts; // Show all products
  const mostBestowed = [...filteredProducts]
    .filter(p => p.bestowal_count > 0)
    .sort((a, b) => b.bestowal_count - a.bestowal_count);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background/95 to-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Transparent Magenta Background */}
      <div className="fixed inset-0 bg-fuchsia-900/40 pointer-events-none" style={{ zIndex: 0 }} />
      <div className="relative" style={{ zIndex: 1 }}>
      
      {/* Hero Header */}
      <div className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 animate-gradient" />
        <div className="relative container mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              S2G Community Products
            </h1>
            <p className="text-muted-foreground text-lg mb-6">
              Discover amazing music, art, and digital content from our community of creators
            </p>
            <Link to="/products/upload">
              <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                <Upload className="w-5 h-5 mr-2" />
                Upload Your Creation
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Quick Picks Section */}
        {quickPicks.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-primary" />
                <h2 className="text-3xl font-bold text-foreground">Quick Picks</h2>
              </div>
            </div>
            <div className="relative px-12">
              <Carousel
                opts={{
                  align: "start",
                  loop: true,
                }}
                className="w-full"
              >
                <CarouselContent className="-ml-2 md:-ml-4">
                  {quickPicks.map((product, index) => (
                    <CarouselItem key={product.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/4">
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
                <CarouselPrevious className="absolute -left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background border-2 border-primary" />
                <CarouselNext className="absolute -right-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background border-2 border-primary" />
              </Carousel>
            </div>
          </section>
        )}

        {/* Category Filter */}
        <CategoryFilter
          selectedCategory={selectedCategory}
          selectedType={selectedType}
          onCategoryChange={setSelectedCategory}
          onTypeChange={setSelectedType}
        />

        {/* Top Category Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6 text-foreground">
            {selectedCategory === 'all' ? 'All Content' : `Top ${selectedCategory}`}
          </h2>
          {topProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No products found in this category</p>
            </div>
          ) : (
            <div className="relative px-12">
              <Carousel
                opts={{
                  align: "start",
                  loop: true,
                }}
                className="w-full"
              >
                <CarouselContent className="-ml-2 md:-ml-4">
                  {topProducts.map((product) => (
                    <CarouselItem key={product.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                      <ProductCard product={product} />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="absolute -left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background border-2 border-primary" />
                <CarouselNext className="absolute -right-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background border-2 border-primary" />
              </Carousel>
            </div>
          )}
        </section>

        {/* Today's Most Bestowed */}
        {mostBestowed.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-6 h-6 text-primary" />
              <h2 className="text-3xl font-bold text-foreground">Most Bestowed</h2>
            </div>
            <div className="relative px-12">
              <Carousel
                opts={{
                  align: "start",
                  loop: true,
                }}
                className="w-full"
              >
                <CarouselContent className="-ml-2 md:-ml-4">
                  {mostBestowed.map((product) => (
                    <CarouselItem key={product.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/4">
                      <ProductCard product={product} featured />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="absolute -left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background border-2 border-primary" />
                <CarouselNext className="absolute -right-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background border-2 border-primary" />
              </Carousel>
            </div>
          </section>
        )}
      </div>
      </div>
    </div>
  );
}
