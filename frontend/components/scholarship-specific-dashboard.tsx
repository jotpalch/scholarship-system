"use client"

import { useState } from "react"
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
  Settings
} from "lucide-react"
import { useScholarshipSpecificApplications } from "@/hooks/use-admin"
import { WhitelistManagement } from "@/components/whitelist-management"
import { DocumentRequirementsManagement } from "@/components/document-requirements-management"

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
  
  // 使用 hook 獲取真實資料
  const { 
    applicationsByType, 
    isLoading, 
    error, 
    updateApplicationStatus 
  } = useScholarshipSpecificApplications()

  // 從 hook 獲取各類型申請資料
  const undergraduateApplications = applicationsByType.undergraduate_freshman || []
  const phdNstcApplications = applicationsByType.phd_nstc || []
  const phdMoeApplications = applicationsByType.phd_moe || []
  const directPhdApplications = applicationsByType.direct_phd || []

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

  if (isLoading) {
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
    <div className="space-y-6">
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
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
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
            <FileText className="h-4 w-4 text-muted-foreground" />
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
          <Input placeholder="搜尋學生姓名或學號..." className="pl-8" />
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部狀態</SelectItem>
            <SelectItem value="pending">待審核</SelectItem>
            <SelectItem value="approved">已核准</SelectItem>
            <SelectItem value="rejected">已駁回</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-1" />
          匯出報告
        </Button>
      </div>

      {/* 申請列表 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>申請編號</TableHead>
                <TableHead>學生資訊</TableHead>
                <TableHead>國籍</TableHead>
                <TableHead>系所</TableHead>
                <TableHead>GPA</TableHead>
                <TableHead>排名</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead>等待天數</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {undergraduateApplications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.app_id || `APP-${app.id}`}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{app.student_name || app.student?.user?.full_name || "未知學生"}</p>
                      <p className="text-sm text-muted-foreground">{app.student_id}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <NationalityFlag 
                      countryCode={app.nationality || app.student?.nationality || "OTHER"} 
                      locale={locale} 
                      showLabel={false} 
                    />
                  </TableCell>
                  <TableCell>{app.department || app.student?.department || "未知系所"}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>GPA: {app.gpa || "N/A"}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>排名資訊待更新</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(app.status) as any}>{getStatusName(app.status)}</Badge>
                  </TableCell>
                  <TableCell>{app.days_waiting || 0} 天</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm">
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

      {/* 白名單管理 */}
      <WhitelistManagement />
    </div>
  )

  const renderPhdNstcTab = () => (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總申請數</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{phdNstcApplications.length}</div>
            <p className="text-xs text-muted-foreground">國科會博士生獎學金</p>
          </CardContent>
        </Card>
        {/* ...other cards as needed... */}
      </div>
      {/* 申請列表 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>申請編號</TableHead>
                <TableHead>學生資訊</TableHead>
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
              {phdNstcApplications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.app_id || `APP-${app.id}`}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{app.student_name || app.student?.user?.full_name || "未知學生"}</p>
                      <p className="text-sm text-muted-foreground">{app.student_id}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <NationalityFlag 
                      countryCode={app.nationality || app.student?.nationality || "OTHER"} 
                      locale={locale} 
                      showLabel={false} 
                    />
                  </TableCell>
                  <TableCell>{app.department || app.student?.department || "未知系所"}</TableCell>
                  <TableCell>未設定指導教授</TableCell>
                  <TableCell>研究領域待更新</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(app.status) as any}>{getStatusName(app.status)}</Badge>
                  </TableCell>
                  <TableCell>{app.days_waiting || 0} 天</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm">
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
      {/* 文件要求管理 */}
      <DocumentRequirementsManagement />
    </div>
  )

  const renderPhdMoeTab = () => (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總申請數</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{phdMoeApplications.length}</div>
            <p className="text-xs text-muted-foreground">教育部博士生獎學金</p>
          </CardContent>
        </Card>
        {/* ...other cards as needed... */}
      </div>
      {/* 申請列表 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>申請編號</TableHead>
                <TableHead>學生資訊</TableHead>
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
              {phdMoeApplications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.app_id || `APP-${app.id}`}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{app.student_name || app.student?.user?.full_name || "未知學生"}</p>
                      <p className="text-sm text-muted-foreground">{app.student_id}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <NationalityFlag 
                      countryCode={app.nationality || app.student?.nationality || "OTHER"} 
                      locale={locale} 
                      showLabel={false} 
                    />
                  </TableCell>
                  <TableCell>{app.department || app.student?.department || "未知系所"}</TableCell>
                  <TableCell>未設定指導教授</TableCell>
                  <TableCell>研究領域待更新</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(app.status) as any}>{getStatusName(app.status)}</Badge>
                  </TableCell>
                  <TableCell>{app.days_waiting || 0} 天</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm">
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
      {/* 文件要求管理 */}
      <DocumentRequirementsManagement />
    </div>
  )

  const renderDirectPhdTab = () => (
    <div className="space-y-6">
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
            <FileText className="h-4 w-4 text-muted-foreground" />
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
            <FileText className="h-4 w-4 text-muted-foreground" />
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

      {/* 申請列表 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>申請編號</TableHead>
                <TableHead>學生資訊</TableHead>
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
              {directPhdApplications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.app_id || `APP-${app.id}`}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{app.student_name || app.student?.user?.full_name || "未知學生"}</p>
                      <p className="text-sm text-muted-foreground">{app.student_id}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <NationalityFlag 
                      countryCode={app.nationality || app.student?.nationality || "OTHER"} 
                      locale={locale} 
                      showLabel={false} 
                    />
                  </TableCell>
                  <TableCell>{app.department || app.student?.department || "未知系所"}</TableCell>
                  <TableCell>未設定指導教授</TableCell>
                  <TableCell>研究領域待更新</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(app.status) as any}>{getStatusName(app.status)}</Badge>
                  </TableCell>
                  <TableCell>{app.days_waiting || 0} 天</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm">
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
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">獎學金審核管理</h2>
          <p className="text-muted-foreground">依獎學金類型分類管理申請案件</p>
        </div>
      </div>

      <Tabs defaultValue="undergraduate" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="undergraduate" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            學士班新生獎學金
          </TabsTrigger>
          <TabsTrigger value="phd_nstc" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            國科會博士生獎學金
          </TabsTrigger>
          <TabsTrigger value="phd_moe" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            教育部博士生獎學金
          </TabsTrigger>
          <TabsTrigger value="direct-phd" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            逕博獎學金
          </TabsTrigger>
        </TabsList>

        <TabsContent value="undergraduate" className="space-y-4">
          {renderUndergraduateTab()}
        </TabsContent>

        <TabsContent value="phd_nstc" className="space-y-4">
          {renderPhdNstcTab()}
        </TabsContent>

        <TabsContent value="phd_moe" className="space-y-4">
          {renderPhdMoeTab()}
        </TabsContent>

        <TabsContent value="direct-phd" className="space-y-4">
          {renderDirectPhdTab()}
        </TabsContent>
      </Tabs>
    </div>
  )
}
