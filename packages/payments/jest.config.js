/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  // Cas non négociable : jamais deux versements pour une même intention.
  // Voir docs/guide-connecteur/README.md section 3.
};
