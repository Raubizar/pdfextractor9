
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const uploadContainer = document.getElementById('upload-container');
  const resultsContainer = document.getElementById('results-container');
  const backButton = document.getElementById('back-button');
  const prevPageButton = document.getElementById('prev-page');
  const nextPageButton = document.getElementById('next-page');
  const currentPageElement = document.getElementById('current-page');
  const totalPagesElement = document.getElementById('total-pages');
  const pdfCanvas = document.getElementById('pdf-canvas');
  const pdfLoading = document.getElementById('pdf-loading');
  const extractTextButton = document.getElementById('extract-text-button');
  const textContent = document.getElementById('text-content');
  const extractedText = document.getElementById('extracted-text');
  const loadingOverlay = document.getElementById('loading-overlay');
  const fileList = document.getElementById('file-list');
  const multipleFilesToggle = document.getElementById('multiple-files');
  
  // State
  let pdfDoc = null;
  let currentPage = 1;
  let pageRendering = false;
  let pageNumPending = null;
  let scale = 1.0;
  let canvasContext = pdfCanvas.getContext('2d');
  
  // Store extracted text items for each file
  let extractedTextItems = {};
  let currentFileId = null;
  
  // Keywords for title block detection
  const titleBlockKeywords = [
    "drawing no", "dwg no", "title", "project", "scale", "rev", "date"
  ];
  
  // Paper size ranges in points (1/72 inch)
  const paperSizes = {
    A0: { width: [2384, 2384], height: [3370, 3370] },
    A1: { width: [1684, 1684], height: [2384, 2384] },
    A2: { width: [1191, 1191], height: [1684, 1684] },
    A3: { width: [842, 842], height: [1191, 1191] },
    A4: { width: [595, 595], height: [842, 842] }
  };
  
  // Event listeners for drag and drop
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, highlight, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, unhighlight, false);
  });
  
  function highlight() {
    dropZone.classList.add('active');
  }
  
  function unhighlight() {
    dropZone.classList.remove('active');
  }
  
  // Handle file drop
  dropZone.addEventListener('drop', handleDrop, false);
  
  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
  }
  
  // Handle file input change
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  });
  
  // Clicking on the drop zone triggers file input
  dropZone.addEventListener('click', () => {
    fileInput.click();
  });
  
  // Update multiple files attribute
  multipleFilesToggle.addEventListener('change', () => {
    fileInput.multiple = multipleFilesToggle.checked;
  });
  
  // Handle file selection
  function handleFiles(files) {
    // Clear previous file list
    if (files.length > 0) {
      fileList.innerHTML = '';
      extractedTextItems = {};
      
      // Display file list
      fileList.classList.remove('hidden');
      
      // Process each file
      Array.from(files).forEach((file, index) => {
        if (file.type !== 'application/pdf') {
          createFileListItem(file.name, 'Not a PDF file', null, 'error');
          return;
        }
        
        const fileId = `file-${Date.now()}-${index}`;
        createFileListItem(file.name, 'Processing...', fileId);
        
        const reader = new FileReader();
        reader.onload = function(e) {
          const arrayBuffer = e.target.result;
          processFirstPage(arrayBuffer, fileId, file.name);
        };
        reader.readAsArrayBuffer(file);
      });
      
      // Show results container
      uploadContainer.classList.add('minimized');
      resultsContainer.classList.remove('hidden');
    }
  }
  
  // Create a file list item
  function createFileListItem(fileName, status, fileId, type = 'normal') {
    const item = document.createElement('div');
    item.className = `file-item ${type}`;
    item.id = fileId ? `item-${fileId}` : null;
    
    item.innerHTML = `
      <div class="file-name">${fileName}</div>
      <div class="file-status">${status}</div>
      ${fileId ? `<button class="view-button" data-file-id="${fileId}">View Details</button>` : ''}
    `;
    
    fileList.appendChild(item);
    
    // Add event listener to view button
    if (fileId) {
      const viewButton = item.querySelector('.view-button');
      viewButton.addEventListener('click', () => displayFileDetails(fileId));
    }
  }
  
  // Determine paper size based on dimensions
  function determinePaperSize(width, height) {
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
  function determineOrientation(width, height) {
    return width > height ? 'landscape' : 'portrait';
  }
  
  // Analyze page for title block
  function analyzeTitleBlock(textItems, dimensions) {
    const { width, height } = dimensions;
    const cellWidth = width / 4;
    const cellHeight = height / 4;
    
    // Create a 4x4 grid of cells
    const grid = Array(4).fill().map(() => Array(4).fill().map(() => ({ 
      items: [], 
      keywordCount: 0,
      content: []
    })));
    
    // Assign text items to grid cells
    textItems.forEach(item => {
      const col = Math.min(3, Math.max(0, Math.floor(item.x / cellWidth)));
      const row = Math.min(3, Math.max(0, Math.floor((height - item.y) / cellHeight)));
      
      grid[row][col].items.push(item);
      grid[row][col].content.push(item.str);
      
      // Check if the item contains any keywords
      const itemText = item.str.toLowerCase();
      const hasKeyword = titleBlockKeywords.some(keyword => 
        itemText.includes(keyword)
      );
      
      if (hasKeyword) {
        grid[row][col].keywordCount++;
      }
    });
    
    // Find the cell with the highest keyword count
    let bestCell = { row: 0, col: 0, count: 0 };
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (grid[row][col].keywordCount > bestCell.count) {
          bestCell = { row, col, count: grid[row][col].keywordCount };
        }
      }
    }
    
    // NEW: Process items within the best cell to create a table structure
    let tableStructure = { rows: [], rowGroups: {}, colGroups: {} };
    
    if (bestCell.count > 0) {
      const bestCellItems = grid[bestCell.row][bestCell.col].items;
      
      // Step 1: Group by similar y-coordinates (rows)
      const yPositions = bestCellItems.map(item => item.y);
      const rowGroups = groupSimilarPositions(yPositions, 5); // 5 points tolerance
      
      // Step 2: Group by similar x-coordinates (columns)
      const xPositions = bestCellItems.map(item => item.x);
      const colGroups = groupSimilarPositions(xPositions, 10); // 10 points tolerance
      
      // Step 3: Assign row and column IDs to each item
      bestCellItems.forEach(item => {
        const rowId = getGroupIdForPosition(item.y, rowGroups);
        const colId = getGroupIdForPosition(item.x, colGroups);
        item.cellId = `row_${rowId}_col_${colId}`;
        
        // Store in grouped structure
        if (!tableStructure.rowGroups[rowId]) {
          tableStructure.rowGroups[rowId] = [];
        }
        if (!tableStructure.colGroups[colId]) {
          tableStructure.colGroups[colId] = [];
        }
        tableStructure.rowGroups[rowId].push(item);
        tableStructure.colGroups[colId].push(item);
      });
      
      // Sort rows by y-coordinate (decreasing, as PDF y-axis goes upward)
      const sortedRowIds = Object.keys(tableStructure.rowGroups).sort((a, b) => {
        const avgYA = average(tableStructure.rowGroups[a].map(item => item.y));
        const avgYB = average(tableStructure.rowGroups[b].map(item => item.y));
        return avgYB - avgYA; // Decreasing order
      });
      
      // For each row, sort items by x-coordinate (increasing left-to-right)
      sortedRowIds.forEach(rowId => {
        const rowItems = tableStructure.rowGroups[rowId].sort((a, b) => a.x - b.x);
        tableStructure.rows.push({ 
          rowId, 
          items: rowItems,
          avgY: average(rowItems.map(item => item.y))
        });
      });
    }
    
    // Create visualization information
    const gridInfo = grid.map((row, rowIndex) => 
      row.map((cell, colIndex) => ({
        keywordCount: cell.keywordCount,
        itemCount: cell.items.length,
        isCandidate: rowIndex === bestCell.row && colIndex === bestCell.col,
        content: cell.content.join(' ')
      }))
    );
    
    return {
      bestCell,
      grid: gridInfo,
      titleBlockContent: bestCell.count > 0 ? grid[bestCell.row][bestCell.col].content.join(' ') : 'No title block found',
      tableStructure: bestCell.count > 0 ? tableStructure : null
    };
  }
  
  // Helper function to group similar positions
  function groupSimilarPositions(positions, tolerance) {
    const groups = [];
    const sortedPositions = [...positions].sort((a, b) => a - b);
    
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
  function getGroupIdForPosition(position, groups) {
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      if (Math.abs(position - group.average) <= 10) {
        return i + 1; // 1-based index for readability
      }
    }
    return 0; // Fallback
  }
  
  // Helper function to calculate average
  function average(arr) {
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }
  
  // Process the first page of a PDF
  function processFirstPage(data, fileId, fileName) {
    // Load PDF document
    pdfjsLib.getDocument({ data }).promise
      .then(function(pdf) {
        // Get the first page
        return pdf.getPage(1).then(page => {
          // Get page dimensions from viewport
          const viewport = page.getViewport({ scale: 1.0 });
          const width = viewport.width;
          const height = viewport.height;
          
          // Get mediabox if available (more accurate than viewport)
          const mediaBox = page.getViewport({ scale: 1.0 }).viewBox;
          const mediaBoxWidth = mediaBox ? Math.abs(mediaBox[2] - mediaBox[0]) : width;
          const mediaBoxHeight = mediaBox ? Math.abs(mediaBox[3] - mediaBox[1]) : height;
          
          // Use mediaBox dimensions if available, otherwise use viewport
          const finalWidth = mediaBox ? mediaBoxWidth : width;
          const finalHeight = mediaBox ? mediaBoxHeight : height;
          
          // Determine paper size and orientation
          const paperSize = determinePaperSize(finalWidth, finalHeight);
          const orientation = determineOrientation(finalWidth, finalHeight);
          const sizeOrientation = `${paperSize}_${orientation}`;
          
          // Extract text content with properties
          return page.getTextContent({ normalizeWhitespace: false }).then(textContent => {
            return {
              page,
              textContent,
              dimensions: {
                width: finalWidth,
                height: finalHeight,
                paperSize,
                orientation,
                sizeOrientation
              }
            };
          });
        });
      })
      .then(function(result) {
        // Process text items
        const textItems = result.textContent.items.map(item => {
          const style = result.textContent.styles[item.fontName];
          
          return {
            str: item.str,
            x: item.transform[4], // x position
            y: item.transform[5], // y position
            fontSize: item.fontSize || (style ? style.fontSize : null),
            fontName: item.fontName,
            color: item.color || (style ? style.color : null)
          };
        });
        
        // Analyze the page for title block
        const titleBlockAnalysis = analyzeTitleBlock(textItems, result.dimensions);
        
        // Store extracted items with dimension info and title block analysis
        extractedTextItems[fileId] = {
          fileName: fileName,
          items: textItems,
          dimensions: result.dimensions,
          titleBlock: titleBlockAnalysis
        };
        
        // Log title block information
        console.log(`Title block found in file ${fileName}:`, titleBlockAnalysis);
        
        // Update file list item with size and orientation info
        const { paperSize, orientation, width, height } = result.dimensions;
        const dimensionText = `${paperSize} ${orientation} (${Math.round(width)}x${Math.round(height)} pts)`;
        let titleText = titleBlockAnalysis.bestCell.count > 0 
          ? ` - Title block: R${titleBlockAnalysis.bestCell.row}C${titleBlockAnalysis.bestCell.col}`
          : ' - No title block found';
          
        // Add table structure info if available
        if (titleBlockAnalysis.tableStructure && titleBlockAnalysis.tableStructure.rows.length > 0) {
          titleText += ` - ${titleBlockAnalysis.tableStructure.rows.length} rows detected`;
        }
        
        updateFileListItem(fileId, `${textItems.length} text elements extracted - ${dimensionText}${titleText}`);
      })
      .catch(function(error) {
        console.error('Error processing PDF:', error);
        updateFileListItem(fileId, `Error: ${error.message}`, 'error');
      });
  }
  
  // Update file list item
  function updateFileListItem(fileId, status, type = 'normal') {
    const item = document.getElementById(`item-${fileId}`);
    if (item) {
      item.className = `file-item ${type}`;
      const statusElement = item.querySelector('.file-status');
      if (statusElement) {
        statusElement.textContent = status;
      }
    }
  }
  
  // Display file details
  function displayFileDetails(fileId) {
    currentFileId = fileId;
    
    if (extractedTextItems[fileId]) {
      const fileData = extractedTextItems[fileId];
      
      // Display text content
      textContent.classList.remove('hidden');
      
      // Format the extracted text for display with dimension information
      const { paperSize, orientation, width, height, sizeOrientation } = fileData.dimensions;
      const titleBlock = fileData.titleBlock;
      
      // Create header information
      const headerInfo = `File: ${fileData.fileName}\n` +
                          `Paper Size: ${paperSize}\n` +
                          `Orientation: ${orientation}\n` +
                          `Dimensions: ${Math.round(width)}x${Math.round(height)} points\n` +
                          `Group Key: ${sizeOrientation}\n\n` +
                          `Title Block Analysis:\n` +
                          `  Best Candidate: Row ${titleBlock.bestCell.row + 1}, Column ${titleBlock.bestCell.col + 1}\n` +
                          `  Keyword Count: ${titleBlock.bestCell.count}\n`;
      
      let tableInfo = '';
      
      // Add table structure information if available
      if (titleBlock.tableStructure && titleBlock.tableStructure.rows.length > 0) {
        tableInfo = `\nTable Structure Analysis:\n` +
                   `  Rows detected: ${titleBlock.tableStructure.rows.length}\n` +
                   `  Columns detected: ${Object.keys(titleBlock.tableStructure.colGroups).length}\n\n` +
                   `  Row contents:\n`;
        
        titleBlock.tableStructure.rows.forEach(row => {
          tableInfo += `  - Row ${row.rowId} (y≈${Math.round(row.avgY)}): ${row.items.map(item => `"${item.str}"`).join(', ')}\n`;
        });
        
        tableInfo += `\n  Cell IDs (row_X_col_Y):\n`;
        
        const cellIdItems = {};
        titleBlock.bestCell.count > 0 && titleBlock.tableStructure && 
          grid[titleBlock.bestCell.row][titleBlock.bestCell.col].items.forEach(item => {
            if (item.cellId) {
              if (!cellIdItems[item.cellId]) {
                cellIdItems[item.cellId] = [];
              }
              cellIdItems[item.cellId].push(item);
            }
          });
        
        Object.keys(cellIdItems).forEach(cellId => {
          const items = cellIdItems[cellId];
          tableInfo += `  - ${cellId}: ${items.map(item => `"${item.str}"`).join(', ')}\n`;
        });
      }
      
      const contentInfo = `\n------------------------\n\nText Elements:\n\n`;
      
      const formattedText = fileData.items.map(item => {
        return `Text: "${item.str}"\n` + 
               `Position: (${item.x.toFixed(2)}, ${item.y.toFixed(2)})\n` +
               (item.cellId ? `Cell ID: ${item.cellId}\n` : '') +
               `Font: ${item.fontName || 'Unknown'}, Size: ${item.fontSize || 'Unknown'}\n` +
               `Color: ${item.color ? JSON.stringify(item.color) : 'Unknown'}\n` +
               `------------------------`;
      }).join('\n');
      
      extractedText.textContent = headerInfo + tableInfo + contentInfo + formattedText;
    }
  }
  
  // Load PDF using PDF.js for display
  function loadPDF(data) {
    showLoadingOverlay();
    
    // Load PDF document
    pdfjsLib.getDocument({ data }).promise
      .then(function(pdf) {
        pdfDoc = pdf;
        totalPagesElement.textContent = pdf.numPages;
        
        // Update page navigation buttons
        updatePageButtons();
        
        // Render the first page
        renderPage(currentPage);
        
        hideLoadingOverlay();
      })
      .catch(function(error) {
        console.error('Error loading PDF:', error);
        alert('Error loading PDF: ' + error.message);
        hideLoadingOverlay();
      });
  }
  
  // Render a specific page
  function renderPage(pageNum) {
    pageRendering = true;
    pdfLoading.classList.remove('hidden');
    
    // Get the page
    pdfDoc.getPage(pageNum).then(function(page) {
      // Calculate the scale to fit the page within the canvas
      const viewport = page.getViewport({ scale: 1.0 });
      const parentWidth = pdfCanvas.parentElement.clientWidth - 40; // Subtract some padding
      scale = Math.min(1.5, parentWidth / viewport.width);
      
      const scaledViewport = page.getViewport({ scale });
      
      // Set canvas dimensions to match the viewport
      pdfCanvas.height = scaledViewport.height;
      pdfCanvas.width = scaledViewport.width;
      
      // Render the page
      const renderContext = {
        canvasContext,
        viewport: scaledViewport
      };
      
      page.render(renderContext).promise.then(function() {
        pageRendering = false;
        pdfLoading.classList.add('hidden');
        
        // Check if there's a pending page
        if (pageNumPending !== null) {
          renderPage(pageNumPending);
          pageNumPending = null;
        }
      });
      
      // Update page counters
      currentPageElement.textContent = pageNum;
      
      // Update page buttons
      updatePageButtons();
    });
  }
  
  // Queue a page for rendering
  function queueRenderPage(pageNum) {
    if (pageRendering) {
      pageNumPending = pageNum;
    } else {
      renderPage(pageNum);
    }
  }
  
  // Go to previous page
  prevPageButton.addEventListener('click', () => {
    if (currentPage <= 1) return;
    currentPage--;
    queueRenderPage(currentPage);
  });
  
  // Go to next page
  nextPageButton.addEventListener('click', () => {
    if (currentPage >= pdfDoc.numPages) return;
    currentPage++;
    queueRenderPage(currentPage);
  });
  
  // Update page navigation buttons
  function updatePageButtons() {
    prevPageButton.disabled = currentPage <= 1;
    nextPageButton.disabled = currentPage >= pdfDoc?.numPages;
  }
  
  // Extract text from PDF
  extractTextButton.addEventListener('click', async () => {
    if (!pdfDoc) return;
    
    showLoadingOverlay();
    textContent.classList.remove('hidden');
    extractedText.textContent = 'Extracting text...';
    
    try {
      const text = await extractTextFromPDF(pdfDoc, currentPage);
      extractedText.textContent = text;
    } catch (error) {
      console.error('Error extracting text:', error);
      extractedText.textContent = 'Error extracting text: ' + error.message;
    } finally {
      hideLoadingOverlay();
    }
  });
  
  // Extract text from specific page
  async function extractTextFromPDF(pdf, pageNum) {
    try {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      return textContent.items
        .map(item => item.str)
        .join(' ')
        .replace(/\s{2,}/g, '\n');
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw error;
    }
  }
  
  // Handle back button
  backButton.addEventListener('click', () => {
    pdfDoc = null;
    currentPage = 1;
    uploadContainer.classList.remove('minimized');
    resultsContainer.classList.add('hidden');
    textContent.classList.add('hidden');
    fileInput.value = '';
  });
  
  // Show loading overlay
  function showLoadingOverlay() {
    loadingOverlay.classList.remove('hidden');
  }
  
  // Hide loading overlay
  function hideLoadingOverlay() {
    loadingOverlay.classList.add('hidden');
  }
  
  // Handle window resize
  window.addEventListener('resize', () => {
    if (pdfDoc) {
      renderPage(currentPage);
    }
  });
});
