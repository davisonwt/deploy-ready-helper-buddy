import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { useToast } from '../hooks/use-toast';
import { Loader2, CheckCircle, XCircle, MessageCircle } from 'lucide-react';

export function AdminSeedsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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

  const updateSubmissionStatus = async (id, status, adminNotes = null) => {
    try {
      const { error } = await supabase
        .from('seed_submissions')
        .update({ 
          status, 
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Submission ${status}`,
      });
      
      fetchSubmissions();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update submission",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                <p className="text-muted-foreground">No seed submissions found.</p>
              </CardContent>
            </Card>
          ) : (
            submissions.map((submission) => (
              <Card key={submission.id} className="border-l-4 border-l-primary/30">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{submission.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Submitted: {new Date(submission.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {submission.category || 'Seed'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded">
                        {submission.description}
                      </p>
                    </div>
                    
                    {submission.content && (
                      <div>
                        <h4 className="font-medium mb-2">Content</h4>
                        <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded">
                          {submission.content}
                        </p>
                      </div>
                    )}
                    
                    {submission.admin_notes && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <MessageCircle className="h-4 w-4" />
                          Admin Notes
                        </h4>
                        <p className="text-sm bg-blue-50 dark:bg-blue-950/30 p-3 rounded border-l-2 border-l-blue-500">
                          {submission.admin_notes}
                        </p>
                      </div>
                    )}
                    
                    {submission.status === 'pending' && (
                      <div className="flex gap-2 pt-4 border-t">
                        <Button
                          onClick={() => updateSubmissionStatus(submission.id, 'approved')}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => updateSubmissionStatus(submission.id, 'rejected')}
                          variant="destructive"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    )}
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