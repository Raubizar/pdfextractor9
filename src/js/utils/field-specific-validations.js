
/**
 * Field-specific validation functions
 */

import { createSuccessfulValidation } from './validation-result.js';

/**
 * Perform date-specific validation
 * @param {string} value The value to check as a date
 * @param {number} fontWeightFactor Font weight factor for confidence
 * @param {number} blockScoreFactor Block score factor for confidence
 * @returns {object|null} Validation result if it's a valid date, null otherwise
 */
export function validateAsDate(value, fontWeightFactor = 1.0, blockScoreFactor = 1.0) {
  const potentialDate = new Date(value);
  if (!isNaN(potentialDate.getTime())) {
    // Use partial confidence for dates parsed this way
    const confidence = calculateConfidence(false, fontWeightFactor, blockScoreFactor) * 0.8;
    return createSuccessfulValidation(confidence, 'Parseable as date');
  }
  return null;
}

/**
 * Calculate confidence level based on various factors
 * @param {boolean} isPrimaryMatch Whether the value matches a primary pattern
 * @param {number} fontWeightFactor Confidence factor based on font size
 * @param {number} blockScoreFactor Confidence factor based on block position
 * @returns {number} Confidence level from 0 to 1
 */
export function calculateConfidence(isPrimaryMatch, fontWeightFactor = 1.0, blockScoreFactor = 1.0) {
  // Base confidence 
  let confidence = isPrimaryMatch ? 0.85 : 0.65;
  
  // Apply modifiers
  confidence *= fontWeightFactor;
  confidence *= blockScoreFactor;
  
  // Ensure confidence stays within 0-1 range
  return Math.min(1.0, Math.max(0, confidence));
}
