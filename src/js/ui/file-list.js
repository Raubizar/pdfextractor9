
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
export function updateFileListItem(fileId, status, type = 'normal') {
  const item = document.getElementById(`item-${fileId}`);
  if (item) {
    item.className = `file-item ${type}`;
    const statusElement = item.querySelector('.file-status');
    if (statusElement) {
      statusElement.textContent = status;
    }
  }
}

// Format field confidence as percentage with color indication
function formatConfidence(confidence) {
  const confidencePercent = Math.round(confidence * 100);
  const confidenceClass = confidence >= 0.8 ? 'high-confidence' : 
                          confidence >= 0.5 ? 'medium-confidence' : 'low-confidence';
  
  return `<span class="${confidenceClass}">${confidencePercent}%</span>`;
}

// Format extracted fields information
function formatExtractedFields(fields) {
  if (!fields) return '';
  
  let extractedFieldsInfo = `\nExtracted Field-Value Pairs:\n`;
  
  Object.entries(fields).forEach(([fieldType, fieldData]) => {
    extractedFieldsInfo += `  - ${fieldType.toUpperCase()}: ${fieldData.label} → "${fieldData.value}"\n`;
    extractedFieldsInfo += `    (Label Cell: ${fieldData.labelCellId}, Value Cell: ${fieldData.valueCellId || 'N/A'}, Distance: ${fieldData.distance})\n`;
    extractedFieldsInfo += `    Confidence: ${fieldData.confidence * 100}% - ${fieldData.validationDetails?.reason || 'Not validated'}\n`;
  });
  
  return extractedFieldsInfo;
}

// Format table structure information
function formatTableStructure(tableStructure) {
  if (!tableStructure || tableStructure.rows.length === 0) return '';
  
  let tableInfo = `\nTable Structure Analysis:\n` +
                 `  Rows detected: ${tableStructure.rows.length}\n` +
                 `  Columns detected: ${Object.keys(tableStructure.colGroups).length}\n\n` +
                 `  Row contents:\n`;
  
  tableStructure.rows.forEach(row => {
    tableInfo += `  - Row ${row.rowId} (y≈${Math.round(row.avgY)}): ${row.items.map(item => `"${item.str}"`).join(', ')}\n`;
  });
  
  return tableInfo;
}

// Format cell ID information
function formatCellIdInformation(titleBlock) {
  if (!titleBlock || !titleBlock.bestCell || titleBlock.bestCell.count <= 0) return '';
  
  let cellIdInfo = `\n  Cell IDs (row_X_col_Y):\n`;
  const cellIdItems = {};
  
  // Access the items from the full grid data in titleBlock
  if (titleBlock.fullGrid && titleBlock.fullGrid[titleBlock.bestCell.row][titleBlock.bestCell.col].items) {
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
      cellIdInfo += `  - ${cellId}: ${items.map(item => `"${item.str}"`).join(', ')}\n`;
    });
  }
  
  return cellIdInfo;
}

// Format text items
function formatTextItems(items) {
  return items.map(item => {
    return `Text: "${item.str}"\n` + 
           `Position: (${item.x.toFixed(2)}, ${item.y.toFixed(2)})\n` +
           (item.cellId ? `Cell ID: ${item.cellId}\n` : '') +
           `Font: ${item.fontName || 'Unknown'}, Size: ${item.fontSize || 'Unknown'}\n` +
           `Color: ${item.color ? JSON.stringify(item.color) : 'Unknown'}\n` +
           `------------------------`;
  }).join('\n');
}

// Format header information
function formatHeaderInfo(fileData) {
  const { dimensions, titleBlock } = fileData;
  const { paperSize, orientation, width, height } = dimensions;
  
  return `File: ${fileData.fileName}\n` +
         `Paper Size: ${paperSize}\n` +
         `Orientation: ${orientation}\n` +
         `Dimensions: ${Math.round(width)}x${Math.round(height)} points\n` +
         `Group Key: ${dimensions.sizeOrientation}\n\n` +
         `Title Block Analysis:\n` +
         `  Best Candidate: Row ${titleBlock.bestCell.row + 1}, Column ${titleBlock.bestCell.col + 1}\n` +
         `  Keyword Count: ${titleBlock.bestCell.count}\n`;
}

// Display file details
export function displayFileDetails(fileId, extractedTextItems, textContentElement, extractedTextElement) {
  if (extractedTextItems[fileId]) {
    const fileData = extractedTextItems[fileId];
    
    // Display text content
    textContentElement.classList.remove('hidden');
    
    // Format the content sections individually
    const headerInfo = formatHeaderInfo(fileData);
    const tableInfo = formatTableStructure(fileData.titleBlock.tableStructure);
    const cellIdInfo = formatCellIdInformation(fileData.titleBlock);
    const extractedFieldsInfo = formatExtractedFields(fileData.titleBlock.tableStructure?.extractedFields);
    const contentInfo = `\n------------------------\n\nText Elements:\n\n`;
    const formattedText = formatTextItems(fileData.items);
    
    // Combine all the formatted sections
    extractedTextElement.textContent = headerInfo + 
                                       tableInfo + 
                                       cellIdInfo + 
                                       extractedFieldsInfo + 
                                       contentInfo + 
                                       formattedText;
  }
}
