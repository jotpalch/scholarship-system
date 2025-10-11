"use client";

import { AdminScholarshipManagementInterface } from "@/components/admin-scholarship-management-interface";
import { ApplicationDetailDialog } from "@/components/application-detail-dialog";
import { ApplicationAuditTrail } from "@/components/application-audit-trail";
import { DeleteApplicationDialog } from "@/components/delete-application-dialog";
import { ProfessorAssignmentDropdown } from "@/components/professor-assignment-dropdown";
import { SemesterSelector } from "@/components/semester-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useScholarshipSpecificApplications } from "@/hooks/use-admin";
import { toast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";
import { Locale } from "@/lib/validators";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Eye,
  FileText,
  Filter,
  GraduationCap,
  History,
  Loader2,
  Minus,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  ShieldX,
  Trash2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

// Use the Application type from the API
import { useScholarshipPermissions } from "@/hooks/use-scholarship-permissions";
import { Application } from "@/lib/api";
import { User as UserType } from "@/types/user";

interface AdminScholarshipDashboardProps {
  user: UserType;
}

// Dashboard-specific Application interface for the data we actually receive
interface DashboardApplication {
  id: number;
  student_name?: string;
  student_no?: string;
  student_email?: string;
  status: string;
  status_name?: string;
  submitted_at?: string;
  days_waiting?: number;
  scholarship_subtype_list?: string[];
  user?: {
    email: string;
  };
  // Additional fields that might be present
  app_id?: string;
  student_id?: string;
  scholarship_type?: string;
  scholarship_type_id?: number;
  created_at?: string;
  updated_at?: string;
  gpa?: number;
  class_ranking_percent?: number;
  dept_ranking_percent?: number;
  personal_statement?: string;
  form_data?: Record<string, any>;
  submitted_form_data?: {
    fields?: Record<string, any>;
    documents?: Array<{
      file_id?: string | number;
      id?: string | number;
      filename?: string;
      original_filename?: string;
      file_path?: string;
      file_type?: string;
      document_type?: string;
      mime_type?: string;
      file_size?: number;
      download_url?: string;
      upload_time?: string;
      document_id?: string;
    }>;
  };
  agree_terms?: boolean;
  professor_id?: number;
  professor?: {
    id: number;
    name: string;
    nycu_id?: string;
    email?: string;
    error?: boolean;
  };
  reviewer_id?: number;
  final_approver_id?: number;
  review_score?: number;
  review_comments?: string;
  rejection_reason?: string;
  reviewed_at?: string;
  approved_at?: string;
  academic_year?: string;
  semester?: string;
  meta_data?: any;
  // Scholarship configuration for professor review requirements
  scholarship_configuration?: {
    requires_professor_recommendation: boolean;
    requires_college_review: boolean;
    config_name?: string;
  };
  // API response structure
  student_data?: {
    id: number;
    stdNo: string;
    stdCode: string;
    pid: string;
    cname: string;
    ename: string;
    sex: string;
    birthDate: string;
    contacts: {
      cellphone: string;
      email: string;
      zipCode: string;
      address: string;
    };
    academic: {
      degree: number;
      identity: number;
      studyingStatus: number;
      schoolIdentity: number;
      termCount: number;
      depId: number;
      academyId: number;
      enrollTypeCode: number;
      enrollYear: number;
      enrollTerm: number;
      highestSchoolName: string;
      nationality: number;
    };
  };
}

// Data transformation function to map API response to expected format
const transformApplicationData = (app: any): DashboardApplication => {
  console.log("🔍 Transforming application data:", app.app_id);
  console.log("📊 Professor data in raw API response:", app.professor);

  // Ensure submitted_form_data has the correct structure for file preview
  let submittedFormData = app.submitted_form_data;
  if (submittedFormData && submittedFormData.documents) {
    // Transform documents to include necessary file properties for preview
    submittedFormData = {
      ...submittedFormData,
      documents: submittedFormData.documents.map((doc: any) => ({
        ...doc,
        // Map API response fields to expected format for ApplicationDetailDialog
        id: doc.file_id || doc.id || doc.document_id, // Use document_id as fallback
        file_id: doc.file_id || doc.id || doc.document_id,
        filename: doc.filename || doc.original_filename,
        original_filename: doc.original_filename,
        file_path: doc.file_path,
        file_type: doc.document_type || doc.file_type,
        mime_type: doc.mime_type,
        file_size: doc.file_size,
        download_url: doc.download_url,
        upload_time: doc.upload_time,
        // Keep original fields for compatibility
        document_id: doc.document_id,
        document_type: doc.document_type,
      })),
    };
  }

  const transformed = {
    id: app.id,
    app_id: app.app_id,
    student_id: app.student_id,
    scholarship_type: app.scholarship_type,
    scholarship_type_id: app.scholarship_type_id,
    scholarship_subtype_list: app.scholarship_subtype_list || [],
    status: app.status,
    status_name: app.status_name,
    submitted_at: app.submitted_at,
    days_waiting: app.days_waiting,
    created_at: app.created_at,
    updated_at: app.updated_at,
    form_data: app.submitted_form_data || app.form_data,
    submitted_form_data: submittedFormData, // Use the enhanced version
    student_data: app.student_data,
    // Map student information from nested structure
    student_name: app.student_name || app.student_data?.cname || "未知",
    student_no: app.student_no || app.student_data?.stdNo || "N/A",
    user: app.user || {
      email: app.student_data?.contacts?.email || "N/A",
    },
    // Additional fields that might be needed by ApplicationDetailDialog
    gpa: app.gpa,
    class_ranking_percent: app.class_ranking_percent,
    dept_ranking_percent: app.dept_ranking_percent,
    personal_statement: app.personal_statement,
    agree_terms: app.agree_terms,
    professor_id: app.professor_id,
    professor: app.professor,
    reviewer_id: app.reviewer_id,
    final_approver_id: app.final_approver_id,
    review_score: app.review_score,
    review_comments: app.review_comments,
    rejection_reason: app.rejection_reason,
    reviewed_at: app.reviewed_at,
    approved_at: app.approved_at,
    academic_year: app.academic_year,
    semester: app.semester,
    meta_data: app.meta_data,
    // Pass through scholarship configuration for professor review requirements
    scholarship_configuration: app.scholarship_configuration,
  };

  console.log("✅ Transformed result:", transformed.app_id);
  console.log("📋 Professor in transformed data:", transformed.professor);
  console.log("🎯 Professor name in transformed:", transformed.professor?.name);
  console.log("🔢 Professor ID in transformed:", transformed.professor_id);
  console.log("⚙️ Scholarship configuration:", app.scholarship_configuration);
  return transformed;
};

export function AdminScholarshipDashboard({
  user,
}: AdminScholarshipDashboardProps) {
  // 使用 hook 獲取真實資料
  const {
    applicationsByType,
    scholarshipTypes,
    scholarshipStats,
    isLoading,
    error,
    refetch,
    updateApplicationStatus,
  } = useScholarshipSpecificApplications();

  // Get user's scholarship permissions for debugging
  const {
    permissions,
    isLoading: permissionsLoading,
    error: permissionsError,
  } = useScholarshipPermissions();

  // Locale state for internationalization (管理員頁面固定使用中文)
  const [locale] = useState<Locale>("zh");

  // State for sub-type translations from backend
  const [subTypeTranslations, setSubTypeTranslations] = useState<
    Record<string, Record<string, string>>
  >({});
  const [translationsLoading, setTranslationsLoading] = useState(false);
  const [translationsLoaded, setTranslationsLoaded] = useState(false);

  // Debug logging
  console.log("ScholarshipSpecificDashboard render:", {
    scholarshipTypes,
    scholarshipStats,
    applicationsByType,
    isLoading,
    error,
  });

  const [selectedApplication, setSelectedApplication] =
    useState<DashboardApplication | null>(null);
  const [activeTab, setActiveTab] = useState("");
  const [selectedSubTypes, setSelectedSubTypes] = useState<string[]>([]); // 多選子類型
  const [tabLoading, setTabLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showApplicationDetail, setShowApplicationDetail] = useState(false);
  const [selectedApplicationForDetail, setSelectedApplicationForDetail] =
    useState<DashboardApplication | null>(null);
  const [bankVerificationLoading, setBankVerificationLoading] = useState<
    Record<number, boolean>
  >({});
  const [batchVerificationLoading, setBatchVerificationLoading] =
    useState(false);
  const [selectedApplicationsForBatch, setSelectedApplicationsForBatch] =
    useState<number[]>([]);
  // 學期選擇相關狀態
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<number>();
  const [selectedSemester, setSelectedSemester] = useState<string>();
  const [selectedCombination, setSelectedCombination] = useState<string>();

  // 刪除申請相關狀態
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [applicationToDelete, setApplicationToDelete] =
    useState<DashboardApplication | null>(null);

  // 操作紀錄相關狀態
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // 檢查用戶是否可以指派教授
  const canAssignProfessor =
    user && ["admin", "super_admin", "college"].includes(user.role);

  // 處理教授指派回調
  const handleProfessorAssigned = (applicationId: number, professor: any) => {
    // 刷新相應的申請資料
    refetch();
  };

  // 動態獲取各類型申請資料
  const getApplicationsByType = (type: string) => {
    const rawApplications = applicationsByType[type] || [];
    const transformedApplications = rawApplications.map(
      transformApplicationData
    );

    // Debug logging
    if (transformedApplications.length > 0) {
      console.log(
        `Transformed applications for ${type}:`,
        transformedApplications[0]
      );
    }

    return transformedApplications;
  };

  // 獲取當前選擇的獎學金類型的子類型（從後端獲取）
  const getCurrentScholarshipSubTypes = () => {
    if (!activeTab || !scholarshipStats[activeTab]) return [];
    return scholarshipStats[activeTab].sub_types || [];
  };

  // 當獎學金類型載入後，自動選擇第一個類型
  useEffect(() => {
    if (scholarshipTypes.length > 0 && !activeTab) {
      setActiveTab(scholarshipTypes[0]);
    }
  }, [scholarshipTypes, activeTab]);

  // 當獎學金類型改變時，重置子類型選擇和學期選擇
  useEffect(() => {
    setSelectedSubTypes([]);
    setSelectedAcademicYear(undefined);
    setSelectedSemester(undefined);
    setSelectedCombination(undefined);
  }, [activeTab]);

  // 載入子類型翻譯
  useEffect(() => {
    let isMounted = true;

    const loadSubTypeTranslations = async () => {
      if (Object.keys(subTypeTranslations).length > 0) return; // 已經載入過

      setTranslationsLoading(true);
      try {
        const response = await apiClient.admin.getSubTypeTranslations();
        if (response.success && response.data && isMounted) {
          // 儲存完整的翻譯資料
          setSubTypeTranslations(response.data);
          setTranslationsLoaded(true);
        }
      } catch (error) {
        console.error("Failed to load sub-type translations:", error);
      } finally {
        if (isMounted) {
          setTranslationsLoading(false);
        }
      }
    };

    loadSubTypeTranslations();

    return () => {
      isMounted = false;
    };
  }, [subTypeTranslations]);

  // 搜尋和篩選邏輯
  const filterApplications = (applications: DashboardApplication[]) => {
    let filtered = applications;

    // 狀態篩選
    if (statusFilter !== "all") {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    // 學期篩選
    if (selectedAcademicYear) {
      filtered = filtered.filter(app => {
        const appYear = app.academic_year ? parseInt(app.academic_year) : null;
        return appYear === selectedAcademicYear;
      });
    }

    if (selectedSemester) {
      filtered = filtered.filter(app => app.semester === selectedSemester);
    }

    // 搜尋篩選
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        app =>
          app.student_name?.toLowerCase().includes(term) ||
          app.student_no?.toLowerCase().includes(term) ||
          app.user?.email.toLowerCase().includes(term) ||
          app.student_data?.cname?.toLowerCase().includes(term) ||
          app.student_data?.stdNo?.toLowerCase().includes(term) ||
          app.student_data?.contacts?.email?.toLowerCase().includes(term)
      );
    }

    return filtered;
  };

  // 獲取獎學金顯示名稱（從後端資料）
  const getScholarshipDisplayName = (code: string) => {
    if (scholarshipStats[code]) {
      return locale === "zh"
        ? scholarshipStats[code].name
        : scholarshipStats[code].name_en || scholarshipStats[code].name;
    }
    return code;
  };

  // 獲取子類型顯示名稱（從後端獲取）
  const getSubTypeDisplayName = (subType: string, lang: string = locale) => {
    // 使用後端翻譯
    if (subTypeTranslations[lang] && subTypeTranslations[lang][subType]) {
      return subTypeTranslations[lang][subType];
    }

    // 如果當前語言沒有翻譯，嘗試使用中文
    if (
      lang !== "zh" &&
      subTypeTranslations["zh"] &&
      subTypeTranslations["zh"][subType]
    ) {
      return subTypeTranslations["zh"][subType];
    }

    // 如果沒有翻譯，顯示原始代碼
    return subType;
  };

  // 處理申請狀態更新
  const handleStatusUpdate = async (
    applicationId: number,
    newStatus: string
  ) => {
    try {
      await updateApplicationStatus(applicationId, newStatus);
      // 重新載入數據
      refetch();
    } catch (error) {
      console.error("Failed to update application status:", error);
      alert("更新申請狀態失敗");
    }
  };

  // 處理銀行帳戶驗證
  const handleBankVerification = async (applicationId: number) => {
    setBankVerificationLoading(prev => ({ ...prev, [applicationId]: true }));
    try {
      const response =
        await apiClient.bankVerification.verifyBankAccount(applicationId);
      if (response.success) {
        toast({
          title: "銀行驗證成功",
          description: "銀行帳戶驗證已完成",
        });
        refetch(); // 重新載入數據以顯示更新的驗證狀態
      } else {
        toast({
          title: "銀行驗證失敗",
          description: response.message || "無法完成銀行帳戶驗證",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Bank verification error:", error);
      toast({
        title: "銀行驗證錯誤",
        description: "銀行帳戶驗證過程中發生錯誤",
        variant: "destructive",
      });
    } finally {
      setBankVerificationLoading(prev => ({ ...prev, [applicationId]: false }));
    }
  };

  // 處理批量銀行帳戶驗證
  const handleBatchBankVerification = async () => {
    if (selectedApplicationsForBatch.length === 0) {
      toast({
        title: "請選擇申請案件",
        description: "請至少選擇一個申請案件進行批量驗證",
        variant: "destructive",
      });
      return;
    }

    setBatchVerificationLoading(true);
    try {
      const response = await apiClient.bankVerification.verifyBankAccountsBatch(
        selectedApplicationsForBatch
      );
      if (response.success) {
        toast({
          title: "批量銀行驗證成功",
          description: `已完成 ${selectedApplicationsForBatch.length} 個申請案件的銀行帳戶驗證`,
        });
        setSelectedApplicationsForBatch([]);
        refetch(); // 重新載入數據
      } else {
        toast({
          title: "批量銀行驗證失敗",
          description: response.message || "無法完成批量銀行帳戶驗證",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Batch bank verification error:", error);
      toast({
        title: "批量銀行驗證錯誤",
        description: "批量銀行帳戶驗證過程中發生錯誤",
        variant: "destructive",
      });
    } finally {
      setBatchVerificationLoading(false);
    }
  };

  // 處理批量選擇
  const handleBatchSelectionToggle = (applicationId: number) => {
    setSelectedApplicationsForBatch(prev =>
      prev.includes(applicationId)
        ? prev.filter(id => id !== applicationId)
        : [...prev, applicationId]
    );
  };

  // 處理全選/取消全選
  const handleSelectAll = (applications: DashboardApplication[]) => {
    const eligibleApplications = applications
      .filter(app =>
        ["submitted", "under_review", "approved"].includes(app.status)
      )
      .map(app => app.id);

    const allSelected = eligibleApplications.every(id =>
      selectedApplicationsForBatch.includes(id)
    );

    if (allSelected) {
      setSelectedApplicationsForBatch(prev =>
        prev.filter(id => !eligibleApplications.includes(id))
      );
    } else {
      setSelectedApplicationsForBatch(prev => [
        ...new Set([...prev, ...eligibleApplications]),
      ]);
    }
  };

  // 獲取銀行驗證狀態的顯示組件
  const getBankVerificationStatus = (app: DashboardApplication) => {
    // 檢查是否有銀行驗證相關的 meta_data
    const bankVerified = app.meta_data?.bank_verification_status === "verified";
    const bankVerificationFailed =
      app.meta_data?.bank_verification_status === "failed";
    const bankVerificationPending =
      app.meta_data?.bank_verification_status === "pending";

    if (bankVerified) {
      return (
        <div className="flex items-center gap-1 text-green-600">
          <ShieldCheck className="h-4 w-4" />
          <span className="text-xs">已驗證</span>
        </div>
      );
    } else if (bankVerificationFailed) {
      return (
        <div className="flex items-center gap-1 text-red-600">
          <ShieldX className="h-4 w-4" />
          <span className="text-xs">驗證失敗</span>
        </div>
      );
    } else if (bankVerificationPending) {
      return (
        <div className="flex items-center gap-1 text-yellow-600">
          <Shield className="h-4 w-4" />
          <span className="text-xs">驗證中</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1 text-gray-500">
          <CreditCard className="h-4 w-4" />
          <span className="text-xs">未驗證</span>
        </div>
      );
    }
  };

  // 處理學期選擇器變更
  const handleAcademicYearChange = (year: number) => {
    setSelectedAcademicYear(year);
  };

  const handleSemesterChange = (semester: string) => {
    setSelectedSemester(semester);
  };

  const handleCombinationChange = (
    combination: string,
    academicYear: number,
    semester: string | null
  ) => {
    setSelectedCombination(combination);
    setSelectedAcademicYear(academicYear);
    setSelectedSemester(semester || undefined);
  };

  // 取得當前獎學金類型的所有申請操作紀錄（包含已刪除申請的記錄）
  const fetchAuditLogsForCurrentType = async () => {
    if (!activeTab) return;

    setAuditLoading(true);
    try {
      // 使用新的獎學金稽核軌跡端點，一次性獲取所有日誌（包含已刪除申請）
      const response = await apiClient.admin.getScholarshipAuditTrail(activeTab);

      if (response.success && response.data) {
        setAuditLogs(response.data);
        setShowAuditModal(true);
      } else {
        toast({
          title: "載入操作紀錄失敗",
          description: response.message || "無法載入操作紀錄",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
      toast({
        title: "載入操作紀錄失敗",
        description: "無法載入操作紀錄，請稍後再試",
        variant: "destructive",
      });
    } finally {
      setAuditLoading(false);
    }
  };

  // 處理刪除申請成功
  const handleDeleteSuccess = () => {
    setApplicationToDelete(null);
    setShowDeleteDialog(false);
    refetch();

    // 如果操作紀錄 Modal 是開啟的，重新載入
    if (showAuditModal) {
      fetchAuditLogsForCurrentType();
    }

    toast({
      title: "刪除成功",
      description: "申請已成功刪除",
    });
  };

  // 渲染統計卡片
  const renderStatsCards = (applications: DashboardApplication[]) => {
    const totalApplications = applications.length;
    const pendingApplications = applications.filter(app =>
      ["submitted", "under_review"].includes(app.status)
    ).length;
    const approvedApplications = applications.filter(
      app => app.status === "approved"
    ).length;
    const rejectedApplications = applications.filter(
      app => app.status === "rejected"
    ).length;

    return (
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總申請數</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalApplications}</div>
            <p className="text-xs text-muted-foreground">累計申請案件</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待審核</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingApplications}</div>
            <p className="text-xs text-muted-foreground">等待處理案件</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已核准</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedApplications}</div>
            <p className="text-xs text-muted-foreground">核准案件</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已拒絕</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedApplications}</div>
            <p className="text-xs text-muted-foreground">拒絕案件</p>
          </CardContent>
        </Card>
      </div>
    );
  };

  // 渲染申請列表
  const renderApplicationsTable = (
    applications: DashboardApplication[],
    showSubTypes: boolean = false
  ) => {
    const filteredApplications = filterApplications(applications);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            申請案件列表
          </CardTitle>
          <CardDescription>
            共 {filteredApplications.length} 件申請案件
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 批量操作工具列 */}
          {selectedApplicationsForBatch.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    已選擇 {selectedApplicationsForBatch.length} 個申請案件
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedApplicationsForBatch([])}
                    disabled={batchVerificationLoading}
                  >
                    取消選擇
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleBatchBankVerification}
                    disabled={batchVerificationLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {batchVerificationLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        驗證中...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        批量銀行驗證
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 搜尋和篩選 */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Label>搜尋申請人</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜尋姓名、學號或信箱"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>狀態篩選</Label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">全部狀態</option>
                <option value="submitted">已提交</option>
                <option value="under_review">審核中</option>
                <option value="approved">已核准</option>
                <option value="rejected">已拒絕</option>
              </select>
            </div>
          </div>

          {/* 申請列表表格 */}
          {filteredApplications.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        filteredApplications.length > 0 &&
                        filteredApplications
                          .filter(app =>
                            ["submitted", "under_review", "approved"].includes(
                              app.status
                            )
                          )
                          .every(app =>
                            selectedApplicationsForBatch.includes(app.id)
                          )
                      }
                      onCheckedChange={() =>
                        handleSelectAll(filteredApplications)
                      }
                    />
                  </TableHead>
                  <TableHead>申請人</TableHead>
                  <TableHead>學號</TableHead>
                  {showSubTypes && <TableHead>子項目</TableHead>}
                  <TableHead>指派教授</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead>銀行驗證</TableHead>
                  <TableHead>提交時間</TableHead>
                  <TableHead>等待天數</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.map(app => (
                  <TableRow key={app.id}>
                    <TableCell>
                      {["submitted", "under_review", "approved"].includes(
                        app.status
                      ) && (
                        <Checkbox
                          checked={selectedApplicationsForBatch.includes(
                            app.id
                          )}
                          onCheckedChange={() =>
                            handleBatchSelectionToggle(app.id)
                          }
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium whitespace-nowrap">
                        {app.student_name || "未知"}
                      </div>
                      <div className="text-sm text-gray-500 whitespace-nowrap">
                        {app.student_email || app.user?.email || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell>{app.student_no || "N/A"}</TableCell>
                    {showSubTypes && (
                      <TableCell>
                        {app.scholarship_subtype_list &&
                        app.scholarship_subtype_list.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {app.scholarship_subtype_list.map(
                              (subType: string) => (
                                <Badge
                                  key={subType}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {getSubTypeDisplayName(subType)}
                                </Badge>
                              )
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">一般</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      {app.scholarship_configuration
                        ?.requires_professor_recommendation ? (
                        canAssignProfessor &&
                        ["submitted", "under_review"].includes(app.status) ? (
                          app.professor_id ? (
                            // 已指派教授但可以修改
                            <div className="min-w-[200px]">
                              <div className="flex items-center justify-between gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
                                <div className="flex items-center gap-1">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-medium text-green-800">
                                    {(() => {
                                      console.log(
                                        "🎯 Display logic - App:",
                                        app.app_id
                                      );
                                      console.log(
                                        "📋 Professor object:",
                                        app.professor
                                      );
                                      console.log(
                                        "📝 Professor name:",
                                        app.professor?.name
                                      );
                                      console.log(
                                        "🔢 Professor ID:",
                                        app.professor_id
                                      );
                                      const displayName =
                                        app.professor?.name ||
                                        `教授 #${app.professor_id}`;
                                      console.log(
                                        "✨ Final display name:",
                                        displayName
                                      );
                                      return displayName;
                                    })()}
                                  </span>
                                  {app.professor?.error && (
                                    <span className="text-xs text-red-600 ml-1">
                                      (用戶不存在)
                                    </span>
                                  )}
                                  {app.professor?.nycu_id && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-white"
                                    >
                                      {app.professor.nycu_id}
                                    </Badge>
                                  )}
                                </div>
                                <ProfessorAssignmentDropdown
                                  applicationId={app.id}
                                  currentProfessorId={
                                    app.professor?.nycu_id ??
                                    (app.professor_id
                                      ? String(app.professor_id)
                                      : undefined)
                                  }
                                  onAssigned={professor =>
                                    handleProfessorAssigned(app.id, professor)
                                  }
                                  compact={true}
                                />
                              </div>
                            </div>
                          ) : (
                            // 尚未指派教授
                            <div className="min-w-[200px]">
                              <div className="flex items-center justify-between gap-2 p-2 bg-orange-50 border border-orange-200 rounded-md">
                                <div className="flex items-center gap-1">
                                  <AlertCircle className="h-4 w-4 text-orange-600" />
                                  <span className="text-sm font-medium text-orange-800">
                                    待指派教授
                                  </span>
                                </div>
                                <ProfessorAssignmentDropdown
                                  applicationId={app.id}
                                  currentProfessorId={
                                    app.professor?.nycu_id ??
                                    (app.professor_id
                                      ? String(app.professor_id)
                                      : undefined)
                                  }
                                  onAssigned={professor =>
                                    handleProfessorAssigned(app.id, professor)
                                  }
                                />
                              </div>
                            </div>
                          )
                        ) : app.professor_id ? (
                          // 已指派教授但無法修改（只顯示）
                          <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium text-green-800">
                                {(() => {
                                  console.log(
                                    "🎯 Display logic (readonly) - App:",
                                    app.app_id
                                  );
                                  console.log(
                                    "📋 Professor object:",
                                    app.professor
                                  );
                                  console.log(
                                    "📝 Professor name:",
                                    app.professor?.name
                                  );
                                  console.log(
                                    "🔢 Professor ID:",
                                    app.professor_id
                                  );
                                  const displayName =
                                    app.professor?.name ||
                                    `教授 #${app.professor_id}`;
                                  console.log(
                                    "✨ Final display name:",
                                    displayName
                                  );
                                  return displayName;
                                })()}
                              </span>
                              {app.professor?.error && (
                                <span className="text-xs text-red-600 ml-1">
                                  (用戶不存在)
                                </span>
                              )}
                              {app.professor?.nycu_id && (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-white"
                                >
                                  {app.professor.nycu_id}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ) : (
                          // 待指派狀態（無法修改）
                          <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-md">
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                            <span className="text-sm font-medium text-orange-800">
                              待指派教授
                            </span>
                          </div>
                        )
                      ) : (
                        // 不需要教授推薦的獎學金
                        <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-md">
                          <Minus className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">不需要</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge
                        variant={
                          app.status === "approved"
                            ? "default"
                            : app.status === "rejected"
                              ? "destructive"
                              : app.status === "submitted"
                                ? "secondary"
                                : "outline"
                        }
                      >
                        {app.status_name || app.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getBankVerificationStatus(app)}
                        {!app.meta_data?.bank_verification_status &&
                          ["submitted", "under_review", "approved"].includes(
                            app.status
                          ) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleBankVerification(app.id)}
                              disabled={bankVerificationLoading[app.id]}
                              className="text-xs h-6 px-2"
                            >
                              {bankVerificationLoading[app.id] ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  驗證中
                                </>
                              ) : (
                                <>
                                  <CreditCard className="h-3 w-3 mr-1" />
                                  驗證
                                </>
                              )}
                            </Button>
                          )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {app.submitted_at
                        ? new Date(app.submitted_at).toLocaleDateString("zh-TW")
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {app.days_waiting !== undefined
                        ? `${app.days_waiting}天`
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {/* 1️⃣ 查看按鈕（最左邊） */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedApplicationForDetail(app);
                            setShowApplicationDetail(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {/* 2️⃣ 核准/拒絕按鈕（中間） */}
                        {app.status === "submitted" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleStatusUpdate(app.id, "approved")
                              }
                              className="hover:bg-green-50 hover:border-green-300 hover:text-green-600"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleStatusUpdate(app.id, "rejected")
                              }
                              className="hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}

                        {/* 3️⃣ 刪除按鈕（最右邊） */}
                        {(app.status === "draft" || app.status === "submitted") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setApplicationToDelete(app);
                              setShowDeleteDialog(true);
                            }}
                            className="hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">尚無申請案件</p>
              <p className="text-sm mt-2">目前沒有符合條件的申請案件</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // 處理子類型選擇
  const handleSubTypeToggle = (subType: string) => {
    setSelectedSubTypes(prev => {
      if (prev.includes(subType)) {
        return prev.filter(type => type !== subType);
      } else {
        return [...prev, subType];
      }
    });
  };

  // 過濾申請數據根據選擇的子類型
  const filterApplicationsBySubTypes = (
    applications: DashboardApplication[]
  ) => {
    if (selectedSubTypes.length === 0) {
      return applications; // 如果沒有選擇子類型，顯示全部
    }

    // 這裡需要根據實際的申請數據結構來過濾
    // 暫時返回全部，實際實現時需要根據 scholarship_subtype_list 來過濾
    return applications.filter(app => {
      // 如果申請有子類型信息，檢查是否匹配
      if (
        app.scholarship_subtype_list &&
        Array.isArray(app.scholarship_subtype_list)
      ) {
        return app.scholarship_subtype_list.some((subType: string) =>
          selectedSubTypes.includes(subType)
        );
      }
      return true; // 如果沒有子類型信息，暫時顯示
    });
  };

  // 渲染子類型多選標籤頁
  const renderSubTypeTabs = (applications: DashboardApplication[]) => {
    const subTypes = getCurrentScholarshipSubTypes();

    if (subTypes.length === 0) {
      // 沒有子類型的獎學金，直接顯示統計卡片和申請列表
      return (
        <div className="space-y-6">
          {renderStatsCards(applications)}
          {renderApplicationsTable(applications, false)}
        </div>
      );
    }

    // 過濾掉 "general" 類型，只顯示其他子類型
    const filteredSubTypes = subTypes.filter(
      (subType: string) => subType !== "general"
    );

    // 如果沒有其他子類型，直接顯示申請列表
    if (filteredSubTypes.length === 0) {
      // 只有 "general" 類型的獎學金，顯示統計卡片和申請列表
      return (
        <div className="space-y-6">
          {renderStatsCards(applications)}
          {renderApplicationsTable(applications, false)}
        </div>
      );
    }

    // 過濾申請數據
    const filteredApplications = filterApplicationsBySubTypes(applications);

    return (
      <div className="space-y-6">
        {/* 子類型選擇器卡片 */}
        <Card className="border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Filter className="h-5 w-5 text-blue-600" />
              選擇子類型篩選
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              勾選您想要查看的子類型，可多選。未選擇任何項目時將顯示全部申請。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 子類型選項 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredSubTypes.map((subType: string) => (
                <div
                  key={subType}
                  className={`flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer hover:bg-gray-50 ${
                    selectedSubTypes.includes(subType)
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white"
                  }`}
                  onClick={() => handleSubTypeToggle(subType)}
                >
                  <Checkbox
                    checked={selectedSubTypes.includes(subType)}
                    onCheckedChange={() => handleSubTypeToggle(subType)}
                    className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <div className="flex-1">
                    <Label className="text-sm font-medium cursor-pointer">
                      {getSubTypeDisplayName(subType)}
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      子類型代碼: {subType}
                    </p>
                  </div>
                  {selectedSubTypes.includes(subType) && (
                    <Badge
                      variant="secondary"
                      className="bg-blue-100 text-blue-800"
                    >
                      已選
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            {/* 操作按鈕 */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-gray-600">
                {selectedSubTypes.length > 0 ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    已選擇 {selectedSubTypes.length} 個子類型:
                    <span className="font-medium">
                      {selectedSubTypes
                        .map(type => getSubTypeDisplayName(type))
                        .join(", ")}
                    </span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    未選擇任何子類型，顯示全部申請
                  </span>
                )}
              </div>

              {selectedSubTypes.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSubTypes([])}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  清除選擇
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 篩選結果統計 */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  篩選結果
                </h3>
                <p className="text-sm text-gray-600">
                  共找到 {filteredApplications.length} 筆申請
                  {selectedSubTypes.length > 0 && (
                    <span className="ml-2 text-blue-600">
                      (已篩選:{" "}
                      {selectedSubTypes
                        .map(type => getSubTypeDisplayName(type))
                        .join(", ")}
                      )
                    </span>
                  )}
                </p>
              </div>
              <Badge
                variant="outline"
                className="text-blue-700 border-blue-300"
              >
                {filteredApplications.length} 筆
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* 申請列表 */}
        {renderStatsCards(filteredApplications)}
        {renderApplicationsTable(filteredApplications, true)}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
          <span className="text-gray-600">載入獎學金資料中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
        <h2 className="text-2xl font-bold text-red-600 mb-2">載入失敗</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <Button onClick={refetch} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          重試
        </Button>
      </div>
    );
  }

  if (scholarshipTypes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium">尚無獎學金資料</p>
        <p className="text-sm mt-2">請先建立獎學金類型</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">獎學金申請管理</h2>
          <p className="text-muted-foreground">
            管理各類型獎學金申請案件 -{" "}
            {user.role === "super_admin"
              ? "超級管理員"
              : user.role === "admin"
                ? "管理員"
                : user.role === "college"
                  ? "學院審核人員"
                  : user.role === "professor"
                    ? "教授"
                    : "未知角色"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchAuditLogsForCurrentType}
            variant="outline"
            disabled={auditLoading || !activeTab}
          >
            {auditLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                載入中...
              </>
            ) : (
              <>
                <History className="h-4 w-4 mr-2" />
                操作紀錄
              </>
            )}
          </Button>
          <Button onClick={refetch} variant="outline" disabled={isLoading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            重新整理
          </Button>
        </div>
      </div>

      {/* 獎學金類型標籤頁 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList
          className="grid w-full"
          style={{
            gridTemplateColumns: `repeat(${scholarshipTypes.length}, 1fr)`,
          }}
        >
          {scholarshipTypes.map(type => (
            <TabsTrigger key={type} value={type} className="text-sm">
              {getScholarshipDisplayName(type)}
            </TabsTrigger>
          ))}
        </TabsList>

        {scholarshipTypes.map(type => (
          <TabsContent key={type} value={type} className="space-y-6">
            {/* 學期選擇器 */}
            <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                      <Calendar className="h-5 w-5 text-green-600" />
                      學期篩選
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600 mt-1">
                      選擇要查看的學年學期，可以篩選對應時期的申請案件
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <SemesterSelector
                      mode="combined"
                      scholarshipCode={type}
                      showStatistics={false}
                      selectedAcademicYear={selectedAcademicYear}
                      selectedSemester={selectedSemester}
                      selectedCombination={selectedCombination}
                      onAcademicYearChange={handleAcademicYearChange}
                      onSemesterChange={handleSemesterChange}
                      onCombinationChange={handleCombinationChange}
                    />
                    {(selectedAcademicYear ||
                      selectedSemester ||
                      selectedCombination) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAcademicYear(undefined);
                          setSelectedSemester(undefined);
                          setSelectedCombination(undefined);
                        }}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        清除篩選
                      </Button>
                    )}
                  </div>
                </div>

                {/* 顯示當前篩選狀態 */}
                {(selectedAcademicYear || selectedSemester) && (
                  <div className="mt-4 p-3 bg-white rounded-lg border border-green-200">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">當前篩選: </span>
                      {selectedAcademicYear && (
                        <Badge variant="outline" className="mr-2">
                          學年: {selectedAcademicYear}
                        </Badge>
                      )}
                      {selectedSemester && (
                        <Badge variant="outline" className="mr-2">
                          學期: {selectedSemester}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardHeader>
            </Card>

            {renderSubTypeTabs(getApplicationsByType(type))}
          </TabsContent>
        ))}
      </Tabs>
      {/* 申請詳情 Modal */}
      <ApplicationDetailDialog
        isOpen={showApplicationDetail}
        onClose={() => {
          setShowApplicationDetail(false);
          setSelectedApplicationForDetail(null);
        }}
        application={
          selectedApplicationForDetail
            ? (selectedApplicationForDetail as Application)
            : null
        }
        locale={locale}
        user={user}
      />

      {/* 操作紀錄 Modal */}
      <Dialog open={showAuditModal} onOpenChange={setShowAuditModal}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-blue-600" />
              操作紀錄
            </DialogTitle>
            <DialogDescription>
              查看當前獎學金類型的所有申請操作記錄
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {auditLogs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>時間</TableHead>
                    <TableHead>操作人員</TableHead>
                    <TableHead>申請編號</TableHead>
                    <TableHead>學生姓名</TableHead>
                    <TableHead>操作類型</TableHead>
                    <TableHead>說明</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-sm">
                        {new Date(log.created_at || log.timestamp).toLocaleString("zh-TW")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.user_name || log.user?.name || "系統"}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {log.app_id}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.student_name || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {log.description || "無說明"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <History className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">尚無操作記錄</p>
                <p className="text-sm mt-2">目前沒有任何操作記錄</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 刪除申請 Dialog */}
      {applicationToDelete && (
        <DeleteApplicationDialog
          open={showDeleteDialog}
          onOpenChange={(open) => {
            setShowDeleteDialog(open);
            if (!open) {
              setApplicationToDelete(null);
            }
          }}
          applicationId={applicationToDelete.id}
          applicationName={`${applicationToDelete.app_id || 'N/A'} - ${applicationToDelete.student_name || '未知'}`}
          onSuccess={handleDeleteSuccess}
          locale="zh"
          requireReason={true}
        />
      )}

      {/* 獎學金管理面板 */}
      {activeTab && (
        <div className="mt-8">
          <AdminScholarshipManagementInterface
            type={activeTab as any}
            className="border-t pt-6"
          />
        </div>
      )}
    </div>
  );
}
