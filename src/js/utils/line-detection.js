
/**
 * Line detection utilities for PDF processing
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

/**
 * Detect table cells by analyzing line intersections
 * @param {Array} horizontalLines Horizontal lines
 * @param {Array} verticalLines Vertical lines
 * @param {Array} rectangles Rectangles
 * @returns {Array} Detected table cells
 */
function detectTableCells(horizontalLines, verticalLines, rectangles) {
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
          // Store row and column for adjacency calculations
          row: i,
          col: j
        });
      }
    }
  }
  
  return cells;
}

/**
 * Merge nearby lines to account for slight misalignments in PDFs
 * @param {Array} lines Array of lines
 * @param {string} posAttr Position attribute to check ('x' or 'y')
 * @param {number} tolerance Distance tolerance for merging
 * @returns {Array} Merged lines
 */
function mergeNearbyLines(lines, posAttr, tolerance) {
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
function createMergedLine(lineGroup, posAttr) {
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

/**
 * Check if two lines intersect
 * @param {Object} line1 First line
 * @param {Object} line2 Second line
 * @param {number} tolerance Tolerance for intersection
 * @returns {boolean} True if lines intersect
 */
function lineIntersectsLine(line1, line2, tolerance) {
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

/**
 * Check if a point is inside a cell
 * @param {number} x X coordinate
 * @param {number} y Y coordinate
 * @param {Object} cell Cell object
 * @param {number} tolerance Tolerance for boundary
 * @returns {boolean} True if the point is in the cell
 */
export function isPointInCell(x, y, cell, tolerance = 2) {
  return (
    x >= cell.x - tolerance &&
    x <= cell.x + cell.width + tolerance &&
    y >= cell.y - tolerance &&
    y <= cell.y + cell.height + tolerance
  );
}

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
  
  // Find adjacent cells based on row/column indices
  cells.forEach(cell1 => {
    cells.forEach(cell2 => {
      // Skip same cell
      if (cell1.id === cell2.id) return;
      
      // Check if cell2 is to the right of cell1
      if (cell1.row === cell2.row && cell2.col === cell1.col + 1) {
        adjacencyMap[cell1.id].right = cell2.id;
      }
      
      // Check if cell2 is to the left of cell1
      if (cell1.row === cell2.row && cell2.col === cell1.col - 1) {
        adjacencyMap[cell1.id].left = cell2.id;
      }
      
      // Check if cell2 is below cell1
      if (cell1.col === cell2.col && cell2.row === cell1.row + 1) {
        adjacencyMap[cell1.id].bottom = cell2.id;
      }
      
      // Check if cell2 is above cell1
      if (cell1.col === cell2.col && cell2.row === cell1.row - 1) {
        adjacencyMap[cell1.id].top = cell2.id;
      }
    });
  });
  
  return adjacencyMap;
}
