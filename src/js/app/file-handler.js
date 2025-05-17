
/**
 * File handling functionality
 */

import { handleFiles } from '../utils/file-handling.js';
import { createFileListItem, updateFileListItem, displayFileDetails, createSummaryButton } from '../ui/file-list.js';
import { processFirstPage } from '../pdf/pdf-loader.js';

// Process uploaded files
export function processFiles(files, elements, state) {
  const { fileList, uploadContainer, resultsContainer } = elements;
  
  const result = handleFiles(files, {
    fileList,
    extractedTextItems: state.extractedTextItems,
    updateFileListItem: (fileId, status, type = 'normal') => {
      updateFileListItem(fileId, status, type, fileList);
    },
    createFileListItem: (fileName, status, fileId, type = 'normal') => {
      const item = createFileListItem(fileName, status, fileId, type);
      fileList.appendChild(item);
      
      // Add event listener to view button
      if (fileId) {
        const viewButton = item.querySelector('.view-button');
        viewButton.addEventListener('click', () => {
          state.currentFileId = fileId;
          displayFileDetails(fileId, state.extractedTextItems, elements.textContent, elements.extractedText);
        });
      }
    },
    processFirstPage: (arrayBuffer, fileId, fileName) => {
      processFirstPage(arrayBuffer, fileId, fileName, {
        updateFileListItem: (fileId, status, type = 'normal') => {
          updateFileListItem(fileId, status, type, fileList);
        }
      })
      .then(extractedData => {
        state.extractedTextItems[fileId] = extractedData;
        
        // Add or update summary button when we have files
        if (Object.keys(state.extractedTextItems).length > 0) {
          updateSummaryButton(state.extractedTextItems, resultsContainer);
        }
      })
      .catch(error => {
        console.error('Error in processing PDF:', error);
      });
    }
  });
  
  if (result) {
    // Show results container
    uploadContainer.classList.add('minimized');
    resultsContainer.classList.remove('hidden');
  }
  
  return result;
}

// Function to add or update summary button
export function updateSummaryButton(extractedTextItems, resultsContainer) {
  // Remove any existing summary button
  const existingButton = document.querySelector('.summary-button-container');
  if (existingButton) {
    existingButton.remove();
  }
  
  // Create new summary button
  const summaryButton = createSummaryButton(extractedTextItems, resultsContainer);
  
  // Insert before toolbar
  const toolbar = document.querySelector('.toolbar');
  resultsContainer.insertBefore(summaryButton, toolbar);
}

// Handle file drop event
export function handleDrop(e, elements, state) {
  const dt = e.dataTransfer;
  const files = dt.files;
  return processFiles(files, elements, state);
}
