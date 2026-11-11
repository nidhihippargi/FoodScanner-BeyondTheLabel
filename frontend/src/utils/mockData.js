// Mock backend responses so the UI can be built and demoed without the API.
// Product shape (what /api/scan/barcode and /api/analyze should return):
// { id, barcode, name, brand, image, claims[{claim,verdict,evidence}], ingredients[], additives[]?,
//   allergens[], tags[], nutrition{ servingLabel, servingGrams, perServing?, per100? } }
// Hidden sugars, ingredient tags, health score and alerts are derived client-side (utils/analysis.js).
// Sodium is in mg; calories in kcal; everything else in g.

// 1. Deceptive breakfast cereal
export const DECEPTIVE_CEREAL = {
  id: 'mock-cereal',
  barcode: '8901234500011',
  name: 'CrunchGold Multigrain Flakes',
  brand: 'Sunrise Foods',
  image: null,
  claims: [
    {
      claim: 'High Fiber & Whole Grain',
      verdict: 'misleading',
      evidence: 'Flagged: refined wheat flour, maltodextrin and invert syrup are the top 3 ingredients by weight. Whole grain oats come 4th at 8%.',
    },
    {
      claim: 'No Added Sugar',
      verdict: 'misleading',
      evidence: 'Flagged: sugar, invert syrup and malt extract are all added sugars in the ingredient list.',
    },
    {
      claim: 'Fortified with vitamins',
      verdict: 'verified',
      evidence: 'Vitamins are listed in the ingredients (last position, small amounts).',
    },
  ],
  ingredients: [
    'Refined wheat flour (maida)', 'Maltodextrin', 'Invert syrup', 'Whole grain oats (8%)', 'Sugar',
    'Wheat bran', 'Malt extract', 'Iodised salt', 'Emulsifier (INS 471)', 'Flavour enhancer (INS 627)',
    'Colour (INS 150d)', 'Vitamins (B3, B6, B12, D)',
  ],
  allergens: ['wheat', 'gluten'],
  tags: [],
  nutrition: {
    servingLabel: '30 g (1 cup)',
    servingGrams: 30,
    perServing: { calories: 118, sugar: 8.4, sodium: 150, satFat: 0.9 },
  },
};

// 2. Clean health snack
export const CLEAN_SNACK = {
  id: 'mock-snack',
  barcode: '8909876500022',
  name: 'Roasted Makhana, Pink Salt',
  brand: 'Pure Pantry',
  image: null,
  claims: [
    { claim: 'Low sugar', verdict: 'verified', evidence: 'No sugar aliases in the ingredient list; about 0.4 g sugars per 100 g.' },
    { claim: 'No preservatives', verdict: 'verified', evidence: 'No INS/E-number preservatives found.' },
  ],
  ingredients: ['Fox nut (makhana) 92%', 'Sunflower oil', 'Rock salt', 'Black pepper'],
  allergens: [],
  tags: ['vegan', 'gluten-free'],
  nutrition: {
    servingLabel: '25 g (1 small bowl)',
    servingGrams: 25,
    perServing: { calories: 92, sugar: 0.1, sodium: 95, satFat: 0.6 },
  },
};

// 3. Failed barcode lookup: triggers the "Snap ingredient label instead" fallback.
export const BARCODE_NOT_FOUND = (barcode) => ({
  found: false,
  barcode,
  reason: 'NOT_IN_DATABASE',
  fallback: 'OCR_LABEL_SCAN',
  message: "We couldn't find this barcode in our database.",
});

// Barcode -> product. Any other code behaves as "not found".
export const BARCODE_DB = {
  [DECEPTIVE_CEREAL.barcode]: DECEPTIVE_CEREAL,
  [CLEAN_SNACK.barcode]: CLEAN_SNACK,
};

// Fake OCR output with typical glare errors (l for I, 0 for O) for the review screen demo.
export const SAMPLE_OCR_TEXT =
  'INGREDIENTS: Refined wheat flour (maida), Maltodextrin, lnvert syrup, Whole grain oats (8%), Sugar, ' +
  'Wheat bran, Malt extract, lodised salt, Emulsifier (INS 471), Flavour enhancer (INS 627), Col0ur (INS 150d).';
