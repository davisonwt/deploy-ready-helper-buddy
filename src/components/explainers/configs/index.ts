import type { ExplainerConfig, ExplainerVariant } from '../types';
import { oneOnOneConfig } from './oneOnOne';
import { communityConfig } from './community';
import { classroomConfig } from './classroom';
import { skilldropConfig } from './skilldrop';
import { trainingConfig } from './training';
import { radioConfig } from './radio';

const REGISTRY: Record<ExplainerVariant, ExplainerConfig> = {
  one_on_one: oneOnOneConfig,
  community: communityConfig,
  classroom: classroomConfig,
  skilldrop: skilldropConfig,
  training: trainingConfig,
  radio: radioConfig,
};

export function getExplainerConfig(variant: ExplainerVariant): ExplainerConfig {
  return REGISTRY[variant];
}
