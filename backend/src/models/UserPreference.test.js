const UserPreference = require("./UserPreference");

describe("UserPreference Model Tests", () => {

    test("1. Accepts valid user preferences", () => {
        const user = new UserPreference({
            userId: "test-user-001",
            preferences: ["vegan", "low-sugar"]
        });

        expect(user.validateSync()).toBeUndefined();
        expect(user.preferences).toEqual(["vegan", "low-sugar"]);
    });

    test("2. Rejects missing user ID", () => {
        const user = new UserPreference({
            preferences: ["vegan"]
        });

        expect(user.validateSync().errors.userId).toBeDefined();
    });

    test("3. Defaults to an empty preferences array", () => {
        const user = new UserPreference({
            userId: "test-user-002"
        });

        expect(user.preferences).toEqual([]);
        expect(user.validateSync()).toBeUndefined();
    });

    test("4. Accepts multiple preferences", () => {
        const user = new UserPreference({
            userId: "test-user-003",
            preferences: [
                "vegetarian",
                "gluten-free",
                "dairy-free",
                "low-sugar"
            ]
        });

        expect(user.validateSync()).toBeUndefined();
        expect(user.preferences).toHaveLength(4);
    });

    test("5. Rejects an empty user ID", () => {
        const user = new UserPreference({
            userId: "",
            preferences: ["vegan"]
        });

        expect(user.validateSync().errors.userId).toBeDefined();
    });

});
