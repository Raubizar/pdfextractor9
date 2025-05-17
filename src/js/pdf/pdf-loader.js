
/**
 * PDF loading and processing functionality
 */

import { extractPDFMetadata, processTextContent } from './pdf-metadata-extractor.js';
import { loadPDFForViewing } from './pdf-viewer-loader.js';
import { extractTextFromPage } from './pdf-text-extractor.js';

// Process the first page of a PDF
export function processFirstPage(data, fileId, fileName, callbacks) {
  const { updateFileListItem } = callbacks;
  
  // Load PDF document
  return pdfjsLib.getDocument({ data }).promise
    .then(function(pdf) {
      // Get the first page
      return pdf.getPage(1).then(page => {
        // Extract metadata from the page
        const metadataResult = extractPDFMetadata(page, fileName);
        
        // Extract text content with properties and marked content
        return page.getTextContent({ normalizeWhitespace: false, includeMarkedContent: true }).then(textContent => {
          return {
            page,
            pdf,
            textContent,
            dimensions: metadataResult.dimensions
          };
        });
      });
    })
    .then(async function(result) {
      // Process text content with enhanced cell detection
      const textProcessingResult = await processTextContent(result.textContent, result.dimensions, result.page);
      
      // Prepare the return object
      const extractedData = {
        fileName: fileName,
        items: textProcessingResult.items,
        dimensions: result.dimensions,
        titleBlock: textProcessingResult.titleBlock,
        pdfDocument: result.pdf,
        textStats: textProcessingResult.textStats,
        lineStructures: textProcessingResult.lineStructures,
        tableCells: textProcessingResult.tableCells
      };
      
      // Log title block information
      console.log(`Title block found in file ${fileName}:`, textProcessingResult.titleBlock);
      
      // Update file list item with size, orientation and cell detection info
      const { paperSize, orientation, width, height } = result.dimensions;
      const dimensionText = `${paperSize} ${orientation} (${Math.round(width)}x${Math.round(height)} pts)`;
      
      let titleText = textProcessingResult.titleBlock.bestCell.count > 0 
        ? ` - Title block: ${textProcessingResult.titleBlock.usingDetectedCells ? 'Cell' : 'Grid'} ${textProcessingResult.titleBlock.bestCell.row}:${textProcessingResult.titleBlock.bestCell.col}`
        : ' - No title block found';
      
      // Add table structure info if available
      if (textProcessingResult.titleBlock.tableStructure && textProcessingResult.titleBlock.tableStructure.rows.length > 0) {
        titleText += ` - ${textProcessingResult.titleBlock.tableStructure.rows.length} rows detected`;
      }
      
      // Add cell detection info
      const cellInfo = textProcessingResult.tableCells && textProcessingResult.tableCells.length > 0
        ? ` - ${textProcessingResult.tableCells.length} table cells detected`
        : '';
      
      updateFileListItem(fileId, `${textProcessingResult.items.length} text elements extracted - ${dimensionText}${titleText}${cellInfo}`);
      
      return extractedData;
    })
    .catch(function(error) {
      console.error('Error processing PDF:', error);
      updateFileListItem(fileId, `Error: ${error.message}`, 'error');
      throw error;
    });
}

// Re-export functions from the other modules
export { loadPDFForViewing, extractTextFromPage };
