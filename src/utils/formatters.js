/**
 * Defensive formatting utility for currency and numeric values
 * Handles undefined, null, and invalid values gracefully
 */

export function formatCurrency(amount, fallback = "0.00") {
  // Handle undefined, null, or empty values
  if (amount === undefined || amount === null || amount === "") {
    return `${fallback} USDC`;
  }
  
  // Handle string values
  if (typeof amount === "string") {
    amount = amount.trim();
    if (amount === "") return `${fallback} USDC`;
  }
  
  // Convert to number and validate
  const value = parseFloat(amount);
  
  // Return fallback if not a valid number
  if (isNaN(value) || !isFinite(value)) {
    return `${fallback} USDC`;
  }
  
  // Format to 2 decimal places with USDC suffix
  return `${value.toFixed(2)} USDC`;
}

/**
 * Safe percentage formatting
 */
export function formatPercentage(value, fallback = "0.0") {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  
  const numValue = parseFloat(value);
  
  if (isNaN(numValue) || !isFinite(numValue)) {
    return fallback;
  }
  
  return numValue.toFixed(1);
}

/**
 * Safe integer formatting
 */
export function formatInteger(value, fallback = 0) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  
  const numValue = parseInt(value);
  
  if (isNaN(numValue) || !isFinite(numValue)) {
    return fallback;
  }
  
  return numValue;
}

/**
 * Safe calculation helpers
 */
export function safeAdd(a, b) {
  const numA = parseFloat(a) || 0;
  const numB = parseFloat(b) || 0;
  return numA + numB;
}

export function safeMultiply(a, b) {
  const numA = parseFloat(a) || 0;
  const numB = parseFloat(b) || 0;
  return numA * numB;
}

export function safeSubtract(a, b) {
  const numA = parseFloat(a) || 0;
  const numB = parseFloat(b) || 0;
  return numA - numB;
}

/**
 * Safe date formatting
 */
export function formatDate(dateValue, fallback = "Unknown") {
  if (!dateValue) return fallback;
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return fallback;
    }
    return date.toLocaleDateString();
  } catch (error) {
    return fallback;
  }
}