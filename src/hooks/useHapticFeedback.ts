/**
 * Haptic feedback hook for mobile-like interactions
 */
export function useHapticFeedback() {
  const vibrate = (pattern: number | number[]) => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  const lightTap = () => vibrate(10);
  const mediumTap = () => vibrate(50);
  const heavyTap = () => vibrate([50, 30, 50]);
  const success = () => vibrate([50, 30, 50]);
  const error = () => vibrate([100, 50, 100]);

  return {
    vibrate,
    lightTap,
    mediumTap,
    heavyTap,
    success,
    error,
  };
}

