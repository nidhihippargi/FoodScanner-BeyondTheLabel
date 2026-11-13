const BASE_URL = "https://world.openfoodfacts.org/api/v2/product";

async function fetchProductByBarcode(barcode) {
    if (!barcode || !/^\d{8,14}$/.test(barcode)) {
        throw new Error("A valid product barcode is required.");
    }

    const response = await fetch(
        `${BASE_URL}/${encodeURIComponent(barcode)}.json`,
        {
            headers: {
                "User-Agent": "FoodScanner/1.0 (Student Project)"
            },
            signal: AbortSignal.timeout(10000)
        }
    );

    if (!response.ok) {
        throw new Error(
            `Open Food Facts request failed with status ${response.status}.`
        );
    }

    const data = await response.json();

    if (data.status !== 1 || !data.product) {
        return null;
    }

    const product = data.product;

    return {
        barcode,
        productName: product.product_name || "Unknown Product",
        brand: product.brands || "Unknown",
        nutritionBasis: "per-100g",
        ingredients: product.ingredients_text || "",
        nutrition: {
            energy: {
                value: product.nutriments?.["energy-kcal_100g"],
                unit: "kcal"
            },
            sugar: {
                value: product.nutriments?.sugars_100g,
                unit: "g"
            },
            fat: {
                value: product.nutriments?.fat_100g,
                unit: "g"
            },
            protein: {
                value: product.nutriments?.proteins_100g,
                unit: "g"
            },
            carbohydrates: {
                value: product.nutriments?.carbohydrates_100g,
                unit: "g"
            }
        },
        servingSize: {
            value: 100,
            unit: "g"
        },
        claims: product.labels_tags || [],
        source: "openfoodfacts"
    };
}

module.exports = { fetchProductByBarcode };