// My Tribe walk-through (phase 1) -- shared front/interior images (one
// village gate + square for every member, not per-owner like a stall)
// and the measured positions of the name board and the 4 hotspot
// plaques. Uploaded via `supabase storage cp --experimental` to the
// existing public "stalls" bucket under a shared "tribe/" path (not a
// user_id folder -- there is no single owner).
//
// Measured directly against the real 1168x784 source images
// (E:\abbi\sow2grow\, "davison tribe front.jpeg" / "davison tribe
// inside.jpeg") by cropping each candidate box and visually confirming
// it fully contains the target with a small margin and nothing else.

const SUPABASE_URL = 'https://zuwkgasbkpjlxzsjzumu.supabase.co';

export const TRIBE_FRONT_URL = `${SUPABASE_URL}/storage/v1/object/public/stalls/tribe/front.webp`;
export const TRIBE_INTERIOR_URL = `${SUPABASE_URL}/storage/v1/object/public/stalls/tribe/interior.webp`;

/** Percentages of the front image's own natural width/height (same convention as StallHotspot). The blank wooden board on the gate arch, above the "my tribe" banner -- the viewer's own name is rendered here. */
export const TRIBE_BOARD = { x: 36.39, y: 8.93, w: 28.68, h: 13.39 };

export type TribeHotspotId = 'village' | 'invite' | 'following' | 'rewards';

export interface TribeHotspot {
  id: TribeHotspotId;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The 4 painted plaques along the bottom of the interior square, left to right. Percentages of the interior image's own natural width/height. */
export const TRIBE_HOTSPOTS: TribeHotspot[] = [
  { id: 'village', label: 'My village', x: 2.14, y: 76.79, w: 22.26, h: 16.58 },
  { id: 'invite', label: 'Invite', x: 26.54, y: 76.79, w: 22.26, h: 16.58 },
  { id: 'following', label: 'Following', x: 50.94, y: 76.79, w: 22.26, h: 16.58 },
  { id: 'rewards', label: 'Rewards', x: 75.34, y: 76.79, w: 22.26, h: 16.58 },
];
