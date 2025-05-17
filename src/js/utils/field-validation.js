
/**
 * Field validation utilities
 */

import { fieldPatterns } from './title-block-constants.js';
import { validateAsDate } from './field-specific-validations.js';
import { createFailedValidation, createSuccessfulValidation } from './validation-result.js';
import { calculateConfidence } from './field-specific-validations.js';

/**
 * Validate a field value against expected patterns
 * @param {string} fieldType Type of field (drawing, scale, revision, date)
 * @param {string} value The value to validate
 * @param {object} textAttributes Additional attributes for confidence calculation
 * @returns {object} Validation result with confidence score and validation details
 */
export function validateFieldValue(fieldType, value, textAttributes = {}) {
  if (!value || value.trim() === '') {
    return createFailedValidation('Empty value');
  }

  // Get the patterns for this field type
  const patterns = fieldPatterns[fieldType];
  if (!patterns) {
    return createSuccessfulValidation(0.5, 'No validation pattern defined');
  }

  // Extract attributes for confidence calculation
  const fontWeightFactor = calculateFontWeightFactor(textAttributes);
  const blockScoreFactor = Math.min(1.0, 0.8 + (textAttributes.blockScore || 0) * 0.05);
  const methodBoost = getMethodConfidenceBoost(textAttributes.method);

  // Validation checks
  const validationResult = performPatternValidation(patterns, value, fontWeightFactor, blockScoreFactor, methodBoost);
  if (validationResult) {
    return validationResult;
  }

  // Special case for dates if other validations fail
  if (fieldType === 'date') {
    const dateValidation = validateAsDate(value, fontWeightFactor, blockScoreFactor);
    if (dateValidation) {
      return dateValidation;
    }
  }

  return createFailedValidation('Does not match any expected pattern');
}

/**
 * Get confidence boost based on detection method
 * @param {string} method The detection method used
 * @returns {number} Confidence boost factor
 */
function getMethodConfidenceBoost(method) {
  if (!method) return 1.0;
  
  // Higher boost for more reliable methods
  switch (method) {
    case 'cell-role-adjacency':
      return 1.15; // Role-based detection is very reliable
    case 'in-cell-pattern-colon':
      return 1.12; // Colon pattern is very reliable
    case 'in-cell-pattern-inline-colon':
      return 1.1;
    case 'in-cell-pattern-dash':
      return 1.05;
    default:
      return 1.0;
  }
}

/**
 * Calculate font weight factor based on text attributes
 * @param {object} textAttributes Text attributes including fontSize and medianFontSize
 * @returns {number} Font weight factor
 */
function calculateFontWeightFactor(textAttributes) {
  // Default to 1.0
  let fontWeightFactor = 1.0;
  
  if (textAttributes.fontSize && textAttributes.medianFontSize) {
    if (textAttributes.fontSize > textAttributes.medianFontSize * 1.2) {
      fontWeightFactor = 1.2; // Higher confidence for larger text
    }
  }
  
  // Factor in font style if available
  if (textAttributes.fontName) {
    if (textAttributes.fontName.toLowerCase().includes('bold')) {
      fontWeightFactor *= 1.1; // Boost for bold text
    }
    if (textAttributes.fontName.toLowerCase().includes('italic')) {
      fontWeightFactor *= 0.95; // Slight reduction for italic (often notes/comments)
    }
  }
  
  return fontWeightFactor;
}

/**
 * Perform pattern validation against primary and fallback patterns
 * @param {object} patterns The patterns to validate against
 * @param {string} value The value to validate
 * @param {number} fontWeightFactor Font weight factor
 * @param {number} blockScoreFactor Block score factor
 * @param {number} methodBoost Method-specific confidence boost
 * @returns {object|null} Validation result if successful, null otherwise
 */
function performPatternValidation(patterns, value, fontWeightFactor, blockScoreFactor, methodBoost = 1.0) {
  // Check if value matches primary regex pattern
  const regexPass = patterns.pattern && patterns.pattern.test(value);
  
  // Check valid values list
  const isValidValue = patterns.validValues && patterns.validValues.some(validValue => 
    value.toUpperCase() === validValue.toUpperCase());
  
  // Check fallback patterns if primary pattern fails
  const fallbackPass = !regexPass && patterns.fallbackPatterns && 
    patterns.fallbackPatterns.some(fallbackPattern => fallbackPattern.test(value));
  
  if (regexPass || isValidValue) {
    const baseConfidence = calculateConfidence(true, fontWeightFactor, blockScoreFactor);
    return createSuccessfulValidation(
      Math.min(0.99, baseConfidence * methodBoost), // Cap at 0.99
      regexPass ? 'Matches primary pattern' : 'Matches valid value'
    );
  } else if (fallbackPass) {
    const baseConfidence = calculateConfidence(false, fontWeightFactor, blockScoreFactor);
    return createSuccessfulValidation(
      Math.min(0.9, baseConfidence * methodBoost), // Cap at 0.9 for fallback patterns
      'Matches fallback pattern'
    );
  }
  
  return null;
}
