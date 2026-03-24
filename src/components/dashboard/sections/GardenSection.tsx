import React, { useEffect, useState } from 'react';
import { Sprout, Plus, Eye, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { GradientPlaceholder } from '@/components/ui/GradientPlaceholder';

interface GardenSectionProps {
  theme: DashboardTheme;
}

export const GardenSection: React.FC<GardenSectionProps> = ({ theme }) => {
  const { user } = useAuth();
  const [myOrchards, setMyOrchards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchMyOrchards = async () => {
      const result: any = await supabase
        .from('orchards')
        .select('id, name, category, images, view_count, follower_count, status')
        .eq('sower_id', user.id)
        .order('created_at', { ascending: false })
        .limit(4);
      setMyOrchards(result.data || []);
      setLoading(false);
    };
    fetchMyOrchards();
  }, [user]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg" style={{ background: theme.secondaryButton }}>
            <Sprout className="w-4 h-4" style={{ color: theme.accent }} />
          </div>
          <h2 className="text-base font-bold" style={{ color: theme.textPrimary }}>
            My Garden
          </h2>
        </div>
        <Link to="/my-orchards" className="text-[11px] font-semibold flex items-center gap-0.5" style={{ color: theme.accent }}>
          See All <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Quick action */}
      <Link to="/create-orchard">
        <div
          className="rounded-xl p-3 border flex items-center gap-3 hover:scale-[1.01] transition-transform"
          style={{ background: theme.cardBg, borderColor: theme.cardBorder }}
        >
          <div className="p-2 rounded-full" style={{ background: theme.primaryButton }}>
            <Plus className="w-4 h-4" style={{ color: 'hsl(102 25% 25%)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>Plant a New Seed</p>
            <p className="text-[10px]" style={{ color: theme.textSecondary }}>Create an orchard and share your content</p>
          </div>
        </div>
      </Link>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: theme.accent, borderTopColor: 'transparent' }} />
        </div>
      ) : myOrchards.length === 0 ? (
        <div className="rounded-xl p-4 text-center border" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
          <p className="text-xs" style={{ color: theme.textSecondary }}>You haven't planted any seeds yet!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {myOrchards.map((orchard, i) => {
            const img = orchard.images?.[0];
            return (
              <motion.div
                key={orchard.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link to={`/orchard/${orchard.id}`}>
                  <div
                    className="rounded-xl border overflow-hidden"
                    style={{ background: theme.cardBg, borderColor: theme.cardBorder, boxShadow: `0 4px 12px ${theme.shadow}` }}
                  >
                    <div className="aspect-[4/3] relative">
                      {img ? (
                        <img src={img} alt={orchard.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <GradientPlaceholder title={orchard.name} className="w-full h-full" />
                      )}
                      <div
                        className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase"
                        style={{ background: orchard.status === 'active' ? 'rgba(76,175,80,0.8)' : 'rgba(255,152,0,0.8)', color: '#fff' }}
                      >
                        {orchard.status}
                      </div>
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-semibold truncate" style={{ color: theme.textPrimary }}>
                        {orchard.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] flex items-center gap-0.5" style={{ color: theme.textSecondary }}>
                          <Eye className="w-2.5 h-2.5" /> {orchard.view_count || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
