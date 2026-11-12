const Product = require("./Product");

describe("Product Model Tests", () => {

    test("1. Accepts a valid product", () => {
        const product = new Product({
            barcode: "8901234567890",
            productName: "Test Juice",
            brand: "Test Brand",
            ingredients: "Water, sugar",
            servingSize: { value: 100, unit: "g" }
        });

        expect(product.validateSync()).toBeUndefined();
    });

    test("2. Rejects a missing barcode", () => {
        const product = new Product({
            productName: "Test Juice"
        });

        expect(product.validateSync().errors.barcode).toBeDefined();
    });

    test("3. Rejects a missing product name", () => {
        const product = new Product({
            barcode: "8901234567890"
        });

        expect(product.validateSync().errors.productName).toBeDefined();
    });

    test("4. Rejects an invalid serving-size unit", () => {
        const product = new Product({
            barcode: "8901234567890",
            productName: "Test Juice",
            servingSize: { value: 100, unit: "kg" }
        });

        expect(product.validateSync().errors["servingSize.unit"]).toBeDefined();
    });

    test("5. Rejects an invalid nutrition basis", () => {
        const product = new Product({
            barcode: "8901234567890",
            productName: "Test Juice",
            nutritionBasis: "per-container"
        });

        expect(product.validateSync().errors.nutritionBasis).toBeDefined();
    });

    test("6. Applies default values", () => {
        const product = new Product({
            barcode: "8901234567890",
            productName: "Test Juice"
        });

        expect(product.brand).toBe("Unknown");
        expect(product.ingredients).toBe("");
        expect(product.claims).toEqual([]);
        expect(product.source).toBe("manual");
        expect(product.nutritionBasis).toBe("per-serving");
    });
});
