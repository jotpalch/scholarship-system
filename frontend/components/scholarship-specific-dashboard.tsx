"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { NationalityFlag } from "@/components/nationality-flag"
import { getTranslation } from "@/lib/i18n"
import { ProgressTimeline } from "@/components/progress-timeline"
import { Label } from "@/components/ui/label"
import { 
  Search, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Download, 
  GraduationCap, 
  Users, 
  FileText, 
  Loader2, 
  AlertCircle,
  Settings,
  RefreshCw,
  Award,
  Clock,
  TrendingUp,
  Star
} from "lucide-react"
import { useScholarshipSpecificApplications } from "@/hooks/use-admin"
import { api } from "@/lib/api"

import { ScholarshipManagementPanel } from "@/components/scholarship-management-panel"

interface User {
  id: string
  name: string
  email: string
  role: "student" | "professor" | "college" | "admin" | "super_admin"
}

interface ScholarshipSpecificDashboardProps {
  user: User
  locale?: "zh" | "en"
}

export function ScholarshipSpecificDashboard({ user, locale = "zh" }: ScholarshipSpecificDashboardProps) {
  const t = (key: string) => getTranslation(locale, key)
  const [selectedApplication, setSelectedApplication] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("undergraduate_freshman")
  const [activePhdTab, setActivePhdTab] = useState("nstc") // 博士生獎學金內部tab
  const [tabLoading, setTabLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showApplicationDetail, setShowApplicationDetail] = useState(false)
  
  // 新增狀態用於文件預覽和詳細申請資料
  const [applicationFiles, setApplicationFiles] = useState<{ [applicationId: number]: any[] }>({})
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [previewFile, setPreviewFile] = useState<{ url: string; filename: string; type: string } | null>(null)
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false)
  
  // 使用 hook 獲取真實資料
  const { 
    applicationsByType, 
    isLoading, 
    error, 
    refetch,
    updateApplicationStatus 
  } = useScholarshipSpecificApplications()

  // 從 hook 獲取各類型申請資料
  const undergraduateApplications = applicationsByType.undergraduate_freshman || []
  const phdApplications = applicationsByType.phd || []
  const phdMoeApplications = applicationsByType.phd_moe || []
  const directPhdApplications = applicationsByType.direct_phd || []

  // 搜尋和篩選邏輯
  const filterApplications = (applications: any[]) => {
    return applications.filter(app => {
      const matchesSearch = !searchTerm || 
        (app.student_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (app.student_no?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (app.student_id?.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesStatus = statusFilter === "all" || app.status === statusFilter
      
      return matchesSearch && matchesStatus
    })
  }

  // 重用函數：獲取申請時間軸
  const getApplicationTimeline = (application: any) => {
    type TimelineStep = {
      id: string
      title: string
      status: "completed" | "current" | "pending" | "rejected"
      date: string
    }

    const formatDate = (dateString: string | null | undefined) => {
      if (!dateString) return ""
      const date = new Date(dateString)
      return date.toLocaleDateString(locale === "zh" ? "zh-TW" : "en-US")
    }

    const status = application.status as string

    const steps: TimelineStep[] = [
      {
        id: "1",
        title: locale === "zh" ? "提交申請" : "Submit Application",
        status: status === "draft" ? "current" : "completed",
        date: status === "draft" ? "" : formatDate(application.submitted_at || application.created_at),
      },
      {
        id: "2",
        title: locale === "zh" ? "初步審核" : "Initial Review",
        status: status === "draft" 
          ? "pending" 
          : status === "submitted" || status === "pending_recommendation"
            ? "current"
            : status === "rejected"
              ? "rejected"
              : "completed",
        date: status === "draft" || status === "submitted" || status === "pending_recommendation"
          ? "" 
          : formatDate(application.reviewed_at),
      },
      {
        id: "3",
        title: locale === "zh" ? "委員會審核" : "Committee Review",
        status: status === "draft" || status === "submitted" || status === "pending_recommendation"
          ? "pending"
          : status === "under_review" || status === "recommended"
            ? "current"
            : status === "rejected"
              ? "rejected"
              : "completed",
        date: status === "draft" || status === "submitted" || status === "pending_recommendation" || status === "under_review" || status === "recommended"
          ? ""
          : formatDate(application.reviewed_at),
      },
      {
        id: "4",
        title: locale === "zh" ? "核定結果" : "Final Decision",
        status: status === "approved" 
          ? "completed" 
          : status === "rejected" 
            ? "rejected" 
            : "pending",
        date: status === "approved" 
          ? formatDate(application.approved_at)
          : status === "rejected"
            ? formatDate(application.reviewed_at)
            : "",
      },
    ]
    return steps
  }

  // 重用函數：格式化欄位名稱
  const formatFieldName = (fieldName: string) => {
    const fieldNameMap: { [key: string]: string } = {
      'academic_year': locale === "zh" ? "學年度" : "Academic Year",
      'semester': locale === "zh" ? "學期" : "Semester",
      'gpa': locale === "zh" ? "學期平均成績" : "GPA",
      'class_ranking_percent': locale === "zh" ? "班級排名百分比" : "Class Ranking %",
      'dept_ranking_percent': locale === "zh" ? "系所排名百分比" : "Department Ranking %",
      'completed_terms': locale === "zh" ? "已修學期數" : "Completed Terms",
      'contact_phone': locale === "zh" ? "聯絡電話" : "Contact Phone",
      'contact_email': locale === "zh" ? "聯絡信箱" : "Contact Email",
      'contact_address': locale === "zh" ? "通訊地址" : "Contact Address",
      'bank_account': locale === "zh" ? "銀行帳戶" : "Bank Account",
      'research_proposal': locale === "zh" ? "研究計畫" : "Research Proposal",
      'budget_plan': locale === "zh" ? "預算規劃" : "Budget Plan",
      'milestone_plan': locale === "zh" ? "里程碑規劃" : "Milestone Plan",
      'expected_graduation_date': locale === "zh" ? "預計畢業日期" : "Expected Graduation Date",
      'personal_statement': locale === "zh" ? "個人陳述" : "Personal Statement",
      'scholarship_type': locale === "zh" ? "獎學金類型" : "Scholarship Type",
    };
    return fieldNameMap[fieldName] || fieldName;
  };

  // 重用函數：格式化欄位值
  const formatFieldValue = (fieldName: string, value: any) => {
    if (fieldName === 'scholarship_type') {
      // 使用本地映射，未來可以改為從資料庫動態獲取
      const scholarshipTypeMap = {
        'undergraduate_freshman': locale === "zh" ? "學士班新生獎學金" : "Undergraduate Freshman Scholarship",
        'phd': locale === "zh" ? "博士生獎學金" : "PhD Scholarship",
        'direct_phd': locale === "zh" ? "逕升博士獎學金" : "Direct PhD Scholarship",
        'phd_moe': locale === "zh" ? "教育部博士生獎學金" : "MOE PhD Scholarship",
        'phd_nstc': locale === "zh" ? "國科會博士生獎學金" : "NSTC PhD Scholarship",
      };
      return scholarshipTypeMap[value as keyof typeof scholarshipTypeMap] || value;
    }
    return value;
  };

  // 重用函數：獲取文件標籤
  const getDocumentLabel = (docType: string, locale: "zh" | "en") => {
    const docTypeMap = {
      zh: {
        transcript: "成績單",
        recommendation: "推薦信",
        research_proposal: "研究計畫書",
        personal_statement: "自傳",
        portfolio: "作品集",
        certificate: "證明文件",
        cv: "履歷",
        other: "其他文件",
      },
      en: {
        transcript: "Transcript",
        recommendation: "Recommendation Letter",
        research_proposal: "Research Proposal",
        personal_statement: "Personal Statement", 
        portfolio: "Portfolio",
        certificate: "Certificate",
        cv: "CV/Resume",
        other: "Other Documents",
      },
    }
    return docTypeMap[locale][docType as keyof typeof docTypeMap.zh] || docType
  }

  // 重用函數：獲取申請文件
  const fetchApplicationFiles = async (applicationId: number) => {
    if (applicationFiles[applicationId]) {
      return applicationFiles[applicationId] // Already loaded
    }
    
    try {
      setIsLoadingFiles(true)
      // 先嘗試從申請詳情獲取文件
      const appResponse = await api.applications.getApplicationById(applicationId)
      if (appResponse.success && appResponse.data?.files) {
        const files = appResponse.data.files
        setApplicationFiles(prev => ({
          ...prev,
          [applicationId]: files
        }))
        return files
      }
      
      // 如果申請詳情沒有文件，嘗試專門的文件API
      const filesResponse = await api.applications.getApplicationFiles(applicationId)
      if (filesResponse.success && filesResponse.data) {
        const files = filesResponse.data
        setApplicationFiles(prev => ({
          ...prev,
          [applicationId]: files
        }))
        return files
      }
      
      return []
    } catch (error) {
      console.error('Failed to fetch application files:', error)
      return []
    } finally {
      setIsLoadingFiles(false)
    }
  }

  // 查看詳細資料 - 修改為從後端獲取完整資料
  const handleViewDetails = async (application: any) => {
    try {
      // 從後端獲取完整的申請詳情，包括 form_data
      const response = await api.applications.getApplicationById(application.id)
      if (response.success && response.data) {
        setSelectedApplication(response.data)
      } else {
        // 如果獲取失敗，使用原始的申請資料
        setSelectedApplication(application)
      }
    } catch (error) {
      console.error('Failed to fetch application details:', error)
      // 如果獲取失敗，使用原始的申請資料
      setSelectedApplication(application)
    }
    
    setShowApplicationDetail(true)
    
    // 清除緩存並重新載入申請文件，確保獲取最新數據
    setApplicationFiles(prev => {
      const newFiles = { ...prev }
      delete newFiles[application.id]
      return newFiles
    })
    await fetchApplicationFiles(application.id)
  }

  // Tab切換處理函數
  const handleTabChange = async (value: string) => {
    if (value === activeTab) return
    
    setTabLoading(true)
    setActiveTab(value)
    
    try {
      // 模擬loading時間並刷新數據
      await new Promise(resolve => setTimeout(resolve, 300))
      await refetch()
    } catch (error) {
      console.error('Failed to refresh data:', error)
    } finally {
      setTabLoading(false)
    }
  }

  // 博士生獎學金子tab切換處理
  const handlePhdTabChange = async (value: string) => {
    if (value === activePhdTab) return
    
    setTabLoading(true)
    setActivePhdTab(value)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 200))
      await refetch()
    } catch (error) {
      console.error('Failed to refresh PhD data:', error)
    } finally {
      setTabLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const statusMap = {
      pending_review: "destructive",
      under_review: "outline",
      approved: "default",
      rejected: "secondary",
      submitted: "outline",
    }
    return statusMap[status as keyof typeof statusMap] || "secondary"
  }

  const getStatusName = (status: string) => {
    const statusMap = {
      draft: locale === "zh" ? "草稿" : "Draft",
      submitted: locale === "zh" ? "已提交" : "Submitted",
      under_review: locale === "zh" ? "審核中" : "Under Review",
      approved: locale === "zh" ? "已核准" : "Approved",
      rejected: locale === "zh" ? "已駁回" : "Rejected",
      withdrawn: locale === "zh" ? "已撤回" : "Withdrawn",
    }
    return statusMap[status as keyof typeof statusMap] || status
  }

  const handleApprove = async (appId: number) => {
    try {
      await updateApplicationStatus(appId, 'approved', '管理員核准')
      console.log(`Approved application ${appId}`)
    } catch (error) {
      console.error('Failed to approve application:', error)
    }
  }

  const handleReject = async (appId: number) => {
    try {
      await updateApplicationStatus(appId, 'rejected', '管理員駁回')
      console.log(`Rejected application ${appId}`)
    } catch (error) {
      console.error('Failed to reject application:', error)
    }
  }

  // Shadow Loading Component
  const ShadowLoading = () => (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
      <div className="flex items-center gap-3 bg-white shadow-lg rounded-lg px-6 py-4">
        <Loader2 className="h-5 w-5 animate-spin text-nycu-blue-600" />
        <span className="text-nycu-navy-600 font-medium">刷新數據中...</span>
      </div>
    </div>
  )

  if (isLoading && !tabLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-nycu-blue-600" />
          <p className="text-nycu-navy-600">載入獎學金申請資料中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-700">載入資料時發生錯誤：{error}</p>
        </div>
      </div>
    )
  }

  const renderUndergraduateTab = () => (
    <div className="space-y-6 relative">
      {tabLoading && <ShadowLoading />}
      {/* 統計卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總申請數</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{undergraduateApplications.length}</div>
            <p className="text-xs text-muted-foreground">學士班新生</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">符合GPA標準</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {undergraduateApplications.filter((app) => (app.gpa || 0) >= 3.38).length}
            </div>
            <p className="text-xs text-muted-foreground">GPA ≥ 3.38</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">白名單學生</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {undergraduateApplications.filter((app) => app.student?.nationality === "TWN").length}
            </div>
            <p className="text-xs text-muted-foreground">本國學生</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均GPA</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {undergraduateApplications.length > 0 
                ? (undergraduateApplications.reduce((sum, app) => sum + (app.gpa || 0), 0) / undergraduateApplications.length).toFixed(2)
                : "0.00"
              }
            </div>
            <p className="text-xs text-muted-foreground">申請學生平均</p>
          </CardContent>
        </Card>
      </div>

      {/* 搜尋和篩選 */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="搜尋學生姓名或學號..." 
            className="pl-8" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部狀態</SelectItem>
            <SelectItem value="submitted">已提交</SelectItem>
            <SelectItem value="under_review">審核中</SelectItem>
            <SelectItem value="approved">已核准</SelectItem>
            <SelectItem value="rejected">已駁回</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          刷新
        </Button>
      </div>

      {/* 申請列表 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>申請編號</TableHead>
                <TableHead>姓名</TableHead>
                <TableHead>學號</TableHead>
                <TableHead>國籍</TableHead>
                <TableHead>系所</TableHead>
                <TableHead>GPA</TableHead>
                <TableHead>班級名次</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead>等待天數</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filterApplications(undergraduateApplications).map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.app_id || `APP-${app.id}`}</TableCell>
                  <TableCell className="font-medium">{app.student_name || "未知學生"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{app.student_no || app.student_id}</TableCell>
                  <TableCell>
                    <NationalityFlag 
                      countryCode={app.nationality || "OTHER"} 
                      locale={locale} 
                      showLabel={false} 
                    />
                  </TableCell>
                  <TableCell>{app.department || "未知系所"}</TableCell>
                  <TableCell>
                    <span className={`font-medium ${(app.gpa || 0) >= 3.38 ? 'text-green-600' : 'text-red-600'}`}>
                      {app.gpa ? app.gpa.toFixed(2) : "未設定"}
                    </span>
                  </TableCell>
                  <TableCell>{app.class_ranking_percent ? `${app.class_ranking_percent}%` : "未設定"}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(app.status) as any}>{getStatusName(app.status)}</Badge>
                  </TableCell>
                  <TableCell>{app.days_waiting || 0} 天</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(app)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" onClick={() => handleApprove(app.id)}>
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleReject(app.id)}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {/* 學士班新生獎學金管理設定 */}
      <ScholarshipManagementPanel type="undergraduate_freshman" />
    </div>
  )

  // 博士生獎學金tab (合併國科會和教育部)
  const renderPhdTab = () => {
    const currentApplications = activePhdTab === 'nstc' ? phdApplications : phdMoeApplications
    const scholarshipName = activePhdTab === 'nstc' ? '國科會博士生獎學金' : '教育部博士生獎學金'
    
    return (
      <div className="space-y-6 relative">
        {tabLoading && <ShadowLoading />}
        
        {/* 博士生獎學金內部分類 */}
        <Card className="border-nycu-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-nycu-blue-600" />
              博士生獎學金分類
            </CardTitle>
            <CardDescription>選擇要查看的博士生獎學金類型</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activePhdTab} onValueChange={handlePhdTabChange}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="nstc" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  國科會博士生獎學金
                </TabsTrigger>
                <TabsTrigger value="moe" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  教育部博士生獎學金
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* 統計卡片 */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">總申請數</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentApplications.length}</div>
              <p className="text-xs text-muted-foreground">{scholarshipName}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">待審核</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currentApplications.filter((app) => ['submitted', 'under_review'].includes(app.status)).length}
              </div>
              <p className="text-xs text-muted-foreground">需要處理</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均等待</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currentApplications.length > 0 
                  ? (currentApplications.reduce((sum, app) => sum + (app.days_waiting || 0), 0) / currentApplications.length).toFixed(1)
                  : "0.0"
                } 天
              </div>
              <p className="text-xs text-muted-foreground">處理時間</p>
            </CardContent>
          </Card>
        </div>

        {/* 搜尋和篩選 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="搜尋學生姓名或學號..." 
                className="pl-8" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部狀態</SelectItem>
                <SelectItem value="submitted">已提交</SelectItem>
                <SelectItem value="under_review">審核中</SelectItem>
                <SelectItem value="approved">已核准</SelectItem>
                <SelectItem value="rejected">已駁回</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
        </div>

        {/* 申請列表 */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>申請編號</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>學號</TableHead>
                  <TableHead>國籍</TableHead>
                  <TableHead>系所</TableHead>
                  <TableHead>指導教授</TableHead>
                  <TableHead>研究領域</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead>等待天數</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filterApplications(currentApplications).map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.app_id || `APP-${app.id}`}</TableCell>
                    <TableCell className="font-medium">{app.student_name || "未知學生"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{app.student_no || app.student_id}</TableCell>
                    <TableCell>
                      <NationalityFlag 
                        countryCode={app.nationality || "OTHER"} 
                        locale={locale} 
                        showLabel={false} 
                      />
                    </TableCell>
                    <TableCell>{app.department || "未知系所"}</TableCell>
                    <TableCell>未設定指導教授</TableCell>
                    <TableCell>研究領域待更新</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(app.status) as any}>{getStatusName(app.status)}</Badge>
                    </TableCell>
                    <TableCell>{app.days_waiting || 0} 天</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(app)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" onClick={() => handleApprove(app.id)}>
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleReject(app.id)}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {/* 博士生獎學金管理設定 */}
        <ScholarshipManagementPanel type="phd" />
      </div>
    )
  }

  const renderDirectPhdTab = () => (
    <div className="space-y-6 relative">
      {tabLoading && <ShadowLoading />}
      {/* 統計卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總申請數</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{directPhdApplications.length}</div>
            <p className="text-xs text-muted-foreground">逕博獎學金</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待審核</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {directPhdApplications.filter((app) => ['submitted', 'under_review'].includes(app.status)).length}
            </div>
            <p className="text-xs text-muted-foreground">需要處理</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均等待</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {directPhdApplications.length > 0 
                ? (directPhdApplications.reduce((sum, app) => sum + (app.days_waiting || 0), 0) / directPhdApplications.length).toFixed(1)
                : "0.0"
              } 天
            </div>
            <p className="text-xs text-muted-foreground">處理時間</p>
          </CardContent>
        </Card>
      </div>

      {/* 搜尋和篩選 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="搜尋學生姓名或學號..." 
              className="pl-8" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部狀態</SelectItem>
              <SelectItem value="submitted">已提交</SelectItem>
              <SelectItem value="under_review">審核中</SelectItem>
              <SelectItem value="approved">已核准</SelectItem>
              <SelectItem value="rejected">已駁回</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          刷新
        </Button>
      </div>

      {/* 申請列表 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>申請編號</TableHead>
                <TableHead>姓名</TableHead>
                <TableHead>學號</TableHead>
                <TableHead>國籍</TableHead>
                <TableHead>系所</TableHead>
                <TableHead>指導教授</TableHead>
                <TableHead>研究領域</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead>等待天數</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filterApplications(directPhdApplications).map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.app_id || `APP-${app.id}`}</TableCell>
                  <TableCell className="font-medium">{app.student_name || "未知學生"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{app.student_no || app.student_id}</TableCell>
                  <TableCell>
                    <NationalityFlag 
                      countryCode={app.nationality || "OTHER"} 
                      locale={locale} 
                      showLabel={false} 
                    />
                  </TableCell>
                  <TableCell>{app.department || "未知系所"}</TableCell>
                  <TableCell>未設定指導教授</TableCell>
                  <TableCell>研究領域待更新</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(app.status) as any}>{getStatusName(app.status)}</Badge>
                  </TableCell>
                  <TableCell>{app.days_waiting || 0} 天</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(app)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" onClick={() => handleApprove(app.id)}>
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleReject(app.id)}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* 逕博獎學金管理設定 */}
      <ScholarshipManagementPanel type="direct_phd" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">獎學金審核管理</h2>
          <p className="text-muted-foreground">依獎學金類型分類管理申請案件</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            全部刷新
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="undergraduate_freshman" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            學士班新生獎學金
          </TabsTrigger>
          <TabsTrigger value="phd" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            博士生獎學金
          </TabsTrigger>
          <TabsTrigger value="direct-phd" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            逕博獎學金
          </TabsTrigger>
        </TabsList>

        <TabsContent value="undergraduate_freshman" className="space-y-4">
          {renderUndergraduateTab()}
        </TabsContent>

        <TabsContent value="phd" className="space-y-4">
          {renderPhdTab()}
        </TabsContent>

        <TabsContent value="direct-phd" className="space-y-4">
          {renderDirectPhdTab()}
        </TabsContent>
      </Tabs>

      {/* 學生申請詳細資料對話框 */}
      <Dialog open={showApplicationDetail} onOpenChange={setShowApplicationDetail}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              申請詳細資料
            </DialogTitle>
            <DialogDescription>
              {selectedApplication?.app_id || `APP-${selectedApplication?.id}`} - {selectedApplication?.student_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedApplication && (
            <div className="space-y-6">
              {/* 基本資訊 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">基本資訊</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">姓名</label>
                      <p className="text-base">{selectedApplication.student_name || "未設定"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">學號</label>
                      <p className="text-base">{selectedApplication.student_no || selectedApplication.student_id || "未設定"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">系所</label>
                      <p className="text-base">{selectedApplication.department || "未設定"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">國籍</label>
                      <div className="flex items-center gap-2">
                        <NationalityFlag 
                          countryCode={selectedApplication.nationality || "OTHER"} 
                          locale={locale} 
                          showLabel={true} 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">申請狀態</label>
                      <Badge variant={getStatusColor(selectedApplication.status) as any}>
                        {getStatusName(selectedApplication.status)}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">等待天數</label>
                      <p className="text-base">{selectedApplication.days_waiting || 0} 天</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 學術資訊 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">學術資訊</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">GPA</label>
                      <p className={`text-base font-medium ${(selectedApplication.gpa || 0) >= 3.38 ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedApplication.gpa ? selectedApplication.gpa.toFixed(2) : "未設定"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">班級名次</label>
                      <p className="text-base">{selectedApplication.class_ranking_percent ? `${selectedApplication.class_ranking_percent}%` : "未設定"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">指導教授</label>
                      <p className="text-base">{selectedApplication.supervisor || "未設定"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">研究領域</label>
                      <p className="text-base">{selectedApplication.research_field || "未設定"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 審核進度 - 移到申請內容上方 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">審核進度</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProgressTimeline steps={getApplicationTimeline(selectedApplication)} />
                </CardContent>
              </Card>

              {/* 申請內容 - 新增動態表單資料顯示 */}
              {selectedApplication.form_data && Object.keys(selectedApplication.form_data).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">申請內容</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(selectedApplication.form_data).map(([key, value]) => {
                        // 過濾掉空值和不需要顯示的欄位
                        if (!value || value === '' || key === 'files' || key === 'agree_terms') {
                          return null;
                        }
                        
                        return (
                          <div key={key} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg">
                            <div className="flex-1">
                              <Label className="text-sm font-medium text-gray-700">{formatFieldName(key)}</Label>
                              <p className="text-sm text-gray-600 mt-1">
                                {typeof value === 'string' && value.length > 100 
                                  ? `${formatFieldValue(key, value).substring(0, 100)}...` 
                                  : String(formatFieldValue(key, value))
                                }
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 已上傳文件 - 新增文件預覽功能 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">已上傳文件</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingFiles ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        {locale === "zh" ? "載入文件中..." : "Loading files..."}
                      </span>
                    </div>
                  ) : applicationFiles[selectedApplication.id] && applicationFiles[selectedApplication.id].length > 0 ? (
                    <div className="space-y-2">
                      {applicationFiles[selectedApplication.id].map((file: any, index: number) => (
                        <div key={file.id || index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <div>
                              <p className="text-sm font-medium">{file.filename || file.original_filename}</p>
                              <p className="text-xs text-muted-foreground">
                                {file.file_type ? getDocumentLabel(file.file_type, locale) : 'Other'} • 
                                {file.file_size ? ` ${Math.round(file.file_size / 1024)}KB` : ''}
                              </p>
                            </div>
                          </div>
                          {file.file_path && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                // 文件預覽處理
                                const handleFilePreview = (file: any) => {
                                  const filename = file.filename || file.original_filename
                                  
                                  // 從後端URL中提取token
                                  const urlParams = new URLSearchParams(file.file_path.split('?')[1])
                                  const token = urlParams.get('token')
                                  
                                  if (!token) {
                                    console.error('No token found in file URL')
                                    return
                                  }
                                  
                                  // 構建前端預覽URL，包含token參數
                                  const previewUrl = `/api/v1/preview?fileId=${file.id}&filename=${encodeURIComponent(filename)}&type=${encodeURIComponent(file.file_type)}&applicationId=${selectedApplication.id}&token=${token}`
                                  
                                  // For PDF files, use iframe preview
                                  if (filename.toLowerCase().endsWith('.pdf')) {
                                    setPreviewFile({
                                      url: previewUrl,
                                      filename: filename,
                                      type: 'application/pdf'
                                    })
                                    setIsPreviewDialogOpen(true)
                                    return
                                  }
                                  
                                  // For image files, use image preview
                                  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
                                  if (imageExtensions.some(ext => filename.toLowerCase().endsWith(ext))) {
                                    setPreviewFile({
                                      url: previewUrl,
                                      filename: filename,
                                      type: 'image'
                                    })
                                    setIsPreviewDialogOpen(true)
                                    return
                                  }
                                  
                                  // For other files, open in new window with frontend URL
                                  window.open(previewUrl, '_blank')
                                }
                                
                                handleFilePreview(file)
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              {locale === "zh" ? "預覽" : "Preview"}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {locale === "zh" ? "尚未上傳任何文件" : "No files uploaded yet"}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* 申請時間 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">申請時間</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">申請時間</label>
                      <p className="text-base">{selectedApplication.created_at ? new Date(selectedApplication.created_at).toLocaleString('zh-TW') : "未設定"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">最後更新</label>
                      <p className="text-base">{selectedApplication.updated_at ? new Date(selectedApplication.updated_at).toLocaleString('zh-TW') : "未設定"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 操作按鈕 */}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowApplicationDetail(false)}>
                  關閉
                </Button>
                <Button onClick={() => handleApprove(selectedApplication.id)} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  核准申請
                </Button>
                <Button variant="destructive" onClick={() => handleReject(selectedApplication.id)}>
                  <XCircle className="h-4 w-4 mr-2" />
                  駁回申請
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 文件預覽對話框 */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {locale === "zh" ? "文件預覽" : "File Preview"}
            </DialogTitle>
            <DialogDescription>
              {previewFile?.filename}
            </DialogDescription>
          </DialogHeader>
          
          {previewFile && (
            <div className="flex-1 overflow-hidden">
              {previewFile.type.includes('pdf') ? (
                <iframe
                  src={previewFile.url}
                  className="w-full h-[70vh] border rounded"
                  title={previewFile.filename}
                />
              ) : previewFile.type.includes('image') ? (
                <div className="flex justify-center items-center h-[70vh] bg-muted rounded">
                  <img
                    src={previewFile.url}
                    alt={previewFile.filename}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[70vh] bg-muted rounded">
                  <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">{previewFile.filename}</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {locale === "zh" ? "此文件類型無法預覽" : "This file type cannot be previewed"}
                  </p>
                  <Button
                    onClick={() => {
                      // 使用前端URL在新視窗開啟，確保包含token
                      const frontendUrl = previewFile.url.startsWith('/api/v1/preview') 
                        ? previewFile.url 
                        : (() => {
                            // 從原始文件URL中提取token
                            const applicationId = selectedApplication?.id
                            if (!applicationId) return previewFile.url
                            
                            const files = applicationFiles[applicationId]
                            if (!files) return previewFile.url
                            
                            const originalFile = files.find((f: any) => f.filename === previewFile.filename)
                            if (originalFile?.file_path) {
                              const urlParams = new URLSearchParams(originalFile.file_path.split('?')[1])
                              const token = urlParams.get('token')
                              
                              if (token) {
                                return `/api/v1/preview?fileId=${originalFile.id}&filename=${encodeURIComponent(previewFile.filename)}&type=${encodeURIComponent(originalFile.file_type)}&applicationId=${applicationId}&token=${token}`
                              }
                            }
                            return previewFile.url
                          })()
                      
                      window.open(frontendUrl, '_blank')
                    }}
                  >
                    {locale === "zh" ? "在新視窗開啟" : "Open in New Window"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
