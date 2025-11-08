export const isVerificationEnabled = (): boolean => {
  try {
    const local = localStorage.getItem('verification_enabled');
    if (local !== null) return local === 'true';
  } catch {}
  const envFlag = import.meta.env.VITE_REQUIRE_VERIFICATION;
  return envFlag === 'true' || envFlag === true;
};

export const getVerificationRedirectPath = (): string => {
  const path = import.meta.env.VITE_VERIFICATION_REDIRECT;
  return typeof path === 'string' && path.length > 0 ? path : '/chatapp';
};

export const setVerificationEnabled = (enabled: boolean) => {
  try {
    localStorage.setItem('verification_enabled', enabled ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('verificationSettingChanged', { detail: { enabled } }));
  } catch {}
};
