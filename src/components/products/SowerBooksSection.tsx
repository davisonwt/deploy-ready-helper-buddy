import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, BookOpen, Plus, Pencil, Trash2, ExternalLink, Upload, X, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GradientPlaceholder } from '@/components/ui/GradientPlaceholder';
import { useToast } from '@/hooks/use-toast';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

interface SowerBook {
  id: string;
  sower_id: string;
  user_id: string;
  title: string;
  isbn: string | null;
  description: string | null;
  cover_image_url: string | null;
  image_urls: string[];
  published_date: string | null;
  publisher: string | null;
  page_count: number | null;
  genre: string | null;
  language: string | null;
  purchase_link: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

interface BookFormData {
  title: string;
  isbn: string;
  description: string;
  cover_image_url: string;
  published_date: string;
  publisher: string;
  page_count: string;
  genre: string;
  language: string;
  purchase_link: string;
}

const emptyFormData: BookFormData = {
  title: '',
  isbn: '',
  description: '',
  cover_image_url: '',
  published_date: '',
  publisher: '',
  page_count: '',
  genre: '',
  language: 'English',
  purchase_link: '',
};

const MAX_IMAGES = 3;

export default function SowerBooksSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<SowerBook | null>(null);
  const [formData, setFormData] = useState<BookFormData>(emptyFormData);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch sower profile and books
  const { data: sowerData, isLoading: sowerLoading } = useQuery({
    queryKey: ['sower-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('sowers')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const { data: books, isLoading: booksLoading } = useQuery({
    queryKey: ['sower-books', sowerData?.id],
    queryFn: async () => {
      if (!sowerData?.id) return [];
      const { data, error } = await supabase
        .from('sower_books')
        .select('*')
        .eq('sower_id', sowerData.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SowerBook[];
    },
    enabled: !!sowerData?.id
  });

  // Upload image to storage
  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user?.id) return null;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('book-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });
    
    if (error) {
      console.error('Upload error:', error);
      throw error;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('book-images')
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = MAX_IMAGES - uploadedImages.length;
    if (remainingSlots <= 0) {
      toast({ title: `Maximum ${MAX_IMAGES} images allowed`, variant: 'destructive' });
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setIsUploading(true);

    try {
      const uploadPromises = filesToUpload.map(file => uploadImage(file));
      const urls = await Promise.all(uploadPromises);
      const validUrls = urls.filter((url): url is string => url !== null);
      
      setUploadedImages(prev => [...prev, ...validUrls]);
      toast({ title: `${validUrls.length} image(s) uploaded successfully` });
    } catch (error) {
      toast({ title: 'Failed to upload image', description: String(error), variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Create book mutation
  const createBookMutation = useMutation({
    mutationFn: async (data: BookFormData) => {
      if (!sowerData?.id || !user?.id) throw new Error('Not logged in');
      
      const { error } = await supabase.from('sower_books').insert({
        sower_id: sowerData.id,
        user_id: user.id,
        title: data.title,
        isbn: data.isbn || null,
        description: data.description || null,
        cover_image_url: uploadedImages[0] || data.cover_image_url || null,
        image_urls: uploadedImages,
        published_date: data.published_date || null,
        publisher: data.publisher || null,
        page_count: data.page_count ? parseInt(data.page_count) : null,
        genre: data.genre || null,
        language: data.language || 'English',
        purchase_link: data.purchase_link || null,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sower-books'] });
      toast({ title: 'Book added successfully!' });
      resetForm();
    },
    onError: (error) => {
      toast({ title: 'Failed to add book', description: String(error), variant: 'destructive' });
    }
  });

  // Update book mutation
  const updateBookMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: BookFormData }) => {
      const { error } = await supabase.from('sower_books').update({
        title: data.title,
        isbn: data.isbn || null,
        description: data.description || null,
        cover_image_url: uploadedImages[0] || data.cover_image_url || null,
        image_urls: uploadedImages,
        published_date: data.published_date || null,
        publisher: data.publisher || null,
        page_count: data.page_count ? parseInt(data.page_count) : null,
        genre: data.genre || null,
        language: data.language || 'English',
        purchase_link: data.purchase_link || null,
      }).eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sower-books'] });
      toast({ title: 'Book updated successfully!' });
      resetForm();
    },
    onError: (error) => {
      toast({ title: 'Failed to update book', description: String(error), variant: 'destructive' });
    }
  });

  // Delete book mutation
  const deleteBookMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sower_books').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sower-books'] });
      toast({ title: 'Book deleted successfully!' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete book', description: String(error), variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setFormData(emptyFormData);
    setEditingBook(null);
    setUploadedImages([]);
    setIsDialogOpen(false);
  };

  const handleEdit = (book: SowerBook) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      isbn: book.isbn || '',
      description: book.description || '',
      cover_image_url: book.cover_image_url || '',
      published_date: book.published_date || '',
      publisher: book.publisher || '',
      page_count: book.page_count?.toString() || '',
      genre: book.genre || '',
      language: book.language || 'English',
      purchase_link: book.purchase_link || '',
    });
    setUploadedImages(book.image_urls || []);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    if (formData.description.length > 5000) {
      toast({ title: 'Description must be 5000 characters or less', variant: 'destructive' });
      return;
    }

    if (editingBook) {
      updateBookMutation.mutate({ id: editingBook.id, data: formData });
    } else {
      createBookMutation.mutate(formData);
    }
  };

  const isLoading = sowerLoading || booksLoading;
  const isSaving = createBookMutation.isPending || updateBookMutation.isPending;

  if (!sowerData) {
    return null; // User is not a sower
  }

  // Get display image for a book (first uploaded image, or cover_image_url, or null)
  const getBookCoverImage = (book: SowerBook): string | null => {
    if (book.image_urls && book.image_urls.length > 0) {
      return book.image_urls[0];
    }
    return book.cover_image_url;
  };

  return (
    <section className='mb-16'>
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-3xl font-bold text-white flex items-center gap-3'>
          <BookOpen className='w-8 h-8' />
          My Published Books
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className='backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30'
              onClick={() => { setEditingBook(null); setFormData(emptyFormData); setUploadedImages([]); }}
            >
              <Plus className='w-4 h-4 mr-2' />
              Add Book
            </Button>
          </DialogTrigger>
          <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
            <DialogHeader>
              <DialogTitle>{editingBook ? 'Edit Book' : 'Add New Book'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='col-span-2'>
                  <Label htmlFor='title'>Title *</Label>
                  <Input
                    id='title'
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder='Enter book title'
                    required
                  />
                </div>
                <div>
                  <Label htmlFor='isbn'>ISBN</Label>
                  <Input
                    id='isbn'
                    value={formData.isbn}
                    onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                    placeholder='978-0-123456-78-9'
                  />
                </div>
                <div>
                  <Label htmlFor='genre'>Genre</Label>
                  <Input
                    id='genre'
                    value={formData.genre}
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                    placeholder='Fiction, Non-Fiction, etc.'
                  />
                </div>
                <div>
                  <Label htmlFor='publisher'>Publisher</Label>
                  <Input
                    id='publisher'
                    value={formData.publisher}
                    onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                    placeholder='Publisher name (optional)'
                  />
                </div>
                <div>
                  <Label htmlFor='published_date'>Published Date</Label>
                  <Input
                    id='published_date'
                    type='date'
                    value={formData.published_date}
                    onChange={(e) => setFormData({ ...formData, published_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor='page_count'>Page Count</Label>
                  <Input
                    id='page_count'
                    type='number'
                    value={formData.page_count}
                    onChange={(e) => setFormData({ ...formData, page_count: e.target.value })}
                    placeholder='300'
                  />
                </div>
                <div>
                  <Label htmlFor='language'>Language</Label>
                  <Input
                    id='language'
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    placeholder='English'
                  />
                </div>

                {/* Image Upload Section */}
                <div className='col-span-2'>
                  <Label>Book Images (up to {MAX_IMAGES})</Label>
                  <div className='mt-2 space-y-3'>
                    {/* Uploaded images preview */}
                    {uploadedImages.length > 0 && (
                      <div className='flex flex-wrap gap-3'>
                        {uploadedImages.map((url, index) => (
                          <div key={index} className='relative group'>
                            <img
                              src={url}
                              alt={`Book image ${index + 1}`}
                              className='w-24 h-32 object-cover rounded-lg border border-border'
                            />
                            <button
                              type='button'
                              onClick={() => removeImage(index)}
                              className='absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity'
                            >
                              <X className='w-3 h-3' />
                            </button>
                            {index === 0 && (
                              <span className='absolute bottom-1 left-1 text-xs bg-primary text-primary-foreground px-1 rounded'>
                                Cover
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Upload button */}
                    {uploadedImages.length < MAX_IMAGES && (
                      <div>
                        <input
                          ref={fileInputRef}
                          type='file'
                          accept='image/*'
                          multiple
                          onChange={handleFileSelect}
                          className='hidden'
                          id='book-image-upload'
                        />
                        <Button
                          type='button'
                          variant='outline'
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className='w-full'
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className='w-4 h-4 mr-2' />
                              Upload Images ({uploadedImages.length}/{MAX_IMAGES})
                            </>
                          )}
                        </Button>
                        <p className='text-xs text-muted-foreground mt-1'>
                          First image will be used as the cover. Accepts JPG, PNG, WebP.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Fallback URL input if no uploads */}
                {uploadedImages.length === 0 && (
                  <div className='col-span-2'>
                    <Label htmlFor='cover_image_url'>Or Enter Cover Image URL</Label>
                    <Input
                      id='cover_image_url'
                      type='url'
                      value={formData.cover_image_url}
                      onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                      placeholder='https://example.com/cover.jpg'
                    />
                  </div>
                )}

                <div className='col-span-2'>
                  <Label htmlFor='purchase_link'>Purchase Link</Label>
                  <Input
                    id='purchase_link'
                    type='url'
                    value={formData.purchase_link}
                    onChange={(e) => setFormData({ ...formData, purchase_link: e.target.value })}
                    placeholder='https://amazon.com/your-book (optional)'
                  />
                </div>
                <div className='col-span-2'>
                  <Label htmlFor='description'>
                    Description ({formData.description.length}/5000 characters)
                  </Label>
                  <Textarea
                    id='description'
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder='Write a compelling description of your book...'
                    rows={6}
                    maxLength={5000}
                  />
                </div>
              </div>
              <div className='flex justify-end gap-3'>
                <Button type='button' variant='outline' onClick={resetForm}>
                  Cancel
                </Button>
                <Button type='submit' disabled={isSaving || isUploading}>
                  {isSaving && <Loader2 className='w-4 h-4 mr-2 animate-spin' />}
                  {editingBook ? 'Update Book' : 'Add Book'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className='flex justify-center py-12'>
          <Loader2 className='w-8 h-8 animate-spin text-white' />
        </div>
      ) : books && books.length > 0 ? (
        <div className='relative px-12'>
          <Carousel opts={{ align: 'start', loop: true }} className='w-full'>
            <CarouselContent className='-ml-2 md:-ml-4'>
              <AnimatePresence>
                {books.map((book) => (
                  <CarouselItem key={book.id} className='pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4'>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      <Card className='backdrop-blur-md bg-white/10 border-white/20 overflow-hidden h-full'>
                        <div className='aspect-[2/3] relative'>
                          {getBookCoverImage(book) ? (
                            <img
                              src={getBookCoverImage(book)!}
                              alt={book.title}
                              className='w-full h-full object-cover'
                            />
                          ) : (
                            <GradientPlaceholder
                              type={'book' as any}
                              title={book.title}
                              className='w-full h-full'
                            />
                          )}
                          {/* Image count badge */}
                          {book.image_urls && book.image_urls.length > 1 && (
                            <div className='absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1'>
                              <ImageIcon className='w-3 h-3' />
                              {book.image_urls.length}
                            </div>
                          )}
                        </div>
                        <CardContent className='p-4'>
                          <h3 className='font-bold text-white truncate mb-1'>{book.title}</h3>
                          {book.isbn && (
                            <p className='text-xs text-white/60 mb-2'>ISBN: {book.isbn}</p>
                          )}
                          {book.genre && (
                            <span className='inline-block px-2 py-0.5 text-xs bg-white/20 rounded text-white mb-2'>
                              {book.genre}
                            </span>
                          )}
                          {book.description && (
                            <p className='text-sm text-white/80 line-clamp-3 mb-3'>
                              {book.description}
                            </p>
                          )}
                          <div className='flex items-center gap-2'>
                            {book.purchase_link && (
                              <Button
                                size='sm'
                                variant='outline'
                                className='flex-1 bg-white/10 border-white/30 text-white hover:bg-white/20'
                                onClick={() => window.open(book.purchase_link!, '_blank')}
                              >
                                <ExternalLink className='w-3 h-3 mr-1' />
                                Buy
                              </Button>
                            )}
                            <Button
                              size='icon'
                              variant='ghost'
                              className='text-white hover:bg-white/20'
                              onClick={() => handleEdit(book)}
                            >
                              <Pencil className='w-4 h-4' />
                            </Button>
                            <Button
                              size='icon'
                              variant='ghost'
                              className='text-white hover:bg-red-500/50'
                              onClick={() => {
                                if (confirm('Delete this book?')) {
                                  deleteBookMutation.mutate(book.id);
                                }
                              }}
                            >
                              <Trash2 className='w-4 h-4' />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </CarouselItem>
                ))}
              </AnimatePresence>
            </CarouselContent>
            <CarouselPrevious className='absolute -left-4 top-1/2 -translate-y-1/2 backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30' />
            <CarouselNext className='absolute -right-4 top-1/2 -translate-y-1/2 backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30' />
          </Carousel>
        </div>
      ) : (
        <Card className='backdrop-blur-md bg-white/10 border-white/20'>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <BookOpen className='w-16 h-16 text-white/50 mb-4' />
            <p className='text-white/70 text-lg mb-2'>No books added yet</p>
            <p className='text-white/50 text-sm mb-4'>
              Share the books you've written with the community
            </p>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className='backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30'
            >
              <Plus className='w-4 h-4 mr-2' />
              Add Your First Book
            </Button>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
