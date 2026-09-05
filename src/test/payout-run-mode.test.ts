// payout-earnings body parser (audit 2026-09-05, P0-1).
//
// The function used to treat any unreadable body as {} and {} as a real
// run. These cases pin the replacement: unreadable -> rejected, anything
// short of an exact "confirm":"send" -> dry run.

import { describe, it, expect } from 'vitest';
import { parseRunMode } from '../../supabase/functions/payout-earnings/runMode';

describe('payout-earnings parseRunMode', () => {
  it('rejects an empty body', () => {
    expect(parseRunMode('')).toEqual({ ok: false, error: 'invalid_body' });
    expect(parseRunMode('   \n')).toEqual({ ok: false, error: 'invalid_body' });
    expect(parseRunMode(null)).toEqual({ ok: false, error: 'invalid_body' });
    expect(parseRunMode(undefined)).toEqual({ ok: false, error: 'invalid_body' });
  });

  it('rejects a body that is not JSON', () => {
    expect(parseRunMode('not json')).toEqual({ ok: false, error: 'invalid_body' });
    expect(parseRunMode('garbage')).toEqual({ ok: false, error: 'invalid_body' });
    // The exact shape produced by a shell that stripped the inner quotes.
    expect(parseRunMode('{dry_run:true}')).toEqual({ ok: false, error: 'invalid_body' });
  });

  it('rejects JSON that is not an object', () => {
    expect(parseRunMode('[]')).toEqual({ ok: false, error: 'invalid_body' });
    expect(parseRunMode('null')).toEqual({ ok: false, error: 'invalid_body' });
    expect(parseRunMode('"send"')).toEqual({ ok: false, error: 'invalid_body' });
    expect(parseRunMode('42')).toEqual({ ok: false, error: 'invalid_body' });
  });

  it('treats {} as a dry run (the old behaviour was a real run)', () => {
    expect(parseRunMode('{}')).toEqual({ ok: true, mode: 'dry' });
  });

  it('treats {"dry_run":true} and {"dry_run":false} as dry runs', () => {
    expect(parseRunMode('{"dry_run":true}')).toEqual({ ok: true, mode: 'dry' });
    expect(parseRunMode('{"dry_run":false}')).toEqual({ ok: true, mode: 'dry' });
  });

  it('sends only on exactly "confirm":"send"', () => {
    expect(parseRunMode('{"confirm":"send"}')).toEqual({ ok: true, mode: 'send' });
  });

  it('does not send on "confirm":"SEND" or other near-misses', () => {
    expect(parseRunMode('{"confirm":"SEND"}')).toEqual({ ok: true, mode: 'dry' });
    expect(parseRunMode('{"confirm":"Send"}')).toEqual({ ok: true, mode: 'dry' });
    expect(parseRunMode('{"confirm":true}')).toEqual({ ok: true, mode: 'dry' });
    expect(parseRunMode('{"confirm":"send "}')).toEqual({ ok: true, mode: 'dry' });
    expect(parseRunMode('{"Confirm":"send"}')).toEqual({ ok: true, mode: 'dry' });
  });

  it('dry run wins when both confirm:send and dry_run:true are present', () => {
    expect(parseRunMode('{"confirm":"send","dry_run":true}')).toEqual({ ok: true, mode: 'dry' });
    // dry_run:false does not veto an explicit confirm.
    expect(parseRunMode('{"confirm":"send","dry_run":false}')).toEqual({ ok: true, mode: 'send' });
  });
});
