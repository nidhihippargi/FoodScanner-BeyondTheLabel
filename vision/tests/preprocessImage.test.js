
const test = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const {
  preprocessImage
} = require("../src/image-processing/preprocessImage");

test("resizes and converts an image to JPEG", async () => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "foodscanner-")
  );

  const inputPath = path.join(tempDir, "input.png");
  const outputPath = path.join(tempDir, "output.jpg");

  try {
    await sharp({
      create: {
        width: 3000,
        height: 2000,
        channels: 3,
        background: "#ffffff"
      }
    }).png().toFile(inputPath);

    const result = await preprocessImage(
      inputPath,
      outputPath
    );

    const metadata = await sharp(outputPath).metadata();

    assert.equal(result.success, true);
    assert.equal(result.originalWidth, 3000);
    assert.equal(result.originalHeight, 2000);
    assert.equal(metadata.format, "jpeg");
    assert.ok(metadata.width <= 2000);
    assert.ok(metadata.height <= 2000);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("rejects missing input or output paths", async () => {
  await assert.rejects(
    () => preprocessImage("", "output.jpg"),
    /Input and output image paths are required/
  );
});

test("rejects an invalid image file", async () => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "foodscanner-")
  );

  const inputPath = path.join(tempDir, "invalid.jpg");
  const outputPath = path.join(tempDir, "output.jpg");

  try {
    fs.writeFileSync(inputPath, "not a real image");

    await assert.rejects(
      () => preprocessImage(inputPath, outputPath)
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});


test("does not enlarge a small image", async () => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "foodscanner-")
  );

  const inputPath = path.join(tempDir, "small.png");
  const outputPath = path.join(tempDir, "output.jpg");

  try {
    await sharp({
      create: {
        width: 400,
        height: 300,
        channels: 3,
        background: "#ffffff"
      }
    }).png().toFile(inputPath);

    await preprocessImage(inputPath, outputPath);

    const metadata = await sharp(outputPath).metadata();

    assert.equal(metadata.width, 400);
    assert.equal(metadata.height, 300);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("preserves the image aspect ratio", async () => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "foodscanner-")
  );

  const inputPath = path.join(tempDir, "input.png");
  const outputPath = path.join(tempDir, "output.jpg");

  try {
    await sharp({
      create: {
        width: 3000,
        height: 1500,
        channels: 3,
        background: "#ffffff"
      }
    }).png().toFile(inputPath);

    await preprocessImage(inputPath, outputPath);

    const metadata = await sharp(outputPath).metadata();

    assert.equal(metadata.width / metadata.height, 2);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
