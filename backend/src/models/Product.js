const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        barcode: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        productName: {
            type: String,
            required: true,
            trim: true
        },

        brand: {
            type: String,
            default: "Unknown"
        },

        ingredients: {
            type: String,
            default: ""
        },

        nutrition: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        nutritionBasis: {
        type: String,
        enum: ["per-serving", "per-100g", "per-100ml"],
        default: "per-serving"
        },

        servingSize: {
            value: Number,
            unit: {
                type: String,
                enum: ["g", "ml"]
            }
        },

        claims: {
            type: [String],
            default: []
        },

        source: {
            type: String,
            default: "manual"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Product", productSchema);