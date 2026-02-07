import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Plus } from 'lucide-react';

interface AvailabilityEntry {
  date: Date;
  locations: string[];
  timeSlots: string[];
  notes?: string;
}

interface ServiceAvailabilityCalendarProps {
  availability: AvailabilityEntry[];
  onAvailabilityChange: (availability: AvailabilityEntry[]) => void;
  serviceAreas: string[];
}

const TIME_SLOTS = [
  'Morning (6am-12pm)',
  'Afternoon (12pm-5pm)',
  'Evening (5pm-9pm)',
  'All Day'
];

const ServiceAvailabilityCalendar: React.FC<ServiceAvailabilityCalendarProps> = ({
  availability,
  onAvailabilityChange,
  serviceAreas
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Get dates that have availability set
  const availableDates = availability.map(a => a.date);

  // Check if a date has availability
  const hasAvailability = (date: Date) => {
    return availability.some(a => 
      a.date.toDateString() === date.toDateString()
    );
  };

  // Get availability for a specific date
  const getAvailabilityForDate = (date: Date) => {
    return availability.find(a => 
      a.date.toDateString() === date.toDateString()
    );
  };

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    
    if (date) {
      const existing = getAvailabilityForDate(date);
      if (existing) {
        setSelectedLocations(existing.locations);
        setSelectedTimeSlots(existing.timeSlots);
        setNotes(existing.notes || '');
      } else {
        setSelectedLocations([]);
        setSelectedTimeSlots([]);
        setNotes('');
      }
    }
  };

  // Toggle location
  const toggleLocation = (location: string) => {
    setSelectedLocations(prev =>
      prev.includes(location)
        ? prev.filter(l => l !== location)
        : [...prev, location]
    );
  };

  // Toggle time slot
  const toggleTimeSlot = (slot: string) => {
    setSelectedTimeSlots(prev =>
      prev.includes(slot)
        ? prev.filter(s => s !== slot)
        : [...prev, slot]
    );
  };

  // Save availability for selected date
  const saveAvailability = () => {
    if (!selectedDate || selectedLocations.length === 0 || selectedTimeSlots.length === 0) {
      return;
    }

    const newEntry: AvailabilityEntry = {
      date: selectedDate,
      locations: selectedLocations,
      timeSlots: selectedTimeSlots,
      notes: notes || undefined
    };

    // Remove existing entry for this date and add new one
    const filtered = availability.filter(
      a => a.date.toDateString() !== selectedDate.toDateString()
    );
    
    onAvailabilityChange([...filtered, newEntry]);
    
    // Clear selections
    setSelectedDate(undefined);
    setSelectedLocations([]);
    setSelectedTimeSlots([]);
    setNotes('');
  };

  // Remove availability for a date
  const removeAvailability = (date: Date) => {
    onAvailabilityChange(
      availability.filter(a => a.date.toDateString() !== date.toDateString())
    );
    
    if (selectedDate?.toDateString() === date.toDateString()) {
      setSelectedDate(undefined);
      setSelectedLocations([]);
      setSelectedTimeSlots([]);
      setNotes('');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Calendar */}
      <div>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          modifiers={{
            available: availableDates
          }}
          modifiersStyles={{
            available: { 
              backgroundColor: 'hsl(var(--primary) / 0.2)',
              fontWeight: 'bold'
            }
          }}
          className="rounded-md border"
        />
        
        {/* Legend */}
        <div className="mt-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-primary/20" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-primary bg-primary text-primary-foreground flex items-center justify-center text-xs">
              ✓
            </div>
            <span>Selected</span>
          </div>
        </div>
      </div>

      {/* Availability details */}
      <div className="space-y-4">
        {selectedDate ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Locations */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Available Locations
                </label>
                {serviceAreas.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {serviceAreas.map(area => (
                      <div
                        key={area}
                        onClick={() => toggleLocation(area)}
                        className={`px-3 py-1 rounded-full text-sm cursor-pointer transition-all ${
                          selectedLocations.includes(area)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        {area}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Add service areas in the Location step first
                  </p>
                )}
              </div>

              {/* Time slots */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Time Availability
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TIME_SLOTS.map(slot => (
                    <div
                      key={slot}
                      onClick={() => toggleTimeSlot(slot)}
                      className={`p-2 rounded-lg text-sm cursor-pointer text-center transition-all ${
                        selectedTimeSlots.includes(slot)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {slot}
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Notes (Optional)
                </label>
                <Input
                  placeholder="e.g., Only available after 2pm"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={saveAvailability}
                  disabled={selectedLocations.length === 0 || selectedTimeSlots.length === 0}
                  className="flex-1"
                >
                  {hasAvailability(selectedDate) ? 'Update' : 'Add'} Availability
                </Button>
                {hasAvailability(selectedDate) && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => removeAvailability(selectedDate)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-muted/30">
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>Select a date on the calendar to set your availability</p>
            </CardContent>
          </Card>
        )}

        {/* Availability summary */}
        {availability.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Marked Available Days ({availability.length})</h4>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {availability
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .map((entry, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm"
                  >
                    <div>
                      <span className="font-medium">
                        {entry.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        {entry.locations.join(', ')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAvailability(entry.date)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceAvailabilityCalendar;
