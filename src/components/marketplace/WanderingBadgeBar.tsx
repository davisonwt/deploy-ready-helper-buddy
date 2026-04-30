import { useNavigate } from 'react-router-dom';

export type WanderingRole =
  | 'field' | 'hand' | 'hearth' | 'pillow' | 'whisperer'
  | 'story' | 'heart' | 'forge' | 'wheel';

export interface WanderingBadge {
  key: WanderingRole;
  label: string;
  emoji: string;
  color: string;
  description: string;
  /** If set, tapping the badge routes here instead of filtering. */
  routeOverride?: string;
}

export const WANDERING_BADGES: WanderingBadge[] = [
  { key: 'field',     label: 'FIELD',     emoji: '🌾', color: '#ca8a04', description: 'Direct from farmers' },
  { key: 'hand',      label: 'HAND',      emoji: '🤲', color: '#16a34a', description: 'Skilled services' },
  { key: 'heart',     label: 'HEART',     emoji: '💚', color: '#dc2626', description: 'Tribal Hearts dating', routeOverride: '/tribal-hearts' },
  { key: 'pillow',    label: 'PILLOW',    emoji: '🛏️', color: '#db2777', description: 'Travel & stays' },
  { key: 'whisperer', label: 'WHISPERER', emoji: '🌬️', color: '#7c3aed', description: 'Marketers & content builders' },
  { key: 'story',     label: 'STORY',     emoji: '🎥', color: '#6366f1', description: 'Home videos' },
  { key: 'hearth',    label: 'HEARTH',    emoji: '🔥', color: '#f97316', description: 'Homesteaders' },
  { key: 'forge',     label: 'FORGE',     emoji: '⚒️', color: '#ea580c', description: 'Direct from factories' },
  { key: 'wheel',     label: 'WHEEL',     emoji: '🚗', color: '#0891b2', description: 'Vehicles' },
];

interface Props {
  activeRole: WanderingRole | null;
  onRoleChange: (role: WanderingRole | null) => void;
}

export default function WanderingBadgeBar({ activeRole, onRoleChange }: Props) {
  const navigate = useNavigate();

  const handleClick = (b: WanderingBadge) => {
    if (b.routeOverride) {
      navigate(b.routeOverride);
      return;
    }
    onRoleChange(activeRole === b.key ? null : b.key);
  };

  return (
    <div className="w-full overflow-x-auto pb-2 mb-4">
      <div className="flex gap-3 min-w-max px-1">
        {WANDERING_BADGES.map((b) => {
          const active = activeRole === b.key;
          return (
            <button
              key={b.key}
              onClick={() => handleClick(b)}
              title={b.description}
              className={`group flex flex-col items-center justify-center w-24 h-24 rounded-2xl border transition-all flex-shrink-0 ${
                active
                  ? 'border-2 scale-105'
                  : 'border-white/10 hover:border-white/30 hover:scale-105'
              }`}
              style={{
                background: active
                  ? `linear-gradient(135deg, ${b.color}33, ${b.color}11)`
                  : 'rgba(13, 17, 23, 0.6)',
                borderColor: active ? b.color : undefined,
                boxShadow: active ? `0 0 24px ${b.color}55` : undefined,
              }}
            >
              <div className="text-3xl mb-1" aria-hidden>{b.emoji}</div>
              <div
                className="text-[10px] font-bold tracking-widest"
                style={{ color: active ? b.color : '#94a3b8' }}
              >
                {b.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
