// Variables to store file names
let fileNamesFromExcel = [];
let fileResultsFromFolder = [];
let secondFileNamesFromExcel = [];
let comparisonMethod = ''; // 'folder' or 'excel'

// Handle the first Excel file upload (Drawing List)
document.getElementById('file-input').addEventListener('change', handleFileUpload);

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });

        const sheetSelect = document.getElementById('sheet-select');
        sheetSelect.innerHTML = ''; // Clear any previous options

        workbook.SheetNames.forEach((sheetName, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = sheetName;
            sheetSelect.appendChild(option);
        });

        document.getElementById('excel-options').style.display = 'block';

        // Automatically populate columns for the first sheet by default
        sheetSelect.onchange = function () {
            populateColumnSelect(workbook.Sheets[workbook.SheetNames[this.value]]);
        };

        populateColumnSelect(workbook.Sheets[workbook.SheetNames[0]]);
    } catch (error) {
        console.error('Error reading file:', error);
    }
}

// Function to populate column selection for Drawing List
function populateColumnSelect(sheet) {
    const columnSelect = document.getElementById('column-select');
    columnSelect.innerHTML = ''; // Clear previous options

    const range = XLSX.utils.decode_range(sheet['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_col(C) + '1'; // Get the header (first row)
        const cell = sheet[cellAddress] ? sheet[cellAddress].v : `Column ${C + 1}`;
        const option = document.createElement('option');
        option.value = C;
        option.textContent = cell; // Set column header as option text
        columnSelect.appendChild(option);
    }

    // Automatically select and load the first column by default
    columnSelect.value = 0;
    loadFileNamesFromExcel(sheet, 0); // Load the default column

    // Load the selected column when the user changes it
    columnSelect.addEventListener('change', function () {
        loadFileNamesFromExcel(sheet, this.value);
    });
}

// Function to load file names from the selected column of Drawing List
function loadFileNamesFromExcel(sheet, columnIndex) {
    try {
        // Read the entire sheet, starting from the second row (skip the header)
        fileNamesFromExcel = XLSX.utils.sheet_to_json(sheet, { header: 1 })
            .slice(1) // Skip the header row
            .map(row => row[columnIndex]) // Get the value from the selected column
            .filter(name => typeof name === 'string' && name.trim() !== ''); // Ensure valid strings

        // Log to verify if file names are correctly loaded
        console.log('File names from Drawing List:', fileNamesFromExcel);

        // Check if any names were extracted
        if (fileNamesFromExcel.length > 0) {
            document.querySelector('.comparison-method').style.display = 'block';
            document.getElementById('check-files-button').style.display = 'none';
        } else {
            alert("No file names found in the selected column. Please check the file and column.");
        }
    } catch (error) {
        console.error('Error loading file names from Drawing List:', error);
        alert('Error extracting file names from the Drawing List.');
    }
}

// Handle comparison method selection
document.getElementById('folder-select-button').addEventListener('click', () => {
    comparisonMethod = 'folder';
    selectFolder();
});

document.getElementById('second-file-select-button').addEventListener('click', () => {
    comparisonMethod = 'excel';
    document.getElementById('second-file-upload').style.display = 'block';
});

// Folder selection logic
async function selectFolder() {
    const directoryHandle = await window.showDirectoryPicker();
    fileResultsFromFolder = [];
    await readFilesRecursively(directoryHandle);
    document.getElementById('folder-path-display').textContent = directoryHandle.name;
    document.getElementById('folder-path-display').style.display = 'block';
    document.getElementById('check-files-button').style.display = 'block';
}

// Function to read files recursively from a directory
async function readFilesRecursively(directoryHandle) {
    for await (const entry of directoryHandle.values()) {
        if (entry.kind === 'file') {
            fileResultsFromFolder.push(entry.name);
        } else if (entry.kind === 'directory') {
            await readFilesRecursively(entry);
        }
    }
}

// Handle second Excel file upload (for comparison)
document.getElementById('second-file-input').addEventListener('change', handleSecondFileUpload);

async function handleSecondFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });

    const sheetSelect = document.getElementById('second-sheet-select');
    sheetSelect.innerHTML = ''; // Clear previous options

    workbook.SheetNames.forEach((sheetName, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = sheetName;
        sheetSelect.appendChild(option);
    });

    document.getElementById('second-excel-options').style.display = 'block';

    sheetSelect.onchange = function () {
        populateSecondColumnSelect(workbook.Sheets[workbook.SheetNames[this.value]]);
    };

    populateSecondColumnSelect(workbook.Sheets[workbook.SheetNames[0]]);
}

// Function to populate column selection for second Excel
function populateSecondColumnSelect(sheet) {
    const columnSelect = document.getElementById('second-column-select');
    columnSelect.innerHTML = ''; // Clear previous options

    const range = XLSX.utils.decode_range(sheet['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_col(C) + '1';
        const cell = sheet[cellAddress] ? sheet[cellAddress].v : `Column ${C + 1}`;
        const option = document.createElement('option');
        option.value = C;
        option.textContent = cell;
        columnSelect.appendChild(option);
    }

    columnSelect.addEventListener('change', function () {
        loadSecondFileNamesFromExcel(sheet, this.value);
    });

    columnSelect.value = 0;
    loadSecondFileNamesFromExcel(sheet, 0);
}

// Load file names from the second Excel file
function loadSecondFileNamesFromExcel(sheet, columnIndex) {
    secondFileNamesFromExcel = XLSX.utils.sheet_to_json(sheet, { header: 1 })
        .slice(1)
        .map(row => row[columnIndex])
        .filter(name => typeof name === 'string' && name.trim() !== '');

    document.getElementById('check-files-button').style.display = 'block';
}

// Check Files Button Event Listener
document.getElementById('check-files-button').addEventListener('click', () => {
    if (comparisonMethod === 'folder') {
        displayResults(fileNamesFromExcel, fileResultsFromFolder);
    } else if (comparisonMethod === 'excel') {
        displayResults(fileNamesFromExcel, secondFileNamesFromExcel);
    }
});

// Function to display results and ignore file extensions during comparison
function displayResults(drawingNames, comparisonNames) {
    const tbody = document.getElementById('results-table').querySelector('tbody');
    tbody.innerHTML = '';

    let matchedCount = 0;
    let unmatchedInFirstList = [];
    let unmatchedInSecondList = [...comparisonNames]; // Assume all are unmatched initially

    // Helper function to strip file extensions
    function stripExtension(fileName) {
        return fileName.replace(/\.[^/.]+$/, "").trim(); // Remove the file extension
    }

    drawingNames.forEach(drawingName => {
        const row = tbody.insertRow();

        // Debugging: Log the file names before comparison
        console.log(`Comparing: "${drawingName.trim()}" with folder file names`);

        // Find a match by comparing names without extensions, with trimming, normalization, and ignoring case
        const matched = comparisonNames.find(file => 
            stripExtension(file).toLowerCase().normalize().replace(/\s+/g, ' ') === 
            drawingName.trim().toLowerCase().normalize().replace(/\s+/g, ' ')
        );

        const drawingCell = row.insertCell(0);
        const fileCell = row.insertCell(1);
        const statusCell = row.insertCell(2);

        drawingCell.textContent = drawingName;

        if (matched) {
            fileCell.textContent = matched;
            statusCell.textContent = 'Done';
            matchedCount++;
            unmatchedInSecondList = unmatchedInSecondList.filter(file => file !== matched);
        } else {
            fileCell.textContent = 'N/A';
            statusCell.textContent = 'To Do';
            unmatchedInFirstList.push(drawingName);
        }
    });

    unmatchedInSecondList.forEach(unmatchedName => {
        const row = tbody.insertRow();
        const drawingCell = row.insertCell(0);
        const fileCell = row.insertCell(1);
        const statusCell = row.insertCell(2);

        drawingCell.textContent = 'N/A';
        fileCell.textContent = unmatchedName;
        statusCell.textContent = 'File not in Drawing List';
    });

    const percentageFound = ((matchedCount / drawingNames.length) * 100).toFixed(2);
    document.getElementById('total-files-excel').textContent = drawingNames.length;
    document.getElementById('total-files-folder').textContent = comparisonNames.length;
    document.getElementById('total-files-matched').textContent = matchedCount;
    document.getElementById('percentage-found').textContent = `${percentageFound}%`;

    document.getElementById('summary').style.display = 'block';
    document.getElementById('results').style.display = 'block';
}



// Function to export the results table to CSV
function exportTableToCSV() {
    const table = document.getElementById('results-table');
    let csvContent = '';

    // Add summary information
    const totalFilesExcel = document.getElementById('total-files-excel').textContent;
    const totalFilesFolder = document.getElementById('total-files-folder').textContent;
    const totalFilesMatched = document.getElementById('total-files-matched').textContent;
    const percentageFound = document.getElementById('percentage-found').textContent;

    csvContent += `"Total Files in Excel (Deliverables List)","${totalFilesExcel}"\n`;
    csvContent += `"Total Files in Folder","${totalFilesFolder}"\n`;
    csvContent += `"Total Files Matched","${totalFilesMatched}"\n`;
    csvContent += `"Percentage Found","${percentageFound}"\n\n\n`; // Add 2-line space

    // Get table headers
    const headers = table.querySelectorAll('thead tr th');
    const headerValues = Array.from(headers).map(th => `"${th.innerText}"`);
    csvContent += headerValues.join(',') + '\n';

    // Get table rows
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const rowData = Array.from(row.querySelectorAll('td')).map(td => `"${td.innerText}"`);
        csvContent += rowData.join(',') + '\n';
    });

    // Download the CSV file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'results.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Event listener for the export button
document.getElementById('export-button').addEventListener('click', exportTableToCSV);
