import React, { useState } from 'react';
import { Crown, ShieldCheck, Sparkles, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { SectionHeading } from './SectionHeading';
import { useElderCouncil } from '@/hooks/useElderCouncil';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props { theme: DashboardTheme; }

export const ElderCouncilSection: React.FC<Props> = ({ theme }) => {
  const { seats, mySeat, pendingTemplates, loading, reviewTemplate, isCouncilMember } = useElderCouncil();
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const handleReview = async (id: string, decision: 'approve' | 'reject') => {
    setReviewingId(id);
    const { error } = await reviewTemplate(id, decision);
    setReviewingId(null);
    if (error) toast.error('Could not record review');
    else toast.success(`Template ${decision === 'approve' ? 'approved' : 'rejected'}`);
  };

  return (
    <div className="space-y-4">
      <SectionHeading
        icon={Crown}
        title="Elder Council"
        subtitle={isCouncilMember ? 'You hold an active seat' : `${seats.length} active elders`}
        theme={theme}
        gradientColors={['#f59e0b', '#dc2626']}
      />

      {loading && <p className="text-xs text-muted-foreground text-center py-4">Loading council…</p>}

      {/* Roster */}
      {!loading && (
        <div className="rounded-2xl bg-card/80 border border-border/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Active Roster</p>
          {seats.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No elders seated yet. Top members by Tribal Score will be auto-seated.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {seats.map(seat => (
                <motion.div
                  key={seat.id}
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl bg-background/60 border border-border/30 p-2 text-center"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 mx-auto mb-1 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                    {seat.profile?.avatar_url ? (
                      <img src={seat.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (seat.profile?.display_name?.[0] || '?').toUpperCase()
                    )}
                  </div>
                  <p className="text-[11px] font-semibold text-foreground truncate">
                    {seat.profile?.display_name || 'Elder'}
                  </p>
                  <p className="text-[9px] text-muted-foreground capitalize">{seat.seat_type}</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Council member queue */}
      {isCouncilMember && (
        <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 to-rose-500/10 border border-amber-500/30 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-500" />
            <p className="text-xs font-bold text-foreground">Council Review Queue</p>
            <span className="text-[10px] text-muted-foreground ml-auto">{pendingTemplates.length} pending</span>
          </div>

          {pendingTemplates.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">Nothing waiting. Well done, elder. 🌿</p>
          ) : (
            pendingTemplates.map(tpl => (
              <div key={tpl.id} className="rounded-xl bg-background/80 border border-border/40 p-3">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-2xl">{tpl.icon || '🤖'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{tpl.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{tpl.category}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-3">{tpl.description}</p>
                <details className="mb-2">
                  <summary className="text-[10px] text-primary cursor-pointer">View prompt</summary>
                  <pre className="text-[10px] text-muted-foreground bg-muted/30 p-2 rounded mt-1 whitespace-pre-wrap">{tpl.prompt_template}</pre>
                </details>
                <div className="flex gap-2">
                  <Button
                    size="sm" className="flex-1"
                    disabled={reviewingId === tpl.id}
                    onClick={() => handleReview(tpl.id, 'approve')}
                  >
                    <Sparkles className="w-3 h-3 mr-1" /> Approve
                  </Button>
                  <Button
                    size="sm" variant="destructive" className="flex-1"
                    disabled={reviewingId === tpl.id}
                    onClick={() => handleReview(tpl.id, 'reject')}
                  >
                    <X className="w-3 h-3 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!isCouncilMember && !loading && (
        <p className="text-[11px] text-muted-foreground text-center px-4">
          Reach the Elder tier (750+ Tribal Score) to be auto-seated, or be appointed by GoSat admins.
        </p>
      )}
    </div>
  );
};
