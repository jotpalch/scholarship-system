// @ts-nocheck
import '@testing-library/jest-dom'
import React from 'react'

// Make React available globally
global.React = React

// Load environment setup
require('./jest.env.js')

// API mocking is handled by __mocks__ directory structure
// Individual test files can override specific mocks as needed

// Suppress React act warnings and test API errors from test scenarios
const originalError = console.error
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      args[0] && 
      typeof args[0] === 'string' &&
      (
        (args[0].includes('Warning: An update to') && args[0].includes('act(...)')) ||
        args[0].includes('@radix-ui') ||
        args[0].includes('not wrapped in act') ||
        args[0].includes('API request failed') || // Suppress intentional test API errors
        args[0].includes('The above error occurred in the <TestComponent> component') ||
        args[0].includes('Consider adding an error boundary')
      )
    ) {
      return
    }
    // Don't suppress errors that are part of test assertions
    if (args[0] && typeof args[0] === 'string' && args[0].includes('useAuth must be used within AuthProvider')) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  root = null
  rootMargin = ""
  thresholds = []
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() { return [] }
} as any

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock window.scrollTo
global.scrollTo = jest.fn()

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
}
global.localStorage = localStorageMock as any

// Mock Next.js 13 App Router
jest.mock('next/navigation', () => {
  return {
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    }),
  }
})

// Basic global fetch mock to return successful empty response when not overridden
if (!global.fetch) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    json: async () => ({}),
    text: async () => '',
  }) as any
}

// @ts-nocheck 