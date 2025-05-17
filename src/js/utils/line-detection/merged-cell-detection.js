
/**
 * Merged cell detection utilities
 */

/**
 * Detect merged cells in a grid of cells
 * @param {Array} cells Detected cells
 * @returns {Array} Updated cells with merged cell information
 */
export function detectMergedCells(cells) {
  if (!cells || cells.length === 0) return cells;
  
  // Create a copy of cells to avoid modifying the original
  const enhancedCells = JSON.parse(JSON.stringify(cells));
  
  // Add spanning information to each cell
  enhancedCells.forEach(cell => {
    cell.rowSpan = 1;
    cell.colSpan = 1;
    cell.isMerged = false;
    cell.mergedWithCellId = null;
  });
  
  // Sort cells by row and column
  enhancedCells.sort((a, b) => {
    if (a.row !== b.row) {
      return a.row - b.row;
    }
    return a.col - b.col;
  });
  
  // Create grid representation for easier analysis
  const grid = {};
  enhancedCells.forEach(cell => {
    if (!grid[cell.row]) grid[cell.row] = {};
    grid[cell.row][cell.col] = cell;
  });
  
  // Find horizontally merged cells (cells that span multiple columns)
  enhancedCells.forEach(cell => {
    // Skip if already marked as part of a merged cell
    if (cell.isMerged) return;
    
    // Check for cells with same height and y position but adjacent x positions
    const sameRowCells = enhancedCells.filter(c => 
      c.row === cell.row && 
      c.col > cell.col &&
      Math.abs(c.y - cell.y) < 2 &&
      Math.abs(c.height - cell.height) < 2
    );
    
    // If adjacent cells are found, check if they form a continuous span
    const adjacentCells = sameRowCells.filter(c => {
      const prevCell = grid[c.row][c.col - 1];
      return prevCell && Math.abs((prevCell.x + prevCell.width) - c.x) < 5;
    });
    
    // Mark as horizontally merged if we have adjacent cells
    if (adjacentCells.length > 0) {
      cell.colSpan = 1 + adjacentCells.length;
      
      // Mark adjacent cells as merged with this cell
      adjacentCells.forEach(adjCell => {
        adjCell.isMerged = true;
        adjCell.mergedWithCellId = cell.id;
      });
    }
  });
  
  // Find vertically merged cells (cells that span multiple rows)
  enhancedCells.forEach(cell => {
    // Skip if already marked as part of a horizontally merged cell
    if (cell.isMerged) return;
    
    // Check for cells with same width and x position but adjacent y positions
    const sameColCells = enhancedCells.filter(c => 
      c.col === cell.col && 
      c.row > cell.row &&
      Math.abs(c.x - cell.x) < 2 &&
      Math.abs(c.width - cell.width) < 2
    );
    
    // If adjacent cells are found, check if they form a continuous span
    const adjacentCells = sameColCells.filter(c => {
      const prevCell = grid[c.row - 1] && grid[c.row - 1][c.col];
      return prevCell && Math.abs((prevCell.y + prevCell.height) - c.y) < 5;
    });
    
    // Mark as vertically merged if we have adjacent cells
    if (adjacentCells.length > 0) {
      cell.rowSpan = 1 + adjacentCells.length;
      
      // Mark adjacent cells as merged with this cell
      adjacentCells.forEach(adjCell => {
        adjCell.isMerged = true;
        adjCell.mergedWithCellId = cell.id;
      });
    }
  });

  // Add spatial information to merged cells
  enhancedCells.forEach(cell => {
    // Update spatial information for merged cells
    if (cell.rowSpan > 1 || cell.colSpan > 1) {
      // Calculate the center of the merged cell
      cell.spatial = {
        centerX: cell.x + cell.width / 2,
        centerY: cell.y + cell.height / 2,
        area: cell.width * cell.height
      };
    }
  });
  
  return enhancedCells;
}

/**
 * Update adjacency map accounting for merged cells
 * @param {Array} cells Cells with merged cell information
 * @param {Object} adjacencyMap Original adjacency map
 * @returns {Object} Updated adjacency map
 */
export function updateAdjacencyWithMergedCells(cells, adjacencyMap) {
  // Create a deep copy of the adjacency map
  const updatedMap = JSON.parse(JSON.stringify(adjacencyMap));
  
  // Handle merged cells by connecting to the main cell
  cells.forEach(cell => {
    if (cell.isMerged && cell.mergedWithCellId) {
      const mainCellId = cell.mergedWithCellId;
      
      // Update cells that point to the merged cell to point to the main cell
      Object.keys(updatedMap).forEach(cellId => {
        const relations = updatedMap[cellId];
        
        Object.keys(relations).forEach(direction => {
          if (relations[direction] === cell.id) {
            relations[direction] = mainCellId;
          }
        });
      });
      
      // Remove the merged cell from the adjacency map
      delete updatedMap[cell.id];
    }
  });

  // Update adjacencies based on spatial positioning for merged cells
  cells.forEach(cell => {
    // Only process cells that have spans > 1 (merged cells)
    if ((cell.rowSpan > 1 || cell.colSpan > 1) && !cell.isMerged) {
      // We may need to update adjacent cells based on the expanded area
      const cellsRelatedToMerged = findCellsRelatedToMerged(cell, cells);
      
      // Update adjacencies
      cellsRelatedToMerged.forEach(relatedCell => {
        const direction = relatedCell.direction;
        
        // Update the relevant direction in the adjacency map
        if (updatedMap[cell.id] && !updatedMap[cell.id][direction]) {
          updatedMap[cell.id][direction] = relatedCell.cell.id;
        }
        
        // Update the opposite direction
        const oppositeDirection = getOppositeDirection(direction);
        if (updatedMap[relatedCell.cell.id] && !updatedMap[relatedCell.cell.id][oppositeDirection]) {
          updatedMap[relatedCell.cell.id][oppositeDirection] = cell.id;
        }
      });
    }
  });
  
  return updatedMap;
}

/**
 * Find cells related to a merged cell by spatial position
 * @param {Object} mergedCell The merged cell
 * @param {Array} allCells All cells in the grid
 * @returns {Array} Cells related to the merged cell with direction information
 */
function findCellsRelatedToMerged(mergedCell, allCells) {
  const relatedCells = [];
  
  // Calculate the merged cell's boundaries
  const mergedBounds = {
    left: mergedCell.x,
    right: mergedCell.x + mergedCell.width,
    top: mergedCell.y,
    bottom: mergedCell.y + mergedCell.height
  };
  
  // Check each cell for spatial relationships
  allCells.forEach(cell => {
    // Skip the merged cell itself and any merged cells
    if (cell.id === mergedCell.id || cell.isMerged) return;
    
    const cellBounds = {
      left: cell.x,
      right: cell.x + cell.width,
      top: cell.y,
      bottom: cell.y + cell.height
    };
    
    // Check if the cell is to the right of the merged cell
    if (Math.abs(cellBounds.left - mergedBounds.right) < 5 &&
        !(cellBounds.top > mergedBounds.bottom || cellBounds.bottom < mergedBounds.top)) {
      relatedCells.push({
        cell,
        direction: 'right',
        distance: cellBounds.left - mergedBounds.right
      });
    }
    
    // Check if the cell is to the left of the merged cell
    if (Math.abs(cellBounds.right - mergedBounds.left) < 5 &&
        !(cellBounds.top > mergedBounds.bottom || cellBounds.bottom < mergedBounds.top)) {
      relatedCells.push({
        cell,
        direction: 'left',
        distance: mergedBounds.left - cellBounds.right
      });
    }
    
    // Check if the cell is below the merged cell
    if (Math.abs(cellBounds.top - mergedBounds.bottom) < 5 &&
        !(cellBounds.left > mergedBounds.right || cellBounds.right < mergedBounds.left)) {
      relatedCells.push({
        cell,
        direction: 'bottom',
        distance: cellBounds.top - mergedBounds.bottom
      });
    }
    
    // Check if the cell is above the merged cell
    if (Math.abs(cellBounds.bottom - mergedBounds.top) < 5 &&
        !(cellBounds.left > mergedBounds.right || cellBounds.right < mergedBounds.left)) {
      relatedCells.push({
        cell,
        direction: 'top',
        distance: mergedBounds.top - cellBounds.bottom
      });
    }
  });
  
  // Sort related cells by distance in each direction
  const result = [];
  
  ['right', 'left', 'bottom', 'top'].forEach(direction => {
    const directionCells = relatedCells
      .filter(item => item.direction === direction)
      .sort((a, b) => Math.abs(a.distance) - Math.abs(b.distance));
    
    if (directionCells.length > 0) {
      result.push(directionCells[0]); // Add the closest cell in this direction
    }
  });
  
  return result;
}

/**
 * Get the opposite direction
 * @param {string} direction Direction ('right', 'left', 'top', 'bottom')
 * @returns {string} Opposite direction
 */
function getOppositeDirection(direction) {
  switch (direction) {
    case 'right': return 'left';
    case 'left': return 'right';
    case 'top': return 'bottom';
    case 'bottom': return 'top';
    default: return null;
  }
}
