import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ScheduleRadioSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const TIME_SLOTS = Array.from({ length: 12 }, (_, i) => {
  const hour = i * 2;
  return {
    id: `slot-${i}`,
    time: `${hour.toString().padStart(2, '0')}:00 - ${(hour + 2).toString().padStart(2, '0')}:00`,
    hour: hour,
  };
});

export const ScheduleRadioSlotDialog: React.FC<ScheduleRadioSlotDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [formData, setFormData] = useState({
    show_title: '',
    description: '',
    genre: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === 1 && (!selectedDate || !selectedSlot)) {
      toast({
        title: 'Missing Information',
        description: 'Please select a date and time slot',
        variant: 'destructive',
      });
      return;
    }

    if (step < 2) {
      setStep(2);
      return;
    }

    setLoading(true);
    try {
      // In a real implementation, this would create a radio slot request pending approval
      toast({
        title: 'Radio Slot Requested',
        description: 'Your 2-hour radio slot request has been submitted for approval by gosat.',
      });

      onOpenChange(false);
      onSuccess();
      setStep(1);
      setSelectedDate(undefined);
      setSelectedSlot('');
      setFormData({
        show_title: '',
        description: '',
        genre: '',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card bg-background/95 border-primary/20 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Schedule Radio Slot (2 Hours) - Step {step}/2
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            24/7 broadcast slots available • Pending approval by gosat
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 && (
            <>
              <div>
                <Label className="mb-2 block">Select Date</Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border glass-panel"
                  disabled={(date) => date < new Date()}
                />
              </div>

              {selectedDate && (
                <div>
                  <Label className="mb-3 block">
                    Select 2-Hour Slot for {format(selectedDate, 'MMMM d, yyyy')}
                  </Label>
                  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2">
                    {TIME_SLOTS.map((slot) => (
                      <Button
                        key={slot.id}
                        type="button"
                        variant={selectedSlot === slot.id ? 'default' : 'outline'}
                        className="justify-start"
                        onClick={() => setSelectedSlot(slot.id)}
                      >
                        {slot.time}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className="p-4 rounded-lg glass-panel space-y-2">
                <div className="flex items-center gap-2">
                  <Badge>Selected Slot</Badge>
                  <span className="font-semibold">
                    {selectedDate && format(selectedDate, 'MMMM d, yyyy')} •{' '}
                    {TIME_SLOTS.find((s) => s.id === selectedSlot)?.time}
                  </span>
                </div>
              </div>

              <div>
                <Label htmlFor="show_title">Show Title</Label>
                <Input
                  id="show_title"
                  value={formData.show_title}
                  onChange={(e) => setFormData({ ...formData, show_title: e.target.value })}
                  placeholder="Late Night Vibes"
                  required
                />
              </div>

              <div>
                <Label htmlFor="genre">Genre/Category</Label>
                <Input
                  id="genre"
                  value={formData.genre}
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                  placeholder="Jazz, Hip-Hop, Talk Show, etc."
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Show Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your show concept and what listeners can expect..."
                  rows={4}
                  required
                />
              </div>

              <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                <p className="text-sm">
                  <strong>Note:</strong> Your request will be reviewed by gosat. You'll be notified
                  once your slot is approved and ready for broadcast.
                </p>
              </div>
            </>
          )}

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (step > 1) setStep(1);
                else onOpenChange(false);
              }}
            >
              {step > 1 ? 'Back' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={loading || (step === 1 && (!selectedDate || !selectedSlot))}>
              {step < 2 ? 'Next' : loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
