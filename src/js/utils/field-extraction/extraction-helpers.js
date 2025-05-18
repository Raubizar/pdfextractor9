
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
      blockScore: distance === 0 ? 5 : (distance === 1 ? 3 : 1) // Higher score for closer matches
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
 * @param {Object} cellMap Map of cell IDs to items
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
        
        if (fieldType && useDetectedCells && enhancedAdjacencyMap && enhancedAdjacencyMap[cellId]) {
          // Check all directions, prioritizing right and bottom for value cells
          ['right', 'bottom', 'left', 'top'].forEach((direction, dirIndex) => {
            const adjacentCellId = enhancedAdjacencyMap[cellId][direction];
            if (adjacentCellId && cellMap[adjacentCellId]) {
              const adjacentItems = cellMap[adjacentCellId];
              
              // Skip if adjacent cell is also a label or header
              if (adjacentItems[0].cellRole === 'label' || adjacentItems[0].cellRole === 'header') {
                return;
              }
              
              // Calculate confidence based on direction and cell role
              let directionConfidence = 0.9;
              if (direction === 'left' || direction === 'top') {
                directionConfidence = 0.7; // Less common directions
              }
              
              if (adjacentItems[0].cellRole === 'value') {
                directionConfidence += 0.1; // Boost if cell is identified as value
              }
              
              // Add as candidate
              fieldValueCandidates.push({
                fieldType,
                labelText,
                labelCellId: cellId,
                valueCellId: adjacentCellId,
                valueItems: adjacentItems,
                distance: 1, // Adjacent cells have distance 1
                confidence: directionConfidence,
                method: `cell-role-adjacency-${direction}`
              });
            }
          });
        }
      }
      
      // Case 2: Mixed cells containing both label and value
      if (cellItems[0].cellRole === 'mixed') {
        // Look for in-cell field-value patterns 
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
              valueText: value,
              labelCellId: cellId,
              valueCellId: cellId,
              distance: 0, // Same cell has distance 0
              confidence: confidence * 0.95,
              method: `mixed-cell-pattern-${pattern}`
            });
          }
        }
      }
    }
  });
}

/**
 * Process field-value pairs using traditional approach
 * @param {Array} titleBlockItems Text items to process
 * @param {Set} processedCellIds Set of already processed cell IDs
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
    // Skip items without cell ID or already processed
    if (!item.cellId || processedCellIds.has(item.cellId)) return;
    
    const itemText = item.str.trim();
    const fieldType = getFieldType(itemText);
    
    // Skip if not a label
    if (!fieldType) return;
    
    // Mark this cell as processed for the traditional approach
    processedCellIds.add(item.cellId);
    
    // Strategy depends on whether we're using detected cells or not
    if (useDetectedCells && enhancedAdjacencyMap) {
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

