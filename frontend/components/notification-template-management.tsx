"use client"

import React, { useState, useEffect } from 'react'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { 
  Button 
} from '@/components/ui/button'
import { 
  Input 
} from '@/components/ui/input'
import { 
  Label 
} from '@/components/ui/label'
import { 
  Textarea 
} from '@/components/ui/textarea'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Badge 
} from '@/components/ui/badge'
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTab 
} from '@/components/ui/tabs'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Copy, 
  Search,
  Filter,
  MoreHorizontal
} from 'lucide-react'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface NotificationTemplate {
  id: number
  scholarship_type_id?: number
  template_type: string
  template_key: string
  name: string
  name_en?: string
  subject_template: string
  subject_template_en?: string
  body_template: string
  body_template_en?: string
  cc_emails?: string[]
  bcc_emails?: string[]
  is_active: boolean
  is_default: boolean
  scholarship_name?: string
  scholarship_code?: string
  created_at: string
  updated_at: string
}

interface ScholarshipType {
  id: number
  code: string
  name: string
  name_en?: string
}

interface TemplateVariable {
  variable_name: string
  variable_key: string
  display_name: string
  display_name_en?: string
  description?: string
  data_type: string
  is_required: boolean
}

const templateTypes = [
  { value: 'whitelist', label: '白名單通知', label_en: 'Whitelist Notification' },
  { value: 'application', label: '申請通知', label_en: 'Application Notification' },
  { value: 'recommendation', label: '推薦通知', label_en: 'Recommendation Notification' },
  { value: 'review', label: '審核通知', label_en: 'Review Notification' },
  { value: 'supplementary_document', label: '補充文件通知', label_en: 'Supplementary Document Notification' },
  { value: 'result', label: '結果通知', label_en: 'Result Notification' },
  { value: 'roster_creation', label: '名單建立通知', label_en: 'Roster Creation Notification' },
]

export default function NotificationTemplateManagement() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [scholarshipTypes, setScholarshipTypes] = useState<ScholarshipType[]>([])
  const [variables, setVariables] = useState<TemplateVariable[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedScholarshipType, setSelectedScholarshipType] = useState<string>('')
  const [selectedTemplateType, setSelectedTemplateType] = useState<string>('')
  const [previewContent, setPreviewContent] = useState<{ subject: string, body: string } | null>(null)

  // Form state for create/edit
  const [formData, setFormData] = useState({
    scholarship_type_id: '',
    template_type: '',
    template_key: '',
    name: '',
    name_en: '',
    subject_template: '',
    subject_template_en: '',
    body_template: '',
    body_template_en: '',
    cc_emails: '',
    bcc_emails: '',
    is_active: true,
    is_default: false,
    description: '',
    description_en: ''
  })

  useEffect(() => {
    loadTemplates()
    loadScholarshipTypes()
  }, [searchTerm, selectedScholarshipType, selectedTemplateType])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search_term', searchTerm)
      if (selectedScholarshipType) params.append('scholarship_type_id', selectedScholarshipType)
      if (selectedTemplateType) params.append('template_type', selectedTemplateType)
      
      const response = await fetch(`/api/v1/notification-templates?${params}`)
      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadScholarshipTypes = async () => {
    try {
      const response = await fetch('/api/v1/scholarships')
      const data = await response.json()
      setScholarshipTypes(data || [])
    } catch (error) {
      console.error('Failed to load scholarship types:', error)
    }
  }

  const loadVariables = async (templateType: string) => {
    try {
      const response = await fetch(`/api/v1/notification-templates/variables/${templateType}`)
      const data = await response.json()
      setVariables(data || [])
    } catch (error) {
      console.error('Failed to load variables:', error)
    }
  }

  const handleCreate = () => {
    setSelectedTemplate(null)
    setFormData({
      scholarship_type_id: '',
      template_type: '',
      template_key: '',
      name: '',
      name_en: '',
      subject_template: '',
      subject_template_en: '',
      body_template: '',
      body_template_en: '',
      cc_emails: '',
      bcc_emails: '',
      is_active: true,
      is_default: false,
      description: '',
      description_en: ''
    })
    setIsEditDialogOpen(true)
  }

  const handleEdit = (template: NotificationTemplate) => {
    setSelectedTemplate(template)
    setFormData({
      scholarship_type_id: template.scholarship_type_id?.toString() || '',
      template_type: template.template_type,
      template_key: template.template_key,
      name: template.name,
      name_en: template.name_en || '',
      subject_template: template.subject_template,
      subject_template_en: template.subject_template_en || '',
      body_template: template.body_template,
      body_template_en: template.body_template_en || '',
      cc_emails: template.cc_emails?.join(', ') || '',
      bcc_emails: template.bcc_emails?.join(', ') || '',
      is_active: template.is_active,
      is_default: template.is_default,
      description: '',
      description_en: ''
    })
    setIsEditDialogOpen(true)
  }

  const handlePreview = async (template: NotificationTemplate) => {
    try {
      // Build sample context data
      const sampleContext = {
        student_name: '王小明',
        student_id: '110001001',
        application_id: 'APP-2024-001',
        scholarship_name: template.scholarship_name || '範例獎學金',
        submission_date: '2024/01/15',
        application_status: '審核中'
      }

      const response = await fetch('/api/v1/notification-templates/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_id: template.id,
          context_data: sampleContext,
          language: 'zh'
        })
      })

      const data = await response.json()
      setPreviewContent({
        subject: data.subject,
        body: data.body
      })
      setIsPreviewDialogOpen(true)
    } catch (error) {
      console.error('Failed to preview template:', error)
    }
  }

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        scholarship_type_id: formData.scholarship_type_id ? parseInt(formData.scholarship_type_id) : null,
        cc_emails: formData.cc_emails.split(',').map(email => email.trim()).filter(email => email),
        bcc_emails: formData.bcc_emails.split(',').map(email => email.trim()).filter(email => email),
      }

      const url = selectedTemplate 
        ? `/api/v1/notification-templates/${selectedTemplate.id}`
        : '/api/v1/notification-templates'
      
      const method = selectedTemplate ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        setIsEditDialogOpen(false)
        loadTemplates()
      }
    } catch (error) {
      console.error('Failed to save template:', error)
    }
  }

  const handleDelete = async () => {
    if (!selectedTemplate) return

    try {
      const response = await fetch(`/api/v1/notification-templates/${selectedTemplate.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setIsDeleteDialogOpen(false)
        loadTemplates()
      }
    } catch (error) {
      console.error('Failed to delete template:', error)
    }
  }

  const getTemplateTypeLabel = (type: string) => {
    return templateTypes.find(t => t.value === type)?.label || type
  }

  const insertVariable = (field: string, variable: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field as keyof typeof prev] + variable
    }))
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">通知範本管理</h1>
          <p className="text-gray-600">管理獎學金通知範本</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          新增範本
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">搜尋</Label>
              <Input
                id="search"
                placeholder="搜尋範本名稱或說明..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="scholarshipType">獎學金類型</Label>
              <Select value={selectedScholarshipType} onValueChange={setSelectedScholarshipType}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇獎學金類型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部</SelectItem>
                  <SelectItem value="global">全域範本</SelectItem>
                  {scholarshipTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="templateType">範本類型</Label>
              <Select value={selectedTemplateType} onValueChange={setSelectedTemplateType}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇範本類型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部</SelectItem>
                  {templateTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={loadTemplates}>
                <Search className="h-4 w-4 mr-2" />
                搜尋
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>通知範本列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>範本名稱</TableHead>
                <TableHead>獎學金類型</TableHead>
                <TableHead>範本類型</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead>預設</TableHead>
                <TableHead>更新時間</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{template.name}</div>
                      {template.name_en && (
                        <div className="text-sm text-gray-500">{template.name_en}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {template.scholarship_name || (
                      <Badge variant="outline">全域範本</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {getTemplateTypeLabel(template.template_type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={template.is_active ? "default" : "secondary"}>
                      {template.is_active ? '啟用' : '停用'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {template.is_default && (
                      <Badge variant="outline">預設</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(template.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handlePreview(template)}>
                          <Eye className="h-4 w-4 mr-2" />
                          預覽
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(template)}>
                          <Edit className="h-4 w-4 mr-2" />
                          編輯
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedTemplate(template)
                            setIsDeleteDialogOpen(true)
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          刪除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? '編輯通知範本' : '新增通知範本'}
            </DialogTitle>
            <DialogDescription>
              設定通知範本的基本資訊和內容
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="w-full">
            <TabsList>
              <TabsTab value="basic">基本設定</TabsTab>
              <TabsTab value="content">內容設定</TabsTab>
              <TabsTab value="variables">可用變數</TabsTab>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">範本名稱 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="name_en">英文名稱</Label>
                  <Input
                    id="name_en"
                    value={formData.name_en}
                    onChange={(e) => setFormData({...formData, name_en: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scholarship_type">獎學金類型</Label>
                  <Select 
                    value={formData.scholarship_type_id} 
                    onValueChange={(value) => setFormData({...formData, scholarship_type_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選擇獎學金類型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">全域範本</SelectItem>
                      {scholarshipTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="template_type">範本類型 *</Label>
                  <Select 
                    value={formData.template_type} 
                    onValueChange={(value) => {
                      setFormData({...formData, template_type: value})
                      loadVariables(value)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選擇範本類型" />
                    </SelectTrigger>
                    <SelectContent>
                      {templateTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="template_key">範本鍵值 *</Label>
                <Input
                  id="template_key"
                  value={formData.template_key}
                  onChange={(e) => setFormData({...formData, template_key: e.target.value})}
                  placeholder="例如: whitelist_notification_v1"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="content" className="space-y-4">
              <div>
                <Label htmlFor="subject_template">主旨範本 (中文) *</Label>
                <Input
                  id="subject_template"
                  value={formData.subject_template}
                  onChange={(e) => setFormData({...formData, subject_template: e.target.value})}
                  placeholder="例如: {scholarship_name} 白名單通知 - {student_name}"
                />
              </div>
              
              <div>
                <Label htmlFor="subject_template_en">主旨範本 (英文)</Label>
                <Input
                  id="subject_template_en"
                  value={formData.subject_template_en}
                  onChange={(e) => setFormData({...formData, subject_template_en: e.target.value})}
                  placeholder="例如: {scholarship_name} Whitelist Notification - {student_name}"
                />
              </div>
              
              <div>
                <Label htmlFor="body_template">內容範本 (中文) *</Label>
                <Textarea
                  id="body_template"
                  value={formData.body_template}
                  onChange={(e) => setFormData({...formData, body_template: e.target.value})}
                  rows={8}
                  placeholder="範本內容，可使用變數如 {student_name}, {scholarship_name} 等"
                />
              </div>
              
              <div>
                <Label htmlFor="body_template_en">內容範本 (英文)</Label>
                <Textarea
                  id="body_template_en"
                  value={formData.body_template_en}
                  onChange={(e) => setFormData({...formData, body_template_en: e.target.value})}
                  rows={8}
                  placeholder="English template content with variables like {student_name}, {scholarship_name}"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="variables" className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-3">可用變數</h3>
                <p className="text-sm text-gray-600 mb-4">
                  點擊變數名稱可將其插入範本中
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {variables.map((variable) => (
                    <div key={variable.variable_name} className="border rounded p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <Button
                            variant="link"
                            className="p-0 h-auto font-mono text-sm"
                            onClick={() => {
                              navigator.clipboard.writeText(variable.variable_key)
                            }}
                          >
                            {variable.variable_key}
                          </Button>
                          <div className="text-sm font-medium">{variable.display_name}</div>
                          {variable.description && (
                            <div className="text-xs text-gray-500">{variable.description}</div>
                          )}
                        </div>
                        <Badge variant={variable.is_required ? "destructive" : "outline"}>
                          {variable.is_required ? '必填' : '選填'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>
              {selectedTemplate ? '更新' : '建立'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>範本預覽</DialogTitle>
            <DialogDescription>
              以下是使用範例資料渲染的範本預覽
            </DialogDescription>
          </DialogHeader>
          
          {previewContent && (
            <div className="space-y-4">
              <div>
                <Label>主旨</Label>
                <div className="border rounded p-3 bg-gray-50">
                  {previewContent.subject}
                </div>
              </div>
              <div>
                <Label>內容</Label>
                <div className="border rounded p-3 bg-gray-50 whitespace-pre-wrap">
                  {previewContent.body}
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>
              關閉
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              您確定要刪除這個通知範本嗎？此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}