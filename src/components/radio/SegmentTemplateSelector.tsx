import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shuffle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SegmentItem {
  type: string;
  title: string;
  duration: number;
  emoji: string;
  color: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  segments_json: SegmentItem[];
}

interface SegmentTemplateSelectorProps {
  onSelectTemplate: (segments: SegmentItem[]) => void;
  selectedTemplateId?: string | null;
}

export const SegmentTemplateSelector: React.FC<SegmentTemplateSelectorProps> = ({
  onSelectTemplate,
  selectedTemplateId,
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeId, setActiveId] = useState<string | null>(selectedTemplateId ?? null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('radio_segment_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at');
      if (data) setTemplates(data as unknown as Template[]);
    };
    load();
  }, []);

  const handleSelect = (t: Template) => {
    setActiveId(t.id);
    onSelectTemplate(t.segments_json);
  };

  if (templates.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">
        Choose a template or build from scratch
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AnimatePresence>
          {templates.map((t) => (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              type="button"
              onClick={() => handleSelect(t)}
              className={`text-left p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
                activeId === t.id
                  ? 'border-primary bg-primary/10 shadow-md'
                  : 'border-border bg-card hover:border-primary/40'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{t.icon}</span>
                <span className="font-semibold text-sm">{t.name}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {t.segments_json.slice(0, 5).map((s, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-[10px] px-1.5 py-0"
                    style={{ borderColor: s.color, color: s.color }}
                  >
                    {s.emoji}
                  </Badge>
                ))}
                {t.segments_json.length > 5 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    +{t.segments_json.length - 5}
                  </Badge>
                )}
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
