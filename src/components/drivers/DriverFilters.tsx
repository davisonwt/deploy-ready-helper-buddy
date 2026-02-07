import React from 'react';
import { Car, Truck, Bike, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DriverFiltersProps {
  vehicleType: string;
  onVehicleTypeChange: (value: string) => void;
}

const vehicleOptions = [
  { value: 'all', label: 'All Vehicles', icon: Filter },
  { value: 'Car', label: 'Cars', icon: Car },
  { value: 'Truck', label: 'Trucks', icon: Truck },
  { value: 'Bike', label: 'Bikes', icon: Bike },
  { value: 'Van', label: 'Vans', icon: Truck },
  { value: 'Other', label: 'Other', icon: Car },
];

const DriverFilters: React.FC<DriverFiltersProps> = ({
  vehicleType,
  onVehicleTypeChange,
}) => {
  return (
    <Select value={vehicleType} onValueChange={onVehicleTypeChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Filter by vehicle" />
      </SelectTrigger>
      <SelectContent>
        {vehicleOptions.map(option => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex items-center gap-2">
              <option.icon className="h-4 w-4" />
              {option.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default DriverFilters;
