
/**
 * Line detection utilities for PDF processing
 */

// Re-export all functionality from the module files
export { extractLinesAndShapes } from './extract-lines.js';
export { detectTableCells, isPointInCell, getCellAdjacencyMap } from './cell-detection.js';
export { mergeNearbyLines, createMergedLine } from './line-merging.js';
export { lineIntersectsLine } from './intersection-utils.js';
export { assignTextItemsToCells } from './text-cell-assignment.js';
export { detectCellRole, analyzeInCellFieldValue } from './cell-role-detection.js';
export { detectMergedCells, updateAdjacencyWithMergedCells } from './merged-cell-detection.js';
