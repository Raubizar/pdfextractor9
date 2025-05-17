
/**
 * Helper functions for matching fields and labels in title blocks
 */

import { fieldLabels } from './title-block-constants.js';

/**
 * Check if a text is a known label
 * @param {string} text The text to check
 * @returns {boolean} True if the text is a known label
 */
export function isKnownLabel(text) {
  const lowerText = text.toLowerCase();
  return Object.values(fieldLabels).some(variants => 
    variants.some(variant => lowerText.includes(variant))
  );
}

/**
 * Find which field category a text belongs to
 * @param {string} text The text to check
 * @returns {string|null} The field type or null if not a known label
 */
export function getFieldType(text) {
  const lowerText = text.toLowerCase();
  for (const [fieldType, variants] of Object.entries(fieldLabels)) {
    if (variants.some(variant => lowerText.includes(variant))) {
      return fieldType;
    }
  }
  return null;
}

/**
 * Parse cell ID to get row and column numbers
 * @param {string} cellId The cell ID to parse (format: row_X_col_Y)
 * @returns {object|null} Object with row and col properties or null if invalid
 */
export function parseCellId(cellId) {
  const match = cellId.match(/row_(\d+)_col_(\d+)/);
  if (match) {
    return {
      row: parseInt(match[1]),
      col: parseInt(match[2])
    };
  }
  return null;
}
