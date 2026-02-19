import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Hand, Check, X, Clock, MessageSquare } from 'lucide-react';

interface GuestRequest {
  id: string;
  guest_name?: string;
  request_message?: string;
  topic?: string;
  created_at: string;
  status: string;
  profiles?: { display_name?: string; avatar_url?: string };
}

interface GuestSpeakerQueueProps {
  requests: GuestRequest[];
  approvedGuests: GuestRequest[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isHost: boolean;
}

export const GuestSpeakerQueue: React.FC<GuestSpeakerQueueProps> = ({
  requests, approvedGuests, onApprove, onReject, isHost
}) => {
  if (!isHost || (requests.length === 0 && approvedGuests.length === 0)) return null;

  return (
    <Card className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-50/80 to-orange-50/80 dark:from-amber-950/20 dark:to-orange-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
          <Hand className="h-5 w-5" />
          Guest Speaker Queue
          {requests.length > 0 && (
            <Badge className="bg-amber-500 text-white animate-pulse">
              {requests.length} waiting
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Approved guests on air */}
        {approvedGuests.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">
              On Air
            </p>
            {approvedGuests.map(guest => (
              <div key={guest.id} className="flex items-center gap-3 p-2 rounded-lg bg-green-100/80 dark:bg-green-900/30 border border-green-300/50">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-green-200 text-green-800 text-xs">
                    {(guest.guest_name || guest.profiles?.display_name || 'G')[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium flex-1">
                  {guest.guest_name || guest.profiles?.display_name || 'Guest'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Pending requests */}
        <AnimatePresence>
          {requests.map((req, i) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3 p-3 rounded-xl bg-white/80 dark:bg-white/5 border shadow-sm"
            >
              <div className="flex flex-col items-center gap-1">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                    {(req.guest_name || req.profiles?.display_name || 'G')[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[10px] text-muted-foreground">#{i + 1}</span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {req.guest_name || req.profiles?.display_name || 'Listener'}
                </p>
                {(req.request_message || req.topic) && (
                  <div className="flex items-start gap-1 mt-1">
                    <MessageSquare className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {req.request_message || req.topic}
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <div className="flex gap-1.5 shrink-0">
                <Button
                  size="sm"
                  onClick={() => onApprove(req.id)}
                  className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReject(req.id)}
                  className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {requests.length === 0 && approvedGuests.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            No guests waiting. Listeners can raise their hand to speak.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
