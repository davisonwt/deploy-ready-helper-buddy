import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { CompanionEntitlement } from "@/hooks/useCompanions";
import { COMPANIONS } from "@/lib/companions/registry";
import { supabase } from "@/integrations/supabase/client";

interface Msg {
  role: "user" | "assistant";
  content: string;
  image?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companion: CompanionEntitlement | null;
  onConsumed?: () => void;
}

export default function CompanionDrawer({ open, onOpenChange, companion, onConsumed }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const meta = COMPANIONS.find((c) => c.slug === companion?.slug);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMessages([]);
      setInput("");
    }
  }, [open, companion?.slug]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  if (!companion || !meta) return null;

  const send = async () => {
    const prompt = input.trim();
    if (!prompt || busy) return;
    setBusy(true);
    const next: Msg[] = [...messages, { role: "user", content: prompt }];
    setMessages(next);
    setInput("");
    try {
      const { data, error } = await supabase.functions.invoke("companion-invoke", {
        body: {
          companion: companion.slug,
          prompt,
          messages: next.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
        },
      });
      if (error) {
        const ctx: any = (error as any).context;
        let body: any = null;
        try {
          body = ctx ? await ctx.json() : null;
        } catch {/* ignore */}
        const msg =
          body?.error ??
          (error.message?.includes("non-2xx")
            ? "Companion call failed."
            : error.message ?? "Companion call failed.");
        toast({ title: meta.name, description: msg, variant: "destructive" });
        setMessages(next);
        return;
      }
      setMessages([
        ...next,
        {
          role: "assistant",
          content: data?.text ?? (data?.image ? "" : "(no response)"),
          image: data?.image ?? null,
        },
      ]);
      onConsumed?.();
    } catch (e: any) {
      toast({ title: meta.name, description: e?.message ?? "Failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="text-2xl">{companion.emoji}</span>
            <span>{companion.name} — {companion.title}</span>
          </SheetTitle>
          <SheetDescription>{meta.intro}</SheetDescription>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
          {messages.length === 0 && (
            <button
              onClick={() => setInput(meta.examplePrompt)}
              className="text-xs text-left text-muted-foreground border border-dashed border-border rounded-md p-3 w-full hover:border-primary/50 transition"
            >
              Try: <span className="text-foreground">{meta.examplePrompt}</span>
            </button>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[85%] rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm"
                  : "mr-auto max-w-[90%] rounded-lg bg-muted text-foreground px-3 py-2 text-sm prose prose-sm dark:prose-invert max-w-none"
              }
            >
              {m.role === "assistant" ? (
                <>
                  {m.image && (
                    <img src={m.image} alt="generated" className="rounded mb-2 max-w-full" />
                  )}
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </>
              ) : (
                m.content
              )}
            </div>
          ))}
          {busy && (
            <div className="mr-auto rounded-lg bg-muted px-3 py-2 text-sm flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> {companion.name} is thinking…
            </div>
          )}
        </div>

        <div className="border-t border-border pt-3 space-y-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask ${companion.name}…`}
            className="min-h-[80px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {companion.monthly_quota == null
                ? "Unlimited this month"
                : `${companion.remaining ?? 0} of ${companion.monthly_quota} left`}
            </span>
            <Button size="sm" onClick={send} disabled={busy || !input.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
