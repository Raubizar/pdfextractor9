
/**
 * Main application entry point - Refactored for modularity
 */

import { initializeUploadInterface } from './src/js/ui/upload-interface.js';
import { initializePDFViewer, setupFileViewButtons } from './src/js/ui/pdf-controls.js';

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const elements = {
    // Upload elements
    dropZone: document.getElementById('drop-zone'),
    fileInput: document.getElementById('file-input'),
    uploadContainer: document.getElementById('upload-container'),
    resultsContainer: document.getElementById('results-container'),
    multipleFilesToggle: document.getElementById('multiple-files'),
    fileList: document.getElementById('file-list'),
    
    // PDF viewer elements
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
  };
  
  // --- Application State ---
  const appState = {
    pdfDoc: null,
    currentPage: 1,
    pageRendering: false,
    pageNumPending: null,
    scale: 1.0,
    canvasContext: elements.pdfCanvas.getContext('2d'),
    currentFileId: null,
    extractedTextItems: {},
    // Add UI elements needed by rendering functions to state
    pdfCanvas: elements.pdfCanvas,
    pdfLoading: elements.pdfLoading,
    currentPageElement: elements.currentPageElement,
    prevPageButton: elements.prevPageButton,
    nextPageButton: elements.nextPageButton
  };
  
  // Initialize upload interface
  initializeUploadInterface(elements, appState.extractedTextItems);
  
  // Initialize PDF viewer and controls
  const pdfViewer = initializePDFViewer(elements, appState);
  
  // Setup file list view button handlers
  setupFileViewButtons(
    elements.fileList, 
    appState.extractedTextItems, 
    elements.textContent, 
    elements.extractedText
  );
});
