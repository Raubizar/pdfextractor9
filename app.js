
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
  
  // State
  let pdfDoc = null;
  let currentPage = 1;
  let pageRendering = false;
  let pageNumPending = null;
  let scale = 1.0;
  let canvasContext = pdfCanvas.getContext('2d');
  
  // Event listeners for drag and drop
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, highlight, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, unhighlight, false);
  });
  
  function highlight() {
    dropZone.classList.add('active');
  }
  
  function unhighlight() {
    dropZone.classList.remove('active');
  }
  
  // Handle file drop
  dropZone.addEventListener('drop', handleDrop, false);
  
  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0 && files[0].type === 'application/pdf') {
      handleFiles(files);
    } else {
      alert('Please select a PDF file.');
    }
  }
  
  // Handle file input change
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  });
  
  // Clicking on the drop zone triggers file input
  dropZone.addEventListener('click', () => {
    fileInput.click();
  });
  
  // Handle file selection
  function handleFiles(files) {
    const file = files[0];
    if (file.type !== 'application/pdf') {
      alert('Please select a PDF file.');
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
      const arrayBuffer = e.target.result;
      loadPDF(arrayBuffer);
    };
    
    reader.readAsArrayBuffer(file);
  }
  
  // Load PDF using PDF.js
  function loadPDF(data) {
    showLoadingOverlay();
    
    // Load PDF document
    pdfjsLib.getDocument({ data }).promise
      .then(function(pdf) {
        pdfDoc = pdf;
        totalPagesElement.textContent = pdf.numPages;
        
        // Show results container and hide upload container
        uploadContainer.classList.add('hidden');
        resultsContainer.classList.remove('hidden');
        
        // Update page navigation buttons
        updatePageButtons();
        
        // Render the first page
        renderPage(currentPage);
        
        hideLoadingOverlay();
      })
      .catch(function(error) {
        console.error('Error loading PDF:', error);
        alert('Error loading PDF: ' + error.message);
        hideLoadingOverlay();
      });
  }
  
  // Render a specific page
  function renderPage(pageNum) {
    pageRendering = true;
    pdfLoading.classList.remove('hidden');
    
    // Get the page
    pdfDoc.getPage(pageNum).then(function(page) {
      // Calculate the scale to fit the page within the canvas
      const viewport = page.getViewport({ scale: 1.0 });
      const parentWidth = pdfCanvas.parentElement.clientWidth - 40; // Subtract some padding
      scale = Math.min(1.5, parentWidth / viewport.width);
      
      const scaledViewport = page.getViewport({ scale });
      
      // Set canvas dimensions to match the viewport
      pdfCanvas.height = scaledViewport.height;
      pdfCanvas.width = scaledViewport.width;
      
      // Render the page
      const renderContext = {
        canvasContext,
        viewport: scaledViewport
      };
      
      page.render(renderContext).promise.then(function() {
        pageRendering = false;
        pdfLoading.classList.add('hidden');
        
        // Check if there's a pending page
        if (pageNumPending !== null) {
          renderPage(pageNumPending);
          pageNumPending = null;
        }
      });
      
      // Update page counters
      currentPageElement.textContent = pageNum;
      
      // Update page buttons
      updatePageButtons();
    });
  }
  
  // Queue a page for rendering
  function queueRenderPage(pageNum) {
    if (pageRendering) {
      pageNumPending = pageNum;
    } else {
      renderPage(pageNum);
    }
  }
  
  // Go to previous page
  prevPageButton.addEventListener('click', () => {
    if (currentPage <= 1) return;
    currentPage--;
    queueRenderPage(currentPage);
  });
  
  // Go to next page
  nextPageButton.addEventListener('click', () => {
    if (currentPage >= pdfDoc.numPages) return;
    currentPage++;
    queueRenderPage(currentPage);
  });
  
  // Update page navigation buttons
  function updatePageButtons() {
    prevPageButton.disabled = currentPage <= 1;
    nextPageButton.disabled = currentPage >= pdfDoc?.numPages;
  }
  
  // Extract text from PDF
  extractTextButton.addEventListener('click', async () => {
    if (!pdfDoc) return;
    
    showLoadingOverlay();
    textContent.classList.remove('hidden');
    extractedText.textContent = 'Extracting text...';
    
    try {
      const text = await extractTextFromPDF(pdfDoc, currentPage);
      extractedText.textContent = text;
    } catch (error) {
      console.error('Error extracting text:', error);
      extractedText.textContent = 'Error extracting text: ' + error.message;
    } finally {
      hideLoadingOverlay();
    }
  });
  
  // Extract text from specific page
  async function extractTextFromPDF(pdf, pageNum) {
    try {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      return textContent.items
        .map(item => item.str)
        .join(' ')
        .replace(/\s{2,}/g, '\n');
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw error;
    }
  }
  
  // Handle back button
  backButton.addEventListener('click', () => {
    pdfDoc = null;
    currentPage = 1;
    uploadContainer.classList.remove('hidden');
    resultsContainer.classList.add('hidden');
    textContent.classList.add('hidden');
    fileInput.value = '';
  });
  
  // Show loading overlay
  function showLoadingOverlay() {
    loadingOverlay.classList.remove('hidden');
  }
  
  // Hide loading overlay
  function hideLoadingOverlay() {
    loadingOverlay.classList.add('hidden');
  }
  
  // Handle window resize
  window.addEventListener('resize', () => {
    if (pdfDoc) {
      renderPage(currentPage);
    }
  });
});
