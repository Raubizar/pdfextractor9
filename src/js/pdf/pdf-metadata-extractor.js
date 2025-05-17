
/**
 * PDF metadata extraction functionality
 */

import { determinePaperSize, determineOrientation } from '../utils/paper-detection.js';
import { analyzeTitleBlock } from '../utils/grid-analysis.js';
import { extractLinesAndShapes, assignTextItemsToCells, getCellAdjacencyMap } from '../utils/line-detection.js';

// Process the first page of a PDF to extract metadata
export function extractPDFMetadata(page, fileName) {
  // Get page dimensions from viewport
  const viewport = page.getViewport({ scale: 1.0 });
  const width = viewport.width;
  const height = viewport.height;
  
  // Get mediabox if available (more accurate than viewport)
  const mediaBox = page.getViewport({ scale: 1.0 }).viewBox;
  const mediaBoxWidth = mediaBox ? Math.abs(mediaBox[2] - mediaBox[0]) : width;
  const mediaBoxHeight = mediaBox ? Math.abs(mediaBox[3] - mediaBox[1]) : height;
  
  // Use mediaBox dimensions if available, otherwise use viewport
  const finalWidth = mediaBox ? mediaBoxWidth : width;
  const finalHeight = mediaBox ? mediaBoxHeight : height;
  
  // Determine paper size and orientation
  const paperSize = determinePaperSize(finalWidth, finalHeight);
  const orientation = determineOrientation(finalWidth, finalHeight);
  const sizeOrientation = `${paperSize}_${orientation}`;
  
  return {
    dimensions: {
      width: finalWidth,
      height: finalHeight,
      paperSize,
      orientation,
      sizeOrientation
    }
  };
}

// Process text content to extract rich text information
export async function processTextContent(textContent, dimensions, page) {
  // Process text items with enhanced metadata
  const textItems = textContent.items.map(item => {
    const style = textContent.styles[item.fontName];
    
    // Calculate width and height of text item
    const width = item.width || (item.transform ? item.transform[0] : 0);
    const height = style ? style.ascent - style.descent : 0;
    
    return {
      str: item.str,
      x: item.transform[4], // x position
      y: item.transform[5], // y position
      width: width,
      height: height,
      fontSize: item.fontSize || (style ? style.fontSize : null),
      fontName: item.fontName,
      fillColor: item.color || (style ? style.color : null)
    };
  });
  
  // Calculate median font size for relative comparisons
  const allFontSizes = textItems
    .map(item => item.fontSize)
    .filter(size => size != null);
  const medianFontSize = calculateMedian(allFontSizes);
  
  // Count occurrences of each color to determine body text color
  const colorCounts = {};
  textItems.forEach(item => {
    const colorKey = item.fillColor ? JSON.stringify(item.fillColor) : 'null';
    colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
  });
  
  // Find the most common color (likely the body text color)
  let bodyTextColorKey = 'null';
  let maxCount = 0;
  
  Object.entries(colorCounts).forEach(([colorKey, count]) => {
    if (count > maxCount) {
      maxCount = count;
      bodyTextColorKey = colorKey;
    }
  });
  
  const bodyTextColor = bodyTextColorKey !== 'null' ? JSON.parse(bodyTextColorKey) : null;

  // Extract lines and shapes from the page for better table detection
  let enhancedTextItems = textItems;
  let lineStructures = null;
  let tableCells = [];
  let cellAdjacencyMap = {};

  try {
    // Extract lines and shapes to find table structure
    lineStructures = await extractLinesAndShapes(page);
    
    if (lineStructures && lineStructures.tableCells && lineStructures.tableCells.length > 0) {
      tableCells = lineStructures.tableCells;
      
      // Assign text items to detected cells
      enhancedTextItems = assignTextItemsToCells(textItems, tableCells);
      
      // Create adjacency map for field-value detection
      cellAdjacencyMap = getCellAdjacencyMap(tableCells);
    }
  } catch (error) {
    console.error('Error extracting line structures:', error);
    // Fall back to grid analysis if line detection fails
  }
  
  // Analyze the page for title block with weighted scoring
  const titleBlockAnalysis = analyzeTitleBlock(
    enhancedTextItems, 
    dimensions, 
    { 
      medianFontSize, 
      bodyTextColor,
      tableCells,
      cellAdjacencyMap
    }
  );
  
  return {
    items: enhancedTextItems,
    titleBlock: titleBlockAnalysis,
    textStats: {
      medianFontSize,
      bodyTextColor
    },
    lineStructures: lineStructures,
    tableCells: tableCells,
    cellAdjacencyMap: cellAdjacencyMap
  };
}

// Helper function to calculate median of an array
export function calculateMedian(numbers) {
  if (!numbers || numbers.length === 0) return 0;
  
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  
  return sorted[middle];
}
