// P0-5 Phase C1: the refund destination is the wallet that paid, read from
// the confirmed transaction. Two independent readings must agree.

import { describe, it, expect } from 'vitest';
import { decideSender, readSenderFromParsedTx, resolveSenderFromParsedTx, type ParsedTxLike } from '../../supabase/functions/_shared/solanaSenderRules';

const MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
const HOT = '6zbpF3HQbxFVMfUPMRzZZ52nwA7PSvqeq2Cqibq2BcxZ';
const HOT_ATA = '7h8NWW5whNQt6n3W8j28mgdgiy2g2JvLb7qJ5DbzDC4r';
const PAYER = 'EbSUvuE8sstLCcGsMZqXb7rB6rvgpVR4dTqEZEi32ekx';
const PAYER_ATA = 'HEZvrLGL18GcbGhoik1q2iBUWY81bY5DhJagBXqY9q3m';

// Shape of the real devnet pocket transaction eFkR7VNu... (2026-09-06).
function tx(over: Partial<{ authority: string | null; preOwner: string | null; type: string; dest: string; mint: string; err: unknown }> = {}): ParsedTxLike {
  const authority = over.authority === undefined ? PAYER : over.authority;
  const preOwner = over.preOwner === undefined ? PAYER : over.preOwner;
  return {
    meta: {
      err: over.err ?? null,
      preTokenBalances: [
        ...(preOwner ? [{ accountIndex: 2, mint: over.mint ?? MINT, owner: preOwner, uiTokenAmount: { amount: '33070000' } }] : []),
        { accountIndex: 3, mint: over.mint ?? MINT, owner: HOT, uiTokenAmount: { amount: '17980000' } },
      ],
    },
    transaction: {
      message: {
        instructions: [
          { program: 'spl-associated-token-account', parsed: { type: 'createIdempotent', info: {} } },
          {
            program: 'spl-token',
            parsed: {
              type: over.type ?? 'transferChecked',
              info: { mint: over.mint ?? MINT, source: PAYER_ATA, destination: over.dest ?? HOT_ATA, tokenAmount: { amount: '10010000' }, ...(authority ? { authority } : {}) },
            },
          },
        ],
      },
    },
  };
}

describe('sender resolution from a parsed transaction', () => {
  it('the real pocket: authority and pre-balance owner agree -> chain', () => {
    const r = resolveSenderFromParsedTx(tx(), MINT, HOT_ATA, HOT);
    expect(r).toMatchObject({ payer: PAYER, source: 'chain', sourceAta: PAYER_ATA, authority: PAYER, preBalanceOwner: PAYER });
  });

  it('a multisig authority is read the same way', () => {
    const t = tx({ authority: null });
    (t.transaction!.message!.instructions![1].parsed!.info as Record<string, unknown>).multisigAuthority = PAYER;
    expect(resolveSenderFromParsedTx(t, MINT, HOT_ATA, HOT).payer).toBe(PAYER);
  });

  it('disagreeing readings are unknown, never a guess', () => {
    const r = resolveSenderFromParsedTx(tx({ preOwner: 'BQSToMoC2iDperPSkYXVCFfgiF3LsKMxJ3iHXJhemRYw' }), MINT, HOT_ATA, HOT);
    expect(r.source).toBe('unknown');
    expect(r.payer).toBeNull();
    expect(r.reason).toMatch(/disagree/);
  });

  it('one reading alone is not enough; the on-chain account owner can be the second', () => {
    const readings = readSenderFromParsedTx(tx({ preOwner: null }), MINT, HOT_ATA, HOT);
    expect(decideSender(readings)).toMatchObject({ source: 'unknown', reason: 'only one reading available' });
    expect(decideSender({ ...readings, accountOwner: PAYER })).toMatchObject({ source: 'chain', payer: PAYER });
    expect(decideSender({ ...readings, accountOwner: 'someoneElse' }).source).toBe('unknown');
  });

  it('a transfer to some other account, another mint, or a failed transaction is unknown', () => {
    expect(resolveSenderFromParsedTx(tx({ dest: 'otherAta' }), MINT, HOT_ATA, HOT).source).toBe('unknown'); // pre-balance alone is one reading
    expect(resolveSenderFromParsedTx(tx({ dest: 'otherAta', preOwner: null }), MINT, HOT_ATA, HOT).reason).toMatch(/no USDC transfer/);
    expect(resolveSenderFromParsedTx(tx({ mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' }), MINT, HOT_ATA, HOT).source).toBe('unknown');
    expect(resolveSenderFromParsedTx(tx({ err: { InstructionError: [1, 'x'] } }), MINT, HOT_ATA, HOT).source).toBe('unknown');
    expect(resolveSenderFromParsedTx(null, MINT, HOT_ATA, HOT).source).toBe('unknown');
  });

  it('a plain transfer (no mint field) into our account still resolves', () => {
    const t = tx({ type: 'transfer' });
    delete (t.transaction!.message!.instructions![1].parsed!.info as Record<string, unknown>).mint;
    expect(resolveSenderFromParsedTx(t, MINT, HOT_ATA, HOT).payer).toBe(PAYER);
  });
});
