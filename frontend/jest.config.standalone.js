// Standalone Jest configuration for CI compatibility
// Use this if the Next.js Jest configuration fails in CI

// const { pathsToModuleNameMapper } = require('ts-jest'); // No longer using for this test
// const { compilerOptions } = require('./tsconfig.json'); // No longer using for this test

module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/frontend/jest.setup.ts'],
  
  // Module name mapping - Using /frontend/ path as suggested for CI compatibility
  moduleNameMapper: {
    // CSS and static assets
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 'jest-transform-stub',

    // Specific literal mappings with /frontend/ path for CI
    '^@/lib/api$': '<rootDir>/frontend/lib/api',
    '^@/lib/utils$': '<rootDir>/frontend/lib/utils',
    '^@/lib/validation$': '<rootDir>/frontend/lib/validation',
    '^@/lib/i18n$': '<rootDir>/frontend/lib/i18n',
    
    // Common component paths
    '^@/components/ui/card$': '<rootDir>/frontend/components/ui/card',
    '^@/components/ui/button$': '<rootDir>/frontend/components/ui/button',
    '^@/components/ui/input$': '<rootDir>/frontend/components/ui/input',
    '^@/components/ui/form$': '<rootDir>/frontend/components/ui/form',
    
    // Common hook paths  
    '^@/hooks/use-auth$': '<rootDir>/frontend/hooks/use-auth',
    '^@/hooks/use-applications$': '<rootDir>/frontend/hooks/use-applications',
    '^@/hooks/use-toast$': '<rootDir>/frontend/hooks/use-toast',
    
    // Generic fallback with /frontend/ path
    '^@/(.*)$': '<rootDir>/frontend/$1'
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