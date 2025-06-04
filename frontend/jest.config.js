const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    // Handle module aliases (these will be automatically configured for you based on your tsconfig.json paths)
    '^@/(.*)$': '<rootDir>/$1',
    '^~/(.*)$': '<rootDir>/$1',
    // Explicit mapping for lib directory in case Next.js config doesn't handle it properly
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1',
  },
  moduleDirectories: ['node_modules', '<rootDir>/'],
  testMatch: [
    '<rootDir>/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/**/*.(test|spec).{js,jsx,ts,tsx}'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/e2e/'
  ],
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!<rootDir>/.next/**',
    '!<rootDir>/e2e/**',
    '!<rootDir>/coverage/**',
    '!<rootDir>/playwright-report/**',
    '!<rootDir>/test-results/**',
    '!<rootDir>/*.config.*',
    '!<rootDir>/next.config.js',
  ],
  // Add transform ignore patterns for better ES module handling
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))',
  ],
  // Explicitly clear mocks between tests
  clearMocks: true,
  // Enable automatic mocking from __mocks__ directories
  automock: false,
  // Disable coverage thresholds for now
  // coverageThreshold: {
  //   global: {
  //     branches: 5,
  //     functions: 5,
  //     lines: 5,
  //     statements: 5,
  //   },
  // },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig) 