
/**
 * Constants for title block detection
 */

// Keywords for title block detection
export const titleBlockKeywords = [
  "drawing no", "dwg no", "title", "project", "scale", "rev", "date"
];

// Common field labels to search for and extract
export const fieldLabels = {
  "drawing": ["drawing no", "dwg no", "drawing number", "dwg number", "drawing", "dwg"],
  "title": ["title", "name", "description"],
  "project": ["project", "project name", "job", "job name"],
  "scale": ["scale"],
  "revision": ["revision", "rev", "rev no"],
  "date": ["date", "drawn date", "issue date"],
  "drawn": ["drawn by", "drawn", "author"],
  "checked": ["checked by", "checked", "approved by", "approved"]
};

// Field validation patterns
export const fieldPatterns = {
  "drawing": {
    pattern: null, // Will import from validators.js
    fallbackPatterns: [/[A-Z0-9]{2,}/i]
  },
  "scale": {
    pattern: null, // Will import from validators.js
    validValues: ["N/A", "AS INDICATED", "NTS", "NONE", "FULL", "HALF"]
  },
  "revision": {
    pattern: null, // Will import from validators.js
    fallbackPatterns: [/^[A-Z]?\d{1,2}$/, /^REV\s*[A-Z0-9]$/i]
  },
  "date": {
    pattern: null, // Will import from validators.js
    fallbackPatterns: [/\d{1,2}[-/\.\s][A-Za-z]{3,9}[-/\.\s]\d{2,4}/]
  }
};

// Initialize field patterns from validators
import { drawingNumberRE, scaleRE, dateRE, revisionRE } from './validators.js';

// Assign the imported patterns
fieldPatterns.drawing.pattern = drawingNumberRE;
fieldPatterns.scale.pattern = scaleRE;
fieldPatterns.date.pattern = dateRE;
fieldPatterns.revision.pattern = revisionRE;
