import vision = require("../index");

export const assessImageQuality: typeof vision.imageProcessing.assessImageQuality;
export const preprocessImage: typeof vision.preprocessImage;
export const validateImage: typeof vision.imageProcessing.validateImage;
export const validateRgbaImage: typeof vision.imageProcessing.validateRgbaImage;
export type ImageInput = vision.ImageInput;
export type ImageQualityResult = vision.ImageQualityResult;
export type PreprocessImageOptions = vision.PreprocessImageOptions;
export type PreprocessImageResult = vision.PreprocessImageResult;
export type RgbaImageInput = vision.RgbaImageInput;
