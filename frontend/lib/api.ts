/**
 * API client for scholarship management system
 * Follows backend camelCase endpoint naming conventions
 */

export interface ApiResponse<T> {
  success: boolean
  message: string
  data?: T
  errors?: string[]
  trace_id?: string
}

export interface User {
  id: string
  email: string
  username: string
  role: 'student' | 'faculty' | 'admin' | 'super_admin'
  full_name: string
  name: string // Added for component compatibility
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Student {
  id: string
  user_id: string
  student_id: string
  student_type: 'undergraduate' | 'graduate' | 'phd'
  department: string
  gpa: number
  nationality: string
  phone_number?: string
  address?: string
  bank_account?: string
  created_at: string
  updated_at: string
}

export interface Application {
  id: number
  student_id: string
  scholarship_type: string
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'withdrawn'
  personal_statement: string
  gpa_requirement_met: boolean
  submitted_at?: string
  reviewed_at?: string
  approved_at?: string
  created_at: string
  updated_at: string
}

export interface ApplicationCreate {
  scholarship_type: string
  personal_statement: string
  expected_graduation_date: string
}

export interface DashboardStats {
  total_applications: number
  pending_review: number
  approved: number
  rejected: number
  avg_processing_time: string
}

class ApiClient {
  private baseURL: string
  private token: string | null = null

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    // Try to get token from localStorage on client side
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token')
    }
  }

  setToken(token: string) {
    this.token = token
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token)
    }
  }

  clearToken() {
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}/api/v1${endpoint}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const config: RequestInit = {
      ...options,
      headers,
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`)
      }

      return data
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // Authentication endpoints
  auth = {
    login: async (username: string, password: string): Promise<ApiResponse<{ access_token: string; token_type: string }>> => {
      const formData = new FormData()
      formData.append('username', username)
      formData.append('password', password)

      return this.request('/auth/login', {
        method: 'POST',
        body: formData,
        headers: {}, // Remove Content-Type to let browser set it for FormData
      })
    },

    register: async (userData: {
      username: string
      email: string
      password: string
      full_name: string
    }): Promise<ApiResponse<User>> => {
      return this.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      })
    },

    getCurrentUser: async (): Promise<ApiResponse<User>> => {
      return this.request('/auth/me')
    },

    refreshToken: async (): Promise<ApiResponse<{ access_token: string; token_type: string }>> => {
      return this.request('/auth/refresh', {
        method: 'POST',
      })
    },
  }

  // User management endpoints
  users = {
    getProfile: async (): Promise<ApiResponse<User>> => {
      return this.request('/users/me')
    },

    updateProfile: async (userData: Partial<User>): Promise<ApiResponse<User>> => {
      return this.request('/users/me', {
        method: 'PUT',
        body: JSON.stringify(userData),
      })
    },

    getStudentInfo: async (): Promise<ApiResponse<Student>> => {
      return this.request('/users/student-info')
    },

    updateStudentInfo: async (studentData: Partial<Student>): Promise<ApiResponse<Student>> => {
      return this.request('/users/student-info', {
        method: 'PUT',
        body: JSON.stringify(studentData),
      })
    },
  }

  // Application management endpoints
  applications = {
    getMyApplications: async (status?: string): Promise<ApiResponse<Application[]>> => {
      const params = status ? `?status=${encodeURIComponent(status)}` : ''
      return this.request(`/applications${params}`)
    },

    createApplication: async (applicationData: ApplicationCreate): Promise<ApiResponse<Application>> => {
      return this.request('/applications', {
        method: 'POST',
        body: JSON.stringify(applicationData),
      })
    },

    getApplication: async (applicationId: number): Promise<ApiResponse<Application>> => {
      return this.request(`/applications/${applicationId}`)
    },

    updateApplication: async (
      applicationId: number,
      applicationData: Partial<Application>
    ): Promise<ApiResponse<Application>> => {
      return this.request(`/applications/${applicationId}`, {
        method: 'PUT',
        body: JSON.stringify(applicationData),
      })
    },

    submitApplication: async (applicationId: number): Promise<ApiResponse<Application>> => {
      return this.request(`/applications/${applicationId}/submit`, {
        method: 'POST',
      })
    },

    withdrawApplication: async (applicationId: number): Promise<ApiResponse<Application>> => {
      return this.request(`/applications/${applicationId}/withdraw`, {
        method: 'POST',
      })
    },

    uploadDocument: async (applicationId: number, file: File): Promise<ApiResponse<any>> => {
      const formData = new FormData()
      formData.append('file', file)

      return this.request(`/applications/${applicationId}/documents`, {
        method: 'POST',
        body: formData,
        headers: {}, // Remove Content-Type to let browser set it for FormData
      })
    },
  }

  // Admin endpoints
  admin = {
    getDashboardStats: async (): Promise<ApiResponse<DashboardStats>> => {
      return this.request('/admin/dashboard/stats')
    },

    getAllApplications: async (
      page?: number,
      size?: number,
      status?: string
    ): Promise<ApiResponse<{ items: Application[]; total: number; page: number; size: number }>> => {
      const params = new URLSearchParams()
      if (page) params.append('page', page.toString())
      if (size) params.append('size', size.toString())
      if (status) params.append('status', status)
      
      const queryString = params.toString()
      return this.request(`/admin/applications${queryString ? `?${queryString}` : ''}`)
    },

    updateApplicationStatus: async (
      applicationId: number,
      status: string,
      reviewNotes?: string
    ): Promise<ApiResponse<Application>> => {
      return this.request(`/admin/applications/${applicationId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, review_notes: reviewNotes }),
      })
    },
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient()
export default apiClient 