import { useState } from "react";
import { useCompanions, type CompanionEntitlement } from "@/hooks/useCompanions";
import CompanionCard from "@/components/companions/CompanionCard";
import CompanionDrawer from "@/components/companions/CompanionDrawer";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
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
    <main className="container max-w-6xl mx-auto p-4 sm:p-6">
      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Orchard Companions
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Sow2Grow's AI-CaaS layer — Communication, Conversation, Cognition,
            Comprehension, Channel, Compliance, Credential, Confession & Calling — at
            the service of your tribe. The more our tribe grows, the wiser these
            companions become.
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Tier: {TIER_LABEL[tier]}
        </Badge>
      </header>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Gathering the companions…
        </div>
      )}
      {error && (
        <div className="text-destructive text-sm py-4">{error}</div>
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
    </main>
  );
}
