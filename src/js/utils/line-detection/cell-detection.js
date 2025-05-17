
/**
 * Table cell detection functionality
 */

import { mergeNearbyLines } from './line-merging.js';
import { lineIntersectsLine } from './intersection-utils.js';

/**
 * Detect table cells by analyzing line intersections
 * @param {Array} horizontalLines Horizontal lines
 * @param {Array} verticalLines Vertical lines
 * @param {Array} rectangles Rectangles
 * @returns {Array} Detected table cells
 */
export function detectTableCells(horizontalLines, verticalLines, rectangles) {
  const cells = [];
  const tolerance = 2; // Tolerance for line intersections
  
  // Sort lines by position
  horizontalLines.sort((a, b) => a.y - b.y);
  verticalLines.sort((a, b) => a.x - b.x);
  
  // Merge nearby horizontal lines (handles lines that are slightly offset)
  const mergedHorizontalLines = mergeNearbyLines(horizontalLines, 'y', tolerance);
  
  // Merge nearby vertical lines
  const mergedVerticalLines = mergeNearbyLines(verticalLines, 'x', tolerance);
  
  // Find all cell candidates by checking intersections
  for (let i = 0; i < mergedHorizontalLines.length - 1; i++) {
    const topLine = mergedHorizontalLines[i];
    const bottomLine = mergedHorizontalLines[i + 1];
    
    for (let j = 0; j < mergedVerticalLines.length - 1; j++) {
      const leftLine = mergedVerticalLines[j];
      const rightLine = mergedVerticalLines[j + 1];
      
      // Check if lines form a cell (all four sides exist)
      if (lineIntersectsLine(topLine, leftLine, tolerance) &&
          lineIntersectsLine(topLine, rightLine, tolerance) &&
          lineIntersectsLine(bottomLine, leftLine, tolerance) &&
          lineIntersectsLine(bottomLine, rightLine, tolerance)) {
        
        // Create a cell
        cells.push({
          id: `cell_${i}_${j}`,
          x: leftLine.x,
          y: topLine.y,
          width: rightLine.x - leftLine.x,
          height: bottomLine.y - topLine.y,
          top: topLine,
          right: rightLine,
          bottom: bottomLine,
          left: leftLine,
          // Store row and column for adjacency calculations
          row: i,
          col: j
        });
      }
    }
  }
  
  return cells;
}

/**
 * Check if a point is inside a cell
 * @param {number} x X coordinate
 * @param {number} y Y coordinate
 * @param {Object} cell Cell object
 * @param {number} tolerance Tolerance for boundary
 * @returns {boolean} True if the point is in the cell
 */
export function isPointInCell(x, y, cell, tolerance = 2) {
  return (
    x >= cell.x - tolerance &&
    x <= cell.x + cell.width + tolerance &&
    y >= cell.y - tolerance &&
    y <= cell.y + cell.height + tolerance
  );
}

/**
 * Get cell adjacency map for field-value detection
 * @param {Array} cells Detected cells
 * @returns {Object} Adjacency map for each cell
 */
export function getCellAdjacencyMap(cells) {
  const adjacencyMap = {};
  
  // Initialize adjacency map for each cell
  cells.forEach(cell => {
    adjacencyMap[cell.id] = {
      right: null,
      left: null,
      top: null,
      bottom: null
    };
  });
  
  // Find adjacent cells based on row/column indices
  cells.forEach(cell1 => {
    cells.forEach(cell2 => {
      // Skip same cell
      if (cell1.id === cell2.id) return;
      
      // Check if cell2 is to the right of cell1
      if (cell1.row === cell2.row && cell2.col === cell1.col + 1) {
        adjacencyMap[cell1.id].right = cell2.id;
      }
      
      // Check if cell2 is to the left of cell1
      if (cell1.row === cell2.row && cell2.col === cell1.col - 1) {
        adjacencyMap[cell1.id].left = cell2.id;
      }
      
      // Check if cell2 is below cell1
      if (cell1.col === cell2.col && cell2.row === cell1.row + 1) {
        adjacencyMap[cell1.id].bottom = cell2.id;
      }
      
      // Check if cell2 is above cell1
      if (cell1.col === cell2.col && cell2.row === cell1.row - 1) {
        adjacencyMap[cell1.id].top = cell2.id;
      }
    });
  });
  
  return adjacencyMap;
}
