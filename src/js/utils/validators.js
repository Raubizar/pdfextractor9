/**
 * Regex validators for text extraction
 */

// Drawing number format: Alphanumeric with hyphens and underscores
export const drawingNumberRE = /^[A-Z0-9][A-Z0-9\-_]{1,19}$/i;

// Scale formats: Ratio (1:100), with slash (1/100), or special values
export const scaleRE = /^(\d+[:/@]\d+|N\/A|AS INDICATED|NTS|NONE|FULL|HALF)$/i;

// Date formats: YYYY-MM-DD, DD/MM/YYYY, etc.
export const dateRE = /\b\d{2,4}[-/\.]\d{1,2}[-/\.]\d{2,4}\b/;

// Revision formats: P01, P02, 1, A1, etc.
export const revisionRE = /^(P\d+|[A-Z]?\d{1,2}|REV\s*[A-Z0-9])$/i;

// Additional validation function to check if a string matches a pattern
export function matchesPattern(str, pattern) {
  return pattern.test(str);
}

// Calculate confidence based on regex validation and other factors
export function calculateConfidence(regexPass, fontWeightFactor, blockScoreFactor) {
  return (regexPass ? 1 : 0.5) * fontWeightFactor * blockScoreFactor;
}

// Make sure we export the calculateConfidence function for external use
export { calculateConfidence } from './field-specific-validations.js';
