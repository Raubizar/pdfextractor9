# Drawing QC Application

A comprehensive quality control application for engineering drawings that combines three legacy tools into one unified interface.

## Features

### Phase 1: User Interface
- ✅ Modern, responsive web interface
- ✅ File upload system for drawings and Excel files
- ✅ Tab-based navigation between different check types
- ✅ Summary dashboard with progress indicators

### Phase 2: Core Functionality
- ✅ **Drawing List Checker**: Compare Excel register against folder contents
- ✅ **Naming Convention Validator**: Validate file names against naming rules
- ✅ **QA-QC Validation**: Comprehensive title block and deliverables checking
- ✅ Advanced file comparison algorithms
- ✅ Excel file parsing and processing

### Phase 3: Advanced Features
- ✅ **Progress Tracking**: Real-time progress monitoring during processing
- ✅ **Advanced Export Options**: Excel, CSV, and PDF export with customizable content
- ✅ **Data Persistence**: Auto-save workspace state
- ✅ **Advanced Filtering**: Filter results by status, sort options, and view modes
- ✅ **Performance Optimizations**: Async processing and caching
- ✅ **Completion Notifications**: User feedback and status updates

## Usage

1. **Select Input Files**:
   - Choose project folder containing drawings
   - Upload drawing register Excel file
   - Upload naming convention rules
   - Upload title blocks Excel file

2. **Configure Filters**:
   - Set file type filters (All/PDF/DWG/Other)
   - Choose expected values for QA-QC validation

3. **Run Quality Checks**:
   - Click "Run Checks" to process all files
   - Monitor progress in real-time
   - View results across three tabs

4. **Export Results**:
   - Choose export format (Excel/CSV/PDF)
   - Select content to include
   - Download comprehensive reports

## File Structure

```
deliverables-qc/
├── index.html              # Main application interface
├── script-clash.js         # Core application logic (ACTIVE)
├── styles-clash.css        # Complete styling (ACTIVE)
├── README.md               # This documentation
├── table-diagnostic.js     # Debugging utility
├── test-table-fix.html     # Testing interface
├── CHART_FIXES_SUMMARY.md  # Development notes
├── FIX-INSTRUCTIONS.md     # Development notes
└── legacy/                 # Original legacy applications
    ├── check_file_naming/
    ├── Check-drawing-list/
    └── Deliverables_QA_QC/
```

## Current Active Files

**Main Application:**
- `index.html` - Main interface
- `script-clash.js` - Core functionality (211KB)
- `styles-clash.css` - Styling (19KB)

**Legacy Applications:**
- `legacy/check_file_naming/` - Original naming convention checker
- `legacy/Check-drawing-list/` - Original drawing list checker  
- `legacy/Deliverables_QA_QC/` - Original QA-QC validator

**Development Files:**
- `script.js` - Previous version (deprecated)
- `styles.css` - Previous version (deprecated)
- `styles-modern.css` - Alternative styling (deprecated)
- `styles_backup.css` - Backup styling (deprecated)

## Technical Features

### Advanced Processing
- **Async Operations**: Non-blocking file processing
- **Progress Tracking**: Step-by-step processing feedback
- **Error Handling**: Comprehensive error reporting
- **Caching System**: Improved performance for repeat operations

### Export Capabilities
- **Excel Export**: Multi-sheet workbooks with formatted data
- **CSV Export**: Comma-separated values for data analysis
- **PDF Reports**: Formatted reports for distribution
- **Customizable Content**: Choose what to include in exports

### Data Management
- **Auto-Save**: Automatic workspace state preservation
- **Session Recovery**: Restore work after browser closure
- **File Validation**: Input file format verification
- **Data Normalization**: Consistent data processing

### User Experience
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Feedback**: Immediate status updates
- **Advanced Filtering**: Sort and filter results dynamically
- **Keyboard Support**: Accessibility features

## Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **File System Access**: Enhanced folder selection (Chrome/Edge)
- **Fallback Support**: Traditional file inputs for all browsers

## Dependencies

- **XLSX.js**: Excel file processing
- **Chart.js**: Data visualization
- **Native Web APIs**: File System Access, Blob, URL
- **ES6+ Features**: Async/await, Promises, Classes

## Legacy Integration

This application combines functionality from three separate legacy tools:
1. **Check Drawing List**: Excel vs folder comparison
2. **File Naming Checker**: Naming convention validation
3. **Deliverables QA-QC**: Title block and metadata validation

All legacy algorithms have been preserved and enhanced with modern features.

## Performance

- **Batch Processing**: Handle large file sets efficiently
- **Memory Management**: Optimized for large datasets
- **Background Processing**: Non-blocking UI updates
- **Caching**: Reduce redundant calculations

## Security

- **Client-Side Processing**: All data remains on user's device
- **No Server Dependencies**: Pure client-side application
- **File System Access**: Secure browser APIs only
- **Data Privacy**: No external data transmission

## Known Issues

- Legacy applications may have broken file references
- Multiple CSS files exist (consider consolidation)
- Large JavaScript bundle size (211KB) - consider optimization
