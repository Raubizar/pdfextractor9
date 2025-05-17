
/**
 * Page navigation UI functionality
 */

// Show loading overlay
export function showLoadingOverlay(element) {
  element.classList.remove('hidden');
}

// Hide loading overlay
export function hideLoadingOverlay(element) {
  element.classList.add('hidden');
}

// Update page display elements
export function updatePageDisplay(pdf, elements) {
  const { currentPageElement, totalPagesElement } = elements;
  
  totalPagesElement.textContent = pdf.numPages;
}
