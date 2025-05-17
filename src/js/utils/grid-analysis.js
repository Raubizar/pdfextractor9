
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
