import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Globe } from 'lucide-react';
import { TimelineBuilder } from '@/components/radio/TimelineBuilder';
import type { TimelineSegment } from '@/components/radio/TimelineBuilder';

export interface EditableSlotData {
  id: string;
  time_slot_date: string;
  hour_slot: number;
  show_subject: string | null;
  show_notes: string | null;
  show_topic_description: string | null;
}

interface ScheduleRadioSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editSlot?: EditableSlotData | null;
}

const TIMEZONE_OPTIONS = [
  { label: '🇺🇸 USA (Eastern)', value: 'America/New_York', abbr: 'ET' },
  { label: '🇺🇸 USA (Central)', value: 'America/Chicago', abbr: 'CT' },
  { label: '🇺🇸 USA (Mountain)', value: 'America/Denver', abbr: 'MT' },
  { label: '🇺🇸 USA (Pacific)', value: 'America/Los_Angeles', abbr: 'PT' },
  { label: '🇿🇦 South Africa', value: 'Africa/Johannesburg', abbr: 'SAST' },
  { label: '🇨🇦 Canada (Eastern)', value: 'America/Toronto', abbr: 'ET' },
  { label: '🇨🇦 Canada (Pacific)', value: 'America/Vancouver', abbr: 'PT' },
  { label: '🇬🇧 United Kingdom', value: 'Europe/London', abbr: 'GMT/BST' },
  { label: '🇦🇺 Australia (Sydney)', value: 'Australia/Sydney', abbr: 'AEST' },
  { label: '🇳🇬 Nigeria', value: 'Africa/Lagos', abbr: 'WAT' },
  { label: '🇰🇪 Kenya / East Africa', value: 'Africa/Nairobi', abbr: 'EAT' },
  { label: '🇮🇳 India', value: 'Asia/Kolkata', abbr: 'IST' },
  { label: '🇮🇱 Israel', value: 'Asia/Jerusalem', abbr: 'IST' },
];

const TIME_SLOTS = Array.from({ length: 12 }, (_, i) => {
  const hour = i * 2;
  return {
    id: `slot-${i}`,
    time: `${hour.toString().padStart(2, '0')}:00 - ${(hour + 2).toString().padStart(2, '0')}:00`,
    hour: hour,
  };
});

const detectTimezone = () => {
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const match = TIMEZONE_OPTIONS.find(tz => tz.value === userTz);
  return match ? match.value : TIMEZONE_OPTIONS[0].value;
};

export const ScheduleRadioSlotDialog: React.FC<ScheduleRadioSlotDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  editSlot,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [selectedTimezone, setSelectedTimezone] = useState(detectTimezone());
  const [formData, setFormData] = useState({
    show_title: '',
    description: '',
  });
  const [timelineSegments, setTimelineSegments] = useState<TimelineSegment[]>([]);

  const isEditMode = !!editSlot;

  // Pre-fill form when editing
  useEffect(() => {
    if (editSlot && open) {
      const date = new Date(editSlot.time_slot_date + 'T00:00:00');
      setSelectedDates([date]);
      const slotMatch = TIME_SLOTS.find(s => s.hour === editSlot.hour_slot);
      setSelectedSlot(slotMatch?.id || '');
      setFormData({
        show_title: editSlot.show_subject || '',
        description: editSlot.show_notes || '',
      });
      // Parse saved timeline segments (without files - those were uploaded)
      if (editSlot.show_topic_description) {
        try {
          const parsed = JSON.parse(editSlot.show_topic_description);
          if (Array.isArray(parsed)) {
            setTimelineSegments(parsed.map((seg: any, i: number) => ({
              id: `seg-${i}-${Date.now()}`,
              type: seg.type || 'music',
              title: seg.title || '',
              durationMinutes: seg.durationMinutes || 3,
              durationSeconds: seg.durationSeconds || 0,
              contentId: seg.contentId,
              contentName: seg.contentName,
              file: undefined,
            })));
          }
        } catch { /* ignore parse errors */ }
      }
      setStep(1); // Allow editing date/time too
    } else if (!editSlot && open) {
      // Reset for new slot
      setStep(1);
      setSelectedDates([]);
      setSelectedSlot('');
      setFormData({ show_title: '', description: '' });
      setTimelineSegments([]);
    }
  }, [editSlot, open]);

  // Safety: ensure body interaction is restored when dialog closes
  useEffect(() => {
    if (!open) {
      document.body.style.pointerEvents = 'auto';
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === 1 && (selectedDates.length === 0 || !selectedSlot)) {
      toast({
        title: 'Missing Information',
        description: 'Please select at least one date and a time slot',
        variant: 'destructive',
      });
      return;
    }

    if (step < 3) {
      setStep(step + 1);
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get or create DJ profile
      let { data: dj } = await supabase
        .from('radio_djs')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!dj) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, first_name')
          .eq('user_id', user.id)
          .single();

        const { data: newDj, error: djErr } = await supabase
          .from('radio_djs')
          .insert({ user_id: user.id, dj_name: profile?.display_name || profile?.first_name || 'DJ' })
          .select('id')
          .single();
        if (djErr) throw djErr;
        dj = newDj;
      }

      // Calculate start/end times from selected slot and date
      const slotInfo = TIME_SLOTS.find(s => s.id === selectedSlot);
      if (!slotInfo || selectedDates.length === 0) throw new Error('Missing slot or date');

      // Upload segment files to storage (once, shared across all dates)
      const segmentsData = [];
      for (const seg of timelineSegments) {
        let fileUrl: string | undefined;
        if (seg.file) {
          const filePath = `radio-content/${Date.now()}-${seg.file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('chat-documents')
            .upload(filePath, seg.file);
          if (!uploadError) fileUrl = filePath;
        }
        segmentsData.push({
          type: seg.type,
          title: seg.title,
          durationMinutes: seg.durationMinutes,
          contentId: seg.contentId,
          contentName: seg.contentName,
          fileUrl,
        });
      }

      if (isEditMode && editSlot) {
        const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
        const buildSlotRow = (date: Date) => {
          const startDate = new Date(date);
          startDate.setHours(slotInfo.hour, 0, 0, 0);
          const endDate = new Date(startDate);
          endDate.setHours(slotInfo.hour + 2);

          return {
            dj_id: dj!.id,
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            time_slot_date: format(date, 'yyyy-MM-dd'),
            hour_slot: slotInfo.hour,
            show_subject: formData.show_title,
            show_notes: formData.description,
            show_topic_description: JSON.stringify(segmentsData),
            broadcast_mode: 'pre_recorded' as const,
          };
        };

        // Edit mode: update the existing slot and create additional slots for extra selected dates
        const [firstDate, ...additionalDates] = sortedDates;
        const { error: updateError } = await supabase
          .from('radio_schedule')
          .update(buildSlotRow(firstDate))
          .eq('id', editSlot.id);
        if (updateError) throw updateError;

        if (additionalDates.length > 0) {
          const insertRows = additionalDates.map((date) => ({
            ...buildSlotRow(date),
            status: 'scheduled',
            approval_status: 'pending',
          }));

          const { error: insertError } = await supabase
            .from('radio_schedule')
            .insert(insertRows);
          if (insertError) throw insertError;
        }
      } else {
        // New mode: create one slot per selected date
        const insertRows = selectedDates.map(date => {
          const startDate = new Date(date);
          startDate.setHours(slotInfo.hour, 0, 0, 0);
          const endDate = new Date(startDate);
          endDate.setHours(slotInfo.hour + 2);
          return {
            dj_id: dj!.id,
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            time_slot_date: format(date, 'yyyy-MM-dd'),
            hour_slot: slotInfo.hour,
            status: 'scheduled',
            approval_status: 'pending',
            show_subject: formData.show_title,
            show_notes: formData.description,
            show_topic_description: JSON.stringify(segmentsData),
            broadcast_mode: 'pre_recorded',
          };
        });
        const { error } = await supabase.from('radio_schedule').insert(insertRows);
        if (error) throw error;
      }

      toast({
        title: isEditMode ? 'Radio Slot Updated' : 'Radio Slot(s) Requested',
        description: isEditMode 
          ? `Your show "${formData.show_title}" has been updated.`
          : `Your show "${formData.show_title}" has been scheduled for ${selectedDates.length} date(s) and submitted for approval.`,
      });

      onSuccess();
      onOpenChange(false);
      setStep(1);
      setSelectedDates([]);
      setSelectedSlot('');
      setTimelineSegments([]);
      setFormData({ show_title: '', description: '' });
      document.body.style.pointerEvents = 'auto';
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
      <DialogContent className="glass-card bg-background/95 border-primary/20 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isEditMode ? 'Edit Radio Slot' : 'Schedule Radio Slot (2 Hours)'} - Step {step}/3
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            24/7 broadcast slots available • Pending approval by gosat
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 && (
            <>
              <div>
                <Label className="mb-2 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Your Timezone
                </Label>
                <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select your timezone" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Time slots below are shown in {TIMEZONE_OPTIONS.find(tz => tz.value === selectedTimezone)?.label || selectedTimezone}
                </p>
              </div>

              <div>
                <Label className="mb-2 block">Select Date(s)</Label>
                <Calendar
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={(dates) => setSelectedDates(dates || [])}
                  className="rounded-md border glass-panel pointer-events-auto"
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                />
                {selectedDates.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedDates.length} date(s) selected
                  </p>
                )}
              </div>

              {selectedDates.length > 0 && (
                <div>
                  <Label className="mb-3 block">
                    Select 2-Hour Slot{' '}
                    <span className="text-xs text-muted-foreground">
                      ({TIMEZONE_OPTIONS.find(tz => tz.value === selectedTimezone)?.abbr})
                    </span>
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
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge>Selected</Badge>
                  <span className="font-semibold">
                    {selectedDates.map(d => format(d, 'MMM d')).join(', ')} •{' '}
                    {TIME_SLOTS.find((s) => s.id === selectedSlot)?.time}{' '}
                    ({TIMEZONE_OPTIONS.find(tz => tz.value === selectedTimezone)?.abbr})
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
                  <strong>Note:</strong> In the next step, you'll be able to pre-load music tracks and documents for your show.
                </p>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="p-4 rounded-lg glass-panel space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge>Selected</Badge>
                  <span className="font-semibold">
                    {selectedDates.map(d => format(d, 'MMM d')).join(', ')} •{' '}
                    {TIME_SLOTS.find((s) => s.id === selectedSlot)?.time}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formData.show_title}
                </div>
              </div>

              <TimelineBuilder
                segments={timelineSegments}
                onChange={setTimelineSegments}
              />

              <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                <p className="text-sm">
                  <strong>Bestowal Feature:</strong> Listeners can bestow on tracks and documents during your show.
                  Gosat's will receive tithing (10%) and admin (5%) fees automatically.
                </p>
              </div>
            </>
          )}

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (step > 1) setStep(step - 1);
                else onOpenChange(false);
              }}
            >
              {step > 1 ? 'Back' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={loading || (step === 1 && (selectedDates.length === 0 || !selectedSlot))}>
              {step < 3 ? 'Next' : loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
