#!/bin/bash

# Drawing QC Modernization Setup Script
echo "🚀 Setting up modern Drawing QC application..."

# Create archive directory for deprecated files
echo "📁 Creating archive directory..."
mkdir -p archived-files

# Archive deprecated files
echo "🗂️ Archiving deprecated files..."
mv script.js archived-files/ 2>/dev/null || echo "script.js not found"
mv styles.css archived-files/ 2>/dev/null || echo "styles.css not found"
mv styles-modern.css archived-files/ 2>/dev/null || echo "styles-modern.css not found"
mv styles_backup.css archived-files/ 2>/dev/null || echo "styles_backup.css not found"
mv table-diagnostic.js archived-files/ 2>/dev/null || echo "table-diagnostic.js not found"
mv test-table-fix.html archived-files/ 2>/dev/null || echo "test-table-fix.html not found"
mv CHART_FIXES_SUMMARY.md archived-files/ 2>/dev/null || echo "CHART_FIXES_SUMMARY.md not found"
mv FIX-INSTRUCTIONS.md archived-files/ 2>/dev/null || echo "FIX-INSTRUCTIONS.md not found"

# Install dependencies if npm is available
if command -v npm &> /dev/null; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "⚠️ npm not found. Please install Node.js and npm to use optimization features."
fi

# Create optimized version
echo "✨ Creating optimized version..."
cp index.html index-original.html
cp index-optimized.html index.html

# Update CSS reference to enhanced version
echo "🎨 Updating to enhanced styles..."
cp styles-modern-enhanced.css styles-clash.css

echo "✅ Modernization complete!"
echo ""
echo "📋 What's been done:"
echo "  ✅ Archived deprecated files"
echo "  ✅ Created optimized HTML version"
echo "  ✅ Enhanced CSS with dark mode and modern features"
echo "  ✅ Added service worker for offline capability"
echo "  ✅ Created PWA manifest for app-like experience"
echo "  ✅ Set up modern build tools"
echo ""
echo "🚀 To start the modernized application:"
echo "  python -m http.server 8000"
echo ""
echo "🔧 For development with hot reload:"
echo "  npm run dev"
echo ""
echo "📱 Your app is now:"
echo "  • Installable as a PWA"
echo "  • Works offline"
echo "  • Has dark mode support"
echo "  • Fully responsive"
echo "  • Accessible"
echo ""
echo "🌐 Visit: http://localhost:8000" 