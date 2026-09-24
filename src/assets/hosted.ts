/**
 * Every app-owned image, voice-over and video that used to live behind
 * Lovable's /__l5e/ asset route, now served from our own public
 * `app-assets` bucket.
 *
 * Why one file. Those 32 assets were referenced through .asset.json
 * descriptors scattered across nine source files, and every one of them
 * 404'd on production (Vercel has no /__l5e/ route) from 2026-07-05 until
 * they were migrated. Their only remaining source was Lovable's PREVIEW
 * host, which is a preview environment and can disappear. Keeping the
 * URLs in one place means the next move -- a CDN, a rename, a new bucket
 * -- is one edit, not a hunt through nine files.
 *
 * The bytes are archived, with sha256s, at
 *   C:\Users\Ezra\S2G-backups\storage-archive\lovable-assets-2026-09-24\
 * and THAT archive is the recovery source from now on -- not Lovable.
 *
 * Verified on upload: all 32 return 200 with matching byte length,
 * content-type and sha256. scripts/audit-asset-refs.mjs re-checks them.
 */

/** The empty-plot cover. It had NO descriptor -- it was a hardcoded
 * /__l5e/ string inline in Index.tsx and EmptyPlotView.tsx, which is why
 * the descriptor audit could not see it and it stayed broken on the
 * landing page. */
export const uiEmptyPlotCover = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/ui/empty-plot-cover.png';

export const calendarMonth15 = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/calendar/calendar-month-15.png';
export const calendarMonth16 = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/calendar/calendar-month-16.png';
export const calendarMonth17 = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/calendar/calendar-month-17.png';
export const calendarMonth18 = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/calendar/calendar-month-18.png';
export const calendarMonth19 = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/calendar/calendar-month-19.png';
export const calendarMonth23 = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/calendar/calendar-month-23.png';
export const calendarMonth26 = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/calendar/calendar-month-26.png';
export const calendarMonth33 = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/calendar/calendar-month-33.png';
export const calendarMonth34 = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/calendar/calendar-month-34.png';
export const calendarMonth36 = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/calendar/calendar-month-36.png';
export const calendarMonth42 = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/calendar/calendar-month-42.png';
export const calendarMonth45 = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/calendar/calendar-month-45.png';
export const calendarUpload63 = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/calendar/calendar-upload-63.png';
export const calendarUpload64 = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/calendar/calendar-upload-64.png';
export const calendarUpload65 = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/calendar/calendar-upload-65.png';
export const calendarUpload66 = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/calendar/calendar-upload-66.png';
export const calendarUpload67 = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/calendar/calendar-upload-67.png';
export const calendarUpload68 = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/calendar/calendar-upload-68.png';
export const calendarUpload69 = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/calendar/calendar-upload-69.png';
export const calendarUpload70 = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/calendar/calendar-upload-70.png';
export const calendarUpload72 = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/calendar/calendar-upload-72.png';
export const calendarUpload73 = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/calendar/calendar-upload-73.png';
export const calendarUpload74 = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/calendar/calendar-upload-74.png';
export const calendarUpload75 = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/calendar/calendar-upload-75.png';
export const marketingTribeEconomy = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/marketing/s2g-tribe-economy.mp4';
export const marketingWhatIsSow2grow = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/marketing/s2g-what-is-sow2grow.mp4';
export const voClassroom = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/voice/classroom-vo.mp3';
export const voCommunity = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/voice/community-vo.mp3';
export const voOneOnOneLive = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/voice/1on1-live-vo.mp3';
export const voRadio = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/voice/radio-vo.mp3';
export const voSkilldrop = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/voice/skilldrop-vo.mp3';
export const voTraining = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/app-assets/voice/training-vo.mp3';
