
/**
 * Field extraction helper functions
 */

import { validateFieldValue } from '../field-validation.js';
import { isKnownLabel, getFieldType } from '../field-matcher.js';

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
export function storeExtractedField(extractedFields, fieldType, labelText, valueItem, labelCellId, valueCellId, distance, validMatch, textStats) {
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
    
    // Increase confidence for values in the same cell as their labels
    if (labelCellId === valueCellId) {
      textAttributes.blockScore = 5; // Significantly higher score for same-cell matches
    }
    
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
      inSameCell: labelCellId === valueCellId,
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

/**
 * Process field-value pairs from cell roles
 * @param {Array} cellMap Map of cell IDs to items
 * @param {Array} fieldValueCandidates Array to store field value candidates
 * @param {Object} enhancedAdjacencyMap Adjacency map possibly updated with merged cell info
 * @param {Boolean} useDetectedCells Whether detected cells are being used
 */
export function processFieldValueFromCellRoles(cellMap, fieldValueCandidates, enhancedAdjacencyMap, useDetectedCells) {
  // Process each cell for role-based extraction
  Object.entries(cellMap).forEach(([cellId, cellItems]) => {
    // Skip cells with no items
    if (!cellItems || cellItems.length === 0) return;
    
    // Check if any item has cell role information
    const hasRoleInfo = cellItems.some(item => item.cellRole);
    if (hasRoleInfo) {
      // Case 1: Find label cells with adjacent value cells
      if (cellItems[0].cellRole === 'label') {
        // Get label text from all items in this cell
        const labelText = cellItems.map(item => item.str.trim()).join(' ');
        const fieldType = getFieldType(labelText);
        
        if (fieldType && useDetectedCells && enhancedAdjacencyMap[cellId]) {
          // Check right and bottom cells for values
          ['right', 'bottom'].forEach(direction => {
            const adjacentCellId = enhancedAdjacencyMap[cellId][direction];
            if (adjacentCellId && cellMap[adjacentCellId]) {
              const adjacentItems = cellMap[adjacentCellId];
              
              // Skip if adjacent cell is also a label
              if (adjacentItems[0].cellRole === 'label') return;
              
              // Add as candidate with high confidence due to role-based detection
              fieldValueCandidates.push({
                fieldType,
                labelText,
                labelCellId: cellId,
                valueCellId: adjacentCellId,
                valueItems: adjacentItems,
                distance: 1,
                confidence: 0.9,
                method: 'cell-role-adjacency'
              });
            }
          });
        }
      }
      
      // Case 2: Find in-cell field-value patterns
      const itemWithPattern = cellItems.find(item => 
        item.cellFieldValue && item.cellFieldValue.hasPattern
      );
      
      if (itemWithPattern) {
        const { label, value, confidence, pattern } = itemWithPattern.cellFieldValue;
        const fieldType = getFieldType(label);
        
        if (fieldType) {
          // Add as candidate
          fieldValueCandidates.push({
            fieldType,
            labelText: label,
            labelCellId: cellId,
            valueCellId: cellId,
            valueText: value,
            distance: 0,
            confidence: confidence * 0.95, // Slightly reduce confidence as it's in-cell pattern
            method: `in-cell-pattern-${pattern}`
          });
        }
      }
    }
  });
}

/**
 * Process field-value pairs using traditional approach
 * @param {Array} titleBlockItems Text items to process
 * @param {Object} processedCellIds Set of already processed cell IDs
 * @param {Array} fieldValueCandidates Array to store field value candidates
 * @param {Object} cellMap Map of cell IDs to items
 * @param {Object} enhancedAdjacencyMap Adjacency map possibly updated with merged cell info
 * @param {Array} cells Cell information
 * @param {Object} textStats Text statistics
 * @param {Boolean} useDetectedCells Whether detected cells are being used
 */
export function processFieldValueTraditional(
  titleBlockItems, 
  processedCellIds,
  fieldValueCandidates,
  cellMap,
  enhancedAdjacencyMap,
  cells,
  textStats,
  useDetectedCells
) {
  // Import the search strategies
  const { findFieldValueInDetectedCells, findFieldValueInGrid } = require('./search-strategies.js');
  
  titleBlockItems.forEach(item => {
    if (!item.cellId) return;
    
    const itemText = item.str.trim();
    const fieldType = getFieldType(itemText);
    
    // Skip if not a label or already processed
    if (!fieldType || processedCellIds.has(item.cellId)) return;
    
    // Mark this cell as processed for the traditional approach
    processedCellIds.add(item.cellId);
    
    // Strategy depends on whether we're using detected cells or not
    if (useDetectedCells) {
      findFieldValueInDetectedCells(
        fieldValueCandidates, 
        fieldType, 
        item, 
        itemText, 
        cellMap, 
        enhancedAdjacencyMap, 
        cells, 
        textStats
      );
    } else {
      findFieldValueInGrid(
        fieldValueCandidates, 
        fieldType, 
        item, 
        itemText, 
        cellMap, 
        textStats
      );
    }
  });
}
