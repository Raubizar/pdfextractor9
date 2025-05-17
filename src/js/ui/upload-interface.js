
/**
 * Upload interface management
 */

import { setupDragAndDrop } from './drag-drop.js';
import { handleDrop, processFiles } from '../utils/file-processing.js';

// Initialize the upload interface
export function initializeUploadInterface(elements, extractedTextItems) {
  const { dropZone, fileInput, fileList, multipleFilesToggle } = elements;
  
  // Setup drag and drop functionality
  setupDragAndDrop(dropZone, (e) => {
    handleDrop(e, fileList, extractedTextItems);
    
    // Show results container if files were processed
    if (fileList.children.length > 0) {
      elements.uploadContainer.classList.add('minimized');
      elements.resultsContainer.classList.remove('hidden');
    }
  });
  
  // Handle file input change
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      const filesProcessed = processFiles(e.target.files, fileList, extractedTextItems);
      
      if (filesProcessed) {
        // Show results container
        elements.uploadContainer.classList.add('minimized');
        elements.resultsContainer.classList.remove('hidden');
      }
    }
  });
  
  // Clicking on the drop zone triggers file input
  dropZone.addEventListener('click', () => {
    fileInput.click();
  });
  
  // Update multiple files attribute
  multipleFilesToggle.addEventListener('change', () => {
    fileInput.multiple = multipleFilesToggle.checked;
  });
}
