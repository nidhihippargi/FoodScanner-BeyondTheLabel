import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Prepares an image for OCR on a mobile device.
 * Returns a local image URI.
 */
export async function preprocessImage(imageUri) {
  if (!imageUri || typeof imageUri !== 'string') {
    throw new Error('A valid image URI is required.');
  }

  const result = await ImageManipulator.manipulateAsync(
    imageUri,
    [
      {
        resize: {
          width: 1600,
        },
      },
    ],
    {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  return {
    success: true,
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
}