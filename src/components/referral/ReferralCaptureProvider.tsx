import { useReferralCapture } from '@/hooks/useReferralCapture';

/**
 * Component that captures ?ref=CODE from URLs and stores in cookie.
 * Must be rendered inside a Router context.
 */
export function ReferralCaptureProvider() {
  useReferralCapture();
  return null;
}
