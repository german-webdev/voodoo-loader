/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "jsdom",
  moduleFileExtensions: ["ts", "tsx", "js"],
  roots: ["<rootDir>/src"],
  setupFilesAfterEnv: ["<rootDir>/src/shared/config/jest/setupTests.ts"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.json",
        useESM: true,
      },
    ],
  },
  moduleNameMapper: {
    "\\.module\\.(css|less|scss|sass)$": "<rootDir>/src/shared/config/jest/cssModuleProxy.cjs",
    "\\.(css|less|scss|sass)$": "<rootDir>/src/shared/config/jest/styleMock.cjs",
    "\\.(png|jpg|jpeg|gif|svg|webp|avif)$": "<rootDir>/src/shared/config/jest/fileMock.cjs",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/main.tsx", "!src/vite-env.d.ts"],
  coverageThreshold: {
    global: {
      branches: 1,
      functions: 1,
      lines: 1,
      statements: 1,
    },
  },
};
