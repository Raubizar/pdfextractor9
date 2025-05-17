
/**
 * Drag and drop functionality
 */

import { preventDefaults, highlight, unhighlight } from '../utils/file-handling.js';

// Setup drag and drop event listeners
export function setupDragAndDrop(dropZone, handleDrop) {
  // Event listeners for drag and drop
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });
  
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => highlight(dropZone), false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => unhighlight(dropZone), false);
  });
  
  // Handle file drop
  dropZone.addEventListener('drop', handleDrop, false);
  
  // Clicking on the drop zone triggers file input
  return dropZone;
}
