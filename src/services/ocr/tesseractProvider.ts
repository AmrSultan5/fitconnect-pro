import Tesseract from 'tesseract.js';
import type { OCRProvider, InBodyOCRResult } from './types';

// Pattern matchers for InBody report data
const WEIGHT_PATTERNS = [
  /weight[:\s]*(\d+\.?\d*)\s*kg/i,
  /body\s*weight[:\s]*(\d+\.?\d*)/i,
  /(\d+\.?\d*)\s*kg\s*(?:weight|body)/i,
  /^(\d{2,3}\.?\d*)\s*kg$/im,
];

const MUSCLE_PATTERNS = [
  /skeletal\s*muscle\s*mass[:\s]*(\d+\.?\d*)/i,
  /smm[:\s]*(\d+\.?\d*)/i,
  /muscle\s*mass[:\s]*(\d+\.?\d*)/i,
  /skeletal\s*muscle[:\s]*(\d+\.?\d*)/i,
];

const BODY_FAT_PATTERNS = [
  /body\s*fat\s*(?:percentage|%)?[:\s]*(\d+\.?\d*)/i,
  /pbf[:\s]*(\d+\.?\d*)/i,
  /fat\s*(?:percentage|%)[:\s]*(\d+\.?\d*)/i,
  /(\d+\.?\d*)\s*%\s*(?:body\s*fat|fat)/i,
];

function extractNumber(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const value = parseFloat(match[1]);
      if (!isNaN(value)) {
        return value;
      }
    }
  }
  return null;
}

function parseInBodyText(text: string): Omit<InBodyOCRResult, 'raw_text'> {
  const weight = extractNumber(text, WEIGHT_PATTERNS);
  const muscle = extractNumber(text, MUSCLE_PATTERNS);
  const bodyFat = extractNumber(text, BODY_FAT_PATTERNS);

  // Calculate confidence based on how many fields were found
  const foundFields = [weight, muscle, bodyFat].filter(v => v !== null).length;
  const confidence = foundFields / 3;

  return {
    weight_kg: weight,
    skeletal_muscle_kg: muscle,
    body_fat_percentage: bodyFat,
    confidence,
  };
}

export const tesseractProvider: OCRProvider = {
  name: 'Tesseract',

  async extractInBodyData(imageData: string | File): Promise<InBodyOCRResult> {
    try {
      const result = await Tesseract.recognize(imageData, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      const text = result.data.text;
      const parsed = parseInBodyText(text);

      return {
        ...parsed,
        raw_text: text,
      };
    } catch (error) {
      console.error('Tesseract OCR error:', error);
      return {
        weight_kg: null,
        skeletal_muscle_kg: null,
        body_fat_percentage: null,
        confidence: 0,
        raw_text: '',
      };
    }
  },
};
