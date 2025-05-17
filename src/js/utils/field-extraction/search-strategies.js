
/**
 * Field search strategy utilities for finding field-value pairs
 */

import { isKnownLabel, getFieldType, parseCellId } from '../field-matcher.js';
import { fieldPatterns } from '../title-block-constants.js';

/**
 * Find field-value pairs in detected cells from line analysis
 * @param {Array} fieldValueCandidates Array to store field value candidates
 * @param {string} fieldType The type of field
 * @param {object} item The label item
 * @param {string} itemText The label text
 * @param {object} cellMap Map of cell IDs to items
 * @param {object} cellAdjacencyMap Map of cell adjacency
 * @param {object} cells Cell information
 * @param {object} textStats Text statistics
 */
export function findFieldValueInDetectedCells(
  fieldValueCandidates, 
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
  
  // Create and add the candidate to the array
  if (valueItem) {
    fieldValueCandidates.push({
      fieldType,
      labelText: itemText,
      labelCellId: item.cellId,
      valueCellId: valueCellId,
      valueItems: valueItem ? [valueItem] : null,
      valueText: valueItem ? valueItem.str.trim() : null,
      distance,
      confidence: validMatch ? 0.9 : 0.7,
      method: validMatch ? 'cell-match-with-pattern' : 'cell-match'
    });
  }
}

/**
 * Find field-value pairs using the grid-based approach
 * @param {Array} fieldValueCandidates Array to store field value candidates
 * @param {string} fieldType The type of field
 * @param {object} item The label item
 * @param {string} itemText The label text
 * @param {object} cellMap Map of cell IDs to items
 * @param {object} textStats Text statistics
 */
export function findFieldValueInGrid(
  fieldValueCandidates, 
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
  
  // Create and add the candidate to the array
  if (valueItem) {
    fieldValueCandidates.push({
      fieldType,
      labelText: itemText,
      labelCellId: item.cellId,
      valueCellId: valueCellId,
      valueItems: valueItem ? [valueItem] : null,
      valueText: valueItem ? valueItem.str.trim() : null,
      distance,
      confidence: validMatch ? 0.9 : 0.7,
      method: validMatch ? 'grid-match-with-pattern' : 'grid-match'
    });
  }
}

/**
 * Find the best matching value from a list of candidates
 * @param {array} valueItems Potential value items
 * @param {string} fieldType The field type to match against
 * @returns {object|null} The best matching value item or null
 */
export function findBestValueMatch(valueItems, fieldType) {
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
export function searchAdjacentCellsByMap(cellId, cellMap, fieldType, adjacencyMap) {
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
export function searchAdjacentCells(cellCoords, cellMap, fieldType) {
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
