
/**
 * File processing utilities
 */

import { createFileListItem, updateFileListItem } from '../ui/file-list.js';
import { processFirstPage } from '../pdf/pdf-loader.js';

// Process files function
export function processFiles(files, fileList, extractedTextItems) {
  // Clear previous file list
  if (files.length > 0) {
    fileList.innerHTML = '';
    
    // Display file list
    fileList.classList.remove('hidden');
    
    // Process each file
    Array.from(files).forEach((file, index) => {
      if (file.type !== 'application/pdf') {
        createFileListItem(file.name, 'Not a PDF file', null, 'error');
        return;
      }
      
      const fileId = `file-${Date.now()}-${index}`;
      fileList.appendChild(createFileListItem(file.name, 'Processing...', fileId));
      
      const reader = new FileReader();
      reader.onload = function(e) {
        const arrayBuffer = e.target.result;
        processFirstPage(arrayBuffer, fileId, file.name, {
          updateFileListItem: (fileId, status, type = 'normal') => {
            updateFileListItem(fileId, status, type);
          }
        })
        .then(extractedData => {
          extractedTextItems[fileId] = extractedData;
        })
        .catch(error => {
          console.error('Error in processing PDF:', error);
        });
      };
      reader.readAsArrayBuffer(file);
    });
    
    return true; // Files were processed
  }
  
  return false; // No files were processed
}

// Handle drop event
export function handleDrop(e, fileList, extractedTextItems) {
  const dt = e.dataTransfer;
  const files = dt.files;
  return processFiles(files, fileList, extractedTextItems);
}
