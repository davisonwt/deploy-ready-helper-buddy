// src/hooks/callUtils.ts
/**
 * Utility functions and types for call management
 * Extracted for react-refresh compatibility (hooks-only exports in main file)
 */

export interface CallEvent {
  id: string;
  caller_id: string;
  receiver_id: string;
  caller_name?: string;
  receiver_name?: string;
  type: 'audio' | 'video';
  status: 'ringing' | 'accepted' | 'declined' | 'ended' | 'timeout' | 'busy';
  isIncoming: boolean;
  timestamp?: number;
  startTime?: number;
  room_id?: string;
}

export interface CallHistoryEntry {
  id: string;
  type: 'audio' | 'video';
  duration: number;
  timestamp: number;
  caller_name?: string;
  caller_id: string;
  receiver_id: string;
  receiver_name?: string;
  status: string;
}

export const CALL_CONSTANTS = {
  CHANNEL_PREFIX: 'user_calls_',
  MAX_CALL_DURATION: 3600000, // 1 hour in ms
  RING_TIMEOUT: 30000, // 30 seconds
  DUPLICATE_CALL_THRESHOLD: 15000, // 15 seconds
  STALE_CALL_THRESHOLD: 60000, // 60 seconds
  PREMATURE_END_GRACE: 60000, // 60 seconds
  POLL_INTERVAL: 2500, // 2.5 seconds
  HISTORY_LIMIT: 50
} as const;

/**
 * Intentional no-op for placeholder logic
 */
export const noop = (): void => {
  // Intentional no-op for default handlers
};

/**
 * Checks if a call timestamp is stale
 */
export const isCallStale = (timestamp: number, threshold = CALL_CONSTANTS.STALE_CALL_THRESHOLD): boolean => {
  return (Date.now() - timestamp) > threshold;
};

/**
 * Checks if a call is a duplicate based on tracking
 */
export const isDuplicateCall = (
  callId: string,
  lastCallId: string | null,
  lastTimestamp: number,
  threshold = CALL_CONSTANTS.DUPLICATE_CALL_THRESHOLD
): boolean => {
  if (callId !== lastCallId) return false;
  return (Date.now() - lastTimestamp) < threshold;
};

/**
 * Safe async wrapper for error handling in call operations
 */
export const safeAsyncCall = async <T>(
  operation: () => Promise<T>,
  errorHandler: (error: unknown) => void
): Promise<T | null> => {
  try {
    return await operation();
  } catch (error) {
    errorHandler(error);
    return null;
  }
};
