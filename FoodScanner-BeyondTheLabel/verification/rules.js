'use strict';
/**
 * Static knowledge for the rule engine.
 * NOTE: cut-offs are traffic-light style thresholds adapted from FSA/UK front-of-pack criteria and
 * aligned with WHO guidance (free sugars <10% energy, sodium <2000 mg/day). They are CONFIGURABLE
 * and must be checked against the current FSSAI notification before any regulatory claim is made.
 */
const HIDDEN_SUGAR_ALIASES = [
  'sugar', 'sucrose', 'glucose', 'fructose', 'dextrose', 'maltose', 'maltodextrin', 'dextrin',
  'corn syrup', 'high fructose corn syrup', 'glucose syrup', 'liquid glucose', 'invert sugar', 'invert syrup',
  'jaggery', 'honey', 'molasses', 'cane juice', 'fruit juice concentrate', 'malt extract', 'barley malt',
  'agave', 'date syrup', 'rice syrup', 'brown sugar', 'icing sugar', 'caramel syrup',
];

const THRESHOLDS = {
  solid: { sugar: { low: 5, high: 22.5 }, fat: { low: 3, high: 17.5 }, saturatedFat: { low: 1.5, high: 5 }, sodium: { low: 120, high: 600 } },
  beverage: { sugar: { low: 2.5, high: 11.25 }, fat: { low: 1.5, high: 8.75 }, saturatedFat: { low: 0.75, high: 2.5 }, sodium: { low: 60, high: 300 } },
};

const DAILY_LIMITS = { sodium: 2000, sugar: 50, saturatedFat: 22, fat: 70 }; // mg, g, g, g (2000 kcal reference)

// risk: low | moderate | caution
const A = (name, category, risk, note) => ({ name, category, risk, note });
const ADDITIVES = {
  '102': A('Tartrazine', 'colour', 'caution', 'Synthetic azo dye; may trigger reactions in sensitive people. EU requires a children\'s-activity warning on some azo dyes.'),
  '110': A('Sunset Yellow FCF', 'colour', 'caution', 'Azo dye; EU warning label on activity/attention in children.'),
  '122': A('Carmoisine', 'colour', 'caution', 'Azo dye; EU warning label on activity/attention in children.'),
  '124': A('Ponceau 4R', 'colour', 'caution', 'Azo dye; EU warning label on activity/attention in children.'),
  '129': A('Allura Red AC', 'colour', 'caution', 'Azo dye; EU warning label on activity/attention in children.'),
  '150c': A('Caramel III', 'colour', 'moderate', 'Processed caramel colour; indicates a cosmetic, ultra-processed formulation.'),
  '150d': A('Caramel IV (sulphite ammonia)', 'colour', 'moderate', 'Processed caramel colour; process contaminant 4-MEI is monitored by regulators.'),
  '202': A('Potassium sorbate', 'preservative', 'low', 'Common preservative, generally regarded as safe within limits.'),
  '211': A('Sodium benzoate', 'preservative', 'caution', 'Preservative; can form benzene with vitamin C under heat/light. Permitted within limits.'),
  '250': A('Sodium nitrite', 'preservative', 'caution', 'Used in cured meats; high intake of processed meat is linked to health risks.'),
  '319': A('TBHQ', 'antioxidant', 'caution', 'Synthetic antioxidant for fats/oils; permitted only in small amounts.'),
  '320': A('BHA', 'antioxidant', 'caution', 'Synthetic antioxidant; classed as possibly carcinogenic (IARC 2B) at high exposure.'),
  '321': A('BHT', 'antioxidant', 'moderate', 'Synthetic antioxidant for fats and oils.'),
  '322': A('Lecithin', 'emulsifier', 'low', 'Common emulsifier; often soy- or sunflower-derived (allergen relevance).'),
  '330': A('Citric acid', 'acidity regulator', 'low', 'Common, low concern.'),
  '338': A('Phosphoric acid', 'acidity regulator', 'moderate', 'High phosphate intake is a consideration for people with kidney disease.'),
  '407': A('Carrageenan', 'thickener', 'low', 'Seaweed-derived thickener.'),
  '412': A('Guar gum', 'thickener', 'low', 'Plant fibre thickener.'),
  '415': A('Xanthan gum', 'thickener', 'low', 'Fermentation-derived thickener.'),
  '451': A('Triphosphates', 'humectant', 'moderate', 'Phosphate additive; relevant for kidney disease.'),
  '471': A('Mono- and diglycerides', 'emulsifier', 'moderate', 'Emulsifier typical of ultra-processed foods.'),
  '501': A('Potassium carbonates', 'acidity regulator', 'low', 'Common, low concern.'),
  '508': A('Potassium chloride', 'thickener', 'low', 'Salt substitute; people on potassium restriction should check.'),
  '621': A('Monosodium glutamate (MSG)', 'flavour enhancer', 'moderate', 'Flavour enhancer that also adds sodium; some people report sensitivity.'),
  '627': A('Disodium guanylate', 'flavour enhancer', 'caution', 'Flavour enhancer, purine-based; people with gout should be cautious. Works together with glutamate.'),
  '631': A('Disodium inosinate', 'flavour enhancer', 'caution', 'Flavour enhancer, purine-based; people with gout should be cautious. Works together with glutamate.'),
  '950': A('Acesulfame potassium', 'sweetener', 'moderate', 'Artificial sweetener.'),
  '951': A('Aspartame', 'sweetener', 'caution', 'Artificial sweetener; must be avoided by people with phenylketonuria (PKU).'),
  '954': A('Saccharin', 'sweetener', 'moderate', 'Artificial sweetener.'),
  '955': A('Sucralose', 'sweetener', 'moderate', 'Artificial sweetener.'),
};
const ULTRA_PROCESSED_CATEGORIES = ['colour', 'flavour enhancer', 'sweetener', 'emulsifier'];

const ALLERGEN_KEYWORDS = {
  milk: ['milk', 'casein', 'whey', 'butter', 'ghee', 'cream', 'lactose', 'paneer', 'cheese', 'curd', 'yogurt', 'yoghurt', 'milk solids'],
  peanut: ['peanut', 'groundnut'],
  'tree nuts': ['almond', 'cashew', 'walnut', 'pistachio', 'hazelnut', 'pecan'],
  gluten: ['wheat', 'gluten', 'barley', 'rye', 'maida', 'semolina', 'suji', 'atta', 'malt'],
  soy: ['soy', 'soya', 'soybean'],
  egg: ['egg', 'albumen', 'albumin'],
  fish: ['fish', 'anchovy'],
  shellfish: ['shrimp', 'prawn', 'crab', 'lobster'],
  sesame: ['sesame', 'til oil'],
  mustard: ['mustard'],
};
const DIET_KEYWORDS = {
  vegetarian: ['gelatin', 'gelatine', 'meat', 'chicken', 'beef', 'pork', 'lard', 'fish', 'shrimp', 'prawn', 'rennet', 'tallow'],
  vegan: ['gelatin', 'gelatine', 'meat', 'chicken', 'beef', 'pork', 'lard', 'fish', 'shrimp', 'prawn', 'rennet', 'tallow', 'milk', 'casein', 'whey', 'butter', 'ghee', 'cream', 'cheese', 'curd', 'paneer', 'egg', 'honey', 'lactose', 'milk solids', 'cochineal', 'carmine'],
};

module.exports = { HIDDEN_SUGAR_ALIASES, THRESHOLDS, DAILY_LIMITS, ADDITIVES, ULTRA_PROCESSED_CATEGORIES, ALLERGEN_KEYWORDS, DIET_KEYWORDS };
