
/**
 * Table cell detection functionality
 */

import { mergeNearbyLines } from './line-merging.js';
import { lineIntersectsLine } from './intersection-utils.js';
import { detectMergedCells } from './merged-cell-detection.js';

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
          // Store row and column for backwards compatibility, but not primary usage
          row: i,
          col: j,
          // Add spatial info for better adjacency calculation
          spatial: {
            centerX: leftLine.x + (rightLine.x - leftLine.x) / 2,
            centerY: topLine.y + (bottomLine.y - topLine.y) / 2,
            area: (rightLine.x - leftLine.x) * (bottomLine.y - topLine.y)
          }
        });
      }
    }
  }
  
  // Detect merged cells
  const cellsWithMergeInfo = detectMergedCells(cells);
  
  return cellsWithMergeInfo;
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
  // If this is a merged cell that's not the main one, return false
  if (cell.isMerged && cell.mergedWithCellId) {
    return false;
  }
  
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
  
  // Enhanced adjacency detection with spatial positioning
  cells.forEach(cell1 => {
    // Skip merged cells that are not the main one
    if (cell1.isMerged && cell1.mergedWithCellId) return;
    
    // Calculate distances to all other cells
    const distances = [];
    
    cells.forEach(cell2 => {
      // Skip same cell and merged cells that are not the main one
      if (cell1.id === cell2.id || (cell2.isMerged && cell2.mergedWithCellId)) return;
      
      // Calculate horizontal and vertical distances between cell centers
      const horizontalDistance = cell2.spatial?.centerX - cell1.spatial?.centerX;
      const verticalDistance = cell2.spatial?.centerY - cell1.spatial?.centerY;
      
      // Calculate absolute distances
      const absHorizontal = Math.abs(horizontalDistance);
      const absVertical = Math.abs(verticalDistance);
      
      // Store distance information
      distances.push({
        cell: cell2,
        horizontalDistance,
        verticalDistance,
        absHorizontal,
        absVertical,
        direction: determineDirection(horizontalDistance, verticalDistance)
      });
    });
    
    // Find nearest cell in each direction
    ['right', 'left', 'top', 'bottom'].forEach(direction => {
      const candidates = distances.filter(d => d.direction === direction);
      
      if (candidates.length > 0) {
        // Sort by distance in relevant dimension
        const isHorizontal = direction === 'right' || direction === 'left';
        const sortedCandidates = candidates.sort((a, b) => {
          // Primary sort by relevance distance
          const distA = isHorizontal ? a.absHorizontal : a.absVertical;
          const distB = isHorizontal ? b.absHorizontal : b.absVertical;
          
          // Secondary sort by orthogonal distance
          if (Math.abs(distA - distB) < 5) { // If primary distances are similar
            const orthogonalA = isHorizontal ? a.absVertical : a.absHorizontal;
            const orthogonalB = isHorizontal ? b.absVertical : b.absHorizontal;
            return orthogonalA - orthogonalB;
          }
          
          return distA - distB;
        });
        
        // Use the best candidate
        adjacencyMap[cell1.id][direction] = sortedCandidates[0].cell.id;
      }
    });
  });
  
  return adjacencyMap;
}

/**
 * Determine the main direction between two points
 * @param {number} horizontalDistance Horizontal distance
 * @param {number} verticalDistance Vertical distance 
 * @returns {string} Direction ('right', 'left', 'top', or 'bottom')
 */
function determineDirection(horizontalDistance, verticalDistance) {
  const absHorizontal = Math.abs(horizontalDistance);
  const absVertical = Math.abs(verticalDistance);
  
  // Determine if movement is primarily horizontal or vertical
  if (absHorizontal > absVertical) {
    // Primarily horizontal movement
    return horizontalDistance > 0 ? 'right' : 'left';
  } else {
    // Primarily vertical movement
    return verticalDistance > 0 ? 'bottom' : 'top';
  }
}
