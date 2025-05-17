
/**
 * Results table component for displaying extraction results for multiple PDFs
 */

// Create a summary results table for extracted fields across multiple files
export function createSummaryResultsTable(extractedTextItems) {
  // Create table container
  const tableContainer = document.createElement('div');
  tableContainer.className = 'summary-results-container';
  
  // Create heading
  const heading = document.createElement('h2');
  heading.textContent = 'Extracted Drawing Metadata';
  heading.className = 'summary-heading';
  tableContainer.appendChild(heading);
  
  // Create table
  const table = document.createElement('table');
  table.className = 'summary-results-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>File Name</th>
        <th>Field</th>
        <th>Extracted Value</th>
        <th>Confidence</th>
      </tr>
    </thead>
    <tbody>
    </tbody>
  `;
  
  const tbody = table.querySelector('tbody');
  
  // Populate table with data from all files
  Object.entries(extractedTextItems).forEach(([fileId, fileData]) => {
    if (!fileData || !fileData.titleBlock || !fileData.titleBlock.tableStructure || !fileData.titleBlock.tableStructure.extractedFields) {
      // Create a row indicating no data for this file
      const row = document.createElement('tr');
      row.className = 'error-row';
      row.innerHTML = `
        <td>${fileData?.fileName || 'Unknown File'}</td>
        <td colspan="3">No extraction data available ❌</td>
      `;
      tbody.appendChild(row);
      return;
    }
    
    const fileName = fileData.fileName;
    const extractedFields = fileData.titleBlock.tableStructure.extractedFields;
    
    // Add table rows for each field in this file
    if (Object.keys(extractedFields).length === 0) {
      const row = document.createElement('tr');
      row.className = 'error-row';
      row.innerHTML = `
        <td>${fileName}</td>
        <td colspan="3">No fields extracted ❌</td>
      `;
      tbody.appendChild(row);
    } else {
      Object.entries(extractedFields).forEach(([fieldType, fieldData]) => {
        const row = document.createElement('tr');
        
        // Determine row class based on confidence
        if (!fieldData.value || fieldData.confidence === 0) {
          row.className = 'error-row';
        } else if (fieldData.confidence < 0.8) {
          row.className = 'warning-row';
        }
        
        // Format confidence
        const confidenceHtml = formatConfidenceWithIcon(fieldData.confidence);
        
        row.innerHTML = `
          <td>${fileName}</td>
          <td>${fieldType.toUpperCase()}</td>
          <td>${fieldData.value || 'Not found'}</td>
          <td>${confidenceHtml}</td>
        `;
        
        tbody.appendChild(row);
      });
    }
  });
  
  // Add to container
  tableContainer.appendChild(table);
  
  // Add export button
  const exportButton = document.createElement('button');
  exportButton.className = 'button secondary';
  exportButton.textContent = 'Export Metadata';
  exportButton.onclick = () => exportAllMetadata(extractedTextItems);
  tableContainer.appendChild(exportButton);
  
  return tableContainer;
}

// Format confidence score with color indicator and icon
function formatConfidenceWithIcon(confidence) {
  const confidencePercent = Math.round(confidence * 100);
  
  if (confidence === 0 || confidence === undefined) {
    return `<span class="low-confidence">0% ❌</span>`;
  } else if (confidence < 0.8) {
    return `<span class="medium-confidence">${confidencePercent}% ⚠️</span>`;
  } else {
    return `<span class="high-confidence">${confidencePercent}%</span>`;
  }
}

// Export all metadata as JSON
function exportAllMetadata(extractedTextItems) {
  const metadata = {};
  
  Object.entries(extractedTextItems).forEach(([fileId, fileData]) => {
    if (fileData) {
      metadata[fileData.fileName] = createMetadataObject(fileData);
    }
  });
  
  const dataStr = JSON.stringify(metadata, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  
  const exportFileDefaultName = 'extracted-metadata.json';
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}

// Create structured metadata object for export
function createMetadataObject(fileData) {
  if (!fileData) return null;
  
  return {
    dimensions: fileData.dimensions,
    titleBlock: {
      location: {
        row: fileData.titleBlock.bestCell.row,
        col: fileData.titleBlock.bestCell.col
      },
      keywordCount: fileData.titleBlock.bestCell.count,
      cellStructure: fileData.titleBlock.tableStructure ? {
        rowCount: fileData.titleBlock.tableStructure.rows.length,
        columnCount: Object.keys(fileData.titleBlock.tableStructure.colGroups || {}).length
      } : null,
      extractedFields: fileData.titleBlock.tableStructure?.extractedFields || {}
    },
    textElements: {
      count: fileData.items.length
    }
  };
}
