const test = require("node:test");
const assert = require("node:assert/strict");
const { fetchProductByBarcode } = require("../src/barcode/productLookup");

test("does not call Open Food Facts for an invalid barcode", async () => {
  const originalFetch = global.fetch;
  let called = false;
  global.fetch = async () => { called = true; throw new Error("should not be called"); };
  try {
    const result = await fetchProductByBarcode("12345");
    assert.equal(result.success, false);
    assert.equal(result.found, false);
    assert.equal(called, false);
  } finally {
    global.fetch = originalFetch;
  }
});

test("maps an Open Food Facts product response", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      status: "success",
      product: {
        product_name: "Sample Oats",
        brands: "Example",
        quantity: "300 g",
        ingredients_text: "Oats",
        allergens: "Gluten",
        nutriscore_grade: "a",
        nova_group: 1,
        image_url: "https://example.com/image.jpg",
        nutriments: { energy_kcal_100g: 360 }
      }
    })
  });
  try {
    const result = await fetchProductByBarcode("4006381333931");
    assert.equal(result.success, true);
    assert.equal(result.found, true);
    assert.equal(result.product.name, "Sample Oats");
    assert.equal(result.product.nutriscore, "a");
  } finally {
    global.fetch = originalFetch;
  }
});

test("returns a not-found result for an absent product", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: false, status: 404 });
  try {
    const result = await fetchProductByBarcode("4006381333931");
    assert.equal(result.success, true);
    assert.equal(result.found, false);
    assert.equal(result.product, null);
  } finally {
    global.fetch = originalFetch;
  }
});
