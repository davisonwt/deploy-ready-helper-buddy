import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Wrench, Plus, Search, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ServiceProviderCard from '@/components/services/ServiceProviderCard';
import ServiceFilters from '@/components/services/ServiceFilters';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ServiceProvider {
  id: string;
  user_id: string;
  full_name: string;
  contact_phone: string;
  contact_email: string;
  services_offered: string[];
  custom_services: string[];
  country: string;
  city: string;
  service_areas: string[];
  hourly_rate: number | null;
  description: string | null;
  portfolio_images: string[];
  status: string;
  created_at: string;
}

const CommunityServicesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [hasExistingRegistration, setHasExistingRegistration] = useState(false);

  useEffect(() => {
    fetchProviders();
    checkExistingRegistration();
  }, [user]);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('service_providers')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProviders((data as ServiceProvider[]) || []);
    } catch (error: any) {
      console.error('Error fetching providers:', error);
      toast.error('Failed to load service providers');
    } finally {
      setLoading(false);
    }
  };

  const checkExistingRegistration = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setHasExistingRegistration(!!data);
    } catch (error: any) {
      console.error('Error checking registration:', error);
    }
  };

  // Get unique services for filter
  const allServices = Array.from(new Set(
    providers.flatMap(p => [...p.services_offered, ...(p.custom_services || [])])
  )).sort();

  // Filter providers
  const filteredProviders = providers.filter(provider => {
    // Search match
    const matchesSearch = searchQuery === '' || 
      provider.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.services_offered.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
      provider.custom_services?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Service match
    const matchesService = serviceFilter === 'all' || 
      provider.services_offered.includes(serviceFilter) ||
      provider.custom_services?.includes(serviceFilter);

    // Location match
    const matchesLocation = locationFilter === '' ||
      provider.city?.toLowerCase().includes(locationFilter.toLowerCase()) ||
      provider.country?.toLowerCase().includes(locationFilter.toLowerCase()) ||
      provider.service_areas?.some(a => a.toLowerCase().includes(locationFilter.toLowerCase()));

    return matchesSearch && matchesService && matchesLocation;
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
                <Wrench className="h-8 w-8 text-primary" />
                Community Services
              </h1>
              <p className="text-muted-foreground">
                Find skilled sowers offering professional services in your area
              </p>
            </div>
            
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link to="/register-services">
                <Plus className="h-4 w-4 mr-2" />
                {hasExistingRegistration ? 'Edit My Registration' : 'Offer Your Services'}
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
                placeholder="Search by name, skill, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative md:w-64">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by location..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="pl-10"
              />
            </div>
            <ServiceFilters
              services={allServices}
              selectedService={serviceFilter}
              onServiceChange={setServiceFilter}
            />
          </div>
        </div>

        {/* Quick service tags */}
        {allServices.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <Badge 
              variant={serviceFilter === 'all' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setServiceFilter('all')}
            >
              All Services
            </Badge>
            {allServices.slice(0, 8).map(service => (
              <Badge 
                key={service}
                variant={serviceFilter === service ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setServiceFilter(service)}
              >
                {service}
              </Badge>
            ))}
          </div>
        )}

        {/* Providers Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-40 bg-muted rounded-lg mb-4" />
                  <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProviders.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Wrench className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Service Providers Found</h3>
              <p className="text-muted-foreground mb-6">
                {providers.length === 0 
                  ? "Be the first to register and offer your skills to the community!"
                  : "No providers match your search criteria. Try adjusting your filters."}
              </p>
              <Button asChild>
                <Link to="/register-services">
                  <Plus className="h-4 w-4 mr-2" />
                  Offer Your Services
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map(provider => (
              <ServiceProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        )}

        {/* Stats */}
        {providers.length > 0 && (
          <div className="mt-8 text-center text-muted-foreground">
            <p>
              Showing {filteredProviders.length} of {providers.length} service providers
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityServicesPage;
