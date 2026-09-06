// P0-5 Phase C3: every state a member or gosat can see has fixed words.

import { describe, it, expect } from 'vitest';
import {
  cancelRefusal,
  cancelSummary,
  explorerUrl,
  fundingStateLabel,
  isCancellable,
  maskAddress,
  pocketState,
  refundStatusLabel,
  shortRef,
} from '@/lib/orchards/refundLabels';

const SIG = '2iuoASMsL5sW82vnAMu1jMexZPA9pe8mdd9EAoyG7rxH4PAhPc9efNKtZtkTkq1uzXZ2KP7V9AZVvt9QLy5diHva';

describe('pocketState: what a bestower reads', () => {
  it('held / released / on its way', () => {
    expect(pocketState('held').label).toBe('Held for this orchard');
    expect(pocketState('released').label).toBe('Funded — released to the sower');
    expect(pocketState('refund_pending').label).toBe('Refund on its way');
    expect(pocketState('refund_failed').label).toBe('Refund on its way'); // a failed attempt is the gosat's problem
    expect(pocketState(undefined).label).toBe('Held for this orchard');
  });

  it('refunded on Solana links the transaction, devnet included', () => {
    const s = pocketState('refunded', { status: 'confirmed', rail: 'solana', rail_reference: SIG, environment: 'devnet' });
    expect(s.label).toMatch(/^Refunded to the wallet you paid from · tx 2iuoASMs…iHva$/);
    expect(s.reference).toBe(SIG);
    expect(s.referenceUrl).toBe(`https://solscan.io/tx/${SIG}?cluster=devnet`);
    expect(pocketState('refunded', { status: 'confirmed', rail: 'solana', rail_reference: SIG, environment: 'live' }).referenceUrl).toBe(`https://solscan.io/tx/${SIG}`);
  });

  it('refunded on PayPal names the ref and has no explorer link', () => {
    const s = pocketState('refunded', { status: 'confirmed', rail: 'paypal', rail_reference: 'PAYPAL-REFUND-1', environment: 'live' });
    expect(s.label).toBe('Refunded to your PayPal · ref PAYPAL-REFUND-1');
    expect(s.referenceUrl).toBeNull();
    expect(pocketState('refunded', null).label).toBe('Refunded');
  });

  it('written off asks the member to contact us', () => {
    expect(pocketState('written_off')).toMatchObject({ tone: 'problem', label: expect.stringMatching(/contact Sow2Grow/) });
  });
});

describe('orchard and refund states for the console', () => {
  it('funding states', () => {
    expect(fundingStateLabel('open').label).toBe('Open');
    expect(fundingStateLabel('funded').label).toBe('Fully funded');
    expect(fundingStateLabel('released').label).toBe('Funded & released');
    expect(fundingStateLabel('cancelling').label).toBe('Cancelling — refunds in progress');
    expect(fundingStateLabel('cancelled').label).toBe('Cancelled');
  });

  it('refund states, and which need a gosat', () => {
    expect(refundStatusLabel('confirmed')).toMatchObject({ label: 'Confirmed', needsGosat: false });
    expect(refundStatusLabel('failed')).toMatchObject({ label: 'Failed', needsGosat: true });
    expect(refundStatusLabel('needs_human')).toMatchObject({ label: 'Needs a human', needsGosat: true });
    expect(refundStatusLabel('sent').label).toBe('Sent, awaiting settlement');
    expect(refundStatusLabel('written_off').needsGosat).toBe(false);
  });

  it('cancel is allowed on open and funded only, and the refusal says why', () => {
    expect(isCancellable('open')).toBe(true);
    expect(isCancellable('funded')).toBe(true);
    expect(isCancellable('released')).toBe(false);
    expect(cancelRefusal('released')).toMatch(/already been paid/);
    expect(cancelRefusal('open', true)).toMatch(/already been paid/);
    expect(cancelRefusal('cancelling')).toMatch(/in progress/);
    expect(cancelRefusal('cancelled')).toBe('Already cancelled.');
    expect(cancelRefusal('open')).toBeNull();
  });

  it('the cancel sentence counts bestowers, money and rails from held holdings only', () => {
    const s = cancelSummary([
      { bestower_user_id: 'a', gross_amount: 10, rail: 'solana', status: 'held', payer_source: 'chain' },
      { bestower_user_id: 'a', gross_amount: '10.00', rail: 'paypal', status: 'held' },
      { bestower_user_id: 'b', gross_amount: 10, rail: 'solana', status: 'held', payer_source: 'unknown' },
      { bestower_user_id: 'c', gross_amount: 10, rail: 'solana', status: 'released' },
    ]);
    expect(s).toMatchObject({ bestowers: 2, holdings: 3, total: 30, unknownPayers: 1, byRail: { solana: 2, paypal: 1 } });
    expect(s.sentence).toBe('This refunds 2 bestowers a total of $30.00 on their original rails (solana ×2, paypal ×1).');
    expect(cancelSummary([]).sentence).toMatch(/nothing to refund/);
  });

  it('helpers', () => {
    expect(shortRef(SIG)).toBe('2iuoASMs…iHva');
    expect(shortRef('short')).toBe('short');
    expect(maskAddress('EbSUvuE8sstLCcGsMZqXb7rB6rvgpVR4dTqEZEi32ekx')).toBe('EbSU…2ekx');
    expect(maskAddress(null)).toBe('—');
    expect(explorerUrl('paypal', 'X', 'live')).toBeNull();
    expect(explorerUrl('solana', null, 'live')).toBeNull();
  });
});
