import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Send, X, TreePine } from "lucide-react";

// Routes where the right-edge action rail is full-bleed; move the bubble to
// the bottom-left there so it never hides a rail button (Share, Go Live, etc.)
const LEFT_SIDE_ROUTES = ["/orchard-alive", "/tribal-hearts"];

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export default function GroundskeeperWidget() {
  const { user } = useAuth() as any;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const sideClass = LEFT_SIDE_ROUTES.some((p) => location.pathname.startsWith(p))
    ? "left-5 right-auto"
    : "right-5 left-auto";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  if (!user) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("companion-invoke", {
        body: {
          companion: "groundskeeper",
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        },
      });
      if (error) throw error;
      const reply = (data as any)?.text ?? "The grove is quiet just now. Try me again.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `The wind carried our words away — ${e?.message ?? "unknown"}.` },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <button
          onClick={() => {
            setOpen(true);
            if (messages.length === 0) {
              setMessages([
                {
                  role: "assistant",
                  content:
                    "I tend the whole grove. Speak — I will hear you, or send the right tree to your side.",
                },
              ]);
            }
          }}
          aria-label="Open Groundskeeper"
          className="fixed bottom-5 right-5 z-[60] h-14 w-14 rounded-full flex items-center justify-center transition-transform hover:scale-105"
          style={{
            background:
              "linear-gradient(135deg, rgba(22,163,74,0.85), rgba(132,204,22,0.85))",
            border: "1px solid rgba(134,239,172,0.6)",
            boxShadow:
              "0 10px 30px rgba(34,197,94,0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <TreePine className="h-6 w-6 text-emerald-50" />
        </button>
      )}

      {/* Drawer */}
      {open && (
        <div
          className="fixed bottom-5 right-5 z-[60] w-[360px] max-w-[92vw] h-[520px] max-h-[80vh] rounded-2xl flex flex-col overflow-hidden"
          style={{
            background:
              "linear-gradient(180deg, rgba(15,23,42,0.95), rgba(2,6,23,0.95))",
            border: "1px solid rgba(134,239,172,0.3)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid rgba(134,239,172,0.18)" }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">🌳</span>
              <div>
                <div className="text-sm font-semibold text-emerald-50">Groundskeeper</div>
                <div className="text-[10px] uppercase tracking-wider text-emerald-300/70">
                  The Grove Steward
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-200"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-sm rounded-xl px-3 py-2 max-w-[85%] whitespace-pre-wrap ${
                  m.role === "user"
                    ? "ml-auto bg-emerald-900/40 text-emerald-50 border border-emerald-700/40"
                    : "mr-auto bg-slate-800/60 text-slate-100 border border-slate-700/40"
                }`}
              >
                {m.content}
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 className="h-3 w-3 animate-spin" /> The Steward is listening…
              </div>
            )}
          </div>

          <div
            className="p-2 flex gap-2"
            style={{ borderTop: "1px solid rgba(134,239,172,0.18)" }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Ask the Steward…"
              disabled={busy}
              className="flex-1 bg-slate-900/70 text-sm text-slate-100 rounded-lg px-3 py-2 border border-slate-700/50 focus:outline-none focus:border-emerald-500/50"
            />
            <button
              onClick={() => void send()}
              disabled={busy || !input.trim()}
              className="px-3 rounded-lg bg-emerald-600/80 hover:bg-emerald-500/80 text-emerald-50 disabled:opacity-40 transition-colors"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
