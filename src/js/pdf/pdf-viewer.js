
/**
 * PDF viewer functionality
 */

// Render a specific page
export function renderPage(pageNum, state, elements) {
  const { pdfDoc, canvasContext, pdfCanvas, pdfLoading } = elements;
  let { pageRendering, scale } = state;
  
  pageRendering = true;
  pdfLoading.classList.remove('hidden');
  
  // Get the page
  return pdfDoc.getPage(pageNum).then(function(page) {
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
    
    return page.render(renderContext).promise.then(function() {
      pageRendering = false;
      pdfLoading.classList.add('hidden');
      
      return {
        pageRendering,
        scale
      };
    });
  });
}

// Queue a page for rendering
export function queueRenderPage(pageNum, state, renderPageFn) {
  const { pageRendering } = state;
  let { pageNumPending } = state;
  
  if (pageRendering) {
    pageNumPending = pageNum;
    return { pageNumPending };
  } else {
    renderPageFn(pageNum);
    return { pageNumPending: null };
  }
}

// Update page navigation buttons
export function updatePageButtons(currentPage, totalPages, buttons) {
  const { prevPageButton, nextPageButton } = buttons;
  
  prevPageButton.disabled = currentPage <= 1;
  nextPageButton.disabled = currentPage >= totalPages;
}
