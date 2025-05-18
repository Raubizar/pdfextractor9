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
        
        // Calculate cell properties
        const cellX = leftLine.x;
        const cellY = topLine.y;
        const cellWidth = rightLine.x - leftLine.x;
        const cellHeight = bottomLine.y - topLine.y;
        const cellArea = cellWidth * cellHeight;
        
        // Generate a unique cell ID based on position and dimensions
        // This ensures cells are identified by their physical characteristics, not just row/col
        const cellId = `cell_${Math.round(cellX)}_${Math.round(cellY)}_${Math.round(cellWidth)}_${Math.round(cellHeight)}`;
        
        // Create a cell
        cells.push({
          id: cellId,
          x: cellX,
          y: cellY,
          width: cellWidth,
          height: cellHeight,
          top: topLine,
          right: rightLine,
          bottom: bottomLine,
          left: leftLine,
          // Keep row and column for backwards compatibility
          row: i,
          col: j,
          // Enhanced spatial info for better adjacency calculation
          spatial: {
            centerX: cellX + cellWidth / 2,
            centerY: cellY + cellHeight / 2,
            area: cellArea,
            aspectRatio: cellWidth / cellHeight
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
      
      // Enhanced direction determination with cell size consideration
      const direction = determineDirectionImproved(
        horizontalDistance, 
        verticalDistance,
        cell1.width, 
        cell1.height,
        cell2.width,
        cell2.height
      );
      
      // Store distance information
      if (direction) {
        distances.push({
          cell: cell2,
          horizontalDistance,
          verticalDistance,
          absHorizontal,
          absVertical,
          direction
        });
      }
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
          
          // If primary distances are similar, sort by orthogonal alignment
          if (Math.abs(distA - distB) < 5) {
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
 * Improved direction determination between cells with size consideration
 * @param {number} horizontalDistance Horizontal distance
 * @param {number} verticalDistance Vertical distance
 * @param {number} width1 Width of cell 1
 * @param {number} height1 Height of cell 1
 * @param {number} width2 Width of cell 2
 * @param {number} height2 Height of cell 2
 * @returns {string|null} Direction ('right', 'left', 'top', or 'bottom') or null if too ambiguous
 */
function determineDirectionImproved(horizontalDistance, verticalDistance, width1, height1, width2, height2) {
  const absHorizontal = Math.abs(horizontalDistance);
  const absVertical = Math.abs(verticalDistance);
  
  // Use cell dimensions to determine relative thresholds
  const avgWidth = (width1 + width2) / 2;
  const avgHeight = (height1 + height2) / 2;
  
  // Determine if movement is primarily horizontal or vertical
  // Considering relative cell sizes for better accuracy
  const horizontalThreshold = avgWidth * 0.8;
  const verticalThreshold = avgHeight * 0.8;
  
  // Check for ambiguous cases where cells are too diagonal from each other
  if (absHorizontal > horizontalThreshold && absVertical > verticalThreshold) {
    // Cell is too diagonal, don't consider it adjacent
    return null;
  }
  
  // Determine primary direction based on distances relative to cell sizes
  if (absHorizontal > absVertical) {
    // Primarily horizontal movement
    return horizontalDistance > 0 ? 'right' : 'left';
  } else {
    // Primarily vertical movement
    return verticalDistance > 0 ? 'bottom' : 'top';
  }
}
