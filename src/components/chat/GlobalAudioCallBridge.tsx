import { useEffect, FC } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCallManager } from '@/hooks/useCallManager';
import { useSimpleWebRTC } from '@/hooks/useSimpleWebRTC';
import { useLocation } from 'react-router-dom';

// Mounts hidden audio elements whenever a call is active so audio works on any route
const GlobalAudioCallBridge: FC = () => {
  // Temporarily disable to stop crash
  return null;
};

export default GlobalAudioCallBridge;
