
/**
 * Main application entry point
 */

import { initializeAppState } from './app/app-state.js';
import { collectDOMElements, initializeUI } from './app/ui-initializer.js';

document.addEventListener('DOMContentLoaded', () => {
  // Collect DOM elements
  const elements = collectDOMElements();
  
  // Initialize canvas context
  elements.canvasContext = elements.pdfCanvas.getContext('2d');
  
  // Initialize application state
  const state = initializeAppState();
  
  // Initialize UI components and attach event handlers
  initializeUI(elements, state);
});
