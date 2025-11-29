import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/lib/queryPersistence';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Music, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AudioSnippetPlayer } from '@/components/radio/AudioSnippetPlayer';

interface MusicTrack {
  id: string;
  track_title: string;
  artist_name?: string;
  duration_seconds?: number;
  file_url?: string;
  is_original: boolean;
}

interface Sower {
  id: string;
  dj_name: string;
  dj_music_tracks?: MusicTrack[];
}

export default function RadioGenerator() {
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const { data: sowers } = useQuery({
    queryKey: ['sowers-with-tracks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('radio_djs')
        .select(`
          *,
          dj_music_tracks!inner(*)
        `)
        .eq('dj_music_tracks.is_original', true);
      
      if (error) throw error;
      return data;
    },
  });

  const processFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum 10MB.');
      return;
    }

    if (!file.type.includes('audio/mpeg') && !file.type.includes('audio/mp3')) {
      toast.error('Only MP3 files are supported');
      return;
    }

    try {
      setUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('music-tracks')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('music-tracks')
        .getPublicUrl(filePath);

      const { data: djProfile } = await supabase
        .from('radio_djs')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!djProfile) throw new Error('DJ profile not found');

      const { error: insertError } = await supabase
        .from('dj_music_tracks')
        .insert({
          dj_id: djProfile.id,
          track_title: file.name.replace('.mp3', ''),
          file_url: publicUrl,
          is_original: true,
          track_type: 'music',
        });

      if (insertError) throw insertError;

      // Award XP for uploading music (100 XP)
      await supabase import already exists)
      await supabase.rpc('add_xp_to_current_user', { amount: 100 }).catch((err) => {
        console.error('Failed to award XP:', err);
        // Don't fail the upload if XP award fails
      });

      toast.success('Track uploaded successfully!');
      setPendingFile(null);
      setConfirmed(false);
      await queryClient.invalidateQueries({ queryKey: ['sowers-with-tracks'] });
    } catch (error: unknown) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload track';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirmed) {
      setPendingFile(file);
      setShowDisclaimer(true);
      return;
    }

    await processFile(file);
    e.target.value = '';
  };

  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;

    if (!confirmed) {
      setPendingFile(file);
      setShowDisclaimer(true);
      return;
    }

    await processFile(file);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const handleGenerateSlot = async () => {
    if (selectedTracks.length < 3) {
      toast.error('Select at least 3 tracks for a 30-minute slot');
      return;
    }

    if (selectedTracks.length > 5) {
      toast.error('Maximum 5 tracks per slot');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's DJ profile
      const { data: djProfile } = await supabase
        .from('radio_djs')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!djProfile) throw new Error('DJ profile not found');

      // TODO: Create radio schedule entry with selected tracks
      toast.success('Radio slot generated! Check your schedule.');
      setSelectedTracks([]);
    } catch (error: unknown) {
      console.error('Generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate slot';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Radio Slot Generator</h1>
        <p className="text-muted-foreground">
          Create your 30-minute radio slot with original music
        </p>
      </div>

      <Tabs defaultValue="browse" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="browse">Browse Sower Music</TabsTrigger>
          <TabsTrigger value="upload">Upload Original</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Tracks (3-5)</CardTitle>
              <CardDescription>
                Choose tracks from original music creators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {sowers?.map((sower: Sower) => (
                  <AccordionItem key={sower.id} value={sower.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Music className="h-4 w-4" />
                        {sower.dj_name} ({sower.dj_music_tracks?.length || 0} tracks)
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        {sower.dj_music_tracks?.map((track: MusicTrack) => (
                          <div key={track.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-3 flex-1">
                              <Checkbox
                                checked={selectedTracks.includes(track.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedTracks([...selectedTracks, track.id]);
                                  } else {
                                    setSelectedTracks(selectedTracks.filter(id => id !== track.id));
                                  }
                                }}
                              />
                              <div className="flex-1">
                                <p className="font-medium">{track.track_title}</p>
                                <p className="text-sm text-muted-foreground">{track.artist_name}</p>
                              </div>
                            </div>
                            <AudioSnippetPlayer fileUrl={track.file_url} />
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              <div className="mt-6 flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedTracks.length} / 5 tracks
                </p>
                <Button
                  onClick={handleGenerateSlot}
                  disabled={selectedTracks.length < 3 || selectedTracks.length > 5}
                >
                  Generate 30-Min Slot
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload Original Music</CardTitle>
              <CardDescription>
                Upload your own original tracks (MP3, max 10MB)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging ? 'border-primary' : 'border-primary/20 hover:border-primary/40'}`}
                onDragOver={onDragOver}
                onDragEnter={onDragEnter}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <p className="text-lg font-medium mb-2">Click to upload or drag and drop</p>
                  <p className="text-sm text-muted-foreground">MP3 files only, max 10MB</p>
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".mp3,audio/mpeg"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </div>

              {uploading && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showDisclaimer} onOpenChange={setShowDisclaimer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Originality Confirmation
            </DialogTitle>
            <DialogDescription className="space-y-4 pt-4">
              <p className="font-medium">
                By uploading this track, you confirm that:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>This is 100% original music created by you</li>
                <li>No mainstream samples or copyrighted material is used</li>
                <li>You own all rights to this recording</li>
                <li>You understand that violating copyright may result in removal</li>
              </ul>
              <div className="flex items-center gap-2 pt-4">
                <Checkbox
                  checked={confirmed}
                  onCheckedChange={(checked) => setConfirmed(checked as boolean)}
                />
                <label className="text-sm font-medium">
                  I confirm this is original music
                </label>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDisclaimer(false);
                    setConfirmed(false);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    setShowDisclaimer(false);
                    if (pendingFile) {
                      await processFile(pendingFile);
                      setPendingFile(null);
                    } else {
                      document.getElementById('file-upload')?.click();
                    }
                  }}
                  disabled={!confirmed}
                  className="flex-1"
                >
                  Confirm & Upload
                </Button>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
