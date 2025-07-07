"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  FormInput, 
  FileText, 
  UserCheck, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  GraduationCap,
  Loader2,
  AlertCircle,
  CheckCircle
} from "lucide-react"
import { WhitelistManagement } from "@/components/whitelist-management"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ApplicationFieldForm } from "@/components/application-field-form"
import { ApplicationDocumentForm } from "@/components/application-document-form"
import { api } from "@/lib/api"
import type { ApplicationField, ApplicationDocument, ScholarshipFormConfig, ApplicationFieldCreate, ApplicationFieldUpdate, ApplicationDocumentCreate, ApplicationDocumentUpdate } from "@/lib/api"

type ScholarshipType = "undergraduate_freshman" | "direct_phd" | "phd"

interface ScholarshipManagementPanelProps {
  type: ScholarshipType
  className?: string
}

const SCHOLARSHIP_CONFIG = {
  undergraduate_freshman: {
    title: "學士班新生獎學金",
    icon: GraduationCap,
    color: "blue",
    hasWhitelist: true,
  },
  direct_phd: {
    title: "逕博獎學金",
    icon: GraduationCap,
    color: "purple",
    hasWhitelist: true,
  },
  phd: {
    title: "博士生獎學金",
    icon: GraduationCap,
    color: "green",
    hasWhitelist: false,
  }
}

const getDefaultFields = (type: ScholarshipType): Partial<ApplicationField>[] => {
  switch (type) {
    case "undergraduate_freshman":
      return [
        {
          field_name: "academic_performance",
          field_label: "學業表現說明",
          field_type: "textarea",
          is_required: true,
          placeholder: "請說明您在高中階段的學業表現和特殊成就",
          max_length: 1500,
          display_order: 1,
          is_active: true
        },
        {
          field_name: "family_income",
          field_label: "家庭收入範圍",
          field_type: "select",
          is_required: true,
          placeholder: "請選擇家庭年收入範圍",
          field_options: [
            {value: "low", label: "50萬以下"},
            {value: "medium", label: "50-100萬"},
            {value: "high", label: "100萬以上"}
          ],
          display_order: 2,
          is_active: true
        },
        {
          field_name: "extracurricular",
          field_label: "課外活動與服務",
          field_type: "textarea",
          is_required: false,
          placeholder: "請描述您參與的課外活動、社會服務或特殊才能表現",
          max_length: 1000,
          display_order: 3,
          is_active: true
        },
        {
          field_name: "future_goals",
          field_label: "學習目標與規劃",
          field_type: "textarea",
          is_required: true,
          placeholder: "請說明您的學習目標和未來職涯規劃",
          max_length: 1000,
          display_order: 4,
          is_active: true
        }
      ]
    case "direct_phd":
      return [
        {
          field_name: "personal_statement",
          field_label: "個人陳述",
          field_type: "textarea",
          is_required: true,
          placeholder: "請詳述申請逕博獎學金的理由和未來研究計畫",
          max_length: 2000,
          display_order: 1,
          is_active: true
        },
        {
          field_name: "research_plan",
          field_label: "研究計畫",
          field_type: "textarea",
          is_required: true,
          placeholder: "請描述您的研究計畫和預期成果",
          max_length: 3000,
          display_order: 2,
          is_active: true
        },
        {
          field_name: "advisor_name",
          field_label: "指導教授姓名",
          field_type: "text",
          is_required: true,
          placeholder: "請輸入指導教授姓名",
          max_length: 50,
          display_order: 3,
          is_active: true
        },
        {
          field_name: "gpa",
          field_label: "學業成績(GPA)",
          field_type: "number",
          is_required: true,
          placeholder: "請輸入您的GPA",
          min_value: 0,
          max_value: 4.0,
          step_value: 0.01,
          display_order: 4,
          is_active: true
        },
        {
          field_name: "expected_graduation",
          field_label: "預計畢業日期",
          field_type: "date",
          is_required: true,
          placeholder: "",
          display_order: 5,
          is_active: true
        }
      ]
    case "phd":
      return [
        {
          field_name: "research_proposal",
          field_label: "研究計畫書",
          field_type: "textarea",
          is_required: true,
          placeholder: "請詳述您的博士研究計畫",
          max_length: 5000,
          display_order: 1,
          is_active: true
        },
        {
          field_name: "advisor_agreement",
          field_label: "指導教授同意書",
          field_type: "checkbox",
          is_required: true,
          placeholder: "我已獲得指導教授同意",
          display_order: 2,
          is_active: true
        },
        {
          field_name: "funding_source",
          field_label: "其他經費來源",
          field_type: "select",
          is_required: false,
          placeholder: "請選擇其他經費來源",
          field_options: [
            {value: "none", label: "無"},
            {value: "nstc", label: "國科會計畫"},
            {value: "industry", label: "產學合作"},
            {value: "other", label: "其他"}
          ],
          display_order: 3,
          is_active: true
        }
      ]
    default:
      return []
  }
}

const getDefaultDocuments = (type: ScholarshipType): Partial<ApplicationDocument>[] => {
  switch (type) {
    case "undergraduate_freshman":
      return [
        {
          document_name: "高中成績單",
          description: "高中三年完整成績單",
          is_required: true,
          accepted_file_types: ["PDF", "JPG", "PNG"],
          max_file_size: "5MB",
          max_file_count: 1,
          display_order: 1,
          is_active: true,
          upload_instructions: "請上傳清晰完整的成績單掃描檔或照片"
        },
        {
          document_name: "戶籍謄本",
          description: "最近三個月內申請的戶籍謄本",
          is_required: true,
          accepted_file_types: ["PDF", "JPG", "PNG"],
          max_file_size: "5MB",
          max_file_count: 1,
          display_order: 2,
          is_active: true,
          upload_instructions: "請確保文件有效期限內且資訊清晰可讀"
        },
        {
          document_name: "家庭收入證明",
          description: "父母親最近一年度綜合所得稅各類所得資料清單",
          is_required: true,
          accepted_file_types: ["PDF", "JPG", "PNG"],
          max_file_size: "5MB",
          max_file_count: 2,
          display_order: 3,
          is_active: true,
          upload_instructions: "請同時上傳父母雙方的所得資料清單"
        },
        {
          document_name: "自傳",
          description: "個人自傳，包含成長背景、學習歷程等",
          is_required: true,
          accepted_file_types: ["PDF", "DOC", "DOCX"],
          max_file_size: "5MB",
          max_file_count: 1,
          display_order: 4,
          is_active: true,
          upload_instructions: "自傳字數建議800-1200字"
        }
      ]
    case "direct_phd":
      return [
        {
          document_name: "學士學位證書",
          description: "申請人之學士學位證書正本或影本",
          is_required: true,
          accepted_file_types: ["PDF", "JPG", "PNG"],
          max_file_size: "5MB",
          max_file_count: 1,
          display_order: 1,
          is_active: true,
          upload_instructions: "請確保證書資訊清晰完整"
        },
        {
          document_name: "歷年成績單",
          description: "大學歷年成績單正本或影本",
          is_required: true,
          accepted_file_types: ["PDF", "JPG", "PNG"],
          max_file_size: "10MB",
          max_file_count: 1,
          display_order: 2,
          is_active: true,
          upload_instructions: "需包含完整的學分和成績記錄"
        },
        {
          document_name: "研究計畫書",
          description: "詳細的博士論文研究計畫",
          is_required: true,
          accepted_file_types: ["PDF", "DOC", "DOCX"],
          max_file_size: "10MB",
          max_file_count: 1,
          display_order: 3,
          is_active: true,
          upload_instructions: "建議5000-8000字，需包含研究背景、目標、方法等"
        },
        {
          document_name: "指導教授推薦信",
          description: "指導教授親筆簽名推薦信",
          is_required: true,
          accepted_file_types: ["PDF", "JPG", "PNG"],
          max_file_size: "5MB",
          max_file_count: 1,
          display_order: 4,
          is_active: true,
          upload_instructions: "推薦信需有教授親筆簽名"
        }
      ]
    case "phd":
      return [
        {
          document_name: "研究計畫書",
          description: "博士學位論文研究計畫書",
          is_required: true,
          accepted_file_types: ["PDF", "DOC", "DOCX"],
          max_file_size: "10MB",
          max_file_count: 1,
          display_order: 1,
          is_active: true,
          upload_instructions: "需詳述研究目標、方法、預期成果等"
        },
        {
          document_name: "歷年成績單",
          description: "研究所歷年成績單",
          is_required: true,
          accepted_file_types: ["PDF", "JPG", "PNG"],
          max_file_size: "5MB",
          max_file_count: 1,
          display_order: 2,
          is_active: true,
          upload_instructions: "需包含到目前為止的所有學期成績"
        },
        {
          document_name: "指導教授同意書",
          description: "指導教授簽署的指導同意書",
          is_required: true,
          accepted_file_types: ["PDF", "JPG", "PNG"],
          max_file_size: "5MB",
          max_file_count: 1,
          display_order: 3,
          is_active: true,
          upload_instructions: "需有指導教授親筆簽名和日期"
        },
        {
          document_name: "研究進度報告",
          description: "目前研究進度報告",
          is_required: false,
          accepted_file_types: ["PDF", "DOC", "DOCX"],
          max_file_size: "10MB",
          max_file_count: 1,
          display_order: 4,
          is_active: true,
          upload_instructions: "可包含已完成的研究成果或發表論文"
        }
      ]
    default:
      return []
  }
}

export function ScholarshipManagementPanel({ type, className }: ScholarshipManagementPanelProps) {
  const config = SCHOLARSHIP_CONFIG[type]
  const IconComponent = config.icon

  // State for form configuration
  const [formConfig, setFormConfig] = useState<ScholarshipFormConfig | null>(null)
  const [applicationFields, setApplicationFields] = useState<ApplicationField[]>([])
  const [documentRequirements, setDocumentRequirements] = useState<ApplicationDocument[]>([])
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Form states
  const [fieldFormOpen, setFieldFormOpen] = useState(false)
  const [documentFormOpen, setDocumentFormOpen] = useState(false)
  const [editingField, setEditingField] = useState<ApplicationField | null>(null)
  const [editingDocument, setEditingDocument] = useState<ApplicationDocument | null>(null)

  // Auto-hide success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)
      
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  // Load form configuration on component mount
  useEffect(() => {
    loadFormConfig()
  }, [type])

  const loadFormConfig = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // 管理端需要看到所有欄位（包括停用的）
      const response = await api.applicationFields.getFormConfig(type, true)
      
      if (response.success && response.data) {
        setFormConfig(response.data)
        setApplicationFields(response.data.fields || [])
        setDocumentRequirements(response.data.documents || [])
      } else {
        // If no configuration exists, initialize with defaults
        initializeDefaultConfig()
      }
    } catch (err) {
      console.error('Failed to load form configuration:', err)
      // Initialize with defaults if API fails
      initializeDefaultConfig()
    } finally {
      setIsLoading(false)
    }
  }

  const initializeDefaultConfig = () => {
    const defaultFields = getDefaultFields(type)
    const defaultDocuments = getDefaultDocuments(type)
    
    // Convert to ApplicationField[] format (without id for new items)
    const fields = defaultFields.map((field, index) => ({
      id: 0, // Will be assigned by backend
      scholarship_type: type,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...field
    })) as ApplicationField[]
    
    const documents = defaultDocuments.map((doc, index) => ({
      id: 0, // Will be assigned by backend  
      scholarship_type: type,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...doc
    })) as ApplicationDocument[]
    
    setApplicationFields(fields)
    setDocumentRequirements(documents)
  }

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true)
      setError(null)
      setSuccessMessage(null)

      // Prepare data for API
      const configData = {
        fields: applicationFields.map(field => ({
          field_name: field.field_name,
          field_label: field.field_label,
          field_label_en: field.field_label_en,
          field_type: field.field_type,
          is_required: field.is_required,
          placeholder: field.placeholder,
          placeholder_en: field.placeholder_en,
          max_length: field.max_length,
          min_value: field.min_value,
          max_value: field.max_value,
          step_value: field.step_value,
          field_options: field.field_options,
          display_order: field.display_order,
          is_active: field.is_active,
          help_text: field.help_text,
          help_text_en: field.help_text_en,
          validation_rules: field.validation_rules,
          conditional_rules: field.conditional_rules
        })),
        documents: documentRequirements.map(doc => ({
          document_name: doc.document_name,
          document_name_en: doc.document_name_en,
          description: doc.description,
          description_en: doc.description_en,
          is_required: doc.is_required,
          accepted_file_types: doc.accepted_file_types,
          max_file_size: doc.max_file_size,
          max_file_count: doc.max_file_count,
          display_order: doc.display_order,
          is_active: doc.is_active,
          upload_instructions: doc.upload_instructions,
          upload_instructions_en: doc.upload_instructions_en,
          validation_rules: doc.validation_rules
        }))
      }

      const response = await api.applicationFields.saveFormConfig(type, configData)
      
      if (response.success) {
        setSuccessMessage(`${config.title}設定已成功保存`)
        // 不要重新載入配置，保持當前狀態
        // 只有在需要獲取新的 ID 時才重新載入
        if (response.data) {
          // 更新現有項目的 ID（如果是新創建的）
          if (response.data.fields) {
            setApplicationFields(prev => 
              prev.map(field => {
                const updatedField = response.data.fields.find(f => f.field_name === field.field_name)
                return updatedField ? { ...field, id: updatedField.id } : field
              })
            )
          }
          if (response.data.documents) {
            setDocumentRequirements(prev => 
              prev.map(doc => {
                const updatedDoc = response.data.documents.find(d => d.document_name === doc.document_name)
                return updatedDoc ? { ...doc, id: updatedDoc.id } : doc
              })
            )
          }
        }
      } else {
        setError(response.message || '保存設定時發生錯誤')
      }
    } catch (err) {
      console.error('Failed to save configuration:', err)
      setError('保存設定時發生錯誤，請稍後再試')
    } finally {
      setIsSaving(false)
    }
  }

  // Field management handlers
  const handleCreateField = async (fieldData: ApplicationFieldCreate) => {
    try {
      const response = await api.applicationFields.createField(fieldData)
      if (response.success) {
        setApplicationFields(prev => [...prev, response.data])
        setSuccessMessage('欄位新增成功')
        setFieldFormOpen(false)
      } else {
        setError(response.message || '新增欄位失敗')
      }
    } catch (err) {
      console.error('Failed to create field:', err)
      setError('新增欄位失敗，請稍後再試')
    }
  }

  const handleUpdateField = async (fieldData: ApplicationFieldUpdate) => {
    if (!editingField) return
    
    try {
      const response = await api.applicationFields.updateField(editingField.id, fieldData)
      if (response.success) {
        setApplicationFields(prev => 
          prev.map(field => field.id === editingField.id ? response.data : field)
        )
        setSuccessMessage('欄位更新成功')
        setFieldFormOpen(false)
        setEditingField(null)
      } else {
        setError(response.message || '更新欄位失敗')
      }
    } catch (err) {
      console.error('Failed to update field:', err)
      setError('更新欄位失敗，請稍後再試')
    }
  }

  const handleDeleteField = async (fieldId: number) => {
    try {
      const response = await api.applicationFields.deleteField(fieldId)
      if (response.success) {
        setApplicationFields(prev => prev.filter(field => field.id !== fieldId))
        setSuccessMessage('欄位刪除成功')
      } else {
        setError(response.message || '刪除欄位失敗')
      }
    } catch (err) {
      console.error('Failed to delete field:', err)
      setError('刪除欄位失敗，請稍後再試')
    }
  }

  // Document management handlers
  const handleCreateDocument = async (documentData: ApplicationDocumentCreate) => {
    try {
      const response = await api.applicationFields.createDocument(documentData)
      if (response.success) {
        setDocumentRequirements(prev => [...prev, response.data])
        setSuccessMessage('文件要求新增成功')
        setDocumentFormOpen(false)
      } else {
        setError(response.message || '新增文件要求失敗')
      }
    } catch (err) {
      console.error('Failed to create document:', err)
      setError('新增文件要求失敗，請稍後再試')
    }
  }

  const handleUpdateDocument = async (documentData: ApplicationDocumentUpdate) => {
    if (!editingDocument) return
    
    try {
      const response = await api.applicationFields.updateDocument(editingDocument.id, documentData)
      if (response.success) {
        setDocumentRequirements(prev => 
          prev.map(doc => doc.id === editingDocument.id ? response.data : doc)
        )
        setSuccessMessage('文件要求更新成功')
        setDocumentFormOpen(false)
        setEditingDocument(null)
      } else {
        setError(response.message || '更新文件要求失敗')
      }
    } catch (err) {
      console.error('Failed to update document:', err)
      setError('更新文件要求失敗，請稍後再試')
    }
  }

  const handleDeleteDocument = async (documentId: number) => {
    try {
      const response = await api.applicationFields.deleteDocument(documentId)
      if (response.success) {
        setDocumentRequirements(prev => prev.filter(doc => doc.id !== documentId))
        setSuccessMessage('文件要求刪除成功')
      } else {
        setError(response.message || '刪除文件要求失敗')
      }
    } catch (err) {
      console.error('Failed to delete document:', err)
      setError('刪除文件要求失敗，請稍後再試')
    }
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">載入設定中...</span>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Error/Success Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {successMessage && (
        <Alert variant="default" className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${config.color === 'blue' ? 'bg-blue-100' : config.color === 'purple' ? 'bg-purple-100' : 'bg-green-100'}`}>
            <IconComponent className={`h-6 w-6 ${config.color === 'blue' ? 'text-blue-600' : config.color === 'purple' ? 'text-purple-600' : 'text-green-600'}`} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{config.title}管理設定</h2>
            <p className="text-sm text-gray-600">管理申請要求、文件設定{config.hasWhitelist ? "和白名單" : ""}</p>
          </div>
        </div>
        <Button 
          onClick={handleSaveSettings} 
          disabled={isSaving}
          className="nycu-gradient text-white px-6"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              儲存中...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              儲存所有設定
            </>
          )}
        </Button>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="fields" className="space-y-6">
        <TabsList className={`grid w-full ${config.hasWhitelist ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="fields" className="flex items-center gap-2">
            <FormInput className="h-4 w-4" />
            申請欄位
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            文件要求
          </TabsTrigger>
          {config.hasWhitelist && (
            <TabsTrigger value="whitelist" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              白名單管理
            </TabsTrigger>
          )}
        </TabsList>

        {/* Application Fields Tab */}
        <TabsContent value="fields" className="space-y-4">
          <Card className="border-2 border-gray-100 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FormInput className="h-5 w-5 text-blue-600" />
                    申請表單欄位管理
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    設定{config.title}申請表單中的欄位類型、驗證規則和要求
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setEditingField(null)
                    setFieldFormOpen(true)
                  }}
                  className="nycu-gradient text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  新增欄位
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Fields Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="font-semibold">欄位資訊</TableHead>
                      <TableHead className="font-semibold">類型</TableHead>
                      <TableHead className="font-semibold">必填</TableHead>
                      <TableHead className="font-semibold">狀態</TableHead>
                      <TableHead className="font-semibold">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applicationFields.map((field) => (
                      <TableRow key={field.id || field.field_name} className="hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900">{field.field_label}</div>
                            <div className="text-sm text-gray-500">{field.field_name}</div>
                            {field.placeholder && (
                              <div className="text-xs text-gray-400 mt-1">{field.placeholder}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize font-medium">
                            {field.field_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={field.is_required ? "destructive" : "secondary"}>
                            {field.is_required ? "必填" : "選填"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={field.is_active}
                              onCheckedChange={(checked) => {
                                setApplicationFields(prev => 
                                  prev.map(f => 
                                    f.field_name === field.field_name ? { ...f, is_active: checked } : f
                                  )
                                )
                              }}
                            />
                            <span className={`text-xs ${field.is_active ? 'text-green-600' : 'text-gray-500'}`}>
                              {field.is_active ? '啟用' : '停用'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingField(field)
                                setFieldFormOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {field.id && field.id > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteField(field.id)}
                                className="text-red-600 hover:text-red-700"
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card className="border-2 border-gray-100 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-green-600" />
                    申請文件管理
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    設定{config.title}申請時需要上傳的文件類型、格式和大小限制
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setEditingDocument(null)
                    setDocumentFormOpen(true)
                  }}
                  className="nycu-gradient text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  新增文件
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Documents Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="font-semibold">文件資訊</TableHead>
                      <TableHead className="font-semibold">必要性</TableHead>
                      <TableHead className="font-semibold">支援格式</TableHead>
                      <TableHead className="font-semibold">大小限制</TableHead>
                      <TableHead className="font-semibold">狀態</TableHead>
                      <TableHead className="font-semibold">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documentRequirements.map((doc) => (
                      <TableRow key={doc.id || doc.document_name} className="hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900">{doc.document_name}</div>
                            <div className="text-sm text-gray-500">{doc.description}</div>
                            {doc.upload_instructions && (
                              <div className="text-xs text-gray-400 mt-1">{doc.upload_instructions}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={doc.is_required ? "destructive" : "secondary"}>
                            {doc.is_required ? "必要" : "選填"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {doc.accepted_file_types.map((type) => (
                              <Badge key={type} variant="outline" className="text-xs">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium text-gray-700">{doc.max_file_size}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={doc.is_active}
                              onCheckedChange={(checked) => {
                                setDocumentRequirements(prev => 
                                  prev.map(d => 
                                    d.document_name === doc.document_name ? { ...d, is_active: checked } : d
                                  )
                                )
                              }}
                            />
                            <span className={`text-xs ${doc.is_active ? 'text-green-600' : 'text-gray-500'}`}>
                              {doc.is_active ? '啟用' : '停用'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingDocument(doc)
                                setDocumentFormOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {doc.id && doc.id > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="text-red-600 hover:text-red-700"
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Whitelist Tab */}
        {config.hasWhitelist && (
          <TabsContent value="whitelist" className="space-y-4">
            <WhitelistManagement 
              scholarshipType={type}
              title={`${config.title}白名單管理`}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Application Field Form */}
      <ApplicationFieldForm
        field={editingField}
        scholarshipType={type}
        isOpen={fieldFormOpen}
        onClose={() => {
          setFieldFormOpen(false)
          setEditingField(null)
        }}
        onSave={editingField ? handleUpdateField : handleCreateField}
        mode={editingField ? "edit" : "create"}
      />

      {/* Application Document Form */}
      <ApplicationDocumentForm
        document={editingDocument}
        scholarshipType={type}
        isOpen={documentFormOpen}
        onClose={() => {
          setDocumentFormOpen(false)
          setEditingDocument(null)
        }}
        onSave={editingDocument ? handleUpdateDocument : handleCreateDocument}
        mode={editingDocument ? "edit" : "create"}
      />
    </div>
  )
} 