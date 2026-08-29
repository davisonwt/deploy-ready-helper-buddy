import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, Coins, MessageCircle } from "lucide-react";

/**
 * Three-tile dashboard widget: Tribe size · Bestowals (received + given) · Unread messages.
 * Each tile is a Link. Real-time refreshes via Supabase Realtime.
 */
export default function DashboardTribeStats() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tribeCount, setTribeCount] = useState(0);
  const [bestowals, setBestowals] = useState({ count: 0, total: 0 });
  const [purchases, setPurchases] = useState({ count: 0, total: 0 });
  const [unread, setUnread] = useState(0);

  const reload = React.useCallback(async () => {
    if (!user?.id) return;
    // Tribe size = direct members only; use the same source as /my-tribe.
    try {
      const { data: linkedCount, error: linkedError } = await supabase.rpc("get_my_dashboard_tribe_count" as any);
      if (!linkedError && typeof linkedCount === "number") {
        setTribeCount(linkedCount);
      } else {
        throw linkedError;
      }
    } catch {
      try {
      const { data: tribeRows, error: tribeError } = await supabase.rpc("get_my_tribe_members" as any);
      if (tribeError) throw tribeError;
      setTribeCount((tribeRows || []).filter((member: any) => Number(member.depth || 1) === 1).length);
      } catch {
      const [{ count: circleCount }, { count: referralCount }] = await Promise.all([
        supabase.from("referral_circle").select("id", { count: "exact", head: true }).eq("referrer_id", user.id),
        supabase.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", user.id),
      ]);
      setTribeCount((circleCount || 0) + (referralCount || 0));
      }
    }


    // Bestowals received: sower_earnings_v unions product/content/orchard-gift
    // sales into one already-completed-only shape, so this is a single query
    // instead of two separately-filtered ones (the old product_bestowals half
    // had no status filter at all — stale 'pending' rows were counting as
    // real money). RLS on the view already scopes to rows the caller may see;
    // .eq('sower_id', ...) narrows that further to "I'm the sower" specifically,
    // since the same RLS also admits rows where I'm the credited whisperer.
    try {
      const { data: rows } = await supabase
        .from("sower_earnings_v")
        .select("sower_amount")
        .eq("sower_id", user.id);
      setBestowals({
        count: rows?.length || 0,
        total: (rows || []).reduce((s, r) => s + Number(r.sower_amount || 0), 0),
      });
    } catch {}

    // Bestowals given: buyer_purchases_v mirrors sower_earnings_v from the
    // other side — everything this user has completed-and-paid-for across
    // basket_orders (via product_bestowals), content_purchases, bestowals,
    // and topups. buyer_total is the real charge (subtotal + processor fee),
    // not just the seed price, matching what actually left the buyer's account.
    try {
      const { data: rows } = await supabase
        .from("buyer_purchases_v")
        .select("buyer_total")
        .eq("buyer_id", user.id);
      setPurchases({
        count: rows?.length || 0,
        total: (rows || []).reduce((s, r) => s + Number(r.buyer_total || 0), 0),
      });
    } catch {}

    // Unread messages
    try {
      const { data: parts } = await supabase
        .from("chat_participants")
        .select("room_id, last_read_at")
        .eq("user_id", user.id);
      let totalUnread = 0;
      for (const p of parts || []) {
        // .neq('sender_id', user.id) would translate to plain SQL `<>`,
        // which is NULL (excluded) for a NULL sender_id — silently dropping
        // every system message (Sow2Grow thank-yous, receipts). Use an OR
        // so it reads as "sender_id IS DISTINCT FROM me" instead.
        const { count: c } = await supabase
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("room_id", p.room_id)
          .or(`sender_id.is.null,sender_id.neq.${user.id}`)
          .gt("created_at", p.last_read_at || "1970-01-01");
        totalUnread += c || 0;
      }
      setUnread(totalUnread);
    } catch {}
  }, [user?.id]);

  useEffect(() => {
    reload();
    if (!user?.id) return;
    const ch = supabase
      .channel(`dash-stats-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "referral_circle" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "referrals" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "bestowals" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "product_bestowals" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "content_purchases" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "basket_orders" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "topups" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, reload)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, reload]);

  const subLine = { fontSize: 11, color: "#64748b", marginTop: 2 };

  const tile = (to, icon, label, value, sub, color) => (
    <Link to={to} style={{
      flex: 1, minWidth: 160, textDecoration: "none",
      background: "linear-gradient(135deg, rgba(15,23,42,0.9), rgba(2,6,23,0.95))",
      border: `1px solid ${color}55`,
      borderRadius: 14, padding: "14px 16px",
      display: "flex", alignItems: "center", gap: 12,
      boxShadow: `0 0 24px ${color}22`,
      transition: "transform .15s",
    }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12, background: `${color}22`,
        display: "flex", alignItems: "center", justifyContent: "center", color,
        border: `1px solid ${color}55`,
      }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: "#94a3b8", letterSpacing: ".08em", textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", lineHeight: 1.1 }}>{value}</div>
        {sub}
      </div>
    </Link>
  );

  return (
    <div style={{
      display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14,
    }}>
      {tile("/my-tribe", <Users size={20} />, "My Tribe", tribeCount, <div style={subLine}>members in your tribe</div>, "#22c55e")}
      {tile("/wallet-settings", <Coins size={20} />, "Bestowals", `${bestowals.total.toFixed(2)}`, (
        <>
          <div style={subLine}>{bestowals.count} received (USD)</div>
          <div
            style={{ ...subLine, textDecoration: "underline", cursor: "pointer" }}
            role="link"
            tabIndex={0}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate("/my-seeds"); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); navigate("/my-seeds"); } }}
          >
            ${purchases.total.toFixed(2)} given · {purchases.count} purchases — see what you bestowed to
          </div>
        </>
      ), "#f59e0b")}
      {tile("/chatapp?filter=unread", <MessageCircle size={20} />, "Unread", unread, <div style={subLine}>{unread ? "tap to read" : "all caught up"}</div>, "#22d3ee")}
    </div>
  );
}
