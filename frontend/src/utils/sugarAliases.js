// 36 common names for added sugars. Matching prefers the longest alias, so
// "glucose syrup" is reported once rather than as both "glucose" and "glucose syrup".
export const SUGAR_ALIASES = [
  'sugar', 'sucrose', 'glucose', 'fructose', 'dextrose', 'maltose', 'lactose', 'galactose',
  'maltodextrin', 'invert sugar', 'invert syrup', 'high fructose corn syrup', 'high-fructose corn syrup',
  'glucose syrup', 'glucose-fructose syrup', 'corn syrup', 'rice syrup', 'brown rice syrup',
  'malt syrup', 'barley malt', 'malt extract', 'cane sugar', 'cane juice', 'evaporated cane juice',
  'fruit juice concentrate', 'agave nectar', 'agave syrup', 'honey', 'molasses', 'jaggery',
  'golden syrup', 'date syrup', 'maple syrup', 'caramel syrup', 'icing sugar', 'powdered sugar',
];

// Plain table sugar is not "hidden": the counter only counts the disguised names.
export const PLAIN_SUGARS = ['sugar', 'sucrose'];
