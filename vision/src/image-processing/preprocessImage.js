
const sharp = require("sharp");

/**
 * Prepares an image for OCR processing.
 *
 * @param {string} inputPath - Path to the input image.
 * @param {string} outputPath - Path for the processed image.
 */
async function preprocessImage(inputPath, outputPath) {
  if (!inputPath || !outputPath) {
    throw new Error("Input and output image paths are required.");
  }

  const image = sharp(inputPath);

  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Invalid image dimensions.");
  }

  await image
    .rotate()
    .resize({
      width: 2000,
      height: 2000,
      fit: "inside",
      withoutEnlargement: true
    })
    .jpeg({
      quality: 90
    })
    .toFile(outputPath);

  return {
    success: true,
    originalWidth: metadata.width,
    originalHeight: metadata.height,
    outputPath
  };
}

module.exports = { preprocessImage };
