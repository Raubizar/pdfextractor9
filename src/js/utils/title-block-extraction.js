
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
  // If we already have cell-based detection, return as is but with high confidence
  if (titleBlockData.usingDetectedCells) {
    return {
      ...titleBlockData,
      cellDetectionConfidence: 0.9 // Higher confidence for cell-based detection
    };
  }
  
  // Otherwise, mark that grid-based detection is less reliable
  return {
    ...titleBlockData,
    cellDetectionConfidence: 0.6, // Lower confidence for grid-based detection
    gridBasedDetection: true
  };
}

/**
 * Enhance the title block data with post-detection analysis
 * @param {object} titleBlockData Data from grid analysis
 * @returns {object} Enhanced title block data
 */
export function enhanceTitleBlockData(titleBlockData) {
  // Start with prioritization
  const prioritizedData = prioritizeCellDetection(titleBlockData);
  
  // If we don't have table structure, no enhancement possible
  if (!prioritizedData.tableStructure) {
    return prioritizedData;
  }
  
  // Enhance the field extraction results with confidence adjustments
  if (prioritizedData.tableStructure.extractedFields) {
    const extractedFields = prioritizedData.tableStructure.extractedFields;
    
    // Apply confidence boosts based on relationships between fields
    Object.keys(extractedFields).forEach(fieldType => {
      const field = extractedFields[fieldType];
      
      // Boost confidence if field is in same cell as its label
      if (field.inSameCell) {
        field.confidence = Math.min(1.0, field.confidence * 1.1);
      }
      
      // Add detection method to field info if not present
      if (!field.method && field.inSameCell) {
        field.method = 'in-cell-detection';
      } else if (!field.method) {
        field.method = 'adjacent-cell-detection';
      }
    });
  }
  
  return prioritizedData;
}

