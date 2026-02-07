import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Car, Clock, CheckCircle, XCircle, DollarSign, Loader2, MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { format } from 'date-fns';

interface QuoteRequest {
  id: string;
  requester_id: string;
  pickup_location: string;
  dropoff_location: string;
  item_description: string;
  preferred_date: string | null;
  preferred_time: string | null;
  status: string;
  notes: string | null;
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

const DriverDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<QuoteRequest | null>(null);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Quote form state
  const [quoteAmount, setQuoteAmount] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [quoteMessage, setQuoteMessage] = useState('');

  useEffect(() => {
    if (user) {
      fetchDriverData();
    }
  }, [user]);

  const fetchDriverData = async () => {
    try {
      setLoading(true);

      // Get driver profile
      const { data: driver, error: driverError } = await supabase
        .from('community_drivers')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (driverError) throw driverError;

      if (!driver) {
        toast.error('You are not registered as a driver');
        navigate('/register-vehicle');
        return;
      }

      setDriverProfile(driver);

      // Fetch quote requests for this driver
      const { data: requestsData, error: requestsError } = await supabase
        .from('driver_quote_requests')
        .select('*')
        .eq('driver_id', driver.id)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;
      setRequests(requestsData || []);

      // Fetch quotes submitted by this driver
      const { data: quotesData, error: quotesError } = await supabase
        .from('driver_quotes')
        .select('*')
        .eq('driver_id', driver.id)
        .order('created_at', { ascending: false });

      if (quotesError) throw quotesError;
      setQuotes(quotesData || []);

    } catch (error: any) {
      console.error('Error fetching driver data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const submitQuote = async () => {
    if (!selectedRequest || !quoteAmount || !driverProfile) return;

    setSubmitting(true);
    try {
      // Insert quote
      const { error: quoteError } = await supabase.from('driver_quotes').insert({
        request_id: selectedRequest.id,
        driver_id: driverProfile.id,
        quote_amount: parseFloat(quoteAmount),
        currency: 'ZAR',
        estimated_duration: estimatedDuration || null,
        message: quoteMessage || null,
        status: 'pending',
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Valid for 7 days
      });

      if (quoteError) throw quoteError;

      // Update request status to 'quoted'
      const { error: updateError } = await supabase
        .from('driver_quote_requests')
        .update({ status: 'quoted' })
        .eq('id', selectedRequest.id);

      if (updateError) throw updateError;

      toast.success('Quote sent successfully!');
      setShowQuoteForm(false);
      setSelectedRequest(null);
      setQuoteAmount('');
      setEstimatedDuration('');
      setQuoteMessage('');
      fetchDriverData();
    } catch (error: any) {
      console.error('Error submitting quote:', error);
      toast.error(error.message || 'Failed to submit quote');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'secondary', label: 'Pending' },
      quoted: { variant: 'default', label: 'Quoted' },
      accepted: { variant: 'default', label: 'Accepted' },
      declined: { variant: 'destructive', label: 'Declined' },
      completed: { variant: 'outline', label: 'Completed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
    };
    const config = variants[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const activeRequests = requests.filter(r => ['quoted', 'accepted'].includes(r.status));
  const completedRequests = requests.filter(r => ['completed', 'declined', 'cancelled'].includes(r.status));

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

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                <Car className="h-8 w-8 text-primary" />
                Driver Dashboard
              </h1>
              <p className="text-muted-foreground">
                Manage incoming quote requests and track your jobs
              </p>
            </div>

            {driverProfile && (
              <Badge variant="outline" className="text-sm">
                {driverProfile.status === 'approved' ? (
                  <><CheckCircle className="h-4 w-4 mr-1 text-green-500" /> Approved Driver</>
                ) : (
                  <><Clock className="h-4 w-4 mr-1" /> {driverProfile.status}</>
                )}
              </Badge>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{pendingRequests.length}</div>
              <p className="text-muted-foreground text-sm">New Requests</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{activeRequests.length}</div>
              <p className="text-muted-foreground text-sm">Active Jobs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{completedRequests.length}</div>
              <p className="text-muted-foreground text-sm">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{quotes.length}</div>
              <p className="text-muted-foreground text-sm">Quotes Sent</p>
            </CardContent>
          </Card>
        </div>

        {/* Requests Tabs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">
              New Requests ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="active">
              Active ({activeRequests.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              History ({completedRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No New Requests</h3>
                  <p className="text-muted-foreground">
                    You'll see new quote requests from sowers here
                  </p>
                </CardContent>
              </Card>
            ) : (
              pendingRequests.map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">Delivery Request</CardTitle>
                        <CardDescription>
                          {format(new Date(request.created_at), 'PPP')}
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
                      <p className="text-sm text-muted-foreground">Item Description</p>
                      <p>{request.item_description}</p>
                    </div>
                    {request.preferred_date && (
                      <div className="flex gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Preferred Date</p>
                          <p>{format(new Date(request.preferred_date), 'PPP')}</p>
                        </div>
                        {request.preferred_time && (
                          <div>
                            <p className="text-sm text-muted-foreground">Time</p>
                            <p>{request.preferred_time}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {request.notes && (
                      <div>
                        <p className="text-sm text-muted-foreground">Notes</p>
                        <p className="text-sm">{request.notes}</p>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowQuoteForm(true);
                        }}
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Send Quote
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            {activeRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No Active Jobs</h3>
                  <p className="text-muted-foreground">
                    Jobs you're working on will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              activeRequests.map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">
                        {request.pickup_location} → {request.dropoff_location}
                      </CardTitle>
                      {getStatusBadge(request.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{request.item_description}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No Completed Jobs Yet</h3>
                  <p className="text-muted-foreground">
                    Your completed jobs history will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              completedRequests.map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">
                        {request.pickup_location} → {request.dropoff_location}
                      </CardTitle>
                      {getStatusBadge(request.status)}
                    </div>
                    <CardDescription>
                      {format(new Date(request.created_at), 'PPP')}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Submit Quote Dialog */}
        <Dialog open={showQuoteForm} onOpenChange={setShowQuoteForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send a Quote</DialogTitle>
              <DialogDescription>
                Provide your price and estimated time for this job
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium">Quote Amount (ZAR) *</label>
                <Input
                  type="number"
                  placeholder="e.g., 250"
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Estimated Duration</label>
                <Input
                  placeholder="e.g., 2 hours, Same day"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Message to Customer</label>
                <Textarea
                  placeholder="Any notes about the quote or the job..."
                  value={quoteMessage}
                  onChange={(e) => setQuoteMessage(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowQuoteForm(false)}>
                  Cancel
                </Button>
                <Button onClick={submitQuote} disabled={submitting || !quoteAmount}>
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="h-4 w-4 mr-2" /> Send Quote</>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default DriverDashboardPage;
