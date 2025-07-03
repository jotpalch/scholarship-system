"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProgressTimeline } from "@/components/progress-timeline"
import { FileUpload } from "@/components/file-upload"
import { Edit, Eye, Trash2, Save, AlertTriangle, Info, FileText, Calendar, User, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { getTranslation } from "@/lib/i18n"
import { useApplications } from "@/hooks/use-applications"
import { FormValidator, Locale } from "@/lib/validators"
import api, { ScholarshipType, Application as ApiApplication, ApplicationFile } from "@/lib/api"

// 使用API的Application類型
type Application = ApiApplication

interface EnhancedStudentPortalProps {
  user: {
    id: string
    name: string
    email: string
    role: string
    studentType: "undergraduate" | "phd" | "direct_phd"
  }
  locale: Locale
}

type ApplicationStatus = "draft" | "submitted" | "under_review" | "pending_recommendation" | "recommended" | "approved" | "rejected" | "returned" | "withdrawn" | "cancelled"
type BadgeVariant = "secondary" | "default" | "outline" | "destructive"

export function EnhancedStudentPortal({ user, locale }: EnhancedStudentPortalProps) {
  const t = (key: string) => getTranslation(locale, key)
  const validator = useMemo(() => new FormValidator(locale), [locale])
  
  // Tab狀態管理
  const [activeTab, setActiveTab] = useState("applications")
  
  // 編輯模式狀態
  const [editingApplication, setEditingApplication] = useState<Application | null>(null)
  
  // 獎學金名稱翻譯映射
  const getScholarshipTypeName = (scholarshipType: string): string => {
    const scholarshipNames: Record<string, Record<string, string>> = {
      undergraduate_freshman: {
        zh: "學士班新生入學獎學金",
        en: "Undergraduate Freshman Scholarship"
      },
      phd_research: {
        zh: "博士班研究獎學金", 
        en: "PhD Research Scholarship"
      },
      direct_phd: {
        zh: "逕讀博士班獎學金",
        en: "Direct PhD Scholarship"
      },
      phd_nstc: {
        zh: "國科會博士生獎學金",
        en: "NSTC PhD Scholarship"
      },
      nstc_scholarship: {
        zh: "國科會博士生獎學金",
        en: "NSTC PhD Scholarship"
      },
      moe_scholarship: {
        zh: "教育部博士生獎學金",
        en: "MOE PhD Scholarship"
      }
    }
    return scholarshipNames[scholarshipType]?.[locale] || scholarshipType
  }
  
  // Debug authentication status
  useEffect(() => {
    console.log('EnhancedStudentPortal mounted with user:', user)
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    console.log('Current auth token exists:', !!token)
    console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'No token')
  }, [user])
  
  // Use real application data from API
  const { 
    applications, 
    isLoading: applicationsLoading, 
    error: applicationsError,
    fetchApplications,
    createApplication,
    saveApplicationDraft,
    submitApplication: submitApplicationApi,
    withdrawApplication,
    uploadDocument,
    updateApplication
  } = useApplications()

  // State for student data
  const [studentData, setStudentData] = useState<any>(null)
  const [isLoadingStudentData, setIsLoadingStudentData] = useState(false)

  // State for eligible scholarships
  const [eligibleScholarships, setEligibleScholarships] = useState<ScholarshipType[]>([])
  const [isLoadingScholarships, setIsLoadingScholarships] = useState(true)
  const [scholarshipsError, setScholarshipsError] = useState<string | null>(null)

  // Fetch eligible scholarships on component mount
  useEffect(() => {
    const fetchEligibleScholarships = async () => {
      try {
        setIsLoadingScholarships(true)
        const response = await api.scholarships.getEligible()
        console.log('Scholarship response:', response) // Debug log
        
        // Handle both direct array response and ApiResponse format
        let scholarshipData: ScholarshipType[] = []
        if (Array.isArray(response)) {
          scholarshipData = response
        } else if (response && typeof response === 'object' && 'data' in response) {
          // Handle ApiResponse format
          if (response.success && Array.isArray(response.data)) {
            scholarshipData = response.data
          } else {
            console.error('API response unsuccessful:', response.message)
            setScholarshipsError(response.message || '無法獲取獎學金資料')
            setEligibleScholarships([])
            return
          }
        } else {
          console.error('Invalid scholarship response:', response) // Debug log
          setScholarshipsError('無法獲取獎學金資料')
          setEligibleScholarships([])
          return
        }
        
        if (scholarshipData.length === 0) {
          setScholarshipsError('目前沒有符合資格的獎學金')
        } else {
          setEligibleScholarships(scholarshipData)
          setScholarshipsError(null)
        }
      } catch (error) {
        console.error('Error fetching scholarships:', error) // Debug log
        setScholarshipsError(error instanceof Error ? error.message : '發生未知錯誤')
        setEligibleScholarships([])
      } finally {
        setIsLoadingScholarships(false)
      }
    }

    fetchEligibleScholarships()
  }, []) // Empty dependency array

  // Try to fetch student data on component mount (optional)
  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setIsLoadingStudentData(true)
        const response = await api.users.getStudentInfo()
        console.log('Student data response:', response) // Debug log
        
        if (response.success && response.data) {
          setStudentData(response.data)
          console.log('Student data loaded successfully')
        } else {
          console.warn('Student data endpoint not available:', response.message)
          // App can work without student data - use basic info from user
          setStudentData(null)
        }
      } catch (error) {
        console.warn('Student data endpoint not implemented:', error)
        // App can work without student data - use basic info from user
        setStudentData(null)
      } finally {
        setIsLoadingStudentData(false)
      }
    }

    fetchStudentData()
  }, [])

  // Form state for new application
  const [newApplicationData, setNewApplicationData] = useState({
    scholarship_type: '',
  })
  
  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<{ [documentType: string]: File[] }>({})
  const [selectedScholarship, setSelectedScholarship] = useState<ScholarshipType | null>(null)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formProgress, setFormProgress] = useState(0)

  // Calculate form completion progress (only based on documents)
  useEffect(() => {
    // Progress is only based on required documents upload
    const scholarship = selectedScholarship
    let documentProgress = 0
    if (scholarship?.required_documents && scholarship.required_documents.length > 0) {
      const uploadedDocsCount = scholarship.required_documents.filter(docType => 
        uploadedFiles[docType] && uploadedFiles[docType].length > 0
      ).length
      documentProgress = Math.round((uploadedDocsCount / scholarship.required_documents.length) * 100)
    } else {
      // If no required documents, consider complete when scholarship is selected
      documentProgress = newApplicationData.scholarship_type ? 100 : 0
    }
    
    setFormProgress(documentProgress)
  }, [newApplicationData.scholarship_type, uploadedFiles, selectedScholarship])

  const getStatusColor = (status: ApplicationStatus): BadgeVariant => {
    const statusMap: Record<ApplicationStatus, BadgeVariant> = {
      draft: "secondary",
      submitted: "default", 
      under_review: "outline",
      pending_recommendation: "outline",
      recommended: "outline",
      approved: "default",
      rejected: "destructive",
      returned: "secondary",
      withdrawn: "secondary",
      cancelled: "secondary",
    }
    return statusMap[status]
  }

  const getStatusName = (status: ApplicationStatus) => {
    const statusNames = {
      zh: {
        draft: "草稿",
        submitted: "已提交",
        under_review: "審核中",
        pending_recommendation: "待教授推薦",
        recommended: "已推薦",
        approved: "已核准", 
        rejected: "已拒絕",
        returned: "已退回",
        withdrawn: "已撤回",
        cancelled: "已取消",
      },
      en: {
        draft: "Draft",
        submitted: "Submitted",
        under_review: "Under Review",
        pending_recommendation: "Pending Recommendation",
        recommended: "Recommended",
        approved: "Approved",
        rejected: "Rejected",
        returned: "Returned", 
        withdrawn: "Withdrawn",
        cancelled: "Cancelled",
      }
    } as const
    return statusNames[locale][status]
  }

  const getApplicationTimeline = (application: Application) => {
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

  // Helper function to build application data with available information
  const buildApplicationData = () => {
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1
    const academicYear = currentMonth >= 8 ? currentYear.toString() : (currentYear - 1).toString()
    const semester = currentMonth >= 2 && currentMonth <= 7 ? "2" : "1" // Spring: 2-7, Fall: 8-1
    
    // Helper to truncate strings to fit database constraints
    const truncateString = (str: string | undefined, maxLength: number): string | undefined => {
      if (!str) return undefined
      return str.length > maxLength ? str.substring(0, maxLength) : str
    }
    
    // Build application with minimum required data (works with or without studentData)
    const applicationData = {
      scholarship_type: newApplicationData.scholarship_type,
      academic_year: truncateString(academicYear, 10), // Max 10 chars
      semester: truncateString(semester, 10), // Max 10 chars
      contact_email: user.email, // Always available from user
      agree_terms: true, // Default to true
      // Optional fields from studentData (if available)
      ...(studentData?.gpa && { gpa: studentData.gpa }),
      ...(studentData?.phone_number && { 
        contact_phone: truncateString(studentData.phone_number, 20) 
      }),
      ...(studentData?.address && { contact_address: studentData.address }),
      ...(studentData?.bank_account && { 
        bank_account: truncateString(studentData.bank_account, 20) 
      })
    }
    
    console.log('Built application data:', applicationData)
    console.log('Student data available:', !!studentData)
    console.log('Field lengths:', {
      scholarship_type: applicationData.scholarship_type?.length || 0,
      academic_year: applicationData.academic_year?.length || 0,
      semester: applicationData.semester?.length || 0,
      contact_phone: applicationData.contact_phone?.length || 0,
      contact_email: applicationData.contact_email?.length || 0,
      bank_account: applicationData.bank_account?.length || 0
    })
    
    return applicationData
  }

  // 新增狀態用於詳情對話框
  const [selectedApplicationForDetails, setSelectedApplicationForDetails] = useState<Application | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  
  // 申請文件狀態
  const [applicationFiles, setApplicationFiles] = useState<{ [applicationId: number]: any[] }>({})
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  
  // 文件預覽狀態
  const [previewFile, setPreviewFile] = useState<{ url: string; filename: string; type: string } | null>(null)
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false)

  const handleSubmitApplication = async () => {
    if (!newApplicationData.scholarship_type) {
      alert(locale === "zh" ? "請選擇獎學金類型" : "Please select scholarship type")
      return
    }

    // Check if student data is still loading
    if (isLoadingStudentData) {
      alert(locale === "zh" ? "正在載入學生資料，請稍後再試" : "Loading student data, please try again later")
      return
    }

    try {
      setIsSubmitting(true)
      
      // 編輯模式 vs 新建模式
      if (editingApplication) {
        // 編輯模式：更新現有申請
        const applicationData = buildApplicationData()
        console.log('Updating application with data:', applicationData)
        
        // Step 1: Update the application
        await updateApplication(editingApplication.id, applicationData)
        console.log('Application updated:', editingApplication.id)
        
        // Step 2: Upload new files if any
        for (const [docType, files] of Object.entries(uploadedFiles)) {
          if (files && files.length > 0) {
            for (const file of files) {
              // 只上傳新文件（沒有isUploaded標記的）
              if (!(file as any).isUploaded) {
                try {
                  await uploadDocument(editingApplication.id, file, docType)
                  console.log(`Successfully uploaded ${docType} file`)
                } catch (error) {
                  console.error(`Failed to upload ${docType} file:`, error)
                }
              }
            }
          }
        }
        
        // Step 3: Submit the updated application for review
        try {
          await submitApplicationApi(editingApplication.id)
          console.log('Updated application submitted for review')
        } catch (error) {
          console.error('Failed to submit updated application for review:', error)
        }
      } else {
        // 新建模式：創建新申請
        const applicationData = buildApplicationData()
        console.log('Submitting application with data:', applicationData)
        
        // Step 1: Create the application
        const createdApplication = await createApplication(applicationData)
        console.log('Application created:', createdApplication)
        
        if (!createdApplication || !createdApplication.id) {
          throw new Error('Failed to create application')
        }
        
        // Step 2: Upload files if any
        for (const [docType, files] of Object.entries(uploadedFiles)) {
          if (files && files.length > 0) {
            for (const file of files) {
              try {
                await uploadDocument(createdApplication.id, file, docType)
                console.log(`Successfully uploaded ${docType} file`)
              } catch (error) {
                console.error(`Failed to upload ${docType} file:`, error)
                // Continue with other files even if one fails
              }
            }
          }
        }
        
        // Step 3: Submit the application for review
        try {
          await submitApplicationApi(createdApplication.id)
          console.log('Application submitted for review')
        } catch (error) {
          console.error('Failed to submit application for review:', error)
          // Even if submission fails, the application was created
        }
      }
      
      // 清除對應申請的文件緩存，確保查看詳情時會重新獲取最新文件
      if (editingApplication) {
        setApplicationFiles(prev => {
          const newFiles = { ...prev }
          delete newFiles[editingApplication.id]
          return newFiles
        })
      }
      
      // Reset form
      setNewApplicationData({
        scholarship_type: '',
      })
      setUploadedFiles({})
      setSelectedScholarship(null)
      setEditingApplication(null)
      
      // 重新載入申請列表確保狀態正確
      await fetchApplications()
      
      // 切換到我的申請tab
      setActiveTab("applications")
      
      alert(locale === "zh" ? "申請提交成功！" : "Application submitted successfully!")
      
    } catch (error) {
      console.error('Failed to submit application:', error)
      
      // Extract error message from API response
      let errorMessage = 'Unknown error'
      if (error instanceof Error) {
        errorMessage = error.message
        
        // Check if it's a specific backend error and provide user-friendly messages
        if (errorMessage.includes('Student profile not found')) {
          errorMessage = locale === "zh" 
            ? "找不到學生資料，請聯繫管理員設定您的學號資料" 
            : "Student profile not found, please contact admin to set up your student record"
        } else if (errorMessage.includes('Scholarship type') && errorMessage.includes('not found')) {
          errorMessage = locale === "zh" 
            ? "獎學金類型無效，請重新選擇" 
            : "Invalid scholarship type, please select again"
        } else if (errorMessage.includes('not active')) {
          errorMessage = locale === "zh" 
            ? "此獎學金已停用" 
            : "This scholarship is inactive"
        } else if (errorMessage.includes('Application period')) {
          errorMessage = locale === "zh" 
            ? "申請期限已過" 
            : "Application period has ended"
        } else if (errorMessage.includes('not eligible') || errorMessage.includes('Only pre-approved students')) {
          errorMessage = locale === "zh" 
            ? "您不在此獎學金的白名單內，僅限預先核准的學生申請" 
            : "You are not on the whitelist for this scholarship. Only pre-approved students can apply"
        } else if (errorMessage.includes('already have an active application')) {
          errorMessage = locale === "zh" 
            ? "您已經有一個進行中的申請" 
            : "You already have an active application for this scholarship"
        } else if (errorMessage.includes('Failed to create application')) {
          errorMessage = locale === "zh" 
            ? "系統錯誤，請稍後再試或聯繫管理員" 
            : "System error, please try again later or contact admin"
        }
      }
      
      alert(locale === "zh" ? `提交失敗: ${errorMessage}` : `Failed to submit application: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!newApplicationData.scholarship_type) {
      alert(locale === "zh" ? "請選擇獎學金類型" : "Please select scholarship type")
      return
    }

    try {
      setIsSubmitting(true)
      
      // Build application data with available information
      const applicationData = buildApplicationData()
      console.log('Saving draft with data:', applicationData) // Debug log
      
      const application = await saveApplicationDraft(applicationData)
      console.log('Save draft response:', application) // Debug log
      
      if (application && application.id) {
        // If successful, upload files to the created application
        const applicationId = application.id
        
        // Upload files for each document type
        for (const [docType, files] of Object.entries(uploadedFiles)) {
          if (files && files.length > 0) {
            for (const file of files) {
              try {
                await uploadDocument(applicationId, file, docType)
                console.log(`Successfully uploaded ${docType} file`) // Debug log
              } catch (error) {
                console.error(`Failed to upload ${docType} file:`, error)
                // Don't stop the process for upload errors
              }
            }
          }
        }
        
        // Note: We don't need to refresh applications list here because
        // the saveApplicationDraft hook already updates the applications state
        // Refreshing would cause unnecessary re-renders and potential state loss
        console.log('Draft saved without triggering navigation') // Debug log
        
        // Keep user on the same page - don't clear form or switch tabs
        // This allows continued editing of the draft
        
        alert(locale === "zh" ? "草稿已保存，您可以繼續編輯" : "Draft saved successfully. You can continue editing.")
      } else {
        console.error('Invalid application response:', application) // Debug log
        throw new Error('Invalid application response')
      }
    } catch (error) {
      console.error('Failed to save draft:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(locale === "zh" ? `保存失敗: ${errorMessage}` : `Failed to save draft: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleWithdrawApplication = async (applicationId: number) => {
    try {
      await withdrawApplication(applicationId)
    } catch (error) {
      console.error('Failed to withdraw application:', error)
    }
  }

  // Helper functions for document labels and descriptions
  const getDocumentLabel = (docType: string, locale: Locale) => {
    const labels: Record<string, Record<string, string>> = {
      transcript: {
        zh: "成績單",
        en: "Academic Transcript"
      },
      research_proposal: {
        zh: "研究計畫書",
        en: "Research Proposal"
      },
      budget_plan: {
        zh: "預算計畫",
        en: "Budget Plan"
      },
      bank_account: {
        zh: "銀行帳戶證明",
        en: "Bank Account Verification"
      },
      recommendation_letter: {
        zh: "推薦信",
        en: "Recommendation Letter"
      },
      cv: {
        zh: "履歷表",
        en: "Curriculum Vitae"
      },
      portfolio: {
        zh: "作品集",
        en: "Portfolio"
      }
    }
    return labels[docType]?.[locale] || docType
  }

  const getDocumentDescription = (docType: string, locale: Locale) => {
    const descriptions: Record<string, Record<string, string>> = {
      transcript: {
        zh: "請上傳最新的成績單，支援 PDF、JPG、PNG 格式",
        en: "Please upload your latest academic transcript in PDF, JPG, or PNG format"
      },
      research_proposal: {
        zh: "請上傳研究計畫書，詳細說明研究目標與方法",
        en: "Please upload your research proposal with detailed objectives and methodology"
      },
      budget_plan: {
        zh: "請上傳詳細的預算計畫，包含支出項目與金額",
        en: "Please upload a detailed budget plan including expenditure items and amounts"
      },
      bank_account: {
        zh: "請上傳銀行帳戶證明文件",
        en: "Please upload bank account verification documents"
      },
      recommendation_letter: {
        zh: "請上傳推薦信，由指導教授或相關人員簽署",
        en: "Please upload recommendation letter signed by supervisor or relevant personnel"
      },
      cv: {
        zh: "請上傳個人履歷表",
        en: "Please upload your curriculum vitae"
      },
      portfolio: {
        zh: "請上傳相關作品集或證明文件",
        en: "Please upload relevant portfolio or supporting documents"
      }
    }
    return descriptions[docType]?.[locale] || "請上傳相關文件"
  }

  // 獲取申請文件
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

  // 查看詳情處理函數
  const handleViewDetails = async (application: Application) => {
    setSelectedApplicationForDetails(application)
    setIsDetailsDialogOpen(true)
    
    // 清除緩存並重新載入申請文件，確保獲取最新數據
    setApplicationFiles(prev => {
      const newFiles = { ...prev }
      delete newFiles[application.id]
      return newFiles
    })
    await fetchApplicationFiles(application.id)
  }

  // 編輯處理函數
  const handleEditApplication = async (application: Application) => {
    // 設置編輯模式
    setEditingApplication(application)
    
    // 載入申請資料到表單
    setNewApplicationData({
      scholarship_type: application.scholarship_type,
    })
    setSelectedScholarship(eligibleScholarships.find(s => s.code === application.scholarship_type) || null)
    
    // 載入已上傳的文件
    await fetchApplicationFiles(application.id)
    const files = applicationFiles[application.id] || []
    
    // 將已上傳的文件轉換為前端格式
    const uploadedFilesByType: { [key: string]: File[] } = {}
    files.forEach((file: any) => {
      if (file.file_type && file.filename) {
        // 創建模擬的File對象來表示已上傳的文件
        // 使用原始文件大小，如果沒有則使用 1024 作為默認值（避免顯示 0 bytes）
        const fileSize = file.file_size || file.size || 1024
        
        // 創建一個包含適當大小的模擬 File 對象
        const mockBlob = new Blob([''], { type: file.mime_type || 'application/octet-stream' })
        const mockFile = new File([mockBlob], file.filename || file.original_filename, { 
          type: file.mime_type || 'application/octet-stream' 
        })
        
        // 手動設置文件大小（這是一個 hack，但是必要的）
        Object.defineProperty(mockFile, 'size', {
          value: fileSize,
          writable: false,
          configurable: false
        })
        
        // 添加額外屬性來標識這是已上傳的文件
        ;(mockFile as any).isUploaded = true
        ;(mockFile as any).downloadUrl = file.file_path || file.url
        ;(mockFile as any).fileId = file.id
        ;(mockFile as any).originalSize = fileSize
        
        if (!uploadedFilesByType[file.file_type]) {
          uploadedFilesByType[file.file_type] = []
        }
        uploadedFilesByType[file.file_type].push(mockFile)
      }
    })
    
    setUploadedFiles(uploadedFilesByType)
    
    // 切換到新增申請頁面
    setActiveTab("new-application")
  }



  // Loading state
  if (isLoadingScholarships || isLoadingStudentData) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">
            {locale === "zh" ? "正在載入資料..." : "Loading data..."}
          </p>
          {isLoadingScholarships && (
            <p className="text-sm text-muted-foreground mt-2">
              {locale === "zh" ? "載入獎學金資訊..." : "Loading scholarship information..."}
            </p>
          )}
          {isLoadingStudentData && (
            <p className="text-sm text-muted-foreground mt-2">
              {locale === "zh" ? "載入學生資料..." : "Loading student data..."}
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (scholarshipsError) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-4" />
          <p className="text-destructive">
            {scholarshipsError}
          </p>
        </CardContent>
      </Card>
    )
  }

  // No eligible scholarships
  if (eligibleScholarships.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {locale === "zh" ? "目前沒有符合資格的獎學金" : "No Eligible Scholarships"}
          </h3>
          <p className="text-muted-foreground">
            {locale === "zh"
              ? "很抱歉，您目前沒有符合申請資格的獎學金。請稍後再試或聯繫獎學金辦公室。"
              : "Sorry, you are not currently eligible for any scholarships. Please try again later or contact the scholarship office."}
          </p>
        </CardContent>
      </Card>
    )
  }

  const renderApplicationCard = (application: Application) => (
    <Card key={application.id} className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{application.scholarship_type}</span>
          <Badge variant={getStatusColor(application.status as ApplicationStatus)}>
            {getStatusName(application.status as ApplicationStatus)}
          </Badge>
        </CardTitle>
        <CardDescription>
          {t("applications.submitted_at")}: {application.submitted_at ? new Date(application.submitted_at).toLocaleDateString() : '-'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProgressTimeline steps={getApplicationTimeline(application)} />
        {application.status === "draft" && (
          <div className="mt-4 flex justify-end space-x-2">
            <Button variant="outline" onClick={() => handleWithdrawApplication(application.id)}>
              {t("applications.withdraw")}
            </Button>
            <Button onClick={handleSubmitApplication}>
              {t("applications.submit")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Scholarship Info Cards */}
      {eligibleScholarships.map((scholarship) => (
        <Card key={scholarship.id} className="border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">{scholarship.name}</CardTitle>
                <CardDescription className="mt-1">{scholarship.description}</CardDescription>
              </div>
              <Badge variant="outline" className="text-lg px-3 py-1">
                {scholarship.amount} {scholarship.currency}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{locale === "zh" ? "申請資格" : "Eligibility"}</p>
                  <p className="text-sm text-muted-foreground">
                    {locale === "zh"
                      ? `僅限白名單內學生申請，${scholarship.eligible_student_types?.join("、")}`
                      : `Whitelist-only application, ${scholarship.eligible_student_types?.join(", ")}`}
                  </p>
                </div>
              </div>

              {/* Required Documents Info */}
              {scholarship.required_documents && scholarship.required_documents.length > 0 && (
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{locale === "zh" ? "必要文件" : "Required Documents"}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {scholarship.required_documents.map((docType) => (
                        <Badge key={docType} variant="outline" className="text-xs">
                          {getDocumentLabel(docType, locale)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Application Period */}
              {scholarship.application_start_date && scholarship.application_end_date && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-orange-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{locale === "zh" ? "申請期間" : "Application Period"}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(scholarship.application_start_date).toLocaleDateString()} - {new Date(scholarship.application_end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="applications">{locale === "zh" ? "我的申請" : "My Applications"}</TabsTrigger>
          <TabsTrigger value="new-application">{locale === "zh" ? "新增申請" : "New Application"}</TabsTrigger>
          <TabsTrigger value="profile">{locale === "zh" ? "個人資料" : "Profile"}</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{locale === "zh" ? "申請記錄" : "Application Records"}</CardTitle>
              <CardDescription>
                {locale === "zh"
                  ? "查看您的獎學金申請狀態與進度"
                  : "View your scholarship application status and progress"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {applicationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : applicationsError ? (
                <div className="text-destructive text-center py-4">
                  {applicationsError}
                </div>
              ) : applications.length === 0 ? (
                <div className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-12 w-12 text-muted-foreground" />
                    <p className="text-lg font-medium text-muted-foreground">
                      {locale === "zh" ? "尚無申請記錄" : "No application records"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {locale === "zh" 
                        ? "您可以點擊「新增申請」開始申請獎學金" 
                        : "Click 'New Application' to start your scholarship application"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.map((app) => (
                    <div key={app.id} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{getScholarshipTypeName(app.scholarship_type)}</h4>
                          <p className="text-sm text-muted-foreground">
                            {locale === "zh" ? "申請編號" : "Application ID"}: {app.app_id || `APP-${app.id}`}
                          </p>
                        </div>
                        <Badge variant={getStatusColor(app.status as ApplicationStatus)}>
                          {getStatusName(app.status as ApplicationStatus)}
                        </Badge>
                      </div>

                      {/* Progress Timeline */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {locale === "zh" ? "審核進度" : "Review Progress"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ProgressTimeline steps={getApplicationTimeline(app)} orientation="horizontal" />
                        </CardContent>
                      </Card>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(app)}>
                          <Eye className="h-4 w-4 mr-1" />
                          {locale === "zh" ? "查看詳情" : "View Details"}
                        </Button>
                        {app.status === "draft" && (
                          <Button variant="outline" size="sm" onClick={() => handleEditApplication(app)}>
                            <Edit className="h-4 w-4 mr-1" />
                            {locale === "zh" ? "編輯" : "Edit"}
                          </Button>
                        )}
                        {app.status === "submitted" && (
                          <Button variant="outline" size="sm" onClick={() => handleWithdrawApplication(app.id)}>
                            <Trash2 className="h-4 w-4 mr-1" />
                            {locale === "zh" ? "撤回申請" : "Withdraw"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new-application" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {editingApplication ? (
                  locale === "zh" ? "編輯申請" : "Edit Application"
                ) : (
                  locale === "zh" ? `申請 ${eligibleScholarships[0]?.name}` : `Apply for ${eligibleScholarships[0]?.name_en}`
                )}
              </CardTitle>
              <CardDescription>
                {editingApplication ? (
                  locale === "zh" 
                    ? `正在編輯申請編號: ${editingApplication.app_id || `APP-${editingApplication.id}`}` 
                    : `Editing Application ID: ${editingApplication.app_id || `APP-${editingApplication.id}`}`
                ) : (
                  locale === "zh"
                    ? "請填寫完整資料並上傳相關文件"
                    : "Please complete all information and upload required documents"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Form fields */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="scholarship_type">{locale === "zh" ? "獎學金類型" : "Scholarship Type"} *</Label>
                  <Select 
                    value={newApplicationData.scholarship_type} 
                    onValueChange={(value) => {
                      setNewApplicationData(prev => ({ ...prev, scholarship_type: value }))
                      const scholarship = eligibleScholarships.find(s => s.code === value)
                      setSelectedScholarship(scholarship || null)
                      // Only reset files if scholarship has different required documents
                      const newScholarship = scholarship
                      const currentRequiredDocs = selectedScholarship?.required_documents || []
                      const newRequiredDocs = newScholarship?.required_documents || []
                      
                      // Check if the required documents are different
                      const docsChanged = JSON.stringify(currentRequiredDocs.sort()) !== JSON.stringify(newRequiredDocs.sort())
                      
                      if (docsChanged) {
                        // Only clear files for documents that are no longer required
                        setUploadedFiles(prev => {
                          const filtered: { [key: string]: File[] } = {}
                          for (const docType of newRequiredDocs) {
                            if (prev[docType]) {
                              filtered[docType] = prev[docType]
                            }
                          }
                          return filtered
                        })
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={locale === "zh" ? "選擇獎學金類型" : "Select scholarship type"} />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleScholarships.map((scholarship) => (
                        <SelectItem key={scholarship.id} value={scholarship.code}>
                          {scholarship.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>



                {/* Required Documents Section */}
                {selectedScholarship?.required_documents && selectedScholarship.required_documents.length > 0 && (
                  <div className="space-y-4">
                    <Label className="text-base font-medium">
                      {locale === "zh" ? "必要文件" : "Required Documents"}
                    </Label>
                    
                    {selectedScholarship.required_documents.map((docType) => (
                      <div key={docType} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`doc-${docType}`} className="text-sm">
                            {getDocumentLabel(docType, locale)} *
                          </Label>
                          {uploadedFiles[docType] && uploadedFiles[docType].length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {uploadedFiles[docType].length} 個檔案
                            </Badge>
                          )}
                        </div>
                        <FileUpload
                          key={`upload-${docType}`} // Static key per document type
                          onFilesChange={(files) => {
                            setUploadedFiles(prev => ({
                              ...prev,
                              [docType]: files
                            }))
                          }}
                          acceptedTypes={[".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"]}
                          maxSize={10 * 1024 * 1024} // 10MB
                          maxFiles={3}
                          initialFiles={uploadedFiles[docType] || []}
                          fileType={docType}
                        />
                        <p className="text-xs text-muted-foreground">
                          {getDocumentDescription(docType, locale)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Progress indicator */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{locale === "zh" ? "完成進度" : "Progress"}</span>
                  <span>{formProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${formProgress}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex justify-between">
                <div className="flex gap-2">
                  {/* Save Draft Button */}
                  <Button 
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={isSubmitting || !newApplicationData.scholarship_type}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {locale === "zh" ? "保存中..." : "Saving..."}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {locale === "zh" ? "保存草稿" : "Save Draft"}
                      </>
                    )}
                  </Button>
                  
                  {/* Cancel Edit Button */}
                  {editingApplication && (
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setEditingApplication(null)
                        setNewApplicationData({ scholarship_type: "" })
                        setSelectedScholarship(null)
                        setUploadedFiles({})
                        setActiveTab("applications")
                      }}
                      disabled={isSubmitting}
                    >
                      {locale === "zh" ? "取消編輯" : "Cancel Edit"}
                    </Button>
                  )}
                </div>

                {/* Submit Button */}
                <Button 
                  onClick={handleSubmitApplication}
                  disabled={isSubmitting || formProgress < 100}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editingApplication ? (
                        locale === "zh" ? "更新中..." : "Updating..."
                      ) : (
                        locale === "zh" ? "提交中..." : "Submitting..."
                      )}
                    </>
                  ) : (
                    editingApplication ? (
                      locale === "zh" ? "更新申請" : "Update Application"
                    ) : (
                      locale === "zh" ? "提交申請" : "Submit Application"
                    )
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{locale === "zh" ? "個人資料" : "Personal Information"}</CardTitle>
              <CardDescription>
                {locale === "zh"
                  ? "管理您的個人資訊與學籍資料"
                  : "Manage your personal information and academic records"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{locale === "zh" ? "學號" : "Student ID"}</Label>
                  <Input value={user.id} disabled />
                </div>
                <div>
                  <Label>{locale === "zh" ? "姓名" : "Name"}</Label>
                  <Input value={user.name} disabled />
                </div>
                <div>
                  <Label>{locale === "zh" ? "電子郵件" : "Email"}</Label>
                  <Input value={user.email} disabled />
                </div>
                <div>
                  <Label>{locale === "zh" ? "學生類型" : "Student Type"}</Label>
                  <Input
                    value={
                      user.studentType === "undergraduate"
                        ? locale === "zh"
                          ? "學士"
                          : "Undergraduate"
                        : user.studentType === "phd"
                          ? locale === "zh"
                            ? "博士"
                            : "PhD"
                          : user.studentType === "direct_phd"
                            ? locale === "zh"
                              ? "逕博"
                              : "Direct PhD"
                          : locale === "zh"
                            ? "錯誤"
                            : "Error"
                    }
                    disabled
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  {locale === "zh" ? "更新聯絡資訊" : "Update Contact Information"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 查看詳情對話框 */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {locale === "zh" ? "申請詳情" : "Application Details"}
            </DialogTitle>
            <DialogDescription>
              {selectedApplicationForDetails && (
                <span>
                  {locale === "zh" ? "申請編號" : "Application ID"}: {selectedApplicationForDetails.app_id || `APP-${selectedApplicationForDetails.id}`}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedApplicationForDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">{locale === "zh" ? "獎學金類型" : "Scholarship Type"}</Label>
                  <p className="text-sm">{getScholarshipTypeName(selectedApplicationForDetails.scholarship_type)}</p>
                </div>
                <div>
                  <Label className="font-medium">{locale === "zh" ? "申請狀態" : "Status"}</Label>
                  <Badge variant={getStatusColor(selectedApplicationForDetails.status as ApplicationStatus)}>
                    {getStatusName(selectedApplicationForDetails.status as ApplicationStatus)}
                  </Badge>
                </div>
                <div>
                  <Label className="font-medium">{locale === "zh" ? "建立時間" : "Created At"}</Label>
                  <p className="text-sm">{new Date(selectedApplicationForDetails.created_at).toLocaleDateString(locale === "zh" ? "zh-TW" : "en-US")}</p>
                </div>
                {selectedApplicationForDetails.submitted_at && (
                  <div>
                    <Label className="font-medium">{locale === "zh" ? "提交時間" : "Submitted At"}</Label>
                    <p className="text-sm">{new Date(selectedApplicationForDetails.submitted_at).toLocaleDateString(locale === "zh" ? "zh-TW" : "en-US")}</p>
                  </div>
                )}
              </div>
              
              {selectedApplicationForDetails.personal_statement && (
                <div>
                  <Label className="font-medium">{locale === "zh" ? "個人陳述" : "Personal Statement"}</Label>
                  <p className="text-sm mt-1 p-2 bg-muted rounded">{selectedApplicationForDetails.personal_statement}</p>
                </div>
              )}
              
              <div>
                <Label className="font-medium">{locale === "zh" ? "審核進度" : "Review Progress"}</Label>
                <div className="mt-2">
                  <ProgressTimeline steps={getApplicationTimeline(selectedApplicationForDetails)} />
                </div>
              </div>
              
              {/* 顯示已上傳的文件 */}
              <div>
                <Label className="font-medium">{locale === "zh" ? "已上傳文件" : "Uploaded Files"}</Label>
                {isLoadingFiles ? (
                  <div className="flex items-center gap-2 mt-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      {locale === "zh" ? "載入文件中..." : "Loading files..."}
                    </span>
                  </div>
                ) : applicationFiles[selectedApplicationForDetails.id] && applicationFiles[selectedApplicationForDetails.id].length > 0 ? (
                  <div className="mt-2 space-y-2">
                                      {applicationFiles[selectedApplicationForDetails.id].map((file: any, index: number) => (
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
                              // Smart MIME type detection based on filename if mime_type is empty
                              const detectMimeType = (filename: string, mimeType?: string) => {
                                if (mimeType && mimeType !== 'application/octet-stream') {
                                  return mimeType;
                                }
                                
                                const extension = filename.toLowerCase().split('.').pop();
                                switch (extension) {
                                  case 'pdf':
                                    return 'application/pdf';
                                  case 'jpg':
                                  case 'jpeg':
                                    return 'image/jpeg';
                                  case 'png':
                                    return 'image/png';
                                  case 'gif':
                                    return 'image/gif';
                                  case 'doc':
                                    return 'application/msword';
                                  case 'docx':
                                    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                                  default:
                                    return 'application/octet-stream';
                                }
                              };
                              
                              const filename = file.filename || file.original_filename;
                              const detectedType = detectMimeType(filename, file.mime_type);
                              
                              setPreviewFile({
                                url: file.file_path,
                                filename: filename,
                                type: detectedType
                              })
                              setIsPreviewDialogOpen(true)
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
                  <p className="text-sm text-muted-foreground mt-2">
                    {locale === "zh" ? "尚未上傳任何文件" : "No files uploaded yet"}
                  </p>
                )}
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
                    onClick={() => window.open(previewFile.url, '_blank')}
                    variant="outline"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {locale === "zh" ? "在新視窗開啟" : "Open in New Window"}
                  </Button>
                </div>
              )}
              
              <div className="flex justify-between items-center mt-4">
                <Button
                  variant="outline"
                  onClick={() => window.open(previewFile.url, '_blank')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {locale === "zh" ? "在新視窗開啟" : "Open in New Window"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsPreviewDialogOpen(false)}
                >
                  {locale === "zh" ? "關閉" : "Close"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
