// A tab running an old build after the API keys changed must be told to
// refresh, in plain words, instead of showing Supabase's raw error.

import { describe, it, expect } from 'vitest';
import { friendlyAuthError, isStaleBuildError, STALE_BUILD_MESSAGE } from '@/lib/staleBuild';

describe('stale build detection', () => {
  it('recognises the messages Supabase returns once the compiled key is no longer accepted', () => {
    expect(isStaleBuildError('Legacy API keys are disabled')).toBe(true);
    expect(isStaleBuildError('legacy api key is disabled')).toBe(true);
    expect(isStaleBuildError('Invalid API key')).toBe(true);
    expect(isStaleBuildError('No API key found in request')).toBe(true);
  });

  it('leaves real credential problems alone', () => {
    expect(isStaleBuildError('Invalid login credentials')).toBe(false);
    expect(isStaleBuildError('Email not confirmed')).toBe(false);
    expect(isStaleBuildError('')).toBe(false);
    expect(isStaleBuildError(undefined)).toBe(false);
    expect(isStaleBuildError({ message: 'Legacy API keys are disabled' })).toBe(false);
  });

  it('maps only the stale case to the refresh message', () => {
    expect(friendlyAuthError('Legacy API keys are disabled')).toBe(STALE_BUILD_MESSAGE);
    expect(friendlyAuthError('Invalid login credentials')).toBe('Invalid login credentials');
    expect(friendlyAuthError(undefined)).toBe('Login failed');
    expect(friendlyAuthError('', 'Guest access failed')).toBe('Guest access failed');
    expect(STALE_BUILD_MESSAGE).toMatch(/refresh the page/i);
  });
});
