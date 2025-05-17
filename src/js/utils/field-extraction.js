
/**
 * Field extraction utilities for title blocks
 */

import { validateFieldValue } from './field-validation.js';
import { fieldPatterns } from './title-block-constants.js';
import { isKnownLabel, getFieldType, parseCellId } from './field-matcher.js';

/**
 * Extract field-value pairs from the detected table structure with improved regex validation
 * @param {object} tableStructure The detected table structure
 * @param {array} titleBlockItems Text items in the title block
 * @param {object} textStats Text statistics including median font size and body text color
 * @returns {object} Extracted fields with validation details
 */
export function extractFieldsFromTableStructure(tableStructure, titleBlockItems, textStats) {
  const extractedFields = {};
  const processedCellIds = new Set();
  const { medianFontSize, bodyTextColor } = textStats || {};
  
  // Create a map for quick lookup of items by cell ID
  const cellMap = {};
  titleBlockItems.forEach(item => {
    if (!item.cellId) return;
    
    if (!cellMap[item.cellId]) {
      cellMap[item.cellId] = [];
    }
    cellMap[item.cellId].push(item);
  });
  
  // For each item that looks like a label, find its value
  titleBlockItems.forEach(item => {
    if (!item.cellId) return;
    
    const itemText = item.str.trim();
    const fieldType = getFieldType(itemText);
    
    // Skip if not a label or already processed
    if (!fieldType || processedCellIds.has(item.cellId)) return;
    
    // Mark this cell as processed
    processedCellIds.add(item.cellId);
    
    // Get cell coordinates
    const cellCoords = parseCellId(item.cellId);
    if (!cellCoords) return;
    
    // Start with searching in the same cell
    let valueItem = null;
    let valueCellId = item.cellId;
    let distance = 0;
    let validMatch = false;
    
    // Check if there's a non-label item in the same cell
    const cellItems = cellMap[item.cellId] || [];
    const valueItems = cellItems.filter(cellItem => 
      cellItem !== item && !isKnownLabel(cellItem.str.trim())
    );
    
    // First try to find a regex-matching value in the same cell
    if (valueItems.length > 0) {
      valueItem = findBestValueMatch(valueItems, fieldType);
      if (valueItem && valueItem.validMatch) {
        validMatch = true;
      }
    }
    
    // If we didn't find a value in the same cell, search in adjacent cells
    if (!valueItem) {
      const result = searchAdjacentCells(cellCoords, cellMap, fieldType);
      if (result) {
        valueItem = result.valueItem;
        valueCellId = result.valueCellId;
        distance = result.distance;
        validMatch = result.validMatch;
      }
    }
    
    // Store the extracted field-value pair with improved validation
    storeExtractedField(
      extractedFields, 
      fieldType, 
      itemText, 
      valueItem, 
      item.cellId, 
      valueCellId, 
      distance, 
      validMatch,
      textStats
    );
  });
  
  return extractedFields;
}

/**
 * Find the best matching value from a list of candidates
 * @param {array} valueItems Potential value items
 * @param {string} fieldType The field type to match against
 * @returns {object|null} The best matching value item or null
 */
function findBestValueMatch(valueItems, fieldType) {
  // First try to find a regex-matching value
  for (const candidate of valueItems) {
    const candidateValue = candidate.str.trim();
    // Check against field-specific regex
    if (fieldType in fieldPatterns) {
      const pattern = fieldPatterns[fieldType].pattern;
      if (pattern && pattern.test(candidateValue)) {
        return { ...candidate, validMatch: true };
      }
    }
  }
  
  // If no valid match found, use the first one
  if (valueItems.length > 0) {
    return { ...valueItems[0], validMatch: false };
  }
  
  return null;
}

/**
 * Search adjacent cells for a matching value
 * @param {object} cellCoords Current cell coordinates
 * @param {object} cellMap Map of cell IDs to items
 * @param {string} fieldType The field type to match against
 * @returns {object|null} Object with found value information or null
 */
function searchAdjacentCells(cellCoords, cellMap, fieldType) {
  // Search anti-clockwise: below → right → above → left
  const directions = [
    { row: cellCoords.row + 1, col: cellCoords.col }, // below
    { row: cellCoords.row, col: cellCoords.col + 1 }, // right
    { row: cellCoords.row - 1, col: cellCoords.col }, // above
    { row: cellCoords.row, col: cellCoords.col - 1 }  // left
  ];
  
  for (const dir of directions) {
    const targetCellId = `row_${dir.row}_col_${dir.col}`;
    const targetItems = cellMap[targetCellId] || [];
    
    // Find candidates that aren't labels
    const candidates = targetItems.filter(targetItem => 
      !isKnownLabel(targetItem.str.trim())
    );
    
    // First try to find a regex-matching value
    for (const candidate of candidates) {
      const candidateValue = candidate.str.trim();
      // Check against field-specific regex if available
      if (fieldType in fieldPatterns) {
        const pattern = fieldPatterns[fieldType].pattern;
        if (pattern && pattern.test(candidateValue)) {
          return {
            valueItem: candidate,
            valueCellId: targetCellId,
            distance: 1, // Adjacent cell
            validMatch: true
          };
        }
      }
    }
    
    // If no valid match but we have candidates, use the first one
    if (candidates.length > 0) {
      return {
        valueItem: candidates[0],
        valueCellId: targetCellId,
        distance: 1, // Adjacent cell
        validMatch: false
      };
    }
  }
  
  return null;
}

/**
 * Store the extracted field with validation details
 * @param {object} extractedFields The object to store fields in
 * @param {string} fieldType The type of field
 * @param {string} labelText The label text
 * @param {object|null} valueItem The value item or null
 * @param {string} labelCellId The cell ID of the label
 * @param {string} valueCellId The cell ID of the value
 * @param {number} distance The distance between label and value
 * @param {boolean} validMatch Whether this is a valid match per regex
 * @param {object} textStats Text statistics for validation
 */
function storeExtractedField(extractedFields, fieldType, labelText, valueItem, labelCellId, valueCellId, distance, validMatch, textStats) {
  const { medianFontSize, bodyTextColor } = textStats || {};
  
  if (valueItem) {
    const valueText = valueItem.str.trim();
    
    // Calculate additional attributes for validation
    const textAttributes = {
      fontSize: valueItem.fontSize,
      medianFontSize,
      fontName: valueItem.fontName,
      fillColor: valueItem.fillColor,
      bodyTextColor,
      blockScore: distance === 0 ? 3 : 1 // Higher score for same-cell matches
    };
    
    // Validate with enhanced confidence calculation
    const validation = validateFieldValue(fieldType, valueText, textAttributes);
    
    extractedFields[fieldType] = {
      label: labelText,
      value: valueText,
      labelCellId: labelCellId,
      valueCellId: valueCellId,
      distance: distance,
      confidence: validation.confidence,
      validationDetails: validation,
      textAttributes: {
        fontSize: valueItem.fontSize,
        fontName: valueItem.fontName,
        fillColor: valueItem.fillColor
      }
    };
  } else {
    // Store the label without a value
    extractedFields[fieldType] = {
      label: labelText,
      value: "",
      labelCellId: labelCellId,
      valueCellId: null,
      distance: -1,
      confidence: 0,
      validationDetails: {
        valid: false,
        confidence: 0,
        reason: 'No value found'
      }
    };
  }
}
