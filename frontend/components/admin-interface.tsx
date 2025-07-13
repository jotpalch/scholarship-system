"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Settings, Users, FileText, Database, Upload, Download, Play, Pause, Edit, Plus, Mail, Save, Eye, MessageSquare, AlertCircle, Trash2, RefreshCw, Clock, Timer, X } from "lucide-react"
import apiClient, { EmailTemplate, NotificationResponse, AnnouncementCreate, AnnouncementUpdate, UserListResponse, UserStats, UserCreate, Workflow, ScholarshipRule, SystemStats, ScholarshipPermission } from "@/lib/api"
import { UserEditModal } from "@/components/user-edit-modal"
import { Modal } from "@/components/ui/modal"



interface User {
  id: string
  nycu_id: string
  name: string
  email: string
  role: "student" | "professor" | "college" | "admin" | "super_admin"
  user_type?: 'student' | 'employee'
  status?: '在學' | '畢業' | '在職' | '退休'
  dept_code?: string
  dept_name?: string
  comment?: string
  last_login_at?: string
  created_at: string
  updated_at: string
  raw_data?: {
    chinese_name?: string
    english_name?: string
    [key: string]: any
  }
}

interface AdminInterfaceProps {
  user: User
}

const EMAIL_TEMPLATE_KEYS = [
  {
    key: "professor_notify",
    label: "教授推薦通知"
  },
  {
    key: "college_notify",
    label: "學院審查通知"
  }
];

const TEMPLATE_VARIABLES: Record<string, string[]> = {
  professor_notify: ["app_id", "professor_name"],
  college_notify: ["app_id"]
};

const DRAGGABLE_VARIABLES: Record<string, { label: string; desc: string }[]> = {
  professor_notify: [
    { label: "app_id", desc: "申請案編號" },
    { label: "professor_name", desc: "教授姓名" },
    { label: "student_name", desc: "學生姓名" },
    { label: "scholarship_type", desc: "獎學金類型" },
    { label: "submit_date", desc: "申請日期" },
    { label: "professor_email", desc: "教授信箱" }
  ],
  college_notify: [
    { label: "app_id", desc: "申請案編號" },
    { label: "student_name", desc: "學生姓名" },
    { label: "scholarship_type", desc: "獎學金類型" },
    { label: "submit_date", desc: "申請日期" },
    { label: "review_deadline", desc: "審核截止日" },
    { label: "college_name", desc: "學院名稱" }
  ]
};

export function AdminInterface({ user }: AdminInterfaceProps) {
  // 工作流程狀態
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loadingWorkflows, setLoadingWorkflows] = useState(false)
  const [workflowsError, setWorkflowsError] = useState<string | null>(null)

  // 獎學金規則狀態
  const [scholarshipRules, setScholarshipRules] = useState<ScholarshipRule[]>([])
  const [loadingRules, setLoadingRules] = useState(false)
  const [rulesError, setRulesError] = useState<string | null>(null)

  // 系統統計狀態
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    activeApplications: 0,
    completedReviews: 0,
    systemUptime: "0%",
    avgResponseTime: "0ms",
    storageUsed: "0TB",
    pendingReviews: 0,
    totalScholarships: 0
  })
  const [loadingStats, setLoadingStats] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)

  const [emailTab, setEmailTab] = useState(EMAIL_TEMPLATE_KEYS[0].key);
  const [emailTemplate, setEmailTemplate] = useState<EmailTemplate | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [saving, setSaving] = useState(false);

  // 系統公告相關狀態
  const [announcements, setAnnouncements] = useState<NotificationResponse[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [announcementsError, setAnnouncementsError] = useState<string | null>(null);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<NotificationResponse | null>(null);
  const [announcementForm, setAnnouncementForm] = useState<AnnouncementCreate>({
    title: '',
    message: '',
    notification_type: 'info',
    priority: 'normal'
  });
  const [announcementPagination, setAnnouncementPagination] = useState({
    page: 1,
    size: 10,
    total: 0,
  });

  // 使用者管理相關狀態
  const [users, setUsers] = useState<UserListResponse[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({
    total_users: 0,
    role_distribution: {},
    active_users: 0,
    inactive_users: 0,
    recent_registrations: 0
  });
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListResponse | null>(null);
  const [userForm, setUserForm] = useState<UserCreate>({
    nycu_id: '',
    email: '',
    name: '',
    role: 'student',
    user_type: 'student',
    status: '在學',
    dept_code: '',
    dept_name: '',
    comment: '',
    raw_data: {
      chinese_name: '',
      english_name: ''
    },
    // 向後相容性欄位
    username: '',
    full_name: '',
    chinese_name: '',
    english_name: '',
    password: '',
    student_no: ''
  });
  const [userPagination, setUserPagination] = useState({
    page: 1,
    size: 10,
    total: 0
  });
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userFormLoading, setUserFormLoading] = useState(false);

  // 獎學金權限管理狀態
  const [scholarshipPermissions, setScholarshipPermissions] = useState<ScholarshipPermission[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);
  const [availableScholarships, setAvailableScholarships] = useState<Array<{ id: number; name: string; name_en?: string; code: string }>>([]);
  const [loadingScholarships, setLoadingScholarships] = useState(false);


  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const loadTemplate = async () => {
      setLoadingTemplate(true);
      try {
        const response = await apiClient.admin.getEmailTemplate(emailTab);
        if (response.success && response.data) {
          setEmailTemplate(response.data);
        } else {
          // Initialize with empty template if none exists
          setEmailTemplate({
            key: emailTab,
            subject_template: "",
            body_template: "",
            cc: null,
            bcc: null,
            updated_at: null
          });
        }
      } catch (error) {
        console.error("Failed to load email template:", error);
        // Initialize with empty template on error
        setEmailTemplate({
          key: emailTab,
          subject_template: "",
          body_template: "",
          cc: null,
          bcc: null,
          updated_at: null
        });
      } finally {
        setLoadingTemplate(false);
      }
    };
    loadTemplate();
  }, [emailTab]);

  const handleTemplateChange = (field: keyof EmailTemplate, value: string) => {
    setEmailTemplate((prev) => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
  };

  const handleDropVariable = (variable: string, field: "subject_template" | "body_template", e: React.DragEvent) => {
    e.preventDefault();
    const ref = field === "subject_template" ? subjectRef : bodyRef;
    if (!ref.current || !emailTemplate) return;
    
    const el = ref.current;
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const old = emailTemplate[field] || "";
    const newValue = old.slice(0, start) + `{${variable}}` + old.slice(end);
    handleTemplateChange(field, newValue);
    
    // Set cursor position after the inserted variable
    setTimeout(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + `{${variable}}`.length;
    }, 0);
  };

  const handleSaveTemplate = async () => {
    if (!emailTemplate) return;
    setSaving(true);
    try {
      const response = await apiClient.admin.updateEmailTemplate(emailTemplate);
      if (response.success && response.data) {
        setEmailTemplate(response.data);
      }
    } catch (error) {
      console.error("Failed to save email template:", error);
    } finally {
      setSaving(false);
    }
  };

  // 系統公告相關函數
  const fetchAnnouncements = async () => {
    // 檢查用戶認證狀態
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      setAnnouncementsError('用戶未認證或不具有管理員權限');
      setLoadingAnnouncements(false);
      return;
    }

    setLoadingAnnouncements(true);
    setAnnouncementsError(null);
    
    try {
      const response = await apiClient.admin.getAllAnnouncements(
        announcementPagination.page,
        announcementPagination.size
      );
      
      if (response.success && response.data) {
        setAnnouncements(response.data.items || []);
        setAnnouncementPagination(prev => ({
          ...prev,
          total: response.data?.total || 0
        }));
        // 清除錯誤信息
        setAnnouncementsError(null);
      } else {
        const errorMsg = response.message || '獲取公告失敗';
        setAnnouncementsError(errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '網絡錯誤，請檢查連接';
      setAnnouncementsError(errorMsg);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  const handleAnnouncementFormChange = (field: keyof AnnouncementCreate, value: string) => {
    setAnnouncementForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateAnnouncement = async () => {
    if (!announcementForm.title || !announcementForm.message) return;
    
    try {
      const response = await apiClient.admin.createAnnouncement(announcementForm);
      
      if (response.success) {
        setShowAnnouncementForm(false);
        setAnnouncementForm({ title: '', message: '', notification_type: 'info', priority: 'normal' });
        fetchAnnouncements();
      } else {
        alert('創建公告失敗: ' + (response.message || '未知錯誤'));
      }
    } catch (error) {
      alert('創建公告失敗: ' + (error instanceof Error ? error.message : '網絡錯誤'));
    }
  };

  const handleUpdateAnnouncement = async () => {
    if (!editingAnnouncement || !announcementForm.title || !announcementForm.message) return;
    
    try {
      const response = await apiClient.admin.updateAnnouncement(editingAnnouncement.id, announcementForm as AnnouncementUpdate);
      
      if (response.success) {
        setEditingAnnouncement(null);
        setShowAnnouncementForm(false);
        setAnnouncementForm({ title: '', message: '', notification_type: 'info', priority: 'normal' });
        fetchAnnouncements();
      } else {
        alert('更新公告失敗: ' + (response.message || '未知錯誤'));
      }
    } catch (error) {
      alert('更新公告失敗: ' + (error instanceof Error ? error.message : '網絡錯誤'));
    }
  };

  const handleDeleteAnnouncement = async (id: number) => {
    if (!confirm('確定要刪除此公告嗎？')) return;
    
    try {
      const response = await apiClient.admin.deleteAnnouncement(id);
      
      if (response.success) {
        fetchAnnouncements();
      } else {
        alert('刪除公告失敗: ' + (response.message || '未知錯誤'));
      }
    } catch (error) {
      alert('刪除公告失敗: ' + (error instanceof Error ? error.message : '網絡錯誤'));
    }
  };

  const handleEditAnnouncement = (announcement: NotificationResponse) => {
    setEditingAnnouncement(announcement);
    setAnnouncementForm({
      title: announcement.title,
      title_en: announcement.title_en,
      message: announcement.message,
      message_en: announcement.message_en,
      notification_type: announcement.notification_type as any,
      priority: announcement.priority as any,
      action_url: announcement.action_url,
      expires_at: announcement.expires_at,
      metadata: announcement.metadata
    });
    setShowAnnouncementForm(true);
  };

  const resetAnnouncementForm = () => {
    setShowAnnouncementForm(false);
    setEditingAnnouncement(null);
    setAnnouncementForm({ title: '', message: '', notification_type: 'info', priority: 'normal' });
  };

  // 載入系統公告
  useEffect(() => {
    // 檢查用戶是否已認證且具有管理員權限
    if (user && (user.role === 'admin' || user.role === 'super_admin')) {
      fetchAnnouncements();
    }
  }, [announcementPagination.page, announcementPagination.size, user]);

  // 使用者管理相關函數
  const fetchUsers = async () => {
    setLoadingUsers(true);
    setUsersError(null);
    
    try {
      const params: any = {
        page: userPagination.page,
        size: userPagination.size,
        roles: 'college,admin,super_admin,professor' // 包含教授角色，因為新用戶預設為教授
      };
      
      if (userSearch) params.search = userSearch;
      if (userRoleFilter) params.role = userRoleFilter;
      
      const response = await apiClient.users.getAll(params);
      
      if (response.success && response.data) {
        // 先過濾出管理角色和教授的使用者
        const managementUsers = (response.data.items || []).filter((user: any) => 
          ['college', 'admin', 'super_admin', 'professor'].includes(user.role)
        );
        
        // 對使用者列表進行角色排序
        const sortedUsers = managementUsers.sort((a, b) => {
          const roleOrder = {
            'super_admin': 1,
            'admin': 2,
            'college': 3,
            'professor': 4
          };
          
          const aOrder = roleOrder[a.role as keyof typeof roleOrder] || 999;
          const bOrder = roleOrder[b.role as keyof typeof roleOrder] || 999;
          
          return aOrder - bOrder;
        });
        
        setUsers(sortedUsers);
        setUserPagination(prev => ({
          ...prev,
          total: sortedUsers.length // 使用過濾後的數量
        }));
      } else {
        const errorMsg = response.message || '獲取使用者失敗';
        setUsersError(errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '網絡錯誤';
      setUsersError(errorMsg);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await apiClient.users.getStats();
      if (response.success && response.data) {
        setUserStats(response.data);
      }
    } catch (error) {
      console.error('獲取使用者統計失敗:', error);
    }
  };

  const handleUserFormChange = (field: keyof UserCreate, value: any) => {
    setUserForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateUser = async () => {
    if (!userForm.nycu_id || !userForm.role) return;
    
    setUserFormLoading(true);
    
    try {
      const response = await apiClient.users.create(userForm);
      
      if (response.success) {
        setShowUserForm(false);
        resetUserForm();
        fetchUsers();
        fetchUserStats();
      } else {
        alert('建立使用者權限失敗: ' + (response.message || '未知錯誤'));
      }
    } catch (error) {
      alert('建立使用者權限失敗: ' + (error instanceof Error ? error.message : '網絡錯誤'));
    } finally {
      setUserFormLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !userForm.role) return;
    
    setUserFormLoading(true);
    
    try {
      const response = await apiClient.users.update(editingUser.id, userForm);
      
      if (response.success) {
        setEditingUser(null);
        setShowUserForm(false);
        resetUserForm();
        fetchUsers();
      } else {
        alert('更新使用者權限失敗: ' + (response.message || '未知錯誤'));
      }
    } catch (error) {
      alert('更新使用者權限失敗: ' + (error instanceof Error ? error.message : '網絡錯誤'));
    } finally {
      setUserFormLoading(false);
    }
  };



  const handleEditUser = (user: UserListResponse) => {
    setEditingUser(user);
    setUserForm({
      nycu_id: user.nycu_id,
      email: user.email,
      name: user.name,
      role: user.role as any,
      user_type: user.user_type as any,
      status: user.status as any,
      dept_code: user.dept_code || '',
      dept_name: user.dept_name || '',
      comment: user.comment || '',
      raw_data: {
        chinese_name: user.raw_data?.chinese_name || '',
        english_name: user.raw_data?.english_name || ''
      },
      // 向後相容性欄位
      username: user.username || '',
      full_name: user.full_name || '',
      chinese_name: user.chinese_name || '',
      english_name: user.english_name || '',
      password: '', // 編輯時不需要密碼
      student_no: user.student_no || ''
    });
    setShowUserForm(true);
  };

  const resetUserForm = () => {
    setShowUserForm(false);
    setEditingUser(null);
    setUserForm({
      nycu_id: '',
      email: '',
      name: '',
      role: 'college',
      user_type: 'student',
      status: '在學',
      dept_code: '',
      dept_name: '',
      comment: '',
      raw_data: {
        chinese_name: '',
        english_name: ''
      },
      // 向後相容性欄位
      username: '',
      full_name: '',
      chinese_name: '',
      english_name: '',
      password: '',
      student_no: ''
    });
  };

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      student: '學生',
      professor: '教授',
      college: '學院',
      admin: '管理員',
      super_admin: '超級管理員'
    };
    return roleMap[role] || role;
  };

  // 處理搜尋和篩選 - 重置到第一頁
  const handleSearch = () => {
    setUserPagination(prev => ({ ...prev, page: 1 }));
    // fetchUsers() 會由 useEffect 自動觸發
  };

  // 清除篩選條件
  const clearFilters = () => {
    setUserSearch('');
    setUserRoleFilter('');
    setUserPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleUserSubmit = () => {
    if (editingUser) {
      handleUpdateUser();
    } else {
      handleCreateUser();
    }
  };

  // 載入使用者數據
  useEffect(() => {
    fetchUsers();
  }, [userPagination.page, userPagination.size, userSearch, userRoleFilter]);

  // 載入使用者統計（只在初次載入時執行）
  useEffect(() => {
    fetchUserStats();
  }, []);

  // 載入系統管理數據（只在初次載入時執行）
  useEffect(() => {
    fetchWorkflows();
    fetchScholarshipRules();
    fetchSystemStats();
    fetchScholarshipPermissions();
    fetchAvailableScholarships();
  }, []);

  // 獲取工作流程列表
  const fetchWorkflows = async () => {
    setLoadingWorkflows(true);
    setWorkflowsError(null);
    
    try {
      const response = await apiClient.admin.getWorkflows();
      if (response.success && response.data) {
        setWorkflows(response.data);
      } else {
        setWorkflowsError(response.message || '獲取工作流程失敗');
      }
    } catch (error) {
      setWorkflowsError(error instanceof Error ? error.message : '網絡錯誤');
    } finally {
      setLoadingWorkflows(false);
    }
  };

  // 獲取獎學金規則列表
  const fetchScholarshipRules = async () => {
    setLoadingRules(true);
    setRulesError(null);
    
    try {
      const response = await apiClient.admin.getScholarshipRules();
      if (response.success && response.data) {
        setScholarshipRules(response.data);
      } else {
        setRulesError(response.message || '獲取獎學金規則失敗');
      }
    } catch (error) {
      setRulesError(error instanceof Error ? error.message : '網絡錯誤');
    } finally {
      setLoadingRules(false);
    }
  };

  // 獲取系統統計
  const fetchSystemStats = async () => {
    setLoadingStats(true);
    setStatsError(null);
    
    try {
      const response = await apiClient.admin.getSystemStats();
      if (response.success && response.data) {
        setSystemStats(response.data);
      } else {
        setStatsError(response.message || '獲取系統統計失敗');
      }
    } catch (error) {
      setStatsError(error instanceof Error ? error.message : '網絡錯誤');
    } finally {
      setLoadingStats(false);
    }
  };

  // 獲取獎學金權限列表
  const fetchScholarshipPermissions = async () => {
    setLoadingPermissions(true);
    setPermissionsError(null);
    
    try {
      const response = await apiClient.admin.getScholarshipPermissions();
      if (response.success && response.data) {
        setScholarshipPermissions(response.data);
      } else {
        setPermissionsError(response.message || '獲取獎學金權限失敗');
      }
    } catch (error) {
      setPermissionsError(error instanceof Error ? error.message : '網絡錯誤');
    } finally {
      setLoadingPermissions(false);
    }
  };

  // 獲取可用獎學金列表
  const fetchAvailableScholarships = async () => {
    setLoadingScholarships(true);
    
    try {
      const response = await apiClient.admin.getAllScholarshipsForPermissions();
      if (response.success && response.data) {
        setAvailableScholarships(response.data);
      }
    } catch (error) {
      console.error('獲取獎學金列表失敗:', error);
    } finally {
      setLoadingScholarships(false);
    }
  };




  // 檢查用戶認證和權限
  if (!user) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
          <h2 className="text-2xl font-bold text-red-600 mb-2">需要登入</h2>
          <p className="text-gray-600 mb-6">您需要登入才能訪問系統管理功能</p>
          <Button 
            onClick={() => window.location.href = '/dev-login'}
            className="nycu-gradient text-white"
          >
            前往登入
          </Button>
        </div>
      </div>
    );
  }

  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
          <h2 className="text-2xl font-bold text-red-600 mb-2">權限不足</h2>
          <p className="text-gray-600 mb-6">您沒有權限訪問系統管理功能</p>
          <p className="text-sm text-gray-500">當前角色: {getRoleLabel(user.role)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">系統管理</h2>
          <p className="text-muted-foreground">管理系統設定、工作流程與使用者權限</p>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="dashboard">系統概覽</TabsTrigger>
          <TabsTrigger value="users">使用者權限</TabsTrigger>
          <TabsTrigger value="rules">審核規則</TabsTrigger>
          <TabsTrigger value="announcements">系統公告</TabsTrigger>
          <TabsTrigger value="email">郵件模板管理</TabsTrigger>
          <TabsTrigger value="settings">系統設定</TabsTrigger>
          <TabsTrigger value="workflows">工作流程</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          {loadingStats ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-nycu-blue-600 border-t-transparent"></div>
                <span className="text-nycu-navy-600">載入系統統計中...</span>
              </div>
            </div>
          ) : statsError ? (
            <div className="text-center py-12">
              <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
              <p className="text-lg font-medium text-red-600 mb-2">載入系統統計失敗</p>
              <p className="text-sm text-gray-600 mb-4">{statsError}</p>
              <Button 
                onClick={fetchSystemStats}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                重試
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">總使用者數</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemStats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">系統註冊用戶</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">進行中申請</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemStats.activeApplications}</div>
                  <p className="text-xs text-muted-foreground">待處理案件</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">待審核申請</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemStats.pendingReviews}</div>
                  <p className="text-xs text-muted-foreground">等待審核</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">系統正常運行時間</CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemStats.systemUptime}</div>
                  <p className="text-xs text-muted-foreground">本月平均</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">平均回應時間</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemStats.avgResponseTime}</div>
                  <p className="text-xs text-muted-foreground">API 回應時間</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">儲存空間使用</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemStats.storageUsed}</div>
                  <p className="text-xs text-muted-foreground">總容量 10TB</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">完成審核</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemStats.completedReviews}</div>
                  <p className="text-xs text-muted-foreground">本月完成</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">獎學金種類</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemStats.totalScholarships}</div>
                  <p className="text-xs text-muted-foreground">可用獎學金</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">工作流程管理</h3>
            <div className="flex gap-2">
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                新增流程
              </Button>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-1" />
                匯入
              </Button>
            </div>
          </div>

          {loadingWorkflows ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-nycu-blue-600 border-t-transparent"></div>
                <span className="text-nycu-navy-600">載入工作流程中...</span>
              </div>
            </div>
          ) : workflowsError ? (
            <div className="text-center py-12">
              <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
              <p className="text-lg font-medium text-red-600 mb-2">載入工作流程失敗</p>
              <p className="text-sm text-gray-600 mb-4">{workflowsError}</p>
              <Button 
                onClick={fetchWorkflows}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                重試
              </Button>
            </div>
          ) : workflows.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>流程名稱</TableHead>
                      <TableHead>版本</TableHead>
                      <TableHead>狀態</TableHead>
                      <TableHead>步驟數</TableHead>
                      <TableHead>最後修改</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workflows.map((workflow) => (
                      <TableRow key={workflow.id}>
                        <TableCell className="font-medium">{workflow.name}</TableCell>
                        <TableCell>{workflow.version}</TableCell>
                        <TableCell>
                          <Badge variant={workflow.status === "active" ? "default" : "secondary"}>
                            {workflow.status === "active" ? "啟用" : "草稿"}
                          </Badge>
                        </TableCell>
                        <TableCell>{workflow.steps} 步驟</TableCell>
                        <TableCell>{workflow.lastModified}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              {workflow.status === "active" ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">尚無工作流程</p>
              <p className="text-sm mt-2 mb-4">點擊「新增流程」開始建立工作流程</p>
              <Button 
                onClick={fetchWorkflows}
                variant="outline"
                size="sm"
              >
                重新載入
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">審核規則設定</h3>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              新增規則
            </Button>
          </div>

          {loadingRules ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-nycu-blue-600 border-t-transparent"></div>
                <span className="text-nycu-navy-600">載入審核規則中...</span>
              </div>
            </div>
          ) : rulesError ? (
            <div className="text-center py-12">
              <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
              <p className="text-lg font-medium text-red-600 mb-2">載入審核規則失敗</p>
              <p className="text-sm text-gray-600 mb-4">{rulesError}</p>
              <Button 
                onClick={fetchScholarshipRules}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                重試
              </Button>
            </div>
          ) : scholarshipRules.length > 0 ? (
            <div className="grid gap-4">
              {scholarshipRules.map((rule) => (
                <Card key={rule.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{rule.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Switch checked={rule.active} />
                        <Badge variant="outline">{rule.type}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label>規則條件 (JSON)</Label>
                      <Textarea value={JSON.stringify(rule.criteria, null, 2)} rows={3} className="font-mono text-sm" />
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        編輯
                      </Button>
                      <Button variant="outline" size="sm">
                        測試規則
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">尚無審核規則</p>
              <p className="text-sm mt-2 mb-4">點擊「新增規則」開始建立審核規則</p>
              <Button 
                onClick={fetchScholarshipRules}
                variant="outline"
                size="sm"
              >
                重新載入
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">使用者權限管理</h3>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowUserForm(true)}
                className="nycu-gradient text-white"
              >
                <Plus className="h-4 w-4 mr-1" />
                新增使用者權限
              </Button>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-1" />
                批次匯入
              </Button>
            </div>
          </div>

          {/* 使用者統計卡片 */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">總使用者數</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.total_users || 0}</div>
                <p className="text-xs text-muted-foreground">系統註冊用戶</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">活躍使用者</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.active_users || 0}</div>
                <p className="text-xs text-muted-foreground">最近30天登入</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">學生用戶</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.role_distribution?.student || 0}</div>
                <p className="text-xs text-muted-foreground">學生角色</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">本月新增</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.recent_registrations || 0}</div>
                <p className="text-xs text-muted-foreground">最近30天</p>
              </CardContent>
            </Card>
          </div>

          {/* 搜尋和篩選 */}
          <Card className="border-nycu-blue-200">
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>搜尋使用者</Label>
                  <Input
                    placeholder="姓名、信箱或 NYCU ID"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="border-nycu-blue-200"
                  />
                </div>
                <div>
                  <Label>角色篩選</Label>
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-nycu-blue-200 rounded-md"
                  >
                    <option value="">全部管理角色</option>
                    <option value="super_admin">超級管理員</option>
                    <option value="admin">管理員</option>
                    <option value="college">學院</option>
                    <option value="professor">教授</option>
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <Button 
                    onClick={handleSearch}
                    className="flex-1 nycu-gradient text-white"
                  >
                    搜尋
                  </Button>
                  <Button 
                    onClick={clearFilters}
                    variant="outline"
                    className="border-nycu-blue-300 text-nycu-blue-600 hover:bg-nycu-blue-50"
                  >
                    清除
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 使用者列表 */}
          <Card className="border-nycu-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                使用者權限列表
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-nycu-blue-600 border-t-transparent"></div>
                    <span className="text-nycu-navy-600">載入使用者中...</span>
                  </div>
                </div>
              ) : usersError ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
                  <p className="text-lg font-medium text-red-600 mb-2">載入使用者失敗</p>
                  <p className="text-sm text-gray-600 mb-4">{usersError}</p>
                  <Button 
                    onClick={fetchUsers}
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    重試
                  </Button>
                </div>
              ) : users.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-bold px-5 py-3">使用者資訊</TableHead>
                        <TableHead className="font-bold px-5 py-3">角色</TableHead>
                        <TableHead className="font-bold px-5 py-3 w-40">單位</TableHead>
                        <TableHead className="font-bold px-5 py-3">獎學金管理權限</TableHead>
                        <TableHead className="font-bold px-5 py-3">註冊時間</TableHead>
                        <TableHead className="font-bold px-5 py-3">最後登入</TableHead>
                        <TableHead className="font-bold px-5 py-3">權限操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => {
                        const isActive = user.status === '在職' || user.status === '在學';
                        return (
                          <TableRow
                            key={user.id}
                            className={`align-middle h-20 ${!isActive ? 'bg-gray-100 opacity-60 pointer-events-none' : ''}`}
                          >
                            <TableCell className="px-5 py-4 align-middle">
                              <div className="space-y-1">
                                <div className="font-medium">{user.name}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                                <div className="text-sm text-gray-500">@{user.nycu_id}</div>
                                {user.raw_data?.chinese_name && (
                                  <div className="text-sm text-gray-500">中文名: {user.raw_data.chinese_name}</div>
                                )}
                                {user.raw_data?.english_name && (
                                  <div className="text-sm text-gray-500">英文名: {user.raw_data.english_name}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="px-5 py-4 align-middle">
                              <Badge
                                variant={
                                  user.role === 'super_admin' ? 'destructive' :
                                  user.role === 'admin' ? 'default' :
                                  user.role === 'college' ? 'secondary' :
                                  user.role === 'professor' ? 'outline' : 'default'
                                }
                                className="text-xs px-3 py-1 rounded-full whitespace-nowrap"
                              >
                                {getRoleLabel(user.role)}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-5 py-4 align-middle w-40">
                              <div className="space-y-1">
                                {user.dept_name ? (
                                  <div className="text-sm font-medium text-gray-900 truncate">{user.dept_name}</div>
                                ) : (
                                  <div className="text-sm text-gray-400">未設定</div>
                                )}
                                {user.dept_code && (
                                  <div className="text-xs text-gray-500">代碼: {user.dept_code}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="px-5 py-4 align-middle">
                              <div className="flex flex-wrap gap-2 min-h-[32px]">
                                {loadingPermissions ? (
                                  <div className="text-xs text-gray-400">載入中...</div>
                                ) : user.role === 'super_admin' ? (
                                  // super_admin 自動擁有所有獎學金權限
                                  availableScholarships.map((scholarship) => (
                                    <Badge 
                                      key={scholarship.id} 
                                      variant="default" 
                                      className="text-xs px-3 py-1 rounded-full mb-1"
                                    >
                                      {scholarship.name}
                                    </Badge>
                                  ))
                                ) : user.role === 'professor' ? (
                                  // 教授角色顯示說明
                                  <div className="text-xs text-amber-600 font-medium">教授無需管理權限</div>
                                ) : (
                                  // 其他管理角色顯示資料庫中的權限
                                  scholarshipPermissions
                                    .filter(p => p.user_id === user.id)
                                    .map(permission => (
                                      <Badge 
                                        key={permission.id} 
                                        variant="secondary" 
                                        className="text-xs px-3 py-1 rounded-full mb-1"
                                      >
                                        {permission.scholarship_name}
                                      </Badge>
                                    ))
                                )}
                                {!loadingPermissions && user.role !== 'super_admin' && user.role !== 'professor' && scholarshipPermissions.filter(p => p.user_id === user.id).length === 0 && (
                                  <div className="text-xs text-gray-400">無獎學金權限</div>
                                )}
                                {user.role === 'super_admin' && (
                                  <div className="text-xs text-green-600 font-medium w-full">擁有所有獎學金權限</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="px-5 py-4 align-middle">
                              <div className="text-sm text-gray-600">
                                {new Date(user.created_at).toLocaleDateString('zh-TW', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit'
                                })}
                              </div>
                            </TableCell>
                            <TableCell className="px-5 py-4 align-middle">
                              <div className="text-sm text-gray-600">
                                {user.last_login_at 
                                  ? new Date(user.last_login_at).toLocaleString('zh-TW', {
                                      year: 'numeric',
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit',
                                      hour12: false
                                    })
                                  : '從未登入'
                                }
                              </div>
                            </TableCell>
                            <TableCell className="px-5 py-4 align-middle">
                              <div className="flex gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditUser(user)}
                                  className="hover:bg-nycu-blue-50 hover:border-nycu-blue-300"
                                >
                                  <Edit className="h-4 w-4" />
                                  {user.role === 'professor' ? '更改角色' : '編輯權限'}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {/* 分頁 */}
                  <div className="flex items-center justify-between p-4 border-t">
                    <div className="text-sm text-gray-600">
                      顯示 {((userPagination.page - 1) * userPagination.size) + 1} 到 {Math.min(userPagination.page * userPagination.size, userPagination.total)} 筆，共 {userPagination.total} 筆
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUserPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={userPagination.page <= 1}
                      >
                        上一頁
                      </Button>
                      <span className="flex items-center px-3 text-sm">
                        第 {userPagination.page} 頁
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUserPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={userPagination.page * userPagination.size >= userPagination.total}
                      >
                        下一頁
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">尚無使用者權限資料</p>
                  <p className="text-sm mt-2 mb-4">點擊「新增使用者權限」開始設定使用者權限</p>
                  <Button 
                    onClick={fetchUsers}
                    variant="outline"
                    size="sm"
                  >
                    重新載入
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>



          {/* 使用者編輯 Modal */}
          <UserEditModal
            isOpen={showUserForm}
            onClose={() => setShowUserForm(false)}
            editingUser={editingUser}
            userForm={userForm}
            onUserFormChange={handleUserFormChange}
            onSubmit={handleUserSubmit}
            isLoading={userFormLoading}
            scholarshipPermissions={scholarshipPermissions.filter(p => p.user_id === editingUser?.id)}
            availableScholarships={availableScholarships}
            onPermissionChange={(permissions) => {
              // 更新該用戶的獎學金權限
              const userId = editingUser?.id
              if (userId) {
                // 移除該用戶的舊權限
                const otherUserPermissions = scholarshipPermissions.filter(p => p.user_id !== userId)
                // 添加新的權限（包含獎學金名稱）
                const newPermissions = permissions.map(permission => {
                  const scholarship = availableScholarships.find(s => s.id === permission.scholarship_id)
                  return {
                    ...permission,
                    scholarship_name: scholarship?.name || '未知獎學金',
                    scholarship_name_en: scholarship?.name_en
                  }
                })
                setScholarshipPermissions([...otherUserPermissions, ...newPermissions])
              }
            }}
          />
        </TabsContent>

        <TabsContent value="announcements" className="space-y-4">


          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">系統公告管理</h3>
            <Button 
              onClick={() => setShowAnnouncementForm(true)}
              className="nycu-gradient text-white"
            >
              <Plus className="h-4 w-4 mr-1" />
              新增公告
            </Button>
          </div>

          {/* 公告表單 */}
          {showAnnouncementForm && (
            <Card className="border-nycu-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  {editingAnnouncement ? '編輯公告' : '新增公告'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>公告標題 *</Label>
                    <Input
                      value={announcementForm.title}
                      onChange={(e) => handleAnnouncementFormChange('title', e.target.value)}
                      placeholder="輸入公告標題"
                      className="border-nycu-blue-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>英文標題</Label>
                    <Input
                      value={announcementForm.title_en || ''}
                      onChange={(e) => handleAnnouncementFormChange('title_en', e.target.value)}
                      placeholder="English title (optional)"
                      className="border-nycu-blue-200"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>公告內容 *</Label>
                  <Textarea
                    value={announcementForm.message}
                    onChange={(e) => handleAnnouncementFormChange('message', e.target.value)}
                    placeholder="輸入公告內容"
                    rows={4}
                    className="border-nycu-blue-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label>英文內容</Label>
                  <Textarea
                    value={announcementForm.message_en || ''}
                    onChange={(e) => handleAnnouncementFormChange('message_en', e.target.value)}
                    placeholder="English message (optional)"
                    rows={3}
                    className="border-nycu-blue-200"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>公告類型</Label>
                    <select
                      value={announcementForm.notification_type}
                      onChange={(e) => handleAnnouncementFormChange('notification_type', e.target.value)}
                      className="w-full px-3 py-2 border border-nycu-blue-200 rounded-md"
                    >
                      <option value="info">資訊</option>
                      <option value="warning">警告</option>
                      <option value="error">錯誤</option>
                      <option value="success">成功</option>
                      <option value="reminder">提醒</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>優先級</Label>
                    <select
                      value={announcementForm.priority}
                      onChange={(e) => handleAnnouncementFormChange('priority', e.target.value)}
                      className="w-full px-3 py-2 border border-nycu-blue-200 rounded-md"
                    >
                      <option value="low">低</option>
                      <option value="normal">一般</option>
                      <option value="high">高</option>
                      <option value="urgent">緊急</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>行動連結</Label>
                    <Input
                      value={announcementForm.action_url || ''}
                      onChange={(e) => handleAnnouncementFormChange('action_url', e.target.value)}
                      placeholder="/path/to/action"
                      className="border-nycu-blue-200"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>過期時間</Label>
                  <Input
                    type="datetime-local"
                    value={announcementForm.expires_at ? new Date(announcementForm.expires_at).toISOString().slice(0, 16) : ''}
                    onChange={(e) => handleAnnouncementFormChange('expires_at', e.target.value ? new Date(e.target.value).toISOString() : '')}
                    className="border-nycu-blue-200"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={editingAnnouncement ? handleUpdateAnnouncement : handleCreateAnnouncement}
                    disabled={!announcementForm.title || !announcementForm.message}
                    className="nycu-gradient text-white"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {editingAnnouncement ? '更新公告' : '建立公告'}
                  </Button>
                  <Button variant="outline" onClick={resetAnnouncementForm}>
                    取消
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 公告列表 */}
          <Card className="border-nycu-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                系統公告列表
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {loadingAnnouncements ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-nycu-blue-600 border-t-transparent"></div>
                    <span className="text-nycu-navy-600">載入公告中...</span>
                  </div>
                </div>
              ) : announcementsError ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
                  <p className="text-lg font-medium text-red-600 mb-2">載入公告失敗</p>
                  <p className="text-sm text-gray-600 mb-4">{announcementsError}</p>
                  <Button 
                    onClick={fetchAnnouncements}
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    重試
                  </Button>
                </div>
              ) : announcements.length > 0 ? (
                <div className="space-y-6">
                  {announcements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className="p-5 border border-gray-200 rounded-lg hover:border-nycu-blue-300 transition-colors bg-white shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 pr-4">
                          <div className="flex items-center gap-2 mb-3">
                            <h4 className="font-semibold text-nycu-navy-800 text-lg">{announcement.title}</h4>
                            <Badge
                              variant={
                                announcement.notification_type === 'error' ? 'destructive' :
                                announcement.notification_type === 'warning' ? 'secondary' :
                                announcement.notification_type === 'success' ? 'default' : 'outline'
                              }
                            >
                              {announcement.notification_type}
                            </Badge>
                            <Badge variant="outline">
                              {announcement.priority}
                            </Badge>
                          </div>
                          <p className="text-gray-700 mb-3 leading-relaxed">{announcement.message}</p>
                          <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded">
                            建立時間: {new Date(announcement.created_at).toLocaleString('zh-TW', { 
                              year: 'numeric', 
                              month: '2-digit', 
                              day: '2-digit', 
                              hour: '2-digit', 
                              minute: '2-digit', 
                              second: '2-digit',
                              hour12: false 
                            })}
                            {announcement.expires_at && (
                              <span className="ml-4">
                                過期時間: {new Date(announcement.expires_at).toLocaleString('zh-TW', { 
                                  year: 'numeric', 
                                  month: '2-digit', 
                                  day: '2-digit', 
                                  hour: '2-digit', 
                                  minute: '2-digit', 
                                  second: '2-digit',
                                  hour12: false 
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditAnnouncement(announcement)}
                            className="hover:bg-nycu-blue-50 hover:border-nycu-blue-300"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            編輯
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteAnnouncement(announcement.id)}
                            className="hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            刪除
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 分頁控制 */}
                  {announcementPagination.total > announcementPagination.size && (
                    <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                      <div className="text-sm text-gray-600">
                        顯示第 {(announcementPagination.page - 1) * announcementPagination.size + 1} - {Math.min(announcementPagination.page * announcementPagination.size, announcementPagination.total)} 項，共 {announcementPagination.total} 項公告
                      </div>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={announcementPagination.page <= 1}
                          onClick={() => setAnnouncementPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                          className="hover:bg-nycu-blue-50 hover:border-nycu-blue-300"
                        >
                          ← 上一頁
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={announcementPagination.page * announcementPagination.size >= announcementPagination.total}
                          onClick={() => setAnnouncementPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                          className="hover:bg-nycu-blue-50 hover:border-nycu-blue-300"
                        >
                          下一頁 →
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">尚無系統公告</p>
                  <p className="text-sm mt-2 mb-4">點擊「新增公告」開始建立系統公告</p>
                  <Button 
                    onClick={fetchAnnouncements}
                    variant="outline"
                    size="sm"
                  >
                    重新載入
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>



        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>系統設定</CardTitle>
                <CardDescription>管理系統全域設定與參數</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>系統名稱</Label>
                    <Input value="獎學金申請與簽核作業管理系統" />
                  </div>
                  <div>
                    <Label>系統版本</Label>
                    <Input value="v1.0.0" disabled />
                  </div>
                  <div>
                    <Label>預設語言</Label>
                    <Input value="繁體中文" />
                  </div>
                  <div>
                    <Label>時區設定</Label>
                    <Input value="Asia/Taipei" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>通知設定</CardTitle>
                <CardDescription>管理系統通知與郵件設定</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>每日審核提醒</Label>
                    <p className="text-sm text-muted-foreground">每晚22:00發送待審核案件提醒</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>申請狀態更新通知</Label>
                    <p className="text-sm text-muted-foreground">申請狀態變更時通知申請人</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>系統維護通知</Label>
                    <p className="text-sm text-muted-foreground">系統維護前24小時發送通知</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>安全設定</CardTitle>
                <CardDescription>管理系統安全與存取控制</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Session 逾時時間 (分鐘)</Label>
                    <Input type="number" value="30" />
                  </div>
                  <div>
                    <Label>密碼最小長度</Label>
                    <Input type="number" value="8" />
                  </div>
                  <div>
                    <Label>檔案上傳大小限制 (MB)</Label>
                    <Input type="number" value="10" />
                  </div>
                  <div>
                    <Label>API 請求頻率限制 (次/分鐘)</Label>
                    <Input type="number" value="100" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <Card className="academic-card border-nycu-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-nycu-navy-800">
                <Mail className="h-5 w-5 text-nycu-blue-600" />
                郵件模板管理
              </CardTitle>
              <CardDescription>管理各類通知信件模板，支援拖曳變數，即時預覽效果</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 通知類型選擇 */}
              <Card className="border-nycu-blue-100 bg-nycu-blue-50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-4">
                    <Label className="text-nycu-navy-700 font-medium">選擇通知類型</Label>
                    <select
                      className="px-3 py-2 border border-nycu-blue-200 rounded-lg bg-white text-nycu-navy-700 focus:ring-2 focus:ring-nycu-blue-500 focus:border-transparent"
                      value={emailTab}
                      onChange={e => setEmailTab(e.target.value)}
                    >
                      {EMAIL_TEMPLATE_KEYS.map(t => (
                        <option key={t.key} value={t.key}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* 可拖曳變數 */}
              <Card className="border-nycu-orange-100 bg-nycu-orange-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-nycu-navy-700">可用變數 (可拖曳至模板中)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {DRAGGABLE_VARIABLES[emailTab]?.map(v => (
                      <span
                        key={v.label}
                        draggable
                        onDragStart={e => e.dataTransfer.setData("text/plain", v.label)}
                        className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-nycu-orange-500 to-nycu-orange-600 text-white rounded-full cursor-move text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:from-nycu-orange-600 hover:to-nycu-orange-700"
                        title={`拖曳此變數: ${v.desc}`}
                      >
                        <span className="mr-1">📧</span>
                        {v.desc}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-nycu-navy-600 mt-2">
                    💡 提示：將變數拖曳到下方的標題或內容欄位中，系統會自動插入對應的變數代碼
                  </p>
                </CardContent>
              </Card>

              {loadingTemplate ? (
                <Card className="border-nycu-blue-200">
                  <CardContent className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-nycu-blue-600 border-t-transparent"></div>
                      <span className="text-nycu-navy-600">載入模板中...</span>
                    </div>
                  </CardContent>
                </Card>
              ) : emailTemplate ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 編輯區域 */}
                  <div className="space-y-4">
                    <Card className="border-nycu-blue-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg text-nycu-navy-800">模板編輯</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* 標題模板 */}
                        <div className="space-y-2">
                          <Label className="text-nycu-navy-700 font-medium">📧 郵件標題</Label>
                          <Input
                            ref={subjectRef}
                            value={emailTemplate.subject_template}
                            onChange={e => handleTemplateChange("subject_template", e.target.value)}
                            onDrop={e => handleDropVariable(e.dataTransfer.getData("text/plain"), "subject_template", e)}
                            onDragOver={e => e.preventDefault()}
                            placeholder="輸入郵件標題模板，可拖曳變數進來"
                            className="border-nycu-blue-200 focus:ring-nycu-blue-500"
                          />
                        </div>

                        {/* 內容模板 */}
                        <div className="space-y-2">
                          <Label className="text-nycu-navy-700 font-medium">📝 郵件內容</Label>
                          <Textarea
                            ref={bodyRef}
                            rows={8}
                            value={emailTemplate.body_template}
                            onChange={e => handleTemplateChange("body_template", e.target.value)}
                            onDrop={e => handleDropVariable(e.dataTransfer.getData("text/plain"), "body_template", e)}
                            onDragOver={e => e.preventDefault()}
                            placeholder="輸入郵件內容模板，可拖曳變數進來&#10;&#10;範例：&#10;親愛的 {professor_name} 教授，您好！&#10;&#10;獎學金申請案件 {app_id} 需要您的審核..."
                            className="border-nycu-blue-200 focus:ring-nycu-blue-500 resize-none"
                          />
                        </div>

                        {/* CC/BCC 設定 */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-nycu-navy-700 font-medium">CC 副本</Label>
                            <Input
                              value={emailTemplate.cc || ""}
                              onChange={e => handleTemplateChange("cc", e.target.value)}
                              placeholder="多個以逗號分隔"
                              className="border-nycu-blue-200 focus:ring-nycu-blue-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-nycu-navy-700 font-medium">BCC 密件副本</Label>
                            <Input
                              value={emailTemplate.bcc || ""}
                              onChange={e => handleTemplateChange("bcc", e.target.value)}
                              placeholder="多個以逗號分隔"
                              className="border-nycu-blue-200 focus:ring-nycu-blue-500"
                            />
                          </div>
                        </div>

                        {/* 儲存按鈕 */}
                        <div className="flex justify-end pt-2">
                          <Button 
                            onClick={handleSaveTemplate} 
                            disabled={saving}
                            className="nycu-gradient text-white min-w-[120px] nycu-shadow hover:opacity-90 transition-opacity"
                          >
                            {saving ? (
                              <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                <span>儲存中...</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Save className="h-4 w-4" />
                                儲存模板
                              </div>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 即時預覽區域 */}
                  <div className="space-y-4">
                    <Card className="border-green-200 bg-green-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg text-nycu-navy-800 flex items-center gap-2">
                          <Eye className="h-5 w-5 text-green-600" />
                          即時預覽
                        </CardTitle>
                        <CardDescription>模板變數會自動替換為範例數據</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {/* 郵件預覽 */}
                        <div className="bg-white border border-green-200 rounded-lg shadow-sm">
                          {/* 郵件標頭 */}
                          <div className="border-b border-green-100 p-4 bg-gradient-to-r from-green-50 to-green-100">
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-600">寄件者:</span>
                                <span className="text-nycu-navy-700">獎學金系統 &lt;scholarship@nycu.edu.tw&gt;</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-600">收件者:</span>
                                <span className="text-nycu-navy-700">
                                  {emailTab === "professor_notify" ? "教授信箱" : "審核人員信箱"}
                                </span>
                              </div>
                              {emailTemplate.cc && (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-600">CC:</span>
                                  <span className="text-nycu-navy-700">{emailTemplate.cc}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 郵件內容 */}
                          <div className="p-4">
                            {/* 標題預覽 */}
                            <div className="mb-4">
                              <Label className="text-sm font-medium text-gray-600 mb-1 block">郵件標題:</Label>
                              <div className="text-lg font-bold text-nycu-navy-800 p-3 bg-nycu-blue-50 rounded-lg border border-nycu-blue-200">
                                {emailTemplate.subject_template.replace(/\{(\w+)\}/g, (_, v) => {
                                  const variable = DRAGGABLE_VARIABLES[emailTab]?.find(v2 => v2.label === v);
                                  return variable ? `[${variable.desc}]` : `[${v}]`;
                                })}
                              </div>
                            </div>

                            {/* 內容預覽 */}
                            <div>
                              <Label className="text-sm font-medium text-gray-600 mb-1 block">郵件內容:</Label>
                              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 min-h-[200px]">
                                <div className="whitespace-pre-line text-nycu-navy-700 leading-relaxed">
                                  {emailTemplate.body_template.replace(/\{(\w+)\}/g, (_, v) => {
                                    const variable = DRAGGABLE_VARIABLES[emailTab]?.find(v2 => v2.label === v);
                                    return variable ? `[${variable.desc}]` : `[${v}]`;
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* 系統簽名 */}
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <div className="text-sm text-gray-600">
                                <p>此為系統自動發送郵件，請勿直接回覆</p>
                                <p className="mt-1">國立陽明交通大學教務處</p>
                                <p>獎學金申請與簽核作業管理系統</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <Card className="border-gray-200">
                  <CardContent className="flex items-center justify-center py-8">
                    <div className="text-center text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p>請選擇通知類型以載入模板</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 使用者權限編輯 Modal */}
      <UserEditModal
        isOpen={showUserForm}
        onClose={() => setShowUserForm(false)}
        editingUser={editingUser}
        userForm={userForm}
        onUserFormChange={handleUserFormChange}
        onSubmit={handleUserSubmit}
        isLoading={userFormLoading}
        scholarshipPermissions={scholarshipPermissions.filter(p => p.user_id === editingUser?.id)}
        availableScholarships={availableScholarships}
        onPermissionChange={(permissions) => {
          // 更新該用戶的獎學金權限
          const userId = editingUser?.id
          if (userId) {
            // 移除該用戶的舊權限
            const otherUserPermissions = scholarshipPermissions.filter(p => p.user_id !== userId)
            // 添加新的權限（包含獎學金名稱）
            const newPermissions = permissions.map(permission => {
              const scholarship = availableScholarships.find(s => s.id === permission.scholarship_id)
              return {
                ...permission,
                scholarship_name: scholarship?.name || '未知獎學金',
                scholarship_name_en: scholarship?.name_en
              }
            })
            setScholarshipPermissions([...otherUserPermissions, ...newPermissions])
          }
        }}
      />


    </div>
  );
}
