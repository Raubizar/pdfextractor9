let fileData = [];
let namingConvention = null;

// Handle naming convention file upload
document.getElementById('namingConventionInput').addEventListener('change', async function (event) {
    const file = event.target.files[0];
    if (!file) {
        namingConvention = null;
        return;
    }

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });

        console.log('Available sheet names in naming convention file:', workbook.SheetNames);

        // Check if the expected sheets exist
        if (!workbook.Sheets['Sheets']) {
            console.error('Sheet named "Sheets" not found. Available sheets:', workbook.SheetNames);
            alert('Naming convention file must contain a sheet named "Sheets". Available sheets: ' + workbook.SheetNames.join(', '));
            namingConvention = null;
            return;
        }

        namingConvention = {
            Sheets: XLSX.utils.sheet_to_json(workbook.Sheets['Sheets'], { header: 1 }),
            Models: workbook.Sheets['Models'] ? XLSX.utils.sheet_to_json(workbook.Sheets['Models'], { header: 1 }) : [],
        };

        console.log('Loaded naming convention - Sheets tab:', namingConvention.Sheets);
        console.log('Loaded naming convention - Models tab:', namingConvention.Models);
        
        // Check the structure of the first few rows
        console.log('First 3 rows of Sheets tab:', namingConvention.Sheets.slice(0, 3));
        
        // Check delimiter
        const delimiter = namingConvention.Sheets[0] ? namingConvention.Sheets[0][2] : null;
        console.log('Extracted delimiter from C1:', delimiter);
        
        // Re-analyze naming convention for existing data if available
        if (fileData.length > 0) {
            updateNamingConventionAnalysis();
        }
    } catch (error) {
        console.error('Error reading naming convention file:', error);
        alert('Error reading naming convention file. Please check the file format.');
        namingConvention = null;
    }
});

// Function to update naming convention analysis for all files
function updateNamingConventionAnalysis() {
    fileData.forEach((row, index) => {
        if (row.fileName) {
            const namingAnalysis = analyzeFileName(row.fileName);
            row.namingConventionStatus = namingAnalysis.compliance;
            row.namingConventionDetails = namingAnalysis.details;
            
            // Update the table cell if it exists
            const namingCell = document.getElementById(`naming-status-${index}`);
            if (namingCell) {
                namingCell.textContent = row.namingConventionStatus;
            }
        }
    });
}

// Naming convention analysis function (adapted from check_file_naming)
function analyzeFileName(fileName) {
    console.log('=== ANALYZING FILE NAME ===');
    console.log('File name:', fileName);
    console.log('Naming convention available:', !!namingConvention);
    
    if (!namingConvention) {
        console.log('No naming convention file uploaded');
        return { compliance: 'Not checked', details: 'No naming convention file uploaded' };
    }

    if (!namingConvention.Sheets || namingConvention.Sheets.length === 0) {
        console.log('No Sheets data in naming convention');
        return { compliance: 'Wrong', details: 'No naming convention data available' };
    }

    // Extract file extension
    const dotPosition = fileName.lastIndexOf('.');
    const extension = dotPosition > 0 ? fileName.slice(dotPosition + 1).toLowerCase() : '';
    const isModel = ['rvt', 'nwd', 'nwf', 'ifc', 'nwc'].includes(extension);

    console.log('File extension:', extension, 'Is model:', isModel);

    // Select the appropriate tab - for now, always use Sheets since your files appear to be drawings
    const namingTab = isModel && namingConvention.Models.length > 0 ? namingConvention.Models : namingConvention.Sheets;
    
    console.log('Using naming tab with', namingTab.length, 'rows');
    console.log('First few rows of naming tab:', namingTab.slice(0, 5));

    // Fetch delimiter from row 1, column C (index [0][2]) - based on your Excel structure
    const delimiter = namingTab[0] && namingTab[0][2] ? namingTab[0][2] : null;
    if (!delimiter) {
        console.log('Delimiter check failed:');
        console.log('- namingTab[0]:', namingTab[0]);
        console.log('- namingTab[0][2]:', namingTab[0] ? namingTab[0][2] : 'undefined');
        console.log('- Full first row:', namingTab[0]);
        return { compliance: 'Wrong', details: 'Invalid or missing delimiter in naming convention' };
    }

    console.log("Using delimiter:", JSON.stringify(delimiter));

    // Remove extension from file name for analysis
    let fileNameWithoutExt = fileName;
    if (dotPosition > 0) {
        fileNameWithoutExt = fileName.substring(0, dotPosition);
    }

    console.log("File name without extension:", fileNameWithoutExt);

    // Split file name into parts using the delimiter
    const nameParts = fileNameWithoutExt.split(delimiter);
    console.log("Split parts:", nameParts);

    // Get the header row (should be row 2, index 1)
    const headerRow = namingTab[1] || [];
    console.log("Header row:", headerRow);

    // Validate each part against the naming convention rules
    let nonCompliantParts = [];
    let details = '';

    for (let i = 0; i < nameParts.length; i++) {
        // Get allowed values for this part from column i (starting from column A = index 0)
        const allowedParts = [];
        
        // Start from row 2 (index 1) and collect all non-empty values for this column
        for (let rowIdx = 1; rowIdx < namingTab.length; rowIdx++) {
            const cellValue = namingTab[rowIdx][i];
            if (cellValue && cellValue !== '') {
                allowedParts.push(cellValue);
            }
        }

        console.log(`Part ${i + 1} "${nameParts[i]}" - Allowed values:`, allowedParts);

        let partAllowed = false;

        // Check against each allowed value
        for (const allowed of allowedParts) {
            if (!allowed) continue;
            
            if (allowed.toString().includes('+N')) {
                // Handle incremental patterns like "P+N"
                const prefix = allowed.toString().split('+')[0];
                if (nameParts[i].startsWith(prefix)) {
                    const suffix = nameParts[i].substring(prefix.length);
                    if (/^\d+$/.test(suffix)) { // Check if suffix is numeric
                        partAllowed = true;
                        break;
                    }
                }
            } else if (allowed.toString().toLowerCase() === 'var') {
                // Variable part - anything is allowed
                partAllowed = true;
                break;
            } else if (allowed.toString() === nameParts[i]) {
                // Exact match
                partAllowed = true;
                break;
            }
        }

        if (!partAllowed) {
            details += `Part ${i + 1} (${nameParts[i]}) is not valid; `;
            nonCompliantParts.push(nameParts[i]);
        }
    }

    // Determine overall compliance
    const compliance = nonCompliantParts.length > 0 ? 'Wrong' : 'Ok';
    details = details.trim().replace(/; $/, '');
    
    console.log('Analysis result:', { compliance, details, nonCompliantParts });
    console.log('=== END ANALYSIS ===');
    
    return { compliance, details, nonCompliantParts };
}

document.getElementById('fileInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (!file) {
        alert("Please select an Excel file.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        processExcelData(jsonData);
    };

    reader.readAsArrayBuffer(file);
});

function normalizeText(value) {
    if (typeof value === 'string') {
        return value.trim().replace(/\s+/g, ' ').toUpperCase();
    }
    return value;
}

function normalizeDate(value) {
  if (typeof value !== 'string') return value;

  // Try multiple formats
  const formats = [
    /^\d{2}\.\d{2}\.\d{4}$/,  // 13.03.2025
    /^\d{2}\/\d{2}\/\d{4}$/,  // 13/03/2025
    /^\d{2}\.\w{3}\.\d{4}$/i, // 13.MAR.2025
    /^\d{2}\/\d{2}\/\d{2}$/   // 13/03/25
  ];

  // First, see if input matches one of the patterns
  const isKnownFormat = formats.some(regex => regex.test(value.trim()));
  if (!isKnownFormat) {
    // Fallback to default JS Date parse
    const fallbackDate = new Date(value);
    if (!isNaN(fallbackDate.getTime())) {
      // Convert to dd/mm/yyyy for consistency
      return fallbackDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
    // Return original string if parsing fails
    return value.trim();
  }

  // If it does match, parse accordingly
  // (Simplest approach: replace "." with "/" then try new Date)
  const standardized = value.trim()
    .replace(/\./g, '/')  // Convert dots to slashes
    .replace(/([A-Za-z]{3})/i, (m) => {
      // Convert "MAR" to "03" etc. (This would need a small map)
      const monthMap = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06', JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' };
      return monthMap[m.toUpperCase()] || m;
    });

  const parsedDate = new Date(standardized);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  return value.trim();
}

function processExcelData(data) {
    fileData = data.slice(1).map(row => ({
        sheetNumber: normalizeText(row[0]),
        sheetName: normalizeText(row[1]),
        fileName: normalizeText(row[2]),
        revisionCode: normalizeText(row[3]),
        revisionDate: normalizeDate(row[4]),
        revisionDescription: normalizeText(row[5]), // Now at index 5
        suitabilityCode: normalizeText(row[6]),
        stageDescription: normalizeText(row[7]),
        namingConventionStatus: 'Not checked',
        fileDeliveryStatus: 'Not checked',
        comments: '',
        result: 'Pending',
        mismatches: ''
    }));

    populateTable();
}




function populateTable() {
    const tableBody = document.querySelector('#reportTable tbody');
    tableBody.innerHTML = '';

    fileData.forEach((row, index) => {
        // Automatically check naming convention for each file
        if (row.fileName) {
            const namingAnalysis = analyzeFileName(row.fileName);
            row.namingConventionStatus = namingAnalysis.compliance;
            row.namingConventionDetails = namingAnalysis.details;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.sheetNumber}</td>
            <td>${row.sheetName}</td>
            <td>${row.fileName}</td>
            <td>${row.revisionCode}</td>
            <td>${row.revisionDate}</td>
            <td>${row.revisionDescription}</td>
            <td>${row.suitabilityCode}</td>
            <td>${row.stageDescription}</td>
            <td id="naming-status-${index}">${row.namingConventionStatus}</td>
            <td id="delivery-status-${index}">${row.fileDeliveryStatus}</td>
            <td><input type="text" class="commentsInput" data-index="${index}" placeholder="Add comments"></td>
            <td id="result-${index}">${row.result}</td>
            <td id="mismatch-${index}">${row.mismatches}</td>
        `;
        tableBody.appendChild(tr);
    });

    document.getElementById('output-section').style.display = 'block';
}

document.getElementById('processFile').addEventListener('click', function () {
    document.querySelectorAll('.commentsInput').forEach(input => {
        const index = input.getAttribute('data-index');
        fileData[index].comments = normalizeText(input.value);
    });

    calculateResults();
});

function calculateResults() {
    let totalFiles = fileData.length;
    let okCount = 0;
    const expectedRevCode = normalizeText(document.getElementById('revisionCode').value || '');
    const expectedRevDate = normalizeDate(document.getElementById('revisionDate').value || '');
    const expectedSuitCode = normalizeText(document.getElementById('suitabilityCode').value || '');
    const expectedStageDesc = normalizeText(document.getElementById('stageDescription').value || '');
    const expectedRevisionDesc = normalizeText(document.getElementById('revisionDescription').value || '');
    const separator = document.getElementById('separator').value || ' - ';  // Default separator if missing
    const checkOnlySheetNumber = document.getElementById('checkOnlySheetNumber').checked;

    fileData.forEach((row, index) => {
        let mismatches = [];

        // Handle missing fields by considering them as mismatches
        const sheetNumber = row.sheetNumber ? normalizeText(row.sheetNumber) : '';
        const sheetName = row.sheetName ? normalizeText(row.sheetName) : '';
        const fileName = row.fileName ? normalizeText(row.fileName) : '';
        const revisionCode = row.revisionCode ? normalizeText(row.revisionCode) : '';
        const revisionDate = row.revisionDate ? normalizeDate(row.revisionDate) : '';
        const suitabilityCode = row.suitabilityCode ? normalizeText(row.suitabilityCode) : '';
        const stageDescription = row.stageDescription ? normalizeText(row.stageDescription) : '';
        const comments = row.comments ? normalizeText(row.comments) : '';

        if (!sheetNumber || !sheetName || !fileName || !revisionCode || !revisionDate || !suitabilityCode || !stageDescription) {
            mismatches.push('Missing Data');
        }

        let nameCheck;
        if (checkOnlySheetNumber) {
            // Only compare sheetNumber to fileName
            nameCheck = (sheetNumber === fileName);
        } else {
            // Compare sheetNumber + separator + sheetName to fileName
            nameCheck = (sheetNumber + separator + sheetName) === fileName;
        }

        if (!nameCheck) mismatches.push('File Name');

        let revisionValid = revisionCode.startsWith(expectedRevCode[0]) && parseInt(revisionCode.slice(1)) >= parseInt(expectedRevCode.slice(1));
        if (!revisionValid) mismatches.push('Revision Code');

        let dateValid = revisionDate === expectedRevDate;
        if (!dateValid) mismatches.push('Revision Date');

        let suitabilityValid = suitabilityCode === expectedSuitCode;
        if (!suitabilityValid) mismatches.push('Suitability Code');

        let stageDescValid = stageDescription === expectedStageDesc;
        if (!stageDescValid) mismatches.push('Stage Description');

        let revisionDescValid = row.revisionDescription === expectedRevisionDesc;
        if (!revisionDescValid) mismatches.push('Revision Description');

        let namingConventionValid = row.namingConventionStatus === "Ok";
        if (!namingConventionValid) {
            mismatches.push('Naming Convention: ' + (row.namingConventionDetails || 'Non-compliant'));
        }

        let fileDeliveryValid = row.fileDeliveryStatus === "Delivered" || row.fileDeliveryStatus === "Not checked";
        if (!fileDeliveryValid) {
            mismatches.push('File Delivery: ' + row.fileDeliveryStatus);
        }

        let commentsValid = comments === '';
        if (!commentsValid) mismatches.push('Comments');

        let isValid = mismatches.length === 0;

        const resultCell = document.getElementById(`result-${index}`);
        const mismatchCell = document.getElementById(`mismatch-${index}`);

        if (isValid) {
            resultCell.textContent = "OK";
            fileData[index].result = "OK";
            okCount++;
        } else {
            resultCell.textContent = "Please Revise";
            fileData[index].result = "Please Revise";
        }
        
        mismatchCell.textContent = mismatches.join(', ');
        fileData[index].mismatches = mismatches.join(', ');
    });

    document.getElementById('totalFiles').textContent = totalFiles;
    document.getElementById('percentOK').textContent = ((okCount / totalFiles) * 100).toFixed(2) + '%';
    document.getElementById('summary-section').style.display = 'block';
}


document.getElementById('exportReport').addEventListener('click', function () {
    exportCombinedCSV();
});

function exportCombinedCSV() {
    let csvContent = "data:text/csv;charset=utf-8,";

    // Add summary at the top
    csvContent += "SUMMARY REPORT\n";
    csvContent += "Total Files,Percentage OK\n";
    csvContent += `${fileData.length},${((fileData.filter(row => row.result === "OK").length / fileData.length) * 100).toFixed(2)}%\n\n`;

    // Add full report header including mismatch column
    csvContent += "FULL REPORT\n";
    

    function safeValue(value) {
        if (value === null || value === undefined) {
            return '"MISSING"';
        }
        return `"${String(value).replace(/"/g, '""').trim()}"`;  // Convert to string, escape quotes, and trim safely
    }

    // Add CSV headers
    csvContent += '"Sheet Number","Sheet Name","File Name","Revision Code","Revision Date","Revision Description","Suitability Code","Stage Description","Naming Convention Status","File Delivery Status","Comments","Result","Mismatched Items"\n';

    // Process each row
    fileData.forEach(row => {
        csvContent += [
            safeValue(row.sheetNumber),
            safeValue(row.sheetName),
            safeValue(row.fileName),
            safeValue(row.revisionCode),
            safeValue(row.revisionDate),
            safeValue(row.revisionDescription),
            safeValue(row.suitabilityCode),
            safeValue(row.stageDescription),
            safeValue(row.namingConventionStatus),
            safeValue(row.fileDeliveryStatus),
            safeValue(row.comments || ""),
            safeValue(row.result),
            safeValue(row.mismatches || "NONE")
        ].join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "QA_QC_Report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}



