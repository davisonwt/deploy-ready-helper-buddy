// Canonical data layer for "a sower's content" (seeds, music, books, videos,
// orchards). Every page that shows a sower's own content MUST go through
// `useMyContent` so account-scoping (linked accounts) and the seeds/products
// union stay consistent across the app.
//
// Three hooks:
//   - useMyContent()         → signed-in user's content across linked accounts
//   - useSowerContent(uid)   → public profile content for a specific user
//   - useTribeContent()      → all sowers' content (feed / search / browse)

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export type SeedRow = {
  id: string
  title: string | null
  description: string | null
  category: string | null
  images: string[]
  video_url: string | null
  created_at: string | null
}

export type MusicRow = {
  id: string
  track_title: string | null
  music_genre: string | null
  music_mood: string | null
  genre: string | null
  file_url: string | null
  cover_image_url: string | null
  image_urls: string[]
  created_at: string | null
  __table?: 'products' | 'dj_music_tracks'
}

export type BookRow = {
  id: string
  title: string | null
  description: string | null
  cover_image_url: string | null
  image_urls: string[] | null
  genre: string | null
  created_at: string | null
}

export type VideoRow = {
  id: string
  title: string | null
  description: string | null
  thumbnail_url: string | null
  video_url: string | null
  created_at: string | null
}

export type OrchardRow = {
  id: string
  user_id: string
  title: string | null
  description: string | null
  category: string | null
  images: string[] | null
  orchard_type: string | null
  status: string | null
  created_at: string | null
}

export type SowerContent = {
  seeds: SeedRow[]
  music: MusicRow[]
  books: BookRow[]
  videos: VideoRow[]
  orchards: OrchardRow[]
}

const EMPTY: SowerContent = {
  seeds: [], music: [], books: [], videos: [], orchards: [],
}

function firstImage(image_urls?: string[] | null, cover?: string | null) {
  if (Array.isArray(image_urls) && image_urls.length) return image_urls[0]
  return cover || null
}

/** Split the `get_my_dashboard_content` rows into typed buckets. */
function splitDashboardRows(rows: any[]): { seeds: SeedRow[]; music: MusicRow[]; books: BookRow[] } {
  const seeds: SeedRow[] = []
  const music: MusicRow[] = []
  const books: BookRow[] = []
  for (const row of rows || []) {
    const source = String(row.source || '').toLowerCase()
    const productType = source.startsWith('product:') ? source.replace('product:', '') : ''
    const type = productType || String(row.category || '').toLowerCase()
    if (source.startsWith('product:') && type === 'music') {
      music.push({
        id: row.id,
        track_title: row.title,
        music_genre: row.music_genre,
        music_mood: row.music_mood,
        genre: row.music_genre,
        file_url: row.file_url,
        cover_image_url: firstImage(row.image_urls, row.cover_image_url),
        image_urls: row.image_urls || [],
        created_at: row.created_at,
        __table: 'products',
      })
    } else if (source.startsWith('product:') && (type === 'ebook' || type === 'book')) {
      books.push({
        id: row.id,
        title: row.title,
        description: row.description,
        cover_image_url: row.cover_image_url,
        image_urls: row.image_urls,
        genre: row.category,
        created_at: row.created_at,
      })
    } else {
      seeds.push({
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        images: row.images || row.image_urls || (row.cover_image_url ? [row.cover_image_url] : []),
        video_url: row.video_url,
        created_at: row.created_at,
      })
    }
  }
  return { seeds, music, books }
}

/** Signed-in user's content across all linked accounts. Canonical source. */
export function useMyContent(userId: string | null | undefined) {
  const [data, setData] = useState<SowerContent>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!userId) { setData(EMPTY); return }
    setLoading(true); setError(null)
    try {
      const [rpcRes, orchardsRes, booksRes, vidsRes, djsRes, sowerRes] = await Promise.all([
        supabase.rpc('get_my_dashboard_content'),
        supabase.rpc('get_my_orchards_scoped'),
        supabase.from('sower_books')
          .select('id, title, description, cover_image_url, image_urls, genre, created_at')
          .eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
        supabase.from('community_videos')
          .select('id, title, description, thumbnail_url, video_url, created_at')
          .eq('uploader_id', userId).order('created_at', { ascending: false }).limit(50),
        supabase.from('radio_djs').select('id').eq('user_id', userId),
        supabase.from('sowers').select('id').eq('user_id', userId).maybeSingle(),
      ])

      if (rpcRes.error) console.warn('[useMyContent] get_my_dashboard_content failed:', rpcRes.error)
      if (orchardsRes.error) console.warn('[useMyContent] get_my_orchards_scoped failed:', orchardsRes.error)

      const { seeds, music: rpcMusic, books: rpcBooks } = splitDashboardRows(rpcRes.data || [])

      // Books: union RPC books with sower_books table, dedupe by id
      const baseBooks = (booksRes.data || []) as BookRow[]
      const bookIds = new Set(baseBooks.map(b => b.id))
      const books = [...baseBooks, ...rpcBooks.filter(b => !bookIds.has(b.id))]

      // Music: DJ tracks ∪ product-music rows
      const djIds = (djsRes.data || []).map((d: any) => d.id)
      const sowerId = sowerRes?.data?.id
      const [djTracks, prodMusic] = await Promise.all([
        djIds.length
          ? supabase.from('dj_music_tracks')
              .select('id, track_title, genre, file_url, cover_image_url, music_genre, music_mood, created_at')
              .in('dj_id', djIds).order('created_at', { ascending: false }).limit(100)
          : Promise.resolve({ data: [] as any[] }),
        sowerId
          ? supabase.from('products')
              .select('id, title, music_genre, music_mood, file_url, cover_image_url, image_urls, created_at')
              .eq('sower_id', sowerId).eq('type', 'music')
              .order('created_at', { ascending: false }).limit(200)
          : Promise.resolve({ data: [] as any[] }),
      ])
      const djRows: MusicRow[] = (djTracks.data || []).map((t: any) => ({
        id: t.id, track_title: t.track_title, music_genre: t.music_genre, music_mood: t.music_mood,
        genre: t.genre, file_url: t.file_url, cover_image_url: t.cover_image_url,
        image_urls: [], created_at: t.created_at, __table: 'dj_music_tracks' as const,
      }))
      const prodRows: MusicRow[] = (prodMusic.data || []).map((p: any) => ({
        id: p.id, track_title: p.title, music_genre: p.music_genre, music_mood: p.music_mood,
        genre: p.music_genre, file_url: p.file_url, cover_image_url: p.cover_image_url,
        image_urls: p.image_urls || [], created_at: p.created_at, __table: 'products' as const,
      }))
      const musicIds = new Set<string>()
      const music = [...djRows, ...prodRows, ...rpcMusic].filter(m => {
        if (musicIds.has(m.id)) return false
        musicIds.add(m.id); return true
      }).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())

      setData({
        seeds,
        music,
        books,
        videos: (vidsRes.data || []) as VideoRow[],
        orchards: (orchardsRes.data || []) as OrchardRow[],
      })
    } catch (e: any) {
      console.error('[useMyContent] failed', e)
      setError(e?.message || 'Failed to load content')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { refetch() }, [refetch])

  return { ...data, loading, error, refetch }
}

/** Public-profile content for a given sower (no account scoping — single user). */
export function useSowerContent(userId: string | null | undefined) {
  const [data, setData] = useState<SowerContent>(EMPTY)
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    if (!userId) { setData(EMPTY); return }
    setLoading(true)
    try {
      const sowerRow = await supabase.from('sowers').select('id').eq('user_id', userId).maybeSingle()
      const sowerId = sowerRow?.data?.id
      const [seedsRes, orchardsRes, booksRes, vidsRes, productsRes] = await Promise.all([
        supabase.from('seeds')
          .select('id, title, description, category, images, video_url, music_genre, music_mood, created_at')
          .eq('gifter_id', userId).order('created_at', { ascending: false }).limit(80),
        supabase.from('orchards')
          .select('id, user_id, title, description, category, images, orchard_type, status, created_at')
          .eq('user_id', userId).eq('status', 'active').order('created_at', { ascending: false }).limit(80),
        supabase.from('sower_books')
          .select('id, title, description, cover_image_url, image_urls, genre, created_at')
          .eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
        supabase.from('community_videos')
          .select('id, title, description, thumbnail_url, video_url, created_at')
          .eq('uploader_id', userId).order('created_at', { ascending: false }).limit(50),
        sowerId
          ? supabase.from('products')
              .select('id, title, description, type, category, image_urls, cover_image_url, file_url, music_genre, music_mood, artist_name, created_at')
              .eq('sower_id', sowerId)
              .order('created_at', { ascending: false }).limit(120)
          : Promise.resolve({ data: [] as any[] }),
      ])

      // Promote products into the three buckets
      const products = (productsRes.data || []) as any[]
      const seeds: SeedRow[] = (seedsRes.data || []) as SeedRow[]
      const music: MusicRow[] = []
      const books: BookRow[] = []
      for (const p of products) {
        const type = String(p.type || '').toLowerCase()
        if (type === 'music') {
          music.push({
            id: p.id, track_title: p.title, music_genre: p.music_genre, music_mood: p.music_mood,
            genre: p.music_genre, file_url: p.file_url, cover_image_url: p.cover_image_url,
            image_urls: p.image_urls || [], created_at: p.created_at, __table: 'products',
          })
        } else if (type === 'ebook' || type === 'book') {
          books.push({
            id: p.id, title: p.title, description: p.description, cover_image_url: p.cover_image_url,
            image_urls: p.image_urls, genre: p.category, created_at: p.created_at,
          })
        } else {
          seeds.push({
            id: p.id, title: p.title, description: p.description, category: p.category || p.type,
            images: p.image_urls || (p.cover_image_url ? [p.cover_image_url] : []),
            video_url: null, created_at: p.created_at,
          })
        }
      }

      setData({
        seeds,
        music,
        books: [...((booksRes.data || []) as BookRow[]), ...books],
        videos: (vidsRes.data || []) as VideoRow[],
        orchards: (orchardsRes.data || []) as OrchardRow[],
      })
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { refetch() }, [refetch])

  return { ...data, loading, refetch }
}

/** All sowers' content for feeds / search / browse — non-scoped. */
export function useTribeContent(limit = 50) {
  const [data, setData] = useState<SowerContent>(EMPTY)
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const [seedsRes, orchardsRes, productsRes] = await Promise.all([
        supabase.from('seeds')
          .select('id, title, description, category, images, video_url, music_genre, music_mood, created_at')
          .order('created_at', { ascending: false }).limit(limit),
        supabase.from('orchards')
          .select('id, user_id, title, description, category, images, orchard_type, status, created_at')
          .eq('status', 'active').order('created_at', { ascending: false }).limit(limit),
        supabase.from('products')
          .select('id, title, description, type, category, image_urls, cover_image_url, file_url, music_genre, music_mood, artist_name, created_at')
          .neq('status', 'archived').order('created_at', { ascending: false }).limit(limit * 2),
      ])

      const seeds: SeedRow[] = (seedsRes.data || []) as SeedRow[]
      const music: MusicRow[] = []
      const books: BookRow[] = []
      for (const p of (productsRes.data || []) as any[]) {
        const type = String(p.type || '').toLowerCase()
        if (type === 'music') {
          music.push({
            id: p.id, track_title: p.title, music_genre: p.music_genre, music_mood: p.music_mood,
            genre: p.music_genre, file_url: p.file_url, cover_image_url: p.cover_image_url,
            image_urls: p.image_urls || [], created_at: p.created_at, __table: 'products',
          })
        } else if (type === 'ebook' || type === 'book') {
          books.push({
            id: p.id, title: p.title, description: p.description, cover_image_url: p.cover_image_url,
            image_urls: p.image_urls, genre: p.category, created_at: p.created_at,
          })
        } else {
          seeds.push({
            id: p.id, title: p.title, description: p.description, category: p.category || p.type,
            images: p.image_urls || (p.cover_image_url ? [p.cover_image_url] : []),
            video_url: null, created_at: p.created_at,
          })
        }
      }

      setData({
        seeds, music, books, videos: [],
        orchards: (orchardsRes.data || []) as OrchardRow[],
      })
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => { refetch() }, [refetch])

  return { ...data, loading, refetch }
}
