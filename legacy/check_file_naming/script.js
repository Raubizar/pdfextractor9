document.getElementById('folder-select-button').addEventListener('click', async () => {
    if (!namingConvention) {
        alert("Please upload the Project Naming Convention first.");
        return;
    }

    showProcessingPopup(); // Show the processing popup
    try {
        const directoryHandle = await window.showDirectoryPicker();
        const pathDisplay = document.getElementById('folder-path-display');
        pathDisplay.textContent = directoryHandle.name; // Display folder name
        pathDisplay.title = directoryHandle.name; // Set title to full path for tooltip

        fileResultsFromFolder = []; // Clear previous results
        await traverseDirectory(directoryHandle, fileResultsFromFolder);
        displayResults(fileResultsFromFolder);
    } finally {
        hideProcessingPopup(); // Hide the processing popup when done
    }
});

document.getElementById('file-input').addEventListener('change', handleFileUpload);

document.getElementById('excel-select-button').addEventListener('click', async () => {
    showProcessingPopup(); // Show the processing popup
    try {
        await handleExcelSelection();
    } finally {
        hideProcessingPopup(); // Hide the processing popup when done
    }
});


document.getElementById('export-button').addEventListener('click', exportResults);

let namingConvention = null;
let fileNamesFromExcel = [];
let fileResultsFromFolder = [];  // New variable to store results from folder selection

function showProcessingPopup() {
    document.getElementById('processing-popup').style.display = 'flex';
    startLoadingAnimation();
}

function hideProcessingPopup() {
    document.getElementById('processing-popup').style.display = 'none';
    stopLoadingAnimation();
}

let loadingInterval;

function startLoadingAnimation() {
    const loadingText = document.getElementById('loading-animation');
    const symbols = ['|', '/', '-', '\\'];
    let index = 0;

    loadingInterval = setInterval(() => {
        loadingText.textContent = `Processing, please wait... ${symbols[index]}`;
        index = (index + 1) % symbols.length;
    }, 200); // Change symbol every 200ms
}

function stopLoadingAnimation() {
    clearInterval(loadingInterval);
    document.getElementById('loading-animation').textContent = 'Processing, please wait...';
}

// Add path display elements under the buttons without affecting the buttons' sizes or positions
document.getElementById('folder-select-button').insertAdjacentHTML('afterend', '<div id="folder-path-display" class="path-display"></div>');
document.getElementById('excel-select-button').insertAdjacentHTML('afterend', '<div id="excel-path-display" class="path-display"></div>');

// Other functions remain unchanged...

// Example: Implement traverseDirectory function to ensure it works correctly
async function traverseDirectory(directoryHandle, results, currentPath = '') {
    for await (const entry of directoryHandle.values()) {
        const fullPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;

        if (entry.kind === 'file') {
            results.push({
                name: entry.name,
                path: fullPath,
                compliance: 'Pending',
                details: 'Pending',
            });
        } else if (entry.kind === 'directory') {
            // Recursive call for subdirectories
            await traverseDirectory(entry, results, fullPath);
        }
    }
}




async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    console.log('Reading file:', file.name);
    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });

        namingConvention = {
            Sheets: XLSX.utils.sheet_to_json(workbook.Sheets['Sheets'], { header: 1 }),
            Models: XLSX.utils.sheet_to_json(workbook.Sheets['Models'], { header: 1 }),
        };

        console.log('Loaded Sheets tab:', namingConvention.Sheets);
        console.log('Loaded Models tab:', namingConvention.Models);
    } catch (error) {
        console.error('Error reading file:', error);
    }
}


async function handleExcelSelection() {
    try {
        const [fileHandle] = await window.showOpenFilePicker({
            types: [{
                description: 'Excel Files',
                accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
            }]
        });
        
        const filePathDisplay = document.getElementById('excel-path-display');
        const fullPath = fileHandle.name;
        filePathDisplay.textContent = fullPath; // Display the selected Excel file path
        filePathDisplay.title = fullPath; // Set title to full path for tooltip on hover

        const file = await fileHandle.getFile();
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });

        const sheetSelect = document.getElementById('sheet-select');
        sheetSelect.innerHTML = ''; // Clear any previous options

        // Populate the sheet selection dropdown with sheet names
        workbook.SheetNames.forEach((sheetName, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = sheetName;
            sheetSelect.appendChild(option);
        });

        // Display the Excel options section
        document.getElementById('excel-options').style.display = 'block';

        // Add event listener for sheet selection change
        sheetSelect.onchange = function () {
            populateColumnSelect(workbook.Sheets[workbook.SheetNames[this.value]]);
        };

        // Load columns for the first sheet by default
        populateColumnSelect(workbook.Sheets[workbook.SheetNames[0]]);
    } catch (error) {
        console.error('Error selecting or reading Excel file:', error);
        alert('There was an issue selecting or reading the Excel file. Please try again.');
    }
}


function populateColumnSelect(sheet) {
    const columnSelect = document.getElementById('column-select');
    columnSelect.innerHTML = ''; // Clear any previous options

    const range = XLSX.utils.decode_range(sheet['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_col(C) + '1'; // Get the first row cell for header
        const cell = sheet[cellAddress] ? sheet[cellAddress].v : `Column ${C + 1}`;
        const option = document.createElement('option');
        option.value = C;
        option.textContent = cell;
        columnSelect.appendChild(option);
    }

    columnSelect.addEventListener('change', function () {
        loadFileNamesFromExcel(sheet, this.value);
    });

    // Automatically select the first column as default
    columnSelect.value = 0;
    loadFileNamesFromExcel(sheet, 0);
}

function loadFileNamesFromExcel(sheet, columnIndex) {
    try {
        fileNamesFromExcel = XLSX.utils.sheet_to_json(sheet, { header: 1 })
            .slice(1) // Skip the header row
            .map(row => row[columnIndex])
            .filter(name => typeof name === 'string' && name.trim() !== ''); // Filter out any empty or non-string cells

        console.log('File names from Excel loaded:', fileNamesFromExcel);

        displayResults(fileNamesFromExcel.map(name => ({ name, compliance: 'Pending', details: 'Pending' })));
    } catch (error) {
        console.error('Error loading file names from Excel:', error);
        alert('There was an issue loading file names from the selected Excel column. Please try again.');
    }
}

function updateSummary(totalFiles, compliantCount) {
    const totalFilesElement = document.getElementById('total-files');
    const namesComplyElement = document.getElementById('names-comply');
    const compliancePercentageElement = document.getElementById('compliance-percentage');
    
    // Animate Total Files Verified
    animateCountUp(totalFilesElement, totalFiles, 1000); // 1 second duration
    
    // Animate Names Comply
    animateCountUp(namesComplyElement, compliantCount, 1000); // 1 second duration
    
    // Calculate and update compliance percentage
    const compliancePercentage = totalFiles === 0 ? 0 : ((compliantCount / totalFiles) * 100).toFixed(2);
    compliancePercentageElement.textContent = `${compliancePercentage}%`;
    
    // Update progress bar
    updateProgressBar(compliancePercentage);
}

function animateCountUp(element, end, duration) {
    const start = parseInt(element.textContent) || 0;
    const range = end - start;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        const value = Math.floor(progress * range + start);
        element.textContent = value;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

function displayResults(results) {
    const tbody = document.getElementById('results-table').querySelector('tbody');
    tbody.innerHTML = ''; // Clear existing rows

    const thead = document.getElementById('results-table').querySelector('thead');
    thead.innerHTML = ''; // Clear headers
    const headerRow = thead.insertRow();
    headerRow.insertCell(0).textContent = 'Folder Path';
    headerRow.insertCell(1).textContent = 'File Name';
    headerRow.insertCell(2).textContent = 'Compliance Status';
    headerRow.insertCell(3).textContent = 'Details';

    let totalFiles = 0;
    let compliantCount = 0;

    results.forEach(result => {
        const row = tbody.insertRow();
        row.insertCell(0).textContent = result.path || 'Root';
        row.insertCell(1).textContent = result.name;

        const analysis = analyzeFileName(result.name);
        const complianceCell = row.insertCell(2);
        complianceCell.textContent = analysis.compliance;

        const detailsCell = row.insertCell(3);
        detailsCell.innerHTML = analysis.details;

        if (analysis.compliance === 'Wrong') {
            complianceCell.style.color = 'red';
        } else {
            compliantCount++;
        }

        totalFiles++;
    });

    document.getElementById('total-files').textContent = totalFiles;
    document.getElementById('names-comply').textContent = compliantCount;
}


function groupByFolder(results) {
    const folderGroups = {};
    results.forEach(result => {
        if (!folderGroups[result.path]) {
            folderGroups[result.path] = [];
        }
        folderGroups[result.path].push(result);
    });
    return folderGroups;
}

function updateProgressBar(compliancePercentage) {
    const boxes = document.querySelectorAll('.progress-box');
    const filledBoxes = Math.floor(compliancePercentage / 10);
    const remainder = compliancePercentage % 10;

    boxes.forEach((box, index) => {
        if (index < filledBoxes) {
            box.classList.remove('yellow', 'red');
            box.classList.add('green');
        } else if (index === filledBoxes) {
            box.classList.remove('green', 'red');
            if (remainder > 0 && remainder < 10) {
                box.classList.add('yellow');
            } else {
                box.classList.add('red');
            }
        } else {
            box.classList.remove('green', 'yellow');
            box.classList.add('red');
        }
    });
}

function formatDetails(details, nonCompliantParts) {
    let formattedDetails = details;

    if (nonCompliantParts && nonCompliantParts.length > 0) {
        formattedDetails = formattedDetails.replace('Parts not compliant:', '<span class="error">Parts not compliant:</span>');
        nonCompliantParts.forEach(part => {
            const regex = new RegExp(`(${part})`, 'g');
            formattedDetails = formattedDetails.replace(regex, '<span class="error">$1</span>');
        });
    }

    return formattedDetails;
}

function analyzeFileName(fileName) {
    if (!namingConvention) {
        return { compliance: 'No naming convention uploaded', details: 'Please upload a naming convention file' };
    }

    let partsCompliance = 'Ok';
    let details = '';

    // Extract file extension
    const dotPosition = fileName.lastIndexOf('.');
    const extension = fileName.slice(dotPosition + 1).toLowerCase();
    const isModel = ['rvt', 'nwd', 'nwf', 'ifc', 'nwc'].includes(extension);

    // Select the appropriate tab
    const namingTab = isModel ? namingConvention.Models : namingConvention.Sheets;
    if (!namingTab || namingTab.length === 0) {
        return {
            compliance: 'Wrong',
            details: `No naming convention data available for file type: ${extension}.`,
        };
    }

    // Fetch delimiter from line 1, column D
    const delimiter = namingTab[0][3]; // Delimiter is always in column D
    if (!delimiter || typeof delimiter !== 'string') {
        return {
            compliance: 'Wrong',
            details: `Invalid or missing delimiter in naming convention.`,
        };
    }

    console.log("Using delimiter:", delimiter); // Debugging

    // Remove extension from file name
    if (dotPosition > 0) {
        fileName = fileName.substring(0, dotPosition);
    }

    // Split file name into parts using the delimiter
    const nameParts = fileName.split(delimiter);
    console.log("Split parts:", nameParts); // Debugging

    // Validate each part
    let nonCompliantParts = [];
    for (let i = 0; i < nameParts.length; i++) {
        const allowedParts = namingTab.slice(2).map(row => row[i + 1]); // Skip header rows
        console.log(`Validating part ${i + 1}:`, nameParts[i], "Allowed:", allowedParts); // Debugging

        let partAllowed = false;

        allowedParts.forEach(allowed => {
            if (allowed && allowed.includes('+N')) {
                const prefix = allowed.split('+')[0];
                if (nameParts[i].startsWith(prefix)) {
                    partAllowed = true;
                }
            } else if (allowed === 'Var') {
                partAllowed = true;
            } else if (allowed === nameParts[i]) {
                partAllowed = true;
            }
        });

        if (!partAllowed) {
            details += `Part ${i + 1} (${nameParts[i]}) is not valid; `;
            nonCompliantParts.push(nameParts[i]);
        }
    }

    // Determine overall compliance
    if (nonCompliantParts.length > 0) {
        partsCompliance = 'Wrong';
    }

    const compliance = partsCompliance === 'Wrong' ? 'Wrong' : 'Ok';
    details = details.trim().replace(/; $/, '');
    return { compliance, details, nonCompliantParts };
}



function exportResults() {
    const results = [];
    const rows = document.querySelectorAll('#results-table tbody tr');

    // Add header row to the CSV data
    results.push(['Folder Path', 'File Name', 'Compliance Status', 'Details']);

    let currentFolderPath = '';

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const folderPath = cells[0].textContent.trim() || currentFolderPath; // Track the current folder path
        const fileName = cells[1].textContent.trim();
        const compliance = cells[2].textContent.trim();
        const details = cells[3].textContent.trim();

        // Update the current folder path only if a new one is found
        if (folderPath) {
            currentFolderPath = folderPath;
        }

        // Add the row to the results array
        results.push([currentFolderPath, fileName, compliance, details]);
    });

    // Convert the results array to CSV format
    const csvContent = "data:text/csv;charset=utf-8,"
        + results.map(e => e.map(cell => `"${cell}"`).join(",")).join("\n");

    // Create a downloadable link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "results.csv");

    // Trigger the download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

