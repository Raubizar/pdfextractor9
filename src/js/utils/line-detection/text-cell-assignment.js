
/**
 * Text to cell assignment utilities
 */

import { isPointInCell } from './cell-detection.js';
import { detectCellRole, analyzeInCellFieldValue } from './cell-role-detection.js';

/**
 * Assign text items to cells
 * @param {Array} textItems Text items from PDF
 * @param {Array} cells Detected cells
 * @param {Object} textStats Text statistics
 * @returns {Array} Text items with cell information
 */
export function assignTextItemsToCells(textItems, cells, textStats = {}) {
  if (!cells || cells.length === 0) return textItems;
  
  // Create a deep copy of text items to avoid modifying the original
  const enhancedTextItems = JSON.parse(JSON.stringify(textItems));
  
  // Create a map to store text items by cell ID
  const cellContentMap = {};
  
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
          height: cell.height,
          rowSpan: cell.rowSpan || 1,
          colSpan: cell.colSpan || 1,
          spatial: cell.spatial || {
            centerX: cell.x + cell.width / 2,
            centerY: cell.y + cell.height / 2
          }
        };
        
        // Add item to cell content map
        if (!cellContentMap[cell.id]) {
          cellContentMap[cell.id] = [];
        }
        cellContentMap[cell.id].push(item);
        break;
      }
    }
  });
  
  // Analyze cell contents and detect roles
  Object.entries(cellContentMap).forEach(([cellId, cellItems]) => {
    if (cellItems.length === 0) return;
    
    // Find the cell object
    const cell = cells.find(c => c.id === cellId);
    if (!cell) return;
    
    // Detect cell role
    const roleInfo = detectCellRole(cellItems, textStats, cell);
    
    // Analyze for in-cell field-value patterns
    const fieldValueInfo = analyzeInCellFieldValue(cellItems);
    
    // Add cell role and field-value information to each text item in this cell
    cellItems.forEach(item => {
      item.cellRole = roleInfo.role;
      item.cellRoleConfidence = roleInfo.confidence;
      item.cellRoleScores = roleInfo.scores;
      
      // Add field-value info if found
      if (fieldValueInfo) {
        item.cellFieldValue = {
          hasPattern: true,
          pattern: fieldValueInfo.pattern,
          isLabel: item === fieldValueInfo.labelItem,
          isValue: item === fieldValueInfo.valueItem,
          label: fieldValueInfo.label,
          value: fieldValueInfo.value,
          confidence: fieldValueInfo.confidence
        };
      } else {
        item.cellFieldValue = {
          hasPattern: false
        };
      }
    });
  });
  
  return enhancedTextItems;
}
