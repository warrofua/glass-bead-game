module.exports = {
  rootDir: __dirname,
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@gbg/types$': '<rootDir>/../../packages/types/src',
    '^d3$': '<rootDir>/../../node_modules/d3/dist/d3.js',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(d3|d3-[^/]+|internmap|delaunator|robust-predicates)/)',
  ],
};
