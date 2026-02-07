import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Clock, CheckCircle, XCircle, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface QuoteRequest {
  id: string;
  provider_id: string;
  requester_id: string;
  service_needed: string;
  location: string;
  job_description: string;
  preferred_date: string | null;
  preferred_time: string | null;
  urgency: string;
  notes: string | null;
  status: string;
  created_at: string;
}

interface Quote {
  id: string;
  request_id: string;
  quote_amount: number;
  currency: string;
  estimated_duration: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

const ServiceProviderDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [providerId, setProviderId] = useState<string | null>(null);
  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<QuoteRequest | null>(null);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [submittingQuote, setSubmittingQuote] = useState(false);

  // Quote form state
  const [quoteAmount, setQuoteAmount] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [quoteMessage, setQuoteMessage] = useState('');

  useEffect(() => {
    if (user) {
      fetchProviderData();
    }
  }, [user]);

  const fetchProviderData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get provider ID
      const { data: providerData, error: providerError } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (providerError || !providerData) {
        navigate('/register-services');
        return;
      }
      
      setProviderId(providerData.id);
      
      // Fetch quote requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('service_quote_requests')
        .select('*')
        .eq('provider_id', providerData.id)
        .order('created_at', { ascending: false });
      
      if (requestsError) throw requestsError;
      setRequests(requestsData || []);
      
      // Fetch quotes
      const { data: quotesData, error: quotesError } = await supabase
        .from('service_quotes')
        .select('*')
        .eq('provider_id', providerData.id)
        .order('created_at', { ascending: false });
      
      if (quotesError) throw quotesError;
      setQuotes(quotesData || []);
      
    } catch (error: any) {
      console.error('Error fetching provider data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuote = async () => {
    if (!selectedRequest || !quoteAmount || !providerId) return;
    
    setSubmittingQuote(true);
    try {
      // Create quote
      const { error: quoteError } = await supabase
        .from('service_quotes')
        .insert({
          request_id: selectedRequest.id,
          provider_id: providerId,
          quote_amount: parseFloat(quoteAmount),
          currency: 'ZAR',
          estimated_duration: estimatedDuration || null,
          message: quoteMessage || null,
          status: 'pending'
        });
      
      if (quoteError) throw quoteError;
      
      // Update request status
      const { error: updateError } = await supabase
        .from('service_quote_requests')
        .update({ status: 'quoted' })
        .eq('id', selectedRequest.id);
      
      if (updateError) throw updateError;
      
      toast.success('Quote sent successfully!');
      setShowQuoteDialog(false);
      setSelectedRequest(null);
      setQuoteAmount('');
      setEstimatedDuration('');
      setQuoteMessage('');
      fetchProviderData();
      
    } catch (error: any) {
      console.error('Error submitting quote:', error);
      toast.error(error.message || 'Failed to submit quote');
    } finally {
      setSubmittingQuote(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'quoted':
        return <Badge variant="outline" className="border-blue-500 text-blue-500"><Send className="h-3 w-3 mr-1" /> Quoted</Badge>;
      case 'accepted':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Accepted</Badge>;
      case 'declined':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Declined</Badge>;
      case 'completed':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" /> Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'high':
        return <Badge variant="outline" className="border-orange-500 text-orange-500">High Priority</Badge>;
      case 'normal':
        return <Badge variant="secondary">Normal</Badge>;
      case 'low':
        return <Badge variant="outline">Low Priority</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const quotedRequests = requests.filter(r => r.status === 'quoted');
  const acceptedRequests = requests.filter(r => r.status === 'accepted');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Service Provider Dashboard
              </h1>
              <p className="text-muted-foreground">
                Manage your quote requests and track jobs
              </p>
            </div>
            
            <Button asChild variant="outline">
              <Link to="/register-services">Edit My Profile</Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{pendingRequests.length}</div>
              <p className="text-sm text-muted-foreground">Pending Requests</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{quotedRequests.length}</div>
              <p className="text-sm text-muted-foreground">Awaiting Response</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{acceptedRequests.length}</div>
              <p className="text-sm text-muted-foreground">Active Jobs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{quotes.length}</div>
              <p className="text-sm text-muted-foreground">Total Quotes Sent</p>
            </CardContent>
          </Card>
        </div>

        {/* Requests Tabs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="quoted">
              Quoted ({quotedRequests.length})
            </TabsTrigger>
            <TabsTrigger value="active">
              Active ({acceptedRequests.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              All ({requests.length})
            </TabsTrigger>
          </TabsList>

          {['pending', 'quoted', 'active', 'all'].map(tab => (
            <TabsContent key={tab} value={tab}>
              {(tab === 'all' ? requests : 
                tab === 'pending' ? pendingRequests :
                tab === 'quoted' ? quotedRequests :
                acceptedRequests
              ).length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No {tab} requests</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {(tab === 'all' ? requests : 
                    tab === 'pending' ? pendingRequests :
                    tab === 'quoted' ? quotedRequests :
                    acceptedRequests
                  ).map(request => (
                    <Card key={request.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{request.service_needed}</CardTitle>
                            <CardDescription>{request.location}</CardDescription>
                          </div>
                          <div className="flex gap-2">
                            {getUrgencyBadge(request.urgency)}
                            {getStatusBadge(request.status)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm mb-4">{request.job_description}</p>
                        
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                          {request.preferred_date && (
                            <span>Date: {new Date(request.preferred_date).toLocaleDateString()}</span>
                          )}
                          {request.preferred_time && (
                            <span>Time: {request.preferred_time}</span>
                          )}
                          <span>Requested: {new Date(request.created_at).toLocaleDateString()}</span>
                        </div>
                        
                        {request.notes && (
                          <p className="text-sm text-muted-foreground italic mb-4">
                            Notes: {request.notes}
                          </p>
                        )}
                        
                        {request.status === 'pending' && (
                          <Button 
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowQuoteDialog(true);
                            }}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Send Quote
                          </Button>
                        )}
                        
                        {request.status === 'quoted' && (
                          <p className="text-sm text-blue-500">
                            Waiting for customer response...
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Quote Dialog */}
      <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Quote</DialogTitle>
            <DialogDescription>
              Provide your quote for: {selectedRequest?.service_needed}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Quote Amount (ZAR) *</label>
              <Input
                type="number"
                placeholder="e.g., 500"
                value={quoteAmount}
                onChange={(e) => setQuoteAmount(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Estimated Duration</label>
              <Input
                placeholder="e.g., 2-3 hours"
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Message to Customer</label>
              <Textarea
                placeholder="Any additional details or questions..."
                value={quoteMessage}
                onChange={(e) => setQuoteMessage(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowQuoteDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitQuote}
                disabled={!quoteAmount || submittingQuote}
                className="flex-1"
              >
                {submittingQuote ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Quote'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServiceProviderDashboardPage;
