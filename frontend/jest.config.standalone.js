// Standalone Jest configuration for CI compatibility
// Use this if the Next.js Jest configuration fails in CI

// const { pathsToModuleNameMapper } = require('ts-jest'); // No longer using for this test
// const { compilerOptions } = require('./tsconfig.json'); // No longer using for this test

module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  
  // Module name mapping - Simplified
  moduleNameMapper: {
    // CSS and static assets
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 'jest-transform-stub',

    // Manually crafted generic alias for @/* based on tsconfig
    '^@/(.*)$': '<rootDir>/$1'
  },

  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>/'],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Test configuration
  testMatch: [
    '<rootDir>/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/**/*.(test|spec).{js,jsx,ts,tsx}'
  ],
  
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/e2e/'
  ],

  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': 'babel-jest',
  },

  // Coverage configuration
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

  // Other settings
  clearMocks: true,
  automock: false,
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))',
  ],
} 