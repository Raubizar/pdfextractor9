
/**
 * Title block extraction utilities
 */

import { average, groupSimilarPositions, getGroupIdForPosition } from './position-utils.js';
import { titleBlockKeywords, fieldLabels } from './title-block-constants.js';
import { validateFieldValue } from './field-validation.js';

/**
 * Extract field-value pairs from the detected table structure with improved regex validation
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
  
  // Helper to check if a text is a known label
  const isKnownLabel = (text) => {
    const lowerText = text.toLowerCase();
    return Object.values(fieldLabels).some(variants => 
      variants.some(variant => lowerText.includes(variant))
    );
  };
  
  // Find which field category a text belongs to
  const getFieldType = (text) => {
    const lowerText = text.toLowerCase();
    for (const [fieldType, variants] of Object.entries(fieldLabels)) {
      if (variants.some(variant => lowerText.includes(variant))) {
        return fieldType;
      }
    }
    return null;
  };
  
  // Parse cell ID to get row and column numbers
  const parseCellId = (cellId) => {
    const match = cellId.match(/row_(\d+)_col_(\d+)/);
    if (match) {
      return {
        row: parseInt(match[1]),
        col: parseInt(match[2])
      };
    }
    return null;
  };
  
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
      for (const candidate of valueItems) {
        const candidateValue = candidate.str.trim();
        // Check against field-specific regex
        if (fieldType in fieldPatterns) {
          const pattern = fieldPatterns[fieldType].pattern;
          if (pattern && pattern.test(candidateValue)) {
            valueItem = candidate;
            validMatch = true;
            break;
          }
        } else {
          // If no specific regex, take the first non-label item
          valueItem = candidate;
          break;
        }
      }
      
      // If we didn't find a valid match, use the first one anyway
      if (!valueItem && valueItems.length > 0) {
        valueItem = valueItems[0];
      }
    }
    
    // If we didn't find a value in the same cell, search in adjacent cells
    if (!valueItem) {
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
              valueItem = candidate;
              valueCellId = targetCellId;
              distance = 1; // Adjacent cell
              validMatch = true;
              break;
            }
          }
        }
        
        // If we found a valid match, stop searching
        if (validMatch) break;
        
        // If no valid match but we have candidates, use the first one
        if (!valueItem && candidates.length > 0) {
          valueItem = candidates[0];
          valueCellId = targetCellId;
          distance = 1; // Adjacent cell
          break;
        }
      }
    }
    
    // Store the extracted field-value pair with improved validation
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
        label: itemText,
        value: valueText,
        labelCellId: item.cellId,
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
        label: itemText,
        value: "",
        labelCellId: item.cellId,
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
  });
  
  return extractedFields;
}

// Import fieldPatterns here to avoid circular dependency
import { fieldPatterns } from './title-block-constants.js';
