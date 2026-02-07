import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase } from 'lucide-react';

interface ServiceFiltersProps {
  services: string[];
  selectedService: string;
  onServiceChange: (service: string) => void;
}

const ServiceFilters: React.FC<ServiceFiltersProps> = ({
  services,
  selectedService,
  onServiceChange
}) => {
  return (
    <div className="flex items-center gap-2">
      <Briefcase className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedService} onValueChange={onServiceChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by service" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Services</SelectItem>
          {services.map(service => (
            <SelectItem key={service} value={service}>
              {service}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ServiceFilters;
