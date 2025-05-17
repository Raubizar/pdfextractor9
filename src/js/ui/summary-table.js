
/**
 * Summary table component for displaying extraction results across multiple files
 */

// Format confidence score with color indicator
export function formatConfidence(confidence) {
  if (confidence === undefined || confidence === null) {
    return '<span class="no-confidence">❌ Missing</span>';
  }
  
  const confidencePercent = Math.round(confidence * 100);
  let confidenceClass = 'high-confidence';
  let icon = '✅';
  
  if (confidence < 0.5) {
    confidenceClass = 'low-confidence';
    icon = '❌';
  } else if (confidence < 0.8) {
    confidenceClass = 'medium-confidence';
    icon = '⚠️';
  }
  
  return `<span class="${confidenceClass}">${icon} ${confidencePercent}%</span>`;
}

// Create summary table for all processed files
export function createSummaryTable(extractedTextItems) {
  // Create table container
  const tableContainer = document.createElement('div');
  tableContainer.className = 'summary-table-container';
  
  // Create heading
  const heading = document.createElement('h2');
  heading.textContent = 'Extracted Drawing Metadata';
  heading.className = 'summary-heading';
  tableContainer.appendChild(heading);
  
  // If no files are processed
  if (!extractedTextItems || Object.keys(extractedTextItems).length === 0) {
    const noData = document.createElement('p');
    noData.textContent = 'No files have been processed yet.';
    tableContainer.appendChild(noData);
    return tableContainer;
  }
  
  // Create table
  const table = document.createElement('table');
  table.className = 'summary-table';
  
  // Create table header
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th>File Name</th>
      <th>Drawing Number</th>
      <th>Title</th>
      <th>Revision</th>
      <th>Scale</th>
      <th>Date</th>
      <th>Confidence Summary</th>
    </tr>
  `;
  table.appendChild(thead);
  
  // Create table body
  const tbody = document.createElement('tbody');
  
  // Add rows for each file
  Object.entries(extractedTextItems).forEach(([fileId, fileData]) => {
    const row = document.createElement('tr');
    
    // Get extracted fields if available
    const extractedFields = fileData.titleBlock?.tableStructure?.extractedFields || {};
    
    // Calculate overall confidence
    const confidenceValues = Object.values(extractedFields)
      .map(field => field.confidence || 0);
    
    const avgConfidence = confidenceValues.length > 0 
      ? confidenceValues.reduce((sum, val) => sum + val, 0) / confidenceValues.length
      : 0;
    
    // Add row class based on overall confidence
    if (avgConfidence < 0.5) {
      row.classList.add('low-confidence-row');
    } else if (avgConfidence < 0.8) {
      row.classList.add('medium-confidence-row');
    }
    
    // Helper function to get field data or display placeholder
    const getFieldData = (fieldType) => {
      const field = extractedFields[fieldType];
      if (field && field.value) {
        return { 
          value: field.value,
          confidence: field.confidence
        };
      }
      return { value: 'N/A', confidence: null };
    };
    
    // Get field data
    const drawingNumber = getFieldData('drawing');
    const title = getFieldData('title');
    const revision = getFieldData('revision');
    const scale = getFieldData('scale');
    const date = getFieldData('date');
    
    // Format overall confidence display
    const confidenceDisplay = formatConfidence(avgConfidence);
    
    // Add cells to the row
    row.innerHTML = `
      <td>${fileData.fileName}</td>
      <td title="Confidence: ${drawingNumber.confidence !== null ? (drawingNumber.confidence * 100).toFixed(0) + '%' : 'N/A'}">${drawingNumber.value}</td>
      <td title="Confidence: ${title.confidence !== null ? (title.confidence * 100).toFixed(0) + '%' : 'N/A'}">${title.value}</td>
      <td title="Confidence: ${revision.confidence !== null ? (revision.confidence * 100).toFixed(0) + '%' : 'N/A'}">${revision.value}</td>
      <td title="Confidence: ${scale.confidence !== null ? (scale.confidence * 100).toFixed(0) + '%' : 'N/A'}">${scale.value}</td>
      <td title="Confidence: ${date.confidence !== null ? (date.confidence * 100).toFixed(0) + '%' : 'N/A'}">${date.value}</td>
      <td>${confidenceDisplay}</td>
    `;
    
    tbody.appendChild(row);
  });
  
  table.appendChild(tbody);
  tableContainer.appendChild(table);
  
  // Add export button
  const exportButton = document.createElement('button');
  exportButton.className = 'button primary';
  exportButton.textContent = 'Export as CSV';
  exportButton.addEventListener('click', () => {
    exportSummaryAsCSV(extractedTextItems);
  });
  
  tableContainer.appendChild(exportButton);
  
  return tableContainer;
}

// Export summary data as CSV
function exportSummaryAsCSV(extractedTextItems) {
  let csvContent = 'File Name,Drawing Number,Title,Revision,Scale,Date,Confidence\n';
  
  Object.entries(extractedTextItems).forEach(([fileId, fileData]) => {
    const extractedFields = fileData.titleBlock?.tableStructure?.extractedFields || {};
    
    // Helper function to get field value safely
    const getFieldValue = (fieldType) => {
      const field = extractedFields[fieldType];
      if (field && field.value) {
        // Escape quotes in CSV
        return field.value.replace(/"/g, '""');
      }
      return 'N/A';
    };
    
    // Helper to get confidence value
    const getConfidence = (fieldType) => {
      const field = extractedFields[fieldType];
      return field && field.confidence !== undefined ? field.confidence : 0;
    };
    
    // Calculate average confidence
    const confidenceValues = Object.values(extractedFields)
      .map(field => field.confidence || 0);
    
    const avgConfidence = confidenceValues.length > 0 
      ? confidenceValues.reduce((sum, val) => sum + val, 0) / confidenceValues.length
      : 0;
    
    // Create CSV row
    csvContent += `"${fileData.fileName}",`;
    csvContent += `"${getFieldValue('drawing')}",`;
    csvContent += `"${getFieldValue('title')}",`;
    csvContent += `"${getFieldValue('revision')}",`;
    csvContent += `"${getFieldValue('scale')}",`;
    csvContent += `"${getFieldValue('date')}",`;
    csvContent += `${(avgConfidence * 100).toFixed(0)}%\n`;
  });
  
  // Create download link
  const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'pdf_metadata_summary.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
