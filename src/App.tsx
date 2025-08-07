import { useEffect } from 'react';
import './App.css';

function App() {
  useEffect(() => {
    // Load the legacy CSS files
    const legacyStyles = document.createElement('link');
    legacyStyles.rel = 'stylesheet';
    legacyStyles.href = '/styles-clash.css';
    document.head.appendChild(legacyStyles);

    const desktopStyles = document.createElement('link');
    desktopStyles.rel = 'stylesheet';
    desktopStyles.href = '/desktop-layout.css';
    document.head.appendChild(desktopStyles);

    // Load external libraries
    const xlsxScript = document.createElement('script');
    xlsxScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    document.head.appendChild(xlsxScript);

    const chartScript = document.createElement('script');
    chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    document.head.appendChild(chartScript);

    // Load the legacy JavaScript after libraries are loaded
    chartScript.onload = () => {
      const legacyScript = document.createElement('script');
      legacyScript.src = '/script-clash.js';
      document.head.appendChild(legacyScript);
    };
  }, []);

  return (
    <div dangerouslySetInnerHTML={{
      __html: `
        <div class="desktop-app">
          <!-- Header -->
          <header class="app-header">
              <h1>Drawing QC</h1>
              <div class="header-controls">
                  <button class="header-btn" onclick="showAbout()">ℹ️ About</button>
                  <button class="header-btn" onclick="showSettings()">⚙️ Settings</button>
              </div>
          </header>

          <!-- Main Layout -->
          <div class="container">
              <main class="main-layout">
              
              <!-- Left Panel: Controls -->
              <div class="column-1">
                  
                  <!-- Action Bar -->
                  <div class="action-bar">
                      <div class="primary-actions">
                          <!-- Removed the 'Select Files' button -->
                      </div>
                      <button class="btn-primary" id="runChecks" style="width: 100%; margin-top: 8px;">Run Checks</button>
                  </div>

                  <!-- File Inputs -->
                  <div class="file-inputs">
                      <h3>Input Files</h3>
                      
                      <div class="file-chip" onclick="document.getElementById('folderInput').click()">
                          <span class="file-icon">📁</span>
                          <div class="file-info">
                              <div class="file-name">Select Folder</div>
                              <div class="file-status" id="folderStatus">No folder selected</div>
                          </div>
                          <span class="file-action">Browse</span>
                      </div>
                      <input type="file" id="folderInput" webkitdirectory multiple>

                      <div class="file-chip" onclick="document.getElementById('registerInput').click()">
                          <span class="file-icon">📊</span>
                          <div class="file-info">
                              <div class="file-name">Drawing Register</div>
                              <div class="file-status" id="registerStatus">No file selected</div>
                          </div>
                          <span class="file-action">Browse</span>
                      </div>
                      <input type="file" id="registerInput" accept=".xlsx,.xls" style="display: none;">

                      <div class="file-chip" onclick="document.getElementById('rulesInput').click()">
                          <span class="file-icon">📋</span>
                          <div class="file-info">
                              <div class="file-name">Naming Rules</div>
                              <div class="file-status" id="rulesStatus">No file selected</div>
                          </div>
                          <span class="file-action">Browse</span>
                      </div>
                      <input type="file" id="rulesInput" accept=".xlsx,.xls" style="display: none;">

                      <div class="file-chip" onclick="document.getElementById('titleBlockInput').click()">
                          <span class="file-icon">🔖</span>
                          <div class="file-info">
                              <div class="file-name">Title Blocks</div>
                              <div class="file-status" id="titleBlockStatus">No file selected</div>
                          </div>
                          <span class="file-action">Browse</span>
                      </div>
                      <input type="file" id="titleBlockInput" accept=".xlsx,.xls" style="display: none;">
                  </div>

                  <!-- Naming Rules Settings -->
                  <div class="settings-group">
                      <h3>Naming Rules Settings</h3>
                      <div class="input-group">
                          <label for="sheetSelect">Sheet:</label>
                          <select id="sheetSelect">
                              <option value="">Select Sheet</option>
                          </select>
                      </div>
                      <div class="input-group">
                          <label for="columnSelect">Column:</label>
                          <select id="columnSelect">
                              <option value="">Select Column</option>
                          </select>
                      </div>
                  </div>

                  <!-- Expected Values -->
                  <div class="settings-group">
                      <h3>Expected Values</h3>
                      <div class="input-group">
                          <label for="expectedRevision">Revision Code:</label>
                          <input type="text" id="expectedRevision" placeholder="e.g., P01, P02">
                      </div>
                      <div class="input-group">
                          <label for="expectedDate">Date:</label>
                          <input type="text" id="expectedDate" placeholder="e.g., DD/MM/YYYY">
                      </div>
                      <div class="input-group">
                          <label for="expectedSuitability">Suitability:</label>
                          <input type="text" id="expectedSuitability" placeholder="e.g., S0, S1, S2">
                      </div>
                      <div class="input-group">
                          <label for="expectedStage">Stage:</label>
                          <input type="text" id="expectedStage" placeholder="e.g., RIBA4">
                      </div>
                      <div class="input-group">
                          <label for="expectedDescription">Description:</label>
                          <input type="text" id="expectedDescription" placeholder="Expected description">
                      </div>
                      <div class="input-group">
                          <label for="expectedSeparator">Separator:</label>
                          <input type="text" id="expectedSeparator" placeholder="e.g., _, -, space" maxlength="3" style="width: 80px;">
                      </div>
                      <div class="checkbox-group">
                          <input type="checkbox" id="sheetOnly">
                          <label for="sheetOnly">Sheet Only</label>
                      </div>
                  </div>
              </div>

              <!-- Right Panel: Results -->
              <div class="column-3">
                  
                  <!-- Summary Section -->
                  <div class="summary-section">
                      <h3>Summary</h3>
                      <div class="chart-grid">
                          <div class="chart-container">
                              <h4>Delivered</h4>
                              <canvas id="deliveredChart"></canvas>
                              <div id="deliveredCount" class="chart-count">0 files</div>
                          </div>
                          <div class="chart-container">
                              <h4>Naming Compliance</h4>
                              <canvas id="namingChart"></canvas>
                              <div id="namingCount" class="chart-count">0%</div>
                          </div>
                          <div class="chart-container">
                              <h4>Title Block Compliance</h4>
                              <canvas id="titleBlockChart"></canvas>
                              <div id="titleBlockCount" class="chart-count">0%</div>
                          </div>
                          <div class="chart-container">
                              <h4>Overall QC Score</h4>
                              <canvas id="overallChart"></canvas>
                              <div id="overallCount" class="chart-count">0%</div>
                          </div>
                      </div>
                  </div>

                  <!-- Detailed Results Section -->
                  <div class="results-section">
                      
                      <!-- Results Header -->
                      <div class="results-header">
                          <h3>Detailed Results</h3>
                          <div class="results-controls">
                              <select id="filterSelect">
                                  <option value="">All Files</option>
                                  <option value="pdf">PDF</option>
                                  <option value="dwg">DWG</option>
                                  <option value="dxf">DXF</option>
                              </select>
                              <input type="text" id="searchInput" placeholder="Search files...">
                              <button id="exportBtn">📋 Export Report</button>
                          </div>
                      </div>

                      <!-- Tab Navigation -->
                      <div class="tab-navigation">
                          <button class="tab-btn active" data-tab="drawing-list">📁 Drawing List</button>
                          <button class="tab-btn" data-tab="naming-checker">📝 Naming Checker</button>
                          <button class="tab-btn" data-tab="qa-qc">✅ QA-QC</button>
                      </div>

                      <!-- Table Containers -->
                      <div class="tab-content">
                          <!-- Drawing List Tab -->
                          <div id="drawing-list" class="tab-pane active">
                              <div class="table-wrapper">
                                  <table id="drawingListTable" class="results-table">
                                      <thead>
                                          <tr>
                                              <th class="sortable" data-column="0">📁 File Name</th>
                                              <th class="sortable" data-column="1">📏 Size</th>
                                              <th class="sortable" data-column="2">📅 Modified</th>
                                              <th class="sortable" data-column="3">📂 Type</th>
                                              <th class="sortable" data-column="4">✅ Status</th>
                                          </tr>
                                      </thead>
                                      <tbody>
                                          <!-- Dynamic content will be inserted here -->
                                      </tbody>
                                  </table>
                              </div>
                          </div>

                          <!-- Naming Checker Tab -->
                          <div id="naming-checker" class="tab-pane">
                              <div class="table-wrapper">
                                  <table id="namingTable" class="results-table">
                                      <thead>
                                          <tr>
                                              <th class="sortable" data-column="0">📁 File Name</th>
                                              <th class="sortable" data-column="1">🔤 Drawing Number</th>
                                              <th class="sortable" data-column="2">📄 Sheet</th>
                                              <th class="sortable" data-column="3">🔖 Revision</th>
                                              <th class="sortable" data-column="4">✅ Compliance</th>
                                              <th class="sortable" data-column="5">💬 Issues</th>
                                          </tr>
                                      </thead>
                                      <tbody>
                                          <!-- Dynamic content will be inserted here -->
                                      </tbody>
                                  </table>
                              </div>
                          </div>

                          <!-- QA-QC Tab -->
                          <div id="qa-qc" class="tab-pane">
                              <div class="table-wrapper">
                                  <table id="qaQcTable" class="results-table">
                                      <thead>
                                          <tr>
                                              <th class="sortable" data-column="0">📁 File Name</th>
                                              <th class="sortable" data-column="1">📊 Register Status</th>
                                              <th class="sortable" data-column="2">📝 Title Block</th>
                                              <th class="sortable" data-column="3">🔤 Naming</th>
                                              <th class="sortable" data-column="4">✅ Overall Score</th>
                                              <th class="sortable" data-column="5">💬 Comments</th>
                                          </tr>
                                      </thead>
                                      <tbody>
                                          <!-- Dynamic content will be inserted here -->
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
              </main>
          </div>
        </div>
      `
    }} />
  );
}

export default App;