
/**
 * File handling utilities
 */

// Process each file
export function handleFiles(files, options = {}) {
  const { 
    fileList, 
    extractedTextItems, 
    updateFileListItem, 
    createFileListItem, 
    processFirstPage 
  } = options;
  
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
      createFileListItem(file.name, 'Processing...', fileId);
      
      const reader = new FileReader();
      reader.onload = function(e) {
        const arrayBuffer = e.target.result;
        processFirstPage(arrayBuffer, fileId, file.name);
      };
      reader.readAsArrayBuffer(file);
    });
    
    return true; // Files were processed
  }
  
  return false; // No files were processed
}

// Prevent default events
export function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

// Highlight the drop zone
export function highlight(dropZone) {
  dropZone.classList.add('active');
}

// Remove highlight from the drop zone
export function unhighlight(dropZone) {
  dropZone.classList.remove('active');
}
