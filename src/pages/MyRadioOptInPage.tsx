import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Radio, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Track {
  id: string;
  track_title: string;
  artist_name: string | null;
  radio_eligible: boolean;
}

export default function MyRadioOptInPage() {
  const { user } = useAuth() as any;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: dj } = await supabase
        .from("radio_djs")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!dj) { setLoading(false); return; }
      const { data, error } = await supabase
        .from("dj_music_tracks")
        .select("id, track_title, artist_name, radio_eligible")
        .eq("dj_id", dj.id)
        .order("upload_date", { ascending: false });
      if (error) toast.error(error.message);
      else setTracks((data ?? []) as Track[]);
      setLoading(false);
    })();
  }, [user]);

  const toggle = async (t: Track) => {
    setSaving(t.id);
    const next = !t.radio_eligible;
    const { error } = await supabase
      .from("dj_music_tracks")
      .update({ radio_eligible: next, radio_opted_in_at: new Date().toISOString() })
      .eq("id", t.id);
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    setTracks((prev) => prev.map((x) => x.id === t.id ? { ...x, radio_eligible: next } : x));
  };

  if (!user) {
    return <main className="min-h-screen p-8 text-center text-slate-300">Sign in to manage your radio list.</main>;
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container max-w-2xl mx-auto p-4 sm:p-6">
        <Link to="/dashboard" className="inline-flex items-center gap-2 mb-5 text-xs uppercase tracking-wider text-emerald-400/80 hover:text-emerald-300">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Radio className="h-7 w-7 text-emerald-400" /> My Radio List
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Tick each of your sown tracks that community radio hosts may include in their playlists.
          Untick any time to pull a track from the radio pool.
        </p>

        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : tracks.length === 0 ? (
          <p className="text-sm text-muted-foreground">You haven't sown any music tracks yet.</p>
        ) : (
          <ul className="space-y-2">
            {tracks.map((t) => (
              <li key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                <div className="min-w-0">
                  <div className="font-medium truncate">{t.track_title}</div>
                  {t.artist_name && <div className="text-xs text-muted-foreground truncate">{t.artist_name}</div>}
                </div>
                <label className="flex items-center gap-2 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={t.radio_eligible}
                    disabled={saving === t.id}
                    onChange={() => toggle(t)}
                    className="h-4 w-4 accent-emerald-500"
                  />
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t.radio_eligible ? "On radio" : "Off"}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
