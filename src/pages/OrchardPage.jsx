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
import { formatCurrency } from '../utils/formatters';

const OrchardPage = () => {
  const { orchardId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchOrchardById, loading, error } = useOrchards();
  const [orchard, setOrchard] = useState(null);

  useEffect(() => {
    const loadOrchard = async () => {
      const result = await fetchOrchardById(orchardId);
      if (result.success) {
        setOrchard(result.data);
      }
    };

    loadOrchard();
  }, [orchardId, fetchOrchardById]);

  const getCompletionPercentage = (orchard) => {
    if (!orchard.total_pockets) return 0;
    return Math.round((orchard.filled_pockets / orchard.total_pockets) * 100);
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
    <div className="min-h-screen relative">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source
          src="https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/orchard-videos/s2g%20my%20orchard%20(1).mp4"
          type="video/mp4"
        />
      </video>
      
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/70 to-black/80"></div>
      
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
                  <img
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
                <CardTitle className="text-3xl font-bold text-orange-700 mb-4">
                  {orchard.title}
                </CardTitle>
                
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
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-orange-700">Funding Progress</h3>
                    <span className="text-2xl font-bold text-orange-700">
                      {getCompletionPercentage(orchard)}%
                    </span>
                  </div>
                  <Progress 
                    value={getCompletionPercentage(orchard)} 
                    className="h-4 mb-4"
                  />
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-semibold text-orange-700">
                        {formatCurrency((orchard.filled_pockets || 0) * (orchard.pocket_price || 0))}
                      </div>
                      <div className="text-sm text-orange-600">Raised</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-orange-700">
                        {formatCurrency((orchard.total_pockets || 0) * (orchard.pocket_price || 0))}
                      </div>
                      <div className="text-sm text-orange-600">Goal</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-orange-700">
                        {orchard.filled_pockets || 0} / {orchard.total_pockets}
                      </div>
                      <div className="text-sm text-orange-600">Pockets</div>
                    </div>
                  </div>
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
              </CardContent>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OrchardPage;