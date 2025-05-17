
/**
 * File list UI functionality
 */

// Create a file list item
export function createFileListItem(fileName, status, fileId, type = 'normal') {
  const item = document.createElement('div');
  item.className = `file-item ${type}`;
  item.id = fileId ? `item-${fileId}` : null;
  
  item.innerHTML = `
    <div class="file-name">${fileName}</div>
    <div class="file-status">${status}</div>
    ${fileId ? `<button class="view-button" data-file-id="${fileId}">View Details</button>` : ''}
  `;
  
  return item;
}

// Update file list item
export function updateFileListItem(fileId, status, type = 'normal', fileList) {
  const item = document.getElementById(`item-${fileId}`);
  if (item) {
    item.className = `file-item ${type}`;
    const statusElement = item.querySelector('.file-status');
    if (statusElement) {
      statusElement.textContent = status;
    }
  }
}

// Display file details
export function displayFileDetails(fileId, extractedTextItems, textContentElement, extractedTextElement) {
  if (extractedTextItems[fileId]) {
    const fileData = extractedTextItems[fileId];
    
    // Display text content
    textContentElement.classList.remove('hidden');
    
    // Format the extracted text for display with dimension information
    const { paperSize, orientation, width, height, sizeOrientation } = fileData.dimensions;
    const titleBlock = fileData.titleBlock;
    
    // Create header information
    const headerInfo = `File: ${fileData.fileName}\n` +
                       `Paper Size: ${paperSize}\n` +
                       `Orientation: ${orientation}\n` +
                       `Dimensions: ${Math.round(width)}x${Math.round(height)} points\n` +
                       `Group Key: ${sizeOrientation}\n\n` +
                       `Title Block Analysis:\n` +
                       `  Best Candidate: Row ${titleBlock.bestCell.row + 1}, Column ${titleBlock.bestCell.col + 1}\n` +
                       `  Keyword Count: ${titleBlock.bestCell.count}\n`;
    
    let tableInfo = '';
    let extractedFieldsInfo = '';
    
    // Add table structure information if available
    if (titleBlock.tableStructure && titleBlock.tableStructure.rows.length > 0) {
      tableInfo = `\nTable Structure Analysis:\n` +
                 `  Rows detected: ${titleBlock.tableStructure.rows.length}\n` +
                 `  Columns detected: ${Object.keys(titleBlock.tableStructure.colGroups).length}\n\n` +
                 `  Row contents:\n`;
      
      titleBlock.tableStructure.rows.forEach(row => {
        tableInfo += `  - Row ${row.rowId} (y≈${Math.round(row.avgY)}): ${row.items.map(item => `"${item.str}"`).join(', ')}\n`;
      });
      
      tableInfo += `\n  Cell IDs (row_X_col_Y):\n`;
      
      const cellIdItems = {};
      // Access the items from the full grid data in titleBlock
      if (titleBlock.bestCell.count > 0 && titleBlock.fullGrid && 
          titleBlock.fullGrid[titleBlock.bestCell.row][titleBlock.bestCell.col].items) {
        
        const items = titleBlock.fullGrid[titleBlock.bestCell.row][titleBlock.bestCell.col].items;
        items.forEach(item => {
          if (item.cellId) {
            if (!cellIdItems[item.cellId]) {
              cellIdItems[item.cellId] = [];
            }
            cellIdItems[item.cellId].push(item);
          }
        });
        
        Object.keys(cellIdItems).forEach(cellId => {
          const items = cellIdItems[cellId];
          tableInfo += `  - ${cellId}: ${items.map(item => `"${item.str}"`).join(', ')}\n`;
        });
      }
      
      // Add extracted fields information if available
      if (titleBlock.tableStructure.extractedFields) {
        const fields = titleBlock.tableStructure.extractedFields;
        
        extractedFieldsInfo = `\nExtracted Field-Value Pairs:\n`;
        
        Object.entries(fields).forEach(([fieldType, fieldData]) => {
          // Format confidence as percentage
          const confidencePercent = Math.round(fieldData.confidence * 100);
          const confidenceColor = fieldData.confidence >= 0.8 ? 'green' : 
                                 fieldData.confidence >= 0.5 ? 'orange' : 'red';
          
          extractedFieldsInfo += `  - ${fieldType.toUpperCase()}: ${fieldData.label} → "${fieldData.value}"\n`;
          extractedFieldsInfo += `    (Label Cell: ${fieldData.labelCellId}, Value Cell: ${fieldData.valueCellId || 'N/A'}, Distance: ${fieldData.distance})\n`;
          extractedFieldsInfo += `    Confidence: ${confidencePercent}% - ${fieldData.validationDetails?.reason || 'Not validated'}\n`;
        });
      }
    }
    
    const contentInfo = `\n------------------------\n\nText Elements:\n\n`;
    
    const formattedText = fileData.items.map(item => {
      return `Text: "${item.str}"\n` + 
             `Position: (${item.x.toFixed(2)}, ${item.y.toFixed(2)})\n` +
             (item.cellId ? `Cell ID: ${item.cellId}\n` : '') +
             `Font: ${item.fontName || 'Unknown'}, Size: ${item.fontSize || 'Unknown'}\n` +
             `Color: ${item.color ? JSON.stringify(item.color) : 'Unknown'}\n` +
             `------------------------`;
    }).join('\n');
    
    extractedTextElement.textContent = headerInfo + tableInfo + extractedFieldsInfo + contentInfo + formattedText;
  }
}
