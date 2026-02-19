// Shared music mood and genre constants for consistent categorization across the platform

export const MUSIC_MOODS = [
  { value: 'love', label: '💕 Love', color: '#ec4899' },
  { value: 'spiritual', label: '🙏 Spiritual', color: '#8b5cf6' },
  { value: 'worship', label: '🕊️ Worship', color: '#6366f1' },
  { value: 'uplifting', label: '☀️ Uplifting', color: '#f59e0b' },
  { value: 'chill', label: '🌊 Chill', color: '#06b6d4' },
  { value: 'energetic', label: '⚡ Energetic', color: '#ef4444' },
  { value: 'reflective', label: '🌙 Reflective', color: '#64748b' },
  { value: 'celebratory', label: '🎉 Celebratory', color: '#22c55e' },
] as const;

export const MUSIC_GENRES = [
  { value: 'gospel', label: 'Gospel' },
  { value: 'rock', label: 'Rock' },
  { value: 'pop', label: 'Pop' },
  { value: 'hip_hop', label: 'Hip-Hop' },
  { value: 'rnb', label: 'R&B' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'electronic', label: 'Electronic' },
  { value: 'metal', label: 'Metal' },
  { value: 'classical', label: 'Classical' },
  { value: 'folk', label: 'Folk' },
  { value: 'country', label: 'Country' },
  { value: 'reggae', label: 'Reggae' },
  { value: 'afrobeats', label: 'Afrobeats' },
  { value: 'other', label: 'Other' },
] as const;

export type MusicMood = typeof MUSIC_MOODS[number]['value'];
export type MusicGenre = typeof MUSIC_GENRES[number]['value'];
