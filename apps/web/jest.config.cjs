module.exports = {
  rootDir: __dirname,
  preset: 'ts-jest/presets/js-with-ts-esm',
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@gbg/types$': '<rootDir>/../../packages/types/src',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { useESM: true, tsconfig: '<rootDir>/tsconfig.test.json' }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(d3|d3-[^/]+|internmap|delaunator|robust-predicates)/)',
  ],
};
