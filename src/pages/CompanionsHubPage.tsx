import { useState } from "react";
import { Link } from "react-router-dom";
import { useCompanions, type CompanionEntitlement } from "@/hooks/useCompanions";
import CompanionCard from "@/components/companions/CompanionCard";
import CompanionDrawer from "@/components/companions/CompanionDrawer";
import { Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { TIER_LABEL } from "@/lib/companions/registry";

export default function CompanionsHubPage() {
  const { tier, companions, loading, error, refresh } = useCompanions();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<CompanionEntitlement | null>(null);

  const openCompanion = (c: CompanionEntitlement) => {
    setActive(c);
    setOpen(true);
  };

  return (
    <main
      className="min-h-screen text-foreground"
      style={{
        background:
          "radial-gradient(1200px 600px at 10% -10%, rgba(99,102,241,0.15), transparent 60%), radial-gradient(900px 500px at 110% 10%, rgba(34,197,94,0.10), transparent 60%), #06070b",
      }}
    >
      <div className="container max-w-6xl mx-auto p-4 sm:p-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all"
          style={{
            background: "linear-gradient(135deg, rgba(15,23,42,0.85), rgba(2,6,23,0.85))",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(148,163,184,0.25)",
            color: "#cbd5e1",
            textDecoration: "none",
            boxShadow: "0 4px 14px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
        </Link>
        <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1
              className="text-3xl sm:text-4xl font-bold tracking-tight"
              style={{
                background:
                  "linear-gradient(135deg, #ede9fe 0%, #c4b5fd 50%, #86efac 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              🐧 Orchard Companions
            </h1>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl">
              Sow2Grow's AI-CaaS layer — Communication, Conversation, Cognition,
              Comprehension, Channel, Compliance, Credential, Confession & Calling
              — at the service of your tribe. The more our tribe grows, the wiser
              these companions become.
            </p>
          </div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider"
            style={{
              background:
                "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.18), rgba(236,72,153,0.22))",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(196,181,253,0.45)",
              color: "#ede9fe",
              boxShadow:
                "0 6px 24px rgba(139,92,246,0.25), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
          >
            <Sparkles className="h-3.5 w-3.5" /> Tier: {TIER_LABEL[tier]}
          </div>
        </header>

        {loading && (
          <div className="flex items-center gap-2 text-slate-400 py-12 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Gathering the
            companions…
          </div>
        )}
        {error && (
          <div
            className="text-sm py-3 px-4 rounded-lg mb-4"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.35)",
              color: "#fca5a5",
            }}
          >
            {error}
          </div>
        )}

        <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {companions.map((c) => (
            <CompanionCard key={c.slug} c={c} onOpen={() => openCompanion(c)} />
          ))}
        </section>

        <CompanionDrawer
          open={open}
          onOpenChange={setOpen}
          companion={active}
          onConsumed={() => void refresh()}
        />
      </div>
    </main>
  );
}
