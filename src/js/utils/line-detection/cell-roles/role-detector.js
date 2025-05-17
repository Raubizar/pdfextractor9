
/**
 * Cell role detection functionality
 */
import { knownLabelWords } from './types.js';

/**
 * Detect the role of a cell based on its content and formatting
 * @param {Array} cellItems Text items in the cell
 * @param {Object} textStats Text statistics including median font size and body text color
 * @param {Object} cell Cell information
 * @returns {Object} Cell role information
 */
export function detectCellRole(cellItems, textStats, cell) {
  if (!cellItems || cellItems.length === 0) {
    return { role: 'unknown', confidence: 0 };
  }
  
  const { medianFontSize, bodyTextColor } = textStats;
  
  // Initialize score counters for different roles
  let headerScore = 0;
  let labelScore = 0;
  let valueScore = 0;
  
  // Check for common label patterns like "Drawing No:" or "Scale:"
  const labelPattern = /:$/;
  
  // Analyze each text item in the cell
  cellItems.forEach(item => {
    const text = item.str.trim().toLowerCase();
    
    // Empty items don't contribute to role detection
    if (text.length === 0) return;
    
    // Check for formatting characteristics
    
    // 1. Check for header characteristics (larger font, bold, all caps)
    if (item.fontSize > medianFontSize * 1.1) {
      headerScore += 1;
    }
    
    if (item.fontName && (
      item.fontName.toLowerCase().includes('bold') || 
      item.fontName.toLowerCase().includes('heavy')
    )) {
      headerScore += 1.5;
    }
    
    if (text === text.toUpperCase() && text.length > 2) {
      headerScore += 0.5;
    }
    
    // 2. Check for label characteristics
    if (labelPattern.test(item.str.trim())) {
      labelScore += 2;
    }
    
    for (const labelWord of knownLabelWords) {
      if (text.includes(labelWord)) {
        labelScore += 1;
        break;
      }
    }
    
    // 3. Check for value characteristics
    
    // Values are often numeric or dates
    if (/^\d+(\.\d+)?$/.test(text) || // pure numbers
        /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(text) || // dates
        /^[A-Z]\d+$/.test(text)) { // drawing numbers like "A101"
      valueScore += 2;
    }
    
    // Values sometimes have specific units
    if (text.includes('mm') || text.includes('1:') || 
        /^[0-9]+:[0-9]+$/.test(text)) { // scale format
      valueScore += 1.5;
    }
  });
  
  // Determine primary role based on highest score
  let role = 'unknown';
  let confidence = 0;
  
  const maxScore = Math.max(headerScore, labelScore, valueScore);
  
  // Calculate a confidence level from 0-1
  const totalScore = headerScore + labelScore + valueScore;
  confidence = totalScore > 0 ? maxScore / totalScore : 0;
  
  // Apply threshold to prevent weak classifications
  if (confidence < 0.4) {
    role = 'mixed';
    confidence = 0.5; // Default confidence for mixed role
  } else {
    // Set role based on highest score
    if (maxScore === headerScore) {
      role = 'header';
    } else if (maxScore === labelScore) {
      role = 'label';
    } else if (maxScore === valueScore) {
      role = 'value';
    }
  }
  
  return {
    role,
    confidence,
    scores: {
      headerScore,
      labelScore,
      valueScore
    }
  };
}
