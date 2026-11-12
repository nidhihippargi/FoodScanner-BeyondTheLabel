'use strict';
/**
 * Vision subsystem: barcode validation, OCR text cleaning, OCR confidence scoring.
 * Pure functions, zero dependencies.
 */

const FORMATS = { 8: 'EAN-8', 12: 'UPC-A', 13: 'EAN-13', 14: 'GTIN-14' };
const ESSENTIALS = {
  energy: /(energy|calories|kcal|kj)/i,
  sugar: /sugars?/i,
  sodium: /(sodium|salt)/i,
  fat: /\bfat/i,
  protein: /protein/i,
};
const KEYWORDS = ['energy', 'calories', 'kcal', 'protein', 'carbohydrate', 'sugar', 'fat', 'sodium', 'salt', 'ingredients', 'fibre', 'fiber', 'saturated'];

function gs1CheckDigit(body) {
  let sum = 0;
  for (let i = body.length - 1, w = 3; i >= 0; i--, w = w === 3 ? 1 : 3) sum += Number(body[i]) * w;
  return (10 - (sum % 10)) % 10;
}

function validateBarcode(input) {
  const digits = String(input == null ? '' : input).replace(/\D/g, '');
  if (!FORMATS[digits.length]) {
    return { valid: false, normalized: digits, format: null, error: 'Barcode must be 8, 12, 13 or 14 digits' };
  }
  const ok = gs1CheckDigit(digits.slice(0, -1)) === Number(digits.slice(-1));
  return { valid: ok, normalized: digits, format: FORMATS[digits.length], error: ok ? null : 'Invalid barcode check digit' };
}

function cleanOcrText(raw) {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[\u00A0\u2000-\u200B\t]+/g, ' ')
    .replace(/(\d)[Oo](?=\d|\s*(?:g|mg|kcal|kj)\b)/gi, '$10')
    .replace(/(?<=\d)[Il](?=\d)/g, '1')
    .replace(/(\d),(\d{1,2})(?!\d)/g, '$1.$2')
    .replace(/(\d)\s*(?:gm|gms|grams?)\b/gi, '$1 g')
    .replace(/(\d)\s*(?:milligrams?)\b/gi, '$1 mg')
    .replace(/\bK[Cc]al\b/g, 'kcal')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n').map((l) => l.trim()).join('\n')
    .trim();
}

function scoreOcrConfidence(raw, engineConfidence) {
  const text = cleanOcrText(raw);
  if (!text) return { confidence: 0, level: 'low', missing: Object.keys(ESSENTIALS), needsReview: true, cleanedText: '' };
  const lower = text.toLowerCase();
  const hits = KEYWORDS.filter((k) => lower.includes(k)).length;
  const numeric = (text.match(/\d+(\.\d+)?\s*(g|mg|kcal|kj)\b/gi) || []).length;
  const clean = (text.match(/[A-Za-z0-9\s.,:()%\-]/g) || []).length / text.length;
  let confidence = 0.45 * Math.min(hits / 6, 1) + 0.35 * Math.min(numeric / 5, 1) + 0.2 * clean;
  if (typeof engineConfidence === 'number' && engineConfidence >= 0 && engineConfidence <= 1) {
    confidence = (confidence + engineConfidence) / 2;
  }
  confidence = Math.round(confidence * 100) / 100;
  const level = confidence >= 0.7 ? 'high' : confidence >= 0.4 ? 'medium' : 'low';
  const missing = Object.keys(ESSENTIALS).filter((k) => !ESSENTIALS[k].test(text));
  return { confidence, level, missing, needsReview: level !== 'high' || missing.length > 0, cleanedText: text };
}

module.exports = { validateBarcode, cleanOcrText, scoreOcrConfidence, gs1CheckDigit };
