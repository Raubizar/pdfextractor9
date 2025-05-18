
/**
 * Field extraction utilities for title blocks
 */

import { validateFieldValue } from '../field-validation.js';
import { updateAdjacencyWithMergedCells } from '../line-detection/merged-cell-detection.js';
import { processFieldValueFromCellRoles, processFieldValueTraditional, storeExtractedField } from './extraction-helpers.js';

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
  if (useDetectedCells && cells && cells.some(cell => cell && cell.hasOwnProperty('isMerged'))) {
    enhancedAdjacencyMap = updateAdjacencyWithMergedCells(cells, cellAdjacencyMap);
  }
  
  // Process candidate field-value pairs
  const fieldValueCandidates = [];
  
  // First priority: Find field-value pairs from within the same cell
  // This is the most reliable pattern in title blocks
  processInCellFieldValuePairs(cellMap, fieldValueCandidates);
  
  // Second priority: Process field-value pairs from cell roles
  if (useDetectedCells) {
    processFieldValueFromCellRoles(cellMap, fieldValueCandidates, enhancedAdjacencyMap, true);
  }
  
  // Third priority: Traditional method looking for label text directly
  processFieldValueTraditional(
    titleBlockItems, 
    processedCellIds,
    fieldValueCandidates,
    cellMap,
    enhancedAdjacencyMap,
    cells,
    textStats,
    useDetectedCells
  );
  
  // Select the best candidate for each field type
  const fieldTypesMap = {};
  
  // First pass: Add all candidates
  fieldValueCandidates.forEach(candidate => {
    if (!fieldTypesMap[candidate.fieldType]) {
      fieldTypesMap[candidate.fieldType] = [candidate];
    } else {
      fieldTypesMap[candidate.fieldType].push(candidate);
    }
  });
  
  // Second pass: Select best candidate for each field type
  Object.entries(fieldTypesMap).forEach(([fieldType, candidates]) => {
    // Sort candidates by confidence (highest first)
    candidates.sort((a, b) => {
      // Prioritize in-cell patterns first
      if ((a.method && a.method.includes('in-cell')) && 
          !(b.method && b.method.includes('in-cell'))) {
        return -1;
      }
      if (!(a.method && a.method.includes('in-cell')) && 
          (b.method && b.method.includes('in-cell'))) {
        return 1;
      }
      
      // Then sort by confidence
      return b.confidence - a.confidence;
    });
    
    const bestCandidate = candidates[0];
    
    // For candidates with value items, get the text
    let valueText = bestCandidate.valueText;
    if (!valueText && bestCandidate.valueItems) {
      valueText = bestCandidate.valueItems.map(item => item.str.trim()).join(' ');
    }
    
    // Calculate additional attributes for validation
    const textAttributes = {
      fontSize: bestCandidate.valueItems?.[0]?.fontSize,
      medianFontSize,
      fontName: bestCandidate.valueItems?.[0]?.fontName,
      fillColor: bestCandidate.valueItems?.[0]?.fillColor,
      bodyTextColor,
      blockScore: bestCandidate.distance === 0 ? 5 : 3, // Higher score for same-cell matches
      method: bestCandidate.method // Store detection method for confidence calculation
    };
    
    // Validate with enhanced confidence calculation
    const validation = validateFieldValue(fieldType, valueText, textAttributes);
    
    // Boost confidence for in-cell patterns
    let finalConfidence = Math.max(validation.confidence, bestCandidate.confidence * 0.95);
    if (bestCandidate.method && bestCandidate.method.includes('in-cell')) {
      finalConfidence = Math.min(1.0, finalConfidence * 1.1);
    }
    
    // Store the extracted field
    extractedFields[fieldType] = {
      label: bestCandidate.labelText,
      value: valueText || '',
      labelCellId: bestCandidate.labelCellId,
      valueCellId: bestCandidate.valueCellId,
      distance: bestCandidate.distance,
      confidence: finalConfidence,
      validationDetails: validation,
      inSameCell: bestCandidate.labelCellId === bestCandidate.valueCellId,
      method: bestCandidate.method,
      textAttributes: {
        fontSize: bestCandidate.valueItems?.[0]?.fontSize,
        fontName: bestCandidate.valueItems?.[0]?.fontName,
        fillColor: bestCandidate.valueItems?.[0]?.fillColor
      }
    };
  });
  
  return extractedFields;
}

/**
 * Process in-cell field-value patterns as highest priority
 * @param {Object} cellMap Map of cell IDs to items
 * @param {Array} fieldValueCandidates Array to store candidates
 */
function processInCellFieldValuePairs(cellMap, fieldValueCandidates) {
  // Import field matcher
  const { getFieldType } = require('../field-matcher.js');
  
  // Iterate through all cells
  Object.entries(cellMap).forEach(([cellId, cellItems]) => {
    if (!cellItems || cellItems.length === 0) return;
    
    // Look for items with field-value patterns
    cellItems.forEach(item => {
      if (item.cellFieldValue && item.cellFieldValue.hasPattern) {
        const { label, value, pattern, confidence } = item.cellFieldValue;
        const fieldType = getFieldType(label);
        
        if (fieldType) {
          // Add as candidate with high confidence
          fieldValueCandidates.push({
            fieldType,
            labelText: label,
            valueText: value,
            labelCellId: cellId,
            valueCellId: cellId,
            distance: 0,
            confidence: confidence * 1.1, // Boost confidence for in-cell patterns
            method: `in-cell-pattern-${pattern}`
          });
        }
      }
    });
  });
}

