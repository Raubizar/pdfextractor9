
/**
 * Field-value pattern analysis functionality
 */

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
    
    // Check for colon at end
    const colonMatch = text.match(/^(.*?):\s*$/);
    if (colonMatch && i < sortedItems.length - 1) {
      const labelText = colonMatch[1].trim();
      const valueItem = sortedItems[i + 1];
      const valueText = valueItem.str.trim();
      
      if (valueText) {
        return {
          label: labelText,
          value: valueText,
          labelItem: item,
          valueItem: valueItem,
          confidence: 0.9,
          pattern: 'colon'
        };
      }
    }
    
    // Check for inline colon
    const inlineColonMatch = text.match(/^(.*?):\s*(.*?)$/);
    if (inlineColonMatch) {
      const labelText = inlineColonMatch[1].trim();
      const valueText = inlineColonMatch[2].trim();
      
      if (labelText && valueText) {
        return {
          label: labelText,
          value: valueText,
          labelItem: item,
          valueItem: item,
          confidence: 0.85,
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
    
    // New: Check for multi-line field-value pairs
    if (i < sortedItems.length - 1) {
      const nextItem = sortedItems[i + 1];
      
      // If current item is a known label and next item is directly below
      const isLabel = /^(client|project|drawing|scale|date|revision|sheet)[\s:].*$/i.test(text);
      const isDirectlyBelow = Math.abs(nextItem.x - item.x) < 10 &&
                            (nextItem.y > item.y) &&
                            (nextItem.y - item.y < item.fontSize * 3);
                             
      if (isLabel && isDirectlyBelow) {
        return {
          label: text,
          value: nextItem.str.trim(),
          labelItem: item,
          valueItem: nextItem,
          confidence: 0.8,
          pattern: 'stacked-label-value'
        };
      }
    }
  }
  
  return null;
}
