import { useState, useEffect, useCallback } from 'react'
import { apiClient, Application, ApplicationCreate } from '@/lib/api'

export function useApplications() {
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchApplications = useCallback(async (status?: string) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await apiClient.applications.getMyApplications(status)
      
      if (response.success && response.data) {
        setApplications(response.data)
      } else {
        throw new Error(response.message || 'Failed to fetch applications')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch applications')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createApplication = useCallback(async (applicationData: ApplicationCreate) => {
    try {
      setError(null)
      
      const response = await apiClient.applications.createApplication(applicationData)
      
      if (response.success && response.data) {
        setApplications(prev => [response.data!, ...prev])
        return response.data
      } else {
        throw new Error(response.message || 'Failed to create application')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create application')
      throw err
    }
  }, [])

  const submitApplication = useCallback(async (applicationId: number) => {
    try {
      setError(null)
      
      const response = await apiClient.applications.submitApplication(applicationId)
      
      if (response.success && response.data) {
        setApplications(prev => 
          prev.map(app => app.id === applicationId ? response.data! : app)
        )
        return response.data
      } else {
        throw new Error(response.message || 'Failed to submit application')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit application')
      throw err
    }
  }, [])

  const withdrawApplication = useCallback(async (applicationId: number) => {
    try {
      setError(null)
      
      const response = await apiClient.applications.withdrawApplication(applicationId)
      
      if (response.success && response.data) {
        setApplications(prev => 
          prev.map(app => app.id === applicationId ? response.data! : app)
        )
        return response.data
      } else {
        throw new Error(response.message || 'Failed to withdraw application')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to withdraw application')
      throw err
    }
  }, [])

  const updateApplication = useCallback(async (
    applicationId: number, 
    applicationData: Partial<Application>
  ) => {
    try {
      setError(null)
      
      const response = await apiClient.applications.updateApplication(applicationId, applicationData)
      
      if (response.success && response.data) {
        setApplications(prev => 
          prev.map(app => app.id === applicationId ? response.data! : app)
        )
        return response.data
      } else {
        throw new Error(response.message || 'Failed to update application')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update application')
      throw err
    }
  }, [])

  const uploadDocument = useCallback(async (applicationId: number, file: File) => {
    try {
      setError(null)
      
      const response = await apiClient.applications.uploadDocument(applicationId, file)
      
      if (response.success) {
        // Refresh applications to get updated document info
        await fetchApplications()
        return response.data
      } else {
        throw new Error(response.message || 'Failed to upload document')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document')
      throw err
    }
  }, [fetchApplications])

  // Fetch applications on mount
  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  return {
    applications,
    isLoading,
    error,
    fetchApplications,
    createApplication,
    submitApplication,
    withdrawApplication,
    updateApplication,
    uploadDocument,
  }
} 