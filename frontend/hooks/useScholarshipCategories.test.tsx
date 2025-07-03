import { renderHook, waitFor } from '@testing-library/react'
import { useScholarshipCategories } from './useScholarshipCategories'
import api from '@/lib/api'
import { describe, it, expect, jest } from '@jest/globals'

jest.mock('@/lib/api')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockedApi = api as any

describe('useScholarshipCategories', () => {
  it('fetches categories and updates state', async () => {
    mockedApi.scholarshipCategories = {
      getAll: jest.fn().mockResolvedValue({ success: true, message: 'ok', data: [
        { id: 1, nameZh: '博士獎學金', createdAt: new Date().toISOString() }
      ] })
    } as any

    const { result } = renderHook(() => useScholarshipCategories())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(result.current.categories.length).toBe(1)
  })
})