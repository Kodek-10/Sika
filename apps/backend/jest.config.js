/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  // Le typecheck complet est déjà assuré par `npm run build` — ici on privilégie
  // la vitesse d'exécution des tests.
  transform: {
    "^.+\\.ts$": ["ts-jest", { isolatedModules: true }],
  },
};
