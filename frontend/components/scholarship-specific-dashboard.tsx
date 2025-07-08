"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  FileText, 
  Users, 
  Clock, 
  Timer, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  GraduationCap,
  Star,
  TrendingUp,
  RefreshCw
} from "lucide-react"
import { useScholarshipSpecificApplications } from "@/hooks/use-admin"

interface Application {
  id: number
  student_name?: string
  student_no?: string
  status: string
  status_name?: string
  submitted_at?: string
  days_waiting?: number
  scholarship_subtype_list?: string[]
  user?: {
    email: string
  }
}

export function ScholarshipSpecificDashboard() {
  // 使用 hook 獲取真實資料
  const { 
    applicationsByType, 
    scholarshipTypes,
    scholarshipStats,
    isLoading, 
    error, 
    refetch,
    updateApplicationStatus 
  } = useScholarshipSpecificApplications()

  // Debug logging
  console.log('ScholarshipSpecificDashboard render:', {
    scholarshipTypes,
    scholarshipStats,
    applicationsByType,
    isLoading,
    error
  })

  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [activeTab, setActiveTab] = useState("")
  const [selectedSubTypes, setSelectedSubTypes] = useState<string[]>([]) // 多選子類型
  const [tabLoading, setTabLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showApplicationDetail, setShowApplicationDetail] = useState(false)

  // 動態獲取各類型申請資料
  const getApplicationsByType = (type: string) => applicationsByType[type] || []
  
  // 獲取當前選擇的獎學金類型的子類型（從後端獲取）
  const getCurrentScholarshipSubTypes = () => {
    if (!activeTab || !scholarshipStats[activeTab]) return []
    return scholarshipStats[activeTab].sub_types || []
  }
  
  // 當獎學金類型載入後，自動選擇第一個類型
  useEffect(() => {
    if (scholarshipTypes.length > 0 && !activeTab) {
      setActiveTab(scholarshipTypes[0])
    }
  }, [scholarshipTypes, activeTab])
  
  // 當獎學金類型改變時，重置子類型選擇
  useEffect(() => {
    setSelectedSubTypes([])
  }, [activeTab])

  // 搜尋和篩選邏輯
  const filterApplications = (applications: Application[]) => {
    let filtered = applications

    // 狀態篩選
    if (statusFilter !== "all") {
      filtered = filtered.filter(app => app.status === statusFilter)
    }

    // 搜尋篩選
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(app => 
        app.student_name?.toLowerCase().includes(term) ||
        app.student_no?.toLowerCase().includes(term) ||
        app.user?.email.toLowerCase().includes(term)
      )
    }

    return filtered
  }

  // 獲取獎學金顯示名稱
  const getScholarshipDisplayName = (code: string) => {
    const nameMap: Record<string, string> = {
      'undergraduate_freshman': '學士班新生獎學金',
      'phd': '博士生獎學金',
      'direct_phd': '逕升博士獎學金'
    }
    return nameMap[code] || code
  }

  // 獲取子類型顯示名稱
  const getSubTypeDisplayName = (subType: string) => {
    const nameMap: Record<string, string> = {
      'nstc': '國科會',
      'moe_1w': '教育部一萬元',
      'moe_2w': '教育部兩萬元',
      'general': '一般'
    }
    return nameMap[subType] || subType
  }

  // 處理申請狀態更新
  const handleStatusUpdate = async (applicationId: number, newStatus: string) => {
    try {
      await updateApplicationStatus(applicationId, newStatus)
      // 重新載入數據
      refetch()
    } catch (error) {
      console.error('Failed to update application status:', error)
      alert('更新申請狀態失敗')
    }
  }

  // 渲染統計卡片
  const renderStatsCards = (applications: Application[]) => {
    const totalApplications = applications.length
    const pendingApplications = applications.filter(app => 
      ['submitted', 'under_review'].includes(app.status)
    ).length
    const approvedApplications = applications.filter(app => 
      app.status === 'approved'
    ).length
    const rejectedApplications = applications.filter(app => 
      app.status === 'rejected'
    ).length

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
    )
  }

  // 渲染申請列表
  const renderApplicationsTable = (applications: Application[], showSubTypes: boolean = false) => {
    const filteredApplications = filterApplications(applications)

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
          {/* 搜尋和篩選 */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Label>搜尋申請人</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜尋姓名、學號或信箱"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>狀態篩選</Label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
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
                  <TableHead>申請人</TableHead>
                  <TableHead>學號</TableHead>
                  {showSubTypes && <TableHead>子項目</TableHead>}
                  <TableHead>狀態</TableHead>
                  <TableHead>提交時間</TableHead>
                  <TableHead>等待天數</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <div className="font-medium">{app.student_name || '未知'}</div>
                      <div className="text-sm text-gray-500">{app.user?.email || 'N/A'}</div>
                    </TableCell>
                    <TableCell>{app.student_no || 'N/A'}</TableCell>
                    {showSubTypes && (
                      <TableCell>
                        {app.scholarship_subtype_list && app.scholarship_subtype_list.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {app.scholarship_subtype_list.map((subType: string) => (
                              <Badge key={subType} variant="outline" className="text-xs">
                                {getSubTypeDisplayName(subType)}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">一般</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge
                        variant={
                          app.status === 'approved' ? 'default' :
                          app.status === 'rejected' ? 'destructive' :
                          app.status === 'submitted' ? 'secondary' :
                          'outline'
                        }
                      >
                        {app.status_name || app.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {app.submitted_at 
                        ? new Date(app.submitted_at).toLocaleDateString('zh-TW')
                        : 'N/A'
                      }
                    </TableCell>
                    <TableCell>
                      {app.days_waiting !== undefined 
                        ? `${app.days_waiting}天`
                        : 'N/A'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedApplication(app)
                            setShowApplicationDetail(true)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {app.status === 'submitted' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusUpdate(app.id, 'approved')}
                              className="hover:bg-green-50 hover:border-green-300 hover:text-green-600"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusUpdate(app.id, 'rejected')}
                              className="hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
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
    )
  }

  // 處理子類型選擇
  const handleSubTypeToggle = (subType: string) => {
    setSelectedSubTypes(prev => {
      if (prev.includes(subType)) {
        return prev.filter(type => type !== subType)
      } else {
        return [...prev, subType]
      }
    })
  }

  // 過濾申請數據根據選擇的子類型
  const filterApplicationsBySubTypes = (applications: Application[]) => {
    if (selectedSubTypes.length === 0) {
      return applications // 如果沒有選擇子類型，顯示全部
    }
    
    // 這裡需要根據實際的申請數據結構來過濾
    // 暫時返回全部，實際實現時需要根據 scholarship_subtype_list 來過濾
    return applications.filter(app => {
      // 如果申請有子類型信息，檢查是否匹配
      if (app.scholarship_subtype_list && Array.isArray(app.scholarship_subtype_list)) {
        return app.scholarship_subtype_list.some((subType: string) => selectedSubTypes.includes(subType))
      }
      return true // 如果沒有子類型信息，暫時顯示
    })
  }

  // 渲染子類型多選標籤頁
  const renderSubTypeTabs = (applications: Application[]) => {
    const subTypes = getCurrentScholarshipSubTypes()
    
    if (subTypes.length === 0) {
      // 沒有子類型的獎學金，直接顯示統計卡片和申請列表
      return (
        <div className="space-y-6">
          {renderStatsCards(applications)}
          {renderApplicationsTable(applications, false)}
        </div>
      )
    }

    // 過濾掉 "general" 類型，只顯示其他子類型
    const filteredSubTypes = subTypes.filter((subType: string) => subType !== "general")
    
    // 如果沒有其他子類型，直接顯示申請列表
    if (filteredSubTypes.length === 0) {
      // 只有 "general" 類型的獎學金，顯示統計卡片和申請列表
      return (
        <div className="space-y-6">
          {renderStatsCards(applications)}
          {renderApplicationsTable(applications, false)}
        </div>
      )
    }

    // 過濾申請數據
    const filteredApplications = filterApplicationsBySubTypes(applications)

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
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white'
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
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
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
                      {selectedSubTypes.map(type => getSubTypeDisplayName(type)).join(', ')}
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
                      (已篩選: {selectedSubTypes.map(type => getSubTypeDisplayName(type)).join(', ')})
                    </span>
                  )}
                </p>
              </div>
              <Badge variant="outline" className="text-blue-700 border-blue-300">
                {filteredApplications.length} 筆
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* 申請列表 */}
        {renderStatsCards(filteredApplications)}
        {renderApplicationsTable(filteredApplications, true)}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
          <span className="text-gray-600">載入獎學金資料中...</span>
        </div>
      </div>
    )
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
    )
  }

  if (scholarshipTypes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium">尚無獎學金資料</p>
        <p className="text-sm mt-2">請先建立獎學金類型</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">獎學金申請管理</h2>
          <p className="text-muted-foreground">管理各類型獎學金申請案件</p>
        </div>
        <Button onClick={refetch} variant="outline" disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          重新整理
        </Button>
      </div>

      {/* 獎學金類型標籤頁 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {scholarshipTypes.map((type) => (
            <TabsTrigger key={type} value={type} className="text-sm">
              {getScholarshipDisplayName(type)}
            </TabsTrigger>
          ))}
        </TabsList>

        {scholarshipTypes.map((type) => (
          <TabsContent key={type} value={type} className="space-y-6">
            {renderSubTypeTabs(getApplicationsByType(type))}
          </TabsContent>
        ))}
      </Tabs>

      {/* 申請詳情 Modal 可以在這裡添加 */}
    </div>
  )
}
