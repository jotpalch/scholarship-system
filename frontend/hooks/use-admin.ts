import { useState, useEffect, useCallback } from 'react'
import { apiClient, DashboardStats, Application } from '@/lib/api'

export function useAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [allApplications, setAllApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    size: 20,
    total: 0,
  })

  const fetchDashboardStats = useCallback(async () => {
    try {
      setError(null)
      
      const response = await apiClient.admin.getDashboardStats()
      
      if (response.success && response.data) {
        setStats(response.data)
      } else {
        throw new Error(response.message || 'Failed to fetch dashboard stats')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard stats')
    }
  }, [])

  const fetchAllApplications = useCallback(async (
    page = 1,
    size = 20,
    status?: string
  ) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await apiClient.admin.getAllApplications(page, size, status)
      
      if (response.success && response.data) {
        setAllApplications(response.data.items)
        setPagination({
          page: response.data.page,
          size: response.data.size,
          total: response.data.total,
        })
      } else {
        throw new Error(response.message || 'Failed to fetch applications')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch applications')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateApplicationStatus = useCallback(async (
    applicationId: number,
    status: string,
    reviewNotes?: string
  ) => {
    try {
      setError(null)
      
      const response = await apiClient.admin.updateApplicationStatus(
        applicationId,
        status,
        reviewNotes
      )
      
      if (response.success && response.data) {
        // Update the application in the list
        setAllApplications(prev => 
          prev.map(app => app.id === applicationId ? response.data! : app)
        )
        
        // Refresh stats to reflect the change
        await fetchDashboardStats()
        
        return response.data
      } else {
        throw new Error(response.message || 'Failed to update application status')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update application status')
      throw err
    }
  }, [fetchDashboardStats])

  // Fetch initial data on mount
  useEffect(() => {
    fetchDashboardStats()
    fetchAllApplications()
  }, [fetchDashboardStats, fetchAllApplications])

  return {
    stats,
    allApplications,
    pagination,
    isLoading,
    error,
    fetchDashboardStats,
    fetchAllApplications,
    updateApplicationStatus,
  }
} 