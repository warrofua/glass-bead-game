module.exports = {
  rootDir: __dirname,
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@gbg/types$': '<rootDir>/../../packages/types/src',
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^d3$': '<rootDir>/../../node_modules/d3/dist/d3.js',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { useESM: true, tsconfig: '<rootDir>/tsconfig.test.json' }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(d3|d3-[^/]+|internmap|delaunator|robust-predicates)/)',
  ],
};
