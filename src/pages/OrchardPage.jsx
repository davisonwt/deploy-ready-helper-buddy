import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Users, 
  Eye, 
  Edit,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { useAuth } from '../hooks/useAuth';
import { useOrchards } from '../hooks/useOrchards';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '../utils/formatters';
import { VideoPlayer } from '@/components/ui/VideoPlayer';
import OrchardVideoManager from '@/components/orchard/OrchardVideoManager';
import OrchardPaymentWidget from '@/components/orchard/OrchardPaymentWidget';
import SignedImg from '@/components/media/SignedImg';
import ReportButton from '@/components/moderation/ReportButton';

const OrchardPage = () => {
  const { orchardId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchOrchardById, loading, error } = useOrchards();
  const [orchard, setOrchard] = useState(null);
  // P0-5 Phase A: funding progress comes from public.orchard_funding_status()
  // (held orchard_holdings vs total_pockets x pocket_price), never from a
  // filled_pockets value set by hand.
  const [funding, setFunding] = useState(null);
  const loadFunding = async (id) => {
    const { data, error } = await supabase.rpc('orchard_funding_status', { _orchard_id: id });
    if (error) { console.error('orchard_funding_status failed:', error); return; }
    const row = Array.isArray(data) ? data[0] : data;
    if (row) setFunding({
      target: Number(row.target || 0),
      heldTotal: Number(row.held_total || 0),
      pocketsTotal: Number(row.pockets_total || 0),
      pocketsHeld: Number(row.pockets_held || 0),
      funded: !!row.funded,
    });
  };

  useEffect(() => {
    const loadOrchard = async () => {
      console.log('🌱 OrchardPage: Starting orchard load', {
        orchardId,
        hasUser: !!user,
        userId: user?.id
      });

      if (!user) {
        console.log('🌱 OrchardPage: No user found, waiting for auth...');
        return; // Don't redirect immediately, wait for auth to load
      }

      if (!orchardId) {
        console.error('🌱 OrchardPage: No orchardId provided');
        navigate('/dashboard');
        return;
      }

      console.log('🌱 OrchardPage: Loading orchard', orchardId, 'for user', user.id);
      const result = await fetchOrchardById(orchardId);
      console.log('🌱 OrchardPage: Fetch result', result);
      
      if (result.success) {
        console.log('✅ OrchardPage: Orchard loaded successfully:', result.data.title);
        setOrchard(result.data);
        loadFunding(orchardId);
      } else {
        console.error('❌ OrchardPage: Failed to load orchard:', result.error);
        
        // Handle specific error cases
        if (result.error?.includes('Authentication session expired')) {
          console.log('🔄 OrchardPage: Session expired, forcing re-auth...');
          // Force a fresh session check
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) {
            navigate('/login');
          } else {
            // Retry with fresh session
            const retryResult = await fetchOrchardById(orchardId);
            if (retryResult.success) {
              setOrchard(retryResult.data);
            } else {
              navigate('/my-orchards');
            }
          }
        } else if (result.error?.includes('not found') || result.error?.includes('permission')) {
          console.log('🌱 OrchardPage: Orchard not found or access denied, redirecting to My Orchards');
          navigate('/my-orchards');
        } else {
          console.log('🌱 OrchardPage: Unknown error, redirecting to dashboard');
          navigate('/dashboard');
        }
      }
    };

    if (orchardId && user) {
      loadOrchard();
    }
  }, [orchardId, user?.id, navigate]);

  const getCompletionPercentage = () => {
    if (!funding || funding.target <= 0) return 0;
    return Math.min(100, Math.round((funding.heldTotal / funding.target) * 100));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-700";
      case "completed": return "bg-blue-100 text-blue-700";
      case "paused": return "bg-orange-100 text-orange-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading orchard details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-600 mb-2">Orchard Not Found</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => navigate('/my-orchards')} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to My Orchards
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!orchard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading orchard details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: '#001f3f' }}>
      
      {/* Content */}
      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <div className="max-w-4xl mx-auto p-8 rounded-2xl border shadow-2xl mb-8 mt-4 bg-white/90">
          <div className="flex items-center justify-between">
            <Button 
              onClick={() => navigate('/my-orchards')}
              variant="outline"
              className="border-orange-700 text-orange-700 hover:bg-orange-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to My Orchards
            </Button>
            
            <Link to={`/edit-orchard/${orchardId}`}>
              <Button className="bg-lime-500 hover:bg-lime-400 text-green-800 border-2 border-green-700">
                <Edit className="h-4 w-4 mr-2" />
                Edit Orchard
              </Button>
            </Link>
            
            {/* Debug info - remove this later */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-gray-500 mt-2">
                User ID: {user?.id || 'No user'}<br/>
                Orchard User ID: {orchard?.user_id || 'No orchard user'}<br/>
                Match: {user?.id === orchard?.user_id ? 'Yes' : 'No'}
              </div>
            )}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Main Orchard Card */}
          <Card className="bg-white/90 backdrop-blur-sm border-white/50 shadow-xl">
            <div className="relative">
              {/* Orchard Image */}
              {orchard.images && orchard.images.length > 0 && (
                <div className="relative h-64 md:h-80 overflow-hidden rounded-t-lg">
                  <SignedImg
                    src={orchard.images[0]}
                    alt={orchard.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge className={getStatusColor(orchard.status)}>
                      {orchard.status?.charAt(0).toUpperCase() + orchard.status?.slice(1)}
                    </Badge>
                  </div>
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-orange-100 text-orange-700">
                      {orchard.category}
                    </Badge>
                  </div>
                </div>
              )}
              
              <CardHeader>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <CardTitle className="text-3xl font-bold text-orange-700">
                    {orchard.title}
                  </CardTitle>
                  {user?.id !== orchard.user_id && (
                    <ReportButton targetType="orchard" targetId={orchard.id} variant="outline" size="icon" />
                  )}
                </div>

                {/* Meta Information */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-orange-600 mb-4">
                  {orchard.location && (
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {orchard.location}
                    </div>
                  )}
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Created {new Date(orchard.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {orchard.supporters || 0} supporters
                  </div>
                  <div className="flex items-center">
                    <Eye className="h-4 w-4 mr-1" />
                    {orchard.views || 0} views
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Description */}
                <div>
                  <h3 className="text-lg font-semibold text-orange-700 mb-2">Description</h3>
                  <p className="text-orange-600">{orchard.description}</p>
                </div>
                
                {/* Progress Section */}
                <div data-testid="funding-progress" data-funded={funding?.funded ? '1' : '0'}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-orange-700">
                      Funding Progress{funding?.funded ? ' — fully funded' : ''}
                    </h3>
                    <span className="text-2xl font-bold text-orange-700" data-testid="funding-percent">
                      {getCompletionPercentage()}%
                    </span>
                  </div>
                  <Progress
                    value={getCompletionPercentage()}
                    className="h-4 mb-4"
                  />
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-semibold text-orange-700" data-testid="funding-held">
                        {formatCurrency(funding?.heldTotal ?? 0)}
                      </div>
                      <div className="text-sm text-orange-600">Held</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-orange-700" data-testid="funding-target">
                        {formatCurrency(funding?.target ?? 0)}
                      </div>
                      <div className="text-sm text-orange-600">Goal</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-orange-700" data-testid="funding-pockets">
                        {funding?.pocketsHeld ?? 0} / {funding?.pocketsTotal ?? 0}
                      </div>
                      <div className="text-sm text-orange-600">Pockets</div>
                    </div>
                  </div>
                  <p className="text-xs text-orange-600 mt-3">
                    All or nothing: every pocket must fill before anything is released, and there is no deadline.
                  </p>
                </div>

                {/* Additional Details */}
                {orchard.why_needed && (
                  <div>
                    <h3 className="text-lg font-semibold text-orange-700 mb-2">Why This Orchard Matters</h3>
                    <p className="text-orange-600">{orchard.why_needed}</p>
                  </div>
                )}

                {orchard.how_it_helps && (
                  <div>
                    <h3 className="text-lg font-semibold text-orange-700 mb-2">How Your Support Helps</h3>
                    <p className="text-orange-600">{orchard.how_it_helps}</p>
                  </div>
                 )}

                 {/* Payment Section */}
                 <OrchardPaymentWidget
                   orchardId={orchard.id}
                   orchardTitle={orchard.title}
                   pocketPrice={orchard.pocket_price || 150}
                   availablePockets={Math.max(0, (funding?.pocketsTotal ?? 0) - (funding?.pocketsHeld ?? 0))}
                   productType={orchard.product_type}
                   funded={!!funding?.funded}
                   onBestowed={() => loadFunding(orchard.id)}
                 />
               </CardContent>
             </div>
           </Card>

           {/* Marketing Videos Section */}
           <OrchardVideoManager orchard={orchard} />
         </div>
       </div>
     </div>
   );
 };
 
 export default OrchardPage;