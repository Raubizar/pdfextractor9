
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
  if (useDetectedCells && cells.some(cell => cell.hasOwnProperty('isMerged'))) {
    enhancedAdjacencyMap = updateAdjacencyWithMergedCells(cells, cellAdjacencyMap);
  }
  
  // Process candidate field-value pairs
  const fieldValueCandidates = [];
  
  // Approach 1: Find field-value pairs from cell roles
  processFieldValueFromCellRoles(cellMap, fieldValueCandidates, enhancedAdjacencyMap, useDetectedCells);
  
  // Approach 2: Traditional method looking for label text directly
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
