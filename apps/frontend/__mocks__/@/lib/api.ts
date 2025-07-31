// Mock API client for testing - matches the structure from lib/api.ts
const createMockFn = () => jest.fn()

export const apiClient = {
  auth: {
    getCurrentUser: createMockFn(),
    login: createMockFn(),
    register: createMockFn(),
    refreshToken: createMockFn(),
  },
  users: {
    updateProfile: createMockFn(),
    getProfile: createMockFn(),
    getStudentInfo: createMockFn(),
    updateStudentInfo: createMockFn(),
  },
  applications: {
    getMyApplications: createMockFn(),
    createApplication: createMockFn(),
    getApplication: createMockFn(),
    updateApplication: createMockFn(),
    submitApplication: createMockFn(),
    withdrawApplication: createMockFn(),
    uploadDocument: createMockFn(),
  },
  admin: {
    getDashboardStats: createMockFn(),
    getAllApplications: createMockFn(),
    updateApplicationStatus: createMockFn(),
  },
  setToken: createMockFn(),
  clearToken: createMockFn(),
}

export default apiClient 