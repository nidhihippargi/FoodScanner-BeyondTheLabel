
/**
 * FoodScanner - Beyond The Label
 * Open Food Facts product lookup.
 */

const { validateBarcode } = require("./validateBarcode");

const API_BASE_URL = "https://world.openfoodfacts.org/api/v3/product";

const USER_AGENT =
  "FoodScanner-BeyondTheLabel/1.0 (https://github.com/nidhihippargi/FoodScanner-BeyondTheLabel)";

async function fetchProductByBarcode(barcode) {
  // Validate barcode before making an API request.
  const validation = validateBarcode(barcode);

  if (!validation.valid) {
    return {
      success: false,
      found: false,
      barcode: validation.barcode,
      error: validation.error,
      product: null
    };
  }

  try {
    const fields = [
      "code",
      "product_name",
      "brands",
      "quantity",
      "ingredients_text",
      "allergens",
      "nutriments",
      "nutriscore_grade",
      "nova_group",
      "image_url"
    ].join(",");

    const url =
      `${API_BASE_URL}/${encodeURIComponent(barcode)}` +
      `?fields=${fields}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json"
      }
    });

    if (response.status === 404) {
      return {
        success: true,
        found: false,
        barcode,
        error: "Product not found in Open Food Facts.",
        product: null
      };
    }

    if (!response.ok) {
      throw new Error(`Open Food Facts HTTP error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.product || data.status === "failure") {
      return {
        success: true,
        found: false,
        barcode,
        error: "Product not found in Open Food Facts.",
        product: null
      };
    }

    const item = data.product;

    return {
      success: true,
      found: true,
      barcode,
      error: null,
      product: {
        name: item.product_name || null,
        brand: item.brands || null,
        quantity: item.quantity || null,
        ingredients: item.ingredients_text || null,
        allergens: item.allergens || null,
        nutrition: item.nutriments || null,
        nutriscore: item.nutriscore_grade || null,
        novaGroup: item.nova_group ?? null,
        imageUrl: item.image_url || null
      }
    };

  } catch (error) {
    return {
      success: false,
      found: false,
      barcode,
      error: error.message || "Unable to retrieve product information.",
      product: null
    };
  }
}

module.exports = { fetchProductByBarcode };
