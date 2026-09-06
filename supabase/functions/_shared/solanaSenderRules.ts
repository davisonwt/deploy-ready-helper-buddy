// P0-5 Phase C1: pure sender-resolution rules (no Deno, no network) so
// src/test/solana-sender.test.ts can exercise them. solanaSender.ts adds
// the fetch. Rule: at least two readings present, and none disagree.

export interface ParsedTxLike {
  meta?: {
    err?: unknown;
    preTokenBalances?: Array<{ accountIndex?: number; mint?: string; owner?: string; uiTokenAmount?: { amount?: string } }>;
  } | null;
  transaction?: {
    message?: {
      accountKeys?: Array<{ pubkey?: string } | string>;
      instructions?: Array<{
        program?: string;
        parsed?: {
          type?: string;
          info?: { mint?: string; destination?: string; source?: string; authority?: string; multisigAuthority?: string; tokenAmount?: { amount?: string }; amount?: string };
        };
      }>;
    };
  };
}

export interface SenderReadings {
  /** The transfer instruction's signing authority (owner of the source token account). */
  authority: string | null;
  /** Owner of the debited USDC account, from preTokenBalances. */
  preBalanceOwner: string | null;
  /** The source token account of the transfer. */
  sourceAta: string | null;
  /** Owner of sourceAta read from chain state (added by the fetch helper). */
  accountOwner?: string | null;
}

export interface SenderResolution extends SenderReadings {
  payer: string | null;
  source: "chain" | "unknown";
  reason: string | null;
}

/** Pure: the readings available inside one parsed transaction. */
export function readSenderFromParsedTx(tx: ParsedTxLike | null | undefined, mint: string, hotWalletAta: string, hotWalletOwner: string): SenderReadings {
  const out: SenderReadings = { authority: null, preBalanceOwner: null, sourceAta: null };
  if (!tx || tx.meta?.err) return out;
  for (const ix of tx.transaction?.message?.instructions ?? []) {
    if (ix.program !== "spl-token") continue;
    const p = ix.parsed;
    if (!p || (p.type !== "transferChecked" && p.type !== "transfer")) continue;
    const info = p.info ?? {};
    if (info.destination !== hotWalletAta) continue;
    if (p.type === "transferChecked" && info.mint && info.mint !== mint) continue;
    out.sourceAta = info.source ?? null;
    out.authority = info.authority ?? info.multisigAuthority ?? null;
    break;
  }
  const owners = new Set<string>();
  for (const b of tx.meta?.preTokenBalances ?? []) {
    if (b.mint !== mint || !b.owner || b.owner === hotWalletOwner) continue;
    owners.add(b.owner);
  }
  if (owners.size === 1) out.preBalanceOwner = [...owners][0];
  return out;
}

/** Pure: combine the readings into one answer or 'unknown'. */
export function decideSender(r: SenderReadings): SenderResolution {
  const present = [r.authority, r.preBalanceOwner, r.accountOwner ?? null].filter((v): v is string => !!v);
  const distinct = new Set(present);
  if (distinct.size > 1) {
    return { ...r, payer: null, source: "unknown", reason: `readings disagree: ${[...distinct].join(" vs ")}` };
  }
  if (present.length >= 2) {
    return { ...r, payer: present[0], source: "chain", reason: null };
  }
  return { ...r, payer: null, source: "unknown", reason: present.length === 1 ? "only one reading available" : "no USDC transfer into the hot wallet found" };
}

export function resolveSenderFromParsedTx(tx: ParsedTxLike | null | undefined, mint: string, hotWalletAta: string, hotWalletOwner: string): SenderResolution {
  return decideSender(readSenderFromParsedTx(tx, mint, hotWalletAta, hotWalletOwner));
}

