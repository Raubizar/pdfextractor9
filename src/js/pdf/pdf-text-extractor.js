
/**
 * PDF text extraction functionality
 */

// Extract text from specific page
export async function extractTextFromPage(pdf, pageNum) {
  try {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    return textContent.items
      .map(item => item.str)
      .join(' ')
      .replace(/\s{2,}/g, '\n');
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
}
