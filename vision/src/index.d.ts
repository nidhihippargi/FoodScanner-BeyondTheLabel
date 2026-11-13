declare namespace visionModule {
  type BarcodeFormat = "GTIN-8" | "UPC-A" | "EAN-13" | "GTIN-14";

  interface BarcodeValidationResult {
    valid: boolean;
    barcode: string | null;
    format: BarcodeFormat | null;
    error: string | null;
  }

  interface BarcodeDecodeResult {
    success: boolean;
    text: string | null;
    format: string | null;
    barcodeValidation: BarcodeValidationResult | null;
    error: string | null;
    errorCode: string | null;
  }

  interface Product {
    name: string | null;
    brand: string | null;
    quantity: string | null;
    ingredients: string | null;
    allergens: string | null;
    nutrition: Record<string, unknown> | null;
    nutriscore: string | null;
    novaGroup: number | string | null;
    imageUrl: string | null;
  }

  type ProductLookupResult =
    | { success: true; found: true; barcode: string; error: null; product: Product }
    | { success: true; found: false; barcode: string; error: string; product: null }
    | { success: false; found: false; barcode: string | null; error: string; product: null };

  interface ImageInput {
    mimeType?: string;
    width?: number;
    height?: number;
  }

  type ImageValidationResult =
    | {
        valid: true;
        error: null;
        image: { mimeType: string; width: number; height: number; aspectRatio: number };
      }
    | { valid: false; error: string };

  interface ImageQualityInput {
    width?: number;
    height?: number;
    brightness?: number;
    blurScore?: number;
  }

  interface ImageQualityResult {
    suitableForOCR: boolean;
    issues: string[];
  }

  interface RgbaImageInput {
    data: Uint8Array | Uint8ClampedArray;
    width: number;
    height: number;
  }

  interface ImageCrop {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  interface PreprocessImageOptions {
    rotation?: 0 | 90 | 180 | 270;
    crop?: ImageCrop;
    maxWidth?: number;
    maxHeight?: number;
    allowUpscale?: boolean;
    brightness?: number;
    contrast?: number;
  }

  type PreprocessImageResult =
    | {
        success: true;
        image: RgbaImageInput & { mimeType: "application/x-rgba" };
        operations: string[];
        error: null;
      }
    | { success: false; image: null; operations: string[]; error: string };

  type CleanOcrTextResult =
    | { success: true; text: string; lines: string[]; error?: never }
    | { success: false; text: ""; lines: []; error: string };

  type NutritionUnit = "kcal" | "kj" | "g" | "mg";

  interface NutritionValue {
    value: number;
    unit: NutritionUnit;
  }

  interface RawNutrition {
    energy?: NutritionValue;
    protein?: NutritionValue;
    carbohydrates?: NutritionValue;
    sugars?: NutritionValue;
    fat?: NutritionValue;
    saturatedFat?: NutritionValue;
    fiber?: NutritionValue;
    sodium?: NutritionValue;
    [key: string]: NutritionValue | undefined;
  }

  interface NormalizedNutrition {
    calories: number | null;
    sugar: number | null;
    sodium: number | null;
    saturatedFat: number | null;
    totalFat: number | null;
    protein: number | null;
    fiber: number | null;
  }

  type NutritionBasis = "per_100g" | "per_serving" | "unknown";

  interface AllergenEvidence {
    name: string;
    sources: string[];
    matchedTerms: string[];
  }

  interface IngredientDetail {
    name: string;
    percentage: number | null;
    subIngredients: string[];
  }

  interface ParsedFoodLabel {
    productName: string | null;
    ingredients: string[];
    ingredientDetails: IngredientDetail[];
    allergens: string[];
    allergenEvidence: AllergenEvidence[];
    rawNutrition: RawNutrition;
    nutrition: NormalizedNutrition;
    nutritionBasis: NutritionBasis;
    servingSize: string | null;
  }

  interface FieldConfidence {
    score: number;
    level: "high" | "medium" | "low" | "not_found";
    source: string | null;
  }

  interface ExtractionConfidence {
    method: "rule_based_heuristic";
    note: string;
    overall: number | null;
    fields: {
      productName: FieldConfidence;
      ingredients: FieldConfidence;
      allergens: FieldConfidence;
      nutrition: FieldConfidence;
      servingSize: FieldConfidence;
    };
  }

  interface OcrConfidence {
    overall: number | null;
  }

  interface ExtractLabelDataOptions {
    confidence?: OcrConfidence;
  }

  interface ExtractedLabelData {
    success: true;
    parsedData: ParsedFoodLabel;
    confidence: OcrConfidence | null;
    extractionConfidence: ExtractionConfidence;
    warnings: string[];
    error: null;
  }

  interface ExtractLabelDataFailure {
    success: false;
    parsedData: null;
    confidence: null;
    extractionConfidence: null;
    warnings: [];
    error: string;
  }

  interface OcrBlock {
    text: string;
    confidence?: number | null;
    boundingBox?: object | null;
  }

  type NormalizedOcrResult =
    | {
        success: true;
        engine: string | null;
        text: string;
        blocks: OcrBlock[];
        confidence: OcrConfidence;
        error: null;
      }
    | {
        success: false;
        engine: null;
        text: "";
        blocks: [];
        confidence: OcrConfidence;
        error: string;
      };

  type ProcessedOcrResult =
    | {
        success: true;
        engine: string | null;
        rawText: string;
        cleanedText: string;
        blocks: OcrBlock[];
        parsedData: ParsedFoodLabel;
        confidence: OcrConfidence;
        extractionConfidence: ExtractionConfidence;
        warnings: string[];
        error: null;
      }
    | {
        success: false;
        engine: string | null;
        rawText: string;
        cleanedText: string;
        blocks: OcrBlock[];
        parsedData: null;
        confidence: OcrConfidence;
        extractionConfidence: null;
        warnings: [];
        error: string;
      };

  interface AllergenDetectionResult {
    allergens: string[];
    evidence: AllergenEvidence[];
  }

  interface FoodLabelValidationResult {
    valid: boolean;
    needsReview: boolean;
    errors: string[];
    warnings: string[];
    checks: Array<{ name: string; passed: boolean }>;
  }

  const name: "foodscanner-vision";
  const version: string;

  const barcode: {
    decodeBarcodeFromRgba(image: RgbaImageInput, options?: { tryHarder?: boolean }): BarcodeDecodeResult;
    fetchProductByBarcode(barcode: unknown): Promise<ProductLookupResult>;
    validateBarcode(barcode: unknown): BarcodeValidationResult;
  };

  const imageProcessing: {
    assessImageQuality(image: unknown): ImageQualityResult;
    preprocessImage(image: RgbaImageInput, options?: PreprocessImageOptions): PreprocessImageResult;
    validateImage(image: unknown): ImageValidationResult;
    validateRgbaImage(image: unknown): { valid: boolean; error: string | null };
  };

  const ocr: {
    assessExtractionConfidence(evidence?: Record<string, unknown>): ExtractionConfidence;
    cleanOcrText(rawText: unknown): CleanOcrTextResult;
    detectAllergens(ingredientText: string, explicitAllergenText?: string): AllergenDetectionResult;
    extractLabelData(input: unknown, options?: ExtractLabelDataOptions): ExtractedLabelData | ExtractLabelDataFailure;
    normalizeOcrResult(input: unknown): NormalizedOcrResult;
    normalizeNutrition(rawNutrition?: RawNutrition): NormalizedNutrition;
    processOcrResult(providerResult: unknown): ProcessedOcrResult;
  };

  const foodLabel: {
    validateFoodLabel(input: unknown): FoodLabelValidationResult;
  };

  function cleanOcrText(rawText: unknown): CleanOcrTextResult;
  function decodeBarcodeFromRgba(image: RgbaImageInput, options?: { tryHarder?: boolean }): BarcodeDecodeResult;
  function extractLabelData(input: unknown, options?: ExtractLabelDataOptions): ExtractedLabelData | ExtractLabelDataFailure;
  function normalizeOcrResult(input: unknown): NormalizedOcrResult;
  function normalizeNutrition(rawNutrition?: RawNutrition): NormalizedNutrition;
  function preprocessImage(image: RgbaImageInput, options?: PreprocessImageOptions): PreprocessImageResult;
  function processOcrResult(providerResult: unknown): ProcessedOcrResult;
  function validateFoodLabel(input: unknown): FoodLabelValidationResult;
}

export = visionModule;
