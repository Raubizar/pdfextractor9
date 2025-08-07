# Project Cleanup Guide

## Files to Consider Removing (Deprecated)

### Root Directory Cleanup:
- `script.js` - Replaced by `script-clash.js`
- `styles.css` - Replaced by `styles-clash.css` 
- `styles-modern.css` - Alternative version, not used
- `styles_backup.css` - Backup file, not needed in production

### Development Files:
- `table-diagnostic.js` - Debug utility, can be removed for production
- `test-table-fix.html` - Testing file, can be removed for production
- `CHART_FIXES_SUMMARY.md` - Development notes, can be archived
- `FIX-INSTRUCTIONS.md` - Development notes, can be archived

## Recommended Actions:

### 1. Archive Deprecated Files:
```bash
# Create archive directory
mkdir archived-files

# Move deprecated files
mv script.js archived-files/
mv styles.css archived-files/
mv styles-modern.css archived-files/
mv styles_backup.css archived-files/
mv table-diagnostic.js archived-files/
mv test-table-fix.html archived-files/
mv CHART_FIXES_SUMMARY.md archived-files/
mv FIX-INSTRUCTIONS.md archived-files/
```

### 2. Verify Legacy Apps Work:
- Test each legacy application individually
- Ensure all file references are correct
- Check that company logos and templates exist

### 3. Optimize Current Files:
- Consider minifying `script-clash.js` (211KB → ~80KB)
- Optimize `styles-clash.css` for production
- Remove unused CSS rules

## Current Active Structure:
```
deliverables-qc/
├── index.html              # Main application
├── script-clash.js         # Core functionality
├── styles-clash.css        # Styling
├── README.md               # Documentation
└── legacy/                 # Legacy applications
    ├── check_file_naming/
    ├── Check-drawing-list/
    └── Deliverables_QA_QC/
```

## Performance Improvements:
1. **Bundle Size**: Current JS is 211KB - consider code splitting
2. **CSS Optimization**: Remove unused styles
3. **Lazy Loading**: Load legacy apps only when needed
4. **Caching**: Implement service worker for offline capability 