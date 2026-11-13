/**
 * Rule-based allergen recognition. This is a screening aid, not a guarantee
 * that an ingredient is allergen-free or safe for a particular person.
 */
const ALLERGEN_RULES = [
  { name: "Milk", aliases: ["milk", "milk solids", "milk powder", "whey", "casein", "caseinate", "lactose", "butter", "ghee", "cream"] },
  { name: "Egg", aliases: ["egg", "eggs", "egg white", "egg yolk", "albumin"] },
  { name: "Peanut", aliases: ["peanut", "peanuts", "groundnut", "groundnuts"] },
  { name: "Tree nuts", aliases: ["tree nut", "tree nuts", "mixed nuts"] },
  { name: "Almond", aliases: ["almond", "almonds"] },
  { name: "Cashew", aliases: ["cashew", "cashews"] },
  { name: "Walnut", aliases: ["walnut", "walnuts"] },
  { name: "Pistachio", aliases: ["pistachio", "pistachios"] },
  { name: "Hazelnut", aliases: ["hazelnut", "hazelnuts"] },
  { name: "Pecan", aliases: ["pecan", "pecans"] },
  { name: "Macadamia", aliases: ["macadamia"] },
  { name: "Brazil nut", aliases: ["brazil nut", "brazil nuts"] },
  { name: "Pine nut", aliases: ["pine nut", "pine nuts"] },
  { name: "Soy", aliases: ["soy", "soya", "soybean", "soybeans", "soy lecithin", "soya lecithin"] },
  { name: "Wheat", aliases: ["wheat", "wheat flour", "semolina", "durum"] },
  { name: "Gluten-containing cereals", aliases: ["gluten", "barley", "rye", "triticale", "malt extract"] },
  { name: "Oats", aliases: ["oat", "oats", "oat flour"] },
  { name: "Sesame", aliases: ["sesame", "sesame seed", "sesame seeds", "tahini"] },
  { name: "Mustard", aliases: ["mustard", "mustard seed"] },
  { name: "Celery", aliases: ["celery", "celeriac"] },
  { name: "Fish", aliases: ["fish", "anchovy", "anchovies", "cod", "salmon", "tuna"] },
  { name: "Crustaceans", aliases: ["crustacean", "crustaceans", "shrimp", "prawn", "prawns", "crab", "lobster"] },
  { name: "Molluscs", aliases: ["mollusc", "molluscs", "mollusk", "mollusks", "clam", "oyster", "mussel", "squid"] },
  { name: "Sulphites", aliases: ["sulphite", "sulphites", "sulfite", "sulfites", "sulphur dioxide", "sulfur dioxide"] },
  { name: "Lupin", aliases: ["lupin", "lupine"] }
];

function detectAllergens(ingredientText, explicitAllergenText = "") {
  const evidence = new Map();
  addMatches(evidence, ingredientText, "ingredients");
  addMatches(evidence, explicitAllergenText, "allergen_statement");

  return {
    allergens: [...evidence.keys()],
    evidence: [...evidence.entries()].map(([name, item]) => ({
      name,
      sources: [...item.sources],
      matchedTerms: [...item.matchedTerms]
    }))
  };
}

function addMatches(evidence, input, source) {
  const text = typeof input === "string" ? input : "";
  if (!text) return;
  const normalized = text.toLocaleLowerCase();

  for (const rule of ALLERGEN_RULES) {
    const matchedTerms = rule.aliases.filter(alias => containsTerm(normalized, alias));
    if (!matchedTerms.length) continue;
    const current = evidence.get(rule.name) || { sources: new Set(), matchedTerms: new Set() };
    current.sources.add(source);
    matchedTerms.forEach(term => current.matchedTerms.add(term));
    evidence.set(rule.name, current);
  }
}

function containsTerm(text, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(^|[^a-z])${escaped}(?=$|[^a-z])`, "i").test(text);
}

function normalizeExplicitAllergenName(value) {
  const text = value.trim();
  if (!text) return null;
  const lower = text.toLocaleLowerCase();
  for (const rule of ALLERGEN_RULES) {
    if (rule.aliases.some(alias => lower === alias || containsTerm(lower, alias))) return rule.name;
  }
  return text;
}

module.exports = { ALLERGEN_RULES, detectAllergens, normalizeExplicitAllergenName };
