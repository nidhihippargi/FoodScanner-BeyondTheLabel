const SugarAlias = require("./SugarAlias");

describe("SugarAlias Model Tests", () => {

    test("1. Accepts a valid sugar alias", () => {
        const alias = new SugarAlias({
            name: "Maltodextrin",
            aliases: ["maltodextrin"],
            explanation: "A carbohydrate derived from starch."
        });

        expect(alias.validateSync()).toBeUndefined();
    });

    test("2. Rejects missing name", () => {
        const alias = new SugarAlias({
            aliases: ["maltodextrin"],
            explanation: "A carbohydrate."
        });

        expect(alias.validateSync().errors.name).toBeDefined();
    });

    test("3. Rejects missing aliases", () => {
        const alias = new SugarAlias({
            name: "Maltodextrin",
            explanation: "A carbohydrate."
        });

        expect(alias.validateSync().errors.aliases).toBeDefined();
    });

    test("4. Rejects missing explanation", () => {
        const alias = new SugarAlias({
            name: "Maltodextrin",
            aliases: ["maltodextrin"]
        });

        expect(alias.validateSync().errors.explanation).toBeDefined();
    });

    test("5. Applies default category", () => {
        const alias = new SugarAlias({
            name: "Maltodextrin",
            aliases: ["maltodextrin"],
            explanation: "A carbohydrate."
        });

        expect(alias.category).toBe("sugar");
    });
});