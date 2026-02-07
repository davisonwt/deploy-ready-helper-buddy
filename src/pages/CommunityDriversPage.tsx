import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Car, Plus, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import DriverCard from '@/components/drivers/DriverCard';
import DriverFilters from '@/components/drivers/DriverFilters';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface CommunityDriver {
  id: string;
  user_id: string;
  full_name: string;
  contact_phone: string;
  contact_email: string;
  vehicle_type: string;
  vehicle_description: string;
  vehicle_images: string[];
  status: string;
  created_at: string;
}

const CommunityDriversPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<CommunityDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>('all');
  const [hasExistingRegistration, setHasExistingRegistration] = useState(false);

  useEffect(() => {
    fetchDrivers();
    checkExistingRegistration();
  }, [user]);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('community_drivers')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDrivers((data as CommunityDriver[]) || []);
    } catch (error: any) {
      console.error('Error fetching drivers:', error);
      toast.error('Failed to load community drivers');
    } finally {
      setLoading(false);
    }
  };

  const checkExistingRegistration = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('community_drivers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setHasExistingRegistration(!!data);
    } catch (error: any) {
      console.error('Error checking registration:', error);
    }
  };

  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = searchQuery === '' || 
      driver.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.vehicle_description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = vehicleTypeFilter === 'all' || 
      driver.vehicle_type === vehicleTypeFilter;

    return matchesSearch && matchesType;
  });

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
                <Users className="h-8 w-8 text-primary" />
                Community Drivers
              </h1>
              <p className="text-muted-foreground">
                Find fellow sowers offering delivery, transport, and hauling services
              </p>
            </div>
            
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link to="/register-vehicle">
                <Plus className="h-4 w-4 mr-2" />
                {hasExistingRegistration ? 'Edit My Registration' : 'Register Your Vehicle'}
              </Link>
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <DriverFilters
              vehicleType={vehicleTypeFilter}
              onVehicleTypeChange={setVehicleTypeFilter}
            />
          </div>
        </div>

        {/* Drivers Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-48 bg-muted rounded-lg mb-4" />
                  <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredDrivers.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Car className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Drivers Found</h3>
              <p className="text-muted-foreground mb-6">
                {drivers.length === 0 
                  ? "Be the first to register your vehicle and help the community!"
                  : "No drivers match your search criteria. Try adjusting your filters."}
              </p>
              <Button asChild>
                <Link to="/register-vehicle">
                  <Plus className="h-4 w-4 mr-2" />
                  Register Your Vehicle
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDrivers.map(driver => (
              <DriverCard key={driver.id} driver={driver} />
            ))}
          </div>
        )}

        {/* Stats */}
        {drivers.length > 0 && (
          <div className="mt-8 text-center text-muted-foreground">
            <p>
              Showing {filteredDrivers.length} of {drivers.length} registered drivers
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityDriversPage;
