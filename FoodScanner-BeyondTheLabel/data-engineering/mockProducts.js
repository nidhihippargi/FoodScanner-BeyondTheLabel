'use strict';
/** Offline fallback. Values are ILLUSTRATIVE demo numbers (approximate), not official label data. */
const { buildProduct } = require('./ocrParser');

const d = (o) => buildProduct({ source: 'mock', isDemo: true, ...o });

const MOCK_PRODUCTS = {
  '8901058851298': d({
    barcode: '8901058851298', name: 'Maggi 2-Minute Masala Noodles', brand: 'Nestle',
    ingredientsText: 'Refined wheat flour (maida), Palm oil, Iodised salt, Wheat gluten, Thickener (508, 412), Acidity regulators (501(i)), Humectant (451(i)), Spices and condiments, Flavour enhancers (INS 627, INS 631), Sugar',
    nutrition: { energyKcal: 427, sugar: 2.4, sodium: 1150, fat: 16.8, saturatedFat: 8, carbs: 59, protein: 9.5, fiber: 2.5 },
    additives: ['INS 508', 'INS 412', 'INS 501', 'INS 451', 'INS 627', 'INS 631'],
    allergens: ['wheat', 'gluten'], claims: ['no added msg'], nova: 4,
  }),
  '8901491101837': d({
    barcode: '8901491101837', name: "Lay's Classic Salted Chips", brand: "Lay's",
    ingredientsText: 'Potato, Edible vegetable oil (palmolein), Salt, Maltodextrin, Sugar, Flavour enhancers (INS 627, INS 631)',
    nutrition: { energyKcal: 540, sugar: 1.8, sodium: 680, fat: 33, saturatedFat: 14, carbs: 53, protein: 6.5, fiber: 3 },
    additives: ['INS 627', 'INS 631'], claims: ['no added msg', 'no preservatives'], nova: 4,
  }),
  '5449000000996': d({
    barcode: '5449000000996', name: 'Coca-Cola', brand: 'Coca-Cola', per: '100ml',
    ingredientsText: 'Carbonated water, Sugar, Colour (INS 150d), Acidity regulator (INS 338), Natural flavours, Caffeine',
    nutrition: { energyKcal: 42, sugar: 10.6, sodium: 10, fat: 0, saturatedFat: 0, carbs: 10.6, protein: 0 },
    additives: ['INS 150d', 'INS 338'], claims: [], nova: 4,
  }),
  '8901000000019': d({
    barcode: '8901000000019', name: 'Bournvita Health Drink Mix', brand: 'Cadbury',
    ingredientsText: 'Sugar, Cereal extract (wheat, malt), Milk solids, Cocoa solids, Caramel (INS 150c), Minerals, Vitamins, Emulsifier (INS 322), Iodised salt',
    nutrition: { energyKcal: 380, sugar: 37.4, sodium: 150, fat: 1.6, saturatedFat: 0.9, carbs: 86, protein: 7.5, fiber: 2 },
    additives: ['INS 150c', 'INS 322'], allergens: ['milk', 'wheat', 'gluten'], claims: ['healthy', 'nutritious'],
  }),
};

module.exports = { MOCK_PRODUCTS };
