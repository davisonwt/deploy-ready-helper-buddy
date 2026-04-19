// Multilingual locale registry — supports global tribal members.
// Translation strings live in /src/lib/i18n/strings/{lang}.ts (created on demand).

export type LanguageCode =
  | 'en' | 'es' | 'fr' | 'pt' | 'hi' | 'ar' | 'zh'
  | 'zu' | 'af' | 'sw' | 'xh' | 'st' | 'tn' | 'yo' | 'ha' | 'ig';

export const SUPPORTED_LANGUAGES: { code: LanguageCode; name: string; native: string; flag: string; rtl?: boolean }[] = [
  { code: 'en', name: 'English',     native: 'English',     flag: '🇬🇧' },
  { code: 'es', name: 'Spanish',     native: 'Español',     flag: '🇪🇸' },
  { code: 'fr', name: 'French',      native: 'Français',    flag: '🇫🇷' },
  { code: 'pt', name: 'Portuguese',  native: 'Português',   flag: '🇵🇹' },
  { code: 'hi', name: 'Hindi',       native: 'हिन्दी',         flag: '🇮🇳' },
  { code: 'ar', name: 'Arabic',      native: 'العربية',     flag: '🇸🇦', rtl: true },
  { code: 'zh', name: 'Mandarin',    native: '中文',         flag: '🇨🇳' },
  { code: 'zu', name: 'Zulu',        native: 'isiZulu',     flag: '🇿🇦' },
  { code: 'af', name: 'Afrikaans',   native: 'Afrikaans',   flag: '🇿🇦' },
  { code: 'sw', name: 'Swahili',     native: 'Kiswahili',   flag: '🇰🇪' },
  { code: 'xh', name: 'Xhosa',       native: 'isiXhosa',    flag: '🇿🇦' },
  { code: 'st', name: 'Sesotho',     native: 'Sesotho',     flag: '🇱🇸' },
  { code: 'tn', name: 'Setswana',    native: 'Setswana',    flag: '🇧🇼' },
  { code: 'yo', name: 'Yoruba',      native: 'Yorùbá',      flag: '🇳🇬' },
  { code: 'ha', name: 'Hausa',       native: 'Hausa',       flag: '🇳🇬' },
  { code: 'ig', name: 'Igbo',        native: 'Igbo',        flag: '🇳🇬' },
];

export function detectLanguageFromBrowser(): LanguageCode {
  if (typeof navigator === 'undefined') return 'en';
  const browser = (navigator.language || 'en').split('-')[0].toLowerCase() as LanguageCode;
  return SUPPORTED_LANGUAGES.some(l => l.code === browser) ? browser : 'en';
}

export function isRTL(code: LanguageCode): boolean {
  return SUPPORTED_LANGUAGES.find(l => l.code === code)?.rtl ?? false;
}
