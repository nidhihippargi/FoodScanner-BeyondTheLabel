
const { validateBarcode } = require("./validateBarcode");
const { fetchProductByBarcode } = require("./productLookup");

module.exports = {
  validateBarcode,
  fetchProductByBarcode
};
