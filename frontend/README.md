# Food Scanner: Beyond the Label (React Native / Expo)

## Run it
```bash
npm install
npx expo install --fix        # aligns native package versions with your Expo SDK
npx expo run:android          # or: npx expo run:ios   (dev build, needed for ML Kit OCR)
```
Expo Go works for everything **except** on-device ML Kit OCR. There, OCR mode falls back to sample text
so you can still test the review -> analysis flow.

## Demo without a real barcode
`src/services/api.js` has `USE_MOCK = true`. The scanner shows DEMO chips:
- Deceptive cereal (red): maltodextrin + invert syrup in the top 3
- Clean snack (green)
- Unknown barcode: triggers "Snap ingredient label instead"
In OCR mode the sample text has deliberate glare errors ("lnvert", "Col0ur") to fix in the review screen.

## Connecting the backend
Set `EXPO_PUBLIC_API_URL`, flip `USE_MOCK` to false. Expected endpoints:
`POST /api/scan/barcode {barcode}`, `POST /api/scan/ocr` (image), `POST /api/analyze {text}`.
Product shape is documented at the top of `src/utils/mockData.js`.

## Notes
- Traffic-light thresholds in `utils/normalizer.js` are placeholders (FSA-style); swap in FSSAI/WHO values.
- Live (per-frame) OCR needs `react-native-vision-camera` frame processors; this build uses a shutter button.
