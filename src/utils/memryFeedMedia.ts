import { convertToPublicUrl } from '@/utils/urlUtils';

export type MediaKind = 'image' | 'video' | 'audio';

const SUPABASE_URL = String((import.meta as any)?.env?.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|mkv|avi)(\?|$)/i;
const AUDIO_EXT_RE = /\.(mp3|wav|m4a|aac|ogg|flac)(\?|$)/i;

const MEDIA_KEYS = [
  'media', 'media_items', 'media_urls', 'attachments', 'files', 'file',
  'image', 'image1', 'image2', 'image3', 'image4', 'image_url', 'image_urls',
  'images', 'gallery_images', 'cover', 'cover_image_url', 'coverImageUrl',
  'thumbnail', 'thumbnail_url', 'banner_url', 'logo_url',
  'video', 'video_url', 'video_urls',
  'audio', 'audio_url', 'audio_urls', 'tracks',
  'path', 'public_url', 'publicUrl', 'download_url', 'secure_url', 'src', 'url',
];

const cleanUrl = (value: string) =>
  value
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/\\u0026/g, '&');

const looksLikeBucketPath = (value: string) => /^[a-z0-9][a-z0-9._-]*\/.+/i.test(value);

const parsePostgresArray = (value: string) => {
  const inner = value.slice(1, -1).trim();
  if (!inner) return [] as string[];
  return inner
    .split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/)
    .map((part) => part.trim().replace(/^"|"$/g, '').replace(/\\"/g, '"'))
    .filter(Boolean);
};

const parseArrayish = (value: unknown): unknown[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    const looksLikeJsonArray = trimmed.startsWith('[') && trimmed.endsWith(']');
    const looksLikeJsonObject = trimmed.startsWith('{') && trimmed.endsWith('}') && trimmed.includes(':');

    if (looksLikeJsonArray || looksLikeJsonObject) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
      }
    }

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return parsePostgresArray(trimmed);
    }

    if (trimmed.includes(',') && /(https?:\/\/|\/storage\/|\w+\/\w+)/i.test(trimmed)) {
      return trimmed
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
    }

    return [trimmed];
  }

  if (typeof value === 'object') return [value];
  return [];
};

const extractUrl = (item: any): string | undefined => {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return undefined;

  const candidate =
    item.url ??
    item.src ??
    item.path ??
    item.publicUrl ??
    item.public_url ??
    item.file ??
    item.file_url ??
    item.download_url ??
    item.media_url ??
    item.mediaUrl ??
    item.image ??
    item.image1 ??
    item.image2 ??
    item.image3 ??
    item.image4 ??
    item.image_url ??
    item.video ??
    item.video_url ??
    item.audio ??
    item.audio_url ??
    item.thumbnail ??
    item.thumbnail_url ??
    item.cover ??
    item.cover_image_url ??
    item.coverImageUrl;

  return typeof candidate === 'string' ? candidate : undefined;
};

export const normalizeMediaUrl = (url?: string | null): string => {
  if (!url) return '';

  const cleaned = cleanUrl(url);
  if (!cleaned || cleaned === 'null' || cleaned === 'undefined' || cleaned === '[object Object]') {
    return '';
  }

  const converted = convertToPublicUrl(cleaned);

  if (/^(https?:\/\/|data:|blob:)/i.test(converted)) {
    return converted;
  }

  if (!SUPABASE_URL) return converted;

  if (converted.startsWith('/storage/v1/object/public/')) {
    return `${SUPABASE_URL}${converted}`;
  }

  const noLeadingSlash = converted.replace(/^\/+/, '');

  if (noLeadingSlash.startsWith('storage/v1/object/public/')) {
    return `${SUPABASE_URL}/${noLeadingSlash}`;
  }

  if (noLeadingSlash.startsWith('object/public/')) {
    return `${SUPABASE_URL}/storage/v1/${noLeadingSlash}`;
  }

  if (looksLikeBucketPath(noLeadingSlash)) {
    return `${SUPABASE_URL}/storage/v1/object/public/${noLeadingSlash}`;
  }

  return converted;
};

export const isVideoUrl = (url?: string | null) => VIDEO_EXT_RE.test(String(url || ''));
export const isAudioUrl = (url?: string | null) => AUDIO_EXT_RE.test(String(url || ''));

export const dedupeUrls = (urls: string[]) => {
  const seen = new Set<string>();
  return urls.filter((url) => {
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
};

const inferMediaKind = (url: string, hint?: unknown): MediaKind => {
  const hinted = String(hint || '').toLowerCase();

  if (hinted.includes('video')) return 'video';
  if (hinted.includes('audio') || hinted.includes('music') || hinted.includes('song')) return 'audio';
  if (hinted.includes('image') || hinted.includes('photo') || hinted.includes('picture')) return 'image';

  if (isVideoUrl(url)) return 'video';
  if (isAudioUrl(url)) return 'audio';
  return 'image';
};

export const normalizeMemryMedia = (
  source: any,
  options: { extra?: unknown[] } = {}
) => {
  const mediaMap = new Map<string, MediaKind>();
  const visited = new WeakSet<object>();
  const metadata = source?.metadata && typeof source.metadata === 'object' ? source.metadata : {};

  const pushValue = (value: unknown, hint?: unknown) => {
    for (const item of parseArrayish(value)) {
      if (item && typeof item === 'object') {
        const obj = item as any;

        if (!visited.has(obj)) {
          visited.add(obj);
          const nestedHint = obj.type ?? obj.mime_type ?? obj.media_type ?? obj.content_type ?? hint;
          for (const key of MEDIA_KEYS) {
            if (obj[key] !== undefined && obj[key] !== null) {
              pushValue(obj[key], nestedHint);
            }
          }
        }
      }

      const rawUrl = extractUrl(item);
      const normalizedUrl = normalizeMediaUrl(rawUrl);
      if (!normalizedUrl) continue;

      const explicitHint =
        typeof item === 'object'
          ? (item as any).type ?? (item as any).mime_type ?? (item as any).media_type ?? hint
          : hint;

      const nextKind = inferMediaKind(normalizedUrl, explicitHint);
      const currentKind = mediaMap.get(normalizedUrl);

      if (!currentKind || (currentKind === 'image' && nextKind !== 'image')) {
        mediaMap.set(normalizedUrl, nextKind);
      }
    }
  };

  [source, metadata, ...(options.extra || [])].forEach((entry) => pushValue(entry));

  const entries = [...mediaMap.entries()];

  return {
    images: entries.filter(([, kind]) => kind === 'image').map(([url]) => url),
    videos: entries.filter(([, kind]) => kind === 'video').map(([url]) => url),
    audios: entries.filter(([, kind]) => kind === 'audio').map(([url]) => url),
  };
};
