
/**
 * UI initialization functionality
 */

import { setupDragAndDrop } from '../ui/drag-drop.js';
import { handleDrop, processFiles } from './file-handler.js';
import { initializePDFViewer } from './pdf-viewer-handler.js';

// Initialize UI elements and attach event handlers
export function initializeUI(elements, state) {
  const { 
    dropZone, 
    fileInput, 
    backButton, 
    uploadContainer, 
    resultsContainer, 
    textContent, 
    multipleFilesToggle
  } = elements;
  
  // Setup drag and drop functionality
  setupDragAndDrop(dropZone, (e) => {
    handleDrop(e, elements, state);
  });
  
  // Handle file input change
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      processFiles(e.target.files, elements, state);
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
  
  // Initialize PDF viewer functionality
  initializePDFViewer(elements, state);
  
  // Handle back button
  backButton.addEventListener('click', () => {
    state.pdfDoc = null;
    state.currentPage = 1;
    uploadContainer.classList.remove('minimized');
    resultsContainer.classList.add('hidden');
    textContent.classList.add('hidden');
    fileInput.value = '';
  });
}

// Collect all DOM elements
export function collectDOMElements() {
  return {
    dropZone: document.getElementById('drop-zone'),
    fileInput: document.getElementById('file-input'),
    uploadContainer: document.getElementById('upload-container'),
    resultsContainer: document.getElementById('results-container'),
    backButton: document.getElementById('back-button'),
    prevPageButton: document.getElementById('prev-page'),
    nextPageButton: document.getElementById('next-page'),
    currentPageElement: document.getElementById('current-page'),
    totalPagesElement: document.getElementById('total-pages'),
    pdfCanvas: document.getElementById('pdf-canvas'),
    pdfLoading: document.getElementById('pdf-loading'),
    extractTextButton: document.getElementById('extract-text-button'),
    textContent: document.getElementById('text-content'),
    extractedText: document.getElementById('extracted-text'),
    loadingOverlay: document.getElementById('loading-overlay'),
    fileList: document.getElementById('file-list'),
    multipleFilesToggle: document.getElementById('multiple-files')
  };
}
