import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface EditTrackModalProps {
  track: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditTrackModal({ track, isOpen, onClose, onSuccess }: EditTrackModalProps) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    track_title: track?.track_title || '',
    artist_name: track?.artist_name || '',
    genre: track?.genre || '',
    wallet_address: track?.wallet_address || '',
    bestow: track?.price || 2.0,
  });
  const [artistImage, setArtistImage] = useState<string>(track?.profiles?.avatar_url || '');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${track.id}-artist-${Date.now()}.${fileExt}`;
      const filePath = `artist-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('music-tracks')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('music-tracks')
        .getPublicUrl(filePath);

      setArtistImage(urlData.publicUrl);
      toast.success('Artist image uploaded!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Check if it's an album (from track.tags)
      const isAlbum = track.tags?.some((tag: string) => 
        tag.toLowerCase().includes('album') || 
        tag.toLowerCase().includes('lp') || 
        tag.toLowerCase().includes('ep')
      ) || false;

      // Validate: Single tracks must have minimum 2 USDC
      if (!isAlbum && formData.bestow < 2.00) {
        toast.error('Single music tracks require minimum 2 USDC');
        setSaving(false);
        return;
      }

      // Update the track
      const { error: trackError } = await supabase
        .from('dj_music_tracks')
        .update({
          track_title: formData.track_title,
          artist_name: formData.artist_name,
          genre: formData.genre,
          wallet_address: formData.wallet_address,
          price: formData.bestow,
        })
        .eq('id', track.id);

      if (trackError) throw trackError;

      // If artist image was uploaded and we have DJ info, update the profile
      if (artistImage && track.radio_djs?.user_id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ avatar_url: artistImage })
          .eq('id', track.radio_djs.user_id);

        if (profileError) {
          console.warn('Failed to update profile avatar:', profileError);
        }
      }

      toast.success('Track updated successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('Failed to update track: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Track Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Artist Image Upload */}
          <div className="space-y-2">
            <Label>Artist/Album Image</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={artistImage} />
                <AvatarFallback className="bg-primary/10 text-2xl">
                  {formData.artist_name?.charAt(0) || 'M'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Upload an artist photo or album cover (max 5MB)
                </p>
              </div>
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </div>

          {/* Track Title */}
          <div className="space-y-2">
            <Label htmlFor="track_title">Track Title *</Label>
            <Input
              id="track_title"
              value={formData.track_title}
              onChange={(e) => setFormData({ ...formData, track_title: e.target.value })}
              placeholder="Song name"
            />
          </div>

          {/* Artist Name */}
          <div className="space-y-2">
            <Label htmlFor="artist_name">Artist Name *</Label>
            <Input
              id="artist_name"
              value={formData.artist_name}
              onChange={(e) => setFormData({ ...formData, artist_name: e.target.value })}
              placeholder="Artist or band name"
            />
          </div>

          {/* Genre */}
          <div className="space-y-2">
            <Label htmlFor="genre">Genre</Label>
            <Input
              id="genre"
              value={formData.genre}
              onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
              placeholder="e.g., Pop, Rock, Jazz, Gospel"
            />
          </div>

          {/* Wallet Address */}
          <div className="space-y-2">
            <Label htmlFor="wallet_address">Wallet Address (for payments)</Label>
            <Input
              id="wallet_address"
              value={formData.wallet_address}
              onChange={(e) => setFormData({ ...formData, wallet_address: e.target.value })}
              placeholder="Your crypto wallet address"
            />
            <p className="text-xs text-muted-foreground">
              Enter your wallet address to receive payments from music purchases
            </p>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price">
              Price (USDC) *
              <span className="text-yellow-500 ml-2">(Minimum: 2 USDC for single tracks)</span>
            </Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="2.00"
              value={formData.bestow}
              onChange={(e) => {
                const newBestow = parseFloat(e.target.value) || 0;
                // Check if it's a single track (not album)
                const isAlbum = track?.tags?.some((tag: string) => 
                  tag.toLowerCase().includes('album') || 
                  tag.toLowerCase().includes('lp') || 
                  tag.toLowerCase().includes('ep')
                ) || false;
                
                if (!isAlbum && newBestow > 0 && newBestow < 2.00) {
                  toast.error('Single music tracks require minimum 2 USDC');
                  setFormData({ ...formData, bestow: 2.00 });
                } else {
                  setFormData({ ...formData, bestow: newBestow });
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Single tracks: Minimum 2 USDC (includes 10% tithing + 5% admin fee). Albums can have custom prices.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.track_title || !formData.artist_name}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
