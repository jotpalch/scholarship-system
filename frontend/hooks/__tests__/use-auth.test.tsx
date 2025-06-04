import { renderHook } from '@testing-library/react'
import { ReactNode } from 'react'
import { AuthProvider, useAuth } from '../use-auth'

// Test wrapper with AuthProvider
const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

describe('useAuth Hook', () => {
  it('should provide auth context', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current).toBeDefined()
    expect(typeof result.current.login).toBe('function')
    expect(typeof result.current.logout).toBe('function')
    expect(typeof result.current.updateUser).toBe('function')
    expect(typeof result.current.isAuthenticated).toBe('boolean')
    expect(typeof result.current.isLoading).toBe('boolean')
  })

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.user).toBe(null)
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.error).toBe(null)
  })

  it('should throw error when used outside provider', () => {
    expect(() => {
      renderHook(() => useAuth())
    }).toThrow()
  })
}) 