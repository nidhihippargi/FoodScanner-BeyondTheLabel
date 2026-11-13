const { fetchProductByBarcode } = require("./openFoodFactsService");

describe("Open Food Facts Service Tests", () => {
    beforeEach(() => {
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("1. Fetches and maps a valid product", async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                status: 1,
                product: {
                    product_name: "Test Cereal",
                    brands: "Test Brand",
                    ingredients_text: "Oats, sugar",
                    nutriments: {
                        "energy-kcal_100g": 350,
                        sugars_100g: 12,
                        fat_100g: 5,
                        proteins_100g: 8,
                        carbohydrates_100g: 60
                    },
                    labels_tags: ["en:vegetarian"]
                }
            })
        });

        const result = await fetchProductByBarcode("737628064502");

        expect(result.productName).toBe("Test Cereal");
        expect(result.brand).toBe("Test Brand");
        expect(result.nutritionBasis).toBe("per-100g");
        expect(result.nutrition.sugar.value).toBe(12);
        expect(result.source).toBe("openfoodfacts");
    });

    test("2. Returns null when product is not found", async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                status: 0,
                product: null
            })
        });

        const result = await fetchProductByBarcode("0000000000000");

        expect(result).toBeNull();
    });

    test("3. Rejects an invalid barcode", async () => {
        await expect(
            fetchProductByBarcode("abc123")
        ).rejects.toThrow("A valid product barcode is required.");

        expect(global.fetch).not.toHaveBeenCalled();
    });

    test("4. Handles HTTP errors", async () => {
        global.fetch.mockResolvedValue({
            ok: false,
            status: 503
        });

        await expect(
            fetchProductByBarcode("737628064502")
        ).rejects.toThrow("status 503");
    });

    test("5. Handles network failures", async () => {
        global.fetch.mockRejectedValue(
            new Error("Network unavailable")
        );

        await expect(
            fetchProductByBarcode("737628064502")
        ).rejects.toThrow("Network unavailable");
    });

    test("6. Handles malformed JSON responses", async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => {
                throw new Error("Invalid JSON");
            }
        });

        await expect(
            fetchProductByBarcode("737628064502")
        ).rejects.toThrow("Invalid JSON");
    });

    test("7. Handles missing product fields", async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                status: 1,
                product: {
                    nutriments: {}
                }
            })
        });

        const result = await fetchProductByBarcode("737628064502");

        expect(result.productName).toBe("Unknown Product");
        expect(result.brand).toBe("Unknown");
        expect(result.ingredients).toBe("");
        expect(result.nutrition.sugar.value).toBeUndefined();
    });
});
