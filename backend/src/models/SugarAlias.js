const mongoose = require("mongoose");

const sugarAliasSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        aliases: {
            type: [String],
            required: true,
            validate: {
            validator: function (value) {
                return Array.isArray(value) && value.length > 0;
            },
            message: "At least one sugar alias is required."
            }
        },

        explanation: {
            type: String,
            required: true
        },

        category: {
            type: String,
            default: "sugar"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("SugarAlias", sugarAliasSchema);