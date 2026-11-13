module.exports = {
    testEnvironment: "node",

    collectCoverageFrom: [
        "src/controllers/**/*.js",
        "src/services/**/*.js",
        "src/models/**/*.js",

        "!src/**/*.test.js",
        "!src/**/test*.js"
    ],

    coverageDirectory: "coverage",

    coverageReporters: [
        "text",
        "html"
    ]
};