/**
 * Grid analysis utilities for PDF processing
 */

import { average, groupSimilarPositions, getGroupIdForPosition } from './position-utils.js';
import { drawingNumberRE, scaleRE, dateRE, revisionRE, calculateConfidence } from './validators.js';

// Paper size ranges in points (1/72 inch)
export const paperSizes = {
  A0: { width: [2384, 2384], height: [3370, 3370] },
  A1: { width: [1684, 1684], height: [2384, 2384] },
  A2: { width: [1191, 1191], height: [1684, 1684] },
  A3: { width: [842, 842], height: [1191, 1191] },
  A4: { width: [595, 595], height: [842, 842] }
};

// Keywords for title block detection
export const titleBlockKeywords = [
  "drawing no", "dwg no", "title", "project", "scale", "rev", "date"
];

// Common field labels to search for and extract
export const fieldLabels = {
  "drawing": ["drawing no", "dwg no", "drawing number", "dwg number", "drawing", "dwg"],
  "title": ["title", "name", "description"],
  "project": ["project", "project name", "job", "job name"],
  "scale": ["scale"],
  "revision": ["revision", "rev", "rev no"],
  "date": ["date", "drawn date", "issue date"],
  "drawn": ["drawn by", "drawn", "author"],
  "checked": ["checked by", "checked", "approved by", "approved"]
};

// Field validation patterns
export const fieldPatterns = {
  "drawing": {
    pattern: drawingNumberRE,
    fallbackPatterns: [/[A-Z0-9]{2,}/i]
  },
  "scale": {
    pattern: scaleRE,
    validValues: ["N/A", "AS INDICATED", "NTS", "NONE", "FULL", "HALF"]
  },
  "revision": {
    pattern: revisionRE,
    fallbackPatterns: [/^[A-Z]?\d{1,2}$/, /^REV\s*[A-Z0-9]$/i]
  },
  "date": {
    pattern: dateRE,
    fallbackPatterns: [/\d{1,2}[-/\.\s][A-Za-z]{3,9}[-/\.\s]\d{2,4}/]
  }
};

// Determine paper size based on dimensions
export function determinePaperSize(width, height) {
  // Make sure width and height are positive numbers
  width = Math.abs(width);
  height = Math.abs(height);
  
  // Compare to standard paper sizes with some tolerance (±5 points)
  for (const [size, dimensions] of Object.entries(paperSizes)) {
    const widthRange = dimensions.width;
    const heightRange = dimensions.height;
    
    // Check if dimensions match this paper size (in either orientation)
    if ((Math.abs(width - widthRange[0]) <= 5 && Math.abs(height - heightRange[0]) <= 5) ||
        (Math.abs(width - heightRange[0]) <= 5 && Math.abs(height - widthRange[0]) <= 5)) {
      return size;
    }
  }
  
  // If no standard size matches, return "Custom"
  return "Custom";
}

// Determine page orientation
export function determineOrientation(width, height) {
  return width > height ? 'landscape' : 'portrait';
}

// Analyze page for title block with weighted scoring
export function analyzeTitleBlock(textItems, dimensions, textStats = {}) {
  const { width, height } = dimensions;
  const { medianFontSize = 10, bodyTextColor = null } = textStats;
  const cellWidth = width / 4;
  const cellHeight = height / 4;
  
  // Create a 4x4 grid of cells
  const grid = Array(4).fill().map(() => Array(4).fill().map(() => ({ 
    items: [], 
    keywordCount: 0,
    weightedScore: 0,
    content: []
  })));
  
  // Assign text items to grid cells with weighted scoring
  textItems.forEach(item => {
    const col = Math.min(3, Math.max(0, Math.floor(item.x / cellWidth)));
    const row = Math.min(3, Math.max(0, Math.floor((height - item.y) / cellHeight)));
    
    grid[row][col].items.push(item);
    grid[row][col].content.push(item.str);
    
    // Check if the item contains any keywords
    const itemText = item.str.toLowerCase();
    const hasKeyword = titleBlockKeywords.some(keyword => 
      itemText.includes(keyword)
    );
    
    if (hasKeyword) {
      // Basic keyword count
      grid[row][col].keywordCount++;
      
      // Weighted scoring system
      let weight = 1.0; // Base weight
      
      // Apply weight if font is larger than median
      if (item.fontSize && medianFontSize) {
        if (item.fontSize > medianFontSize * 1.2) {
          weight += 2.0; // Significantly larger font
        } else if (item.fontSize > medianFontSize * 1.1) {
          weight += 1.0; // Moderately larger font
        }
      }
      
      // Apply weight if color is different from body text
      if (item.fillColor && bodyTextColor) {
        const itemColorKey = JSON.stringify(item.fillColor);
        const bodyColorKey = JSON.stringify(bodyTextColor);
        
        if (itemColorKey !== bodyColorKey) {
          weight += 1.0;
        }
      }
      
      // Apply weight based on font name (might indicate bold/italic/etc)
      if (item.fontName && (
          item.fontName.toLowerCase().includes('bold') || 
          item.fontName.toLowerCase().includes('heavy') ||
          item.fontName.toLowerCase().includes('black')
      )) {
        weight += 1.5;
      }
      
      grid[row][col].weightedScore += weight;
    }
  });
  
  // Find the cell with the highest weighted score
  let bestCell = { row: 0, col: 0, count: 0, score: 0 };
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      // Prioritize weighted score but still consider keyword count
      if (grid[row][col].weightedScore > bestCell.score) {
        bestCell = { 
          row, 
          col, 
          count: grid[row][col].keywordCount,
          score: grid[row][col].weightedScore 
        };
      }
    }
  }
  
  // Process items within the best cell to create a table structure
  let tableStructure = { rows: [], rowGroups: {}, colGroups: {} };
  
  if (bestCell.count > 0) {
    const bestCellItems = grid[bestCell.row][bestCell.col].items;
    
    // Step 1: Group by similar y-coordinates (rows)
    const yPositions = bestCellItems.map(item => item.y);
    const rowGroups = groupSimilarPositions(yPositions, 5); // 5 points tolerance
    
    // Step 2: Group by similar x-coordinates (columns)
    const xPositions = bestCellItems.map(item => item.x);
    const colGroups = groupSimilarPositions(xPositions, 10); // 10 points tolerance
    
    // Step 3: Assign row and column IDs to each item
    bestCellItems.forEach(item => {
      const rowId = getGroupIdForPosition(item.y, rowGroups);
      const colId = getGroupIdForPosition(item.x, colGroups);
      item.cellId = `row_${rowId}_col_${colId}`;
      
      // Store in grouped structure
      if (!tableStructure.rowGroups[rowId]) {
        tableStructure.rowGroups[rowId] = [];
      }
      if (!tableStructure.colGroups[colId]) {
        tableStructure.colGroups[colId] = [];
      }
      tableStructure.rowGroups[rowId].push(item);
      tableStructure.colGroups[colId].push(item);
    });
    
    // Sort rows by y-coordinate (decreasing, as PDF y-axis goes upward)
    const sortedRowIds = Object.keys(tableStructure.rowGroups).sort((a, b) => {
      const avgYA = average(tableStructure.rowGroups[a].map(item => item.y));
      const avgYB = average(tableStructure.rowGroups[b].map(item => item.y));
      return avgYB - avgYA; // Decreasing order
    });
    
    // For each row, sort items by x-coordinate (increasing left-to-right)
    sortedRowIds.forEach(rowId => {
      const rowItems = tableStructure.rowGroups[rowId].sort((a, b) => a.x - b.x);
      tableStructure.rows.push({ 
        rowId, 
        items: rowItems,
        avgY: average(rowItems.map(item => item.y))
      });
    });
    
    // Extract field-value pairs from the title block
    tableStructure.extractedFields = extractFieldsFromTableStructure(
      tableStructure, 
      bestCellItems, 
      { medianFontSize, bodyTextColor }
    );
  }
  
  // Create visualization information
  const gridInfo = grid.map((row, rowIndex) => 
    row.map((cell, colIndex) => ({
      keywordCount: cell.keywordCount,
      weightedScore: cell.weightedScore,
      itemCount: cell.items.length,
      isCandidate: rowIndex === bestCell.row && colIndex === bestCell.col,
      content: cell.content.join(' ')
    }))
  );
  
  return {
    bestCell,
    grid: gridInfo,
    fullGrid: grid, // This allows accessing the full grid data with all items
    titleBlockContent: bestCell.count > 0 ? grid[bestCell.row][bestCell.col].content.join(' ') : 'No title block found',
    tableStructure: bestCell.count > 0 ? tableStructure : null
  };
}

/**
 * Validate a field value against expected patterns
 * @param {string} fieldType Type of field (drawing, scale, revision, date)
 * @param {string} value The value to validate
 * @param {object} textAttributes Additional attributes for confidence calculation
 * @returns {object} Validation result with confidence score and validation details
 */
function validateFieldValue(fieldType, value, textAttributes = {}) {
  if (!value || value.trim() === '') {
    return {
      valid: false,
      confidence: 0,
      reason: 'Empty value'
    };
  }

  // Get the patterns for this field type
  const patterns = fieldPatterns[fieldType];
  if (!patterns) {
    return {
      valid: true,
      confidence: 0.5, // Default confidence for fields without patterns
      reason: 'No validation pattern defined'
    };
  }

  // Check if value matches primary regex pattern
  const regexPass = patterns.pattern && patterns.pattern.test(value);
  
  // Check valid values list
  const isValidValue = patterns.validValues && patterns.validValues.some(validValue => 
    value.toUpperCase() === validValue.toUpperCase());
  
  // Check fallback patterns if primary pattern fails
  const fallbackPass = !regexPass && patterns.fallbackPatterns && 
    patterns.fallbackPatterns.some(fallbackPattern => fallbackPattern.test(value));
  
  // Calculate font weight factor (default to 1.0)
  let fontWeightFactor = 1.0;
  if (textAttributes.fontSize && textAttributes.medianFontSize) {
    if (textAttributes.fontSize > textAttributes.medianFontSize * 1.2) {
      fontWeightFactor = 1.2; // Higher confidence for larger text
    }
  }
  
  // Calculate block score factor
  const blockScoreFactor = Math.min(1.0, 0.8 + (textAttributes.blockScore || 0) * 0.05);
  
  if (regexPass || isValidValue) {
    return {
      valid: true,
      confidence: calculateConfidence(true, fontWeightFactor, blockScoreFactor),
      reason: regexPass ? 'Matches primary pattern' : 'Matches valid value'
    };
  } else if (fallbackPass) {
    return {
      valid: true,
      confidence: calculateConfidence(false, fontWeightFactor, blockScoreFactor),
      reason: 'Matches fallback pattern'
    };
  }

  // Special case for dates - check if it might be a date
  if (fieldType === 'date') {
    const potentialDate = new Date(value);
    if (!isNaN(potentialDate.getTime())) {
      return {
        valid: true,
        confidence: calculateConfidence(false, fontWeightFactor, blockScoreFactor) * 0.8,
        reason: 'Parseable as date'
      };
    }
  }

  return {
    valid: false,
    confidence: 0,
    reason: 'Does not match any expected pattern'
  };
}

/**
 * Extract field-value pairs from the detected table structure with improved regex validation
 */
function extractFieldsFromTableStructure(tableStructure, titleBlockItems, textStats) {
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
