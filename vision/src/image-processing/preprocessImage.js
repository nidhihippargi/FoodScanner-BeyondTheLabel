/**
 * Portable RGBA image preprocessor.
 *
 * Input and output are raw RGBA pixels. This intentionally does not decode or
 * encode JPEG/PNG/WebP files; use the host application's image library for
 * file decoding/encoding, then pass the pixels here.
 */
function preprocessImage(image, options = {}) {
  const validation = validateRgbaImage(image);
  if (!validation.valid) {
    return { success: false, image: null, operations: [], error: validation.error };
  }

  let working = {
    data: new Uint8ClampedArray(image.data),
    width: image.width,
    height: image.height
  };
  const operations = [];

  try {
    const rotation = options.rotation === undefined ? 0 : options.rotation;
    if (![0, 90, 180, 270].includes(rotation)) {
      throw new Error("Rotation must be 0, 90, 180 or 270 degrees.");
    }
    if (rotation !== 0) {
      working = rotateRgba(working, rotation);
      operations.push(`rotate:${rotation}`);
    }

    if (options.crop !== undefined) {
      working = cropRgba(working, options.crop);
      operations.push("crop");
    }

    const maxWidth = options.maxWidth;
    const maxHeight = options.maxHeight;
    if (maxWidth !== undefined || maxHeight !== undefined) {
      if ((maxWidth !== undefined && (!Number.isInteger(maxWidth) || maxWidth <= 0)) ||
          (maxHeight !== undefined && (!Number.isInteger(maxHeight) || maxHeight <= 0))) {
        throw new Error("maxWidth and maxHeight must be positive integers when provided.");
      }
      const widthLimit = maxWidth || working.width;
      const heightLimit = maxHeight || working.height;
      let scale = Math.min(widthLimit / working.width, heightLimit / working.height);
      if (options.allowUpscale !== true) scale = Math.min(1, scale);
      const nextWidth = Math.max(1, Math.round(working.width * scale));
      const nextHeight = Math.max(1, Math.round(working.height * scale));
      if (nextWidth !== working.width || nextHeight !== working.height) {
        working = resizeRgba(working, nextWidth, nextHeight);
        operations.push(`resize:${nextWidth}x${nextHeight}`);
      }
    }

    const brightness = options.brightness === undefined ? 0 : options.brightness;
    const contrast = options.contrast === undefined ? 0 : options.contrast;
    if (!Number.isFinite(brightness) || brightness < -100 || brightness > 100) {
      throw new Error("brightness must be a number between -100 and 100.");
    }
    if (!Number.isFinite(contrast) || contrast < -100 || contrast > 100) {
      throw new Error("contrast must be a number between -100 and 100.");
    }
    if (brightness !== 0 || contrast !== 0) {
      working = adjustTone(working, brightness, contrast);
      operations.push("tone-adjustment");
    }

    return {
      success: true,
      image: {
        data: working.data,
        width: working.width,
        height: working.height,
        mimeType: "application/x-rgba"
      },
      operations,
      error: null
    };
  } catch (error) {
    return { success: false, image: null, operations, error: error.message };
  }
}

function validateRgbaImage(image) {
  if (!image || typeof image !== "object") {
    return { valid: false, error: "Image input must be an object." };
  }
  const { data, width, height } = image;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    return { valid: false, error: "Image width and height must be positive integers." };
  }
  if (!(data instanceof Uint8Array) && !(data instanceof Uint8ClampedArray)) {
    return { valid: false, error: "Image data must be a Uint8Array or Uint8ClampedArray in RGBA order." };
  }
  if (data.length !== width * height * 4) {
    return { valid: false, error: "RGBA data length must equal width × height × 4." };
  }
  return { valid: true, error: null };
}

function rotateRgba(image, degrees) {
  const swapsDimensions = degrees === 90 || degrees === 270;
  const width = swapsDimensions ? image.height : image.width;
  const height = swapsDimensions ? image.width : image.height;
  const output = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      let targetX;
      let targetY;
      if (degrees === 90) {
        targetX = image.height - 1 - y;
        targetY = x;
      } else if (degrees === 180) {
        targetX = image.width - 1 - x;
        targetY = image.height - 1 - y;
      } else {
        targetX = y;
        targetY = image.width - 1 - x;
      }
      copyPixel(image.data, (y * image.width + x) * 4, output, (targetY * width + targetX) * 4);
    }
  }
  return { data: output, width, height };
}

function cropRgba(image, crop) {
  if (!crop || typeof crop !== "object") throw new Error("crop must be an object with x, y, width and height.");
  const { x, y, width, height } = crop;
  if (![x, y, width, height].every(Number.isInteger) || x < 0 || y < 0 || width <= 0 || height <= 0) {
    throw new Error("Crop coordinates and dimensions must be valid non-negative integers.");
  }
  if (x + width > image.width || y + height > image.height) {
    throw new Error("Crop rectangle must stay within the image boundaries.");
  }
  const output = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row++) {
    const sourceStart = ((y + row) * image.width + x) * 4;
    const targetStart = row * width * 4;
    output.set(image.data.subarray(sourceStart, sourceStart + width * 4), targetStart);
  }
  return { data: output, width, height };
}

function resizeRgba(image, width, height) {
  const output = new Uint8ClampedArray(width * height * 4);
  const xScale = image.width / width;
  const yScale = image.height / height;

  for (let y = 0; y < height; y++) {
    const sourceY = (y + 0.5) * yScale - 0.5;
    const y0 = Math.max(0, Math.floor(sourceY));
    const y1 = Math.min(image.height - 1, y0 + 1);
    const yWeight = Math.max(0, sourceY - y0);
    for (let x = 0; x < width; x++) {
      const sourceX = (x + 0.5) * xScale - 0.5;
      const x0 = Math.max(0, Math.floor(sourceX));
      const x1 = Math.min(image.width - 1, x0 + 1);
      const xWeight = Math.max(0, sourceX - x0);
      const target = (y * width + x) * 4;
      const p00 = (y0 * image.width + x0) * 4;
      const p10 = (y0 * image.width + x1) * 4;
      const p01 = (y1 * image.width + x0) * 4;
      const p11 = (y1 * image.width + x1) * 4;
      for (let channel = 0; channel < 4; channel++) {
        const top = image.data[p00 + channel] * (1 - xWeight) + image.data[p10 + channel] * xWeight;
        const bottom = image.data[p01 + channel] * (1 - xWeight) + image.data[p11 + channel] * xWeight;
        output[target + channel] = top * (1 - yWeight) + bottom * yWeight;
      }
    }
  }
  return { data: output, width, height };
}

function adjustTone(image, brightness, contrast) {
  const output = new Uint8ClampedArray(image.data);
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let index = 0; index < output.length; index += 4) {
    for (let channel = 0; channel < 3; channel++) {
      output[index + channel] = factor * (output[index + channel] - 128) + 128 + brightness * 2.55;
    }
  }
  return { data: output, width: image.width, height: image.height };
}

function copyPixel(source, sourceIndex, target, targetIndex) {
  target[targetIndex] = source[sourceIndex];
  target[targetIndex + 1] = source[sourceIndex + 1];
  target[targetIndex + 2] = source[sourceIndex + 2];
  target[targetIndex + 3] = source[sourceIndex + 3];
}

module.exports = { preprocessImage, validateRgbaImage };
