import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Loader2, Save, BookOpen, Book, FileText, GraduationCap, Image, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  'Education', 'Entertainment', 'Business', 'Health', 'Technology',
  'Lifestyle', 'Spiritual', 'Kitchenware', 'Properties', 'Vehicles', 'Fashion', 'Food'
];

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'ebook': return <Book className="w-5 h-5" />;
    case 'book': return <BookOpen className="w-5 h-5" />;
    case 'document': return <FileText className="w-5 h-5" />;
    case 'training_course': return <GraduationCap className="w-5 h-5" />;
    case 'art_asset': return <Image className="w-5 h-5" />;
    case 'study': return <FileText className="w-5 h-5" />;
    default: return <FileText className="w-5 h-5" />;
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'ebook': return 'E-Book';
    case 'book': return 'Physical Book';
    case 'document': return 'Document';
    case 'training_course': return 'Training Course';
    case 'art_asset': return 'Art Asset';
    case 'study': return 'Study';
    default: return type;
  }
};

export default function LibraryItemEditPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isPhysicalBook, setIsPhysicalBook] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newCoverImage, setNewCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  // Common fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [tags, setTags] = useState('');

  // Library item fields
  const [itemType, setItemType] = useState('ebook');
  const [price, setPrice] = useState(0);

  // Book-specific fields
  const [bestowalValue, setBestowalValue] = useState(0);
  const [isbn, setIsbn] = useState('');
  const [language, setLanguage] = useState('');
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [publisher, setPublisher] = useState('');
  const [publishedDate, setPublishedDate] = useState('');
  const [deliveryType, setDeliveryType] = useState('shipping');
  const [isAvailable, setIsAvailable] = useState(true);
  const [whispererPercent, setWhispererPercent] = useState(0);
  const [hasWhisperer, setHasWhisperer] = useState(false);

  useEffect(() => {
    if (!id || !user) return;

    const loadItem = async () => {
      setLoading(true);

      // Try s2g_library_items first
      const { data: libItem } = await supabase
        .from('s2g_library_items')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (libItem) {
        setTitle(libItem.title || '');
        setDescription(libItem.description || '');
        setItemType(libItem.type || 'ebook');
        setCategory(libItem.category || '');
        setPrice(libItem.price || 0);
        setIsPublic(libItem.is_public ?? true);
        setTags(Array.isArray(libItem.tags) ? libItem.tags.join(', ') : '');
        if (libItem.cover_image_url) {
          setExistingImages([libItem.cover_image_url]);
          setCoverPreview(libItem.cover_image_url);
        }
        setLoading(false);
        return;
      }

      // Try sower_books
      const { data: sowerData } = await supabase
        .from('sowers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (sowerData) {
        const { data: book } = await supabase
          .from('sower_books')
          .select('*')
          .eq('id', id)
          .eq('sower_id', sowerData.id)
          .maybeSingle();

        if (book) {
          setIsPhysicalBook(true);
          setItemType('book');
          setTitle(book.title || '');
          setDescription(book.description || '');
          setCategory(book.category || '');
          setBestowalValue(book.bestowal_value || 0);
          setIsPublic(book.is_public ?? true);
          setIsAvailable(book.is_available ?? true);
          setIsbn(book.isbn || '');
          setLanguage(book.language || '');
          setPageCount(book.page_count);
          setPublisher(book.publisher || '');
          setPublishedDate(book.published_date || '');
          setDeliveryType(book.delivery_type || 'shipping');
          setWhispererPercent(book.whisperer_commission_percent || 0);
          setHasWhisperer(book.has_whisperer ?? false);
          
          const images = Array.isArray(book.image_urls) ? book.image_urls : [];
          setExistingImages(images);
          if (book.cover_image_url) {
            setCoverPreview(book.cover_image_url);
          } else if (images.length > 0) {
            setCoverPreview(images[0]);
          }
          setLoading(false);
          return;
        }
      }

      setNotFound(true);
      setLoading(false);
    };

    loadItem();
  }, [id, user]);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewCoverImage(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const removeCover = () => {
    setNewCoverImage(null);
    setCoverPreview(null);
    setExistingImages([]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user) return;

    setSaving(true);
    try {
      // Upload new cover if provided
      let coverUrl = existingImages[0] || null;
      if (newCoverImage) {
        const ext = newCoverImage.name.split('.').pop();
        const path = `library/${user.id}/cover-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('premium-room')
          .upload(path, newCoverImage);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('premium-room').getPublicUrl(path);
        coverUrl = urlData.publicUrl;
      }

      if (isPhysicalBook) {
        const { data: sowerData } = await supabase
          .from('sowers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!sowerData) throw new Error('Sower not found');

        const { error } = await supabase
          .from('sower_books')
          .update({
            title,
            description,
            category,
            bestowal_value: bestowalValue,
            is_public: isPublic,
            is_available: isAvailable,
            cover_image_url: coverUrl,
            isbn: isbn || null,
            language: language || null,
            page_count: pageCount,
            publisher: publisher || null,
            published_date: publishedDate || null,
            delivery_type: deliveryType,
            has_whisperer: hasWhisperer,
            whisperer_commission_percent: hasWhisperer ? whispererPercent : 0,
          })
          .eq('id', id)
          .eq('sower_id', sowerData.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('s2g_library_items')
          .update({
            title,
            description,
            type: itemType,
            category,
            price,
            is_public: isPublic,
            cover_image_url: coverUrl,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          })
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;
      }

      toast.success('Item updated successfully!');
      navigate('/my-s2g-library');
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error(error.message || 'Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Item Not Found</h1>
        <p className="text-muted-foreground">This item doesn't exist or you don't have access to edit it.</p>
        <Button onClick={() => navigate('/my-s2g-library')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Library
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradient 20s ease infinite'
        }} />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <div className="relative z-10 container max-w-3xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/my-s2g-library')}
          className="mb-4 text-white hover:bg-white/20"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Library
        </Button>

        <Card className="backdrop-blur-md bg-white/20 border-white/30">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/20">
                {getTypeIcon(itemType)}
              </div>
              <div>
                <CardTitle className="text-2xl text-white">
                  Edit {getTypeLabel(itemType)}
                </CardTitle>
                <Badge variant="secondary" className="mt-1 bg-white/30 text-white border-white/40">
                  {getTypeLabel(itemType)}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              {/* Cover Image */}
              <div>
                <Label className="text-white">Cover Image</Label>
                <div className="mt-2">
                  {coverPreview ? (
                    <div className="relative inline-block">
                      <img
                        src={coverPreview}
                        alt="Cover"
                        className="w-40 h-56 object-cover rounded-lg border-2 border-white/30"
                      />
                      <button
                        type="button"
                        onClick={removeCover}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-40 h-56 border-2 border-dashed border-white/40 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
                    >
                      <Upload className="w-6 h-6 text-white/60 mb-2" />
                      <span className="text-xs text-white/60">Upload Cover</span>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverChange}
                  />
                  {coverPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-white/70 hover:text-white"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-3 h-3 mr-1" />
                      Change Cover
                    </Button>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <Label htmlFor="title" className="text-white">Title *</Label>
                <Input
                  id="title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-white">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                  rows={5}
                />
              </div>

              {/* Type (non-editable for books, editable for library items) */}
              {!isPhysicalBook && (
                <div>
                  <Label htmlFor="type" className="text-white">Type</Label>
                  <Select value={itemType} onValueChange={setItemType}>
                    <SelectTrigger className="bg-white/20 border-white/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ebook">E-Book</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="training_course">Training Course</SelectItem>
                      <SelectItem value="art_asset">Art Asset</SelectItem>
                      <SelectItem value="study">Study</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Category */}
              <div>
                <Label htmlFor="category" className="text-white">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-white/20 border-white/30 text-white">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price / Bestowal Value */}
              <div>
                <Label htmlFor="price" className="text-white">
                  {isPhysicalBook ? 'Bestowal Value (USDC)' : 'Price (USDC)'}
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={isPhysicalBook ? bestowalValue : price}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    if (isPhysicalBook) setBestowalValue(val);
                    else setPrice(val);
                  }}
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                />
                {isPhysicalBook && bestowalValue > 0 && (
                  <p className="text-white/70 text-xs mt-1">
                    Total with 15% platform fee: {(bestowalValue * 1.15).toFixed(2)} USDC
                  </p>
                )}
              </div>

              {/* Tags (library items only) */}
              {!isPhysicalBook && (
                <div>
                  <Label htmlFor="tags" className="text-white">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                    placeholder="e.g., spiritual, hebrew, torah"
                  />
                </div>
              )}

              {/* Book-specific fields */}
              {isPhysicalBook && (
                <div className="space-y-4 p-4 bg-white/10 rounded-lg border border-white/20">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Book Details
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="isbn" className="text-white">ISBN</Label>
                      <Input
                        id="isbn"
                        value={isbn}
                        onChange={(e) => setIsbn(e.target.value)}
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <Label htmlFor="language" className="text-white">Language</Label>
                      <Input
                        id="language"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                        placeholder="e.g., English"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pageCount" className="text-white">Page Count</Label>
                      <Input
                        id="pageCount"
                        type="number"
                        value={pageCount || ''}
                        onChange={(e) => setPageCount(parseInt(e.target.value) || null)}
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="publisher" className="text-white">Publisher</Label>
                      <Input
                        id="publisher"
                        value={publisher}
                        onChange={(e) => setPublisher(e.target.value)}
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="publishedDate" className="text-white">Published Date</Label>
                      <Input
                        id="publishedDate"
                        type="date"
                        value={publishedDate}
                        onChange={(e) => setPublishedDate(e.target.value)}
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="deliveryType" className="text-white">Delivery Type</Label>
                      <Select value={deliveryType} onValueChange={setDeliveryType}>
                        <SelectTrigger className="bg-white/20 border-white/30 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="shipping">Shipping</SelectItem>
                          <SelectItem value="pickup">Pickup</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="isAvailable"
                      checked={isAvailable}
                      onCheckedChange={(checked) => setIsAvailable(!!checked)}
                      className="border-white/30"
                    />
                    <Label htmlFor="isAvailable" className="text-white cursor-pointer">
                      Currently available for orders
                    </Label>
                  </div>
                </div>
              )}

              {/* Whisperer Settings */}
              <div className="space-y-3 p-4 bg-white/10 rounded-lg border border-white/20">
                <h3 className="text-white font-semibold">S2G Whisperer (Content Marketing)</h3>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hasWhisperer"
                    checked={hasWhisperer}
                    onCheckedChange={(checked) => setHasWhisperer(!!checked)}
                    className="border-white/30"
                  />
                  <Label htmlFor="hasWhisperer" className="text-white cursor-pointer">
                    Enable Whisperer commissions
                  </Label>
                </div>
                {hasWhisperer && (
                  <div>
                    <Label htmlFor="whispererPercent" className="text-white">
                      Whisperer Commission (2.5% - 30%)
                    </Label>
                    <Input
                      id="whispererPercent"
                      type="number"
                      step="0.5"
                      min="2.5"
                      max="30"
                      value={whispererPercent}
                      onChange={(e) => setWhispererPercent(parseFloat(e.target.value) || 0)}
                      className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                    />
                  </div>
                )}
              </div>

              {/* Visibility */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isPublic"
                  checked={isPublic}
                  onCheckedChange={(checked) => setIsPublic(!!checked)}
                  className="border-white/30"
                />
                <Label htmlFor="isPublic" className="text-white cursor-pointer">
                  Publicly visible in community galleries
                </Label>
              </div>

              {/* Save Button */}
              <Button
                type="submit"
                disabled={saving}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                size="lg"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
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
