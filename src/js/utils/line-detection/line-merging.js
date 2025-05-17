
/**
 * Line merging utilities for table detection
 */

/**
 * Merge nearby lines to account for slight misalignments in PDFs
 * @param {Array} lines Array of lines
 * @param {string} posAttr Position attribute to check ('x' or 'y')
 * @param {number} tolerance Distance tolerance for merging
 * @returns {Array} Merged lines
 */
export function mergeNearbyLines(lines, posAttr, tolerance) {
  if (lines.length === 0) return [];
  
  const mergedLines = [];
  let currentGroup = [lines[0]];
  
  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i];
    const prevLine = currentGroup[currentGroup.length - 1];
    
    if (Math.abs(currentLine[posAttr] - prevLine[posAttr]) <= tolerance) {
      // Add to current group if within tolerance
      currentGroup.push(currentLine);
    } else {
      // Create a merged line from the current group
      mergedLines.push(createMergedLine(currentGroup, posAttr));
      // Start a new group
      currentGroup = [currentLine];
    }
  }
  
  // Add the final group
  if (currentGroup.length > 0) {
    mergedLines.push(createMergedLine(currentGroup, posAttr));
  }
  
  return mergedLines;
}

/**
 * Create a merged line from a group of nearby lines
 * @param {Array} lineGroup Group of nearby lines
 * @param {string} posAttr Position attribute ('x' or 'y')
 * @returns {Object} Merged line
 */
export function createMergedLine(lineGroup, posAttr) {
  if (lineGroup.length === 1) return lineGroup[0];
  
  const avgPos = lineGroup.reduce((sum, line) => sum + line[posAttr], 0) / lineGroup.length;
  
  if (posAttr === 'x') {
    // For vertical lines, find the min/max y values
    const allY1 = Math.min(...lineGroup.map(line => line.y1));
    const allY2 = Math.max(...lineGroup.map(line => line.y2));
    
    return {
      x: avgPos,
      y1: allY1,
      y2: allY2,
      width: Math.max(...lineGroup.map(line => line.width || 1))
    };
  } else {
    // For horizontal lines, find the min/max x values
    const allX1 = Math.min(...lineGroup.map(line => line.x1));
    const allX2 = Math.max(...lineGroup.map(line => line.x2));
    
    return {
      y: avgPos,
      x1: allX1,
      x2: allX2,
      height: Math.max(...lineGroup.map(line => line.height || 1))
    };
  }
}
