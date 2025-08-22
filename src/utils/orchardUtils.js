/**
 * Utility functions for orchard calculations
 */

/**
 * Get the correct total pockets for an orchard
 * Uses total_pockets as primary source, intended_pockets only if it's reasonable (> 1)
 * This ensures we display the actual number of pockets available for selection
 * 
 * @param {Object} orchard - The orchard object
 * @returns {number} The correct total pockets count
 */
export const getOrchardTotalPockets = (orchard) => {
  if (!orchard) return 1;
  
  // Use total_pockets as primary, intended_pockets only if it's reasonable
  return (orchard.intended_pockets && orchard.intended_pockets > 1) 
    ? orchard.intended_pockets 
    : orchard.total_pockets || 1;
};

/**
 * Calculate completion percentage for an orchard
 * 
 * @param {Object} orchard - The orchard object
 * @returns {number} Completion percentage (0-100)
 */
export const getOrchardCompletionPercentage = (orchard) => {
  if (!orchard) return 0;
  
  const totalPockets = getOrchardTotalPockets(orchard);
  const filledPockets = orchard.filled_pockets || 0;
  
  if (!totalPockets || totalPockets === 0) return 0;
  return Math.round((filledPockets / totalPockets) * 100);
};

/**
 * Get available pockets count
 * 
 * @param {Object} orchard - The orchard object
 * @returns {number} Number of available pockets
 */
export const getAvailablePockets = (orchard) => {
  if (!orchard) return 0;
  
  const totalPockets = getOrchardTotalPockets(orchard);
  const filledPockets = orchard.filled_pockets || 0;
  
  return Math.max(0, totalPockets - filledPockets);
};

/**
 * Calculate total goal amount for an orchard
 * 
 * @param {Object} orchard - The orchard object
 * @returns {number} Total goal amount
 */
export const getOrchardGoalAmount = (orchard) => {
  if (!orchard) return 0;
  
  const totalPockets = getOrchardTotalPockets(orchard);
  const pocketPrice = orchard.pocket_price || 0;
  
  return totalPockets * pocketPrice;
};

/**
 * Calculate raised amount for an orchard
 * 
 * @param {Object} orchard - The orchard object
 * @returns {number} Amount raised so far
 */
export const getOrchardRaisedAmount = (orchard) => {
  if (!orchard) return 0;
  
  const filledPockets = orchard.filled_pockets || 0;
  const pocketPrice = orchard.pocket_price || 0;
  
  return filledPockets * pocketPrice;
};