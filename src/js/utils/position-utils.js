
/**
 * Utilities for position calculations and grouping
 */

// Helper function to calculate average
export function average(arr) {
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

// Helper function to group similar positions
export function groupSimilarPositions(positions, tolerance) {
  const groups = [];
  const sortedPositions = [...positions].sort((a, b) => a - b);
  
  if (sortedPositions.length === 0) return groups;
  
  let currentGroup = [sortedPositions[0]];
  let currentAvg = sortedPositions[0];
  
  for (let i = 1; i < sortedPositions.length; i++) {
    const currentPos = sortedPositions[i];
    
    if (Math.abs(currentPos - currentAvg) <= tolerance) {
      // Add to current group
      currentGroup.push(currentPos);
      currentAvg = average(currentGroup);
    } else {
      // Start a new group
      groups.push({
        positions: currentGroup,
        average: currentAvg
      });
      currentGroup = [currentPos];
      currentAvg = currentPos;
    }
  }
  
  // Add the last group if it exists
  if (currentGroup.length > 0) {
    groups.push({
      positions: currentGroup,
      average: currentAvg
    });
  }
  
  return groups;
}

// Helper function to find which group a position belongs to
export function getGroupIdForPosition(position, groups) {
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    if (Math.abs(position - group.average) <= 10) {
      return i + 1; // 1-based index for readability
    }
  }
  return 0; // Fallback
}
