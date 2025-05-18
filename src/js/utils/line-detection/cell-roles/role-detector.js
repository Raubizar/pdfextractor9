
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
  const labelWithValuePattern = /^.*:\s*.+$/;
  
  // Analyze each text item in the cell
  cellItems.forEach(item => {
    const text = item.str.trim();
    const lowerText = text.toLowerCase();
    
    // Empty items don't contribute to role detection
    if (text.length === 0) return;
    
    // Check for formatting characteristics
    
    // 1. Check for header characteristics (larger font, bold, all caps)
    if (item.fontSize > (medianFontSize * 1.1)) {
      headerScore += 1.5;
    }
    
    if (item.fontName && (
      item.fontName.toLowerCase().includes('bold') || 
      item.fontName.toLowerCase().includes('heavy') ||
      item.fontName.toLowerCase().includes('black')
    )) {
      headerScore += 1;
      
      // Bold text that's not all caps is more likely to be a label
      if (text !== text.toUpperCase()) {
        labelScore += 0.5;
      }
    }
    
    // All caps text of significant length is likely a header
    if (text === text.toUpperCase() && text.length > 3) {
      headerScore += 1;
      
      // Short all-caps text may be abbreviations often seen in values
      if (text.length <= 3) {
        valueScore += 0.5;
      }
    }
    
    // 2. Check for label characteristics
    
    // Text ending with colon is a strong label indicator
    if (labelPattern.test(text)) {
      labelScore += 2.5;
    }
    
    // Text with inline colon pattern is likely a label-value pair
    if (labelWithValuePattern.test(text)) {
      labelScore += 1.5;
      valueScore += 0.5; // Also contributes to value score
    }
    
    // Check against known label words list
    for (const labelWord of knownLabelWords) {
      if (lowerText.includes(labelWord.toLowerCase())) {
        labelScore += 1.5;
        break;
      }
    }
    
    // 3. Check for value characteristics
    
    // Values are often purely numeric
    if (/^\d+(\.\d+)?$/.test(text)) {
      valueScore += 2;
    }
    
    // Date patterns are strong value indicators
    if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(text) || // MM/DD/YYYY
        /^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/.test(text)) {   // YYYY/MM/DD
      valueScore += 2.5;
    }
    
    // Drawing numbers (e.g., A101, SK-102) are likely values
    if (/^[A-Z]-?\d+$/.test(text) || /^[A-Z]{2}-?\d+$/.test(text)) {
      valueScore += 2;
    }
    
    // Values sometimes have specific units
    if (lowerText.includes('mm') || 
        lowerText.includes('m') || 
        /^1:\d+$/.test(text) || // Common scale format
        /^[0-9]+:[0-9]+$/.test(text)) { // Ratio format
      valueScore += 1.5;
    }
    
    // Single words that aren't labels are more likely to be values
    if (text.split(/\s+/).length === 1 && !labelPattern.test(text) && 
        !knownLabelWords.some(word => lowerText === word.toLowerCase())) {
      valueScore += 0.5;
    }
  });
  
  // Cell size and position heuristics
  if (cell) {
    // Small, narrow cells are more likely to contain values
    if (cell.width < 100 && cell.height < 50) {
      valueScore += 0.5;
    }
    
    // Wide cells may be headers
    if (cell.width > 200 && cellItems.length === 1) {
      headerScore += 0.5;
    }
    
    // Cells at the top of tables are more likely to be headers
    if (cell.row === 0 && cell.y < 200) {
      headerScore += 1;
    }
  }
  
  // Determine primary role based on highest score
  let role = 'unknown';
  let confidence = 0;
  
  const scores = {
    headerScore,
    labelScore,
    valueScore
  };
  
  const maxScore = Math.max(headerScore, labelScore, valueScore);
  const totalScore = headerScore + labelScore + valueScore;
  
  // Calculate confidence level - how dominant is the winning score?
  confidence = totalScore > 0 ? maxScore / totalScore : 0;
  
  // Apply minimum threshold to prevent weak classifications
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
    
    // If scores are very close between label and value, mark as mixed
    const nextBestScore = [headerScore, labelScore, valueScore]
      .filter(score => score < maxScore)
      .sort((a, b) => b - a)[0] || 0;
      
    if (maxScore - nextBestScore < 0.5 && confidence < 0.6) {
      role = 'mixed';
      confidence = 0.5;
    }
  }
  
  return {
    role,
    confidence,
    scores
  };
}

