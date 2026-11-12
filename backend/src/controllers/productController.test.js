const express = require("express");
const request = require("supertest");

jest.mock("../models/Product", () => ({
    create: jest.fn(),
    findOne: jest.fn()
}));

jest.mock("../services/openFoodFactsService", () => ({
    fetchProductByBarcode: jest.fn()
}));

const Product = require("../models/Product");
const { fetchProductByBarcode } = require("../services/openFoodFactsService");

const {
    createProduct,
    getProductByBarcode
} = require("./productController");

const app = express();
app.use(express.json());

app.post("/products", createProduct);
app.get("/products/:barcode", getProductByBarcode);

const sampleProduct = {
    barcode: "8901234567890",
    productName: "Test Juice",
    brand: "Test Brand",
    ingredients: "Water, sugar"
};

describe("Product Controller Tests", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("1. Creates a product successfully", async () => {
        Product.create.mockResolvedValue(sampleProduct);

        const response = await request(app)
            .post("/products")
            .send(sampleProduct);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(Product.create).toHaveBeenCalled();
    });

    test("2. Rejects missing barcode or product name", async () => {
        const response = await request(app)
            .post("/products")
            .send({ ingredients: "Water, sugar" });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(Product.create).not.toHaveBeenCalled();
    });

    test("3. Rejects duplicate barcode", async () => {
        Product.create.mockRejectedValue({ code: 11000 });

        const response = await request(app)
            .post("/products")
            .send(sampleProduct);

        expect(response.status).toBe(409);
        expect(response.body.message).toMatch(/already exists/i);
    });

    test("4. Retrieves an existing product", async () => {
        Product.findOne.mockResolvedValue(sampleProduct);

        const response = await request(app)
            .get("/products/8901234567890");

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.product.barcode).toBe("8901234567890");
        expect(fetchProductByBarcode).not.toHaveBeenCalled();
    });

    test("5. Returns 404 when product is unavailable", async () => {
        Product.findOne.mockResolvedValue(null);
        fetchProductByBarcode.mockResolvedValue(null);

        const response = await request(app)
            .get("/products/0000000000000");

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
    });

    test("6. Handles database errors", async () => {
        Product.create.mockRejectedValue(
            new Error("Database unavailable")
        );

        const response = await request(app)
            .post("/products")
            .send(sampleProduct);

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
    });
});
