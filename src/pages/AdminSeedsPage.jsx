import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { useToast } from '../hooks/use-toast';
import { useRoles } from '../hooks/useRoles';
import { Loader2, CheckCircle, XCircle, MessageCircle, ImageIcon } from 'lucide-react';

export function AdminSeedsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(null);
  const { toast } = useToast();
  const { isAdminOrGosat, loading: rolesLoading } = useRoles();

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      console.log('🌱 Fetching seed submissions...');
      const { data, error } = await supabase
        .from('seeds')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('🌱 Seed submissions query result:', { data, error });
      
      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('🌱 Error fetching seed submissions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch seed submissions: " + error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const convertSeedToOrchard = async (seed) => {
    if (!isAdminOrGosat) {
      toast({
        title: "Access Denied",
        description: "Only admins and gosats can convert seeds to orchards",
        variant: "destructive"
      });
      return;
    }

    setConverting(seed.id);
    try {
      // Calculate seed value from additional_details or default
      const seedValue = seed.additional_details?.value ? parseFloat(seed.additional_details.value) : 150;
      const totalPockets = Math.max(1, Math.floor(seedValue / 150)); // Minimum 1 pocket, $150 per pocket

      const orchardData = {
        title: seed.title,
        description: seed.description,
        category: seed.category === 'other' ? 'General' : seed.category,
        user_id: seed.gifter_id,
        seed_value: seedValue,
        original_seed_value: seedValue,
        pocket_price: 150,
        total_pockets: totalPockets,
        filled_pockets: 0,
        currency: 'USD',
        images: seed.images || [],
        video_url: seed.video_url,
        status: 'active',
        verification_status: 'approved',
        orchard_type: 'gifted'
      };

      const { data: newOrchard, error: orchardError } = await supabase
        .from('orchards')
        .insert([orchardData])
        .select()
        .single();

      if (orchardError) throw orchardError;

      // Delete the seed after successful conversion
      const { error: deleteError } = await supabase
        .from('seeds')
        .delete()
        .eq('id', seed.id);

      if (deleteError) {
        console.warn('Failed to delete seed after conversion:', deleteError);
      }

      toast({
        title: "Success",
        description: `Seed converted to orchard: ${newOrchard.title}`,
      });
      
      fetchSubmissions();
    } catch (error) {
      console.error('Error converting seed to orchard:', error);
      toast({
        title: "Error",
        description: "Failed to convert seed to orchard: " + error.message,
        variant: "destructive"
      });
    } finally {
      setConverting(null);
    }
  };

  if (loading || rolesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdminOrGosat) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Access denied. Only admins and gosats can manage seeds.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-primary mb-8">Seeds Management</h1>
        
        <div className="grid gap-6">
          {submissions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No seeds found.</p>
              </CardContent>
            </Card>
          ) : (
            submissions.map((seed) => (
              <Card key={seed.id} className="border-l-4 border-l-primary/30">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{seed.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Submitted: {new Date(seed.created_at).toLocaleDateString()}
                      </p>
                      {seed.additional_details?.value && (
                        <p className="text-sm font-medium text-primary mt-1">
                          Estimated Value: ${parseFloat(seed.additional_details.value).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary">
                      {seed.category || 'Seed'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded">
                        {seed.description}
                      </p>
                    </div>
                    
                    {seed.images && seed.images.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          Images ({seed.images.length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {seed.images.map((imageUrl, index) => (
                            <div key={index} className="relative">
                              <img
                                src={imageUrl}
                                alt={`${seed.title} - Image ${index + 1}`}
                                className="w-full h-48 object-cover rounded-lg border border-border shadow-md hover:shadow-xl transition-shadow cursor-pointer"
                                onClick={() => window.open(imageUrl, '_blank')}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div 
                                className="w-full h-48 bg-muted rounded-lg border border-border shadow-md flex items-center justify-center text-muted-foreground"
                                style={{ display: 'none' }}
                              >
                                <div className="text-center">
                                  <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                                  <p className="text-sm">Image not available</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {seed.video_url && (
                      <div>
                        <h4 className="font-medium mb-2">Video</h4>
                        <video 
                          src={seed.video_url} 
                          controls 
                          className="w-full max-h-96 rounded-lg border border-border"
                        />
                      </div>
                    )}
                    
                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        onClick={() => convertSeedToOrchard(seed)}
                        disabled={converting === seed.id}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {converting === seed.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Converting...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Convert to Orchard
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}