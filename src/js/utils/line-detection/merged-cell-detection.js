
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
    }
  });
  
  return updatedMap;
}
