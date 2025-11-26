import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Book, Upload, Loader2, FileText, GraduationCap, Image, Music, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/formatters';

export default function MyS2GLibraryPage() {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<string>('all');

  const { data: libraryItems, isLoading, refetch } = useQuery({
    queryKey: ['my-s2g-library', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('s2g_library_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  const filteredItems = libraryItems?.filter(item => {
    return selectedType === 'all' || item.type === selectedType;
  }) || [];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ebook': return <Book className="w-5 h-5" />;
      case 'document': return <FileText className="w-5 h-5" />;
      case 'training_course': return <GraduationCap className="w-5 h-5" />;
      case 'art_asset': return <Image className="w-5 h-5" />;
      case 'music': return <Music className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'ebook': return 'E-Book';
      case 'document': return 'Document';
      case 'training_course': return 'Training Course';
      case 'art_asset': return 'Art Asset';
      case 'music': return 'Music';
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background/95 to-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Creative Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradient 20s ease infinite'
        }} />
        <div className="absolute inset-0 bg-black/10" />
        {/* Floating geometric shapes */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              width: `${50 + i * 20}px`,
              height: `${50 + i * 20}px`,
              border: '2px solid rgba(255,255,255,0.2)',
              borderRadius: i % 2 === 0 ? '50%' : '20%',
              left: `${5 + i * 12}%`,
              top: `${10 + i * 10}%`,
            }}
            animate={{
              rotate: [0, 360],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 15 + i * 2,
              repeat: Infinity,
              ease: 'linear'
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10">
      {/* Hero Header */}
      <div className="relative overflow-hidden border-b border-white/20 backdrop-blur-md bg-white/10">
        <div className="relative container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="p-4 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30">
                <Book className="w-16 h-16 text-white" />
              </div>
              <h1 className="text-6xl font-bold text-white drop-shadow-2xl">
                My S2G Library
              </h1>
            </div>
            <p className="text-white/90 text-xl mb-4 backdrop-blur-sm bg-white/10 rounded-lg p-4 border border-white/20">
              Your central hub for all S2G digital products. Find every e-book, document, training course, and art asset you own, all in one place.
            </p>
            <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white backdrop-blur-md" asChild>
              <Link to="/my-s2g-library/upload">
                <Upload className="w-5 h-5 mr-2" />
                Upload New Item
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Type Filter */}
        <div className="flex gap-3 mb-8 flex-wrap justify-center">
          <Button
            variant={selectedType === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedType('all')}
            className="backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30"
          >
            All Items
          </Button>
          <Button
            variant={selectedType === 'ebook' ? 'default' : 'outline'}
            onClick={() => setSelectedType('ebook')}
            className="backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30"
          >
            <Book className="w-4 h-4 mr-2" />
            E-Books
          </Button>
          <Button
            variant={selectedType === 'document' ? 'default' : 'outline'}
            onClick={() => setSelectedType('document')}
            className="backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30"
          >
            <FileText className="w-4 h-4 mr-2" />
            Documents
          </Button>
          <Button
            variant={selectedType === 'training_course' ? 'default' : 'outline'}
            onClick={() => setSelectedType('training_course')}
            className="backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30"
          >
            <GraduationCap className="w-4 h-4 mr-2" />
            Training Courses
          </Button>
          <Button
            variant={selectedType === 'art_asset' ? 'default' : 'outline'}
            onClick={() => setSelectedType('art_asset')}
            className="backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30"
          >
            <Image className="w-4 h-4 mr-2" />
            Art Assets
          </Button>
          <Button
            variant={selectedType === 'music' ? 'default' : 'outline'}
            onClick={() => setSelectedType('music')}
            className="backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30"
          >
            <Music className="w-4 h-4 mr-2" />
            Music
          </Button>
        </div>

        {/* Library Items Grid */}
        {filteredItems.length === 0 ? (
          <Card className="max-w-2xl mx-auto mt-12 backdrop-blur-md bg-white/20 border-white/30">
            <CardContent className="p-12 text-center">
              <Book className="w-20 h-20 mx-auto text-white/70 mb-4" />
              <h3 className="text-2xl font-bold mb-2 text-white">No Library Items Yet</h3>
              <p className="text-white/70 mb-6">
                Start building your library by uploading your first digital product
              </p>
              <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white" asChild>
                <Link to="/my-s2g-library/upload">
                  <Plus className="w-5 h-5 mr-2" />
                  Upload Your First Item
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
              >
              <Card className="hover:shadow-lg transition-shadow backdrop-blur-md bg-white/20 border-white/30">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-white/20">
                        {getTypeIcon(item.type)}
                      </div>
                      <Badge variant="secondary" className="bg-white/30 text-white border-white/40">{getTypeLabel(item.type)}</Badge>
                    </div>
                    {item.price > 0 && (
                      <span className="text-lg font-bold text-white">
                        {formatCurrency(item.price)}
                      </span>
                    )}
                  </div>
                  <CardTitle className="mt-2 line-clamp-2 text-white">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-white/80 line-clamp-3 mb-4">
                    {item.description}
                  </p>
                  {item.cover_image_url && (
                    <img
                      src={item.cover_image_url}
                      alt={item.title}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  )}
                  <div className="flex items-center justify-between text-sm text-white/70">
                    <span>{item.bestowal_count || 0} bestowals</span>
                    <span>{item.download_count || 0} downloads</span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 border-white/30 text-white hover:bg-white/20" asChild>
                      <a href={item.file_url} download target="_blank" rel="noopener noreferrer">
                        Download
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/20" asChild>
                      <Link to={`/my-s2g-library/edit/${item.id}`}>
                        Edit
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
              </motion.div>
            ))}
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
