import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BirthdayMember {
  user_id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  date_of_birth: string; // YYYY-MM-DD
  age: number | null;
}

const dayNames = ['Sun-day', 'Mon-day', 'Tues-day', 'Wednes-day', 'Thurs-day', 'Fri-day', 'Satur-day'];

export function dayCreatedLabel(dob: string): string {
  // Returns the weekday they were born on
  const d = new Date(dob + 'T12:00:00');
  return dayNames[d.getDay()];
}

export function useBirthdaysToday() {
  const [members, setMembers] = useState<BirthdayMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const today = new Date();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');

      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name, avatar_url, date_of_birth, show_birthday')
        .not('date_of_birth', 'is', null)
        .eq('show_birthday', true);

      if (!alive) return;
      if (error || !data) {
        setMembers([]);
        setLoading(false);
        return;
      }

      const matches: BirthdayMember[] = data
        .filter((p: any) => {
          if (!p.date_of_birth) return false;
          const [, m, d] = p.date_of_birth.split('-');
          return m === mm && d === dd;
        })
        .map((p: any) => {
          const [y] = p.date_of_birth.split('-').map(Number);
          const age = y ? today.getFullYear() - y : null;
          return {
            user_id: p.user_id,
            display_name: p.display_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Tribe member',
            first_name: p.first_name,
            last_name: p.last_name,
            avatar_url: p.avatar_url,
            date_of_birth: p.date_of_birth,
            age,
          };
        });

      setMembers(matches);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  return { members, loading };
}
