/**
 * Grid analysis utilities for PDF processing
 */

import { average, groupSimilarPositions, getGroupIdForPosition } from './position-utils.js';
import { determinePaperSize, determineOrientation } from './paper-detection.js';
import { titleBlockKeywords } from './title-block-constants.js';
import { extractFieldsFromTableStructure } from './field-extraction.js';

// Re-export the imported functions for backward compatibility
export { determinePaperSize, determineOrientation };

// Analyze page for title block with weighted scoring
export function analyzeTitleBlock(textItems, dimensions, textStats = {}) {
  const { width, height } = dimensions;
  const { medianFontSize = 10, bodyTextColor = null, tableCells = [], cellAdjacencyMap = {} } = textStats;
  
  // Check if we have detected table cells from line analysis
  const useDetectedCells = tableCells && tableCells.length > 0;
  
  // If we have detected cells, use them for analysis
  if (useDetectedCells) {
    return analyzeWithDetectedCells(textItems, dimensions, textStats);
  }
  
  // Otherwise fall back to the grid-based analysis
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
 * Analyze document with detected cells from line analysis
 * @param {Array} textItems Text items with cell information
 * @param {Object} dimensions Page dimensions
 * @param {Object} textStats Text statistics and detected cells
 * @returns {Object} Title block analysis results
 */
function analyzeWithDetectedCells(textItems, dimensions, textStats) {
  const { medianFontSize, bodyTextColor, tableCells, cellAdjacencyMap } = textStats;
  
  // Filter to only include items that are assigned to cells
  const cellItems = textItems.filter(item => item.cellId);
  
  // Count keywords and calculate score for each cell
  const cellScores = {};
  
  // Initialize cellScores
  tableCells.forEach(cell => {
    cellScores[cell.id] = {
      id: cell.id,
      items: [],
      content: [],
      keywordCount: 0,
      weightedScore: 0,
      row: cell.row,
      col: cell.col,
      dimensions: {
        x: cell.x,
        y: cell.y,
        width: cell.width,
        height: cell.height
      }
    };
  });
  
  // Assign items to cells and calculate scores
  cellItems.forEach(item => {
    if (!item.cellId || !cellScores[item.cellId]) return;
    
    const cell = cellScores[item.cellId];
    cell.items.push(item);
    cell.content.push(item.str);
    
    // Check if the item contains any keywords
    const itemText = item.str.toLowerCase();
    const hasKeyword = titleBlockKeywords.some(keyword => 
      itemText.includes(keyword)
    );
    
    if (hasKeyword) {
      // Basic keyword count
      cell.keywordCount++;
      
      // Weighted scoring system (same as grid-based analysis)
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
      
      cell.weightedScore += weight;
    }
  });
  
  // Find the cell with the highest weighted score
  let bestCell = { id: null, row: 0, col: 0, count: 0, score: 0 };
  
  Object.values(cellScores).forEach(cell => {
    if (cell.weightedScore > bestCell.score) {
      bestCell = {
        id: cell.id,
        row: cell.row,
        col: cell.col,
        count: cell.keywordCount,
        score: cell.weightedScore
      };
    }
  });
  
  // Create a table structure for the best cell and its neighbors
  let tableStructure = { rows: [], rowGroups: {}, colGroups: {}, cells: {} };
  
  if (bestCell.id) {
    const bestCellData = cellScores[bestCell.id];
    
    // Add the best cell and adjacent cells to the table structure
    const cellsToInclude = new Set([bestCell.id]);
    
    // Add adjacent cells (recursively add neighboring cells with content)
    function addAdjacentCells(cellId, depth = 0) {
      if (depth > 3) return; // Limit recursion depth
      
      const adjacentCells = cellAdjacencyMap[cellId];
      if (!adjacentCells) return;
      
      // Check each direction
      ['right', 'bottom', 'left', 'top'].forEach(direction => {
        const adjacentId = adjacentCells[direction];
        if (adjacentId && !cellsToInclude.has(adjacentId)) {
          // Only include cells that have content
          if (cellScores[adjacentId] && cellScores[adjacentId].items.length > 0) {
            cellsToInclude.add(adjacentId);
            // Recursively add adjacent cells with decreasing depth
            addAdjacentCells(adjacentId, depth + 1);
          }
        }
      });
    }
    
    // Start adding adjacent cells from the best cell
    addAdjacentCells(bestCell.id);
    
    // Create row and column groups from included cells
    const rowMap = {};
    const colMap = {};
    
    cellsToInclude.forEach(cellId => {
      const cell = cellScores[cellId];
      if (!cell) return;
      
      // Add to row map
      if (!rowMap[cell.row]) {
        rowMap[cell.row] = [];
      }
      rowMap[cell.row].push(...cell.items);
      
      // Add to column map
      if (!colMap[cell.col]) {
        colMap[cell.col] = [];
      }
      colMap[cell.col].push(...cell.items);
      
      // Add to cell map
      tableStructure.cells[cellId] = {
        id: cellId,
        items: cell.items,
        row: cell.row,
        col: cell.col,
        dimensions: cell.dimensions
      };
    });
    
    // Convert row map to sorted rows
    tableStructure.rowGroups = rowMap;
    
    // Sort rows by their index (which corresponds to vertical position)
    const sortedRowIndices = Object.keys(rowMap).sort((a, b) => Number(a) - Number(b));
    
    sortedRowIndices.forEach(rowIdx => {
      // Sort items within row by x-coordinate
      const rowItems = rowMap[rowIdx].sort((a, b) => a.x - b.x);
      
      tableStructure.rows.push({
        rowId: rowIdx,
        items: rowItems,
        avgY: average(rowItems.map(item => item.y))
      });
    });
    
    tableStructure.colGroups = colMap;
    
    // Extract field-value pairs using our enhanced cell-based approach
    tableStructure.extractedFields = extractFieldsFromTableStructure(
      tableStructure,
      tableStructure.rows.flatMap(row => row.items),
      { 
        medianFontSize, 
        bodyTextColor,
        cellAdjacencyMap,
        cells: tableStructure.cells,
        usingDetectedCells: true
      }
    );
  }
  
  // Create a visualization mapping similar to grid-based analysis
  const gridInfo = Object.values(cellScores).map(cell => ({
    id: cell.id,
    row: cell.row,
    col: cell.col,
    keywordCount: cell.keywordCount,
    weightedScore: cell.weightedScore,
    itemCount: cell.items.length,
    isCandidate: cell.id === bestCell.id,
    content: cell.content.join(' '),
    dimensions: cell.dimensions
  }));
  
  return {
    bestCell,
    grid: gridInfo,
    titleBlockContent: bestCell.id ? cellScores[bestCell.id].content.join(' ') : 'No title block found',
    tableStructure: bestCell.id ? tableStructure : null,
    usingDetectedCells: true,
    cellAdjacencyMap
  };
}
