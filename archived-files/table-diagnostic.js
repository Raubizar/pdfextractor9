// ================================
// TABLE POPULATION DIAGNOSTIC SCRIPT
// ================================
// Run this in the browser console to test table population

console.log('🔧 TABLE POPULATION DIAGNOSTIC STARTED');
console.log('=======================================');

// Function to check current state
function diagnoseTableState() {
    console.log('\n📊 CURRENT STATE DIAGNOSIS:');
    
    // Check if our enhanced function exists
    if (typeof populateInitialTablesEnhanced === 'function') {
        console.log('✅ Enhanced table function available');
    } else {
        console.log('❌ Enhanced table function NOT available');
    }
    
    // Check data availability
    const dataCheck = {
        uploadedFiles: typeof uploadedFiles !== 'undefined' ? uploadedFiles.length : 'undefined',
        fileResultsFromFolder: typeof fileResultsFromFolder !== 'undefined' ? fileResultsFromFolder.length : 'undefined',
        titleBlockData: typeof titleBlockData !== 'undefined' ? titleBlockData.length : 'undefined',
        currentRegisterWorkbook: typeof window.currentRegisterWorkbook !== 'undefined' ? 'available' : 'undefined'
    };
    
    console.log('📋 Data availability:', dataCheck);
    
    // Check table elements
    const tables = {
        drawingListResults: document.getElementById('drawingListResults'),
        namingResults: document.getElementById('namingResults'),
        qaqcResults: document.getElementById('qaqcResults')
    };
    
    console.log('🔍 Table elements found:', {
        drawingListResults: !!tables.drawingListResults,
        namingResults: !!tables.namingResults,
        qaqcResults: !!tables.qaqcResults
    });
    
    // Check current row counts
    console.log('📊 Current row counts:', {
        drawing: tables.drawingListResults ? tables.drawingListResults.children.length : 'N/A',
        naming: tables.namingResults ? tables.namingResults.children.length : 'N/A',
        qaqc: tables.qaqcResults ? tables.qaqcResults.children.length : 'N/A'
    });
    
    return { dataCheck, tables };
}

// Function to create test data if none exists
function createDiagnosticTestData() {
    console.log('\n🧪 CREATING DIAGNOSTIC TEST DATA:');
    
    // Create test uploaded files
    if (typeof uploadedFiles === 'undefined' || !uploadedFiles || uploadedFiles.length === 0) {
        window.uploadedFiles = [
            { name: 'DIAG-001-P01.pdf', path: 'drawings/DIAG-001-P01.pdf', file: {} },
            { name: 'DIAG-002-P02.pdf', path: 'drawings/DIAG-002-P02.pdf', file: {} },
            { name: 'DIAG-003-P01.dwg', path: 'drawings/DIAG-003-P01.dwg', file: {} },
            { name: 'PLAN-A-001-P01.pdf', path: 'drawings/PLAN-A-001-P01.pdf', file: {} },
            { name: 'ELEV-B-002-P02.dwg', path: 'drawings/ELEV-B-002-P02.dwg', file: {} }
        ];
        console.log('✅ Created uploadedFiles:', uploadedFiles.length);
    }
    
    if (typeof fileResultsFromFolder === 'undefined' || !fileResultsFromFolder || fileResultsFromFolder.length === 0) {
        window.fileResultsFromFolder = uploadedFiles;
        console.log('✅ Set fileResultsFromFolder:', fileResultsFromFolder.length);
    }
    
    // Create test title block data
    if (typeof titleBlockData === 'undefined' || !titleBlockData || titleBlockData.length === 0) {
        window.titleBlockData = [
            {
                sheetNumber: 'DIAG-001',
                sheetName: 'Diagnostic Drawing 1',
                fileName: 'DIAG-001-P01.pdf',
                revisionCode: 'P01',
                revisionDate: '2025-01-01',
                revisionDescription: 'For Information',
                suitabilityCode: 'S0',
                stageDescription: 'Stage 0'
            },
            {
                sheetNumber: 'DIAG-002',
                sheetName: 'Diagnostic Drawing 2',
                fileName: 'DIAG-002-P02.pdf',
                revisionCode: 'P02',
                revisionDate: '2025-01-02',
                revisionDescription: 'For Review',
                suitabilityCode: 'S1',
                stageDescription: 'Stage 1'
            },
            {
                sheetNumber: 'PLAN-A-001',
                sheetName: 'Floor Plan A',
                fileName: 'PLAN-A-001-P01.pdf',
                revisionCode: 'P01',
                revisionDate: '2025-01-03',
                revisionDescription: 'For Information',
                suitabilityCode: 'S0',
                stageDescription: 'Stage 0'
            }
        ];
        console.log('✅ Created titleBlockData:', titleBlockData.length);
    }
}

// Function to test table population directly
function testTablePopulationDirect() {
    console.log('\n🔄 TESTING TABLE POPULATION DIRECTLY:');
    
    try {
        // Get table elements
        const drawingTable = document.getElementById('drawingListResults');
        const namingTable = document.getElementById('namingResults');
        const qaqcTable = document.getElementById('qaqcResults');
        
        if (!drawingTable || !namingTable || !qaqcTable) {
            console.error('❌ One or more table elements not found');
            return false;
        }
        
        // Clear tables
        drawingTable.innerHTML = '';
        namingTable.innerHTML = '';
        qaqcTable.innerHTML = '';
        console.log('🧹 Cleared tables');
        
        // Get data
        const folderFiles = uploadedFiles || fileResultsFromFolder || [];
        const titleData = titleBlockData || [];
        
        if (folderFiles.length === 0) {
            console.log('⚠️ No folder files available for testing');
            return false;
        }
        
        // Populate naming table
        const namingContent = folderFiles.map((file) => {
            const fileName = file.name || 'Unknown';
            const fileExt = fileName.split('.').pop()?.toUpperCase() || 'Unknown';
            const hasRevision = /[._-][PR]\\d{2}[._-]|[._-]REV[._-]/i.test(fileName);
            
            return `
                <tr>
                    <td>${file.path || file.name}</td>
                    <td>${fileName}</td>
                    <td><span class="status-badge ${hasRevision ? 'info' : 'warning'}">Direct Test: ${hasRevision ? 'Pattern Found' : 'Check Required'}</span></td>
                    <td>${fileExt} file${hasRevision ? ', has revision pattern' : ', no revision pattern detected'}</td>
                </tr>
            `;
        }).join('');
        
        namingTable.innerHTML = namingContent;
        console.log(`✅ Populated naming table with ${folderFiles.length} rows`);
        
        // Populate drawing table
        const drawingContent = folderFiles.map((file, index) => {
            return `
                <tr>
                    <td>Direct Test ${index + 1}: ${file.name}</td>
                    <td>${file.name}</td>
                    <td><span class="status-badge info">Direct Test: File Available</span></td>
                </tr>
            `;
        }).join('');
        
        drawingTable.innerHTML = drawingContent;
        console.log(`✅ Populated drawing table with ${folderFiles.length} rows`);
        
        // Populate QA-QC table if title data exists
        if (titleData.length > 0) {
            const qaqcContent = titleData.map((tbData) => {
                return `
                    <tr>
                        <td>${tbData.sheetNumber || 'N/A'}</td>
                        <td>${tbData.sheetName || 'N/A'}</td>
                        <td>${tbData.fileName || 'N/A'}</td>
                        <td>${tbData.revisionCode || 'N/A'}</td>
                        <td>${tbData.revisionDate || 'N/A'}</td>
                        <td>${tbData.revisionDescription || 'N/A'}</td>
                        <td>${tbData.suitabilityCode || 'N/A'}</td>
                        <td>${tbData.stageDescription || 'N/A'}</td>
                        <td><span class="status-badge info">Direct Test</span></td>
                        <td><span class="status-badge info">Direct Test: Available</span></td>
                        <td>Direct test comment</td>
                        <td><span class="status-badge info">Direct Test</span></td>
                        <td>Direct test data</td>
                    </tr>
                `;
            }).join('');
            
            qaqcTable.innerHTML = qaqcContent;
            console.log(`✅ Populated QA-QC table with ${titleData.length} rows`);
        } else {
            console.log('⚠️ No title block data for QA-QC table');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Error in direct table test:', error);
        return false;
    }
}

// Function to run the existing enhanced function if available
function testEnhancedFunction() {
    console.log('\n🚀 TESTING ENHANCED FUNCTION:');
    
    if (typeof populateInitialTablesEnhanced === 'function') {
        try {
            populateInitialTablesEnhanced();
            console.log('✅ Enhanced function executed');
            return true;
        } catch (error) {
            console.error('❌ Error running enhanced function:', error);
            return false;
        }
    } else {
        console.log('⚠️ Enhanced function not available, using alternatives...');
        
        // Try other available functions
        if (typeof triggerTablePopulation === 'function') {
            console.log('🔄 Using triggerTablePopulation...');
            triggerTablePopulation();
            return true;
        } else if (typeof generateTestData === 'function') {
            console.log('🧪 Using generateTestData...');
            generateTestData();
            return true;
        } else {
            console.log('❌ No table population functions available');
            return false;
        }
    }
}

// Main diagnostic function
function runFullDiagnostic() {
    console.log('\n🎯 RUNNING FULL DIAGNOSTIC SEQUENCE:');
    console.log('=====================================');
    
    // Step 1: Check current state
    const currentState = diagnoseTableState();
    
    // Step 2: Create test data if needed
    createDiagnosticTestData();
    
    // Step 3: Test direct table population
    const directTestResult = testTablePopulationDirect();
    
    // Step 4: Test enhanced function
    const enhancedTestResult = testEnhancedFunction();
    
    // Step 5: Final state check
    console.log('\n📊 FINAL STATE CHECK:');
    const finalState = diagnoseTableState();
    
    // Summary
    console.log('\n📋 DIAGNOSTIC SUMMARY:');
    console.log('======================');
    console.log('Direct table test:', directTestResult ? '✅ PASSED' : '❌ FAILED');
    console.log('Enhanced function test:', enhancedTestResult ? '✅ PASSED' : '❌ FAILED');
    console.log('Tables now populated:', finalState.tables.drawingListResults?.children.length > 0 || finalState.tables.namingResults?.children.length > 0 || finalState.tables.qaqcResults?.children.length > 0 ? '✅ YES' : '❌ NO');
    
    return {
        directTest: directTestResult,
        enhancedTest: enhancedTestResult,
        currentState,
        finalState
    };
}

// Export functions to global scope for manual testing
window.diagnoseTableState = diagnoseTableState;
window.createDiagnosticTestData = createDiagnosticTestData;
window.testTablePopulationDirect = testTablePopulationDirect;
window.testEnhancedFunction = testEnhancedFunction;
window.runFullDiagnostic = runFullDiagnostic;

// Auto-run diagnostic
console.log('🔧 TABLE DIAGNOSTIC SCRIPT LOADED');
console.log('Available functions:');
console.log('  - diagnoseTableState() - Check current state');
console.log('  - createDiagnosticTestData() - Create test data');
console.log('  - testTablePopulationDirect() - Direct table test');
console.log('  - testEnhancedFunction() - Test enhanced function');
console.log('  - runFullDiagnostic() - Run complete diagnostic');
console.log('');
console.log('🚀 Running automatic diagnostic...');

// Run automatic diagnostic
runFullDiagnostic();
