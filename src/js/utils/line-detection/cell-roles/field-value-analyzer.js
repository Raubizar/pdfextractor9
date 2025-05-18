
/**
 * Field-value pattern analysis functionality
 */

import { knownLabelWords } from './types.js';

/**
 * Analyze cell content for field-value patterns within a single cell
 * @param {Array} cellItems Text items in the cell
 * @returns {Object|null} Detected field-value pair or null
 */
export function analyzeInCellFieldValue(cellItems) {
  if (!cellItems || cellItems.length < 2) {
    return null;
  }
  
  // Sort items by position (top to bottom, left to right)
  const sortedItems = [...cellItems].sort((a, b) => {
    if (Math.abs(a.y - b.y) > 5) {
      return a.y - b.y; // Sort by y for different rows
    }
    return a.x - b.x; // Sort by x for same row
  });
  
  // Look for patterns like "Label: Value" or "Label - Value"
  for (let i = 0; i < sortedItems.length; i++) {
    const item = sortedItems[i];
    const text = item.str.trim();
    
    // Check for colon at end (high confidence pattern)
    const colonMatch = text.match(/^(.*?):\s*$/);
    if (colonMatch && i < sortedItems.length - 1) {
      const labelText = colonMatch[1].trim();
      const valueItem = sortedItems[i + 1];
      const valueText = valueItem.str.trim();
      
      // Check if label is a known label word for higher confidence
      const isKnownLabel = knownLabelWords.some(word => 
        labelText.toLowerCase().includes(word.toLowerCase())
      );
      
      if (valueText) {
        return {
          label: labelText,
          value: valueText,
          labelItem: item,
          valueItem: valueItem,
          confidence: isKnownLabel ? 0.95 : 0.85,
          pattern: 'colon'
        };
      }
    }
    
    // Check for inline colon
    const inlineColonMatch = text.match(/^(.*?):\s*(.*?)$/);
    if (inlineColonMatch) {
      const labelText = inlineColonMatch[1].trim();
      const valueText = inlineColonMatch[2].trim();
      
      // Check if label is a known label word for higher confidence
      const isKnownLabel = knownLabelWords.some(word => 
        labelText.toLowerCase().includes(word.toLowerCase())
      );
      
      if (labelText && valueText) {
        return {
          label: labelText,
          value: valueText,
          labelItem: item,
          valueItem: item,
          confidence: isKnownLabel ? 0.9 : 0.8,
          pattern: 'inline-colon'
        };
      }
    }
    
    // Check for dash separator
    const dashMatch = text.match(/^(.*?)\s-\s(.*?)$/);
    if (dashMatch) {
      const labelText = dashMatch[1].trim();
      const valueText = dashMatch[2].trim();
      
      if (labelText && valueText) {
        return {
          label: labelText,
          value: valueText, 
          labelItem: item,
          valueItem: item,
          confidence: 0.75,
          pattern: 'dash'
        };
      }
    }
    
    // Check for multi-line field-value pairs (stacked pattern)
    if (i < sortedItems.length - 1) {
      const nextItem = sortedItems[i + 1];
      
      // Check if current item might be a label
      const isLabel = knownLabelWords.some(word => 
        text.toLowerCase().includes(word.toLowerCase())
      );
      
      // Check if items are vertically aligned (one above the other)
      const isDirectlyBelow = Math.abs(nextItem.x - item.x) < 10 &&
                            (nextItem.y > item.y) &&
                            (nextItem.y - item.y < item.fontSize * 3);
                             
      if (isLabel && isDirectlyBelow) {
        // If text is in all caps or ends with a colon, higher confidence
        const isStrongLabel = text === text.toUpperCase() || text.endsWith(':');
        
        return {
          label: text,
          value: nextItem.str.trim(),
          labelItem: item,
          valueItem: nextItem,
          confidence: isStrongLabel ? 0.85 : 0.7,
          pattern: 'stacked-label-value'
        };
      }
      
      // New pattern: Check if current item is a potential field in bold or larger font
      const nextIsFontSmaller = nextItem.fontSize && item.fontSize && 
                               nextItem.fontSize < item.fontSize * 0.9;
      
      const isBold = item.fontName && 
          (item.fontName.toLowerCase().includes('bold') || 
           item.fontName.toLowerCase().includes('heavy'));
      
      if ((isBold || nextIsFontSmaller) && isDirectlyBelow) {
        return {
          label: text,
          value: nextItem.str.trim(),
          labelItem: item,
          valueItem: nextItem,
          confidence: 0.75,
          pattern: 'font-differentiated'
        };
      }
    }
    
    // New feature: Check for field on left, value on right pattern (horizontal layout)
    if (i < sortedItems.length - 1) {
      const nextItem = sortedItems[i + 1];
      
      // Check if items are on the same line horizontally
      const isOnSameLine = Math.abs(nextItem.y - item.y) < item.fontSize * 0.8 &&
                          nextItem.x > item.x + item.width;
      
      // Check if current item might be a label based on known words
      const isLabel = knownLabelWords.some(word => 
        text.toLowerCase().includes(word.toLowerCase())
      );
      
      if (isLabel && isOnSameLine) {
        return {
          label: text,
          value: nextItem.str.trim(),
          labelItem: item,
          valueItem: nextItem,
          confidence: 0.8,
          pattern: 'horizontal-pair'
        };
      }
    }
  }
  
  return null;
}

