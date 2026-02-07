import React, { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, Mail, Clock, MessageSquare } from 'lucide-react';
import ServiceQuoteRequestDialog from './ServiceQuoteRequestDialog';

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

interface ServiceProviderCardProps {
  provider: ServiceProvider;
}

const ServiceProviderCard: React.FC<ServiceProviderCardProps> = ({ provider }) => {
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const allServices = [...provider.services_offered, ...(provider.custom_services || [])];

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        {/* Image carousel */}
        {provider.portfolio_images && provider.portfolio_images.length > 0 ? (
          <div className="relative h-48 bg-muted">
            <img
              src={provider.portfolio_images[currentImageIndex]}
              alt={`${provider.full_name}'s work`}
              className="w-full h-full object-cover"
            />
            {provider.portfolio_images.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {provider.portfolio_images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <span className="text-6xl">🛠️</span>
          </div>
        )}

        <CardContent className="p-4">
          {/* Name and rate */}
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-semibold text-lg">{provider.full_name}</h3>
            {provider.hourly_rate && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                R{provider.hourly_rate}/hr
              </Badge>
            )}
          </div>

          {/* Location */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
            <MapPin className="h-4 w-4" />
            <span>{provider.city}, {provider.country}</span>
          </div>

          {/* Services */}
          <div className="flex flex-wrap gap-1 mb-3">
            {allServices.slice(0, 4).map(service => (
              <Badge key={service} variant="outline" className="text-xs">
                {service}
              </Badge>
            ))}
            {allServices.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{allServices.length - 4} more
              </Badge>
            )}
          </div>

          {/* Service areas */}
          {provider.service_areas && provider.service_areas.length > 0 && (
            <div className="text-xs text-muted-foreground mb-3">
              Areas: {provider.service_areas.slice(0, 3).join(', ')}
              {provider.service_areas.length > 3 && ` +${provider.service_areas.length - 3} more`}
            </div>
          )}

          {/* Description preview */}
          {provider.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {provider.description}
            </p>
          )}
        </CardContent>

        <CardFooter className="p-4 pt-0 flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => window.location.href = `tel:${provider.contact_phone}`}
          >
            <Phone className="h-4 w-4 mr-1" />
            Call
          </Button>
          <Button 
            size="sm" 
            className="flex-1"
            onClick={() => setShowQuoteDialog(true)}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Request Quote
          </Button>
        </CardFooter>
      </Card>

      <ServiceQuoteRequestDialog
        open={showQuoteDialog}
        onOpenChange={setShowQuoteDialog}
        provider={provider}
      />
    </>
  );
};

export default ServiceProviderCard;
