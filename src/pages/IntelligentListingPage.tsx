import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, PackageCheck, Sparkles, Sprout } from "lucide-react";
import { toast } from "sonner";
import { analytics } from "@/lib/analytics/sow2grow";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type ListingSession = {
  id: string;
  raw_description: string;
  current_stage: string;
  parsed_details: Record<string, any>;
  sage_pricing: Record<string, any>;
  loaf_logistics: Record<string, any>;
  debian_copy: Record<string, any>;
  kali_media: Record<string, any>;
  fedora_story: Record<string, any>;
  mint_payment: Record<string, any>;
  approvals: Record<string, any>;
  final_product_id?: string | null;
};

const starterText = "50kg organic tomatoes, prefer local buyers, need pickup by Friday";

export default function IntelligentListingPage() {
  const navigate = useNavigate();
  const [description, setDescription] = useState("");
  const [session, setSession] = useState<ListingSession | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const approvals = session?.approvals ?? {};
  const readyToPublish = Boolean(approvals.price?.approved && approvals.logistics?.approved && approvals.publish?.approved);

  const progressSteps = useMemo(() => [
    { agent: "Gentoo", label: "Coordinated the flow", ready: Boolean(session) },
    { agent: "Sage", label: "Prepared price and fairness", ready: Boolean(session?.sage_pricing?.generated_at) },
    { agent: "Loaf", label: "Mapped fulfillment paths", ready: Boolean(session?.loaf_logistics?.generated_at) },
    { agent: "Debian", label: "Drafted listing copy", ready: Boolean(session?.debian_copy?.generated_at) },
    { agent: "Mint", label: "Readied buy and bestowal rails", ready: Boolean(session?.mint_payment?.generated_at) },
  ], [session]);

  const invoke = async (action: string, payload: Record<string, any>) => {
    setBusyAction(action);
    try {
      const { data, error } = await supabase.functions.invoke("linux-family-orchestrator", { body: { action, payload } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.session) setSession(data.session);
      return data;
    } finally {
      setBusyAction(null);
    }
  };

  const start = async () => {
    const raw = description.trim();
    if (raw.length < 10) {
      toast.error("Share a little more so the Orchard Companions can prepare the Seed.");
      return;
    }
    try {
      analytics.track("started_intelligent_listing", { source: "plant_with_companion_help" });
      const data = await invoke("intelligent_listing_start", { raw_description: raw });
      analytics.track("description_submitted", { sessionId: data?.session?.id });
      toast.success("Orchard Companions prepared your listing for approval.");
    } catch (error: any) {
      toast.error(error?.message || "Could not start the Companion flow.");
    }
  };

  const approve = async (kind: "price" | "logistics" | "publish") => {
    if (!session) return;
    try {
      await invoke(`intelligent_listing_approve_${kind}`, { session_id: session.id });
      analytics.track(`approval_${kind}_clicked`, { sessionId: session.id });
      toast.success("Approval saved.");
    } catch (error: any) {
      toast.error(error?.message || "Approval could not be saved.");
    }
  };

  const publish = async () => {
    if (!session) return;
    try {
      const data = await invoke("intelligent_listing_publish", { session_id: session.id });
      analytics.track("listing_published", { sessionId: session.id, productId: data?.product_id });
      toast.success("Your Seed is live.");
      navigate(data?.product_id ? `/products/${data.product_id}` : "/my-products");
    } catch (error: any) {
      toast.error(error?.message || "Seed could not be published yet.");
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-border bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="container mx-auto max-w-5xl px-4 py-10">
          <Badge variant="secondary" className="mb-4 gap-2"><Sparkles className="h-3.5 w-3.5" /> Orchard Command Flow</Badge>
          <h1 className="text-3xl font-bold tracking-normal text-foreground md:text-5xl">Describe your Seed. Approve three choices. Go live.</h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">Plant with Companion Help turns one plain-language description into a prepared values-led listing.</p>
        </div>
      </section>

      <section className="container mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[1fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sprout className="h-5 w-5 text-primary" /> Describe your Seed</CardTitle>
            <CardDescription>Text first; voice can come after this flow is stable.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value.slice(0, 1200))}
              placeholder={starterText}
              className="min-h-36 resize-none"
              disabled={Boolean(session) || busyAction !== null}
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={start} disabled={Boolean(session) || busyAction !== null} className="gap-2">
                {busyAction === "intelligent_listing_start" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Plant with Companion Help
              </Button>
              <Button type="button" variant="outline" onClick={() => setDescription(starterText)} disabled={Boolean(session) || busyAction !== null}>Use tomato example</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Companion progress</CardTitle>
            <CardDescription>{session ? "Prepared and ready for your approvals." : "Companions will gather after intake."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {progressSteps.map((step) => (
              <div key={step.agent} className="flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3">
                <div><p className="text-sm font-medium text-foreground">{step.agent}</p><p className="text-xs text-muted-foreground">{step.label}</p></div>
                {step.ready ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <span className="h-2.5 w-2.5 rounded-full bg-muted" />}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {session && (
        <section className="container mx-auto max-w-5xl px-4 pb-10">
          <div className="grid gap-4 md:grid-cols-3">
            <ApprovalCard
              title="Price & fairness"
              approved={Boolean(approvals.price?.approved)}
              body={`${session.sage_pricing?.suggested_total ?? session.sage_pricing?.base_price ?? 0} ${session.sage_pricing?.currency ?? "USDC"}`}
              detail={session.sage_pricing?.fairness_note}
              onApprove={() => approve("price")}
              busy={busyAction === "intelligent_listing_approve_price"}
            />
            <ApprovalCard
              title="Fulfillment"
              approved={Boolean(approvals.logistics?.approved)}
              body={session.loaf_logistics?.recommended ?? "Local-first"}
              detail={(session.loaf_logistics?.options ?? []).join(" · ")}
              onApprove={() => approve("logistics")}
              busy={busyAction === "intelligent_listing_approve_logistics"}
            />
            <ApprovalCard
              title="Copy, media & payment"
              approved={Boolean(approvals.publish?.approved)}
              body={session.debian_copy?.title ?? "Prepared listing"}
              detail="Debian copy, Kali image prompt, Fedora story, and Mint buy/bestowal rails are ready."
              onApprove={() => approve("publish")}
              busy={busyAction === "intelligent_listing_approve_publish"}
            />
          </div>

          <Card className="mt-6">
            <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-foreground">Ready to publish local-first</p>
                <p className="text-sm text-muted-foreground">Global reach can be added later; this Sprint keeps the first Seed journey focused.</p>
              </div>
              <Button onClick={publish} disabled={!readyToPublish || busyAction !== null} className="gap-2">
                {busyAction === "intelligent_listing_publish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
                Go live
              </Button>
            </CardContent>
          </Card>
        </section>
      )}
    </main>
  );
}

function ApprovalCard({ title, body, detail, approved, busy, onApprove }: { title: string; body: string; detail?: string; approved: boolean; busy: boolean; onApprove: () => void }) {
  return (
    <Card className={approved ? "border-primary/60" : undefined}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg">{title}</CardTitle>
          {approved && <Badge>Approved</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xl font-semibold text-foreground">{body}</p>
        {detail && <p className="text-sm text-muted-foreground">{detail}</p>}
        <Separator />
        <Button onClick={onApprove} disabled={approved || busy} variant={approved ? "secondary" : "default"} className="w-full gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {approved ? "Approved" : "Approve"}
        </Button>
      </CardContent>
    </Card>
  );
}