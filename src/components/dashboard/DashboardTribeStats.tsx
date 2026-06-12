import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, Coins, MessageCircle } from "lucide-react";

/**
 * Three-tile dashboard widget: Tribe size · Bestowals received · Unread messages.
 * Each tile is a Link. Real-time refreshes via Supabase Realtime.
 */
export default function DashboardTribeStats() {
  const { user } = useAuth();
  const [tribeCount, setTribeCount] = useState(0);
  const [bestowals, setBestowals] = useState({ count: 0, total: 0 });
  const [unread, setUnread] = useState(0);

  const reload = React.useCallback(async () => {
    if (!user?.id) return;
    // Tribe size = referrals where I'm the referrer (matches /my-tribe)
    const { data: affRows } = await supabase
      .from("affiliates")
      .select("id")
      .eq("user_id", user.id);
    const affIds = (affRows || []).map((a) => a.id);
    if (affIds.length) {
      const { count: tCount } = await supabase
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .in("referrer_id", affIds);
      setTribeCount(tCount || 0);
    } else {
      setTribeCount(0);
    }


    // Bestowals received: orchards owned by me
    try {
      const { data: orchards } = await supabase
        .from("orchards").select("id").eq("user_id", user.id);
      const oids = (orchards || []).map((o) => o.id);
      let total = 0, count = 0;
      if (oids.length) {
        const { data: bs } = await supabase
          .from("bestowals")
          .select("amount")
          .in("orchard_id", oids)
          .eq("payment_status", "completed");
        count = bs?.length || 0;
        total = (bs || []).reduce((s, b) => s + Number(b.amount || 0), 0);
      }
      // Plus product bestowals where I'm the sower
      const { data: pbs } = await supabase
        .from("product_bestowals")
        .select("sower_amount")
        .eq("sower_id", user.id);
      count += pbs?.length || 0;
      total += (pbs || []).reduce((s, b) => s + Number(b.sower_amount || 0), 0);
      setBestowals({ count, total });
    } catch {}

    // Unread messages
    try {
      const { data: parts } = await supabase
        .from("chat_participants")
        .select("room_id, last_read_at")
        .eq("user_id", user.id);
      let totalUnread = 0;
      for (const p of parts || []) {
        const { count: c } = await supabase
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("room_id", p.room_id)
          .neq("sender_id", user.id)
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
      .on("postgres_changes", { event: "*", schema: "public", table: "referrals" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "bestowals" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, reload)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, reload]);

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
        {sub && <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{sub}</div>}
      </div>
    </Link>
  );

  return (
    <div style={{
      display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14,
    }}>
      {tile("/my-tribe", <Users size={20} />, "My Tribe", tribeCount, "members in your tribe", "#22c55e")}
      {tile("/wallet-settings", <Coins size={20} />, "Bestowals", `${bestowals.total.toFixed(2)}`, `${bestowals.count} bestowals received (USDC)`, "#f59e0b")}
      {tile("/chatapp?filter=unread", <MessageCircle size={20} />, "Unread", unread, unread ? "tap to read" : "all caught up", "#22d3ee")}
    </div>
  );
}
