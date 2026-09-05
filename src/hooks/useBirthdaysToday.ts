import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BirthdayMember {
  user_id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  date_of_birth: string | null; // always null: profiles_public exposes only birthday_month/day
  age: number | null; // always null for the same reason
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

      // profiles_public exposes birthday_month/birthday_day only when the
      // member ticked show_birthday; date_of_birth itself never leaves the
      // locked profiles table.
      const { data, error } = await supabase
        .from('profiles_public')
        .select('user_id, display_name, first_name, last_name, avatar_url, birthday_month, birthday_day')
        .eq('birthday_month', today.getMonth() + 1)
        .eq('birthday_day', today.getDate());

      if (!alive) return;
      if (error || !data) {
        setMembers([]);
        setLoading(false);
        return;
      }

      const matches: BirthdayMember[] = data.map((p: any) => ({
        user_id: p.user_id,
        display_name: p.display_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Tribe member',
        first_name: p.first_name,
        last_name: p.last_name,
        avatar_url: p.avatar_url,
        date_of_birth: null,
        age: null,
      }));

      setMembers(matches);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  return { members, loading };
}
