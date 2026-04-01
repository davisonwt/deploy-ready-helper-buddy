import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Car, Wrench, Ear, MapPin, Clock, Loader2, CalendarIcon } from 'lucide-react';
import { useCreateBooking } from '@/hooks/useGigBookings';
import { useSearchProviders } from '@/hooks/useGigBookings';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Generate time slots from 5:00 AM to 11:45 PM in 15-min intervals
function generateTimeSlots(): { value: string; label: string }[] {
  const slots: { value: string; label: string }[] = [];
  for (let h = 5; h <= 23; h++) {
    for (let m = 0; m < 60; m += 15) {
      const h12 = h % 12 === 0 ? 12 : h % 12;
      const ampm = h < 12 ? 'AM' : 'PM';
      const label = `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
      const value = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      slots.push({ value, label });
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

interface GigBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'ride' | 'service' | 'whisperer';
}

export const GigBookingModal: React.FC<GigBookingModalProps> = ({
  open, onOpenChange, initialTab = 'ride',
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [pickupDate, setPickupDate] = useState<Date | undefined>();
  const [pickupTime, setPickupTime] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('1');
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [customerNotes, setCustomerNotes] = useState('');
  const [passengerCount, setPassengerCount] = useState('1');

  const selectedDatetime = useMemo(() => {
    if (!pickupDate || !pickupTime) return undefined;
    const [hours, minutes] = pickupTime.split(':').map(Number);
    const dt = new Date(pickupDate);
    dt.setHours(hours, minutes, 0, 0);
    return dt;
  }, [pickupDate, pickupTime]);

  const createBooking = useCreateBooking();
  const { data: driversData } = useSearchProviders('driver');
  const { data: servicesData } = useSearchProviders('service');

  const drivers = driversData?.data || [];
  const services = servicesData?.data || [];

  const DateTimePicker = () => (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !pickupDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {pickupDate ? format(pickupDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={pickupDate}
              onSelect={setPickupDate}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Time</Label>
        <Select value={pickupTime} onValueChange={setPickupTime}>
          <SelectTrigger>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <SelectValue placeholder="Select a time" />
            </div>
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {TIME_SLOTS.map((slot) => (
              <SelectItem key={slot.value} value={slot.value}>
                {slot.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const handleSubmitRide = () => {
    if (!pickupAddress || !selectedDatetime) {
      toast.error('Please fill pickup address, date and time');
      return;
    }

    createBooking.mutate({
      booking_type: 'ride',
      provider_id: drivers[0]?.user_id || '',
      provider_type: 'driver',
      pickup_address: pickupAddress,
      dropoff_address: dropoffAddress,
      pickup_datetime: selectedDatetime.toISOString(),
      is_round_trip: isRoundTrip,
      estimated_duration_min: 60,
      estimated_distance_km: 20,
      estimated_fare: 25,
      customer_notes: customerNotes,
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const handleSubmitService = () => {
    if (!serviceCategory || !selectedDatetime || !jobDescription) {
      toast.error('Please fill all required service fields');
      return;
    }

    createBooking.mutate({
      booking_type: 'service',
      provider_id: services[0]?.user_id || '',
      provider_type: 'service_provider',
      pickup_address: pickupAddress,
      pickup_datetime: selectedDatetime.toISOString(),
      estimated_duration_min: parseInt(estimatedHours) * 60,
      estimated_fare: parseInt(estimatedHours) * 30,
      service_details: {
        service_type: serviceCategory,
        estimated_hours: parseInt(estimatedHours),
        job_description: jobDescription,
      },
      customer_notes: customerNotes,
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Book a Service</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="ride" className="text-xs gap-1">
              <Car className="w-3.5 h-3.5" /> Ride
            </TabsTrigger>
            <TabsTrigger value="service" className="text-xs gap-1">
              <Wrench className="w-3.5 h-3.5" /> Service
            </TabsTrigger>
            <TabsTrigger value="whisperer" className="text-xs gap-1">
              <Ear className="w-3.5 h-3.5" /> Whisperer
            </TabsTrigger>
          </TabsList>

          {/* RIDE TAB */}
          <TabsContent value="ride" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Pickup Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Enter pickup location"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Dropoff Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Enter destination"
                  value={dropoffAddress}
                  onChange={(e) => setDropoffAddress(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <DateTimePicker />

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Number of Passengers</Label>
              <div className="relative">
                <Users className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={passengerCount}
                  onChange={(e) => setPassengerCount(e.target.value)}
                  className="pl-9"
                  placeholder="How many passengers?"
                />
              </div>
              {drivers.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {drivers.filter((d: any) => !d.max_passengers || d.max_passengers >= parseInt(passengerCount || '1')).length} driver(s) can accommodate {passengerCount} passenger(s)
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="roundTrip"
                checked={isRoundTrip}
                onChange={(e) => setIsRoundTrip(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="roundTrip" className="text-xs">Round trip (return journey)</Label>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Notes (optional)</Label>
              <Textarea
                placeholder="Any special instructions..."
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                rows={2}
              />
            </div>

            {drivers.length > 0 && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">{drivers.length} driver(s) available in your area</p>
              </div>
            )}

            <Button
              onClick={handleSubmitRide}
              disabled={createBooking.isPending}
              className="w-full"
            >
              {createBooking.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Booking...</>
              ) : (
                <><Car className="w-4 h-4 mr-2" /> Book Ride</>
              )}
            </Button>
          </TabsContent>

          {/* SERVICE TAB */}
          <TabsContent value="service" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Service Category</Label>
              <Select value={serviceCategory} onValueChange={setServiceCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cleaning">🧹 Cleaning</SelectItem>
                  <SelectItem value="gardening">🌱 Gardening</SelectItem>
                  <SelectItem value="electrical">⚡ Electrical</SelectItem>
                  <SelectItem value="plumbing">🔧 Plumbing</SelectItem>
                  <SelectItem value="pest_control">🐛 Pest Control</SelectItem>
                  <SelectItem value="painting">🎨 Painting</SelectItem>
                  <SelectItem value="carpentry">🪚 Carpentry</SelectItem>
                  <SelectItem value="moving">📦 Moving/Hauling</SelectItem>
                  <SelectItem value="other">🔨 Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Job Description</Label>
              <Textarea
                placeholder="Describe the work needed..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Service location"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Estimated Hours</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  min="1"
                  max="24"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <DateTimePicker />

            {services.length > 0 && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">{services.length} provider(s) available</p>
              </div>
            )}

            <Button
              onClick={handleSubmitService}
              disabled={createBooking.isPending}
              className="w-full"
            >
              {createBooking.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Booking...</>
              ) : (
                <><Wrench className="w-4 h-4 mr-2" /> Book Service</>
              )}
            </Button>
          </TabsContent>

          {/* WHISPERER TAB */}
          <TabsContent value="whisperer" className="space-y-4 mt-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Ear className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold text-sm">Prayer & Support</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Connect with a Whisperer for prayer support, spiritual guidance, and encouragement. Sessions are free — bestowals welcome.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">What do you need prayer for?</Label>
              <Textarea
                placeholder="Share your prayer request..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={4}
              />
            </div>

            <DateTimePicker />

            <Button
              onClick={() => {
                if (!jobDescription || !selectedDatetime) {
                  toast.error('Please describe your prayer request and select date & time');
                  return;
                }
                createBooking.mutate({
                  booking_type: 'service',
                  provider_id: '',
                  provider_type: 'service_provider',
                  pickup_datetime: selectedDatetime.toISOString(),
                  estimated_duration_min: 30,
                  estimated_fare: 0,
                  service_details: {
                    service_type: 'whisperer',
                    prayer_request: jobDescription,
                  },
                  customer_notes: customerNotes,
                }, {
                  onSuccess: () => onOpenChange(false),
                });
              }}
              disabled={createBooking.isPending}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {createBooking.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting...</>
              ) : (
                <><Ear className="w-4 h-4 mr-2" /> Request Whisperer Session</>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};