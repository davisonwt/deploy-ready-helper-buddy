import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { useToast } from '../hooks/use-toast';
import { useRoles } from '../hooks/useRoles';
import { CheckCircle, XCircle, MessageCircle, ImageIcon } from 'lucide-react';

export default function AdminSeedsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const convertSeedToOrchard = (seed) => {
    if (!isAdminOrGosat) {
      toast({
        title: "Access Denied", 
        description: "Only admins and gosats can convert seeds to orchards",
        variant: "destructive"
      });
      return;
    }

    // Redirect to orchard creation form with seed data pre-filled
    const searchParams = new URLSearchParams({
      from_seed: seed.id,
      approve: 'true'
    });
    
    window.open(`/create-orchard?${searchParams.toString()}`, '_blank');
    
    toast({
      title: "Opening Orchard Form",
      description: "Complete the orchard details to place it under 364yhvh orchards",
    });
  };

  if (loading || rolesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
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
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Convert to Orchard
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