import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import ProductCard from '@/components/products/ProductCard';
import CategoryFilter from '@/components/products/CategoryFilter';
import { Loader2, Package, Upload, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function MyProductsPage() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

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
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesType = selectedType === 'all' || product.type === selectedType;
    return matchesCategory && matchesType;
  }) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background/95 to-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background">
      {/* Hero Header */}
      <div className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 animate-gradient" />
        <div className="relative container mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Package className="w-12 h-12 text-primary" />
              <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                My Products
              </h1>
            </div>
            <p className="text-muted-foreground text-lg mb-6">
              Manage your uploaded products, music, and digital content
            </p>
            <Link to="/products/upload">
              <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                <Upload className="w-5 h-5 mr-2" />
                Upload New Product
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {products && products.length > 0 ? (
          <>
            {/* Category Filter */}
            <CategoryFilter
              selectedCategory={selectedCategory}
              selectedType={selectedType}
              onCategoryChange={setSelectedCategory}
              onTypeChange={setSelectedType}
            />

            {/* Products Grid */}
            <section className="mb-16">
              <h2 className="text-3xl font-bold mb-6 text-foreground">
                {selectedCategory === 'all' ? 'All Your Products' : `Your ${selectedCategory} Products`}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    showActions={true} 
                  />
                ))}
              </div>
              {filteredProducts.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">No products found in this category</p>
                </div>
              )}
            </section>
          </>
        ) : (
          <Card className="max-w-2xl mx-auto mt-12">
            <CardContent className="p-12 text-center">
              <Package className="w-20 h-20 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-2xl font-bold mb-2">No Products Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start sharing your creativity by uploading your first product
              </p>
              <Link to="/products/upload">
                <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                  <Plus className="w-5 h-5 mr-2" />
                  Upload Your First Product
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}