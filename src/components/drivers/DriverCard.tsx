import React, { useState } from 'react';
import { Car, Truck, Bike, Mail, Phone, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Driver {
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

interface DriverCardProps {
  driver: Driver;
}

const vehicleIcons: Record<string, React.ReactNode> = {
  Car: <Car className="h-4 w-4" />,
  Truck: <Truck className="h-4 w-4" />,
  Bike: <Bike className="h-4 w-4" />,
  Van: <Truck className="h-4 w-4" />,
  Other: <Car className="h-4 w-4" />,
};

const DriverCard: React.FC<DriverCardProps> = ({ driver }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showContactDialog, setShowContactDialog] = useState(false);

  const images = driver.vehicle_images || [];
  const hasMultipleImages = images.length > 1;

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex(prev => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length);
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image Section */}
      <div className="relative aspect-video bg-muted">
        {images.length > 0 ? (
          <>
            <img
              src={images[currentImageIndex]}
              alt={`${driver.full_name}'s ${driver.vehicle_type}`}
              className="w-full h-full object-cover"
            />
            {hasMultipleImages && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 opacity-80 hover:opacity-100"
                  onClick={prevImage}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 opacity-80 hover:opacity-100"
                  onClick={nextImage}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {images.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {vehicleIcons[driver.vehicle_type] || <Car className="h-12 w-12 text-muted-foreground" />}
          </div>
        )}
        <Badge className="absolute top-2 right-2" variant="secondary">
          {vehicleIcons[driver.vehicle_type]}
          <span className="ml-1">{driver.vehicle_type}</span>
        </Badge>
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg truncate">{driver.full_name}</h3>
        </div>
      </CardHeader>

      <CardContent className="pb-4">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {driver.vehicle_description}
        </p>
      </CardContent>

      <CardFooter className="pt-0">
        <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <MessageCircle className="h-4 w-4 mr-2" />
              Contact Driver
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Contact {driver.full_name}</DialogTitle>
              <DialogDescription>
                Reach out to hire this driver for your delivery or transport needs
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Phone className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <a
                    href={`tel:${driver.contact_phone}`}
                    className="font-medium hover:underline"
                  >
                    {driver.contact_phone}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <a
                    href={`mailto:${driver.contact_email}`}
                    className="font-medium hover:underline"
                  >
                    {driver.contact_email}
                  </a>
                </div>
              </div>
              <div className="pt-2">
                <h4 className="font-medium mb-2">Vehicle Details</h4>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">
                    {vehicleIcons[driver.vehicle_type]}
                    <span className="ml-1">{driver.vehicle_type}</span>
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {driver.vehicle_description}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
};

export default DriverCard;
