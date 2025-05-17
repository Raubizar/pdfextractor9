
/**
 * Field validation utilities
 */

import { fieldPatterns } from './title-block-constants.js';
import { calculateConfidence } from './validators.js';

/**
 * Validate a field value against expected patterns
 * @param {string} fieldType Type of field (drawing, scale, revision, date)
 * @param {string} value The value to validate
 * @param {object} textAttributes Additional attributes for confidence calculation
 * @returns {object} Validation result with confidence score and validation details
 */
export function validateFieldValue(fieldType, value, textAttributes = {}) {
  if (!value || value.trim() === '') {
    return {
      valid: false,
      confidence: 0,
      reason: 'Empty value'
    };
  }

  // Get the patterns for this field type
  const patterns = fieldPatterns[fieldType];
  if (!patterns) {
    return {
      valid: true,
      confidence: 0.5, // Default confidence for fields without patterns
      reason: 'No validation pattern defined'
    };
  }

  // Check if value matches primary regex pattern
  const regexPass = patterns.pattern && patterns.pattern.test(value);
  
  // Check valid values list
  const isValidValue = patterns.validValues && patterns.validValues.some(validValue => 
    value.toUpperCase() === validValue.toUpperCase());
  
  // Check fallback patterns if primary pattern fails
  const fallbackPass = !regexPass && patterns.fallbackPatterns && 
    patterns.fallbackPatterns.some(fallbackPattern => fallbackPattern.test(value));
  
  // Calculate font weight factor (default to 1.0)
  let fontWeightFactor = 1.0;
  if (textAttributes.fontSize && textAttributes.medianFontSize) {
    if (textAttributes.fontSize > textAttributes.medianFontSize * 1.2) {
      fontWeightFactor = 1.2; // Higher confidence for larger text
    }
  }
  
  // Calculate block score factor
  const blockScoreFactor = Math.min(1.0, 0.8 + (textAttributes.blockScore || 0) * 0.05);
  
  if (regexPass || isValidValue) {
    return {
      valid: true,
      confidence: calculateConfidence(true, fontWeightFactor, blockScoreFactor),
      reason: regexPass ? 'Matches primary pattern' : 'Matches valid value'
    };
  } else if (fallbackPass) {
    return {
      valid: true,
      confidence: calculateConfidence(false, fontWeightFactor, blockScoreFactor),
      reason: 'Matches fallback pattern'
    };
  }

  // Special case for dates - check if it might be a date
  if (fieldType === 'date') {
    const potentialDate = new Date(value);
    if (!isNaN(potentialDate.getTime())) {
      return {
        valid: true,
        confidence: calculateConfidence(false, fontWeightFactor, blockScoreFactor) * 0.8,
        reason: 'Parseable as date'
      };
    }
  }

  return {
    valid: false,
    confidence: 0,
    reason: 'Does not match any expected pattern'
  };
}
