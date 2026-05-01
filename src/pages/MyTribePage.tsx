import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useReferralCode } from "@/hooks/useReferralCode";
import { supabase } from "@/integrations/supabase/client";
import { burnReferralCode } from "@/lib/referral";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const inviteUrl = code ? burnReferralCode(`${window.location.origin}/register`, code) : "";
  const inviteText = `🌱 Join my tribe on Sow2Grow — a global tribal marketplace where every seed grows together.\n\n${inviteUrl}`;

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: aff } = await supabase
          .from("affiliates")
          .select("id, earnings, total_referrals")
          .eq("user_id", user.id)
          .maybeSingle();
        if (cancelled || !aff) {
          setLoading(false);
          return;
        }
        const { data: refs } = await supabase
          .from("referrals")
          .select("id, referred_id, status, commission_amount, created_at")
          .eq("referrer_id", aff.id)
          .order("created_at", { ascending: false });
        if (cancelled) return;
        const list = refs || [];
        setTribe(list);
        setStats({
          total: list.length || aff.total_referrals || 0,
          completed: list.filter((r: any) => r.status === "completed").length,
          earnings: Number(aff.earnings || 0),
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <header className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold tracking-wider">
            <Sparkles size={14} /> MY TRIBE
          </div>
          <h1 className="text-3xl font-bold">Your tribe grows from your invitation</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Every link, video, seed, or post you share from Sow2Grow carries your unique invitation code.
            Anyone who registers from your share automatically becomes a member of <em>your</em> tribe — forever.
          </p>
        </header>

        {/* Code card */}
        <Card className="border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent">
          <CardHeader>
            <CardTitle className="text-base">Your unique invitation code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {codeLoading ? (
              <div className="h-10 w-48 bg-muted animate-pulse rounded" />
            ) : code ? (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="font-mono text-2xl md:text-3xl font-bold text-emerald-500 tracking-wider">{code}</div>
                  <Button size="sm" variant="outline" onClick={() => copy(code, "code")}>
                    {copied === "code" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                    {copied === "code" ? "Copied" : "Copy code"}
                  </Button>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Your invitation link</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input value={inviteUrl} readOnly className="font-mono text-xs" />
                    <Button size="icon" onClick={() => copy(inviteUrl, "link")} aria-label="Copy invite link">
                      {copied === "link" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-2">Share your invitation</div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={shareWA}>WhatsApp</Button>
                    <Button size="sm" variant="outline" onClick={shareTG}>Telegram</Button>
                    <Button size="sm" variant="outline" onClick={shareLI}><Linkedin className="h-4 w-4 mr-1" /> LinkedIn</Button>
                    <Button size="sm" variant="outline" onClick={sharePI}>Pinterest</Button>
                    <Button size="sm" variant="outline" onClick={shareFB}><Facebook className="h-4 w-4 mr-1" /> Facebook</Button>
                    <Button size="sm" variant="outline" onClick={shareTW}>X (Twitter)</Button>
                    <Button size="sm" variant="outline" onClick={shareTikTok}>TikTok</Button>
                    <Button size="sm" variant="outline" onClick={shareInstagram}>Instagram</Button>
                    <Button size="sm" variant="outline" onClick={shareYouTube}>YouTube</Button>
                    <Button size="sm" variant="outline" onClick={shareEmail}><Mail className="h-4 w-4 mr-1" /> Email</Button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sign in to view your invitation code.</p>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Tribe size</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">{stats.completed} active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Total earned</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.earnings.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">From tribe activity</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Conversion</CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(0) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">Of your invites bloom</p>
            </CardContent>
          </Card>
        </div>

        {/* Tribe list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your tribe members</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : tribe.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No tribe members yet. Share your invitation link to plant the first seed.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {tribe.map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-3 text-sm">
                    <div className="font-mono text-xs text-muted-foreground">
                      Member #{String(r.referred_id).slice(0, 8)}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                      <Badge variant={r.status === "completed" ? "default" : "secondary"}>
                        {r.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
