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
  role: 'student' | 'professor' | 'college' | 'admin' | 'super_admin'
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

export interface ApplicationFile {
  id: number
  filename: string
  original_filename?: string
  file_size?: number
  mime_type?: string
  file_type: string
  file_path?: string
  is_verified?: boolean
  uploaded_at: string
}

export interface Application {
  id: number
  app_id?: string  // 申請編號，格式如 APP-2025-000001
  student_id: string
  scholarship_type: string
  scholarship_type_zh?: string  // 中文獎學金類型名稱
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'withdrawn'
  personal_statement?: string
  gpa_requirement_met: boolean
  submitted_at?: string
  reviewed_at?: string
  approved_at?: string
  created_at: string
  updated_at: string
  files?: ApplicationFile[]  // 關聯的文件
  
  // Extended properties for dashboard display
  user?: User  // 關聯的使用者資訊
  student?: Student  // 關聯的學生資訊
  scholarship?: ScholarshipType  // 關聯的獎學金資訊
  
  // Computed properties for UI
  amount?: number  // 從 scholarship 獲取
  gpa?: number  // 從 student 獲取
  department?: string  // 從 student 獲取
  nationality?: string  // 從 student 獲取
  days_waiting?: number  // 計算得出 - 與後端保持一致
}

export interface ApplicationCreate {
  scholarship_type: string
  academic_year?: string
  semester?: string
  gpa?: number
  class_ranking_percent?: number
  dept_ranking_percent?: number
  completed_terms?: number
  contact_phone?: string
  contact_email?: string
  contact_address?: string
  bank_account?: string
  research_proposal?: string
  budget_plan?: string
  milestone_plan?: string
  agree_terms?: boolean
  personal_statement?: string
  expected_graduation_date?: string
}

export interface DashboardStats {
  total_applications: number
  pending_review: number
  approved: number
  rejected: number
  avg_processing_time: string
}

export interface EmailTemplate {
  key: string
  subject_template: string
  body_template: string
  cc?: string | null
  bcc?: string | null
  updated_at?: string | null
}

export interface SystemSetting {
  key: string
  value: string
}

export interface AnnouncementCreate {
  title: string
  title_en?: string
  message: string
  message_en?: string
  notification_type?: 'info' | 'warning' | 'error' | 'success' | 'reminder'
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  action_url?: string
  expires_at?: string
  metadata?: Record<string, any>
}

export interface AnnouncementUpdate {
  title?: string
  title_en?: string
  message?: string
  message_en?: string
  notification_type?: 'info' | 'warning' | 'error' | 'success' | 'reminder'
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  action_url?: string
  expires_at?: string
  metadata?: Record<string, any>
  is_dismissed?: boolean
}

export interface NotificationResponse {
  id: number
  title: string
  title_en?: string
  message: string
  message_en?: string
  notification_type: string
  priority: string
  related_resource_type?: string
  related_resource_id?: number
  action_url?: string
  is_read: boolean
  is_dismissed: boolean
  scheduled_at?: string
  expires_at?: string
  read_at?: string
  created_at: string
  metadata?: Record<string, any>
}

export interface ScholarshipType {
  id: number
  code: string
  name: string
  name_en?: string
  description?: string
  description_en?: string
  amount: number
  currency: string
  eligible_student_types?: string[]
  min_gpa?: number
  max_ranking_percent?: number
  max_completed_terms?: number
  required_documents?: string[]
  application_start_date?: string
  application_end_date?: string
  review_deadline?: string
  status: string
  max_applications_per_year?: number
  requires_professor_recommendation: boolean
  requires_research_proposal: boolean
  review_workflow?: any
  auto_approval_rules?: any
  created_at: string
  updated_at: string
  created_by?: number
  updated_by?: number
}

// User management types
export interface UserListResponse {
  id: number
  email: string
  username: string
  full_name: string
  chinese_name?: string
  english_name?: string
  role: string
  is_active: boolean
  is_verified: boolean
  student_no?: string
  created_at: string
  updated_at?: string
  last_login_at?: string
}

export interface UserCreate {
  email: string
  username: string
  full_name: string
  chinese_name?: string
  english_name?: string
  role: "student" | "professor" | "college" | "admin" | "super_admin"
  password: string
  student_no?: string
  is_active?: boolean
}

export interface UserUpdate {
  email?: string
  username?: string
  full_name?: string
  chinese_name?: string
  english_name?: string
  role?: "student" | "professor" | "college" | "admin" | "super_admin"
  is_active?: boolean
  is_verified?: boolean
  student_no?: string
}

export interface UserStats {
  total_users: number
  role_distribution: Record<string, number>
  active_users: number
  inactive_users: number
  recent_registrations: number
}

class ApiClient {
  private baseURL: string
  private token: string | null = null

  constructor() {
    // Dynamically determine backend URL
    if (typeof window !== 'undefined') {
      // Browser environment - use current host with port 8000
      const protocol = window.location.protocol
      const hostname = window.location.hostname
      this.baseURL = process.env.NEXT_PUBLIC_API_URL || `${protocol}//${hostname}:8000`
    } else {
      // Server-side environment - use environment variable or localhost
      this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    }
    
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
    options: RequestInit & { params?: Record<string, any> } = {}
  ): Promise<ApiResponse<T>> {
    // Handle query parameters
    let url = `${this.baseURL}/api/v1${endpoint}`
    if (options.params) {
      const searchParams = new URLSearchParams()
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value))
        }
      })
      const queryString = searchParams.toString()
      if (queryString) {
        url += `?${queryString}`
      }
    }
    
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    }

    // Only set Content-Type if it's not FormData (detected by empty headers object)
    const isFormData = options.body instanceof FormData
    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    } else {
      console.warn('No auth token available for request to:', endpoint)
    }

    // Remove params from options before passing to fetch
    const { params, ...fetchOptions } = options
    const config: RequestInit = {
      ...fetchOptions,
      headers,
    }

    try {
      console.log(`Making API request: ${options.method || 'GET'} ${url}`)
      if (options.params) {
        console.log('Query parameters:', options.params)
      }
      const response = await fetch(url, config)
      
      // Log response details for debugging
      console.log(`Response status: ${response.status} ${response.statusText}`)
      console.log(`Response headers:`, Object.fromEntries(response.headers.entries()))
      
      let data: any
      const contentType = response.headers.get('content-type')
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
        console.log('Response data:', data)
      } else {
        const text = await response.text()
        console.log('Non-JSON response:', text)
        throw new Error(`Expected JSON response but got ${contentType}: ${text}`)
      }

      if (!response.ok) {
        console.error(`API request failed: ${response.status} ${response.statusText}`, {
          url,
          status: response.status,
          data
        })
        
        // Handle specific error codes
        if (response.status === 401) {
          console.error('Authentication failed - clearing token')
          this.clearToken()
        } else if (response.status === 403) {
          console.error('Authorization denied - user may not have proper permissions')
        }
        
        throw new Error(data.message || data.detail || `HTTP error! status: ${response.status}`)
      }

      console.log(`API request successful: ${options.method || 'GET'} ${url}`)
      
      // Handle different response formats from backend
      if (data && typeof data === 'object') {
        // If response already has success/message structure, return as-is
        if ('success' in data && 'message' in data) {
          return data as ApiResponse<T>
        }
        // If it's a direct object (like Application), wrap it
        else if ('id' in data) {
          return {
            success: true,
            message: 'Request completed successfully',
            data: data as T
          } as ApiResponse<T>
        }
        // If it's an array, wrap it
        else if (Array.isArray(data)) {
          return {
            success: true,
            message: 'Request completed successfully',
            data: data as T
          } as ApiResponse<T>
        }
      }
      
      return data
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // Authentication endpoints
  auth = {
    login: async (username: string, password: string): Promise<ApiResponse<{ access_token: string; token_type: string; expires_in: number; user: User }>> => {
      return this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
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

    // Mock SSO endpoints for development
    getMockUsers: async (): Promise<ApiResponse<any[]>> => {
      return this.request('/auth/mock-sso/users')
    },

    mockSSOLogin: async (username: string): Promise<ApiResponse<{ access_token: string; token_type: string; expires_in: number; user: User }>> => {
      return this.request('/auth/mock-sso/login', {
        method: 'POST',
        body: JSON.stringify({ username }),
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

    // Get all users with pagination and filters
    getAll: (params?: {
      page?: number
      size?: number
      role?: string
      search?: string
      is_active?: boolean
    }) => this.request<PaginatedResponse<UserListResponse>>('/users', {
      method: 'GET',
      params
    }),

    // Get user by ID
    getById: (userId: number) => this.request<UserResponse>(`/users/${userId}`, {
      method: 'GET'
    }),

    // Create new user
    create: (userData: UserCreate) => this.request<UserResponse>('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),

    // Update user
    update: (userId: number, userData: UserUpdate) => this.request<UserResponse>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    }),

    // Delete user (soft delete)
    delete: (userId: number) => this.request<{ success: boolean; message: string; data: { user_id: number } }>(`/users/${userId}`, {
      method: 'DELETE'
    }),

    // Activate user
    activate: (userId: number) => this.request<{ success: boolean; message: string; data: { user_id: number } }>(`/users/${userId}/activate`, {
      method: 'POST'
    }),

    // Deactivate user
    deactivate: (userId: number) => this.request<{ success: boolean; message: string; data: { user_id: number } }>(`/users/${userId}/deactivate`, {
      method: 'POST'
    }),

    // Reset user password
    resetPassword: (userId: number) => this.request<{ user_id: number; temporary_password: string }>(`/users/${userId}/reset-password`, {
      method: 'POST'
    }),

    // Get user statistics
    getStats: () => this.request<UserStats>('/users/stats/overview', {
      method: 'GET'
    })
  }

  // Scholarship endpoints
  scholarships = {
    getEligible: async (): Promise<ApiResponse<ScholarshipType[]>> => {
      return this.request('/scholarships/eligible')
    },
    
    getById: async (id: number): Promise<ApiResponse<ScholarshipType>> => {
      return this.request(`/scholarships/${id}`)
    },
    
    getAll: async (): Promise<ApiResponse<ScholarshipType[]>> => {
      return this.request('/scholarships')
    }
  }

  // Application management endpoints
  applications = {
    getMyApplications: async (status?: string): Promise<ApiResponse<Application[]>> => {
      const params = status ? `?status=${encodeURIComponent(status)}` : ''
      return this.request(`/applications/${params}`)
    },

    getCollegeReview: async (status?: string, scholarshipType?: string): Promise<ApiResponse<Application[]>> => {
      const params = new URLSearchParams()
      if (status) params.append('status', status)
      if (scholarshipType) params.append('scholarship_type', scholarshipType)
      
      const queryString = params.toString()
      return this.request(`/applications/college/review${queryString ? `?${queryString}` : ''}`)
    },

    getByScholarshipType: async (scholarshipType: string, status?: string): Promise<ApiResponse<Application[]>> => {
      const params = new URLSearchParams()
      params.append('scholarship_type', scholarshipType)
      if (status) params.append('status', status)
      
      const queryString = params.toString()
      return this.request(`/applications/review/list${queryString ? `?${queryString}` : ''}`)
    },

    createApplication: async (applicationData: ApplicationCreate): Promise<ApiResponse<Application>> => {
      return this.request('/applications/', {
        method: 'POST',
        body: JSON.stringify(applicationData)
      })
    },

    getApplicationById: async (id: number): Promise<ApiResponse<Application>> => {
      return this.request(`/applications/${id}`)
    },

    updateApplication: async (id: number, applicationData: Partial<ApplicationCreate>): Promise<ApiResponse<Application>> => {
      return this.request(`/applications/${id}`, {
        method: 'PUT',
        body: JSON.stringify(applicationData)
      })
    },

    updateStatus: async (id: number, statusData: { status: string; comments?: string }): Promise<ApiResponse<Application>> => {
      return this.request(`/applications/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(statusData)
      })
    },

    uploadFile: async (applicationId: number, file: File, fileType: string): Promise<ApiResponse<any>> => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('file_type', fileType)
      
      return this.request(`/applications/${applicationId}/files`, {
        method: 'POST',
        body: formData
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

    uploadDocument: async (applicationId: number, file: File, fileType: string = 'other'): Promise<ApiResponse<any>> => {
      const formData = new FormData()
      formData.append('file', file)

      return this.request(`/applications/${applicationId}/files/upload?file_type=${encodeURIComponent(fileType)}`, {
        method: 'POST',
        body: formData,
        headers: {}, // Remove Content-Type to let browser set it for FormData
      })
    },

    getApplicationFiles: async (applicationId: number): Promise<ApiResponse<ApplicationFile[]>> => {
      return this.request(`/applications/${applicationId}/files`)
    },

    // 新增暫存申請功能
    saveApplicationDraft: async (applicationData: ApplicationCreate): Promise<ApiResponse<Application>> => {
      const response = await this.request('/applications/draft/', {
        method: 'POST',
        body: JSON.stringify(applicationData),
      })
      
      // Handle direct Application response vs wrapped ApiResponse
      if (response && typeof response === 'object' && 'id' in response && !('success' in response)) {
        // Direct Application object - wrap it in ApiResponse format
        return {
          success: true,
          message: 'Draft saved successfully',
          data: response as unknown as Application
        }
      }
      
      // Already in ApiResponse format
      return response as ApiResponse<Application>
    },

    submitRecommendation: async (
      applicationId: number,
      reviewStage: string,
      recommendation: string,
      selectedAwards?: string[]
    ): Promise<ApiResponse<Application>> => {
      return this.request(`/applications/${applicationId}/review`, {
        method: 'POST',
        body: JSON.stringify({
          application_id: applicationId,
          review_stage: reviewStage,
          recommendation,
          ...(selectedAwards ? { selected_awards: selectedAwards } : {})
        }),
      });
    },
  }

  // Notification endpoints
  notifications = {
    getNotifications: async (
      skip?: number,
      limit?: number,
      unreadOnly?: boolean,
      notificationType?: string
    ): Promise<ApiResponse<NotificationResponse[]>> => {
      const params = new URLSearchParams()
      if (skip) params.append('skip', skip.toString())
      if (limit) params.append('limit', limit.toString())
      if (unreadOnly) params.append('unread_only', 'true')
      if (notificationType) params.append('notification_type', notificationType)
      
      const queryString = params.toString()
      return this.request(`/notifications${queryString ? `?${queryString}` : ''}`)
    },

    getUnreadCount: async (): Promise<ApiResponse<number>> => {
      return this.request('/notifications/unread-count')
    },

    markAsRead: async (notificationId: number): Promise<ApiResponse<NotificationResponse>> => {
      return this.request(`/notifications/${notificationId}/read`, {
        method: 'PATCH',
      })
    },

    markAllAsRead: async (): Promise<ApiResponse<{ updated_count: number }>> => {
      return this.request('/notifications/mark-all-read', {
        method: 'PATCH',
      })
    },

    dismiss: async (notificationId: number): Promise<ApiResponse<{ notification_id: number }>> => {
      return this.request(`/notifications/${notificationId}/dismiss`, {
        method: 'PATCH',
      })
    },

    getNotificationDetail: async (notificationId: number): Promise<ApiResponse<NotificationResponse>> => {
      return this.request(`/notifications/${notificationId}`)
    },

    // Admin-only notification endpoints
    createSystemAnnouncement: async (announcementData: AnnouncementCreate): Promise<ApiResponse<NotificationResponse>> => {
      return this.request('/notifications/admin/create-system-announcement', {
        method: 'POST',
        body: JSON.stringify(announcementData),
      })
    },

    createTestNotifications: async (): Promise<ApiResponse<{ created_count: number; notification_ids: number[] }>> => {
      return this.request('/notifications/admin/create-test-notifications', {
        method: 'POST',
      })
    },
  }

  // Admin endpoints
  admin = {
    getDashboardStats: async (): Promise<ApiResponse<DashboardStats>> => {
      return this.request('/admin/dashboard/stats')
    },

    getRecentApplications: async (limit?: number): Promise<ApiResponse<Application[]>> => {
      const params = limit ? `?limit=${limit}` : ''
      return this.request(`/admin/recent-applications${params}`)
    },

    getSystemAnnouncements: async (limit?: number): Promise<ApiResponse<NotificationResponse[]>> => {
      const params = limit ? `?limit=${limit}` : ''
      return this.request(`/admin/system-announcements${params}`)
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

    getEmailTemplate: async (key: string): Promise<ApiResponse<EmailTemplate>> => {
      return this.request(`/admin/email-template?key=${encodeURIComponent(key)}`)
    },

    updateEmailTemplate: async (template: EmailTemplate): Promise<ApiResponse<EmailTemplate>> => {
      return this.request(`/admin/email-template`, {
        method: 'PUT',
        body: JSON.stringify(template),
      })
    },

    getSystemSetting: async (key: string): Promise<ApiResponse<SystemSetting>> => {
      return this.request(`/admin/system-setting?key=${encodeURIComponent(key)}`)
    },

    updateSystemSetting: async (setting: SystemSetting): Promise<ApiResponse<SystemSetting>> => {
      return this.request(`/admin/system-setting`, {
        method: 'PUT',
        body: JSON.stringify(setting),
      })
    },

    // === 系統公告管理 === //
    
    getAllAnnouncements: async (
      page?: number,
      size?: number,
      notificationType?: string,
      priority?: string
    ): Promise<ApiResponse<{ items: NotificationResponse[]; total: number; page: number; size: number }>> => {
      const params = new URLSearchParams()
      if (page) params.append('page', page.toString())
      if (size) params.append('size', size.toString())
      if (notificationType) params.append('notification_type', notificationType)
      if (priority) params.append('priority', priority)
      
      const queryString = params.toString()
      return this.request(`/admin/announcements${queryString ? `?${queryString}` : ''}`)
    },

    getAnnouncement: async (id: number): Promise<ApiResponse<NotificationResponse>> => {
      return this.request(`/admin/announcements/${id}`)
    },

    createAnnouncement: async (announcementData: AnnouncementCreate): Promise<ApiResponse<NotificationResponse>> => {
      return this.request('/admin/announcements', {
        method: 'POST',
        body: JSON.stringify(announcementData),
      })
    },

    updateAnnouncement: async (id: number, announcementData: AnnouncementUpdate): Promise<ApiResponse<NotificationResponse>> => {
      return this.request(`/admin/announcements/${id}`, {
        method: 'PUT',
        body: JSON.stringify(announcementData),
      })
    },

    deleteAnnouncement: async (id: number): Promise<ApiResponse<{ message: string }>> => {
      return this.request(`/admin/announcements/${id}`, {
        method: 'DELETE',
      })
    },
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient()
export default apiClient 