import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Music, FileText, Upload } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

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
  const [availableTracks, setAvailableTracks] = useState<any[]>([]);
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<File[]>([]);

  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'application/pdf': ['.pdf'], 'application/msword': ['.doc', '.docx'] },
    onDrop: (acceptedFiles) => {
      setUploadedDocs(prev => [...prev, ...acceptedFiles]);
    },
  });

  useEffect(() => {
    if (open && step === 3) {
      loadAvailableTracks();
    }
  }, [open, step]);

  const loadAvailableTracks = async () => {
    const { data, error } = await supabase
      .from('dj_music_tracks')
      .select('*, radio_djs(dj_name, user_id)')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAvailableTracks(data);
    }
  };

  const toggleTrackSelection = (trackId: string) => {
    setSelectedTracks(prev =>
      prev.includes(trackId)
        ? prev.filter(id => id !== trackId)
        : [...prev, trackId]
    );
  };

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

    if (step < 3) {
      setStep(step + 1);
      return;
    }

    setLoading(true);
    try {
      // Upload documents to storage if any
      const docUrls: string[] = [];
      for (const doc of uploadedDocs) {
        const filePath = `radio-docs/${Date.now()}-${doc.name}`;
        const { error: uploadError } = await supabase.storage
          .from('chat-documents')
          .upload(filePath, doc);
        
        if (!uploadError) {
          docUrls.push(filePath);
        }
      }

      // Create radio slot request with tracks and documents
      const slotData = {
        ...formData,
        date: selectedDate,
        slot: selectedSlot,
        selected_tracks: selectedTracks,
        documents: docUrls,
        approval_status: 'pending',
      };

      toast({
        title: 'Radio Slot Requested',
        description: `Your 2-hour radio slot with ${selectedTracks.length} tracks and ${uploadedDocs.length} documents has been submitted for approval by gosat.`,
      });

      onOpenChange(false);
      onSuccess();
      setStep(1);
      setSelectedDate(undefined);
      setSelectedSlot('');
      setSelectedTracks([]);
      setUploadedDocs([]);
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
      <DialogContent className="glass-card bg-background/95 border-primary/20 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Schedule Radio Slot (2 Hours) - Step {step}/3
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
                  <strong>Note:</strong> In the next step, you'll be able to pre-load music tracks and documents for your show.
                </p>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="p-4 rounded-lg glass-panel space-y-2">
                <div className="flex items-center gap-2">
                  <Badge>Selected Slot</Badge>
                  <span className="font-semibold">
                    {selectedDate && format(selectedDate, 'MMMM d, yyyy')} •{' '}
                    {TIME_SLOTS.find((s) => s.id === selectedSlot)?.time}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formData.show_title} • {formData.genre}
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <Music className="h-4 w-4" />
                  Pre-load Music Tracks ({selectedTracks.length} selected)
                </Label>
                <div className="max-h-60 overflow-y-auto space-y-2 p-2 border rounded-lg glass-panel">
                  {availableTracks.map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-3 p-2 hover:bg-accent/50 rounded cursor-pointer"
                      onClick={() => toggleTrackSelection(track.id)}
                    >
                      <Checkbox
                        checked={selectedTracks.includes(track.id)}
                        onCheckedChange={() => toggleTrackSelection(track.id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{track.track_title}</p>
                        <p className="text-xs text-muted-foreground">
                          by {track.radio_djs?.dj_name || 'Unknown'} • {track.genre || 'No genre'}
                        </p>
                      </div>
                      {track.price && (
                        <Badge variant="outline" className="text-xs">
                          ${track.price}
                        </Badge>
                      )}
                    </div>
                  ))}
                  {availableTracks.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No public tracks available
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4" />
                  Upload Documents (PDFs, Word files for studies/readings)
                </Label>
                <div
                  {...getRootProps()}
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 glass-panel"
                >
                  <input {...getInputProps()} />
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drag & drop documents here, or click to select
                  </p>
                </div>
                {uploadedDocs.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {uploadedDocs.map((doc, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm p-2 bg-accent/50 rounded">
                        <FileText className="h-4 w-4" />
                        <span className="flex-1">{doc.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setUploadedDocs(prev => prev.filter((_, i) => i !== idx))}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 rounded-lg bg-info/10 border border-info/20">
                <p className="text-sm">
                  <strong>Bestowal Feature:</strong> Listeners can bestow on tracks and documents during your show.
                  You'll receive 1-on-1 notifications when listeners bestow on your content, and they'll receive invoices.
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
            <Button type="submit" disabled={loading || (step === 1 && (!selectedDate || !selectedSlot))}>
              {step < 3 ? 'Next' : loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
