import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Clock, CheckCircle, XCircle, Loader2, DollarSign, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { format } from 'date-fns';

interface QuoteRequest {
  id: string;
  driver_id: string;
  pickup_location: string;
  dropoff_location: string;
  item_description: string;
  preferred_date: string | null;
  preferred_time: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  driver?: {
    full_name: string;
    contact_phone: string;
    contact_email: string;
    vehicle_type: string;
    city?: string;
    country?: string;
  };
}

interface Quote {
  id: string;
  request_id: string;
  driver_id: string;
  quote_amount: number;
  currency: string;
  estimated_duration: string | null;
  message: string | null;
  status: string;
  valid_until: string | null;
  created_at: string;
}

const MyDriverRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<QuoteRequest | null>(null);
  const [requestQuotes, setRequestQuotes] = useState<Quote[]>([]);
  const [showQuotesDialog, setShowQuotesDialog] = useState(false);
  const [processingQuote, setProcessingQuote] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    try {
      setLoading(true);

      // Fetch user's quote requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('driver_quote_requests')
        .select('*')
        .eq('requester_id', user!.id)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Fetch driver info for each request
      const requestsWithDrivers = await Promise.all(
        (requestsData || []).map(async (request) => {
          const { data: driverData } = await supabase
            .from('community_drivers')
            .select('full_name, contact_phone, contact_email, vehicle_type, city, country')
            .eq('id', request.driver_id)
            .single();
          return { ...request, driver: driverData };
        })
      );

      setRequests(requestsWithDrivers);

      // Fetch all quotes for user's requests
      const requestIds = (requestsData || []).map(r => r.id);
      if (requestIds.length > 0) {
        const { data: quotesData, error: quotesError } = await supabase
          .from('driver_quotes')
          .select('*')
          .in('request_id', requestIds)
          .order('created_at', { ascending: false });

        if (quotesError) throw quotesError;
        setQuotes(quotesData || []);
      }

    } catch (error: any) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load your requests');
    } finally {
      setLoading(false);
    }
  };

  const viewQuotes = (request: QuoteRequest) => {
    setSelectedRequest(request);
    setRequestQuotes(quotes.filter(q => q.request_id === request.id));
    setShowQuotesDialog(true);
  };

  const handleQuoteAction = async (quote: Quote, action: 'accept' | 'reject') => {
    setProcessingQuote(quote.id);
    try {
      // Update quote status
      const { error: quoteError } = await supabase
        .from('driver_quotes')
        .update({ status: action === 'accept' ? 'accepted' : 'rejected' })
        .eq('id', quote.id);

      if (quoteError) throw quoteError;

      // If accepted, update request status
      if (action === 'accept' && selectedRequest) {
        const { error: requestError } = await supabase
          .from('driver_quote_requests')
          .update({ status: 'accepted' })
          .eq('id', selectedRequest.id);

        if (requestError) throw requestError;

        // Reject other quotes for this request
        const { error: rejectError } = await supabase
          .from('driver_quotes')
          .update({ status: 'rejected' })
          .eq('request_id', selectedRequest.id)
          .neq('id', quote.id);

        if (rejectError) throw rejectError;
      }

      toast.success(action === 'accept' ? 'Quote accepted! Contact the driver to finalize.' : 'Quote declined');
      setShowQuotesDialog(false);
      fetchRequests();
    } catch (error: any) {
      console.error('Error updating quote:', error);
      toast.error('Failed to update quote');
    } finally {
      setProcessingQuote(null);
    }
  };

  const cancelRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('driver_quote_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Request cancelled');
      fetchRequests();
    } catch (error: any) {
      console.error('Error cancelling request:', error);
      toast.error('Failed to cancel request');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'secondary', label: 'Waiting for Quote' },
      quoted: { variant: 'default', label: 'Quote Received' },
      accepted: { variant: 'default', label: 'Accepted' },
      declined: { variant: 'destructive', label: 'Declined' },
      completed: { variant: 'outline', label: 'Completed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
    };
    const config = variants[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const activeRequests = requests.filter(r => ['pending', 'quoted'].includes(r.status));
  const acceptedRequests = requests.filter(r => r.status === 'accepted');
  const historyRequests = requests.filter(r => ['completed', 'declined', 'cancelled'].includes(r.status));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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

          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            My Driver Requests
          </h1>
          <p className="text-muted-foreground">
            Track your quote requests and manage responses from drivers
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{activeRequests.length}</div>
              <p className="text-muted-foreground text-sm">Active Requests</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{acceptedRequests.length}</div>
              <p className="text-muted-foreground text-sm">Accepted Quotes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{historyRequests.length}</div>
              <p className="text-muted-foreground text-sm">History</p>
            </CardContent>
          </Card>
        </div>

        {/* Requests Tabs */}
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">Active ({activeRequests.length})</TabsTrigger>
            <TabsTrigger value="accepted">Accepted ({acceptedRequests.length})</TabsTrigger>
            <TabsTrigger value="history">History ({historyRequests.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No Active Requests</h3>
                  <p className="text-muted-foreground mb-4">
                    Browse community drivers to request a quote
                  </p>
                  <Button onClick={() => navigate('/community-drivers')}>
                    Find Drivers
                  </Button>
                </CardContent>
              </Card>
            ) : (
              activeRequests.map((request) => {
                const requestQuoteCount = quotes.filter(q => q.request_id === request.id).length;
                return (
                  <Card key={request.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            {request.driver?.full_name || 'Driver'}
                          </CardTitle>
                          <CardDescription>
                            {request.driver?.vehicle_type}
                            {request.driver?.city && ` • ${request.driver.city}`}
                          </CardDescription>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Pickup</p>
                          <p className="font-medium">{request.pickup_location}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Dropoff</p>
                          <p className="font-medium">{request.dropoff_location}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Item</p>
                        <p>{request.item_description}</p>
                      </div>
                      <div className="flex gap-2 pt-2">
                        {request.status === 'quoted' && requestQuoteCount > 0 && (
                          <Button onClick={() => viewQuotes(request)}>
                            <DollarSign className="h-4 w-4 mr-2" />
                            View Quote{requestQuoteCount > 1 ? 's' : ''} ({requestQuoteCount})
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => cancelRequest(request.id)}
                        >
                          Cancel Request
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="accepted" className="space-y-4">
            {acceptedRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No Accepted Quotes</h3>
                  <p className="text-muted-foreground">
                    Quotes you've accepted will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              acceptedRequests.map((request) => {
                const acceptedQuote = quotes.find(
                  q => q.request_id === request.id && q.status === 'accepted'
                );
                return (
                  <Card key={request.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            {request.driver?.full_name}
                          </CardTitle>
                          <CardDescription>
                            Accepted on {format(new Date(request.created_at), 'PPP')}
                          </CardDescription>
                        </div>
                        {acceptedQuote && (
                          <Badge variant="outline" className="text-lg">
                            R{acceptedQuote.quote_amount.toFixed(2)}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Route</p>
                        <p>{request.pickup_location} → {request.dropoff_location}</p>
                      </div>
                      {request.driver && (
                        <div className="flex gap-4 p-4 bg-muted rounded-lg">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-primary" />
                            <a href={`tel:${request.driver.contact_phone}`} className="hover:underline">
                              {request.driver.contact_phone}
                            </a>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-primary" />
                            <a href={`mailto:${request.driver.contact_email}`} className="hover:underline">
                              {request.driver.contact_email}
                            </a>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {historyRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No History Yet</h3>
                  <p className="text-muted-foreground">
                    Completed and cancelled requests will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              historyRequests.map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{request.driver?.full_name}</CardTitle>
                        <CardDescription>
                          {format(new Date(request.created_at), 'PPP')}
                        </CardDescription>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      {request.pickup_location} → {request.dropoff_location}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* View Quotes Dialog */}
        <Dialog open={showQuotesDialog} onOpenChange={setShowQuotesDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Quote from {selectedRequest?.driver?.full_name}</DialogTitle>
              <DialogDescription>
                Review the quote and accept or decline
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {requestQuotes.map((quote) => (
                <Card key={quote.id}>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold">
                        R{quote.quote_amount.toFixed(2)}
                      </span>
                      <Badge variant={quote.status === 'pending' ? 'secondary' : 'outline'}>
                        {quote.status}
                      </Badge>
                    </div>
                    {quote.estimated_duration && (
                      <div>
                        <p className="text-sm text-muted-foreground">Estimated Duration</p>
                        <p>{quote.estimated_duration}</p>
                      </div>
                    )}
                    {quote.message && (
                      <div>
                        <p className="text-sm text-muted-foreground">Message</p>
                        <p className="text-sm">{quote.message}</p>
                      </div>
                    )}
                    {quote.valid_until && (
                      <p className="text-xs text-muted-foreground">
                        Valid until {format(new Date(quote.valid_until), 'PPP')}
                      </p>
                    )}
                    {quote.status === 'pending' && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          className="flex-1"
                          onClick={() => handleQuoteAction(quote, 'accept')}
                          disabled={processingQuote === quote.id}
                        >
                          {processingQuote === quote.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Accept
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleQuoteAction(quote, 'reject')}
                          disabled={processingQuote === quote.id}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Decline
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MyDriverRequestsPage;
