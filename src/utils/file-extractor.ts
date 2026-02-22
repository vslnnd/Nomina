import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const extractTextFromFile = async (file: File): Promise<string> => {
  const extension = file.name.split('.').pop()?.toLowerCase();

  try {
    switch (extension) {
      case 'txt':
      case 'xml':
      case 'csv':
        return await file.text();

      case 'xlsx':
      case 'xls': {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        let fullText = '';
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          fullText += XLSX.utils.sheet_to_txt(sheet) + '\n';
        });
        return fullText;
      }

      case 'docx': {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
      }

      case 'pdf': {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n';
        }
        return fullText;
      }

      default:
        return '';
    }
  } catch (error) {
    console.error(`Error extracting text from ${file.name}:`, error);
    return '';
  }
};