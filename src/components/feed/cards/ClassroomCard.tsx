import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

interface ClassroomData {
  id: string;
  title: string;
  instructor: string;
  instructorAvatar?: string;
  status: string;
  scheduledAt: string;
}

export const ClassroomCard: React.FC<{ data: ClassroomData }> = ({ data }) => {
  const isLive = data.status === 'live';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-card border border-border/30 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-s2g-purple/15 flex items-center justify-center flex-shrink-0">
          <GraduationCap className="w-5 h-5 text-s2g-purple" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isLive && (
              <span className="flex items-center gap-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                LIVE
              </span>
            )}
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              Classroom
            </span>
          </div>

          <p className="text-sm font-semibold text-foreground truncate">{data.title}</p>

          <div className="flex items-center gap-2 mt-1.5">
            <Avatar className="w-5 h-5">
              <AvatarImage src={data.instructorAvatar || undefined} />
              <AvatarFallback className="text-[8px]">{data.instructor.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{data.instructor}</span>
          </div>

          {!isLive && data.scheduledAt && (
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Starts {format(new Date(data.scheduledAt), 'MMM d, h:mm a')}
            </p>
          )}

          <Link to={`/explore-sessions?type=classroom`} className="mt-2 block">
            <Button size="sm" variant={isLive ? 'default' : 'outline'} className="text-xs h-7 rounded-lg w-full">
              {isLive ? 'Join Now' : 'View Details'}
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};
