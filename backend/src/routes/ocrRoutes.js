const express = require("express");
const router = express.Router();

router.post("/recognize", async (req, res) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const { base64Image, byteSize } = req.body || {};

        if (!base64Image || typeof base64Image !== "string") {
            return res.status(400).json({
                success: false,
                error: "Missing or invalid base64Image payload."
            });
        }

        if (byteSize && byteSize > 1024 * 1024) {
            return res.status(413).json({
                success: false,
                error: "Image exceeds 1 MB OCR limit."
            });
        }

        const formattedBase64 = base64Image.startsWith("data:image/")
            ? base64Image
            : `data:image/jpeg;base64,${base64Image}`;

        const formData = new URLSearchParams();
        formData.append("base64Image", formattedBase64);
        formData.append("language", "eng");
        formData.append("isOverlayRequired", "false");
        formData.append("scale", "true");
        formData.append("OCREngine", "2");

        const ocrResponse = await fetch(
            "https://api.ocr.space/parse/image",
            {
                method: "POST",
                headers: {
                    apikey: process.env.OCR_SPACE_API_KEY,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: formData.toString(),
                signal: controller.signal
            }
        );

        if (!ocrResponse.ok) {
            return res.status(502).json({
                success: false,
                error: `OCR HTTP error: ${ocrResponse.status}`
            });
        }

        const ocrJson = await ocrResponse.json();

        if (ocrJson.IsErroredOnProcessing) {
            const msg = Array.isArray(ocrJson.ErrorMessage)
                ? ocrJson.ErrorMessage.join("; ")
                : ocrJson.ErrorMessage;

            return res.status(422).json({
                success: false,
                error: msg || "OCR processing error"
            });
        }

        const parsedResults = Array.isArray(ocrJson.ParsedResults)
            ? ocrJson.ParsedResults
            : [];

        const fullText = parsedResults
            .map((item) => (item?.ParsedText || "").trim())
            .filter(Boolean)
            .join("\n")
            .trim();

        if (!fullText) {
            return res.status(422).json({
                success: false,
                error: "No readable text found on label."
            });
        }

        const blocks = fullText
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);

        return res.status(200).json({
            success: true,
            engine: "ocr.space",
            text: fullText,
            blocks,
            confidence: 0.85
        });

    } catch (err) {
        const isTimeout = err.name === "AbortError";

        return res.status(isTimeout ? 504 : 500).json({
            success: false,
            error: isTimeout
                ? "OCR timed out after 15s."
                : err.message || "Backend OCR error."
        });

    } finally {
        clearTimeout(timeoutId);
    }
});

module.exports = router;
