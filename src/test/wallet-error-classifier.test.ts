import { describe, it, expect } from 'vitest';
import { classifyError, SimulationFailedError } from '@/lib/payments/walletErrorClassifier';

// Written after the first real desktop Phantom attempt (2026-09-04): the
// RPC proxy's CORS preflight failed, web3.js surfaced "failed to get
// recent blockhash: TypeError: Failed to fetch", and the old classifier's
// bare includes('blockhash') called it a devnet/mainnet mismatch --
// Phantom was never involved. These pin the mapping.
describe('walletErrorClassifier', () => {
  it('a failed fetch to the payment service is service-unreachable, never a network mismatch', () => {
    const result = classifyError(
      new Error('failed to get recent blockhash: TypeError: Failed to fetch'),
    );
    expect(result.kind).toBe('service-unreachable');
    expect(result.message).toContain("Couldn't reach the payment service");
    expect(result.detail).toContain('Failed to fetch');
  });

  it('other transport failures map to service-unreachable too', () => {
    expect(classifyError(new TypeError('Failed to fetch')).kind).toBe('service-unreachable');
    expect(classifyError(new Error('NetworkError when attempting to fetch resource.')).kind).toBe('service-unreachable');
    expect(classifyError(new Error('Could not reach the payment service. Check your connection (or any ad/script blocker) and try again.')).kind).toBe('service-unreachable');
    expect(classifyError(new Error('rpc_unavailable')).kind).toBe('service-unreachable');
  });

  it('a blockhash-not-found simulation error IS a network mismatch', () => {
    const result = classifyError(new SimulationFailedError('"BlockhashNotFound"\n\nProgram log: none'));
    expect(result.kind).toBe('wrong-network');
    expect(result.message).toContain('devnet vs. mainnet');
  });

  it('any other simulation failure stays simulation-failed', () => {
    const result = classifyError(new SimulationFailedError('{"InstructionError":[1,"Custom(1)"]}'));
    expect(result.kind).toBe('simulation-failed');
  });

  it('user rejection in the wallet is rejected (cancelled), even though 4001 errors mention nothing else', () => {
    expect(classifyError({ code: 4001, message: 'User rejected the request.' }).kind).toBe('rejected');
    expect(classifyError(new Error('User rejected the request.')).kind).toBe('rejected');
  });

  it('genuine wallet cluster complaints still map to wrong-network', () => {
    expect(classifyError(new Error('Transaction simulation failed: Blockhash not found')).kind).toBe('wrong-network');
    expect(classifyError(new Error('genesis hash mismatch')).kind).toBe('wrong-network');
  });
});
