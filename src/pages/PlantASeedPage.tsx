import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Sprout } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Step = "acorn" | "root" | "maple" | "bud" | "willow" | "done";

interface ChatMsg { role: "user" | "assistant"; content: string }

const STEP_ORDER: Step[] = ["acorn", "root", "maple", "bud", "willow", "done"];
const STEP_META: Record<Step, { emoji: string; name: string; title: string; hint: string }> = {
  acorn:  { emoji: "🌰", name: "Acorn",  title: "Seed Intake",      hint: "Acorn will ask you 5–8 warm questions about your seed." },
  root:   { emoji: "🪵", name: "Root",   title: "Identity Forger",  hint: "Root distills who you are from your story." },
  maple:  { emoji: "🍁", name: "Maple",  title: "Story Sower",      hint: "Maple writes your public seed story." },
  bud:    { emoji: "🌷", name: "Bud",    title: "Promise Designer", hint: "Bud designs your bestowal tiers." },
  willow: { emoji: "🌿", name: "Willow", title: "Vision Weaver",    hint: "Willow paints your hero image." },
  done:   { emoji: "🌳", name: "Plant",  title: "Plant the seed",   hint: "Review and let it bloom." },
};

export default function PlantASeedPage() {
  const { user } = useAuth() as any;
  const [step, setStep] = useState<Step>("acorn");
  const [busy, setBusy] = useState(false);
  const [acornChat, setAcornChat] = useState<ChatMsg[]>([
    { role: "assistant", content: "Welcome, friend. What are you bringing to the grove today?" },
  ]);
  const [acornInput, setAcornInput] = useState("");
  const [identity, setIdentity] = useState<any>(null);
  const [story, setStory] = useState<string>("");
  const [tiers, setTiers] = useState<any[]>([]);
  const [hero, setHero] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const invoke = async (companion: string, payload: any) => {
    const { data, error } = await supabase.functions.invoke("companion-invoke", {
      body: { companion, ...payload },
    });
    if (error) throw error;
    return data as any;
  };

  const sendAcorn = async () => {
    if (!acornInput.trim() || busy) return;
    const next: ChatMsg[] = [...acornChat, { role: "user", content: acornInput.trim() }];
    setAcornChat(next); setAcornInput(""); setBusy(true); setError(null);
    try {
      const r = await invoke("acorn", { messages: next });
      setAcornChat([...next, { role: "assistant", content: r.text ?? "(silence)" }]);
    } catch (e: any) { setError(e?.message ?? "Acorn slept."); }
    finally { setBusy(false); }
  };

  const runRoot = async () => {
    setBusy(true); setError(null);
    try {
      const transcript = acornChat.map(m => `${m.role}: ${m.content}`).join("\n");
      const r = await invoke("root", { prompt: transcript });
      try { setIdentity(JSON.parse(r.text)); } catch { setIdentity({ raw: r.text }); }
      setStep("maple");
    } catch (e: any) { setError(e?.message ?? "Root could not reach deep."); }
    finally { setBusy(false); }
  };

  const runMaple = async () => {
    setBusy(true); setError(null);
    try {
      const r = await invoke("maple", { prompt: `Write the public story for this seed. Identity:\n${JSON.stringify(identity, null, 2)}\n\nInterview:\n${acornChat.map(m => m.content).join("\n")}` });
      setStory(r.text ?? ""); setStep("bud");
    } catch (e: any) { setError(e?.message ?? "Maple's quill ran dry."); }
    finally { setBusy(false); }
  };

  const runBud = async () => {
    setBusy(true); setError(null);
    try {
      const r = await invoke("bud", { prompt: `Design 3-5 bestowal tiers in USDC for this seed.\nIdentity:\n${JSON.stringify(identity)}\nStory:\n${story}` });
      try { setTiers(JSON.parse(r.text)); } catch { setTiers([{ raw: r.text }]); }
      setStep("willow");
    } catch (e: any) { setError(e?.message ?? "Bud is shy today."); }
    finally { setBusy(false); }
  };

  const runWillow = async () => {
    setBusy(true); setError(null);
    try {
      const r = await invoke("willow", { prompt: `Hero image for this seed. Story:\n${story}` });
      setHero(r.image ?? null); setStep("done");
    } catch (e: any) { setError(e?.message ?? "Willow's brush is wet."); }
    finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen text-foreground" style={{
      background: "radial-gradient(1200px 600px at 10% -10%, rgba(34,197,94,0.18), transparent 60%), radial-gradient(900px 500px at 110% 10%, rgba(132,204,22,0.10), transparent 60%), #06070b",
    }}>
      <div className="container max-w-3xl mx-auto p-4 sm:p-6">
        <Link to="/dashboard" className="inline-flex items-center gap-2 mb-5 text-xs uppercase tracking-wider text-emerald-300/80 hover:text-emerald-200">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2"><Sprout className="h-7 w-7 text-emerald-400" /> Plant a Seed</h1>
        <p className="text-sm text-slate-400 mb-6">Five trees of the grove will guide you, one branch at a time.</p>

        <ol className="flex flex-wrap gap-2 mb-6">
          {STEP_ORDER.map((s) => {
            const idx = STEP_ORDER.indexOf(s);
            const cur = STEP_ORDER.indexOf(step);
            const state = idx < cur ? "done" : idx === cur ? "current" : "todo";
            return (
              <li key={s} className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                state === "current" ? "bg-emerald-700/40 border-emerald-400/60 text-emerald-50" :
                state === "done" ? "bg-emerald-900/40 border-emerald-700/40 text-emerald-300" :
                "bg-slate-900/40 border-slate-700/40 text-slate-500"
              }`}>{STEP_META[s].emoji} {STEP_META[s].name}</li>
            );
          })}
        </ol>

        {error && <div className="mb-4 px-4 py-2 rounded-lg text-sm text-red-300 bg-red-900/30 border border-red-700/40">{error}</div>}

        <section className="rounded-2xl p-5" style={{
          background: "linear-gradient(180deg, rgba(15,23,42,0.85), rgba(2,6,23,0.85))",
          border: "1px solid rgba(134,239,172,0.25)",
        }}>
          <header className="mb-3">
            <div className="text-xs uppercase tracking-wider text-emerald-300/70">{STEP_META[step].title}</div>
            <div className="text-lg font-semibold text-emerald-50">{STEP_META[step].emoji} {STEP_META[step].name}</div>
            <div className="text-xs text-slate-400 mt-1">{STEP_META[step].hint}</div>
          </header>

          {step === "acorn" && (
            <>
              <div className="space-y-2 mb-3 max-h-[360px] overflow-y-auto">
                {acornChat.map((m, i) => (
                  <div key={i} className={`text-sm rounded-xl px-3 py-2 max-w-[90%] whitespace-pre-wrap ${
                    m.role === "user" ? "ml-auto bg-emerald-900/40 text-emerald-50 border border-emerald-700/40"
                    : "mr-auto bg-slate-800/60 text-slate-100 border border-slate-700/40"
                  }`}>{m.content}</div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={acornInput} onChange={(e) => setAcornInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void sendAcorn(); } }}
                  placeholder="Answer Acorn…" disabled={busy}
                  className="flex-1 bg-slate-900/70 text-sm text-slate-100 rounded-lg px-3 py-2 border border-slate-700/50 focus:outline-none focus:border-emerald-500/50" />
                <button onClick={() => void sendAcorn()} disabled={busy || !acornInput.trim()}
                  className="px-3 rounded-lg bg-emerald-600/80 hover:bg-emerald-500/80 text-emerald-50 disabled:opacity-40 text-sm">Send</button>
              </div>
              <div className="mt-4 text-right">
                <button onClick={() => setStep("root")} disabled={acornChat.length < 4}
                  className="px-4 py-2 rounded-lg bg-emerald-700/60 hover:bg-emerald-600/70 text-emerald-50 text-sm disabled:opacity-40">Hand to Root →</button>
              </div>
            </>
          )}

          {step === "root" && (
            <button onClick={() => void runRoot()} disabled={busy}
              className="px-4 py-2 rounded-lg bg-emerald-700/70 text-emerald-50 text-sm">
              {busy ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "Forge identity with Root"}
            </button>
          )}

          {step === "maple" && (
            <>
              <pre className="bg-slate-900/60 p-3 rounded-lg text-xs text-emerald-200 overflow-auto mb-3">{JSON.stringify(identity, null, 2)}</pre>
              <button onClick={() => void runMaple()} disabled={busy}
                className="px-4 py-2 rounded-lg bg-emerald-700/70 text-emerald-50 text-sm">
                {busy ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "Have Maple write the story"}
              </button>
            </>
          )}

          {step === "bud" && (
            <>
              <div className="text-sm text-slate-200 whitespace-pre-wrap mb-3 bg-slate-900/60 p-3 rounded-lg">{story}</div>
              <button onClick={() => void runBud()} disabled={busy}
                className="px-4 py-2 rounded-lg bg-emerald-700/70 text-emerald-50 text-sm">
                {busy ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "Ask Bud for tiers"}
              </button>
            </>
          )}

          {step === "willow" && (
            <>
              <pre className="bg-slate-900/60 p-3 rounded-lg text-xs text-emerald-200 overflow-auto mb-3">{JSON.stringify(tiers, null, 2)}</pre>
              <button onClick={() => void runWillow()} disabled={busy}
                className="px-4 py-2 rounded-lg bg-emerald-700/70 text-emerald-50 text-sm">
                {busy ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "Let Willow paint the hero"}
              </button>
            </>
          )}

          {step === "done" && (
            <div className="space-y-3">
              {hero && <img src={hero} alt="Seed hero" className="rounded-xl border border-emerald-700/40" />}
              <div className="text-sm text-emerald-200">Your seed is gathered. Take this draft into the orchard create flow when you're ready.</div>
              <Link to="/create-orchard" className="inline-block px-4 py-2 rounded-lg bg-emerald-600/80 hover:bg-emerald-500/80 text-emerald-50 text-sm">Continue to Plant →</Link>
            </div>
          )}
        </section>

        {!user && <p className="text-xs text-amber-300 mt-4">Sign in to use the Grove agents.</p>}
      </div>
    </main>
  );
}
