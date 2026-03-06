import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface HostApplication {
  id: string;
  user_id: string;
  full_name: string;
  role_type: string;
  expertise_area: string;
  description: string | null;
  experience_summary: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export function useSkillDropHostApplication() {
  const { user } = useAuth();
  const [application, setApplication] = useState<HostApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchApplication = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('skilldrop_host_applications' as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      setApplication(data as any);
    } catch (err) {
      console.error('Error fetching host application:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchApplication(); }, [fetchApplication]);

  const submitApplication = async (formData: {
    full_name: string;
    role_type: string;
    expertise_area: string;
    description: string;
    experience_summary: string;
  }) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('skilldrop_host_applications' as any)
        .insert({
          user_id: user.id,
          ...formData,
          status: 'pending',
        } as any);
      if (error) throw error;
      await fetchApplication();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setSubmitting(false);
    }
  };

  const isApprovedHost = application?.status === 'approved';

  return { application, loading, submitting, submitApplication, isApprovedHost, refetch: fetchApplication };
}
