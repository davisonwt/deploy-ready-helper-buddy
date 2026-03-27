import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Zap, Dumbbell, Users, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface LiveSessionData {
  id: string;
  title: string;
  description?: string | null;
  type: 'classroom' | 'skilldrop' | 'training';
  status: string;
  hostName: string;
  hostAvatar?: string | null;
  scheduledAt: string;
  maxParticipants?: number | null;
  pricingType?: string;
}

const typeConfig = {
  classroom: {
    icon: GraduationCap,
    label: 'Classroom',
    gradient: 'linear-gradient(135deg, hsl(192 91% 36%), hsl(187 92% 69%))',
    color: 'hsl(192 91% 36%)',
    href: (id: string) => `/communications-hub?session=${id}`,
  },
  skilldrop: {
    icon: Zap,
    label: 'SkillDrop',
    gradient: 'linear-gradient(135deg, hsl(221 83% 53%), hsl(263 70% 50%))',
    color: 'hsl(221 83% 53%)',
    href: (id: string) => `/explore-sessions?session=${id}`,
  },
  training: {
    icon: Dumbbell,
    label: 'Training',
    gradient: 'linear-gradient(135deg, hsl(263 70% 50%), hsl(330 81% 60%))',
    color: 'hsl(263 70% 50%)',
    href: (id: string) => `/communications-hub?session=${id}`,
  },
};

export const LiveSessionCard: React.FC<{ data: LiveSessionData }> = ({ data }) => {
  const config = typeConfig[data.type];
  const Icon = config.icon;
  const isLive = data.status === 'live' || data.status === 'active';
  const timeLabel = isLive
    ? 'LIVE NOW'
    : `Starts ${formatDistanceToNow(new Date(data.scheduledAt), { addSuffix: true })}`;

  return (
    <Link to={config.href(data.id)}>
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="rounded-2xl overflow-hidden border border-border/40 bg-card shadow-sm"
      >
        {/* Gradient header */}
        <div
          className="px-3 py-2 flex items-center justify-between"
          style={{ background: config.gradient }}
        >
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-white" />
            <span className="text-xs font-bold text-white">{config.label}</span>
          </div>
          {isLive && (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-[10px] font-bold text-white">LIVE</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3 space-y-2">
          <div className="flex items-start gap-2.5">
            <Avatar className="w-9 h-9 flex-shrink-0">
              <AvatarImage src={data.hostAvatar || undefined} />
              <AvatarFallback className="text-xs bg-muted">
                {data.hostName?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-foreground truncate">{data.title}</h3>
              <p className="text-xs text-muted-foreground">by {data.hostName}</p>
            </div>
          </div>

          {data.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{data.description}</p>
          )}

          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{timeLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              {data.maxParticipants && (
                <div className="flex items-center gap-0.5">
                  <Users className="w-3 h-3" />
                  <span>Max {data.maxParticipants}</span>
                </div>
              )}
              {data.pricingType && (
                <span className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                  {data.pricingType === 'free' ? 'Free' : data.pricingType === 'per_session' ? 'Paid' : 'Monthly'}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};
