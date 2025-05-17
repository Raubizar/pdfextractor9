
/**
 * PDF loading functionality for viewer
 */

// Load PDF for display in the viewer
export function loadPDFForViewing(data, callbacks) {
  const { 
    showLoadingOverlay, 
    hideLoadingOverlay, 
    updatePageDisplay, 
    renderPage 
  } = callbacks;
  
  showLoadingOverlay();
  
  // Load PDF document
  return pdfjsLib.getDocument({ data }).promise
    .then(function(pdf) {
      updatePageDisplay(pdf);
      
      // Render the first page
      renderPage(1);
      
      hideLoadingOverlay();
      return pdf;
    })
    .catch(function(error) {
      console.error('Error loading PDF:', error);
      alert('Error loading PDF: ' + error.message);
      hideLoadingOverlay();
      throw error;
    });
}
