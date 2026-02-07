import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Library, Loader2, FileText, GraduationCap, Image, Book, Eye, Download, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/formatters';
import { toast } from 'sonner';
import { GradientPlaceholder } from '@/components/ui/GradientPlaceholder';
import { launchConfetti } from '@/utils/confetti';

export default function S2GCommunityLibraryPage() {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<string>('all');

  const { data: libraryItems, isLoading } = useQuery({
    queryKey: ['s2g-community-library'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('s2g_library_items')
        .select('*')
        .eq('is_public', true)
        .neq('type', 'music') // Exclude music - it belongs in Community Music Library
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch profiles separately if needed
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(item => item.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        return data.map(item => ({
          ...item,
          profile: profileMap.get(item.user_id)
        }));
      }
      
      return data || [];
    }
  });

  const { data: userAccess } = useQuery({
    queryKey: ['library-access', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('s2g_library_item_access')
        .select('library_item_id')
        .eq('user_id', user.id);
      return (data || []).map(a => a.library_item_id);
    },
    enabled: !!user?.id
  });

  const hasAccess = (itemId: string) => {
    return userAccess?.includes(itemId) || false;
  };

  const handleBestow = async (item: any) => {
    if (!user) {
      toast.error('Please login to bestow');
      return;
    }

    // Handle giveaway
    if (item.is_giveaway && item.giveaway_count < (item.giveaway_limit || Infinity)) {
      const result = await supabase.functions.invoke('complete-library-bestowal', {
        body: {
          libraryItemId: item.id,
          amount: 0,
          sowerId: item.user_id,
          isGiveaway: true
        }
      });
      if (result.data?.success) {
        launchConfetti();
        toast.success('Giveaway access granted!');
        window.location.reload();
      }
      return;
    }

    if (!item.price || item.price <= 0) {
      toast.error('This item requires bestowal but has no bestow value set');
      return;
    }

    // Initiate NOWPayments for bestowal
    try {
      const { data, error } = await supabase.functions.invoke('create-nowpayments-order', {
        body: {
          amount: item.price,
          paymentType: 'product',
          productItems: [{
            id: item.id,
            title: item.title,
            price: item.price,
            sower_id: item.user_id
          }]
        }
      });

      if (error) {
        console.error('NOWPayments order creation error:', error);
        toast.error(error.message || 'Failed to initiate bestowal payment');
        return;
      }

      if (data?.invoiceUrl) {
        window.location.href = data.invoiceUrl;
        toast.info('Redirecting to payment page...');
      } else {
        toast.error('Failed to get payment URL. Please try again.');
      }
    } catch (error: any) {
      console.error('Payment initiation error:', error);
      toast.error(`Payment initiation failed: ${error.message}`);
    }
  };

  const filteredItems = libraryItems?.filter(item => {
    return selectedType === 'all' || item.type === selectedType;
  }) || [];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ebook': return <Book className='w-5 h-5' />;
      case 'document': return <FileText className='w-5 h-5' />;
      case 'training_course': return <GraduationCap className='w-5 h-5' />;
      case 'art_asset': return <Image className='w-5 h-5' />;
      case 'study': return <FileText className='w-5 h-5' />;
      default: return <FileText className='w-5 h-5' />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'ebook': return 'E-Book';
      case 'document': return 'Document';
      case 'training_course': return 'Training Course';
      case 'art_asset': return 'Art Asset';
      case 'study': return 'Study';
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center' style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
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
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
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
              background: `radial-gradient(circle, rgba(102, 126, 234, 0.6), transparent)`,
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
                  <Library className='w-16 h-16 text-white' />
                </div>
                <h1 className='text-6xl font-bold text-white drop-shadow-2xl'>
                  S2G Community Library
                </h1>
              </div>
              <p className='text-white/90 text-xl mb-4 backdrop-blur-sm bg-white/10 rounded-lg p-4 border border-white/20'>
                Grow further, together. This is our community's vault of resources—a place to find and share e-books, courses, studies, documents, and creative assets.
              </p>
              <p className='text-white/70 text-sm'>
                Preview available • Full access after bestowal • For music, visit the Community Music Library
              </p>
            </motion.div>
          </div>
        </div>

        <div className='container mx-auto px-4 py-8'>
          {/* Type Filter */}
          <div className='flex gap-3 mb-8 flex-wrap justify-center'>
            <Button
              variant={selectedType === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedType('all')}
              className='backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30'
            >
              All Items
            </Button>
            {['ebook', 'document', 'training_course', 'art_asset', 'study'].map((type) => (
              <Button
                key={type}
                variant={selectedType === type ? 'default' : 'outline'}
                onClick={() => setSelectedType(type)}
                className='backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30'
              >
                {getTypeIcon(type)}
                <span className='ml-2'>{getTypeLabel(type)}</span>
              </Button>
            ))}
          </div>

          {/* Library Items Grid */}
          {filteredItems.length === 0 ? (
            <Card className='max-w-2xl mx-auto mt-12 backdrop-blur-md bg-white/20 border-white/30'>
              <CardContent className='p-12 text-center'>
                <Library className='w-20 h-20 mx-auto text-white/70 mb-4' />
                <h3 className='text-2xl font-bold mb-2 text-white'>No Items Available</h3>
                <p className='text-white/70 mb-6'>
                  Be the first to share your resources with the community!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
              {filteredItems.map((item) => {
                const accessGranted = hasAccess(item.id);
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    className='backdrop-blur-md bg-white/20 border border-white/30 rounded-xl overflow-hidden shadow-2xl'
                  >
                    <CardHeader className='p-4'>
                      <div className='flex items-start justify-between mb-2'>
                        <div className='flex items-center gap-2'>
                          <div className='p-2 rounded-lg bg-white/20'>
                            {getTypeIcon(item.type)}
                          </div>
                          <Badge variant='secondary' className='bg-white/30 text-white border-white/40'>
                            {getTypeLabel(item.type)}
                          </Badge>
                        </div>
                      </div>
                      <CardTitle className='text-white line-clamp-2 mb-2'>{item.title}</CardTitle>
                      {(item as any).profile && (
                        <p className='text-white/70 text-sm mb-3'>
                          by {(item as any).profile.display_name || 'Anonymous'}
                        </p>
                      )}
                      
                      {/* Bestowal Value - Prominently Displayed */}
                      <div className='mt-3'>
                        {item.price > 0 ? (
                          <div className='bg-purple-500/20 border border-purple-400 rounded-lg p-3'>
                            <p className='text-2xl font-bold text-white mb-1'>
                              {formatCurrency(item.price)}
                            </p>
                            <p className='text-white/70 text-xs'>to bestow</p>
                          </div>
                        ) : (
                          <Badge className='bg-blue-500 text-white'>Free</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className='p-4 pt-0'>
                      <div className='relative mb-4 rounded-lg overflow-hidden'>
                        {item.cover_image_url ? (
                          <>
                            <img
                              src={item.cover_image_url}
                              alt={item.title}
                              className='w-full h-48 object-cover'
                            />
                            {!accessGranted && (
                              <div className='absolute inset-0 bg-black/60 flex items-center justify-center'>
                                <div className='text-center'>
                                  <Eye className='w-12 h-12 text-white mx-auto mb-2' />
                                  <p className='text-white text-sm'>
                                    {item.type === 'ebook' ? 'Preview Only' : item.type === 'music' || item.type === 'training_course' ? '30s Preview' : 'Preview Only'}
                                  </p>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <GradientPlaceholder 
                            type={item.type as any} 
                            title={item.title}
                            className="w-full h-48"
                            size="lg"
                          />
                        )}
                      </div>
                      <p className='text-white/80 text-sm line-clamp-3 mb-4'>
                        {item.description}
                      </p>
                      <div className='flex items-center justify-between text-sm text-white/70 mb-4'>
                        <span>{item.bestowal_count || 0} bestowals</span>
                        <span>{item.download_count || 0} downloads</span>
                      </div>
                      {accessGranted ? (
                        <>
                          {item.type === 'ebook' ? (
                            <div className='space-y-2'>
                              <Button
                                className='w-full bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white'
                                asChild
                              >
                                <a href={item.preview_url || item.file_url} target='_blank' rel='noopener noreferrer'>
                                  <Eye className='w-4 h-4 mr-2' />
                                  Read Preview
                                </a>
                              </Button>
                              <Button
                                className='w-full bg-gradient-to-r from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white'
                                asChild
                              >
                                <a href={item.file_url} download target='_blank' rel='noopener noreferrer'>
                                  <Download className='w-4 h-4 mr-2' />
                                  Download Full E-Book
                                </a>
                              </Button>
                            </div>
                          ) : (
                            <Button
                              className='w-full bg-gradient-to-r from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white'
                              asChild
                            >
                              <a href={item.file_url} download target='_blank' rel='noopener noreferrer'>
                                <Download className='w-4 h-4 mr-2' />
                                Download
                              </a>
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button
                          className='w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                          onClick={() => handleBestow(item)}
                        >
                          <Heart className='w-4 h-4 mr-2' />
                          Bestow to Access
                        </Button>
                      )}
                    </CardContent>
                  </motion.div>
                );
              })}
            </div>
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
