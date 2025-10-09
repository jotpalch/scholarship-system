/**
 * Admin API Module (OpenAPI-typed)
 *
 * Comprehensive admin functionality:
 * - Dashboard and statistics
 * - Application management
 * - Email templates
 * - System announcements
 * - Scholarship management
 * - Rules and workflows
 * - Permissions
 * - Configurations
 * - Professor management
 *
 * Now using openapi-fetch for full type safety from backend OpenAPI schema
 */

import { typedClient } from '../typed-client';
import { toApiResponse } from '../compat';
import type { ApiResponse } from '../../api.legacy';

export function createAdminApi() {
  return {
    // ========== Dashboard and Statistics ==========

    /**
     * Get dashboard statistics
     * Type-safe: Response type inferred from OpenAPI
     */
    getDashboardStats: async (): Promise<ApiResponse<any>> => {
      const response = await typedClient.raw.GET('/api/v1/admin/dashboard/stats');
      return toApiResponse(response);
    },

    /**
     * Get recent applications
     * Type-safe: Query parameters validated against OpenAPI
     */
    getRecentApplications: async (limit?: number): Promise<ApiResponse<any[]>> => {
      const response = await typedClient.raw.GET('/api/v1/admin/recent-applications', {
        params: { query: { limit } },
      });
      return toApiResponse(response);
    },

    /**
     * Get system announcements
     * Type-safe: Query parameters validated against OpenAPI
     */
    getSystemAnnouncements: async (limit?: number): Promise<ApiResponse<any[]>> => {
      const response = await typedClient.raw.GET('/api/v1/admin/system-announcements', {
        params: { query: { limit } },
      });
      return toApiResponse(response);
    },

    /**
     * Get system stats (alias for getDashboardStats)
     * Type-safe: Response type inferred from OpenAPI
     */
    getSystemStats: async (): Promise<ApiResponse<any>> => {
      const response = await typedClient.raw.GET('/api/v1/admin/dashboard/stats');
      return toApiResponse(response);
    },

    // ========== Application Management ==========

    /**
     * Get all applications with pagination
     * Type-safe: Query parameters validated against OpenAPI
     */
    getAllApplications: async (
      page?: number,
      size?: number,
      status?: string
    ): Promise<ApiResponse<{ items: any[]; total: number; page: number; size: number }>> => {
      const response = await typedClient.raw.GET('/api/v1/admin/applications', {
        params: {
          query: {
            page,
            size,
            status,
          },
        },
      });
      return toApiResponse(response);
    },

    /**
     * Get historical applications with filters
     * Type-safe: Query parameters validated against OpenAPI
     */
    getHistoricalApplications: async (filters?: any): Promise<ApiResponse<any>> => {
      const response = await typedClient.raw.GET('/api/v1/admin/applications/history', {
        params: {
          query: {
            page: filters?.page,
            size: filters?.size,
            status: filters?.status,
            scholarship_type: filters?.scholarship_type,
            academic_year: filters?.academic_year,
            semester: filters?.semester,
            search: filters?.search,
          },
        },
      });
      return toApiResponse(response);
    },

    /**
     * Update application status
     * Type-safe: Path parameter and request body validated against OpenAPI
     */
    updateApplicationStatus: async (
      applicationId: number,
      status: string,
      reviewNotes?: string
    ): Promise<ApiResponse<any>> => {
      const response = await typedClient.raw.PATCH('/api/v1/admin/applications/{application_id}/status', {
        params: { path: { application_id: applicationId } },
        body: { status, review_notes: reviewNotes },
      });
      return toApiResponse(response);
    },

    // ========== Email Templates ==========

    /**
     * Get email template by key
     * Type-safe: Query parameters validated against OpenAPI
     */
    getEmailTemplate: async (key: string): Promise<ApiResponse<any>> => {
      const response = await typedClient.raw.GET('/api/v1/admin/email-template', {
        params: { query: { key } },
      });
      return toApiResponse(response);
    },

    /**
     * Update email template
     * Type-safe: Request body validated against OpenAPI
     */
    updateEmailTemplate: async (template: any): Promise<ApiResponse<any>> => {
      const response = await typedClient.raw.PUT('/api/v1/admin/email-template', {
        body: template,
      });
      return toApiResponse(response);
    },

    /**
     * Get email templates by sending type
     * Type-safe: Query parameters validated against OpenAPI
     */
    getEmailTemplatesBySendingType: async (sendingType?: string): Promise<ApiResponse<any[]>> => {
      const response = await typedClient.raw.GET('/api/v1/admin/email-templates', {
        params: { query: { sending_type: sendingType } },
      });
      return toApiResponse(response);
    },

    // Scholarship Email Templates
    /**
     * Get scholarship email templates
     * Type-safe: Path parameter validated against OpenAPI
     */
    getScholarshipEmailTemplates: async (
      scholarshipTypeId: number
    ): Promise<ApiResponse<{ items: any[]; total: number }>> => {
      const response = await typedClient.raw.GET('/api/v1/admin/scholarship-email-templates/{scholarship_type_id}', {
        params: { path: { scholarship_type_id: scholarshipTypeId } },
      });
      return toApiResponse(response);
    },

    /**
     * Get specific scholarship email template
     * Type-safe: Path parameters validated against OpenAPI
     */
    getScholarshipEmailTemplate: async (
      scholarshipTypeId: number,
      templateKey: string
    ): Promise<ApiResponse<any>> => {
      const response = await typedClient.raw.GET('/api/v1/admin/scholarship-email-templates/{scholarship_type_id}/{template_key}', {
        params: { path: { scholarship_type_id: scholarshipTypeId, template_key: templateKey } },
      });
      return toApiResponse(response);
    },

    /**
     * Create scholarship email template
     * Type-safe: Request body validated against OpenAPI
     */
    createScholarshipEmailTemplate: async (templateData: any): Promise<ApiResponse<any>> => {
      const response = await typedClient.raw.POST('/api/v1/admin/scholarship-email-templates', {
        body: templateData,
      });
      return toApiResponse(response);
    },

    /**
     * Update scholarship email template
     * Type-safe: Path parameters and request body validated against OpenAPI
     */
    updateScholarshipEmailTemplate: async (
      scholarshipTypeId: number,
      templateKey: string,
      templateData: any
    ): Promise<ApiResponse<any>> => {
      const response = await typedClient.raw.PUT('/api/v1/admin/scholarship-email-templates/{scholarship_type_id}/{template_key}', {
        params: { path: { scholarship_type_id: scholarshipTypeId, template_key: templateKey } },
        body: templateData,
      });
      return toApiResponse(response);
    },

    /**
     * Delete scholarship email template
     * Type-safe: Path parameters validated against OpenAPI
     */
    deleteScholarshipEmailTemplate: async (
      scholarshipTypeId: number,
      templateKey: string
    ): Promise<ApiResponse<boolean>> => {
      const response = await typedClient.raw.DELETE('/api/v1/admin/scholarship-email-templates/{scholarship_type_id}/{template_key}', {
        params: { path: { scholarship_type_id: scholarshipTypeId, template_key: templateKey } },
      });
      return toApiResponse(response);
    },

    /**
     * Bulk create scholarship email templates
     * Type-safe: Path parameter validated against OpenAPI
     */
    bulkCreateScholarshipEmailTemplates: async (
      scholarshipTypeId: number
    ): Promise<ApiResponse<{ items: any[]; total: number }>> => {
      const response = await typedClient.raw.POST('/api/v1/admin/scholarship-email-templates/{scholarship_type_id}/bulk-create', {
        params: { path: { scholarship_type_id: scholarshipTypeId } },
      });
      return toApiResponse(response);
    },

    /**
     * Get available scholarship email templates
     * Type-safe: Path parameter validated against OpenAPI
     */
    getAvailableScholarshipEmailTemplates: async (
      scholarshipTypeId: number
    ): Promise<ApiResponse<any[]>> => {
      const response = await typedClient.raw.GET('/api/v1/admin/scholarship-email-templates/{scholarship_type_id}/available', {
        params: { path: { scholarship_type_id: scholarshipTypeId } },
      });
      return toApiResponse(response);
    },

    // ========== System Settings ==========

    /**
     * Get system setting by key
     * Type-safe: Query parameters validated against OpenAPI
     */
    getSystemSetting: async (key: string): Promise<ApiResponse<any>> => {
      const response = await typedClient.raw.GET('/api/v1/admin/system-setting', {
        params: { query: { key } },
      });
      return toApiResponse(response);
    },

    /**
     * Update system setting
     * Type-safe: Request body validated against OpenAPI
     */
    updateSystemSetting: async (setting: any): Promise<ApiResponse<any>> => {
      const response = await typedClient.raw.PUT('/api/v1/admin/system-setting', {
        body: setting,
      });
      return toApiResponse(response);
    },

    // ========== Announcements ==========

    /**
     * Get all announcements with pagination
     * Type-safe: Query parameters validated against OpenAPI
     */
    getAllAnnouncements: async (
      page?: number,
      size?: number,
      notificationType?: string,
      priority?: string
    ): Promise<ApiResponse<{ items: any[]; total: number; page: number; size: number }>> => {
      const response = await typedClient.raw.GET('/api/v1/admin/announcements', {
        params: {
          query: {
            page,
            size,
            notification_type: notificationType,
            priority,
          },
        },
      });
      return toApiResponse(response);
    },

    /**
     * Get announcement by ID
     * Type-safe: Path parameter validated against OpenAPI
     */
    getAnnouncement: async (id: number): Promise<ApiResponse<any>> => {
      const response = await typedClient.raw.GET('/api/v1/admin/announcements/{id}', {
        params: { path: { id } },
      });
      return toApiResponse(response);
    },

    /**
     * Create announcement
     * Type-safe: Request body validated against OpenAPI
     */
    createAnnouncement: async (announcementData: any): Promise<ApiResponse<any>> => {
      const response = await typedClient.raw.POST('/api/v1/admin/announcements', {
        body: announcementData,
      });
      return toApiResponse(response);
    },

    /**
     * Update announcement
     * Type-safe: Path parameter and request body validated against OpenAPI
     */
    updateAnnouncement: async (id: number, announcementData: any): Promise<ApiResponse<any>> => {
      const response = await typedClient.raw.PUT('/api/v1/admin/announcements/{id}', {
        params: { path: { id } },
        body: announcementData,
      });
      return toApiResponse(response);
    },

    /**
     * Delete announcement
     * Type-safe: Path parameter validated against OpenAPI
     */
    deleteAnnouncement: async (id: number): Promise<ApiResponse<{ message: string }>> => {
      const response = await typedClient.raw.DELETE('/api/v1/admin/announcements/{id}', {
        params: { path: { id } },
      });
      return toApiResponse(response);
    },

    // ========== Scholarship Management ==========

    /**
     * Get scholarship statistics
     * Type-safe: Response type inferred from OpenAPI
     */
    getScholarshipStats: async (): Promise<ApiResponse<Record<string, any>>> => {
      const response = await typedClient.raw.GET('/api/v1/admin/scholarships/stats');
      return toApiResponse(response);
    },

    /**
     * Get applications by scholarship
     * Type-safe: Path parameter and query parameters validated against OpenAPI
     */
    getApplicationsByScholarship: async (
      scholarshipCode: string,
      subType?: string,
      status?: string
    ): Promise<ApiResponse<any[]>> => {
      const response = await typedClient.raw.GET('/api/v1/admin/scholarships/{scholarship_code}/applications', {
        params: {
          path: { scholarship_code: scholarshipCode },
          query: {
            sub_type: subType,
            status,
          },
        },
      });
      return toApiResponse(response);
    },

    /**
     * Get scholarship sub-types
     * Type-safe: Path parameter validated against OpenAPI
     */
    getScholarshipSubTypes: async (scholarshipCode: string): Promise<ApiResponse<any[]>> => {
      const response = await typedClient.raw.GET('/api/v1/admin/scholarships/{scholarship_code}/sub-types', {
        params: { path: { scholarship_code: scholarshipCode } },
      });
      return toApiResponse(response);
    },

    /**
     * Get sub-type translations
     * Type-safe: Response type inferred from OpenAPI
     */
    getSubTypeTranslations: async (): Promise<ApiResponse<Record<string, Record<string, string>>>> => {
      const response = await typedClient.raw.GET('/api/v1/admin/scholarships/sub-type-translations');
      return toApiResponse(response);
    },

    // ========== Workflows (Not Implemented) ==========

    getWorkflows: async (): Promise<ApiResponse<any[]>> => {
      return Promise.resolve({
        success: true,
        data: [],
        message: "Workflows feature coming soon",
      });
    },

    createWorkflow: async (workflow: any): Promise<ApiResponse<any>> => {
      return Promise.resolve({
        success: false,
        message: "Workflows feature not implemented yet",
      });
    },

    updateWorkflow: async (id: string, workflow: any): Promise<ApiResponse<any>> => {
      return Promise.resolve({
        success: false,
        message: "Workflows feature not implemented yet",
      });
    },

    deleteWorkflow: async (id: string): Promise<ApiResponse<{ message: string }>> => {
      return Promise.resolve({
        success: false,
        message: "Workflows feature not implemented yet",
      });
    },

    // ========== Scholarship Rules ==========

    /**
     * Get scholarship rules with filters
     * Type-safe: Query parameters validated against OpenAPI
     */
    getScholarshipRules: async (filters?: any): Promise<ApiResponse<any[]>> => {
      const response = await typedClient.raw.GET('/api/v1/admin/scholarship-rules', {
        params: { query: filters },
      });
      return toApiResponse(response);
    },

    /**
     * Get scholarship rule by ID
     * Type-safe: Path parameter validated against OpenAPI
     */
    getScholarshipRule: async (id: number): Promise<ApiResponse<any>> => {
      const response = await typedClient.raw.GET('/api/v1/admin/scholarship-rules/{id}', {
        params: { path: { id } },
      });
      return toApiResponse(response);
    },

    /**
     * Create scholarship rule
     * Type-safe: Request body validated against OpenAPI
     */
    createScholarshipRule: async (rule: any): Promise<ApiResponse<any>> => {
      const response = await typedClient.raw.POST('/api/v1/admin/scholarship-rules', {
        body: rule,
      });
      return toApiResponse(response);
    },

    /**
     * Update scholarship rule
     * Type-safe: Path parameter and request body validated against OpenAPI
     */
    updateScholarshipRule: async (id: number, rule: any): Promise<ApiResponse<any>> => {
      const response = await typedClient.raw.PUT('/api/v1/admin/scholarship-rules/{id}', {
        params: { path: { id } },
        body: rule,
      });
      return toApiResponse(response);
    },

    /**
     * Delete scholarship rule
     * Type-safe: Path parameter validated against OpenAPI
     */
    deleteScholarshipRule: async (id: number): Promise<ApiResponse<{ message: string }>> => {
      const response = await typedClient.raw.DELETE('/api/v1/admin/scholarship-rules/{id}', {
        params: { path: { id } },
      });
      return toApiResponse(response);
    },

    /**
     * Copy rules between periods
     * Type-safe: Request body validated against OpenAPI
     */
    copyRulesBetweenPeriods: async (copyRequest: any): Promise<ApiResponse<any[]>> => {
      const response = await typedClient.raw.POST('/api/v1/admin/scholarship-rules/copy', {
        body: copyRequest,
      });
      return toApiResponse(response);
    },

    /**
     * Bulk rule operation
     * Type-safe: Request body validated against OpenAPI
     */
    bulkRuleOperation: async (operation: any): Promise<ApiResponse<any>> => {
      const response = await typedClient.raw.POST('/api/v1/admin/scholarship-rules/bulk-operation', {
        body: operation,
      });
      return toApiResponse(response);
    },

    /**
     * Get rule templates
     * Type-safe: Query parameters validated against OpenAPI
     */
    getRuleTemplates: async (scholarship_type_id?: number): Promise<ApiResponse<any[]>> => {
      const response = await typedClient.raw.GET('/api/v1/admin/scholarship-rules/templates', {
        params: { query: { scholarship_type_id } },
      });
      return toApiResponse(response);
    },

    /**
     * Create rule template
     * Type-safe: Request body validated against OpenAPI
     */
    createRuleTemplate: async (templateRequest: any): Promise<ApiResponse<any[]>> => {
      const response = await typedClient.raw.POST('/api/v1/admin/scholarship-rules/create-template', {
        body: templateRequest,
      });
      return toApiResponse(response);
    },

    /**
     * Apply rule template
     * Type-safe: Request body validated against OpenAPI
     */
    applyRuleTemplate: async (templateRequest: any): Promise<ApiResponse<any[]>> => {
      const response = await typedClient.raw.POST('/api/v1/admin/scholarship-rules/apply-template', {
        body: templateRequest,
      });
      return toApiResponse(response);
    },

    /**
     * Delete rule template
     * Type-safe: Path parameter and query parameters validated against OpenAPI
     */
    deleteRuleTemplate: async (
      templateName: string,
      scholarshipTypeId: number
    ): Promise<ApiResponse<{ message: string }>> => {
      const response = await typedClient.raw.DELETE('/api/v1/admin/scholarship-rules/templates/{template_name}', {
        params: {
          path: { template_name: templateName },
          query: { scholarship_type_id: scholarshipTypeId },
        },
      });
      return toApiResponse(response);
    },

    /**
     * Get scholarship rule sub-types
     * Type-safe: Path parameter validated against OpenAPI
     */
    getScholarshipRuleSubTypes: async (scholarshipTypeId: number): Promise<ApiResponse<any[]>> => {
      const response = await typedClient.raw.GET('/api/v1/scholarship-rules/scholarship-types/{scholarship_type_id}/sub-types', {
        params: { path: { scholarship_type_id: scholarshipTypeId } },
      });
      return toApiResponse(response);
    },

    // ========== Scholarship Permissions ==========

    /**
     * Get scholarship permissions
     * Type-safe: Query parameters validated against OpenAPI
     */
    getScholarshipPermissions: async (userId?: number): Promise<ApiResponse<any[]>> => {
      const response = await typedClient.raw.GET('/api/v1/admin/scholarship-permissions', {
        params: { query: { user_id: userId } },
      });
      return toApiResponse(response);
    },

    /**
     * Get current user scholarship permissions
     * Type-safe: Response type inferred from OpenAPI
     */
    getCurrentUserScholarshipPermissions: async (): Promise<ApiResponse<any[]>> => {
      const response = await typedClient.raw.GET('/api/v1/admin/scholarship-permissions/current-user');
      return toApiResponse(response);
    },

    /**
     * Create scholarship permission
     * Type-safe: Request body validated against OpenAPI
     */
    createScholarshipPermission: async (permission: any): Promise<ApiResponse<any>> => {
      const response = await typedClient.raw.POST('/api/v1/admin/scholarship-permissions', {
        body: permission,
      });
      return toApiResponse(response);
    },

    /**
     * Update scholarship permission
     * Type-safe: Path parameter and request body validated against OpenAPI
     */
    updateScholarshipPermission: async (id: number, permission: any): Promise<ApiResponse<any>> => {
      const response = await typedClient.raw.PUT('/api/v1/admin/scholarship-permissions/{id}', {
        params: { path: { id } },
        body: permission,
      });
      return toApiResponse(response);
    },

    /**
     * Delete scholarship permission
     * Type-safe: Path parameter validated against OpenAPI
     */
    deleteScholarshipPermission: async (id: number): Promise<ApiResponse<{ message: string }>> => {
      const response = await typedClient.raw.DELETE('/api/v1/admin/scholarship-permissions/{id}', {
        params: { path: { id } },
      });
      return toApiResponse(response);
    },

    /**
     * Get all scholarships for permissions
     * Type-safe: Response type inferred from OpenAPI
     */
    getAllScholarshipsForPermissions: async (): Promise<ApiResponse<any[]>> => {
      const response = await typedClient.raw.GET('/api/v1/admin/scholarships/all-for-permissions');
      return toApiResponse(response);
    },

    /**
     * Get my scholarships
     * Type-safe: Response type inferred from OpenAPI
     */
    getMyScholarships: async (): Promise<ApiResponse<any[]>> => {
      const response = await typedClient.raw.GET('/api/v1/admin/scholarships/my-scholarships');
      return toApiResponse(response);
    },

    /**
     * Get available semesters
     * Type-safe: Query parameters validated against OpenAPI
     */
    getAvailableSemesters: async (scholarshipCode?: string): Promise<ApiResponse<string[]>> => {
      const response = await typedClient.raw.GET('/api/v1/scholarship-configurations/available-semesters', {
        params: { query: { scholarship_code: scholarshipCode } },
      });
      return toApiResponse(response);
    },

    /**
     * Get available years
     * Type-safe: Response type inferred from OpenAPI
     */
    getAvailableYears: async (): Promise<ApiResponse<number[]>> => {
      const response = await typedClient.raw.GET('/api/v1/admin/scholarships/available-years');
      return toApiResponse(response);
    },

    // ========== Scholarship Configuration Management ==========

    /**
     * Get scholarship config types
     * Type-safe: Response type inferred from OpenAPI
     */
    getScholarshipConfigTypes: async (): Promise<ApiResponse<any[]>> => {
      const response = await typedClient.raw.GET('/api/v1/scholarship-configurations/scholarship-types');
      return toApiResponse(response);
    },

    /**
     * Get scholarship configurations with filters
     * Type-safe: Query parameters validated against OpenAPI
     */
    getScholarshipConfigurations: async (params?: any): Promise<ApiResponse<any[]>> => {
      const response = await typedClient.raw.GET('/api/v1/scholarship-configurations/configurations', {
        params: {
          query: {
            scholarship_type_id: params?.scholarship_type_id,
            academic_year: params?.academic_year,
            semester: params?.semester,
            is_active: params?.is_active,
          },
        },
      });
      return toApiResponse(response);
    },

    /**
     * Get scholarship configuration by ID
     * Type-safe: Path parameter validated against OpenAPI
     */
    getScholarshipConfiguration: async (id: number): Promise<ApiResponse<any>> => {
      const response = await typedClient.raw.GET('/api/v1/scholarship-configurations/configurations/{id}', {
        params: { path: { id } },
      });
      return toApiResponse(response);
    },

    /**
     * Create scholarship configuration
     * Type-safe: Request body validated against OpenAPI
     */
    createScholarshipConfiguration: async (configData: any): Promise<ApiResponse<any>> => {
      const response = await typedClient.raw.POST('/api/v1/scholarship-configurations/configurations', {
        body: configData,
      });
      return toApiResponse(response);
    },

    /**
     * Update scholarship configuration
     * Type-safe: Path parameter and request body validated against OpenAPI
     */
    updateScholarshipConfiguration: async (id: number, configData: any): Promise<ApiResponse<any>> => {
      const response = await typedClient.raw.PUT('/api/v1/scholarship-configurations/configurations/{id}', {
        params: { path: { id } },
        body: configData,
      });
      return toApiResponse(response);
    },

    /**
     * Delete scholarship configuration
     * Type-safe: Path parameter validated against OpenAPI
     */
    deleteScholarshipConfiguration: async (id: number): Promise<ApiResponse<any>> => {
      const response = await typedClient.raw.DELETE('/api/v1/scholarship-configurations/configurations/{id}', {
        params: { path: { id } },
      });
      return toApiResponse(response);
    },

    /**
     * Duplicate scholarship configuration
     * Type-safe: Path parameter and request body validated against OpenAPI
     */
    duplicateScholarshipConfiguration: async (
      id: number,
      targetData: any
    ): Promise<ApiResponse<any>> => {
      const response = await typedClient.raw.POST('/api/v1/scholarship-configurations/configurations/{id}/duplicate', {
        params: { path: { id } },
        body: targetData,
      });
      return toApiResponse(response);
    },

    // ========== Professor Management ==========

    /**
     * Get professors with search
     * Type-safe: Query parameters validated against OpenAPI
     */
    getProfessors: async (search?: string): Promise<ApiResponse<any[]>> => {
      const response = await typedClient.raw.GET('/api/v1/admin/professors', {
        params: { query: { search } },
      });
      return toApiResponse(response);
    },

    /**
     * Assign professor to application
     * Type-safe: Path parameter and request body validated against OpenAPI
     */
    assignProfessor: async (applicationId: number, professorNycuId: string): Promise<ApiResponse<any>> => {
      const response = await typedClient.raw.PUT('/api/v1/admin/applications/{application_id}/assign-professor', {
        params: { path: { application_id: applicationId } },
        body: { professor_nycu_id: professorNycuId },
      });
      return toApiResponse(response);
    },

    /**
     * Get available professors (alias for getProfessors)
     * Type-safe: Query parameters validated against OpenAPI
     */
    getAvailableProfessors: async (search?: string): Promise<ApiResponse<any[]>> => {
      const response = await typedClient.raw.GET('/api/v1/admin/professors', {
        params: { query: { search } },
      });
      return toApiResponse(response);
    },

    // ========== System Configuration Management ==========

    /**
     * Get configurations
     * Type-safe: Response type inferred from OpenAPI
     */
    getConfigurations: async (): Promise<ApiResponse<any[]>> => {
      const response = await typedClient.raw.GET('/api/v1/admin/configurations');
      return toApiResponse(response);
    },

    /**
     * Create configuration
     * Type-safe: Request body validated against OpenAPI
     */
    createConfiguration: async (configData: any): Promise<ApiResponse<any>> => {
      const response = await typedClient.raw.POST('/api/v1/admin/configurations', {
        body: configData,
      });
      return toApiResponse(response);
    },

    /**
     * Update configurations in bulk
     * Type-safe: Request body validated against OpenAPI
     */
    updateConfigurationsBulk: async (configurations: any[]): Promise<ApiResponse<any[]>> => {
      const response = await typedClient.raw.PUT('/api/v1/admin/configurations/bulk', {
        body: configurations,
      });
      return toApiResponse(response);
    },

    /**
     * Validate configuration
     * Type-safe: Request body validated against OpenAPI
     */
    validateConfiguration: async (configData: any): Promise<ApiResponse<any>> => {
      const response = await typedClient.raw.POST('/api/v1/admin/configurations/validate', {
        body: configData,
      });
      return toApiResponse(response);
    },

    /**
     * Delete configuration
     * Type-safe: Path parameter validated against OpenAPI
     */
    deleteConfiguration: async (key: string): Promise<ApiResponse<string>> => {
      const response = await typedClient.raw.DELETE('/api/v1/admin/configurations/{key}', {
        params: { path: { key } },
      });
      return toApiResponse(response);
    },

    // ========== Bank Verification ==========

    /**
     * Verify bank account (admin duplicate of bank-verification module)
     * Type-safe: Request body validated against OpenAPI
     */
    verifyBankAccount: async (applicationId: number): Promise<ApiResponse<any>> => {
      const response = await typedClient.raw.POST('/api/v1/admin/bank-verification', {
        body: { application_id: applicationId },
      });
      return toApiResponse(response);
    },

    /**
     * Verify bank accounts in batch (admin duplicate of bank-verification module)
     * Type-safe: Request body validated against OpenAPI
     */
    verifyBankAccountsBatch: async (applicationIds: number[]): Promise<ApiResponse<any>> => {
      const response = await typedClient.raw.POST('/api/v1/admin/bank-verification/batch', {
        body: { application_ids: applicationIds },
      });
      return toApiResponse(response);
    },

    // ========== Professor-Student Relationships ==========

    /**
     * Get professor-student relationships with filters
     * Type-safe: Query parameters validated against OpenAPI
     */
    getProfessorStudentRelationships: async (params?: any): Promise<ApiResponse<any[]>> => {
      const response = await typedClient.raw.GET('/api/v1/admin/professor-student-relationships', {
        params: {
          query: {
            professor_id: params?.professor_id,
            student_id: params?.student_id,
            is_active: params?.is_active,
          },
        },
      });
      return toApiResponse(response);
    },

    /**
     * Create professor-student relationship
     * Type-safe: Request body validated against OpenAPI
     */
    createProfessorStudentRelationship: async (relationshipData: any): Promise<ApiResponse<any>> => {
      const response = await typedClient.raw.POST('/api/v1/admin/professor-student-relationships', {
        body: relationshipData,
      });
      return toApiResponse(response);
    },
  };
}
