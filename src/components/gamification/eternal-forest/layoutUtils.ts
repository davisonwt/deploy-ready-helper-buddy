import { UserTree, ForestConfig } from './types';

// Calculate positions in ring, each ring has 8 * ringNumber positions
function getUsersPerRing(ring: number): number {
  if (ring === 0) return 0; // Center is for World Tree
  return 8 * ring;
}

// Get cumulative users up to a ring
function getCumulativeUsers(ring: number): number {
  let total = 0;
  for (let r = 1; r < ring; r++) {
    total += getUsersPerRing(r);
  }
  return total;
}

// Determine which ring a user belongs to based on their rank
function getRingForRank(rank: number): number {
  let cumulative = 0;
  let ring = 1;
  while (true) {
    const usersInRing = getUsersPerRing(ring);
    if (cumulative + usersInRing >= rank) {
      return ring;
    }
    cumulative += usersInRing;
    ring++;
  }
}

// Assign tree style based on level
function getTreeStyle(level: number): 'rounded' | 'pointed' | 'layered' {
  if (level >= 20) return 'layered';
  if (level >= 10) return 'pointed';
  return 'rounded';
}

// Calculate spiral/ring positions for all users
export function calculateForestLayout(
  users: Array<{ id: string; name: string; level: number; xp: number; isCurrentUser?: boolean; avatarUrl?: string }>,
  config: ForestConfig
): UserTree[] {
  const { centerX, centerY, ringSpacing, baseTreeSpacing } = config;
  
  // Sort by XP descending (highest XP = inner ring)
  const sortedUsers = [...users].sort((a, b) => b.xp - a.xp);
  
  const positionedTrees: UserTree[] = [];
  
  sortedUsers.forEach((user, index) => {
    const rank = index + 1;
    const ring = getRingForRank(rank);
    const usersInRing = getUsersPerRing(ring);
    const positionInRing = rank - getCumulativeUsers(ring) - 1;
    
    // Calculate angle for this position (evenly spaced around the ring)
    const angleOffset = (ring % 2 === 0) ? Math.PI / usersInRing : 0; // Offset alternate rings
    const angle = (2 * Math.PI * positionInRing) / usersInRing + angleOffset;
    
    // Calculate radius based on ring number
    const radius = ring * ringSpacing;
    
    // Add slight random variation for organic feel
    const radiusVariation = (Math.random() - 0.5) * 20;
    const angleVariation = (Math.random() - 0.5) * 0.1;
    
    const x = centerX + (radius + radiusVariation) * Math.cos(angle + angleVariation);
    const y = centerY + (radius + radiusVariation) * Math.sin(angle + angleVariation);
    
    positionedTrees.push({
      id: user.id,
      name: user.name,
      level: user.level,
      xp: user.xp,
      x,
      y,
      ring,
      treeStyle: getTreeStyle(user.level),
      isCurrentUser: user.isCurrentUser,
      avatarUrl: user.avatarUrl,
    });
  });
  
  return positionedTrees;
}

// Get the World Tree position (center of forest)
export function getWorldTreePosition(config: ForestConfig) {
  return { x: config.centerX, y: config.centerY };
}

// Calculate forest bounds for proper centering
export function getForestBounds(trees: UserTree[]): { minX: number; maxX: number; minY: number; maxY: number } {
  if (trees.length === 0) {
    return { minX: 0, maxX: 1000, minY: 0, maxY: 1000 };
  }
  
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  
  trees.forEach(tree => {
    const treeWidth = 100 + tree.level * 10;
    const treeHeight = 150 + tree.level * 20;
    
    minX = Math.min(minX, tree.x - treeWidth);
    maxX = Math.max(maxX, tree.x + treeWidth);
    minY = Math.min(minY, tree.y - treeHeight);
    maxY = Math.max(maxY, tree.y + 50);
  });
  
  return { minX, maxX, minY, maxY };
}
