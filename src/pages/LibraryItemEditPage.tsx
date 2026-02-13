import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function LibraryItemEditPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isPhysicalBook, setIsPhysicalBook] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: 0,
    is_public: true,
  });

  useEffect(() => {
    if (!id || !user) return;

    const loadItem = async () => {
      setLoading(true);

      // Try s2g_library_items first
      const { data: libItem, error: libError } = await supabase
        .from('s2g_library_items')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (libItem) {
        setFormData({
          title: libItem.title || '',
          description: libItem.description || '',
          price: libItem.price || 0,
          is_public: libItem.is_public ?? true,
        });
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
          setFormData({
            title: book.title || '',
            description: book.description || '',
            price: book.bestowal_value || 0,
            is_public: book.is_public ?? true,
          });
          setLoading(false);
          return;
        }
      }

      setNotFound(true);
      setLoading(false);
    };

    loadItem();
  }, [id, user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user) return;

    setSaving(true);
    try {
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
            title: formData.title,
            description: formData.description,
            bestowal_value: formData.price,
            is_public: formData.is_public,
          })
          .eq('id', id)
          .eq('sower_id', sowerData.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('s2g_library_items')
          .update({
            title: formData.title,
            description: formData.description,
            price: formData.price,
            is_public: formData.is_public,
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

      <div className="relative z-10 container max-w-2xl mx-auto px-4 py-8">
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
            <CardTitle className="text-2xl text-white">
              Edit {isPhysicalBook ? 'Book' : 'Library Item'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <Label htmlFor="title" className="text-white">Title</Label>
                <Input
                  id="title"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-white">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="price" className="text-white">
                  {isPhysicalBook ? 'Bestowal Value' : 'Price'} (USDC)
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={formData.is_public}
                  onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_public" className="text-white cursor-pointer">
                  Publicly visible
                </Label>
              </div>

              <Button
                type="submit"
                disabled={saving}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
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
