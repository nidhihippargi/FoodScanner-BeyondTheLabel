# Vision Engineering Module
## Food Scanner: Beyond the Label

**Module:** Vision Engineering  
**Project:** Food Scanner: Beyond the Label  
**Status:** Initial Development  
**Primary Technologies:** React Native, TypeScript, Google ML Kit  
**Development Environment:** Visual Studio Code  
**Target Platform:** Android (initial development)

---

## 1. Overview

The Vision Engineering module is responsible for extracting meaningful information from food product packaging using computer vision and image-processing technologies.

Food product packaging contains important information such as:

- Product name
- Ingredients list
- Nutritional information
- Allergen declarations
- Manufacturing and expiry dates
- Food additives and preservatives
- Vegetarian and non-vegetarian indicators
- Barcode information

This information is often presented in small fonts, different layouts, multiple languages, and sometimes in poorly lit or curved packaging.

The purpose of this module is to capture product-label images, extract text using Optical Character Recognition (OCR), and provide structured information to other modules of the Food Scanner application.

The Vision Engineering module will work alongside the frontend, backend, data engineering, and verification teams.

## 2. Objectives

The primary objectives are:

1. Implement OCR-based text extraction from food product labels.
2. Support image input from the device gallery and camera.
3. Extract text from ingredients lists and nutrition tables.
4. Preserve the original OCR output for further processing.
5. Support barcode recognition for product identification.
6. Handle image-quality issues that affect text recognition.
7. Provide structured OCR results to the backend and data engineering modules.
8. Evaluate OCR accuracy using real-world packaged food images.
9. Design the module so additional image-processing capabilities can be integrated later.

## 3. Scope of the Module

### 3.1 Image Input

The module will accept images captured using a mobile camera or selected from the device gallery.

Supported image formats will depend on the image-picker and OCR libraries used.

### 3.2 Optical Character Recognition (OCR)

OCR converts text present in an image into machine-readable text.

The OCR module will aim to extract:

- Product and brand names
- Ingredients
- Nutritional values
- Allergen warnings
- Food-related declarations
- Other relevant packaging information

Google ML Kit Text Recognition is the proposed OCR technology.

### 3.3 Barcode Recognition

Barcode recognition will be used to identify food products through their packaging barcodes.

The extracted barcode value can be passed to the backend or product database for product identification.

Barcode recognition will be implemented separately from OCR so that each feature can be developed and tested independently.

### 3.4 Image Processing

Image preprocessing may be introduced to improve recognition quality.

Planned techniques include:

- Image resizing
- Image rotation and orientation correction
- Cropping relevant label regions
- Brightness and contrast adjustment
- Noise reduction
- Perspective correction, if required

These techniques will be introduced based on actual OCR testing results.

## 4. Technology Stack

| Technology | Purpose |
|---|---|
| React Native | Mobile application framework |
| TypeScript | Application and module development |
| Google ML Kit Text Recognition | OCR and text extraction |
| Android Studio | Android SDK and native build tools |
| VS Code | Primary code editor |
| Git and GitHub | Version control and collaboration |
| Expo | Proposed React Native development workflow |

**Note:** The final package versions and Expo compatibility must be confirmed before implementation. Native ML Kit integration may require an Expo development build rather than Expo Go.

## 5. Module Architecture

The planned workflow is:

```text
        Food Product Packaging
                  |
                  v
          Image Acquisition
                  |
          +-------+-------+
          |               |
          v               v
       Camera          Gallery
          |               |
          +-------+-------+
                  |
                  v
           Image Validation
                  |
                  v
          Image Preprocessing
                  |
          +-------+-------+
          |               |
          v               v
       OCR Engine     Barcode Scanner
          |               |
          v               v
     Extracted Text   Barcode Value
          |               |
          +-------+-------+
                  |
                  v
          Result Formatting
                  |
                  v
       Structured Data Output
                  |
          +-------+-------+
          |               |
          v               v
      Backend       Data Engineering
```

OCR and barcode recognition are independent processing paths. They may run separately or together depending on the application workflow.

## 6. Project Directory Structure

The proposed Vision Engineering directory structure is:

```text
vision/
│
├── README.md
│
├── src/
│   │
│   ├── ocr/
│   │   ├── textRecognition.ts
│   │   └── ocrTypes.ts
│   │
│   ├── barcode/
│   │   └── barcodeScanner.ts
│   │
│   ├── image/
│   │   └── imageProcessing.ts
│   │
│   └── index.ts
│
└── tests/
    ├── ocrTests.ts
    ├── barcodeTests.ts
    └── testImages/
```

### File Responsibilities

| File | Responsibility |
|---|---|
| `textRecognition.ts` | OCR processing and text extraction |
| `ocrTypes.ts` | TypeScript types for OCR results |
| `barcodeScanner.ts` | Barcode detection and value extraction |
| `imageProcessing.ts` | Image preprocessing operations |
| `index.ts` | Exports module functions |
| `ocrTests.ts` | OCR testing |
| `barcodeTests.ts` | Barcode testing |
| `testImages/` | Sample images for testing |

This is the proposed structure. Files will be added as implementation progresses.

## 7. OCR Implementation

### 7.1 OCR Workflow

The OCR process will follow these steps:

1. Receive an image URI.
2. Validate that the image exists and is accessible.
3. Pass the image to the OCR engine.
4. Detect text and text blocks.
5. Extract the recognized text.
6. Format the OCR output.
7. Return the result to the calling application.

### 7.2 Proposed OCR Result Format

The OCR module will return a consistent result structure.

Example:

```json
{
  "success": true,
  "rawText": "Ingredients: Wheat flour, sugar, salt...",
  "blocks": [
    "Ingredients:",
    "Wheat flour, sugar, salt..."
  ],
  "error": null
}
```

The `rawText` field will preserve the recognized text, while `blocks` will contain individual recognized text sections.

The output is raw OCR data, not verified nutritional or ingredient information. Further interpretation and validation will be handled by the appropriate project modules.

### 7.3 TypeScript Interface

```typescript
export type OCRResult = {
  rawText: string;
  blocks: string[];
  success: boolean;
  error?: string;
};
```

### 7.4 OCR Function

The planned OCR function will use the following interface:

```typescript
export async function recognizeText(
  imageUri: string
): Promise<OCRResult>;
```

This interface will allow the frontend to call the OCR module without depending on its internal implementation.

## 8. Barcode Recognition

Barcode recognition will be implemented as a separate feature.

The scanner will:

1. Access the camera.
2. Detect a barcode in the camera frame.
3. Extract the barcode value.
4. Identify the barcode format where available.
5. Return the result to the frontend or backend.

### Proposed Barcode Result

```json
{
  "success": true,
  "barcode": "8901234567890",
  "format": "EAN-13"
}
```

The example barcode is illustrative only.

Barcode detection does not guarantee that a product exists in the database. Product lookup and verification will be handled by the backend.

## 9. Image Processing

Image quality has a direct impact on OCR performance.

The module may introduce preprocessing when initial testing identifies recognition problems.

| Technique | Purpose |
|---|---|
| Resizing | Improve processing efficiency |
| Rotation correction | Correct incorrectly oriented images |
| Cropping | Focus on relevant label regions |
| Contrast adjustment | Improve visibility of printed text |
| Noise reduction | Reduce visual interference |
| Perspective correction | Improve recognition of angled labels |

Preprocessing should not be applied unnecessarily. Original images should remain available so results can be compared and recognition problems investigated.

## 10. Integration with Other Modules

### Frontend Team

The frontend will provide the selected image or image URI to the Vision Engineering module.

The vision module will return OCR or barcode results through documented functions.

### Backend Team

The backend may receive:

- Extracted OCR text
- Barcode values
- Recognition status
- Relevant metadata

The backend will handle product lookup and other server-side functionality.

### Data Engineering Team

The extracted text will be used for further processing, including:

- Ingredient extraction
- Nutritional information identification
- Food additive identification
- Data normalization
- Structured product information

### Verification Team

The verification team will help evaluate:

- OCR accuracy
- Barcode detection reliability
- Image-quality sensitivity
- Error handling
- Performance on different packaged food products

## 11. Testing Strategy

Testing will use real packaged food products rather than only synthetic examples.

### Initial Test Dataset

The initial dataset should contain:

1. Images of nutrition facts tables.
2. Images of ingredients lists.
3. Images with small printed text.
4. Images containing multiple languages.
5. Images with tilted labels.
6. Images with poor lighting.
7. Images with curved packaging.
8. Images containing barcodes.

### Testing Metrics

| Metric | What it measures |
|---|---|
| Character Error Rate (CER) | Character-level OCR errors |
| Word Error Rate (WER) | Word-level OCR errors |
| Field extraction accuracy | Correct extraction of important fields |
| Barcode detection rate | Successful barcode recognition |
| Processing time | Time required to process an image |

CER and WER will be calculated against manually transcribed reference text.

A successful OCR response does not necessarily mean the extracted text is accurate. Recognition quality must be evaluated against ground truth.

## 12. Error Handling

The module should handle common failure conditions.

| Error | Expected handling |
|---|---|
| No image provided | Return a validation error |
| Invalid image URI | Return an image-access error |
| Unsupported image format | Report an unsupported-format error |
| No text detected | Return an empty OCR result |
| OCR processing failure | Return an error without crashing |
| Barcode not detected | Report that no barcode was found |
| Poor image quality | Allow the user to capture or select another image |

Error messages should be understandable to both developers and users.

## 13. Development Roadmap

### Phase 1 — Initial Setup

- [ ] Configure the development environment.
- [ ] Confirm the React Native and Expo setup with the frontend team.
- [ ] Create the Vision Engineering directory structure.
- [ ] Define the OCR result interface.
- [ ] Create the initial OCR function.

### Phase 2 — OCR Integration

- [ ] Confirm Google ML Kit package compatibility.
- [ ] Configure the required native Android dependencies.
- [ ] Connect the OCR engine.
- [ ] Test OCR using static food-label images.
- [ ] Evaluate text extraction quality.

### Phase 3 — Camera and Gallery Integration

- [ ] Integrate image selection from the gallery.
- [ ] Integrate camera image capture.
- [ ] Validate image URIs.
- [ ] Pass images to the OCR module.

### Phase 4 — Barcode Recognition

- [ ] Select a compatible barcode-scanning library.
- [ ] Implement barcode detection.
- [ ] Extract barcode values.
- [ ] Test supported barcode formats.
- [ ] Integrate with the backend.

### Phase 5 — Image Processing

- [ ] Evaluate common OCR failures.
- [ ] Add preprocessing where necessary.
- [ ] Compare OCR performance before and after preprocessing.

### Phase 6 — Integration and Testing

- [ ] Integrate with the frontend.
- [ ] Coordinate output format with the backend.
- [ ] Provide OCR results to data engineering.
- [ ] Run end-to-end tests.
- [ ] Document limitations and test results.

## 14. Installation and Setup

### Prerequisites

Install the following tools:

- Node.js LTS
- Git
- Visual Studio Code
- Android Studio
- Android SDK

### Repository Setup

Clone the project:

```bash
git clone https://github.com/nidhihippargi/FoodScanner-BeyondTheLabel.git
```

Enter the project directory:

```bash
cd FoodScanner-BeyondTheLabel
```

Create a feature branch:

```bash
git checkout -b feature/vision-ocr
```

The mobile application dependencies will be installed from the frontend application's directory once the frontend setup is finalized.

**Important:** The Vision module is not yet a standalone installable package. Its dependency and build configuration will be documented after the OCR integration is implemented.

## 15. Git and Collaboration Guidelines

Use feature branches for development rather than directly modifying the `main` branch.

Suggested branch names:

```text
feature/vision-ocr
feature/vision-barcode
feature/vision-image-processing
```

Suggested commit messages:

```text
docs: add vision engineering documentation
feat: implement OCR text recognition
feat: add barcode detection
feat: add image preprocessing
test: add OCR test cases
fix: handle invalid image input
```

Before submitting changes:

1. Test your implementation.
2. Check that existing team code is not broken.
3. Update the README if the setup or module interface changes.
4. Commit changes to your feature branch.
5. Open a pull request for team review.

## 16. Security and Privacy Considerations

- Prefer on-device OCR when practical.
- Avoid uploading product images unless required by the application.
- Do not store personal information in OCR logs.
- Keep original image data separate from extracted text.
- Validate all image inputs.
- Do not treat OCR output as verified product information.

## 17. Current Implementation Status

The Vision Engineering module is currently in its initial planning and setup stage.

| Component | Status |
|---|---|
| Module documentation | In progress |
| Directory structure | Planned |
| OCR result interface | Planned |
| OCR engine integration | Not started |
| Camera integration | Not started |
| Gallery integration | Not started |
| Barcode recognition | Not started |
| Image preprocessing | Not started |
| OCR testing | Not started |
| Backend integration | Not started |

Statuses should be updated as features are implemented and tested.

## 18. Future Improvements

Potential future improvements include:

- Better recognition of regional Indian languages.
- Improved extraction from complex nutrition tables.
- Automatic identification of ingredients and allergens.
- Detection of label sections and table boundaries.
- Recognition of expiry and manufacturing dates.
- Improved recognition under challenging lighting conditions.
- Confidence-based handling of uncertain OCR results.

These improvements will be prioritized based on project requirements and testing results.

---

## 19. Conclusion

The Vision Engineering module forms an important part of Food Scanner: Beyond the Label. Its primary responsibility is to convert visual information from food packaging into machine-readable data.

By combining OCR, barcode recognition, and image processing, the module will help the application understand food labels and provide reliable input for nutritional analysis and food-label verification.

The initial development priority is to establish a working OCR pipeline, evaluate its accuracy using real packaged food images, and provide a consistent output interface for integration with the other project modules.

**Maintained by:** Vision Engineering Team  
**Repository:** [FoodScanner-BeyondTheLabel](https://github.com/nidhihippargi/FoodScanner-BeyondTheLabel)
