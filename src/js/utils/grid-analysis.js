
/**
 * Grid analysis utilities for PDF processing
 */

import { average, groupSimilarPositions, getGroupIdForPosition } from './position-utils.js';
import { determinePaperSize, determineOrientation } from './paper-detection.js';
import { titleBlockKeywords } from './title-block-constants.js';
import { extractFieldsFromTableStructure } from './title-block-extraction.js';

// Re-export the imported functions for backward compatibility
export { determinePaperSize, determineOrientation };

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
