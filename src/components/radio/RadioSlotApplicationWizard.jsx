import React, { useState, useEffect } from 'react';
import { WizardContainer } from '@/components/wizard/WizardContainer';
import { useGroveStation } from '@/hooks/useGroveStation';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { PermissiveInput, PermissiveTextarea } from '@/components/ui/permissive-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import DJMusicUpload from '@/components/radio/DJMusicUpload';
import { SegmentTimelineBuilder } from '@/components/radio/SegmentTimelineBuilder';
import { 
  Radio, 
  Calendar, 
  Upload, 
  DollarSign, 
  CheckCircle,
  Music,
  FileText,
  Clock,
  Plus,
  X,
  Megaphone,
  Mic,
  LayoutGrid
} from 'lucide-react';

const SHOW_CATEGORIES = [
  { value: 'music', label: 'Music' },
  { value: 'talk', label: 'Talk Show' },
  { value: 'educational', label: 'Educational' },
  { value: 'community', label: 'Community' },
  { value: 'news', label: 'News' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'spiritual', label: 'Spiritual' },
  { value: 'business', label: 'Business' },
  { value: 'live_call_in', label: 'Live Call-in' }
];

const TIME_SLOTS = Array.from({ length: 12 }, (_, i) => {
  const startHour = i * 2;
  const endHour = (i * 2) + 2;
  return {
    value: i,
    startHour,
    endHour,
    label: `${startHour.toString().padStart(2, '0')}:00 - ${endHour.toString().padStart(2, '0')}:00`,
  };
});

export function RadioSlotApplicationWizard({ onClose }) {
  const { createShow, scheduleShow, schedule, loading, userDJProfile } = useGroveStation();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form data for all steps
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    show_name: '',
    description: '',
    subject: '',
    topic_description: '',
    category: 'music',
    broadcast_mode: 'live', // 'live' or 'pre_recorded'
    
    // Step 2: Time Slot
    time_slot_date: new Date().toISOString().split('T')[0],
    slot_index: Math.floor(new Date().getHours() / 2),
    show_notes: '',
    
    // Step 3: Segment Timeline
    segments: [],
    
    // Step 4: Content (Documents & Playlists)
    documents: [],
    playlist_id: null,
    
    // Step 5: Monetization (Advertisements)
    enable_ads: false,
    ad_slots: [],
    ad_rate_per_slot: 50
  });

  const [playlists, setPlaylists] = useState([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [tracks, setTracks] = useState([]);

  // Fetch user's playlists and tracks
  useEffect(() => {
    const fetchPlaylistsAndTracks = async () => {
      if (!userDJProfile?.id) return;
      
      const { data: playlistData } = await supabase
        .from('dj_playlists')
        .select('*')
        .eq('dj_id', userDJProfile.id)
        .order('created_at', { ascending: false });
      
      if (playlistData) setPlaylists(playlistData);

      const { data: trackData } = await supabase
        .from('dj_music_tracks')
        .select('*')
        .eq('dj_id', userDJProfile.id)
        .order('created_at', { ascending: false });
      
      if (trackData) setTracks(trackData);
    };
    
    fetchPlaylistsAndTracks();
  }, [userDJProfile]);

  // Refetch tracks after upload
  const refreshTracks = async () => {
    if (!userDJProfile?.id) return;
    const { data: trackData } = await supabase
      .from('dj_music_tracks')
      .select('*')
      .eq('dj_id', userDJProfile.id)
      .order('created_at', { ascending: false });
    if (trackData) setTracks(trackData);
  };

  const steps = [
    {
      title: 'Basic Information',
      description: 'Tell us about your show and what listeners can expect',
      icon: <Radio className="h-5 w-5" />
    },
    {
      title: 'Select Time Slot',
      description: 'Choose when you want to broadcast your show',
      icon: <Calendar className="h-5 w-5" />
    },
    {
      title: 'Plan Your Segments',
      description: 'Design your 2-hour show with drag-and-drop segments',
      icon: <LayoutGrid className="h-5 w-5" />
    },
    {
      title: 'Prepare Content',
      description: 'Upload documents and select playlists for your show',
      icon: <Upload className="h-5 w-5" />
    },
    {
      title: 'Monetization Setup',
      description: 'Configure advertisement slots to earn from your show',
      icon: <DollarSign className="h-5 w-5" />
    },
    {
      title: 'Review & Submit',
      description: 'Review your application before submitting',
      icon: <CheckCircle className="h-5 w-5" />
    }
  ];

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDocumentUpload = async (event) => {
    const files = Array.from(event.target.files);
    setUploadingDoc(true);

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const filePath = `radio-docs/${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('radio_documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('radio_documents')
          .getPublicUrl(filePath);

        setFormData(prev => ({
          ...prev,
          documents: [...prev.documents, {
            name: file.name,
            url: publicUrl,
            path: filePath,
            size: file.size
          }]
        }));
      }

      toast({
        title: "Success",
        description: `${files.length} document(s) uploaded successfully`,
      });
    } catch (error) {
      console.error('Error uploading documents:', error);
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploadingDoc(false);
    }
  };

  const removeDocument = (index) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
  };

  const addAdSlot = () => {
    setFormData(prev => ({
      ...prev,
      ad_slots: [...prev.ad_slots, {
        id: Date.now(),
        duration_seconds: 30,
        position: 'mid_show',
        description: ''
      }]
    }));
  };

  const removeAdSlot = (id) => {
    setFormData(prev => ({
      ...prev,
      ad_slots: prev.ad_slots.filter(slot => slot.id !== id)
    }));
  };

  const updateAdSlot = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      ad_slots: prev.ad_slots.map(slot => 
        slot.id === id ? { ...slot, [field]: value } : slot
      )
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Create the show
      const showResult = await createShow({
        show_name: formData.show_name,
        description: formData.description,
        subject: formData.subject,
        topic_description: formData.topic_description,
        category: formData.category
      });

      if (!showResult.success) throw new Error('Failed to create show');

      // Schedule the show
      const slot = TIME_SLOTS.find(s => s.value === formData.slot_index);
      const date = new Date(formData.time_slot_date);
      const startTime = new Date(date);
      startTime.setHours(slot.startHour, 0, 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setHours(slot.endHour, 0, 0, 0);

      const scheduleResult = await scheduleShow({
        show_id: showResult.data.id,
        hour_slot: slot.startHour,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        time_slot_date: formData.time_slot_date,
        show_notes: formData.show_notes,
        broadcast_mode: formData.broadcast_mode,
        playlist_id: formData.broadcast_mode === 'pre_recorded' ? formData.playlist_id : null
      });

      if (!scheduleResult.success) throw new Error('Failed to schedule show');

      // Store documents metadata (if any)
      if (formData.documents.length > 0) {
        const { error: docError } = await supabase
          .from('radio_show_documents')
          .insert(
            formData.documents.map(doc => ({
              schedule_id: scheduleResult.data.id,
              file_name: doc.name,
              file_path: doc.path,
              file_size: doc.size,
              uploader_id: user.id
            }))
          );

        if (docError) console.error('Error saving documents:', docError);
      }

      // Store ad slots (if enabled)
      if (formData.enable_ads && formData.ad_slots.length > 0) {
        const { error: adError } = await supabase
          .from('radio_ad_slots')
          .insert(
            formData.ad_slots.map(slot => ({
              schedule_id: scheduleResult.data.id,
              duration_seconds: slot.duration_seconds,
              position: slot.position,
              description: slot.description,
              rate: formData.ad_rate_per_slot,
              status: 'available'
            }))
          );

        if (adError) console.error('Error saving ad slots:', adError);
      }

      toast({
        title: "Success!",
        description: "Your radio slot application has been submitted for approval",
      });

      onClose();
      navigate('/radio-management');
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.show_name.trim() && formData.subject.trim() && formData.broadcast_mode;
      case 1:
        return true;
      case 2:
        // Segment step - at least 1 segment recommended but not required
        return true;
      case 3:
        // Pre-recorded mode requires a playlist
        if (formData.broadcast_mode === 'pre_recorded' && !formData.playlist_id) return false;
        return true;
      case 4:
        return !formData.enable_ads || formData.ad_slots.length > 0;
      case 5:
        return true;
      default:
        return true;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="show_name">Show Name *</Label>
              <PermissiveInput
                id="show_name"
                placeholder="e.g., Morning Grove Mix, Love & Light?!"
                value={formData.show_name}
                onChange={(e) => handleFieldChange('show_name', e.target.value)}
                maxLength={100}
              />
            </div>

            <div>
              <Label htmlFor="subject">Subject/Topic *</Label>
              <PermissiveInput
                id="subject"
                placeholder="e.g., Love & Relationships, Business Growth!"
                value={formData.subject}
                onChange={(e) => handleFieldChange('subject', e.target.value)}
                maxLength={100}
              />
            </div>


            <div>
              <Label htmlFor="description">Description</Label>
              <PermissiveTextarea
                id="description"
                placeholder="What can listeners expect from your show? Use any characters you like!"
                value={formData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                maxLength={500}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="topic_description">Episode Topic Details</Label>
              <PermissiveTextarea
                id="topic_description"
                placeholder="Describe what this specific episode will cover... (special characters allowed!)"
                value={formData.topic_description}
                onChange={(e) => handleFieldChange('topic_description', e.target.value)}
                maxLength={500}
                rows={3}
              />
            </div>

            {/* Broadcast Mode */}
            <div>
              <Label className="mb-3 block">Broadcast Mode *</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={formData.broadcast_mode === 'live' ? 'default' : 'outline'}
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => handleFieldChange('broadcast_mode', 'live')}
                >
                  <Mic className="h-6 w-6" />
                  <span className="font-semibold">Go Live</span>
                  <span className="text-xs opacity-70">Broadcast in real-time</span>
                </Button>
                <Button
                  type="button"
                  variant={formData.broadcast_mode === 'pre_recorded' ? 'default' : 'outline'}
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => handleFieldChange('broadcast_mode', 'pre_recorded')}
                >
                  <Music className="h-6 w-6" />
                  <span className="font-semibold">Pre-Recorded</span>
                  <span className="text-xs opacity-70">Auto-play uploaded audio</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {formData.broadcast_mode === 'live' 
                  ? 'You will broadcast live during your slot. You can still play music from your playlist.'
                  : 'Your uploaded tracks/playlist will auto-play during the slot. No need to be online.'}
              </p>
            </div>
          </div>
        );

      case 1:
        const availableSlots = TIME_SLOTS.filter(slot => {
          const bookedSlots = schedule
            .filter(s => s.schedule_id && s.time_slot_date === formData.time_slot_date)
            .map(s => Math.floor(s.hour_slot / 2));
          return !bookedSlots.includes(slot.value);
        });

        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="date">Broadcast Date *</Label>
              <SecureInput
                id="date"
                type="date"
                value={formData.time_slot_date}
                onChange={(e) => handleFieldChange('time_slot_date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <Label>Available 2-Hour Slots</Label>
              <p className="text-sm text-muted-foreground mb-3">
                {availableSlots.length} slots available
              </p>
              
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot.value}
                    type="button"
                    variant={formData.slot_index === slot.value ? "default" : "outline"}
                    className="justify-start h-auto py-3"
                    onClick={() => handleFieldChange('slot_index', slot.value)}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    {slot.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="show_notes">Show Notes (Optional)</Label>
              <PermissiveTextarea
                id="show_notes"
                placeholder="Any special notes about this show... (all characters allowed)"
                value={formData.show_notes}
                onChange={(e) => handleFieldChange('show_notes', e.target.value)}
                maxLength={300}
                rows={2}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <SegmentTimelineBuilder
              segments={formData.segments}
              onSegmentsChange={(segments) => handleFieldChange('segments', segments)}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {/* Documents Section */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4" />
                Show Documents
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Upload scripts, notes, or any documents you'll reference during the show
              </p>
              
              <Input
                type="file"
                multiple
                onChange={handleDocumentUpload}
                disabled={uploadingDoc}
                accept=".pdf,.doc,.docx,.txt"
                className="mb-3"
              />

              {formData.documents.length > 0 && (
                <div className="space-y-2">
                  {formData.documents.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">{doc.name}</span>
                        <Badge variant="outline">
                          {(doc.size / 1024).toFixed(1)} KB
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDocument(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Playlist & Music Selection */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2 mb-3">
                <Music className="h-4 w-4" />
                Music for Your Show
              </Label>
              {formData.broadcast_mode === 'pre_recorded' ? (
                <div className="p-3 bg-primary/10 border-l-4 border-primary rounded text-sm mb-3">
                  <strong>Pre-recorded mode:</strong> A playlist is required. Your tracks will auto-play during your slot.
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-3">
                  Select a playlist or upload tracks you want to play during your show
                </p>
              )}

              {/* Playlist Selector */}
              <div>
                <Label className="text-sm mb-2">Choose Playlist</Label>
                <Select 
                  value={formData.playlist_id ?? 'none'} 
                  onValueChange={(value) => handleFieldChange('playlist_id', value === 'none' ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a playlist..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No playlist</SelectItem>
                    {playlists.map((playlist) => (
                      <SelectItem key={playlist.id} value={playlist.id}>
                        {playlist.playlist_name} ({playlist.track_count} tracks)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Music Upload */}
              <div className="border-t pt-4">
                <Label className="text-sm mb-2">Or Upload Tracks</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Upload individual tracks to play during your slot
                </p>
                <DJMusicUpload 
                  trigger={
                    <Button type="button" variant="outline" className="w-full">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Music Track
                    </Button>
                  }
                />
                {tracks.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-2">
                      Your uploaded tracks ({tracks.length})
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {tracks.slice(0, 5).map((track) => (
                        <div key={track.id} className="flex items-center gap-2 text-xs p-2 bg-muted rounded">
                          <Music className="h-3 w-3" />
                          <span className="truncate">{track.track_title}</span>
                        </div>
                      ))}
                      {tracks.length > 5 && (
                        <p className="text-xs text-muted-foreground pl-5">
                          +{tracks.length - 5} more tracks
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Checkbox
                id="enable_ads"
                checked={formData.enable_ads}
                onCheckedChange={(checked) => handleFieldChange('enable_ads', checked)}
              />
              <Label htmlFor="enable_ads" className="cursor-pointer">
                Enable advertisement slots to monetize your show
              </Label>
            </div>

            {formData.enable_ads && (
              <>
                <div>
                  <Label htmlFor="ad_rate">Rate Per Ad Slot (USD)</Label>
                  <Input
                    id="ad_rate"
                    type="number"
                    min="10"
                    max="500"
                    value={formData.ad_rate_per_slot}
                    onChange={(e) => handleFieldChange('ad_rate_per_slot', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    How much advertisers will pay per slot
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="flex items-center gap-2">
                      <Megaphone className="h-4 w-4" />
                      Advertisement Slots
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addAdSlot}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Slot
                    </Button>
                  </div>

                  {formData.ad_slots.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground bg-muted rounded-lg">
                      No ad slots added yet. Click "Add Slot" to create one.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.ad_slots.map((slot, index) => (
                        <div key={slot.id} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge>Slot {index + 1}</Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAdSlot(slot.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Duration (seconds)</Label>
                              <Input
                                type="number"
                                min="15"
                                max="60"
                                value={slot.duration_seconds}
                                onChange={(e) => updateAdSlot(slot.id, 'duration_seconds', parseInt(e.target.value))}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Position</Label>
                              <Select
                                value={slot.position}
                                onValueChange={(value) => updateAdSlot(slot.id, 'position', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pre_show">Pre-Show</SelectItem>
                                  <SelectItem value="mid_show">Mid-Show</SelectItem>
                                  <SelectItem value="post_show">Post-Show</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs">Description</Label>
                            <PermissiveTextarea
                              placeholder="What type of ads fit here? (all characters allowed)"
                              value={slot.description}
                              onChange={(e) => updateAdSlot(slot.id, 'description', e.target.value)}
                              rows={2}
                              maxLength={200}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {formData.ad_slots.length > 0 && (
                    <div className="p-4 bg-primary/10 rounded-lg mt-4">
                      <p className="text-sm font-medium">
                        Potential Earnings: ${formData.ad_slots.length * formData.ad_rate_per_slot}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Based on {formData.ad_slots.length} slot(s) at ${formData.ad_rate_per_slot} each
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );

      case 5:
        const selectedSlot = TIME_SLOTS.find(s => s.value === formData.slot_index);
        return (
          <div className="space-y-6">
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <h3 className="font-semibold text-lg">{formData.show_name}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Subject:</span>
                  <p className="font-medium">{formData.subject}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p className="font-medium">{formData.time_slot_date}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Time:</span>
                  <p className="font-medium">{selectedSlot?.label}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Broadcast Mode:</span>
                  <p className="font-medium">
                    {formData.broadcast_mode === 'live' ? '🎙️ Live' : '🎵 Pre-Recorded'}
                  </p>
                </div>
              </div>
              
              {formData.description && (
                <div>
                  <span className="text-muted-foreground text-sm">Description:</span>
                  <p className="text-sm mt-1">{formData.description}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 bg-card border rounded-lg text-center">
                <LayoutGrid className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{formData.segments.length}</p>
                <p className="text-xs text-muted-foreground">Segments</p>
              </div>
              <div className="p-3 bg-card border rounded-lg text-center">
                <FileText className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{formData.documents.length}</p>
                <p className="text-xs text-muted-foreground">Documents</p>
              </div>
              <div className="p-3 bg-card border rounded-lg text-center">
                <Music className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{formData.playlist_id ? '1' : '0'}</p>
                <p className="text-xs text-muted-foreground">Playlist</p>
              </div>
              <div className="p-3 bg-card border rounded-lg text-center">
                <Megaphone className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{formData.ad_slots.length}</p>
                <p className="text-xs text-muted-foreground">Ad Slots</p>
              </div>
            </div>

            <div className="p-4 bg-primary/10 border-l-4 border-primary rounded">
              <h4 className="font-semibold mb-2">Ready to Submit!</h4>
              <p className="text-sm text-muted-foreground">
                Your application will be reviewed by our team. You'll receive a notification once it's approved.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <WizardContainer
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      title="Apply for Radio Time Slot"
      description="Follow these steps to set up your radio show application"
      onCancel={onClose}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      canGoNext={canProceed()}
      submitLabel="Submit Application"
    >
      {renderStepContent()}
    </WizardContainer>
  );
}
