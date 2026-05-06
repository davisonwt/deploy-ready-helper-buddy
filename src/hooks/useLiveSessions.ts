import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export type LiveKind =
  | 'radio'
  | 'one_on_one'
  | 'community_chat'
  | 'classroom'
  | 'skilldrop'
  | 'training'

export interface LiveSession {
  id: string
  kind: LiveKind
  title: string
  description?: string | null
  hostName: string
  hostAvatar?: string | null
  count: number
  startedAt: string | null
  joinPath: string
}

const KIND_LABELS: Record<LiveKind, string> = {
  radio: 'Radio',
  one_on_one: '1-on-1 Live',
  community_chat: 'Community Chat',
  classroom: 'Classroom',
  skilldrop: 'SkillDrop',
  training: 'Training',
}

export function liveKindLabel(k: LiveKind) {
  return KIND_LABELS[k]
}

const liveStatusValues = ['live', 'active', 'broadcasting', 'started']

async function fetchProfiles(ids: string[]) {
  const clean = Array.from(new Set(ids.filter(Boolean)))
  if (!clean.length) return new Map<string, any>()
  const { data } = await supabase
    .from('profiles')
    .select('id, user_id, display_name, first_name, last_name, avatar_url')
    .or(`id.in.(${clean.join(',')}),user_id.in.(${clean.join(',')})`)
  const map = new Map<string, any>()
  ;(data || []).forEach((p: any) => {
    if (p.id) map.set(p.id, p)
    if (p.user_id) map.set(p.user_id, p)
  })
  return map
}

const nameOf = (p: any) =>
  p?.display_name ||
  `${p?.first_name || ''} ${p?.last_name || ''}`.trim() ||
  'Tribe Host'

async function loadAll(): Promise<LiveSession[]> {
  const [radio, oneOnOne, community, classroom, skilldrop, training] =
    await Promise.all([
      supabase
        .from('radio_live_sessions' as any)
        .select('id, status, started_at, current_listeners, schedule_id')
        .in('status', liveStatusValues)
        .limit(50),
      supabase
        .from('live_rooms' as any)
        .select('id, name, description, current_participants, created_by, created_at, is_active')
        .eq('is_active', true)
        .limit(50),
      supabase
        .from('chat_rooms' as any)
        .select('id, name, description, current_listeners, created_by, created_at, is_active, room_type')
        .eq('is_active', true)
        .neq('is_system_room', true)
        .limit(50),
      supabase
        .from('classroom_sessions' as any)
        .select('id, title, description, instructor_id, scheduled_at, status')
        .in('status', liveStatusValues)
        .limit(50),
      supabase
        .from('skilldrop_sessions' as any)
        .select('id, title, description, presenter_id, scheduled_at, status, attendees_count')
        .in('status', liveStatusValues)
        .limit(50),
      supabase
        .from('premium_rooms' as any)
        .select('id, title, description, creator_id, created_at')
        .limit(50),
    ])

  // Resolve hosts
  const hostIds: string[] = [
    ...((oneOnOne.data as any[]) || []).map((r) => r.created_by),
    ...((community.data as any[]) || []).map((r) => r.created_by),
    ...((classroom.data as any[]) || []).map((r) => r.instructor_id),
    ...((skilldrop.data as any[]) || []).map((r) => r.presenter_id),
    ...((training.data as any[]) || []).map((r) => r.creator_id),
  ].filter(Boolean)
  const profiles = await fetchProfiles(hostIds)

  // Radio host: try radio_djs via schedule
  const scheduleIds = ((radio.data as any[]) || [])
    .map((r) => r.schedule_id)
    .filter(Boolean)
  let djByScheduleId = new Map<string, any>()
  if (scheduleIds.length) {
    const { data: schedules } = await supabase
      .from('radio_schedule' as any)
      .select('id, dj_id, show_title')
      .in('id', scheduleIds)
    const djIds = (schedules || []).map((s: any) => s.dj_id).filter(Boolean)
    let djMap = new Map<string, any>()
    if (djIds.length) {
      const { data: djs } = await supabase
        .from('radio_djs')
        .select('id, dj_name, avatar_url, user_id')
        .in('id', djIds)
      djMap = new Map((djs || []).map((d: any) => [d.id, d]))
    }
    ;(schedules || []).forEach((s: any) =>
      djByScheduleId.set(s.id, { ...s, dj: djMap.get(s.dj_id) })
    )
  }

  const out: LiveSession[] = []

  ;((radio.data as any[]) || []).forEach((r) => {
    const meta = djByScheduleId.get(r.schedule_id)
    const dj = meta?.dj
    out.push({
      id: r.id,
      kind: 'radio',
      title: meta?.show_title || 'Live Radio Session',
      hostName: dj?.dj_name || 'Tribe DJ',
      hostAvatar: dj?.avatar_url || null,
      count: r.current_listeners || 0,
      startedAt: r.started_at,
      joinPath: `/radio-sessions?session=${r.id}`,
    })
  })

  ;((oneOnOne.data as any[]) || []).forEach((r) => {
    const p = profiles.get(r.created_by)
    out.push({
      id: r.id,
      kind: 'one_on_one',
      title: r.name || '1-on-1 Live',
      description: r.description,
      hostName: nameOf(p),
      hostAvatar: p?.avatar_url || null,
      count: r.current_participants || 0,
      startedAt: r.created_at,
      joinPath: `/live-rooms?room=${r.id}`,
    })
  })

  ;((community.data as any[]) || []).forEach((r) => {
    const p = profiles.get(r.created_by)
    out.push({
      id: r.id,
      kind: 'community_chat',
      title: r.name || 'Community Chat',
      description: r.description,
      hostName: nameOf(p),
      hostAvatar: p?.avatar_url || null,
      count: r.current_listeners || 0,
      startedAt: r.created_at,
      joinPath: `/chatapp?room=${r.id}`,
    })
  })

  ;((classroom.data as any[]) || []).forEach((r) => {
    const p = profiles.get(r.instructor_id)
    out.push({
      id: r.id,
      kind: 'classroom',
      title: r.title || 'Classroom',
      description: r.description,
      hostName: nameOf(p),
      hostAvatar: p?.avatar_url || null,
      count: 0,
      startedAt: r.scheduled_at,
      joinPath: `/communications-hub?session=${r.id}&kind=classroom`,
    })
  })

  ;((skilldrop.data as any[]) || []).forEach((r) => {
    const p = profiles.get(r.presenter_id)
    out.push({
      id: r.id,
      kind: 'skilldrop',
      title: r.title || 'SkillDrop',
      description: r.description,
      hostName: nameOf(p),
      hostAvatar: p?.avatar_url || null,
      count: r.attendees_count || 0,
      startedAt: r.scheduled_at,
      joinPath: `/communications-hub?session=${r.id}&kind=skilldrop`,
    })
  })

  ;((training.data as any[]) || []).forEach((r) => {
    const p = profiles.get(r.creator_id)
    out.push({
      id: r.id,
      kind: 'training',
      title: r.title || 'Training Room',
      description: r.description,
      hostName: nameOf(p),
      hostAvatar: p?.avatar_url || null,
      count: 0,
      startedAt: r.created_at,
      joinPath: `/premium-rooms/${r.id}`,
    })
  })

  return out.sort(
    (a, b) =>
      new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime()
  )
}

export function useLiveSessions(kind?: LiveKind | null) {
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [loading, setLoading] = useState(true)
  const cancelledRef = useRef(false)

  const refresh = useCallback(async () => {
    try {
      const all = await loadAll()
      if (cancelledRef.current) return
      setSessions(all)
    } catch (e) {
      console.warn('[useLiveSessions] failed', e)
    } finally {
      if (!cancelledRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    cancelledRef.current = false
    refresh()
    const iv = setInterval(refresh, 30_000)
    // realtime-ish: also listen to radio + live_rooms
    const ch = supabase
      .channel('live-sessions-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'radio_live_sessions' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_rooms' }, refresh)
      .subscribe()
    return () => {
      cancelledRef.current = true
      clearInterval(iv)
      supabase.removeChannel(ch)
    }
  }, [refresh])

  const filtered = kind ? sessions.filter((s) => s.kind === kind) : sessions
  const byKind = sessions.reduce((acc, s) => {
    acc[s.kind] = (acc[s.kind] || 0) + 1
    return acc
  }, {} as Record<LiveKind, number>)

  return {
    sessions: filtered,
    all: sessions,
    total: sessions.length,
    byKind,
    loading,
    refresh,
  }
}
