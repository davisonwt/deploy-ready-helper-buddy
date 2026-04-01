import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Car, MapPin, Clock } from 'lucide-react';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const driverIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'driver-marker',
});

interface DriverTrackingMapProps {
  driverUserId: string;
  customerLat?: number;
  customerLng?: number;
  pickupAddress?: string;
}

// Haversine formula for distance
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateArrival(distKm: number): string {
  const avgSpeedKmH = 40;
  const minutes = Math.round((distKm / avgSpeedKmH) * 60);
  if (minutes < 1) return 'Less than 1 min';
  if (minutes < 60) return `~${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `~${hrs}h ${mins}m`;
}

// Auto-fit bounds component
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length >= 2) {
      const bounds = L.latLngBounds(positions.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (positions.length === 1) {
      map.setView(positions[0], 13);
    }
  }, [positions, map]);
  return null;
}

export const DriverTrackingMap: React.FC<DriverTrackingMapProps> = ({
  driverUserId, customerLat, customerLng, pickupAddress,
}) => {
  const [driverLat, setDriverLat] = useState<number | null>(null);
  const [driverLng, setDriverLng] = useState<number | null>(null);
  const [driverName, setDriverName] = useState('Driver');

  // Initial fetch
  useEffect(() => {
    const fetchDriver = async () => {
      const { data } = await supabase
        .from('community_drivers')
        .select('current_lat, current_lng, full_name')
        .eq('user_id', driverUserId)
        .single();
      if (data) {
        setDriverLat(data.current_lat);
        setDriverLng(data.current_lng);
        setDriverName(data.full_name || 'Driver');
      }
    };
    fetchDriver();
  }, [driverUserId]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`driver-location-${driverUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'community_drivers',
          filter: `user_id=eq.${driverUserId}`,
        },
        (payload) => {
          const n = payload.new as any;
          if (n.current_lat && n.current_lng) {
            setDriverLat(n.current_lat);
            setDriverLng(n.current_lng);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [driverUserId]);

  const distance = driverLat && driverLng && customerLat && customerLng
    ? haversineDistance(driverLat, driverLng, customerLat, customerLng)
    : null;

  const positions: [number, number][] = [];
  if (driverLat && driverLng) positions.push([driverLat, driverLng]);
  if (customerLat && customerLng) positions.push([customerLat, customerLng]);

  const center: [number, number] = positions.length > 0
    ? positions[0]
    : [-26.2041, 28.0473]; // Default: Johannesburg

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Car className="w-4 h-4 text-primary" />
          Live Driver Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* ETA info */}
        {distance !== null && (
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{distance.toFixed(1)} km away</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span>ETA: {estimateArrival(distance)}</span>
            </div>
          </div>
        )}

        {/* Map */}
        <div className="h-[250px] rounded-lg overflow-hidden border">
          <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {driverLat && driverLng && (
              <Marker position={[driverLat, driverLng]} icon={driverIcon}>
                <Popup>🚗 {driverName}</Popup>
              </Marker>
            )}
            {customerLat && customerLng && (
              <Marker position={[customerLat, customerLng]}>
                <Popup>📍 {pickupAddress || 'Your Location'}</Popup>
              </Marker>
            )}
            {positions.length > 0 && <FitBounds positions={positions} />}
          </MapContainer>
        </div>

        {!driverLat && (
          <p className="text-xs text-muted-foreground text-center">
            Waiting for driver location updates...
          </p>
        )}
      </CardContent>
    </Card>
  );
};
