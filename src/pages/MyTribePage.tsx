import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useReferralCode } from "@/hooks/useReferralCode";
import { supabase } from "@/integrations/supabase/client";
import { burnReferralCode } from "@/lib/referral";
import { formatAppDate } from "@/lib/dates";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Copy, Check, Users, TrendingUp, Sparkles, Linkedin, Mail, Facebook,
} from "lucide-react";

/**
 * My Tribe page — shows the tribe member's permanent invitation code.
 * Anything they share from S2G has this code burned into the URL,
 * so new sign-ups become part of their tribe forever.
 */
export default function MyTribePage() {
  const { user } = useAuth();
  const { code, loading: codeLoading } = useReferralCode();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [stats, setStats] = useState({ total: 0, completed: 0, earnings: 0 });
  const [tribe, setTribe] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Always use the public production domain so shared links render with the S2G site preview/logo
  const inviteOrigin = (typeof window !== "undefined" && /lovable(project)?\.(app|com)|localhost|127\.0\.0\.1/.test(window.location.hostname))
    ? "https://sow2growapp.com"
    : (typeof window !== "undefined" ? window.location.origin : "https://sow2growapp.com");
  const inviteUrl = code ? burnReferralCode(`${inviteOrigin}/register`, code) : "";
  const inviteText = code
    ? `🌱 You're invited to join my tribe on Sow2Grow — a global tribal marketplace where every seed grows together.\n\nUse my invitation code: ${code}\nRegister here: ${inviteUrl}\n\n(When you sign up from this link, you automatically join my tribe forever.)`
    : "";

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const [{ data: affRows }, { data: tribeRows, error: tribeError }] = await Promise.all([
          supabase
          .from("affiliates")
          .select("id, earnings, total_referrals, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
          supabase.rpc("get_my_tribe_members" as any),
        ]);

        if (tribeError) throw tribeError;

        const enriched = (tribeRows || []).map((member: any) => ({
          ...member,
          referred_id: member.user_id,
          created_at: member.referred_at,
          profile: {
            display_name: member.display_name,
            username: member.username,
            avatar_url: member.avatar_url,
          },
        }));

        if (cancelled) return;
        setTribe(enriched);
        const totalEarnings = (affRows || []).reduce((sum, a: any) => sum + Number(a.earnings || 0), 0);
        setStats({
          total: enriched.length,
          completed: enriched.filter((r: any) => ["completed", "active", "joined"].includes(r.status)).length,
          earnings: totalEarnings,
        });
      } catch (err) {
        console.warn("[MyTribePage] load failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);


  const copy = async (value: string, kind: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      toast({ title: kind === "code" ? "Code copied" : "Link copied", description: "Share it anywhere — your code is burned in." });
      setTimeout(() => setCopied(null), 1800);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" as any });
    }
  };

  const open = (url: string) => window.open(url, "_blank", "noopener,noreferrer");
  const shareWA  = () => open(`https://wa.me/?text=${encodeURIComponent(inviteText)}`);
  const shareTG  = () => open(`https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent("🌱 Join my tribe on Sow2Grow")}`);
  const shareLI  = () => open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(inviteUrl)}`);
  const shareFB  = () => open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteUrl)}`);
  const sharePI  = () => open(`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(inviteUrl)}&description=${encodeURIComponent("Join my tribe on Sow2Grow 🌱")}`);
  const shareTW  = () => open(`https://twitter.com/intent/tweet?text=${encodeURIComponent("🌱 Join my tribe on Sow2Grow")}&url=${encodeURIComponent(inviteUrl)}`);
  const shareEmail = () => { window.location.href = `mailto:?subject=${encodeURIComponent("Join my tribe on Sow2Grow")}&body=${encodeURIComponent(inviteText)}`; };
  const copyForPaste = async (label: string) => {
    try {
      await navigator.clipboard.writeText(`${inviteText}\n#Sow2Grow #Tribe`);
      toast({ title: `Copied for ${label}`, description: `Paste into your ${label} caption, bio, or description.` });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" as any });
    }
  };
  const shareTikTok    = () => copyForPaste("TikTok");
  const shareInstagram = () => copyForPaste("Instagram");
  const shareYouTube   = () => copyForPaste("YouTube");

  const ShareBtn = ({ onClick, children, accent = 'cyan' }: any) => {
    const ring =
      accent === 'amber'
        ? 'border-amber-400/40 hover:border-amber-300/70 text-amber-100 hover:shadow-[0_0_18px_rgba(245,158,11,0.35)]'
        : accent === 'rose'
        ? 'border-rose-400/40 hover:border-rose-300/70 text-rose-100 hover:shadow-[0_0_18px_rgba(244,63,94,0.35)]'
        : 'border-cyan-400/40 hover:border-cyan-300/70 text-cyan-100 hover:shadow-[0_0_18px_rgba(34,211,238,0.35)]'
    return (
      <button
        onClick={onClick}
        className={`px-4 py-2 rounded-2xl text-sm font-semibold bg-white/5 hover:bg-white/10 border ${ring} backdrop-blur transition-all hover:-translate-y-0.5 active:scale-95`}
      >
        {children}
      </button>
    )
  }

  return (
    <div
      className="min-h-screen text-slate-100 relative"
      style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #060a12 100%)' }}
    >
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(34,211,238,0.08), transparent 60%), radial-gradient(ellipse 60% 40% at 90% 100%, rgba(245,158,11,0.06), transparent 60%)',
        }}
      />
      <div className="relative max-w-5xl mx-auto px-4 py-6 space-y-6">
        <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 transition">
          <ArrowLeft size={16} /> Go Back
        </Link>

        <header className="space-y-2">
          <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold tracking-[0.2em]">
            <Sparkles size={14} /> MY TRIBE
          </div>
          <h1 className="text-3xl font-bold text-white drop-shadow-[0_2px_8px_rgba(34,211,238,0.25)]">Your tribe grows from your invitation</h1>
          <p className="text-sm text-slate-300/80 max-w-2xl">
            Every link, video, seed, or post you share from Sow2Grow carries your unique invitation code.
            Anyone who registers from your share automatically becomes a member of <em>your</em> tribe — forever.
          </p>
        </header>

        {/* Code card */}
        <div className="rounded-2xl border border-cyan-400/25 bg-[#0f172a]/80 backdrop-blur p-5 shadow-[0_0_40px_rgba(34,211,238,0.10)]">
          <div className="text-base font-bold text-white mb-4">Your unique invitation code</div>
          {codeLoading ? (
            <div className="h-10 w-48 bg-white/10 animate-pulse rounded" />
          ) : code ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="font-mono text-2xl md:text-3xl font-extrabold tracking-wider bg-gradient-to-r from-cyan-300 to-amber-200 bg-clip-text text-transparent">
                  {code}
                </div>
                <ShareBtn onClick={() => copy(inviteText, "code")}>
                  {copied === "code" ? <Check className="h-4 w-4 inline mr-1" /> : <Copy className="h-4 w-4 inline mr-1" />}
                  {copied === "code" ? "Copied invitation" : "Copy invitation"}
                </ShareBtn>
              </div>

              <div>
                <label className="text-xs text-slate-400">Your invitation link</label>
                <div className="flex items-center gap-2 mt-1">
                  <Input value={inviteUrl} readOnly className="font-mono text-xs bg-white/5 border-white/10 text-slate-200" />
                  <button
                    onClick={() => copy(inviteUrl, "link")}
                    aria-label="Copy invite link"
                    className="h-10 w-10 rounded-xl bg-white/5 hover:bg-white/10 border border-cyan-400/30 hover:border-cyan-300/60 text-cyan-200 flex items-center justify-center transition hover:-translate-y-0.5"
                  >
                    {copied === "link" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-2">Share your invitation</div>
                <div className="flex flex-wrap gap-2">
                  <ShareBtn accent="amber" onClick={shareWA}>WhatsApp</ShareBtn>
                  <ShareBtn onClick={shareTG}>Telegram</ShareBtn>
                  <ShareBtn onClick={shareLI}><Linkedin className="h-4 w-4 inline mr-1" /> LinkedIn</ShareBtn>
                  <ShareBtn accent="rose" onClick={sharePI}>Pinterest</ShareBtn>
                  <ShareBtn onClick={shareFB}><Facebook className="h-4 w-4 inline mr-1" /> Facebook</ShareBtn>
                  <ShareBtn onClick={shareTW}>X (Twitter)</ShareBtn>
                  <ShareBtn accent="rose" onClick={shareTikTok}>TikTok</ShareBtn>
                  <ShareBtn accent="rose" onClick={shareInstagram}>Instagram</ShareBtn>
                  <ShareBtn accent="amber" onClick={shareYouTube}>YouTube</ShareBtn>
                  <ShareBtn onClick={shareEmail}><Mail className="h-4 w-4 inline mr-1" /> Email</ShareBtn>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Sign in to view your invitation code.</p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Tribe size', value: stats.total, sub: `${stats.completed} active`, icon: Users, color: 'cyan' },
            { label: 'Total earned', value: `$${stats.earnings.toFixed(2)}`, sub: 'From tribe activity', icon: TrendingUp, color: 'amber' },
            { label: 'Conversion', value: `${stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(0) : 0}%`, sub: 'Of your invites bloom', icon: Sparkles, color: 'violet' },
          ].map((s) => {
            const Icon = s.icon
            const ring =
              s.color === 'amber' ? 'border-amber-400/25 shadow-[0_0_30px_rgba(245,158,11,0.10)] text-amber-200'
              : s.color === 'violet' ? 'border-violet-400/25 shadow-[0_0_30px_rgba(139,92,246,0.10)] text-violet-200'
              : 'border-cyan-400/25 shadow-[0_0_30px_rgba(34,211,238,0.10)] text-cyan-200'
            return (
              <div key={s.label} className={`rounded-2xl border bg-[#0f172a]/80 backdrop-blur p-5 ${ring}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-slate-400">{s.label}</span>
                  <Icon className="h-4 w-4 opacity-70" />
                </div>
                <div className="text-3xl font-extrabold text-white mt-2">{s.value}</div>
                <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
              </div>
            )
          })}
        </div>

        {/* Tribe list */}
        <div className="rounded-2xl border border-white/10 bg-[#0f172a]/80 backdrop-blur p-5">
          <div className="text-base font-bold text-white mb-4">Your tribe members</div>
          {loading ? (
            <div className="text-sm text-slate-400">Loading…</div>
          ) : tribe.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No tribe members yet. Share your invitation link to plant the first seed.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {tribe.map((r) => {
                const p = r.profile;
                const name = p
                  ? (p.display_name?.trim() ||
                     p.username?.trim() ||
                     [p.first_name, p.last_name].filter(Boolean).join(" ").trim() ||
                     `Member #${String(r.referred_id).slice(0, 8)}`)
                  : `Member #${String(r.referred_id).slice(0, 8)}`;
                const initials = (name || "?").split(/\s+/).map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();
                return (
                  <div key={r.id} className="flex items-center justify-between py-3 text-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      {p?.avatar_url ? (
                        <img src={p.avatar_url} alt={name} className="h-8 w-8 rounded-full object-cover border border-white/10" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-200 text-xs font-bold flex items-center justify-center">
                          {initials || "?"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-slate-100 font-medium truncate">{name}</div>
                        <div className="font-mono text-[10px] text-slate-500 truncate">
                          {p?.username && p.username !== name ? `${p.username} · ` : ""}{String(r.referred_id).slice(0, 8)}
                          {r.depth > 1 && r.referrer_name ? ` · invited by ${r.referrer_name}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">
                        {formatAppDate(r.created_at)}
                      </span>
                      {r.depth > 1 && <Badge variant="outline">level {r.depth}</Badge>}
                      <Badge variant={r.status === "completed" ? "default" : "secondary"}>
                        {r.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>

          )}
        </div>
      </div>
    </div>
  );
}
