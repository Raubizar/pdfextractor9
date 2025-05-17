
/**
 * Grid analysis utilities for PDF processing
 */

import { average, groupSimilarPositions, getGroupIdForPosition } from './position-utils.js';

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
    pattern: /^[A-Z0-9\-_]{2,20}$/,
    fallbackPatterns: [/[A-Z0-9]{2,}/i]
  },
  "scale": {
    pattern: /^\d+[:/@]\d+$/i,
    validValues: ["N/A", "AS INDICATED", "NTS", "NONE", "FULL", "HALF"]
  },
  "revision": {
    pattern: /^P\d+$/,
    fallbackPatterns: [/^[A-Z]?\d{1,2}$/, /^REV\s*[A-Z0-9]$/i]
  },
  "date": {
    pattern: /\d{2,4}[-/]\d{1,2}[-/]\d{2,4}/,
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

// Analyze page for title block
export function analyzeTitleBlock(textItems, dimensions) {
  const { width, height } = dimensions;
  const cellWidth = width / 4;
  const cellHeight = height / 4;
  
  // Create a 4x4 grid of cells
  const grid = Array(4).fill().map(() => Array(4).fill().map(() => ({ 
    items: [], 
    keywordCount: 0,
    content: []
  })));
  
  // Assign text items to grid cells
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
      grid[row][col].keywordCount++;
    }
  });
  
  // Find the cell with the highest keyword count
  let bestCell = { row: 0, col: 0, count: 0 };
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (grid[row][col].keywordCount > bestCell.count) {
        bestCell = { row, col, count: grid[row][col].keywordCount };
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
    tableStructure.extractedFields = extractFieldsFromTableStructure(tableStructure, bestCellItems);
  }
  
  // Create visualization information
  const gridInfo = grid.map((row, rowIndex) => 
    row.map((cell, colIndex) => ({
      keywordCount: cell.keywordCount,
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
 * @returns {object} Validation result with confidence score and validation details
 */
function validateFieldValue(fieldType, value) {
  if (!value || value.trim() === '') {
    return {
      valid: false,
      confidence: 0,
      reason: 'Empty value'
    };
  }

  const patterns = fieldPatterns[fieldType];
  if (!patterns) {
    return {
      valid: true,
      confidence: 0.5, // Default confidence for fields without patterns
      reason: 'No validation pattern defined'
    };
  }

  // Check primary pattern
  if (patterns.pattern && patterns.pattern.test(value)) {
    return {
      valid: true,
      confidence: 1,
      reason: 'Matches primary pattern'
    };
  }

  // Check valid values list
  if (patterns.validValues && patterns.validValues.some(validValue => 
    value.toUpperCase() === validValue.toUpperCase())) {
    return {
      valid: true,
      confidence: 1,
      reason: 'Matches valid value'
    };
  }

  // Check fallback patterns
  if (patterns.fallbackPatterns) {
    for (const fallbackPattern of patterns.fallbackPatterns) {
      if (fallbackPattern.test(value)) {
        return {
          valid: true,
          confidence: 0.7,
          reason: 'Matches fallback pattern'
        };
      }
    }
  }

  // Special case for dates - check if it might be a date
  if (fieldType === 'date') {
    const potentialDate = new Date(value);
    if (!isNaN(potentialDate.getTime())) {
      return {
        valid: true,
        confidence: 0.6,
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
 * Extract field-value pairs from the detected table structure
 * Search strategies:
 * 1. Look in same cell for label and value
 * 2. Look anti-clockwise (below → right → above → left) for values
 * 3. Skip other known labels as candidate values
 */
function extractFieldsFromTableStructure(tableStructure, titleBlockItems) {
  const extractedFields = {};
  const processedCellIds = new Set();
  
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
    
    // Check if there's a non-label item in the same cell
    const cellItems = cellMap[item.cellId] || [];
    const valueItems = cellItems.filter(cellItem => 
      cellItem !== item && !isKnownLabel(cellItem.str.trim())
    );
    
    if (valueItems.length > 0) {
      // Use the first non-label item in the same cell
      valueItem = valueItems[0];
    } else {
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
        
        // Find first non-label item
        const candidate = targetItems.find(targetItem => 
          !isKnownLabel(targetItem.str.trim())
        );
        
        if (candidate) {
          valueItem = candidate;
          valueCellId = targetCellId;
          distance = 1; // Adjacent cell
          break;
        }
      }
    }
    
    // Store the extracted field-value pair with validation
    if (valueItem) {
      const valueText = valueItem.str.trim();
      const validation = validateFieldValue(fieldType, valueText);
      
      extractedFields[fieldType] = {
        label: itemText,
        value: valueText,
        labelCellId: item.cellId,
        valueCellId: valueCellId,
        distance: distance,
        confidence: validation.confidence,
        validationDetails: validation
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

