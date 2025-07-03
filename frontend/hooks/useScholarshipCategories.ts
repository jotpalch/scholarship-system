import { useCallback, useEffect, useState } from 'react'
import api, { ScholarshipCategory, ScholarshipType } from '@/lib/api'

export function useScholarshipCategories() {
  const [categories, setCategories] = useState<ScholarshipCategory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await api.scholarshipCategories.getAll()
      setCategories(res.data ?? [])
    } catch (err: any) {
      console.error(err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const getSubTypes = async (categoryId: number): Promise<ScholarshipType[]> => {
    try {
      const res = await api.scholarshipCategories.getSubTypes(categoryId)
      return res.data ?? []
    } catch (err) {
      console.error(err)
      return []
    }
  }

  return { categories, isLoading, error, refetch: fetchCategories, getSubTypes }
}