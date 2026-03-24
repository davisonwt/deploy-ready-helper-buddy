import React, { useEffect, useState } from 'react';
import { TreePine, Eye, Heart, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { supabase } from '@/integrations/supabase/client';
import { GradientPlaceholder } from '@/components/ui/GradientPlaceholder';

interface BrowseSectionProps {
  theme: DashboardTheme;
}

export const BrowseSection: React.FC<BrowseSectionProps> = ({ theme }) => {
  const [orchards, setOrchards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrchards = async () => {
      const { data } = await supabase
        .from('orchards')
        .select('id, name, description, category, images, view_count, follower_count, status')
        .eq('status', 'active')
        .order('view_count', { ascending: false })
        .limit(6);
      setOrchards(data || []);
      setLoading(false);
    };
    fetchOrchards();
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg" style={{ background: theme.secondaryButton }}>
            <TreePine className="w-4 h-4" style={{ color: theme.accent }} />
          </div>
          <h2 className="text-base font-bold" style={{ color: theme.textPrimary }}>
            Browse Orchards
          </h2>
        </div>
        <Link to="/browse-orchards" className="text-[11px] font-semibold flex items-center gap-0.5" style={{ color: theme.accent }}>
          See All <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: theme.accent, borderTopColor: 'transparent' }} />
        </div>
      ) : orchards.length === 0 ? (
        <div className="rounded-xl p-4 text-center border" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
          <p className="text-xs" style={{ color: theme.textSecondary }}>No orchards yet — plant the first seed!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {orchards.map((orchard, i) => {
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
                    className="rounded-xl border overflow-hidden hover:scale-[1.02] transition-transform"
                    style={{ background: theme.cardBg, borderColor: theme.cardBorder, boxShadow: `0 4px 12px ${theme.shadow}` }}
                  >
                    <div className="aspect-[4/3] relative">
                      {img ? (
                        <img src={img} alt={orchard.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <GradientPlaceholder title={orchard.name} className="w-full h-full" />
                      )}
                      <div className="absolute bottom-1 right-1 flex gap-1">
                        {orchard.view_count > 0 && (
                          <span className="bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Eye className="w-2.5 h-2.5" /> {orchard.view_count}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-semibold truncate" style={{ color: theme.textPrimary }}>
                        {orchard.name}
                      </p>
                      {orchard.category && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full mt-1 inline-block" style={{ background: theme.secondaryButton, color: theme.accent }}>
                          {orchard.category}
                        </span>
                      )}
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
