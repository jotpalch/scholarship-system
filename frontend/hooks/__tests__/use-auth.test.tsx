import { renderHook, act, waitFor } from '@testing-library/react'
import { ReactNode } from 'react'
import { AuthProvider, useAuth } from '../use-auth'
import { apiClient } from '../../lib/api'

// Mock the API client
jest.mock('../../lib/api', () => ({
  apiClient: {
    auth: {
      login: jest.fn(),
      getCurrentUser: jest.fn(),
    },
    setToken: jest.fn(),
    clearToken: jest.fn(),
    users: {
      updateProfile: jest.fn(),
    },
  },
}))

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>

// Test wrapper with AuthProvider
const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset localStorage
    localStorage.clear()
  })

  it('should initialize with loading state', () => {
    mockedApiClient.auth.getCurrentUser.mockRejectedValue(new Error('Not authenticated'))

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.user).toBe(null)
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should login successfully', async () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      role: 'student' as const,
      full_name: 'Test User',
      is_active: true,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    }

    const loginResponse = {
      success: true,
      message: 'Login successful',
      data: {
        access_token: 'test-token',
        token_type: 'Bearer',
      },
    }

    const userResponse = {
      success: true,
      message: 'User retrieved',
      data: mockUser,
    }

    mockedApiClient.auth.getCurrentUser
      .mockRejectedValueOnce(new Error('Not authenticated')) // Initial check
      .mockResolvedValueOnce(userResponse) // After login

    mockedApiClient.auth.login.mockResolvedValueOnce(loginResponse)

    const { result } = renderHook(() => useAuth(), { wrapper })

    // Wait for initial loading to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Perform login
    await act(async () => {
      await result.current.login('testuser', 'password')
    })

    expect(mockedApiClient.auth.login).toHaveBeenCalledWith('testuser', 'password')
    expect(mockedApiClient.setToken).toHaveBeenCalledWith('test-token')
    expect(result.current.user).toEqual(mockUser)
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.error).toBe(null)
  })

  it('should handle login failure', async () => {
    const loginError = new Error('Invalid credentials')
    mockedApiClient.auth.login.mockRejectedValueOnce(loginError)
    mockedApiClient.auth.getCurrentUser.mockRejectedValueOnce(new Error('Not authenticated'))

    const { result } = renderHook(() => useAuth(), { wrapper })

    // Wait for initial loading to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      try {
        await result.current.login('invalid', 'credentials')
      } catch (error) {
        // Expected to throw
      }
    })

    expect(result.current.error).toBe('Invalid credentials')
    expect(result.current.user).toBe(null)
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should logout successfully', async () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      role: 'student' as const,
      full_name: 'Test User',
      is_active: true,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    }

    // Mock initial authenticated state
    mockedApiClient.auth.getCurrentUser.mockResolvedValueOnce({
      success: true,
      message: 'User retrieved',
      data: mockUser,
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    // Wait for initial auth check
    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true)
    })

    // Perform logout
    act(() => {
      result.current.logout()
    })

    expect(mockedApiClient.clearToken).toHaveBeenCalled()
    expect(result.current.user).toBe(null)
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.error).toBe(null)
  })

  it('should update user profile', async () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      role: 'student' as const,
      full_name: 'Test User',
      is_active: true,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    }

    const updatedUser = {
      ...mockUser,
      full_name: 'Updated User',
    }

    // Mock initial authenticated state
    mockedApiClient.auth.getCurrentUser.mockResolvedValueOnce({
      success: true,
      message: 'User retrieved',
      data: mockUser,
    })

    mockedApiClient.users.updateProfile.mockResolvedValueOnce({
      success: true,
      message: 'Profile updated',
      data: updatedUser,
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    // Wait for initial auth check
    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true)
    })

    // Update profile
    await act(async () => {
      await result.current.updateUser({ full_name: 'Updated User' })
    })

    expect(mockedApiClient.users.updateProfile).toHaveBeenCalledWith({
      full_name: 'Updated User',
    })
    expect(result.current.user?.full_name).toBe('Updated User')
  })

  it('should handle update profile failure', async () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      role: 'student' as const,
      full_name: 'Test User',
      is_active: true,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    }

    // Mock initial authenticated state
    mockedApiClient.auth.getCurrentUser.mockResolvedValueOnce({
      success: true,
      message: 'User retrieved',
      data: mockUser,
    })

    const updateError = new Error('Update failed')
    mockedApiClient.users.updateProfile.mockRejectedValueOnce(updateError)

    const { result } = renderHook(() => useAuth(), { wrapper })

    // Wait for initial auth check
    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true)
    })

    await act(async () => {
      try {
        await result.current.updateUser({ full_name: 'Updated User' })
      } catch (error) {
        // Expected to throw
      }
    })

    expect(result.current.error).toBe('Update failed')
  })

  it('should check for existing authentication on mount', async () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      role: 'student' as const,
      full_name: 'Test User',
      is_active: true,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    }

    mockedApiClient.auth.getCurrentUser.mockResolvedValueOnce({
      success: true,
      message: 'User retrieved',
      data: mockUser,
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('should clear token when authentication check fails', async () => {
    mockedApiClient.auth.getCurrentUser.mockRejectedValueOnce(new Error('Token expired'))

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockedApiClient.clearToken).toHaveBeenCalled()
    expect(result.current.user).toBe(null)
    expect(result.current.isAuthenticated).toBe(false)
  })
}) 