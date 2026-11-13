import vision = require("../index");

export const decodeBarcodeFromRgba: typeof vision.decodeBarcodeFromRgba;
export const fetchProductByBarcode: typeof vision.barcode.fetchProductByBarcode;
export const validateBarcode: typeof vision.barcode.validateBarcode;
export type BarcodeDecodeResult = vision.BarcodeDecodeResult;
export type BarcodeValidationResult = vision.BarcodeValidationResult;
