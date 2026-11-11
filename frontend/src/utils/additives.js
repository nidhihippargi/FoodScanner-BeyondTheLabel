// Small local INS/E-number decoder. Keys are lowercase codes. `risk` is informational only.
// If the backend returns its own `additives` array, that takes priority over this table.
export const ADDITIVES = {
  '102': { name: 'Tartrazine', function: 'Colour', risk: 'moderate', explanation: 'A synthetic yellow dye. Permitted within limits, but some people report sensitivity to it.' },
  '110': { name: 'Sunset Yellow FCF', function: 'Colour', risk: 'moderate', explanation: 'A synthetic orange dye used in snacks and drinks. Permitted within limits.' },
  '129': { name: 'Allura Red AC', function: 'Colour', risk: 'moderate', explanation: 'A synthetic red dye. Permitted within limits; often found in highly processed foods.' },
  '150d': { name: 'Caramel IV (sulphite ammonia)', function: 'Colour', risk: 'moderate', explanation: 'A brown colour that makes a product look richer. It adds colour, not nutrition.' },
  '160a': { name: 'Beta-carotene', function: 'Colour', risk: 'low', explanation: 'A natural orange pigment also found in carrots.' },
  '202': { name: 'Potassium Sorbate', function: 'Preservative', risk: 'low', explanation: 'Slows mould and yeast growth to extend shelf life.' },
  '211': { name: 'Sodium Benzoate', function: 'Preservative', risk: 'moderate', explanation: 'A common preservative in acidic foods and drinks. Permitted within limits.' },
  '319': { name: 'TBHQ', function: 'Antioxidant', risk: 'moderate', explanation: 'Stops oils from going rancid. Only allowed in tiny amounts.' },
  '322': { name: 'Lecithin', function: 'Emulsifier', risk: 'low', explanation: 'Keeps oil and water mixed. Usually from soy or sunflower, so check allergens.' },
  '330': { name: 'Citric Acid', function: 'Acidity regulator', risk: 'low', explanation: 'Gives a sour taste and helps preserve food. Occurs naturally in citrus fruit.' },
  '407': { name: 'Carrageenan', function: 'Thickener', risk: 'moderate', explanation: 'A seaweed-derived thickener that improves texture.' },
  '471': { name: 'Mono- and diglycerides of fatty acids', function: 'Emulsifier', risk: 'low', explanation: 'Improves texture and keeps fats and water blended.' },
  '500': { name: 'Sodium Carbonates', function: 'Raising agent', risk: 'low', explanation: 'Baking soda family. Helps baked goods rise.' },
  '621': { name: 'Monosodium Glutamate (MSG)', function: 'Flavour enhancer', risk: 'moderate', explanation: 'Boosts savoury taste. It adds sodium, and some people prefer to limit it.' },
  '627': { name: 'Disodium Guanylate', function: 'Flavour enhancer', risk: 'moderate', explanation: 'Boosts savoury taste, usually alongside MSG. Signals a heavily flavoured product.' },
  '631': { name: 'Disodium Inosinate', function: 'Flavour enhancer', risk: 'moderate', explanation: 'Boosts savoury taste, usually alongside MSG.' },
  '951': { name: 'Aspartame', function: 'Artificial sweetener', risk: 'moderate', explanation: 'A zero-calorie sweetener. Not suitable for people with phenylketonuria.' },
  '955': { name: 'Sucralose', function: 'Artificial sweetener', risk: 'low', explanation: 'A zero-calorie sweetener much sweeter than sugar.' },
};
