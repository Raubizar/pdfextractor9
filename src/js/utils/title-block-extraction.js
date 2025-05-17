
/**
 * Title block extraction utilities
 */

// Re-export the field extraction function from its dedicated file
export { extractFieldsFromTableStructure } from './field-extraction/index.js';

/**
 * Prioritize cell-based detection over grid-based detection
 * @param {object} titleBlockData Data from grid analysis
 * @returns {object} Enhanced title block data
 */
export function prioritizeCellDetection(titleBlockData) {
  // If we already have cell-based detection, return as is
  if (titleBlockData.usingDetectedCells) {
    return titleBlockData;
  }
  
  // Otherwise, mark that grid-based detection is less reliable
  return {
    ...titleBlockData,
    cellDetectionConfidence: 0.6, // Lower confidence for grid-based detection
    gridBasedDetection: true
  };
}
