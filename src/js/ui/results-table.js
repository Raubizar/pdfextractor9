
/**
 * Results table component for displaying extraction results
 */

// Remove the Table import as we're not actually using it
// The Table component is defined in a .tsx file but we're using vanilla JS here

// Create a results table for extracted fields
export function createResultsTable(extractedFields) {
  if (!extractedFields || Object.keys(extractedFields).length === 0) {
    return document.createTextNode('No fields extracted');
  }
  
  // Create table container
  const tableContainer = document.createElement('div');
  tableContainer.className = 'results-table-container';
  
  // Create table header
  const table = document.createElement('table');
  table.className = 'results-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Field Name</th>
        <th>Label</th>
        <th>Value</th>
        <th>Confidence</th>
      </tr>
    </thead>
    <tbody>
    </tbody>
  `;
  
  const tbody = table.querySelector('tbody');
  
  // Add table rows for each field
  Object.entries(extractedFields).forEach(([fieldType, fieldData]) => {
    const row = document.createElement('tr');
    
    // Format confidence as a percentage with color
    const confidenceHtml = formatConfidence(fieldData.confidence);
    
    row.innerHTML = `
      <td>${fieldType.toUpperCase()}</td>
      <td>${fieldData.label || 'N/A'}</td>
      <td>${fieldData.value || 'N/A'}</td>
      <td>${confidenceHtml}</td>
    `;
    
    tbody.appendChild(row);
  });
  
  tableContainer.appendChild(table);
  return tableContainer;
}

// Format confidence score with color indicator
export function formatConfidence(confidence) {
  const confidencePercent = Math.round(confidence * 100);
  const confidenceClass = confidence >= 0.8 ? 'high-confidence' : 
                          confidence >= 0.5 ? 'medium-confidence' : 'low-confidence';
  
  return `<span class="${confidenceClass}">${confidencePercent}%</span>`;
}

// Create structured metadata object for export
export function createMetadataObject(fileData) {
  if (!fileData) return null;
  
  return {
    file: {
      name: fileData.fileName,
      dimensions: fileData.dimensions
    },
    titleBlock: {
      location: {
        row: fileData.titleBlock.bestCell.row,
        col: fileData.titleBlock.bestCell.col
      },
      keywordCount: fileData.titleBlock.bestCell.count,
      cellStructure: fileData.titleBlock.tableStructure ? {
        rowCount: fileData.titleBlock.tableStructure.rows.length,
        columnCount: Object.keys(fileData.titleBlock.tableStructure.colGroups || {}).length
      } : null
    },
    extractedFields: fileData.titleBlock.tableStructure?.extractedFields || {},
    textElements: {
      count: fileData.items.length
    }
  };
}

// Export metadata as JSON
export function exportMetadataAsJson(metadata) {
  return JSON.stringify(metadata, null, 2);
}
