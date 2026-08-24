/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  // Le test FRB-007 est le cas le plus sensible du projet — ne jamais le retirer.
  // Voir docs/test/README.md section 3.
};
