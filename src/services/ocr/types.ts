// OCR Provider abstraction types - allows swapping Tesseract for Google Vision later

export interface InBodyOCRResult {
  weight_kg: number | null;
  skeletal_muscle_kg: number | null;
  body_fat_percentage: number | null;
  confidence: number;
  raw_text: string;
}

export interface OCRProvider {
  name: string;
  extractInBodyData(imageData: string | File): Promise<InBodyOCRResult>;
}

export interface OCRExtractionError {
  message: string;
  code: 'EXTRACTION_FAILED' | 'PARSING_FAILED' | 'NO_DATA_FOUND';
}
