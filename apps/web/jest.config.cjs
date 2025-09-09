module.exports = {
  rootDir: __dirname,
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^@gbg/types$': '<rootDir>/../../packages/types/src',
    '^d3$': '<rootDir>/../../node_modules/d3/dist/d3.js',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { 
      tsconfig: '<rootDir>/tsconfig.test.json',
      useESM: true
    }],
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(d3|d3-[^/]+|internmap|delaunator|robust-predicates)/)',
  ]
};
