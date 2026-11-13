import vision = require("../index");

export const assessExtractionConfidence: typeof vision.ocr.assessExtractionConfidence;
export const cleanOcrText: typeof vision.cleanOcrText;
export const detectAllergens: typeof vision.ocr.detectAllergens;
export const extractLabelData: typeof vision.extractLabelData;
export const normalizeOcrResult: typeof vision.normalizeOcrResult;
export const normalizeNutrition: typeof vision.normalizeNutrition;
export const processOcrResult: typeof vision.processOcrResult;
export type ExtractedLabelData = vision.ExtractedLabelData;
export type NormalizedOcrResult = vision.NormalizedOcrResult;
export type NormalizedNutrition = vision.NormalizedNutrition;
export type ParsedFoodLabel = vision.ParsedFoodLabel;
export type ProcessedOcrResult = vision.ProcessedOcrResult;
