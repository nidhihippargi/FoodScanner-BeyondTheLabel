# FoodScanner – Beyond the Label
## Vision Engineering Module

**Module:** Vision Engineering
**Branch:** `feature/vision-ocr`
**Status:** Core JavaScript utilities implemented; React Native integration pending
**Primary technologies:** JavaScript, React Native, Google ML Kit (frontend integration)

---

## 1. Overview

The Vision Engineering module provides reusable utilities for processing food-label information.

Its responsibilities include:

- Validating product barcodes.
- Retrieving product information using Open Food Facts.
- Validating image metadata.
- Assessing basic image-quality measurements.
- Cleaning OCR-recognized text.
- Extracting structured information from food labels.

The module is designed to separate platform-independent processing logic from device-specific functionality.

**Important:** Camera access, gallery selection, barcode scanning, native OCR recognition, and native image preprocessing are not implemented inside this JavaScript module. These responsibilities belong to the React Native application and its native integrations.

## 2. Architecture

The intended processing workflow is:

1. The frontend captures an image or selects one from the gallery.
2. The frontend performs native image handling and metadata extraction.
3. Vision validates the image metadata.
4. The frontend passes the image to its OCR engine, such as Google ML Kit.
5. Vision cleans the recognized text.
6. Vision extracts ingredients, allergens, nutrition information, and serving size.
7. The resulting data is passed to the appropriate application modules.

Barcode processing follows a separate workflow:

1. The frontend scans a barcode using a camera/scanning library.
2. The frontend passes the detected barcode string to Vision.
3. Vision validates the barcode.
4. Vision can retrieve product information from Open Food Facts.

## 3. Project Structure

```text
vision/
│
├── package.json
├── package-lock.json
├── README.md
│
├── src/
│   ├── index.js
│   │
│   ├── barcode/
│   │   ├── index.js
│   │   ├── validateBarcode.js
│   │   └── productLookup.js
│   │
│   ├── image-processing/
│   │   ├── index.js
│   │   ├── validateImage.js
│   │   └── assessImageQuality.js
│   │
│   └── ocr/
│       ├── index.js
│       ├── cleanOcrText.js
│       └── extractLabelData.js
│
└── tests/
    ├── barcode tests
    ├── image-processing tests
    └── OCR tests
```

## 4. Public API

The main entry point is:

```javascript
const vision = require("./src");
```

The module exposes three namespaces:

```javascript
vision.barcode
vision.imageProcessing
vision.ocr
```

### 4.1 Barcode Module

#### `validateBarcode(barcode)`

Validates barcode values using their length and GS1 check digit.

Supported formats:

| Format | Length |
|---|---:|
| GTIN-8 | 8 digits |
| UPC-A | 12 digits |
| EAN-13 | 13 digits |
| GTIN-14 | 14 digits |

Example:

```javascript
const result = vision.barcode.validateBarcode(
  "8901234567890"
);
```

Successful result:

```javascript
{
  valid: true,
  barcode: "8901234567890",
  format: "EAN-13",
  error: null
}
```

The function rejects invalid input types, non-digit characters, unsupported lengths, and incorrect check digits.

#### `fetchProductByBarcode(barcode)`

Validates the barcode and retrieves product information from the Open Food Facts API.

Example:

```javascript
const result =
  await vision.barcode.fetchProductByBarcode(
    "8901234567890"
  );
```

The returned object contains:

- `success`
- `found`
- `barcode`
- `error`
- `product`

The product object may contain:

- Product name
- Brand
- Quantity
- Ingredients
- Allergens
- Nutrition information
- Nutri-Score
- NOVA group
- Product image URL

A valid barcode does not guarantee that a product exists in Open Food Facts.

### 4.2 Image Processing Module

#### `validateImage(image)`

Validates image metadata supplied by the frontend.

Expected input:

```javascript
{
  mimeType: "image/jpeg",
  width: 1920,
  height: 1080
}
```

Supported MIME types:

- `image/jpeg`
- `image/png`
- `image/webp`

Successful result:

```javascript
{
  valid: true,
  error: null,
  image: {
    mimeType: "image/jpeg",
    width: 1920,
    height: 1080,
    aspectRatio: 1.778
  }
}
```

This function validates supplied metadata. It does not inspect image files or verify that the underlying image is accessible.

#### `assessImageQuality(image)`

Evaluates image dimensions and optional quality measurements supplied by the caller.

Expected input:

```javascript
{
  width: 1920,
  height: 1080,
  brightness: 120,
  blurScore: 80
}
```

Measurement scales:

- Brightness: 0–255.
- Blur score: 0–100, where lower values indicate more blur.

The function checks:

- Minimum resolution.
- Excessively dark images.
- Overexposed images.
- Low blur scores.

Example result:

```javascript
{
  suitableForOCR: true,
  issues: []
}
```

**Limitation:** The function does not calculate brightness or blur. Those measurements must be supplied by the frontend or another image-analysis component.

### 4.3 OCR Module

The OCR module processes text returned by an external OCR engine. It does not recognize text directly from images.

#### `cleanOcrText(rawText)`

Normalizes recognized text by:

- Removing unnecessary spaces.
- Removing empty lines.
- Normalizing Windows line endings.
- Preserving the original words and their order.

Example:

```javascript
const result = vision.ocr.cleanOcrText(
  "Ingredients: Wheat flour, sugar\r\n\r\nSalt"
);
```

Successful result:

```javascript
{
  success: true,
  text: "Ingredients: Wheat flour, sugar\nSalt",
  lines: [
    "Ingredients: Wheat flour, sugar",
    "Salt"
  ]
}
```

#### `extractLabelData(input)`

Extracts structured information from OCR text.

Currently supported fields:

- Ingredients
- Allergen declarations
- Energy
- Protein
- Carbohydrates
- Sugars
- Fat
- Saturated fat
- Fibre
- Sodium
- Serving size

Example:

```javascript
const result = vision.ocr.extractLabelData(
  `Ingredients: Wheat flour, sugar, salt
Contains: Wheat, Milk
Energy: 250 kcal
Protein: 5 g
Serving Size: 50 g`
);
```

The function returns:

```javascript
{
  success: true,
  ingredients: ["Wheat flour", "sugar", "salt"],
  allergens: ["Wheat", "Milk"],
  nutrition: {
    energy: {
      value: 250,
      unit: "kcal"
    },
    protein: {
      value: 5,
      unit: "g"
    }
  },
  servingSize: "50 g",
  error: null
}
```

The extraction currently uses text patterns and regular expressions. It is not a complete food-label parser and does not independently verify the accuracy of OCR results or nutritional information.

## 5. React Native Integration Responsibilities

The Vision module is intended to provide reusable JavaScript logic. The frontend team is responsible for connecting device-specific capabilities.

| Responsibility | Owner |
|---|---|
| Camera access | Frontend |
| Gallery image selection | Frontend |
| Image URI management | Frontend |
| Image metadata extraction | Frontend/native adapter |
| Native image preprocessing | Frontend/native adapter |
| OCR recognition using ML Kit | Frontend/native adapter |
| Barcode scanning using camera | Frontend/native adapter |
| Barcode validation | Vision |
| Product lookup | Vision |
| OCR text cleaning | Vision |
| Label-data extraction | Vision |

### Example integration workflow

```javascript
// The frontend obtains recognized text
// using its native OCR integration.

const rawText = recognizedText;

// Vision processes the recognized text.
const cleaned = vision.ocr.cleanOcrText(rawText);

if (cleaned.success) {
  const labelData =
    vision.ocr.extractLabelData(cleaned.text);

  console.log(labelData);
}
```

The example assumes the frontend has already obtained `recognizedText` from its OCR engine.

### React Native compatibility considerations

The current implementation uses JavaScript functions, CommonJS exports, and the standard `fetch` API.

There are no intended Node.js-only runtime dependencies in the public processing modules.

However, compatibility must still be verified through actual React Native/Metro bundling and Android/iOS integration testing. In particular, the Open Food Facts request and its custom headers must be tested on the target platforms.

## 6. Dependencies

The current Vision package has no external runtime dependencies.

Development tests use Node.js built-in testing functionality.

Run the tests from the `vision` directory:

```bash
npm test
```

The module currently uses:

```json
{
  "name": "foodscanner-vision",
  "version": "1.0.0",
  "private": true,
  "main": "src/index.js",
  "scripts": {
    "test": "node --test"
  }
}
```

The package is private and is not currently configured as a published npm package.

## 7. Testing

The existing tests cover:

- Barcode formats and check-digit validation.
- Supported image formats and metadata validation.
- Image-quality threshold checks.
- OCR text cleaning.
- Ingredient extraction.
- Allergen extraction.
- Nutritional value extraction.
- Serving-size extraction.
- Multiple-line ingredient handling.
- Realistic food-label text examples.

Passing Node.js tests verifies the tested JavaScript functionality. It does not establish native OCR accuracy or full mobile integration compatibility.

Future testing should include:

- React Native/Metro bundle tests.
- Android device integration.
- iOS device integration, if supported by the application.
- Real-world packaged food images.
- OCR accuracy evaluation using manually transcribed reference text.
- Network failure and API response testing.

## 8. Current Implementation Status

| Component | Status |
|---|---|
| Barcode validation | Implemented |
| Open Food Facts product lookup | Implemented |
| Image metadata validation | Implemented |
| Basic image-quality assessment | Implemented |
| OCR text cleaning | Implemented |
| Label-data extraction | Implemented |
| Native barcode scanning | Frontend integration required |
| Native OCR recognition | Frontend integration required |
| Native image preprocessing | Frontend integration required |
| React Native/Metro integration testing | Pending |
| Android end-to-end testing | Pending |
| iOS end-to-end testing | Pending |

## 9. Current Limitations and Future Work

The current implementation is an initial processing layer.

Potential improvements include:

1. Better extraction from complex nutrition tables.
2. Improved recognition of regional Indian languages through the OCR integration.
3. More robust ingredient-list parsing.
4. Better allergen identification.
5. Improved handling of nutrition units and serving sizes.
6. Confidence-aware extraction.
7. More comprehensive image-quality analysis.
8. TypeScript declarations for frontend integration.
9. React Native integration and platform-specific testing.

OCR output and extracted label data should not be treated as verified product information without appropriate validation.

## 10. Collaboration

The Vision module works alongside the frontend, backend, data engineering, and verification teams.

Changes should be developed on the appropriate feature branch and tested before being submitted for review.

The frontend team should coordinate with Vision before changing public function signatures or expected input/output structures.

---

**Repository:** [FoodScanner-BeyondTheLabel](https://github.com/nidhihippargi/FoodScanner-BeyondTheLabel)
**Maintained by:** Vision Engineering Team
