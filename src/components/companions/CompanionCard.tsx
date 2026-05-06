import { Lock } from "lucide-react";
import type { CompanionEntitlement } from "@/hooks/useCompanions";

interface Props {
  c: CompanionEntitlement;
  onOpen: () => void;
}

export default function CompanionCard({ c, onOpen }: Props) {
  const locked = c.mode === "none";
  const unlimited = c.monthly_quota == null && !locked;

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3 transition-all"
      style={{
        background:
          "linear-gradient(135deg, rgba(15,23,42,0.85), rgba(2,6,23,0.85))",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: locked
          ? "1px solid rgba(148,163,184,0.18)"
          : "1px solid rgba(134,239,172,0.25)",
        boxShadow: locked
          ? "0 4px 16px rgba(0,0,0,0.35)"
          : "0 8px 28px rgba(34,197,94,0.12), inset 0 1px 0 rgba(255,255,255,0.05)",
        opacity: locked ? 0.7 : 1,
      }}
    >
      <div className="flex items-start gap-3">
        <div className="text-3xl leading-none">{c.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-100 truncate">{c.name}</div>
          <div className="text-xs text-slate-400 truncate">{c.title}</div>
        </div>
        {locked ? (
          <Lock className="h-4 w-4 text-slate-500" />
        ) : (
          <span
            className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(34,197,94,0.15)",
              border: "1px solid rgba(134,239,172,0.4)",
              color: "#86efac",
            }}
          >
            {c.mode.replace("_", "+")}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-400 line-clamp-2">{c.summary}</p>
      <div className="flex items-center justify-between mt-auto pt-2">
        <span className="text-xs text-slate-500">
          {locked
            ? "Not in your tier"
            : unlimited
            ? "Unlimited this month"
            : `${c.remaining ?? 0} of ${c.monthly_quota} left`}
        </span>
        <button
          onClick={onOpen}
          disabled={locked}
          className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all disabled:cursor-not-allowed"
          style={{
            background: locked
              ? "rgba(148,163,184,0.08)"
              : "linear-gradient(135deg, rgba(22,163,74,0.3), rgba(34,197,94,0.22), rgba(132,204,22,0.28))",
            border: locked
              ? "1px solid rgba(148,163,184,0.2)"
              : "1px solid rgba(134,239,172,0.5)",
            color: locked ? "#94a3b8" : "#dcfce7",
            boxShadow: locked
              ? "none"
              : "0 4px 14px rgba(34,197,94,0.25), inset 0 1px 0 rgba(255,255,255,0.12)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          {locked ? "Upgrade" : "Open"}
        </button>
      </div>
    </div>
  );
}
