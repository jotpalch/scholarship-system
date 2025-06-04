import '@testing-library/jest-dom'

// Load environment setup
require('./jest.env.js')

// Global API mock setup
jest.mock('@/lib/api', () => ({
  apiClient: {
    auth: {
      getCurrentUser: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
      refreshToken: jest.fn(),
    },
    users: {
      updateProfile: jest.fn(),
      getProfile: jest.fn(),
    },
    applications: {
      getAll: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      submit: jest.fn(),
      delete: jest.fn(),
    },
    scholarships: {
      getAll: jest.fn(),
      getById: jest.fn(),
    },
    setToken: jest.fn(),
    clearToken: jest.fn(),
  },
}))

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
        args[0].includes('API request failed') // Suppress intentional test API errors
      )
    ) {
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