/**
 * AdminAttachCoversPage
 *
 * Admin/sower tool to fix the "orphan music covers" problem:
 *   - Davison (and any sower) generated AI cover-art images that landed in the
 *     `orchard-images` storage bucket but were never linked to a specific
 *     `dj_music_tracks` row (so the feed shows tracks with no cover).
 *
 * This page lets an admin (or the track owner) browse uncovered tracks on the
 * left, browse the orphan images for that user on the right, and click a
 * cover image to attach it to a track via UPDATE on `dj_music_tracks.cover_image_url`.
 *
 * Route: /admin/attach-covers
 */
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Music, Image as ImageIcon, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STORAGE_BASE = `${import.meta.env.VITE_SUPABASE_URL || 'https://zuwkgasbkpjlxzsjzumu.supabase.co'}/storage/v1/object/public`;

interface Track {
  id: string;
  track_title: string;
  artist_name: string | null;
  cover_image_url: string | null;
  upload_date: string | null;
  dj_id: string;
  dj_user_id: string;
  dj_name: string | null;
}

interface OrphanImage {
  bucket: string;
  path: string;
  url: string;
  created_at: string;
}

export default function AdminAttachCoversPage() {
  const { user } = useAuth();
  const { isAdminOrGosat } = useRoles();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [images, setImages] = useState<OrphanImage[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [filterUserId, setFilterUserId] = useState<string | null>(null);
  const [showOnlyMissing, setShowOnlyMissing] = useState(true);

  const canManage = !!isAdminOrGosat;

  // Load all tracks (admins) or only my own tracks (sower)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      setLoading(true);
      try {
        const trackQ = supabase
          .from('dj_music_tracks')
          .select('id, track_title, artist_name, cover_image_url, upload_date, dj_id, radio_djs!inner(id, user_id, dj_name)')
          .order('upload_date', { ascending: false });

        const { data: trackRows, error: trackErr } = canManage
          ? await trackQ
          : await trackQ.eq('radio_djs.user_id', user.id);
        if (trackErr) throw trackErr;

        if (cancelled) return;
        const ts: Track[] = (trackRows || []).map((t: any) => ({
          id: t.id,
          track_title: t.track_title,
          artist_name: t.artist_name,
          cover_image_url: t.cover_image_url,
          upload_date: t.upload_date,
          dj_id: t.dj_id,
          dj_user_id: t.radio_djs?.user_id,
          dj_name: t.radio_djs?.dj_name || null,
        }));
        setTracks(ts);

        // Default user filter = first track owner (or current user)
        if (!filterUserId) {
          setFilterUserId(canManage ? (ts[0]?.dj_user_id || user.id) : user.id);
        }
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load tracks');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, canManage]);

  // Load orphan images for the filtered user
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!filterUserId) return;
      try {
        // List images from orchard-images bucket under user folder
        const { data: imgList, error: imgErr } = await supabase.storage
          .from('orchard-images')
          .list(`${filterUserId}/images`, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });
        if (imgErr) throw imgErr;

        // Also check root user folder (older uploads went there)
        const { data: imgListRoot } = await supabase.storage
          .from('orchard-images')
          .list(filterUserId, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });

        const fromImages: OrphanImage[] = (imgList || [])
          .filter((o) => o.name && /\.(png|jpe?g|webp)$/i.test(o.name))
          .map((o) => ({
            bucket: 'orchard-images',
            path: `${filterUserId}/images/${o.name}`,
            url: `${STORAGE_BASE}/orchard-images/${filterUserId}/images/${o.name}`,
            created_at: o.created_at || '',
          }));

        const fromRoot: OrphanImage[] = (imgListRoot || [])
          .filter((o) => o.name && /\.(png|jpe?g|webp)$/i.test(o.name))
          .map((o) => ({
            bucket: 'orchard-images',
            path: `${filterUserId}/${o.name}`,
            url: `${STORAGE_BASE}/orchard-images/${filterUserId}/${o.name}`,
            created_at: o.created_at || '',
          }));

        if (!cancelled) setImages([...fromImages, ...fromRoot]);
      } catch (e: any) {
        if (!cancelled) setImages([]);
        console.warn('[attach-covers] image list failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, [filterUserId]);

  const userOptions = useMemo(() => {
    const map = new Map<string, string>();
    tracks.forEach((t) => {
      if (t.dj_user_id) map.set(t.dj_user_id, t.dj_name || t.dj_user_id.slice(0, 8));
    });
    return Array.from(map.entries()).map(([uid, name]) => ({ uid, name }));
  }, [tracks]);

  const visibleTracks = useMemo(() => {
    let list = tracks;
    if (filterUserId) list = list.filter((t) => t.dj_user_id === filterUserId);
    if (showOnlyMissing) list = list.filter((t) => !t.cover_image_url);
    return list;
  }, [tracks, filterUserId, showOnlyMissing]);

  const attach = async (trackId: string, imageUrl: string) => {
    setSaving(trackId);
    try {
      const { error } = await supabase
        .from('dj_music_tracks')
        .update({ cover_image_url: imageUrl })
        .eq('id', trackId);
      if (error) throw error;
      setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, cover_image_url: imageUrl } : t)));
      toast.success('Cover attached');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to attach cover');
    } finally {
      setSaving(null);
    }
  };

  const clear = async (trackId: string) => {
    setSaving(trackId);
    try {
      const { error } = await supabase
        .from('dj_music_tracks')
        .update({ cover_image_url: null })
        .eq('id', trackId);
      if (error) throw error;
      setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, cover_image_url: null } : t)));
      toast.success('Cover removed');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to remove cover');
    } finally {
      setSaving(null);
    }
  };

  if (!user) {
    return <div className="container mx-auto p-8 text-center text-muted-foreground">Please log in.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ImageIcon className="h-6 w-6 text-primary" />
          Attach Cover Art to Music
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Click an image on the right, then click <strong>Attach</strong> on the track you want to cover.
          {canManage && ' (Admin: showing all sowers.)'}
        </p>
      </header>

      {/* Sower selector */}
      {canManage && userOptions.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground">Sower:</span>
          {userOptions.map((u) => (
            <Button
              key={u.uid}
              variant={filterUserId === u.uid ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setFilterUserId(u.uid); setSelectedTrackId(null); }}
            >
              {u.name}
            </Button>
          ))}
        </div>
      )}

      <div className="mb-3 flex items-center gap-3">
        <label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={showOnlyMissing}
            onChange={(e) => setShowOnlyMissing(e.target.checked)}
          />
          Only show tracks without a cover
        </label>
        <Badge variant="secondary">{visibleTracks.length} tracks</Badge>
        <Badge variant="secondary">{images.length} images available</Badge>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tracks column */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Music className="h-4 w-4" /> Tracks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[70vh] overflow-y-auto">
              {visibleTracks.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No tracks {showOnlyMissing ? 'missing covers' : 'found'} for this sower.
                </div>
              ) : visibleTracks.map((t) => (
                <div
                  key={t.id}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-lg border transition-colors',
                    selectedTrackId === t.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                  )}
                  onClick={() => setSelectedTrackId(t.id)}
                >
                  <div className="h-12 w-12 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {t.cover_image_url ? (
                      <img src={t.cover_image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Music className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{t.track_title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {t.artist_name || t.dj_name || 'Unknown artist'}
                    </div>
                  </div>
                  {t.cover_image_url ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); clear(t.id); }}
                      disabled={saving === t.id}
                    >
                      {saving === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                      <span className="ml-1 text-xs">Clear</span>
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-xs">No cover</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Images column */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ImageIcon className="h-4 w-4" /> Available cover images
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[70vh] overflow-y-auto">
              {images.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No orphan images found in this sower's <code>orchard-images</code> folder.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {images.map((img) => (
                    <div key={img.path} className="relative group rounded-lg overflow-hidden border border-border">
                      <img
                        src={img.url}
                        alt={img.path}
                        className="w-full aspect-square object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                        <Button
                          size="sm"
                          disabled={!selectedTrackId || saving === selectedTrackId}
                          onClick={() => selectedTrackId && attach(selectedTrackId, img.url)}
                        >
                          {saving === selectedTrackId ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          )}
                          {selectedTrackId ? 'Attach' : 'Pick a track'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
