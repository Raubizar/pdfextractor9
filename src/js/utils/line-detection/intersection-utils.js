
/**
 * Line intersection utilities
 */

/**
 * Check if two lines intersect
 * @param {Object} line1 First line
 * @param {Object} line2 Second line
 * @param {number} tolerance Tolerance for intersection
 * @returns {boolean} True if lines intersect
 */
export function lineIntersectsLine(line1, line2, tolerance) {
  // Horizontal line intersecting vertical line
  if ('y' in line1 && 'x' in line2) {
    return (
      line1.x1 - tolerance <= line2.x &&
      line1.x2 + tolerance >= line2.x &&
      line2.y1 - tolerance <= line1.y &&
      line2.y2 + tolerance >= line1.y
    );
  }
  // Vertical line intersecting horizontal line
  else if ('x' in line1 && 'y' in line2) {
    return lineIntersectsLine(line2, line1, tolerance);
  }
  return false;
}
