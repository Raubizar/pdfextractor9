
/**
 * Text to cell assignment utilities
 */

import { isPointInCell } from './cell-detection.js';

/**
 * Assign text items to cells
 * @param {Array} textItems Text items from PDF
 * @param {Array} cells Detected cells
 * @returns {Array} Text items with cell information
 */
export function assignTextItemsToCells(textItems, cells) {
  // Create a deep copy of text items to avoid modifying the original
  const enhancedTextItems = JSON.parse(JSON.stringify(textItems));
  
  // Process each text item to find its cell
  enhancedTextItems.forEach(item => {
    // Initialize cell properties
    item.cellId = null;
    item.cellInfo = null;
    
    // Check each cell to see if it contains this text item
    for (const cell of cells) {
      if (isPointInCell(item.x, item.y, cell)) {
        item.cellId = cell.id;
        item.cellInfo = {
          row: cell.row,
          col: cell.col,
          x: cell.x,
          y: cell.y,
          width: cell.width,
          height: cell.height
        };
        break;
      }
    }
  });
  
  return enhancedTextItems;
}
