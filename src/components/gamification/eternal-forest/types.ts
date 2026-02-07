export interface UserTree {
  id: string;
  name: string;
  level: number;
  xp: number;
  x: number;
  y: number;
  ring: number;
  treeStyle: 'rounded' | 'pointed' | 'layered';
  isCurrentUser?: boolean;
  avatarUrl?: string;
}

export interface TreeBounds {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  user: UserTree;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface ForestConfig {
  centerX: number;
  centerY: number;
  ringSpacing: number;
  baseTreeSpacing: number;
}
