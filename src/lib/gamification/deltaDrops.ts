import { supabase } from '@/integrations/supabase/client';
import confetti from 'canvas-confetti';

export interface DeltaDropResult {
  success: boolean;
  usdcAmount?: number;
  xpAmount?: number;
  message?: string;
}

/**
 * Drop USDC and XP rewards when delta threshold is met
 */
export async function dropDeltaRewards(
  userId: string,
  deltaType: 'followers' | 'bestowals' | 'sowers',
  deltaValue: number
): Promise<DeltaDropResult> {
  if (deltaValue < 5) {
    return { success: false, message: 'Delta too low' };
  }

  const usdcAmount = 0.10;
  const xpAmount = 50;

  try {
    // Add USDC to user wallet (would need wallet integration)
    // For now, we'll log it
    console.log(`💰 Dropping ${usdcAmount} USDC to user ${userId} for ${deltaType} delta of ${deltaValue}`);

    // Add XP (would need XP system integration)
    console.log(`⭐ Adding ${xpAmount} XP to user ${userId}`);

    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#f59e0b', '#f97316', '#eab308'],
    });

    return {
      success: true,
      usdcAmount,
      xpAmount,
      message: `+${usdcAmount} USDC & +${xpAmount} XP!`,
    };
  } catch (error) {
    console.error('Error dropping rewards:', error);
    return {
      success: false,
      message: 'Failed to process rewards',
    };
  }
}

/**
 * Check streak and award mystery seed box
 */
export async function checkStreakReward(userId: string, streak: number): Promise<boolean> {
  if (streak >= 7) {
    try {
      // Award mystery seed box (would need inventory system)
      console.log(`🎁 Awarding mystery seed box to user ${userId} for ${streak} day streak`);
      
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#f97316', '#eab308', '#84cc16'],
      });

      return true;
    } catch (error) {
      console.error('Error awarding streak reward:', error);
      return false;
    }
  }
  return false;
}

/**
 * Trigger confetti for daily new followers milestone
 */
export function triggerConfettiForFollowers(count: number) {
  if (count >= 5) {
    confetti({
      particleCount: 200,
      spread: 90,
      origin: { y: 0.6 },
      colors: ['#10b981', '#34d399', '#6ee7b7'],
    });
  }
}

