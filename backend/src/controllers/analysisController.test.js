const express = require("express");
const request = require("supertest");

jest.mock("../services/productAnalysisService", () => ({
    analyzeProduct: jest.fn()
}));

const { analyzeProduct } = require("../services/productAnalysisService");
const { analyzeProductController } = require("./analysisController");

const app = express();
app.use(express.json());
app.post("/analyze", analyzeProductController);

describe("Analysis Controller Tests", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("1. Returns analysis for valid product input", async () => {
        analyzeProduct.mockReturnValue({
            success: true,
            product: { name: "Test Juice" },
            analysis: {}
        });

        const response = await request(app)
            .post("/analyze")
            .send({
                productName: "Test Juice",
                ingredients: "Water, sugar"
            });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(analyzeProduct).toHaveBeenCalled();
    });

    test("2. Returns 400 for invalid product input", async () => {
        analyzeProduct.mockImplementation(() => {
            throw new Error("A valid ingredient list is required.");
        });

        const response = await request(app)
            .post("/analyze")
            .send({ ingredients: "" });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toMatch(/ingredient/i);
    });

    test("3. Handles unexpected analysis errors", async () => {
        analyzeProduct.mockImplementation(() => {
            throw new Error("Unexpected processing error");
        });

        const response = await request(app)
            .post("/analyze")
            .send({ ingredients: "Water" });

        expect(response.status).toBe(500);
        expect(response.body.message).toBe("Internal server error.");
        expect(response.body.success).toBe(false);
    });
});
