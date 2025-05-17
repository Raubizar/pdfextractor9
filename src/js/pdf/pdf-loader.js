/**
 * PDF loading functionality
 */

import { determinePaperSize, determineOrientation, analyzeTitleBlock } from '../utils/grid-analysis.js';

// Process the first page of a PDF
export function processFirstPage(data, fileId, fileName, callbacks) {
  const { updateFileListItem } = callbacks;
  
  // Load PDF document
  return pdfjsLib.getDocument({ data }).promise
    .then(function(pdf) {
      // Get the first page
      return pdf.getPage(1).then(page => {
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
        
        // Extract text content with properties and marked content
        return page.getTextContent({ normalizeWhitespace: false, includeMarkedContent: true }).then(textContent => {
          return {
            page,
            pdf,
            textContent,
            dimensions: {
              width: finalWidth,
              height: finalHeight,
              paperSize,
              orientation,
              sizeOrientation
            }
          };
        });
      });
    })
    .then(function(result) {
      // Process text items with enhanced metadata
      const textItems = result.textContent.items.map(item => {
        const style = result.textContent.styles[item.fontName];
        
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
      
      // Analyze the page for title block with weighted scoring
      const titleBlockAnalysis = analyzeTitleBlock(
        textItems, 
        result.dimensions, 
        { 
          medianFontSize, 
          bodyTextColor 
        }
      );
      
      // Prepare the return object
      const extractedData = {
        fileName: fileName,
        items: textItems,
        dimensions: result.dimensions,
        titleBlock: titleBlockAnalysis,
        pdfDocument: result.pdf,
        textStats: {
          medianFontSize,
          bodyTextColor
        }
      };
      
      // Log title block information
      console.log(`Title block found in file ${fileName}:`, titleBlockAnalysis);
      
      // Update file list item with size and orientation info
      const { paperSize, orientation, width, height } = result.dimensions;
      const dimensionText = `${paperSize} ${orientation} (${Math.round(width)}x${Math.round(height)} pts)`;
      let titleText = titleBlockAnalysis.bestCell.count > 0 
        ? ` - Title block: R${titleBlockAnalysis.bestCell.row}C${titleBlockAnalysis.bestCell.col}`
        : ' - No title block found';
        
      // Add table structure info if available
      if (titleBlockAnalysis.tableStructure && titleBlockAnalysis.tableStructure.rows.length > 0) {
        titleText += ` - ${titleBlockAnalysis.tableStructure.rows.length} rows detected`;
      }
      
      updateFileListItem(fileId, `${textItems.length} text elements extracted - ${dimensionText}${titleText}`);
      
      return extractedData;
    })
    .catch(function(error) {
      console.error('Error processing PDF:', error);
      updateFileListItem(fileId, `Error: ${error.message}`, 'error');
      throw error;
    });
}

// Helper function to calculate median of an array
function calculateMedian(numbers) {
  if (!numbers || numbers.length === 0) return 0;
  
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  
  return sorted[middle];
}

// Load PDF for display in the viewer
export function loadPDFForViewing(data, callbacks) {
  const { 
    showLoadingOverlay, 
    hideLoadingOverlay, 
    updatePageDisplay, 
    renderPage 
  } = callbacks;
  
  showLoadingOverlay();
  
  // Load PDF document
  return pdfjsLib.getDocument({ data }).promise
    .then(function(pdf) {
      updatePageDisplay(pdf);
      
      // Render the first page
      renderPage(1);
      
      hideLoadingOverlay();
      return pdf;
    })
    .catch(function(error) {
      console.error('Error loading PDF:', error);
      alert('Error loading PDF: ' + error.message);
      hideLoadingOverlay();
      throw error;
    });
}

// Extract text from specific page
export async function extractTextFromPage(pdf, pageNum) {
  try {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    return textContent.items
      .map(item => item.str)
      .join(' ')
      .replace(/\s{2,}/g, '\n');
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
}
