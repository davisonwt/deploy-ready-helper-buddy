import type { ComponentType } from 'react';

export type SegmentId = 'intro' | 'step1' | 'step2' | 'step3' | 'step4' | 'outro';

export interface ExplainerSegment {
  id: SegmentId;
  /** Relative weight — boundaries are computed by normalising weights against the audio's real duration. */
  weight: number;
  Scene: ComponentType;
}

export interface ExplainerTheme {
  bg: string;
  panel: string;
  accent: string;     // primary brand color for the page
  ember: string;      // secondary highlight / outro accent
  muted: string;
  text: string;
  font: string;       // CSS font-family for headings
  fontWeight: number;
}

export interface ExplainerConfig {
  voUrl: string;
  estDuration: number;  // seconds, used before metadata loads
  title: string;
  subtitle: string;
  outroTitle: string;
  outroTagline: string;
  theme: ExplainerTheme;
  segments: ExplainerSegment[]; // must include intro, 4 steps, outro
}

export type ExplainerVariant =
  | 'one_on_one'
  | 'community'
  | 'classroom'
  | 'skilldrop'
  | 'training'
  | 'radio';
