import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AgentTemplate {
  id: string;
  author_id: string;
  name: string;
  description: string;
  category: string;
  icon: string | null;
  prompt_template: string;
  trigger_config: any;
  default_schedule: string | null;
  install_bestowal_amount: number;
  currency: string;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'archived';
  installs_count: number;
  rating_avg: number;
  rating_count: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentInstall {
  id: string;
  template_id: string;
  user_id: string;
  enabled: boolean;
  installed_at: string;
  run_count: number;
  last_run_at: string | null;
}

export function useAgentMarketplace() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [installs, setInstalls] = useState<AgentInstall[]>([]);
  const [myDrafts, setMyDrafts] = useState<AgentTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [tplRes, installRes, draftRes] = await Promise.all([
      supabase.from('agent_templates').select('*').eq('status', 'approved').order('is_featured', { ascending: false }).order('installs_count', { ascending: false }),
      user?.id
        ? supabase.from('agent_template_installs').select('*').eq('user_id', user.id)
        : Promise.resolve({ data: [] as AgentInstall[] }),
      user?.id
        ? supabase.from('agent_templates').select('*').eq('author_id', user.id).neq('status', 'approved')
        : Promise.resolve({ data: [] as AgentTemplate[] }),
    ]);
    setTemplates((tplRes.data || []) as AgentTemplate[]);
    setInstalls((installRes.data || []) as AgentInstall[]);
    setMyDrafts((draftRes.data || []) as AgentTemplate[]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const installTemplate = async (templateId: string, customConfig: any = {}) => {
    if (!user?.id) return { error: 'Not authenticated' };
    const { error } = await supabase.from('agent_template_installs').insert({
      template_id: templateId,
      user_id: user.id,
      custom_config: customConfig,
    });
    if (!error) await refresh();
    return { error };
  };

  const toggleInstall = async (installId: string, enabled: boolean) => {
    const { error } = await supabase.from('agent_template_installs').update({ enabled }).eq('id', installId);
    if (!error) await refresh();
    return { error };
  };

  const uninstall = async (installId: string) => {
    const { error } = await supabase.from('agent_template_installs').delete().eq('id', installId);
    if (!error) await refresh();
    return { error };
  };

  const submitTemplate = async (payload: Partial<AgentTemplate>) => {
    if (!user?.id) return { error: 'Not authenticated' };
    const { error } = await supabase.from('agent_templates').insert({
      author_id: user.id,
      name: payload.name!,
      description: payload.description!,
      category: payload.category || 'general',
      icon: payload.icon || '🤖',
      prompt_template: payload.prompt_template!,
      trigger_config: payload.trigger_config || {},
      default_schedule: payload.default_schedule || null,
      install_bestowal_amount: payload.install_bestowal_amount || 0,
      status: 'pending_review',
    });
    if (!error) await refresh();
    return { error };
  };

  return { templates, installs, myDrafts, loading, refresh, installTemplate, toggleInstall, uninstall, submitTemplate };
}
