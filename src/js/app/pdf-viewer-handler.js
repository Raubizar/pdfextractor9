
/**
 * PDF viewer handler functionality
 */

import { renderPage, queueRenderPage, updatePageButtons } from '../pdf/pdf-viewer.js';
import { showLoadingOverlay, hideLoadingOverlay } from '../ui/page-navigation.js';
import { extractTextFromPage } from '../pdf/pdf-loader.js';

// Initialize PDF viewer functionality
export function initializePDFViewer(elements, state) {
  const { 
    prevPageButton, 
    nextPageButton, 
    extractTextButton,
    textContent,
    extractedText,
    loadingOverlay,
    currentPageElement
  } = elements;
  
  // Go to previous page
  prevPageButton.addEventListener('click', () => {
    if (state.currentPage <= 1) return;
    state.currentPage--;
    queueRenderCurrentPage(state, elements);
  });
  
  // Go to next page
  nextPageButton.addEventListener('click', () => {
    if (state.currentPage >= state.pdfDoc?.numPages) return;
    state.currentPage++;
    queueRenderCurrentPage(state, elements);
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
  
  // Handle window resize
  window.addEventListener('resize', () => {
    if (state.pdfDoc) {
      renderCurrentPage(state, elements);
    }
  });
}

// Render current page with state management
export function renderCurrentPage(state, elements) {
  const {
    pdfDoc,
    currentPage,
    pageRendering,
    scale
  } = state;
  
  const {
    canvasContext,
    pdfCanvas,
    pdfLoading,
    currentPageElement,
    prevPageButton,
    nextPageButton
  } = elements;
  
  renderPage(currentPage, 
    { pageRendering, scale }, 
    { pdfDoc, canvasContext, pdfCanvas, pdfLoading }
  )
  .then(updatedState => {
    state.pageRendering = updatedState.pageRendering;
    state.scale = updatedState.scale;
    
    // Check if there's a pending page
    if (state.pageNumPending !== null) {
      renderCurrentPage(state, elements);
      state.pageNumPending = null;
    }
    
    // Update page counters
    currentPageElement.textContent = currentPage;
    
    // Update page buttons
    updatePageButtons(currentPage, pdfDoc.numPages, { prevPageButton, nextPageButton });
  });
}

// Queue render with state management
export function queueRenderCurrentPage(state, elements) {
  const result = queueRenderPage(
    state.currentPage, 
    { pageRendering: state.pageRendering, pageNumPending: state.pageNumPending }, 
    (pageNum) => renderCurrentPage({...state, currentPage: pageNum}, elements)
  );
  
  state.pageNumPending = result.pageNumPending;
}
