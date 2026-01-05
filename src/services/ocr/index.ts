// OCR Service - Abstract layer for OCR providers
// Currently uses Tesseract, can be swapped to Google Vision later

import { tesseractProvider } from './tesseractProvider';
import type { OCRProvider, InBodyOCRResult } from './types';

export type { InBodyOCRResult, OCRProvider, OCRExtractionError } from './types';

// Current active provider - change this to swap OCR engines
let currentProvider: OCRProvider = tesseractProvider;

export function setOCRProvider(provider: OCRProvider): void {
  currentProvider = provider;
}

export function getOCRProviderName(): string {
  return currentProvider.name;
}

export async function extractInBodyData(imageData: string | File): Promise<InBodyOCRResult> {
  return currentProvider.extractInBodyData(imageData);
}
