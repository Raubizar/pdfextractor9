
/**
 * Application state management
 */

// Initialize application state
export function initializeAppState() {
  return {
    pdfDoc: null,
    currentPage: 1,
    pageRendering: false,
    pageNumPending: null,
    scale: 1.0,
    extractedTextItems: {},
    currentFileId: null
  };
}
