
# PDF Parser

A browser-based PDF parsing application that runs entirely on the client side using vanilla JavaScript and PDF.js.

## Features

- Drag and drop PDF upload
- PDF rendering with PDF.js
- Text extraction from PDF documents
- Page navigation for multi-page documents
- Responsive design for desktop and mobile devices
- Foundation for future AI processing via Netlify Functions

## Deployment

This application is designed to be deployed directly to Netlify without any build process:

- Frontend files are in the project root
- Backend serverless function is in the `netlify/functions` directory

## Project Structure

```
/
├── index.html           # Main application HTML
├── styles.css           # Application styles
├── app.js               # Application logic
├── netlify.toml         # Netlify configuration
└── netlify/
    └── functions/
        └── ai-processor.js  # Placeholder for future AI integration
```

## Technologies Used

- Vanilla JavaScript (No frameworks)
- PDF.js for PDF parsing and rendering
- Netlify Functions for future serverless functionality

## Future Enhancements

- AI-powered document analysis and data extraction
- Support for extracting tables and structured data
- Document annotation capabilities
- Save and export functionality
