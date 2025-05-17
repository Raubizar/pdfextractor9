
/**
 * Main application entry point
 */

import { setupDragAndDrop } from './ui/drag-drop.js';
import { handleFiles } from './utils/file-handling.js';
import { createFileListItem, updateFileListItem, displayFileDetails, createSummaryButton } from './ui/file-list.js';
import { processFirstPage, loadPDFForViewing, extractTextFromPage } from './pdf/pdf-loader.js';
import { renderPage, queueRenderPage, updatePageButtons } from './pdf/pdf-viewer.js';
import { showLoadingOverlay, hideLoadingOverlay, updatePageDisplay } from './ui/page-navigation.js';

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const uploadContainer = document.getElementById('upload-container');
  const resultsContainer = document.getElementById('results-container');
  const backButton = document.getElementById('back-button');
  const prevPageButton = document.getElementById('prev-page');
  const nextPageButton = document.getElementById('next-page');
  const currentPageElement = document.getElementById('current-page');
  const totalPagesElement = document.getElementById('total-pages');
  const pdfCanvas = document.getElementById('pdf-canvas');
  const pdfLoading = document.getElementById('pdf-loading');
  const extractTextButton = document.getElementById('extract-text-button');
  const textContent = document.getElementById('text-content');
  const extractedText = document.getElementById('extracted-text');
  const loadingOverlay = document.getElementById('loading-overlay');
  const fileList = document.getElementById('file-list');
  const multipleFilesToggle = document.getElementById('multiple-files');
  
  // State
  let pdfDoc = null;
  let currentPage = 1;
  let pageRendering = false;
  let pageNumPending = null;
  let scale = 1.0;
  let canvasContext = pdfCanvas.getContext('2d');
  
  // Store extracted text items for each file
  let extractedTextItems = {};
  let currentFileId = null;
  
  // Handle file drop
  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    processFiles(files);
  }
  
  // Process files using the utilities
  function processFiles(files) {
    const result = handleFiles(files, {
      fileList,
      extractedTextItems,
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
            currentFileId = fileId;
            displayFileDetails(fileId, extractedTextItems, textContent, extractedText);
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
          extractedTextItems[fileId] = extractedData;
          
          // Add or update summary button when we have files
          if (Object.keys(extractedTextItems).length > 0) {
            updateSummaryButton();
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
  }
  
  // Function to add or update summary button
  function updateSummaryButton() {
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
  
  // Setup drag and drop functionality
  setupDragAndDrop(dropZone, handleDrop);
  
  // Handle file input change
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      processFiles(e.target.files);
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
  
  // Render page with state management
  function renderCurrentPage(pageNum) {
    renderPage(pageNum, 
      { pageRendering, scale }, 
      { pdfDoc, canvasContext, pdfCanvas, pdfLoading }
    )
    .then(state => {
      pageRendering = state.pageRendering;
      scale = state.scale;
      
      // Check if there's a pending page
      if (pageNumPending !== null) {
        renderCurrentPage(pageNumPending);
        pageNumPending = null;
      }
      
      // Update page counters
      currentPageElement.textContent = pageNum;
      
      // Update page buttons
      updatePageButtons(pageNum, pdfDoc.numPages, { prevPageButton, nextPageButton });
    });
  }
  
  // Queue render with state management
  function queueRenderCurrentPage(pageNum) {
    const result = queueRenderPage(
      pageNum, 
      { pageRendering, pageNumPending }, 
      renderCurrentPage
    );
    
    pageNumPending = result.pageNumPending;
  }
  
  // Go to previous page
  prevPageButton.addEventListener('click', () => {
    if (currentPage <= 1) return;
    currentPage--;
    queueRenderCurrentPage(currentPage);
  });
  
  // Go to next page
  nextPageButton.addEventListener('click', () => {
    if (currentPage >= pdfDoc?.numPages) return;
    currentPage++;
    queueRenderCurrentPage(currentPage);
  });
  
  // Extract text from PDF
  extractTextButton.addEventListener('click', async () => {
    if (!pdfDoc) return;
    
    showLoadingOverlay(loadingOverlay);
    textContent.classList.remove('hidden');
    extractedText.textContent = 'Extracting text...';
    
    try {
      const text = await extractTextFromPage(pdfDoc, currentPage);
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
    pdfDoc = null;
    currentPage = 1;
    uploadContainer.classList.remove('minimized');
    resultsContainer.classList.add('hidden');
    textContent.classList.add('hidden');
    fileInput.value = '';
  });
  
  // Handle window resize
  window.addEventListener('resize', () => {
    if (pdfDoc) {
      renderCurrentPage(currentPage);
    }
  });
});
