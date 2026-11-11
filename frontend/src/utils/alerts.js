// Matches a product against the user's saved preferences and returns banner-ready alerts.
import { getPer100 } from './normalizer';

const MEAT = ['chicken', 'beef', 'pork', 'mutton', 'fish', 'gelatin', 'gelatine', 'lard', 'meat', 'shrimp', 'anchovy'];
const DAIRY = ['milk', 'whey', 'casein', 'butter', 'ghee', 'cheese', 'curd', 'cream', 'lactose', 'paneer'];
const ANIMAL = [...MEAT, ...DAIRY, 'egg', 'honey'];
const GLUTEN = ['wheat', 'barley', 'rye', 'gluten', 'semolina', 'maida', 'atta', 'malt'];
const KEYWORDS = {
  peanuts: ['peanut', 'groundnut'],
  soy: ['soy', 'soya', 'soybean'],
  dairy: DAIRY,
  treeNuts: ['almond', 'cashew', 'walnut', 'hazelnut', 'pistachio', 'pecan', 'macadamia'],
};
const LABELS = { peanuts: 'peanuts', soy: 'soy', dairy: 'dairy', treeNuts: 'tree nuts' };

// "cocoa butter" / "peanut butter" would otherwise trigger the dairy keyword "butter".
const clean = (t) => t.toLowerCase().replace(/cocoa butter|peanut butter|shea butter|coconut milk/g, ' ');
const hits = (text, words) => words.filter((w) => new RegExp(`\\b${w}s?\\b`, 'i').test(text));

export function buildAlerts(product, prefs) {
  const alerts = [];
  const text = clean((product.ingredients || []).join(', '));
  const declared = (product.allergens || []).map((a) => a.toLowerCase());

  Object.entries(prefs.allergens || {}).forEach(([key, on]) => {
    if (!on) return;
    const found = hits(text, KEYWORDS[key]);
    const isDeclared = declared.some((a) => KEYWORDS[key].some((w) => a.includes(w)));
    if (found.length || isDeclared) {
      alerts.push({
        id: `allergen-${key}`, severity: 'red',
        title: `Contains ${LABELS[key]}`,
        detail: found.length ? `Matched ingredient: ${found.join(', ')}.` : 'Declared in the allergen statement.',
      });
    }
  });

  if (prefs.vegan) {
    const found = hits(text, ANIMAL);
    if (found.length) alerts.push({ id: 'vegan', severity: 'amber', title: 'May not be vegan', detail: `Animal-derived ingredient: ${found.join(', ')}.` });
  } else if (prefs.vegetarian) {
    const found = hits(text, MEAT);
    if (found.length) alerts.push({ id: 'veg', severity: 'amber', title: 'May not be vegetarian', detail: `Meat/fish-derived ingredient: ${found.join(', ')}.` });
  }

  if (prefs.glutenFree) {
    const found = hits(text, GLUTEN);
    if (found.length) alerts.push({ id: 'gluten', severity: 'amber', title: 'May contain gluten', detail: `Gluten-containing ingredient: ${found.join(', ')}.` });
  }

  if (prefs.lowSugar) {
    const sugar = (getPer100(product.nutrition) || {}).sugar;
    if (sugar > 5) alerts.push({ id: 'sugar', severity: sugar > 22.5 ? 'red' : 'amber', title: 'Above your low-sugar target', detail: `${sugar.toFixed(1)} g sugars per 100 g.` });
  }
  return alerts;
}
