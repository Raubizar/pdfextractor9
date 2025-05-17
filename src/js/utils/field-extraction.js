
/**
 * Field extraction utilities for title blocks
 */

import { validateFieldValue } from './field-validation.js';
import { fieldPatterns } from './title-block-constants.js';
import { isKnownLabel, getFieldType, parseCellId } from './field-matcher.js';
import { updateAdjacencyWithMergedCells } from './line-detection/merged-cell-detection.js';

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
  const { 
    medianFontSize, 
    bodyTextColor, 
    cellAdjacencyMap,
    cells,
    usingDetectedCells 
  } = textStats || {};
  
  // Determine if we're using detected cells from line analysis
  const useDetectedCells = usingDetectedCells && cellAdjacencyMap && cells;
  
  // Create a map for quick lookup of items by cell ID
  const cellMap = {};
  titleBlockItems.forEach(item => {
    if (!item.cellId) return;
    
    if (!cellMap[item.cellId]) {
      cellMap[item.cellId] = [];
    }
    cellMap[item.cellId].push(item);
  });
  
  // Update adjacency map if cells have merge information
  let enhancedAdjacencyMap = cellAdjacencyMap;
  if (useDetectedCells && cells.some(cell => cell.hasOwnProperty('isMerged'))) {
    enhancedAdjacencyMap = updateAdjacencyWithMergedCells(cells, cellAdjacencyMap);
  }
  
  // Process candidate field-value pairs
  const fieldValueCandidates = [];
  
  // Approach 1: Find field-value pairs from cell roles
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
  
  // Approach 2: Traditional method looking for label text directly
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
  
  // Select the best candidate for each field type
  const fieldTypesMap = {};
  
  fieldValueCandidates.forEach(candidate => {
    if (!fieldTypesMap[candidate.fieldType]) {
      fieldTypesMap[candidate.fieldType] = candidate;
    } else {
      const existing = fieldTypesMap[candidate.fieldType];
      
      // Select the candidate with higher confidence
      if (candidate.confidence > existing.confidence) {
        fieldTypesMap[candidate.fieldType] = candidate;
      }
    }
  });
  
  // Convert candidates to final extracted fields
  Object.entries(fieldTypesMap).forEach(([fieldType, candidate]) => {
    // For candidates with value items, get the text
    let valueText = candidate.valueText;
    if (!valueText && candidate.valueItems) {
      valueText = candidate.valueItems.map(item => item.str.trim()).join(' ');
    }
    
    // Calculate additional attributes for validation
    const textAttributes = {
      fontSize: candidate.valueItems?.[0]?.fontSize,
      medianFontSize,
      fontName: candidate.valueItems?.[0]?.fontName,
      fillColor: candidate.valueItems?.[0]?.fillColor,
      bodyTextColor,
      blockScore: candidate.distance === 0 ? 5 : 3, // Higher score for same-cell matches
      method: candidate.method // Store detection method for confidence calculation
    };
    
    // Validate with enhanced confidence calculation
    const validation = validateFieldValue(fieldType, valueText, textAttributes);
    
    // Store the extracted field
    extractedFields[fieldType] = {
      label: candidate.labelText,
      value: valueText || '',
      labelCellId: candidate.labelCellId,
      valueCellId: candidate.valueCellId,
      distance: candidate.distance,
      confidence: Math.max(validation.confidence, candidate.confidence * 0.9),
      validationDetails: validation,
      inSameCell: candidate.labelCellId === candidate.valueCellId,
      method: candidate.method,
      textAttributes: {
        fontSize: candidate.valueItems?.[0]?.fontSize,
        fontName: candidate.valueItems?.[0]?.fontName,
        fillColor: candidate.valueItems?.[0]?.fillColor
      }
    };
  });
  
  return extractedFields;
}

/**
 * Find field-value pairs in detected cells from line analysis
 * @param {object} extractedFields The object to store fields in
 * @param {string} fieldType The type of field
 * @param {object} item The label item
 * @param {string} itemText The label text
 * @param {object} cellMap Map of cell IDs to items
 * @param {object} cellAdjacencyMap Map of cell adjacency
 * @param {object} cells Cell information
 * @param {object} textStats Text statistics
 */
function findFieldValueInDetectedCells(
  extractedFields, 
  fieldType, 
  item, 
  itemText, 
  cellMap, 
  cellAdjacencyMap, 
  cells, 
  textStats
) {
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
  
  // If we didn't find a valid value in the same cell, use adjacency map to check nearby cells
  if (!valueItem && cellAdjacencyMap && cellAdjacencyMap[item.cellId]) {
    const result = searchAdjacentCellsByMap(
      item.cellId, 
      cellMap, 
      fieldType, 
      cellAdjacencyMap
    );
    
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
}

/**
 * Find field-value pairs using the grid-based approach
 * @param {object} extractedFields The object to store fields in
 * @param {string} fieldType The type of field
 * @param {object} item The label item
 * @param {string} itemText The label text
 * @param {object} cellMap Map of cell IDs to items
 * @param {object} textStats Text statistics
 */
function findFieldValueInGrid(
  extractedFields, 
  fieldType, 
  item, 
  itemText, 
  cellMap, 
  textStats
) {
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
 * Search adjacent cells using the adjacency map
 * @param {string} cellId The current cell ID
 * @param {object} cellMap Map of cell IDs to items
 * @param {string} fieldType The field type to match against
 * @param {object} adjacencyMap Map of cell adjacency
 * @returns {object|null} Object with found value information or null
 */
function searchAdjacentCellsByMap(cellId, cellMap, fieldType, adjacencyMap) {
  // Get adjacent cell IDs
  const adjacentCells = adjacencyMap[cellId];
  if (!adjacentCells) return null;
  
  // Search in this order: right, bottom, left, top
  const directions = ['right', 'bottom', 'left', 'top'];
  
  for (const direction of directions) {
    const adjacentCellId = adjacentCells[direction];
    if (!adjacentCellId) continue;
    
    const adjacentItems = cellMap[adjacentCellId] || [];
    
    // Find candidates that aren't labels
    const candidates = adjacentItems.filter(item => 
      !isKnownLabel(item.str.trim())
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
            valueCellId: adjacentCellId,
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
        valueCellId: adjacentCellId,
        distance: 1, // Adjacent cell
        validMatch: false
      };
    }
  }
  
  return null;
}

/**
 * Search adjacent cells for a matching value (grid-based approach)
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
