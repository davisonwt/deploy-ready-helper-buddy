import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface FollowedMember {
  user_id: string;
  username: string;
  displayName: string | null;
  front_image_path: string;
}

/**
 * "Following" hotspot sheet (src/pages/MyTribePage.tsx) -- members the
 * viewer follows (public.followers) who have a published stall, each
 * shown by their stall's own front image. Tap -> /stall/<username>, same
 * as tapping a card in the Tribal Gardens feed. A followed member with
 * no stall yet just doesn't have a card here -- there's nothing to show
 * for them (no /profile/:userId fallback in this flow, matching
 * FLOW-V2-ORPHANS.md's DELETE call on that route).
 */
export default function TribeFollowingSheetContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<FollowedMember[] | null>(null);

  useEffect(() => {
    if (!user) { setMembers([]); return; }
    let alive = true;
    (async () => {
      const { data: followRows } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', user.id);
      const followingIds = ((followRows ?? []) as { following_id: string }[]).map((r) => r.following_id);
      if (followingIds.length === 0) { if (alive) setMembers([]); return; }

      const { data: stallRows } = await supabase
        .from('stalls')
        .select('user_id, name, front_image_path')
        .in('user_id', followingIds)
        .eq('published', true);
      const stalls = (stallRows ?? []) as { user_id: string; name: string; front_image_path: string }[];
      if (stalls.length === 0) { if (alive) setMembers([]); return; }

      const { data: profileRows } = await supabase
        .from('public_profiles' as any)
        .select('user_id, username, display_name')
        .in('user_id', stalls.map((s) => s.user_id));
      const profileByOwner = new Map(
        ((profileRows ?? []) as { user_id: string; username: string | null; display_name: string | null }[])
          .filter((p) => !!p.username)
          .map((p) => [p.user_id, p]),
      );

      const list = stalls
        .map((s) => {
          const p = profileByOwner.get(s.user_id);
          if (!p?.username) return null;
          return { user_id: s.user_id, username: p.username, displayName: p.display_name, front_image_path: s.front_image_path };
        })
        .filter((m): m is FollowedMember => !!m);
      if (alive) setMembers(list);
    })();
    return () => { alive = false; };
  }, [user]);

  if (members === null) {
    return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-amber-100/40" /></div>;
  }
  if (members.length === 0) {
    return <p className="text-amber-100/50 font-serif italic text-center py-12">Not following anyone with a stall yet.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {members.map((m) => (
        <button
          key={m.user_id}
          type="button"
          onClick={() => navigate(`/stall/${m.username}`)}
          className="relative aspect-square rounded-lg overflow-hidden border border-amber-500/20 hover:border-amber-400/50 transition-colors"
        >
          <img src={m.front_image_path} alt={m.displayName ?? m.username} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2 py-1.5">
            <p className="text-xs font-semibold text-white truncate">{m.displayName ?? m.username}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
