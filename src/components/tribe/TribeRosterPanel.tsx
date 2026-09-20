import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatAppDate } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Store, ChevronDown, ChevronUp, Users } from "lucide-react";
import SignedImg from "@/components/media/SignedImg";

/**
 * The tribe page's own member roster, docked to the page face itself --
 * not hidden behind the "Invite" hotspot's sheet
 * (TribeInviteSheetContent.tsx, which shows the same members for a
 * different purpose: inviting). Same source and same depth=1 filter as
 * the My Tribe nav badge (get_nav_counts()), so this panel's count can't
 * structurally drift from the badge -- a member with no published stall
 * still renders as a plain row (guarded by stallUsernames.has, not
 * assumed).
 */
export default function TribeRosterPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Collapsed by default: expanded, this panel's 48vh height would bury
  // the 4 hotspot plaques baked into the bottom ~23% of the interior
  // artwork (TRIBE_HOTSPOTS, tribeLayout.ts) -- collapsed, it's still a
  // permanent, always-visible part of the page face (title + live count),
  // one tap from the full roster, rather than only reachable by tapping
  // the "Invite" plaque into a different sheet.
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tribe, setTribe] = useState<any[]>([]);
  const [stallUsernames, setStallUsernames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: tribeRows, error } = await supabase.rpc("get_my_tribe_members" as any);
        if (error) throw error;
        const direct = ((tribeRows || []) as any[]).filter((m) => Number(m.depth || 1) === 1);
        if (cancelled) return;
        setTribe(direct);

        const memberIds = direct.map((m) => m.user_id).filter(Boolean);
        if (memberIds.length > 0) {
          const { data: stallRows } = await supabase
            .from("stalls")
            .select("user_id")
            .in("user_id", memberIds)
            .eq("published", true);
          if (cancelled) return;
          const withStall = new Set(((stallRows || []) as { user_id: string }[]).map((s) => s.user_id));
          const usernames = new Map<string, string>();
          for (const m of direct) {
            if (withStall.has(m.user_id) && m.username) usernames.set(m.user_id, m.username);
          }
          setStallUsernames(usernames);
        }
      } catch (err) {
        console.warn("[TribeRosterPanel] load failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const count = tribe.length;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-[9600] flex flex-col rounded-t-2xl
        bg-[#180f08]/95 backdrop-blur-md border-t border-x border-amber-500/25 shadow-[0_-8px_40px_rgba(0,0,0,0.6)]
        transition-[max-height] duration-200 ease-out ${expanded ? "max-h-[48vh]" : "max-h-14"}`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-amber-500/15"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2 font-serif text-base text-amber-200 tracking-wide">
          <Users className="h-4 w-4" /> Tribe{!loading && ` (${count})`}
        </span>
        {expanded ? <ChevronDown className="h-4 w-4 text-amber-100/60" /> : <ChevronUp className="h-4 w-4 text-amber-100/60" />}
      </button>
      {expanded && (
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {loading ? (
            <div className="text-sm text-amber-100/50">Loading…</div>
          ) : tribe.length === 0 ? (
            <div className="text-center py-6 text-amber-100/50 text-sm">
              No tribe members yet. Share your invitation link to plant the first seed.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {tribe.map((m) => {
                const name = m.display_name?.trim() || m.username?.trim() || `Member #${String(m.user_id).slice(0, 8)}`;
                const initials = (name || "?").split(/\s+/).map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();
                return (
                  <div key={m.user_id} className="flex items-center justify-between py-3 text-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      {m.avatar_url ? (
                        <SignedImg src={m.avatar_url} alt={name} className="h-8 w-8 rounded-full object-cover border border-white/10" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-200 text-xs font-bold flex items-center justify-center">
                          {initials || "?"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-amber-50 font-medium truncate">{name}</div>
                        <div className="font-mono text-[10px] text-amber-100/40 truncate">
                          {formatAppDate(m.referred_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant={m.status === "completed" ? "default" : "secondary"}>{m.status}</Badge>
                      {stallUsernames.has(m.user_id) && (
                        <button
                          type="button"
                          onClick={() => navigate(`/stall/${stallUsernames.get(m.user_id)}`)}
                          aria-label={`Visit ${name}'s stall`}
                          title={`Visit ${name}'s stall`}
                          className="h-7 w-7 shrink-0 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-200 flex items-center justify-center hover:bg-cyan-500/20 hover:border-cyan-300/60 transition-colors"
                        >
                          <Store className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
