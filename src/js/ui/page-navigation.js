
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

// Show field extraction status
export function showFieldExtractionStatus(element, status) {
  if (!element) return;
  
  element.textContent = status;
  element.classList.remove('hidden');
}

// Hide field extraction status
export function hideFieldExtractionStatus(element) {
  if (!element) return;
  
  element.classList.add('hidden');
}
