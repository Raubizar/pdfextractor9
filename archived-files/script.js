// Combined Drawing QC Application
// Variables from legacy applications
let fileNamesFromExcel = [];
let fileResultsFromFolder = [];
let secondFileNamesFromExcel = [];
let comparisonMethod = '';
let namingConvention = null;
let fileData = [];
let selectedFileFilter = 'all';

// Global variables for new interface
let selectedFiles = {
    folder: null,
    register: null,
    naming: null,
    titleBlocks: null
};

// Phase 3: Advanced features and optimizations
let processingCache = new Map(); // Cache for processed files
let reportHistory = []; // Store report history
let currentProcessingStatus = {
    total: 0,
    completed: 0,
    errors: []
};

// Current active tab
let currentActiveTab = 'drawing-list';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Drawing QC Application...');
    initializeEventListeners();
    initializeTabSystem();
    initializePhase3Features();
    
    // Add some sample data for testing
    populateSampleData();
});

// Add sample data for testing tab functionality
function populateSampleData() {
    console.log('Adding sample data for testing...');
    
    // Sample drawing list data
    fileNamesFromExcel = ['Drawing-001', 'Drawing-002', 'Drawing-003'];
    fileResultsFromFolder = ['Drawing-001.pdf', 'Drawing-002.dwg', 'Drawing-004.pdf'];
    
    // Sample file data for QA-QC
    fileData = [
        {
            sheetNumber: 'A-001',
            sheetName: 'Site Plan',
            fileName: 'A-001_Site_Plan_P01.pdf',
            revisionCode: 'P01',
            revisionDate: '15.07.2025',
            revisionDescription: 'For Planning',
            suitabilityCode: 'S2',
            stageDescription: 'Suitable for Information',
            namingConventionStatus: 'Ok',
            fileDeliveryStatus: 'Delivered',
            comments: '',
            result: 'OK',
            mismatches: ''
        },
        {
            sheetNumber: 'A-002',
            sheetName: 'Ground Floor Plan',
            fileName: 'A-002_Ground_Floor_Plan_P02.pdf',
            revisionCode: 'P02',
            revisionDate: '20.07.2025',
            revisionDescription: 'For Planning - Revised',
            suitabilityCode: 'S2',
            stageDescription: 'Suitable for Information',
            namingConventionStatus: 'Wrong',
            fileDeliveryStatus: 'Missing',
            comments: 'File naming issue',
            result: 'Issues Found',
            mismatches: 'Naming convention violation'
        }
    ];
    
    // Generate initial results
    generateDrawingListResults();
    generateNamingResults();
    generateValidationResults();
    
    console.log('Sample data populated');
}

// Advanced configuration options
const CONFIG = {
    maxCacheSize: 1000,
    batchSize: 50,
    autoSaveInterval: 30000, // 30 seconds
    supportedFileTypes: {
        drawings: ['.pdf', '.dwg', '.dxf', '.dgn'],
        models: ['.rvt', '.nwd', '.nwf', '.ifc', '.nwc'],
        documents: ['.doc', '.docx', '.txt', '.rtf']
    }
};

// Initialize Phase 3 features
function initializePhase3Features() {
    initializeProgressTracking();
    initializeDataPersistence();
    initializeAdvancedFiltering();
    initializeExportOptions();
    console.log('Phase 3 features initialized');
}

// Progress tracking system
function initializeProgressTracking() {
    // Create progress overlay
    const progressOverlay = document.createElement('div');
    progressOverlay.id = 'progressOverlay';
    progressOverlay.className = 'progress-overlay hidden';
    progressOverlay.innerHTML = `
        <div class="progress-modal">
            <h3>Processing Files</h3>
            <div class="progress-bar-container">
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill"></div>
                </div>
                <span class="progress-text" id="progressText">0%</span>
            </div>
            <div class="progress-details">
                <div id="progressStatus">Initializing...</div>
                <div id="progressStats"></div>
            </div>
            <button id="cancelProcessing" class="btn-secondary">Cancel</button>
        </div>
    `;
    document.body.appendChild(progressOverlay);
    
    // Cancel processing handler
    document.getElementById('cancelProcessing').addEventListener('click', cancelProcessing);
}

// Data persistence system
function initializeDataPersistence() {
    // Auto-save functionality
    setInterval(() => {
        saveWorkspaceState();
    }, CONFIG.autoSaveInterval);
    
    // Load previous state on startup
    loadWorkspaceState();
    
    // Save state before page unload
    window.addEventListener('beforeunload', (e) => {
        saveWorkspaceState();
        if (isProcessing()) {
            e.preventDefault();
            e.returnValue = 'Processing is in progress. Are you sure you want to leave?';
        }
    });
}

function initializeEventListeners() {
    // File input handlers
    document.getElementById('selectFolder').addEventListener('change', handleFolderSelect);
    document.getElementById('registerFile').addEventListener('change', handleRegisterFile);
    document.getElementById('namingRulesFile').addEventListener('change', handleNamingFile);
    document.getElementById('titleBlocksFile').addEventListener('change', handleTitleBlocksFile);
    
    // File filter dropdown
    document.getElementById('fileTypeFilter').addEventListener('change', (e) => setFileFilter(e.target.value));
    
    // Run checks button
    document.getElementById('runChecks').addEventListener('click', runQualityChecksAdvanced);
    
    // Search functionality
    document.querySelector('.search-input').addEventListener('input', (e) => {
        filterResults(e.target.value);
    });
    
    // Advanced download options
    document.querySelector('.download-btn').addEventListener('click', () => {
        showExportOptions();
    });
}

// Advanced quality checks with progress tracking
async function runQualityChecksAdvanced() {
    if (!selectedFiles.folder && fileResultsFromFolder.length === 0) {
        alert('Please select a folder containing drawings first.');
        return;
    }
    
    // Initialize progress tracking
    showProgressModal();
    updateProgress(0, 'Initializing checks...');
    
    try {
        const totalSteps = 4;
        let currentStep = 0;
        
        // Step 1: Validate inputs
        updateProgress(++currentStep / totalSteps * 25, 'Validating input files...');
        await delay(500);
        
        // Step 2: Process drawing list
        updateProgress(++currentStep / totalSteps * 50, 'Processing drawing list...');
        await generateDrawingListResultsAsync();
        
        // Step 3: Analyze naming conventions
        updateProgress(++currentStep / totalSteps * 75, 'Analyzing naming conventions...');
        await generateNamingResultsAsync();
        
        // Step 4: Validate QA-QC data
        updateProgress(++currentStep / totalSteps * 100, 'Validating QA-QC data...');
        await generateValidationResultsAsync();
        
        // Update summary with real data
        const totalDrawings = fileResultsFromFolder.length;
        updateSummary(totalDrawings);
        
        // Complete processing
        updateProgress(100, 'Quality checks completed successfully!');
        
        setTimeout(() => {
            hideProgressModal();
            showCompletionNotification();
        }, 1000);
        
    } catch (error) {
        console.error('Error during quality checks:', error);
        updateProgress(0, 'Error occurred during processing');
        setTimeout(() => {
            hideProgressModal();
            alert('An error occurred during processing. Please check the console for details.');
        }, 1000);
    }
}

// Async versions of result generation functions
async function generateDrawingListResultsAsync() {
    return new Promise((resolve) => {
        setTimeout(() => {
            generateDrawingListResults();
            resolve();
        }, 100);
    });
}

async function generateNamingResultsAsync() {
    return new Promise((resolve) => {
        setTimeout(() => {
            generateNamingResults();
            resolve();
        }, 100);
    });
}

async function generateValidationResultsAsync() {
    return new Promise((resolve) => {
        setTimeout(() => {
            generateValidationResults();
            resolve();
        }, 100);
    });
}

// Progress modal functions
function showProgressModal() {
    document.getElementById('progressOverlay').classList.remove('hidden');
    currentProcessingStatus.total = fileResultsFromFolder.length;
    currentProcessingStatus.completed = 0;
    currentProcessingStatus.errors = [];
}

function hideProgressModal() {
    document.getElementById('progressOverlay').classList.add('hidden');
}

function updateProgress(percentage, status) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const progressStatus = document.getElementById('progressStatus');
    const progressStats = document.getElementById('progressStats');
    
    if (progressFill) progressFill.style.width = percentage + '%';
    if (progressText) progressText.textContent = Math.round(percentage) + '%';
    if (progressStatus) progressStatus.textContent = status;
    
    if (progressStats && currentProcessingStatus.total > 0) {
        progressStats.textContent = `${currentProcessingStatus.completed}/${currentProcessingStatus.total} files processed`;
    }
}

function cancelProcessing() {
    hideProgressModal();
    currentProcessingStatus = { total: 0, completed: 0, errors: [] };
}

function isProcessing() {
    const overlay = document.getElementById('progressOverlay');
    return overlay && !overlay.classList.contains('hidden');
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Advanced export functionality
function showExportOptions() {
    const modal = document.getElementById('exportModal');
    if (modal) modal.classList.remove('hidden');
}

function hideExportOptions() {
    const modal = document.getElementById('exportModal');
    if (modal) modal.classList.add('hidden');
}

async function executeAdvancedExport() {
    const formatInput = document.querySelector('input[name="exportFormat"]:checked');
    const format = formatInput ? formatInput.value : 'xlsx';
    
    const options = {
        includeDrawingList: document.getElementById('includeDrawingList')?.checked ?? true,
        includeNaming: document.getElementById('includeNaming')?.checked ?? true,
        includeValidation: document.getElementById('includeValidation')?.checked ?? true,
        includeSummary: document.getElementById('includeSummary')?.checked ?? true,
        includeTimestamp: document.getElementById('includeTimestamp')?.checked ?? true,
        includeMetadata: document.getElementById('includeMetadata')?.checked ?? true,
        compressImages: document.getElementById('compressImages')?.checked ?? false
    };
    
    hideExportOptions();
    showProgressModal();
    updateProgress(0, 'Preparing export...');
    
    try {
        switch (format) {
            case 'xlsx':
                await exportToExcel(options);
                break;
            case 'csv':
                await exportToCSV(options);
                break;
            case 'pdf':
                await exportToPDF(options);
                break;
        }
        
        updateProgress(100, 'Export completed successfully!');
        setTimeout(() => {
            hideProgressModal();
        }, 1000);
        
    } catch (error) {
        console.error('Export error:', error);
        updateProgress(0, 'Export failed');
        setTimeout(() => {
            hideProgressModal();
            alert('Export failed. Please try again.');
        }, 1000);
    }
}

// Advanced Excel export
async function exportToExcel(options) {
    updateProgress(10, 'Creating Excel workbook...');
    
    const workbook = XLSX.utils.book_new();
    let currentProgress = 10;
    
    // Add summary sheet if requested
    if (options.includeSummary) {
        updateProgress(currentProgress += 20, 'Adding summary sheet...');
        const summaryData = createSummaryData();
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    }
    
    // Add drawing list results if requested
    if (options.includeDrawingList) {
        updateProgress(currentProgress += 20, 'Adding drawing list results...');
        const drawingListData = getDrawingListData();
        const drawingListSheet = XLSX.utils.aoa_to_sheet(drawingListData);
        XLSX.utils.book_append_sheet(workbook, drawingListSheet, 'Drawing List');
    }
    
    // Add naming results if requested
    if (options.includeNaming) {
        updateProgress(currentProgress += 20, 'Adding naming check results...');
        const namingData = getNamingData();
        const namingSheet = XLSX.utils.aoa_to_sheet(namingData);
        XLSX.utils.book_append_sheet(workbook, namingSheet, 'Naming Check');
    }
    
    // Add validation results if requested
    if (options.includeValidation) {
        updateProgress(currentProgress += 20, 'Adding QA-QC validation...');
        const validationData = getValidationData();
        const validationSheet = XLSX.utils.aoa_to_sheet(validationData);
        XLSX.utils.book_append_sheet(workbook, validationSheet, 'QA-QC Validation');
    }
    
    updateProgress(90, 'Generating file...');
    
    // Generate filename with timestamp if requested
    const timestamp = options.includeTimestamp ? new Date().toISOString().split('T')[0] : '';
    const filename = `drawing-qc-report${timestamp ? '-' + timestamp : ''}.xlsx`;
    
    // Write and download file
    XLSX.writeFile(workbook, filename);
    
    // Store in report history
    reportHistory.push({
        type: 'xlsx',
        filename: filename,
        timestamp: new Date(),
        options: options
    });
}

// Data extraction functions for export
function createSummaryData() {
    const totalDrawings = fileResultsFromFolder.length;
    const namingCompliance = calculateNamingCompliance();
    const titleBlockCompliance = calculateTitleBlockCompliance();
    const overallCompliance = Math.round((namingCompliance + titleBlockCompliance) / 2);
    
    return [
        ['Drawing QC Summary Report'],
        ['Generated:', new Date().toLocaleString()],
        [''],
        ['Metric', 'Value'],
        ['Total Drawings Scanned', totalDrawings],
        ['Drawings in Register', fileNamesFromExcel.length],
        ['Naming Compliance', `${namingCompliance}%`],
        ['Title Block Compliance', `${titleBlockCompliance}%`],
        ['Overall Compliance', `${overallCompliance}%`]
    ];
}

function getDrawingListData() {
    const headers = ['Drawing Name (From Register)', 'File Found', 'Status'];
    const data = [headers];
    
    fileNamesFromExcel.forEach(drawingName => {
        const matched = fileResultsFromFolder.find(file => compareFileNames(drawingName, file));
        data.push([
            drawingName,
            matched || 'N/A',
            matched ? 'Done' : 'To Do'
        ]);
    });
    
    return data;
}

function getNamingData() {
    const headers = ['Directory', 'File Name', 'Compliance', 'Details'];
    const data = [headers];
    
    fileResultsFromFolder.forEach(fileName => {
        const analysis = analyzeFileName(fileName);
        data.push([
            'Root',
            fileName,
            analysis.compliance,
            analysis.details
        ]);
    });
    
    return data;
}

function getValidationData() {
    const headers = [
        'Sheet Number', 'Sheet Name', 'File Name', 'Revision Code',
        'Revision Date', 'Revision Description', 'Suitability Code',
        'Stage Description', 'Naming Convention Status', 'File Delivery Status',
        'Comments', 'Result', 'Mismatches'
    ];
    const data = [headers];
    
    fileData.forEach(record => {
        data.push([
            record.sheetNumber, record.sheetName, record.fileName,
            record.revisionCode, record.revisionDate, record.revisionDescription,
            record.suitabilityCode, record.stageDescription,
            record.namingConventionStatus, record.fileDeliveryStatus,
            record.comments, record.result, record.mismatches
        ]);
    });
    
    return data;
}

// Helper functions for compliance calculation
function calculateNamingCompliance() {
    if (fileResultsFromFolder.length === 0) return 0;
    
    const compliantCount = fileResultsFromFolder.filter(fileName => {
        const analysis = analyzeFileName(fileName);
        return analysis.compliance === 'Ok';
    }).length;
    
    return Math.round((compliantCount / fileResultsFromFolder.length) * 100);
}

function calculateTitleBlockCompliance() {
    if (fileData.length === 0) return 0;
    
    const compliantCount = fileData.filter(record => {
        return record.namingConventionStatus !== 'Wrong' && record.fileDeliveryStatus !== 'Missing';
    }).length;
    
    return Math.round((compliantCount / fileData.length) * 100);
}

// CSV Export function
async function exportToCSV(options) {
    updateProgress(25, 'Preparing CSV data...');
    
    const csvData = [];
    
    if (options.includeSummary) {
        csvData.push('SUMMARY REPORT');
        csvData.push(`Generated: ${new Date().toLocaleString()}`);
        csvData.push('');
        
        const summaryData = createSummaryData();
        summaryData.slice(3).forEach(row => {
            csvData.push(row.join(','));
        });
        csvData.push('');
    }
    
    if (options.includeDrawingList) {
        csvData.push('DRAWING LIST RESULTS');
        const drawingData = getDrawingListData();
        drawingData.forEach(row => {
            csvData.push(row.join(','));
        });
        csvData.push('');
    }
    
    if (options.includeNaming) {
        csvData.push('NAMING CHECK RESULTS');
        const namingData = getNamingData();
        namingData.forEach(row => {
            csvData.push(row.join(','));
        });
        csvData.push('');
    }
    
    if (options.includeValidation) {
        csvData.push('QA-QC VALIDATION RESULTS');
        const validationData = getValidationData();
        validationData.forEach(row => {
            csvData.push(row.join(','));
        });
    }
    
    updateProgress(75, 'Generating CSV file...');
    
    const csvContent = csvData.join('\n');
    const timestamp = options.includeTimestamp ? new Date().toISOString().split('T')[0] : '';
    const filename = `drawing-qc-report${timestamp ? '-' + timestamp : ''}.csv`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// PDF Export (basic implementation)
async function exportToPDF(options) {
    updateProgress(50, 'Generating PDF report...');
    
    // For now, create a simple HTML report and suggest printing to PDF
    const reportContent = generateHTMLReport(options);
    
    const newWindow = window.open('', '_blank');
    newWindow.document.write(reportContent);
    newWindow.document.close();
    
    // Suggest print to PDF
    setTimeout(() => {
        if (confirm('PDF generation complete. Would you like to print/save as PDF?')) {
            newWindow.print();
        }
    }, 500);
}

function generateHTMLReport(options) {
    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Drawing QC Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1, h2 { color: #333; }
                table { border-collapse: collapse; width: 100%; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f8f9fa; }
                .summary { background: #e9ecef; padding: 15px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <h1>Drawing QC Report</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
    `;
    
    if (options.includeSummary) {
        html += `<div class="summary">
            <h2>Summary</h2>
            <p>Total Drawings: ${fileResultsFromFolder.length}</p>
            <p>Naming Compliance: ${calculateNamingCompliance()}%</p>
            <p>Title Block Compliance: ${calculateTitleBlockCompliance()}%</p>
        </div>`;
    }
    
    // Add table data for each section...
    html += '</body></html>';
    
    return html;
}

// Completion notification
function showCompletionNotification() {
    const notification = document.createElement('div');
    notification.className = 'completion-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">✅</span>
            <span class="notification-text">Quality checks completed successfully!</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Data persistence functions
function saveWorkspaceState() {
    const state = {
        fileNamesFromExcel,
        fileResultsFromFolder,
        fileData,
        selectedFileFilter,
        currentActiveTab,
        timestamp: Date.now()
    };
    
    try {
        localStorage.setItem('drawingQCState', JSON.stringify(state));
        console.log('Workspace state saved');
    } catch (error) {
        console.warn('Could not save workspace state:', error);
    }
}

function loadWorkspaceState() {
    try {
        const saved = localStorage.getItem('drawingQCState');
        if (saved) {
            const state = JSON.parse(saved);
            
            // Only load if recent (within 24 hours)
            if (Date.now() - state.timestamp < 24 * 60 * 60 * 1000) {
                fileNamesFromExcel = state.fileNamesFromExcel || [];
                fileResultsFromFolder = state.fileResultsFromFolder || [];
                fileData = state.fileData || [];
                selectedFileFilter = state.selectedFileFilter || 'all';
                currentActiveTab = state.currentActiveTab || 'drawing-list';
                
                console.log('Workspace state restored');
            }
        }
    } catch (error) {
        console.warn('Could not load workspace state:', error);
    }
}

// Advanced filtering functions
function applyAdvancedFilters() {
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    const sortBy = document.getElementById('sortBy')?.value || 'name';
    const viewMode = document.getElementById('viewMode')?.value || 'detailed';
    
    // Apply filters to current active tab
    const activeTabContent = document.querySelector('.tab-content.active');
    if (!activeTabContent) return;
    
    const table = activeTabContent.querySelector('.results-table');
    if (!table) return;
    
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    
    // Filter by status
    rows.forEach(row => {
        let show = true;
        
        if (statusFilter !== 'all') {
            const statusCell = row.cells[row.cells.length - 2]; // Usually the status column
            const statusText = statusCell?.textContent?.toLowerCase() || '';
            
            switch (statusFilter) {
                case 'ok':
                    show = statusText.includes('ok') || statusText.includes('done');
                    break;
                case 'issues':
                    show = statusText.includes('wrong') || statusText.includes('issues') || statusText.includes('error');
                    break;
                case 'missing':
                    show = statusText.includes('missing') || statusText.includes('to do');
                    break;
            }
        }
        
        row.style.display = show ? '' : 'none';
    });
    
    // Sort visible rows
    const visibleRows = rows.filter(row => row.style.display !== 'none');
    visibleRows.sort((a, b) => {
        const aText = a.cells[0]?.textContent || '';
        const bText = b.cells[0]?.textContent || '';
        return aText.localeCompare(bText);
    });
    
    // Re-append sorted rows
    const tbody = table.querySelector('tbody');
    visibleRows.forEach(row => tbody.appendChild(row));
}

function initializeTabSystem() {
    console.log('Initializing tab system...');
    
    // Tab switching functionality
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    console.log('Found tabs:', tabs.length);
    console.log('Found tab contents:', tabContents.length);
    
    tabs.forEach((tab, index) => {
        const tabId = tab.dataset.tab;
        console.log(`Tab ${index}: ${tabId}`);
        
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = e.target.dataset.tab;
            console.log('Tab clicked:', targetTab);
            switchTab(targetTab);
        });
    });
    
    // Initialize with the default tab
    switchTab('drawing-list');
    console.log('Tab system initialized');
}

function switchTab(targetTab) {
    console.log('Switching to tab:', targetTab);
    
    // Remove active class from all tabs and contents
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Add active class to clicked tab and corresponding content
    const targetTabButton = document.querySelector(`[data-tab="${targetTab}"]`);
    const targetTabContent = document.getElementById(targetTab);
    
    if (targetTabButton) {
        targetTabButton.classList.add('active');
        console.log('Activated tab button:', targetTab);
    } else {
        console.error('Tab button not found:', targetTab);
    }
    
    if (targetTabContent) {
        targetTabContent.classList.add('active');
        console.log('Activated tab content:', targetTab);
    } else {
        console.error('Tab content not found:', targetTab);
    }
    
    // Update current active tab
    currentActiveTab = targetTab;
    
    // Show/hide Expected Values section based on active tab
    const expectedValuesSection = document.getElementById('expectedValuesSection');
    if (expectedValuesSection) {
        if (targetTab === 'validation') {
            expectedValuesSection.style.display = 'block';
        } else {
            expectedValuesSection.style.display = 'none';
        }
    }
    
    console.log('Switched to tab:', targetTab);
}

function setFileFilter(filterType) {
    // Update dropdown selection
    document.getElementById('fileTypeFilter').value = filterType;
    
    selectedFileFilter = filterType;
    console.log('File filter set to:', filterType);
}

// File handling functions (to be expanded with legacy functionality)
function handleFolderSelect(event) {
    // Handle traditional file input (fallback)
    const files = Array.from(event.target.files);
    selectedFiles.folder = files;
    
    // Apply file filter
    fileResultsFromFolder = filterFilesByType(files.map(f => f.name));
    
    // Update UI
    const statusElement = document.querySelector('.file-status .status-text');
    statusElement.textContent = `Selected: ${fileResultsFromFolder.length} files`;
    statusElement.style.color = '#28a745';
    
    console.log('Folder selected:', fileResultsFromFolder.length, 'files after filtering');
}

// Enhanced folder selection using File System Access API (like legacy applications)
async function selectFolderWithAPI() {
    try {
        if (!window.showDirectoryPicker) {
            alert('Your browser does not support advanced folder selection. Please use the file input instead.');
            return;
        }
        
        const directoryHandle = await window.showDirectoryPicker();
        
        // Show processing state
        const statusElement = document.querySelector('.file-status .status-text');
        statusElement.textContent = 'Processing folder...';
        statusElement.style.color = '#ffc107';
        
        fileResultsFromFolder = [];
        await traverseDirectory(directoryHandle, fileResultsFromFolder);
        
        // Apply file filter
        fileResultsFromFolder = filterFilesByType(fileResultsFromFolder);
        
        // Update UI
        statusElement.textContent = `Selected: ${fileResultsFromFolder.length} files from ${directoryHandle.name}`;
        statusElement.style.color = '#28a745';
        
        console.log('Advanced folder selection completed:', fileResultsFromFolder.length, 'files');
        
    } catch (error) {
        console.error('Error selecting folder:', error);
        if (error.name !== 'AbortError') {
            alert('Error selecting folder. Please try again.');
        }
    }
}

// Recursive directory traversal (from legacy naming checker)
async function traverseDirectory(directoryHandle, results, currentPath = '') {
    for await (const entry of directoryHandle.values()) {
        const fullPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;

        if (entry.kind === 'file') {
            results.push(entry.name);
        } else if (entry.kind === 'directory') {
            // Recursive call for subdirectories
            await traverseDirectory(entry, results, fullPath);
        }
    }
}

function filterFilesByType(fileNames) {
    if (selectedFileFilter === 'all') {
        return fileNames;
    }
    
    return fileNames.filter(fileName => {
        const ext = fileName.toLowerCase().split('.').pop();
        
        switch (selectedFileFilter) {
            case 'pdf':
                return ext === 'pdf';
            case 'dwg':
                return ['dwg', 'dxf', 'dgn'].includes(ext);
            case 'other':
                return !['pdf', 'dwg', 'dxf', 'dgn'].includes(ext);
            default:
                return true;
        }
    });
}

function handleRegisterFile(event) {
    const file = event.target.files[0];
    if (file) {
        selectedFiles.register = file;
        updateFileStatus('registerFile', `Selected: ${file.name}`);
        processRegisterFileWithOptions(file);
    }
}

// Enhanced register file processing with sheet/column selection
async function processRegisterFileWithOptions(file) {
    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Store workbook for later use
        selectedFiles.registerWorkbook = workbook;
        
        // Show Excel options
        document.getElementById('registerOptions').style.display = 'block';
        
        // Populate sheet selection
        const sheetSelect = document.getElementById('registerSheetSelect');
        sheetSelect.innerHTML = '';
        
        workbook.SheetNames.forEach((sheetName, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = sheetName;
            sheetSelect.appendChild(option);
        });
        
        // Set up event listeners
        sheetSelect.addEventListener('change', function() {
            populateRegisterColumnSelect(workbook.Sheets[workbook.SheetNames[this.value]], this.value);
        });
        
        // Auto-select first sheet and populate columns
        if (workbook.SheetNames.length > 0) {
            sheetSelect.value = 0;
            populateRegisterColumnSelect(workbook.Sheets[workbook.SheetNames[0]], 0);
        }
        
        console.log('Register file loaded with', workbook.SheetNames.length, 'sheets');
        
    } catch (error) {
        console.error('Error processing register file:', error);
        alert('Error reading the drawing register file. Please check the file format.');
    }
}

// Populate column selection for register file
function populateRegisterColumnSelect(sheet, sheetIndex) {
    try {
        const columnSelect = document.getElementById('registerColumnSelect');
        columnSelect.innerHTML = '';
        
        if (!sheet || !sheet['!ref']) {
            columnSelect.innerHTML = '<option value="">Empty sheet</option>';
            return;
        }
        
        const range = XLSX.utils.decode_range(sheet['!ref']);
        const headers = [];
        
        // Get headers from first row
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_col(C) + '1';
            const cell = sheet[cellAddress];
            const headerText = cell ? cell.v : `Column ${C + 1}`;
            headers.push(headerText);
            
            const option = document.createElement('option');
            option.value = C;
            option.textContent = `${XLSX.utils.encode_col(C)}: ${headerText}`;
            columnSelect.appendChild(option);
        }
        
        // Set up column change listener
        columnSelect.addEventListener('change', function() {
            loadRegisterFileNames(sheet, parseInt(this.value));
            showRegisterPreview(sheet, parseInt(this.value));
        });
        
        // Auto-select first column if available
        if (headers.length > 0) {
            columnSelect.value = 0;
            loadRegisterFileNames(sheet, 0);
            showRegisterPreview(sheet, 0);
        }
        
        console.log('Populated', headers.length, 'columns for sheet', sheetIndex);
        
    } catch (error) {
        console.error('Error populating columns:', error);
        document.getElementById('registerColumnSelect').innerHTML = '<option value="">Error loading columns</option>';
    }
}

// Load file names from selected sheet and column
function loadRegisterFileNames(sheet, columnIndex) {
    try {
        const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        // Extract file names from the selected column, skip header row
        fileNamesFromExcel = sheetData
            .slice(1) // Skip header row
            .map(row => row[columnIndex]) // Get selected column
            .filter(name => name && typeof name === 'string' && name.trim() !== '') // Filter valid names
            .map(name => name.trim()); // Trim whitespace
        
        console.log('Loaded', fileNamesFromExcel.length, 'drawing names from column', columnIndex);
        console.log('First 5 names:', fileNamesFromExcel.slice(0, 5));
        
        // Update file status
        updateFileStatus('registerFile', `Loaded ${fileNamesFromExcel.length} drawing names`);
        
        // Update results if we have folder data
        if (fileResultsFromFolder.length > 0) {
            generateDrawingListResults();
        }
        
    } catch (error) {
        console.error('Error loading file names:', error);
        fileNamesFromExcel = [];
        updateFileStatus('registerFile', 'Error loading drawing names');
    }
}

// Show preview of selected column data
function showRegisterPreview(sheet, columnIndex) {
    try {
        const previewDiv = document.getElementById('registerPreview');
        const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        if (sheetData.length === 0) {
            previewDiv.textContent = 'No data found in sheet';
            return;
        }
        
        // Get header and first few data rows
        const header = sheetData[0] ? sheetData[0][columnIndex] : 'No header';
        const previewData = sheetData
            .slice(1, 6) // Get first 5 data rows
            .map(row => row[columnIndex] || '(empty)')
            .filter(value => value !== '(empty)');
        
        let previewText = `Column: ${header}\n\nFirst ${previewData.length} entries:\n`;
        previewData.forEach((item, index) => {
            previewText += `${index + 1}. ${item}\n`;
        });
        
        if (sheetData.length > 6) {
            previewText += `... and ${sheetData.length - 6} more rows`;
        }
        
        previewDiv.textContent = previewText;
        
    } catch (error) {
        console.error('Error showing preview:', error);
        document.getElementById('registerPreview').textContent = 'Error loading preview';
    }
}

function handleNamingFile(event) {
    const file = event.target.files[0];
    if (file) {
        selectedFiles.naming = file;
        updateFileStatus('namingRulesFile', `Selected: ${file.name}`);
        processNamingFile(file);
    }
}

function handleTitleBlocksFile(event) {
    const file = event.target.files[0];
    if (file) {
        selectedFiles.titleBlocks = file;
        updateFileStatus('titleBlocksFile', `Selected: ${file.name}`);
        processTitleBlocksFile(file);
    }
}

function updateFileStatus(inputId, message) {
    const inputElement = document.getElementById(inputId);
    const fileRow = inputElement.closest('.file-input-row');
    let statusElement = fileRow.querySelector('.file-status-text');
    
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.className = 'file-status-text';
        statusElement.style.color = '#28a745';
        statusElement.style.fontSize = '12px';
        statusElement.style.marginTop = '5px';
        fileRow.appendChild(statusElement);
    }
    
    statusElement.textContent = message;
}

// Placeholder functions for file processing (to be implemented with legacy code)
// Legacy function kept for compatibility - now redirects to new options-based function
async function processRegisterFile(file) {
    // Redirect to new function with options
    await processRegisterFileWithOptions(file);
}

async function processNamingFile(file) {
    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        
        console.log('Available sheet names in naming convention file:', workbook.SheetNames);
        
        // Check if required sheets exist (from legacy naming checker)
        if (!workbook.Sheets['Sheets']) {
            console.error('Sheet named "Sheets" not found. Available sheets:', workbook.SheetNames);
            alert('Naming convention file must contain a sheet named "Sheets". Available sheets: ' + workbook.SheetNames.join(', '));
            return;
        }
        
        namingConvention = {
            Sheets: XLSX.utils.sheet_to_json(workbook.Sheets['Sheets'], { header: 1 }),
            Models: workbook.Sheets['Models'] ? XLSX.utils.sheet_to_json(workbook.Sheets['Models'], { header: 1 }) : [],
        };
        
        console.log('Naming convention file processed');
        console.log('Loaded naming convention - Sheets tab:', namingConvention.Sheets);
        
    } catch (error) {
        console.error('Error processing naming file:', error);
        alert('Error reading naming convention file.');
    }
}

async function processTitleBlocksFile(file) {
    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Process title block data (from legacy QA-QC)
        fileData = jsonData.slice(1).map(row => ({
            sheetNumber: normalizeText(row[0]),
            sheetName: normalizeText(row[1]),
            fileName: normalizeText(row[2]),
            revisionCode: normalizeText(row[3]),
            revisionDate: normalizeDate(row[4]),
            revisionDescription: normalizeText(row[5]),
            suitabilityCode: normalizeText(row[6]),
            stageDescription: normalizeText(row[7]),
            namingConventionStatus: 'Not checked',
            fileDeliveryStatus: 'Not checked',
            comments: '',
            result: 'Pending',
            mismatches: ''
        }));
        
        console.log('Title blocks file processed:', fileData.length, 'records');
        
    } catch (error) {
        console.error('Error processing title blocks file:', error);
        alert('Error reading title blocks file.');
    }
}

// Utility functions from legacy applications
function normalizeText(value) {
    if (!value) return '';
    return String(value).trim().toLowerCase().normalize().replace(/\s+/g, ' ');
}

function normalizeDate(value) {
    if (!value) return '';
    const dateStr = String(value).trim();
    return dateStr.replace(/[\/\-\.]/g, '.').replace(/\s+/g, '');
}

// Advanced naming analysis function (from legacy naming checker)
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

    // Select the appropriate tab - for now, always use Sheets since files are typically drawings
    const namingTab = isModel && namingConvention.Models.length > 0 ? namingConvention.Models : namingConvention.Sheets;
    
    console.log('Using naming tab with', namingTab.length, 'rows');

    // Fetch delimiter from row 1, column C (index [0][2]) - based on Excel structure
    const delimiter = namingTab[0] && namingTab[0][2] ? namingTab[0][2] : null;
    if (!delimiter) {
        console.log('No delimiter found in naming convention');
        return { compliance: 'Wrong', details: 'No delimiter specified in naming convention' };
    }

    console.log('Using delimiter:', delimiter);

    // Remove file extension for analysis
    const nameWithoutExtension = dotPosition > 0 ? fileName.slice(0, dotPosition) : fileName;
    console.log('Name without extension:', nameWithoutExtension);

    // Split file name by delimiter
    const nameParts = nameWithoutExtension.split(delimiter);
    console.log('File name parts:', nameParts);

    // Analyze each part according to naming convention
    const results = [];
    let hasErrors = false;

    // Start from row 2 (index 1) in the naming convention to skip header
    for (let i = 1; i < namingTab.length; i++) {
        const row = namingTab[i];
        if (!row || row.length === 0) continue;

        const partIndex = row[0]; // Column A: Part number
        const partName = row[1]; // Column B: Part name
        const partType = row[2]; // Column C: Part type
        const allowedValues = row[3]; // Column D: Allowed values
        const mandatory = row[4]; // Column E: Mandatory (Y/N)

        console.log(`Checking part ${partIndex}: ${partName} (${partType})`);

        // Convert partIndex to array index (1-based to 0-based)
        const arrayIndex = parseInt(partIndex) - 1;
        
        if (arrayIndex >= 0 && arrayIndex < nameParts.length) {
            const actualValue = nameParts[arrayIndex];
            console.log(`Part ${partIndex} actual value: "${actualValue}"`);

            // Check if part is mandatory but missing
            if (mandatory === 'Y' && (!actualValue || actualValue.trim() === '')) {
                results.push(`${partName}: Missing (mandatory)`);
                hasErrors = true;
                continue;
            }

            // Check allowed values if specified
            if (allowedValues && allowedValues.trim() !== '') {
                const allowedList = allowedValues.split(/[,;|]/).map(v => v.trim().toLowerCase());
                const actualLower = actualValue.toLowerCase();
                
                if (!allowedList.includes(actualLower)) {
                    results.push(`${partName}: "${actualValue}" not in allowed values [${allowedValues}]`);
                    hasErrors = true;
                } else {
                    results.push(`${partName}: OK`);
                }
            } else {
                // No specific values to check, just verify it exists
                if (actualValue && actualValue.trim() !== '') {
                    results.push(`${partName}: OK`);
                } else if (mandatory === 'Y') {
                    results.push(`${partName}: Missing (mandatory)`);
                    hasErrors = true;
                }
            }
        } else if (mandatory === 'Y') {
            results.push(`${partName}: Missing (mandatory)`);
            hasErrors = true;
        }
    }

    // Check for extra parts not defined in convention
    if (nameParts.length > namingTab.length - 1) {
        const extraParts = nameParts.slice(namingTab.length - 1);
        results.push(`Extra parts found: ${extraParts.join(delimiter)}`);
        hasErrors = true;
    }

    const compliance = hasErrors ? 'Wrong' : 'Ok';
    const details = results.length > 0 ? results.join('; ') : 'All parts comply with naming convention';

    console.log('Analysis result:', compliance, '-', details);
    return { compliance, details };
}

// Enhanced file comparison function (from legacy drawing list checker)
function compareFileNames(excelName, folderName) {
    // Normalize both names for comparison
    const normalizeForComparison = (name) => {
        return name.toLowerCase()
                  .normalize()
                  .replace(/\s+/g, ' ')
                  .trim();
    };

    // Remove file extension from folder name for comparison
    const folderNameNoExt = stripExtension(folderName);
    
    const normalizedExcel = normalizeForComparison(excelName);
    const normalizedFolder = normalizeForComparison(folderNameNoExt);
    
    return normalizedExcel === normalizedFolder;
}

function runQualityChecks() {
    if (!selectedFiles.folder && fileResultsFromFolder.length === 0) {
        alert('Please select a folder containing drawings first.');
        return;
    }
    
    // Show loading state
    const button = document.getElementById('runChecks');
    button.textContent = 'Running Checks...';
    button.disabled = true;
    
    // Simulate processing time
    setTimeout(() => {
        // Update summary with real data
        const totalDrawings = fileResultsFromFolder.length;
        updateSummary(totalDrawings);
        
        // Generate results for all tabs
        generateDrawingListResults();
        generateNamingResults();
        generateValidationResults();
        
        // Reset button
        button.textContent = 'Run Checks';
        button.disabled = false;
        
        console.log('Quality checks completed');
    }, 2000);
}

function generateDrawingListResults() {
    const tbody = document.getElementById('drawingListResults');
    tbody.innerHTML = '';
    
    if (fileNamesFromExcel.length === 0 || fileResultsFromFolder.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="3" style="text-align: center; color: #666;">Please select both Excel register and folder to compare</td>';
        tbody.appendChild(row);
        return;
    }
    
    // Implementation using legacy comparison logic
    let matchedCount = 0;
    
    fileNamesFromExcel.forEach(drawingName => {
        const row = document.createElement('tr');
        
        // Find match using enhanced comparison logic
        const matched = fileResultsFromFolder.find(file => 
            compareFileNames(drawingName, file)
        );
        
        if (matched) {
            row.innerHTML = `
                <td>${drawingName}</td>
                <td>${matched}</td>
                <td style="color: #28a745; font-weight: bold;">Done</td>
            `;
            matchedCount++;
        } else {
            row.innerHTML = `
                <td>${drawingName}</td>
                <td>N/A</td>
                <td style="color: #dc3545; font-weight: bold;">To Do</td>
            `;
        }
        
        tbody.appendChild(row);
    });
    
    console.log('Drawing list results generated:', matchedCount, 'matched out of', fileNamesFromExcel.length);
}

function generateNamingResults() {
    const tbody = document.getElementById('namingResults');
    tbody.innerHTML = '';
    
    if (fileResultsFromFolder.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="4" style="text-align: center; color: #666;">Please select folder to analyze naming</td>';
        tbody.appendChild(row);
        return;
    }
    
    fileResultsFromFolder.forEach(fileName => {
        const row = document.createElement('tr');
        const analysis = analyzeFileName(fileName);
        
        row.innerHTML = `
            <td>Root</td>
            <td>${fileName}</td>
            <td style="color: ${analysis.compliance === 'Ok' ? '#28a745' : analysis.compliance === 'Wrong' ? '#dc3545' : '#ffc107'}; font-weight: bold;">${analysis.compliance}</td>
            <td>${analysis.details}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    console.log('Naming results generated for', fileResultsFromFolder.length, 'files');
}

function generateValidationResults() {
    const tbody = document.getElementById('validationResults');
    tbody.innerHTML = '';
    
    if (fileData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="13" style="text-align: center; color: #666;">Please upload Title Blocks Excel file</td>';
        tbody.appendChild(row);
        return;
    }
    
    // Process validation results with enhanced logic
    fileData.forEach((record, index) => {
        const row = document.createElement('tr');
        
        // Perform naming convention check if data is available
        if (record.fileName && namingConvention) {
            const namingAnalysis = analyzeFileName(record.fileName);
            record.namingConventionStatus = namingAnalysis.compliance;
        }
        
        // Check file delivery status (compare with folder contents)
        if (fileResultsFromFolder.length > 0) {
            const fileFound = fileResultsFromFolder.find(file => 
                compareFileNames(record.fileName, file)
            );
            record.fileDeliveryStatus = fileFound ? 'Delivered' : 'Missing';
        }
        
        // Validate expected values from UI inputs
        const expectedRevisionCode = document.getElementById('revisionCode')?.value || '';
        const expectedRevisionDate = document.getElementById('revisionDate')?.value || '';
        const expectedSuitabilityCode = document.getElementById('suitabilityCode')?.value || '';
        const expectedStageDescription = document.getElementById('stageDescription')?.value || '';
        
        const mismatches = [];
        
        if (expectedRevisionCode && record.revisionCode !== expectedRevisionCode.toLowerCase()) {
            mismatches.push(`Revision Code: expected "${expectedRevisionCode}", got "${record.revisionCode}"`);
        }
        
        if (expectedRevisionDate && record.revisionDate !== normalizeDate(expectedRevisionDate)) {
            mismatches.push(`Revision Date: expected "${expectedRevisionDate}", got "${record.revisionDate}"`);
        }
        
        if (expectedSuitabilityCode && record.suitabilityCode !== expectedSuitabilityCode.toLowerCase()) {
            mismatches.push(`Suitability Code: expected "${expectedSuitabilityCode}", got "${record.suitabilityCode}"`);
        }
        
        if (expectedStageDescription && record.stageDescription !== expectedStageDescription.toLowerCase()) {
            mismatches.push(`Stage: expected "${expectedStageDescription}", got "${record.stageDescription}"`);
        }
        
        record.mismatches = mismatches.join('; ');
        
        // Determine overall result
        const hasNamingIssues = record.namingConventionStatus === 'Wrong';
        const hasDeliveryIssues = record.fileDeliveryStatus === 'Missing';
        const hasValidationIssues = mismatches.length > 0;
        
        if (hasNamingIssues || hasDeliveryIssues || hasValidationIssues) {
            record.result = 'Issues Found';
        } else {
            record.result = 'OK';
        }
        
        row.innerHTML = `
            <td>${record.sheetNumber}</td>
            <td>${record.sheetName}</td>
            <td>${record.fileName}</td>
            <td>${record.revisionCode}</td>
            <td>${record.revisionDate}</td>
            <td>${record.revisionDescription}</td>
            <td>${record.suitabilityCode}</td>
            <td>${record.stageDescription}</td>
            <td style="color: ${record.namingConventionStatus === 'Ok' ? '#28a745' : record.namingConventionStatus === 'Wrong' ? '#dc3545' : '#ffc107'};">${record.namingConventionStatus}</td>
            <td style="color: ${record.fileDeliveryStatus === 'Delivered' ? '#28a745' : '#dc3545'};">${record.fileDeliveryStatus}</td>
            <td>${record.comments}</td>
            <td style="color: ${record.result === 'OK' ? '#28a745' : '#dc3545'}; font-weight: bold;">${record.result}</td>
            <td style="color: ${mismatches.length > 0 ? '#dc3545' : '#666'};">${record.mismatches || 'None'}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    console.log('Validation results generated for', fileData.length, 'records');
}

// Helper functions from legacy applications
function stripExtension(fileName) {
    return fileName.replace(/\.[^/.]+$/, "").trim();
}

function analyzeFileName(fileName) {
    if (!namingConvention) {
        return { compliance: 'Not checked', details: 'No naming convention file uploaded' };
    }
    
    // Simplified naming analysis (full implementation would be from legacy)
    const hasValidFormat = fileName.includes('-') || fileName.includes('_');
    return {
        compliance: hasValidFormat ? 'Ok' : 'Wrong',
        details: hasValidFormat ? 'Naming convention followed' : 'Invalid naming format'
    };
}

function updateSummary(totalDrawings) {
    // Update drawings scanned
    document.getElementById('drawingsScanned').textContent = totalDrawings;
    
    // Calculate drawing list compliance
    let drawingListCompliance = 0;
    if (fileNamesFromExcel.length > 0 && totalDrawings > 0) {
        const matchedCount = fileNamesFromExcel.filter(drawingName => 
            fileResultsFromFolder.find(file => compareFileNames(drawingName, file))
        ).length;
        drawingListCompliance = Math.floor((matchedCount / fileNamesFromExcel.length) * 100);
    }
    
    // Calculate naming compliance
    let namingCompliance = 0;
    if (fileResultsFromFolder.length > 0) {
        const compliantCount = fileResultsFromFolder.filter(fileName => {
            const analysis = analyzeFileName(fileName);
            return analysis.compliance === 'Ok';
        }).length;
        namingCompliance = Math.floor((compliantCount / fileResultsFromFolder.length) * 100);
    }
    
    // Calculate title block compliance
    let titleBlockCompliance = 0;
    if (fileData.length > 0) {
        const compliantCount = fileData.filter(record => {
            // Count as compliant if no major issues
            const hasNamingIssues = record.namingConventionStatus === 'Wrong';
            const hasDeliveryIssues = record.fileDeliveryStatus === 'Missing';
            return !hasNamingIssues && !hasDeliveryIssues;
        }).length;
        titleBlockCompliance = Math.floor((compliantCount / fileData.length) * 100);
    }
    
    // Calculate overall compliance (average of all three)
    const validCompliances = [drawingListCompliance, namingCompliance, titleBlockCompliance].filter(val => val > 0);
    const overallCompliance = validCompliances.length > 0 ? 
        Math.floor(validCompliances.reduce((a, b) => a + b, 0) / validCompliances.length) : 0;
    
    // Update missing count
    const missingCount = Math.max(0, fileNamesFromExcel.length - fileResultsFromFolder.filter(file => 
        fileNamesFromExcel.find(name => compareFileNames(name, file))
    ).length);
    
    document.getElementById('drawingsInRegister').textContent = 
        missingCount > 0 ? `${missingCount} missing` : 'All found';
    
    // Update progress bars and percentages
    updateProgressBar('namingCompliance', namingCompliance);
    updateProgressBar('titleBlockCompliance', titleBlockCompliance);
    updateProgressBar('overallCompliance', overallCompliance);
    
    console.log('Summary updated:', {
        totalDrawings,
        drawingListCompliance,
        namingCompliance,
        titleBlockCompliance,
        overallCompliance,
        missingCount
    });
}

function updateProgressBar(elementId, percentage) {
    const element = document.getElementById(elementId);
    const progressBar = element.nextElementSibling.querySelector('.progress-fill');
    
    element.textContent = `${percentage}% OK`;
    progressBar.style.width = `${percentage}%`;
    
    // Update color
    if (percentage >= 80) {
        progressBar.className = 'progress-fill green';
        progressBar.style.backgroundColor = '#28a745';
    } else if (percentage >= 60) {
        progressBar.className = 'progress-fill yellow';
        progressBar.style.backgroundColor = '#ffc107';
    } else {
        progressBar.className = 'progress-fill red';
        progressBar.style.backgroundColor = '#dc3545';
    }
}

function filterResults(searchTerm) {
    const activeTabContent = document.querySelector('.tab-content.active');
    const rows = activeTabContent.querySelectorAll('tbody tr');
    const term = searchTerm.toLowerCase();

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(term) ? '' : 'none';
    });
}

function downloadReport() {
    const activeTabContent = document.querySelector('.tab-content.active');
    const table = activeTabContent.querySelector('.results-table');
    
    if (!table) return;
    
    // Create CSV content
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent);
    const rows = Array.from(table.querySelectorAll('tbody tr:not([style*="display: none"])')).map(row => 
        Array.from(row.cells).map(cell => cell.textContent)
    );

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drawing-qc-${currentActiveTab}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    console.log('Report downloaded for tab:', currentActiveTab);
}
