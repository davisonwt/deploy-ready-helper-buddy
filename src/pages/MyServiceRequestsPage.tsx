import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Clock, CheckCircle, XCircle, Loader2, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  provider_id: string;
  quote_amount: number;
  currency: string;
  estimated_duration: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

interface Provider {
  id: string;
  full_name: string;
  contact_phone: string;
  contact_email: string;
}

const MyServiceRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [providers, setProviders] = useState<Record<string, Provider>>({});
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<QuoteRequest | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch my requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('service_quote_requests')
        .select('*')
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false });
      
      if (requestsError) throw requestsError;
      setRequests(requestsData || []);
      
      // Get unique provider IDs
      const providerIds = [...new Set(requestsData?.map(r => r.provider_id) || [])];
      
      // Fetch providers
      if (providerIds.length > 0) {
        const { data: providersData, error: providersError } = await supabase
          .from('service_providers')
          .select('id, full_name, contact_phone, contact_email')
          .in('id', providerIds);
        
        if (providersError) throw providersError;
        
        const providersMap: Record<string, Provider> = {};
        providersData?.forEach(p => {
          providersMap[p.id] = p;
        });
        setProviders(providersMap);
      }
      
      // Fetch quotes for my requests
      const requestIds = requestsData?.map(r => r.id) || [];
      if (requestIds.length > 0) {
        const { data: quotesData, error: quotesError } = await supabase
          .from('service_quotes')
          .select('*')
          .in('request_id', requestIds);
        
        if (quotesError) throw quotesError;
        setQuotes(quotesData || []);
      }
      
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const getQuoteForRequest = (requestId: string) => {
    return quotes.find(q => q.request_id === requestId);
  };

  const handleAcceptQuote = async (quote: Quote) => {
    setUpdating(true);
    try {
      // Update quote status
      const { error: quoteError } = await supabase
        .from('service_quotes')
        .update({ status: 'accepted' })
        .eq('id', quote.id);
      
      if (quoteError) throw quoteError;
      
      // Update request status
      const { error: requestError } = await supabase
        .from('service_quote_requests')
        .update({ status: 'accepted' })
        .eq('id', quote.request_id);
      
      if (requestError) throw requestError;
      
      toast.success('Quote accepted! Contact the provider to arrange the job.');
      setShowQuoteDialog(false);
      fetchData();
      
    } catch (error: any) {
      console.error('Error accepting quote:', error);
      toast.error('Failed to accept quote');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeclineQuote = async (quote: Quote) => {
    setUpdating(true);
    try {
      // Update quote status
      const { error: quoteError } = await supabase
        .from('service_quotes')
        .update({ status: 'rejected' })
        .eq('id', quote.id);
      
      if (quoteError) throw quoteError;
      
      // Update request status back to pending
      const { error: requestError } = await supabase
        .from('service_quote_requests')
        .update({ status: 'declined' })
        .eq('id', quote.request_id);
      
      if (requestError) throw requestError;
      
      toast.success('Quote declined');
      setShowQuoteDialog(false);
      fetchData();
      
    } catch (error: any) {
      console.error('Error declining quote:', error);
      toast.error('Failed to decline quote');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Awaiting Quote</Badge>;
      case 'quoted':
        return <Badge variant="default" className="bg-blue-500"><MessageSquare className="h-3 w-3 mr-1" /> Quote Received</Badge>;
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
          
          <h1 className="text-3xl font-bold text-foreground mb-2">
            My Service Requests
          </h1>
          <p className="text-muted-foreground">
            Track your quote requests and accepted jobs
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{pendingRequests.length}</div>
              <p className="text-sm text-muted-foreground">Awaiting Quotes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{quotedRequests.length}</div>
              <p className="text-sm text-muted-foreground">Quotes Received</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{acceptedRequests.length}</div>
              <p className="text-sm text-muted-foreground">Active Jobs</p>
            </CardContent>
          </Card>
        </div>

        {requests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Requests Yet</h3>
              <p className="text-muted-foreground mb-6">
                Browse service providers and request quotes for the services you need.
              </p>
              <Button onClick={() => navigate('/community-services')}>
                Browse Services
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All ({requests.length})</TabsTrigger>
              <TabsTrigger value="quoted">
                Quotes Received ({quotedRequests.length})
              </TabsTrigger>
              <TabsTrigger value="active">
                Active ({acceptedRequests.length})
              </TabsTrigger>
            </TabsList>

            {['all', 'quoted', 'active'].map(tab => (
              <TabsContent key={tab} value={tab}>
                <div className="space-y-4">
                  {(tab === 'all' ? requests : 
                    tab === 'quoted' ? quotedRequests :
                    acceptedRequests
                  ).map(request => {
                    const provider = providers[request.provider_id];
                    const quote = getQuoteForRequest(request.id);
                    
                    return (
                      <Card key={request.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{request.service_needed}</CardTitle>
                              <CardDescription>
                                Provider: {provider?.full_name || 'Unknown'}
                              </CardDescription>
                            </div>
                            {getStatusBadge(request.status)}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm mb-2"><strong>Location:</strong> {request.location}</p>
                          <p className="text-sm text-muted-foreground mb-4">{request.job_description}</p>
                          
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                            {request.preferred_date && (
                              <span>Preferred Date: {new Date(request.preferred_date).toLocaleDateString()}</span>
                            )}
                            <span>Requested: {new Date(request.created_at).toLocaleDateString()}</span>
                          </div>
                          
                          {/* Show quote if received */}
                          {quote && request.status === 'quoted' && (
                            <div className="bg-primary/10 rounded-lg p-4 mb-4">
                              <h4 className="font-semibold mb-2">Quote Received!</h4>
                              <p className="text-2xl font-bold text-primary mb-2">
                                R{quote.quote_amount}
                              </p>
                              {quote.estimated_duration && (
                                <p className="text-sm mb-2">Duration: {quote.estimated_duration}</p>
                              )}
                              {quote.message && (
                                <p className="text-sm text-muted-foreground italic mb-4">
                                  "{quote.message}"
                                </p>
                              )}
                              <div className="flex gap-2">
                                <Button 
                                  onClick={() => handleAcceptQuote(quote)}
                                  disabled={updating}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accept Quote'}
                                </Button>
                                <Button 
                                  variant="outline"
                                  onClick={() => handleDeclineQuote(quote)}
                                  disabled={updating}
                                >
                                  Decline
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          {/* Show contact info if accepted */}
                          {request.status === 'accepted' && provider && (
                            <div className="bg-green-500/10 rounded-lg p-4">
                              <h4 className="font-semibold mb-2 text-green-600">Job Accepted!</h4>
                              <p className="text-sm mb-3">Contact the provider to arrange the job:</p>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => window.location.href = `tel:${provider.contact_phone}`}
                                >
                                  <Phone className="h-4 w-4 mr-1" />
                                  {provider.contact_phone}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => window.location.href = `mailto:${provider.contact_email}`}
                                >
                                  <Mail className="h-4 w-4 mr-1" />
                                  Email
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default MyServiceRequestsPage;
