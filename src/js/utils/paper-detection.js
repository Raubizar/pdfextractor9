
/**
 * Paper size detection utilities
 */

// Paper size ranges in points (1/72 inch)
export const paperSizes = {
  A0: { width: [2384, 2384], height: [3370, 3370] },
  A1: { width: [1684, 1684], height: [2384, 2384] },
  A2: { width: [1191, 1191], height: [1684, 1684] },
  A3: { width: [842, 842], height: [1191, 1191] },
  A4: { width: [595, 595], height: [842, 842] }
};

// Determine paper size based on dimensions
export function determinePaperSize(width, height) {
  // Make sure width and height are positive numbers
  width = Math.abs(width);
  height = Math.abs(height);
  
  // Compare to standard paper sizes with some tolerance (±5 points)
  for (const [size, dimensions] of Object.entries(paperSizes)) {
    const widthRange = dimensions.width;
    const heightRange = dimensions.height;
    
    // Check if dimensions match this paper size (in either orientation)
    if ((Math.abs(width - widthRange[0]) <= 5 && Math.abs(height - heightRange[0]) <= 5) ||
        (Math.abs(width - heightRange[0]) <= 5 && Math.abs(height - widthRange[0]) <= 5)) {
      return size;
    }
  }
  
  // If no standard size matches, return "Custom"
  return "Custom";
}

// Determine page orientation
export function determineOrientation(width, height) {
  return width > height ? 'landscape' : 'portrait';
}
