
/**
 * PDF viewer controls and interactions
 */

import { renderPage, queueRenderPage, updatePageButtons } from '../pdf/pdf-viewer.js';
import { showLoadingOverlay, hideLoadingOverlay } from './page-navigation.js';
import { extractTextFromPage } from '../pdf/pdf-loader.js';
import { displayFileDetails } from './file-list.js';

// Initialize PDF viewer controls
export function initializePDFViewer(elements, state) {
  const { 
    prevPageButton, 
    nextPageButton, 
    backButton,
    extractTextButton,
    textContent,
    extractedText,
    uploadContainer,
    resultsContainer,
    loadingOverlay,
    fileInput,
    pdfCanvas
  } = elements;
  
  // Go to previous page
  prevPageButton.addEventListener('click', () => {
    if (state.currentPage <= 1) return;
    state.currentPage--;
    queueRenderCurrentPage(state);
  });
  
  // Go to next page
  nextPageButton.addEventListener('click', () => {
    if (state.currentPage >= state.pdfDoc?.numPages) return;
    state.currentPage++;
    queueRenderCurrentPage(state);
  });
  
  // Extract text from PDF
  extractTextButton.addEventListener('click', async () => {
    if (!state.pdfDoc) return;
    
    showLoadingOverlay(loadingOverlay);
    textContent.classList.remove('hidden');
    extractedText.textContent = 'Extracting text...';
    
    try {
      const text = await extractTextFromPage(state.pdfDoc, state.currentPage);
      extractedText.textContent = text;
    } catch (error) {
      console.error('Error extracting text:', error);
      extractedText.textContent = 'Error extracting text: ' + error.message;
    } finally {
      hideLoadingOverlay(loadingOverlay);
    }
  });
  
  // Handle back button
  backButton.addEventListener('click', () => {
    state.pdfDoc = null;
    state.currentPage = 1;
    uploadContainer.classList.remove('minimized');
    resultsContainer.classList.add('hidden');
    textContent.classList.add('hidden');
    fileInput.value = '';
  });
  
  // Handle window resize
  window.addEventListener('resize', () => {
    if (state.pdfDoc) {
      renderCurrentPage(state);
    }
  });
  
  // Return the render functions for use in other modules
  return {
    renderCurrentPage: (state) => renderCurrentPage(state),
    queueRenderCurrentPage: (state) => queueRenderCurrentPage(state)
  };
}

// Render current page with state management
export function renderCurrentPage(state) {
  const {
    pdfDoc,
    currentPage,
    canvasContext,
    pdfCanvas,
    pdfLoading,
    currentPageElement,
    prevPageButton,
    nextPageButton
  } = state;
  
  renderPage(currentPage, 
    { pageRendering: state.pageRendering, scale: state.scale }, 
    { pdfDoc, canvasContext, pdfCanvas, pdfLoading }
  )
  .then(updatedState => {
    state.pageRendering = updatedState.pageRendering;
    state.scale = updatedState.scale;
    
    // Check if there's a pending page
    if (state.pageNumPending !== null) {
      renderCurrentPage(state);
      state.pageNumPending = null;
    }
    
    // Update page counters
    currentPageElement.textContent = currentPage;
    
    // Update page buttons
    updatePageButtons(currentPage, pdfDoc.numPages, { prevPageButton, nextPageButton });
  });
}

// Queue render with state management
export function queueRenderCurrentPage(state) {
  const result = queueRenderPage(
    state.currentPage, 
    { pageRendering: state.pageRendering, pageNumPending: state.pageNumPending }, 
    (pageNum) => renderCurrentPage({...state, currentPage: pageNum})
  );
  
  state.pageNumPending = result.pageNumPending;
}

// Set up file list view button handlers
export function setupFileViewButtons(fileList, extractedTextItems, textContent, extractedText) {
  // Delegate event listener for file view buttons
  fileList.addEventListener('click', (e) => {
    if (e.target.classList.contains('view-button')) {
      const fileId = e.target.dataset.fileId;
      if (fileId) {
        displayFileDetails(fileId, extractedTextItems, textContent, extractedText);
      }
    }
  });
}
