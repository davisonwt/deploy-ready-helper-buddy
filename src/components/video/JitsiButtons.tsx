import { useAuth } from '@/hooks/useAuth';
import { startJitsiCall } from './JitsiVideoWindow';

interface JitsiButtonProps {
  className?: string;
  orchardId?: string;
  orchardPassword?: string;
}

// 1. Start a Classroom / Lecture
export function StartClassroomButton({ className = '' }: JitsiButtonProps) {
  const handleStart = () => {
    startJitsiCall('Classroom-2025', 'Teacher Davison', 's2gclass123');
  };

  return (
    <button
      onClick={handleStart}
      className={`bg-gradient-to-r from-purple-600 to-teal-600 hover:scale-105 transition font-bold py-6 px-12 rounded-3xl shadow-2xl text-white ${className}`}
    >
      Start Live Classroom
    </button>
  );
}

// 2. Go Live on Radio
export function GoLiveRadioButton({ className = '' }: JitsiButtonProps) {
  const { user } = useAuth();
  const currentUserName = user?.first_name && user?.last_name 
    ? `${user.first_name} ${user.last_name}` 
    : user?.email?.split('@')[0] || 'DJ';

  const handleStart = () => {
    startJitsiCall('GardenRadioLive', `DJ ${currentUserName}`);
  };

  return (
    <button
      onClick={handleStart}
      className={`bg-gradient-to-r from-pink-600 to-yellow-600 hover:scale-105 transition font-bold py-6 px-12 rounded-3xl shadow-2xl text-white ${className}`}
    >
      Go Live on Radio
    </button>
  );
}

// 3. Private Orchard Voice Chat (only for people who bestowed)
export function OrchardVoiceChatButton({ 
  className = '', 
  orchardId, 
  orchardPassword 
}: JitsiButtonProps) {
  const { user } = useAuth();
  const currentUserName = user?.first_name && user?.last_name 
    ? `${user.first_name} ${user.last_name}` 
    : user?.email?.split('@')[0] || 'Sower';

  const handleStart = () => {
    if (!orchardId) {
      alert('Orchard ID is required');
      return;
    }
    startJitsiCall(`Orchard-${orchardId}`, currentUserName, orchardPassword || null);
  };

  return (
    <button
      onClick={handleStart}
      className={`garden-card relative overflow-hidden flex items-center justify-between bg-white/10 hover:bg-white/20 backdrop-blur-lg rounded-3xl p-6 transition-all hover:scale-105 shadow-xl text-white ${className}`}
    >
      <div>
        <div className="font-semibold text-lg">Orchard Voice Chat</div>
        <span className="text-teal-200 text-sm">Only for sowers who bestowed</span>
      </div>
    </button>
  );
}

// Export all buttons as a single object for easy importing
export const JitsiButtons = {
  StartClassroom: StartClassroomButton,
  GoLiveRadio: GoLiveRadioButton,
  OrchardVoiceChat: OrchardVoiceChatButton,
};

