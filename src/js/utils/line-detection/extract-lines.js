
/**
 * Core line detection functionality for PDF processing
 */

/**
 * Extract lines and shapes from a PDF page
 * @param {Object} page PDF.js page object
 * @returns {Promise<Object>} Extracted lines and shapes
 */
export async function extractLinesAndShapes(page) {
  // Get the operator list that contains drawing operations
  const operatorList = await page.getOperatorList();
  const viewport = page.getViewport({ scale: 1.0 });
  
  // Arrays to store detected lines
  const horizontalLines = [];
  const verticalLines = [];
  const rectangles = [];
  
  // Stack for transformation matrices
  const transformStack = [viewport.transform.slice()];
  let currentTransform = transformStack[0].slice();
  
  // Process the operator list to find lines and rectangles
  for (let i = 0; i < operatorList.fnArray.length; i++) {
    const fnId = operatorList.fnArray[i];
    const args = operatorList.argsArray[i];
    
    // Handle different operator types
    switch (fnId) {
      // Save graphics state
      case pdfjsLib.OPS.save:
        transformStack.push(currentTransform.slice());
        break;
        
      // Restore graphics state
      case pdfjsLib.OPS.restore:
        currentTransform = transformStack.pop();
        break;
        
      // Transform matrix
      case pdfjsLib.OPS.transform:
        // Multiply the matrices
        const newTransform = viewport.transform.slice();
        pdfjsLib.Util.transform(
          newTransform,
          args[0], args[1], args[2],
          args[3], args[4], args[5]
        );
        currentTransform = newTransform;
        break;
        
      // Stroke path - look for lines
      case pdfjsLib.OPS.stroke:
      case pdfjsLib.OPS.fill:
      case pdfjsLib.OPS.eoFill:
      case pdfjsLib.OPS.fillStroke:
      case pdfjsLib.OPS.eoFillStroke:
        // Process the path if we've collected segments
        if (pathSegments.length > 0) {
          analyzePathSegments(pathSegments, horizontalLines, verticalLines, rectangles, currentTransform);
          pathSegments = [];
        }
        break;
        
      // Line segments
      case pdfjsLib.OPS.moveTo:
        pathSegments.push({ type: 'moveTo', x: args[0], y: args[1] });
        break;
        
      case pdfjsLib.OPS.lineTo:
        pathSegments.push({ type: 'lineTo', x: args[0], y: args[1] });
        break;
        
      case pdfjsLib.OPS.rectangle:
        rectangles.push({
          x: applyTransform(args[0], args[1], currentTransform).x,
          y: applyTransform(args[0], args[1], currentTransform).y,
          width: args[2],
          height: args[3],
          transform: currentTransform.slice()
        });
        break;
    }
  }
  
  // Further analyze collected lines to find table cells
  const tableCells = detectTableCells(horizontalLines, verticalLines, rectangles);
  
  return {
    horizontalLines,
    verticalLines,
    rectangles,
    tableCells
  };
}

// Track path segments for line detection
let pathSegments = [];

/**
 * Analyze path segments to identify lines
 * @param {Array} segments Path segments
 * @param {Array} horizontalLines Array to store horizontal lines
 * @param {Array} verticalLines Array to store vertical lines
 * @param {Array} rectangles Array to store rectangles
 * @param {Array} transform Current transform matrix
 */
function analyzePathSegments(segments, horizontalLines, verticalLines, rectangles, transform) {
  // Need at least two points to form a line
  if (segments.length < 2) return;
  
  // Check for simple lines (2 points, moveTo followed by lineTo)
  if (segments.length === 2 && 
      segments[0].type === 'moveTo' && 
      segments[1].type === 'lineTo') {
      
    const start = applyTransform(segments[0].x, segments[0].y, transform);
    const end = applyTransform(segments[1].x, segments[1].y, transform);
    
    // Determine if horizontal or vertical (allow small deviation)
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    
    if (dx < 2 && dy > 5) {
      // Vertical line (x positions are very close)
      verticalLines.push({
        x: Math.min(start.x, end.x),
        y1: Math.min(start.y, end.y),
        y2: Math.max(start.y, end.y),
        width: dx
      });
    } else if (dy < 2 && dx > 5) {
      // Horizontal line (y positions are very close)
      horizontalLines.push({
        y: Math.min(start.y, end.y),
        x1: Math.min(start.x, end.x),
        x2: Math.max(start.x, end.x),
        height: dy
      });
    }
  }
  
  // Check for rectangles (4 points forming a closed path)
  // This is a simplified check - real PDFs might have more complex paths
  if (segments.length === 5 && 
      segments[0].type === 'moveTo' && 
      segments[4].type === 'lineTo' &&
      segments[0].x === segments[4].x && 
      segments[0].y === segments[4].y) {
    
    // Get the bounds of the rectangle
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    for (let i = 0; i < 4; i++) {
      const point = applyTransform(segments[i].x, segments[i].y, transform);
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
    
    rectangles.push({
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    });
  }
}

/**
 * Apply transform matrix to coordinates
 * @param {number} x X coordinate
 * @param {number} y Y coordinate
 * @param {Array} transform Transform matrix
 * @returns {Object} Transformed coordinates
 */
function applyTransform(x, y, transform) {
  return {
    x: transform[0] * x + transform[2] * y + transform[4],
    y: transform[1] * x + transform[3] * y + transform[5]
  };
}

// Import from other modules
import { detectTableCells } from './cell-detection.js';
