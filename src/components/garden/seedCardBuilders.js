// src/components/garden/seedCardBuilders.js
// Shared "row → card" mappers so Dashboard sliders and My Garden sections
// stay perfectly in sync. Caller provides handlers (edit/delete/repost/park).

const FALLBACK_IMG = {
  seed:    'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80',
  orchard: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80',
  music:   'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80',
  book:    'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=800&q=80',
  video:   'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80',
}

const firstImage = (...sources) => {
  for (const source of sources) {
    if (Array.isArray(source)) {
      const found = source.find(Boolean)
      if (found) return found
    } else if (source) {
      return source
    }
  }
  return null
}

const RATE_UNIT_LABEL = {
  per_hour: 'per hour',
  per_job: 'per job',
  callout_quote: 'call-out fee + quote',
}

// Kind-specific badge/subtitle/open-path overrides for products.kind rows
// riding through the generic "seed" card (see SeedRow.kind in
// sowerContent.ts) — only Hand exists live today; Wheel/Pillow slot in
// here the same way once those forms ship.
const KIND_CARD_META = {
  hand: {
    badge: { emoji: '🤲', label: 'hand', color: '#16a34a' },
    openPath: (id) => `/seed/hand/${id}`,
    subtitle: (s) => {
      const unit = RATE_UNIT_LABEL[s.service_details?.rate_unit] ?? s.service_details?.rate_unit
      return s.price != null ? `$${Number(s.price).toFixed(2)} ${unit || ''}`.trim() : (s.description || s.category)
    },
  },
}

export function buildSeedCard(s, handlers = {}) {
  const images = Array.isArray(s.images) ? s.images.filter(Boolean) : []
  const kindMeta = s.kind ? KIND_CARD_META[s.kind] : null
  return {
    id: `seed-${s.id}`,
    rawId: s.id,
    title: s.title || 'Untitled Seed',
    subtitle: kindMeta ? kindMeta.subtitle(s) : (s.description || s.category || 'A seed you planted'),
    image: images[0] || FALLBACK_IMG.seed,
    images,
    badge: kindMeta ? kindMeta.badge : { emoji: '🌱', label: 'mine', color: '#22c55e' },
    openPath: kindMeta ? kindMeta.openPath(s.id) : `/seed/${s.id}`,
    liveKey: s.id,
    mediaKind: 'seed',
    mine: true,
    seedRow: s,
    whispererSharePct: Number(s.whisperer_share_pct ?? 10),
    ...handlers,
  }
}

export function buildOrchardCard(o, handlers = {}, opts = {}) {
  const images = Array.isArray(o.images) ? o.images.filter(Boolean) : []
  return {
    id: `orchard-${o.id}`,
    rawId: o.id,
    title: o.title || 'My Orchard',
    subtitle: o.description || o.category || 'An orchard you are growing',
    image: images[0] || FALLBACK_IMG.orchard,
    images,
    badge: opts.bestowed
      ? { emoji: '💚', label: 'bestowed', color: '#4ade80' }
      : { emoji: '🌳', label: 'mine', color: '#22c55e' },
    openPath: `/animated-orchard/${o.id}`,
    liveKey: `orchard:${o.id}`,
    mediaKind: 'orchard',
    mine: !opts.bestowed,
    seedRow: o,
    whispererSharePct: Number(o.whisperer_share_pct ?? 10),
    ...handlers,
  }
}

export function buildMusicCard(m, handlers = {}) {
  const images = Array.isArray(m.image_urls) ? m.image_urls.filter(Boolean) : []
  const coverImage = firstImage(images, m.cover_image_url, m.cover_url) || FALLBACK_IMG.music
  return {
    id: `music-${m.id}`,
    rawId: m.id,
    title: m.track_title || 'Untitled Track',
    subtitle: m.music_mood || m.music_genre || m.genre || 'A song you have sown',
    image: coverImage,
    images: images.length ? images : [firstImage(m.cover_image_url, m.cover_url)].filter(Boolean),
    badge: { emoji: '🎵', label: 'music', color: '#38bdf8' },
    openPath: `/music-library`,
    liveKey: `music:${m.id}`,
    mediaKind: 'audio',
    mediaUrl: m.file_url,
    // Owner playback goes through get-seed-file (productId) rather than the
    // raw file_url above, which a bare <audio src> can't load from a
    // private bucket; preview_url is the fallback if that fails.
    previewUrl: m.preview_url ?? null,
    productId: m.__table === 'products' ? m.id : null,
    mine: true,
    seedRow: m,
    whispererSharePct: Number(m.whisperer_share_pct ?? 10),
    ...handlers,
  }
}

export function buildBookCard(b, handlers = {}) {
  const images = [b.cover_image_url, ...(Array.isArray(b.image_urls) ? b.image_urls : [])].filter(Boolean)
  return {
    id: `book-${b.id}`,
    rawId: b.id,
    title: b.title || 'Untitled Book',
    subtitle: b.description || b.genre || 'A book you have written',
    image: images[0] || FALLBACK_IMG.book,
    images,
    badge: { emoji: '📚', label: 'book', color: '#fb923c' },
    openPath: `/my-s2g-library`,
    liveKey: `book:${b.id}`,
    mediaKind: 'book',
    mine: true,
    seedRow: b,
    whispererSharePct: Number(b.whisperer_share_pct ?? 10),
    ...handlers,
  }
}

export function buildVideoCard(v, handlers = {}) {
  return {
    id: `video-${v.id}`,
    rawId: v.id,
    title: v.title || 'Untitled Video',
    subtitle: v.description || 'A video you have shared',
    image: v.thumbnail_url || v.video_url || FALLBACK_IMG.video,
    images: [v.thumbnail_url].filter(Boolean),
    badge: { emoji: '🎬', label: 'video', color: '#f87171' },
    openPath: `/community-videos`,
    liveKey: `video:${v.id}`,
    mediaKind: 'video',
    mediaUrl: v.video_url,
    mine: true,
    seedRow: v,
    whispererSharePct: Number(v.whisperer_share_pct ?? 10),
    ...handlers,
  }
}

// Generic delete helper used by both pages.
export async function deleteRow(supabase, table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
}
