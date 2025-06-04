"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WhitelistManagement } from "@/components/whitelist-management"
import { DocumentRequirementsManagement } from "@/components/document-requirements-management"
import { NationalityFlag } from "@/components/nationality-flag"
import { getTranslation } from "@/lib/i18n"
import { Search, Eye, CheckCircle, XCircle, Download, Settings, Users, FileText, GraduationCap } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: "student" | "faculty" | "admin" | "super_admin"
}

interface ScholarshipSpecificDashboardProps {
  user: User
  locale?: "zh" | "en"
}

export function ScholarshipSpecificDashboard({ user, locale = "zh" }: ScholarshipSpecificDashboardProps) {
  const t = (key: string) => getTranslation(locale, key)
  const [selectedApplication, setSelectedApplication] = useState<any>(null)

  // 按獎學金類型分類的申請資料
  const [undergraduateApplications] = useState([
    {
      id: "APP-2025-000198",
      studentName: "張小明",
      studentNameEn: "Chang, Xiao-Ming",
      studentId: "B10901001",
      nationality: "TWN",
      department: "資訊工程學系",
      gpa: 3.91,
      classRank: 15,
      deptRank: 12,
      status: "pending_review",
      statusName: "待審核",
      submittedAt: "2025-06-01",
      amount: 50000,
      isWhitelisted: false,
      daysWaiting: 3,
    },
    {
      id: "APP-2025-000199",
      studentName: "李小華",
      studentNameEn: "Lee, Xiao-Hua",
      studentId: "B10901002",
      nationality: "HKM",
      department: "電機工程學系",
      gpa: 3.25,
      classRank: 45,
      deptRank: 42,
      status: "pending_review",
      statusName: "待審核",
      submittedAt: "2025-06-02",
      amount: 50000,
      isWhitelisted: true,
      daysWaiting: 2,
    },
  ])

  const [phdApplications] = useState([
    {
      id: "APP-2025-000200",
      studentName: "王小美",
      studentNameEn: "Wang, Xiao-Mei",
      studentId: "D10901001",
      nationality: "TWN",
      department: "資訊工程學系",
      advisor: "陳教授",
      researchArea: "人工智慧",
      status: "under_review",
      statusName: "審核中",
      submittedAt: "2025-05-28",
      amount: 120000,
      daysWaiting: 7,
    },
  ])

  const [directPhdApplications] = useState([
    {
      id: "APP-2025-000201",
      studentName: "陳小強",
      studentNameEn: "Chen, Xiao-Qiang",
      studentId: "D10901002",
      nationality: "OTHER",
      department: "電機工程學系",
      advisor: "林教授",
      researchArea: "量子計算",
      status: "pending_review",
      statusName: "待審核",
      submittedAt: "2025-06-01",
      amount: 150000,
      daysWaiting: 4,
    },
  ])

  const getStatusColor = (status: string) => {
    const statusMap = {
      pending_review: "destructive",
      under_review: "outline",
      approved: "default",
      rejected: "secondary",
    }
    return statusMap[status as keyof typeof statusMap] || "secondary"
  }

  const handleApprove = (appId: string) => {
    console.log(`Approving application ${appId}`)
  }

  const handleReject = (appId: string) => {
    console.log(`Rejecting application ${appId}`)
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
              {undergraduateApplications.filter((app) => app.gpa >= 3.38).length}
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
              {undergraduateApplications.filter((app) => app.isWhitelisted).length}
            </div>
            <p className="text-xs text-muted-foreground">特殊核准</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均GPA</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(
                undergraduateApplications.reduce((sum, app) => sum + app.gpa, 0) / undergraduateApplications.length
              ).toFixed(2)}
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
                  <TableCell className="font-medium">{app.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium">{app.studentName}</p>
                        <p className="text-sm text-muted-foreground">{app.studentId}</p>
                      </div>
                      {app.isWhitelisted && (
                        <Badge variant="outline" className="text-xs">
                          白名單
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <NationalityFlag countryCode={app.nationality} locale={locale} showLabel={false} />
                  </TableCell>
                  <TableCell>{app.department}</TableCell>
                  <TableCell>
                    <Badge variant={app.gpa >= 3.38 ? "default" : "destructive"}>{app.gpa}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>班排: {app.classRank}%</div>
                      <div>系排: {app.deptRank}%</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(app.status) as any}>{app.statusName}</Badge>
                  </TableCell>
                  <TableCell>{app.daysWaiting} 天</TableCell>
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

  const renderPhdTab = () => (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總申請數</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{phdApplications.length}</div>
            <p className="text-xs text-muted-foreground">博士班研究</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待審核</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {phdApplications.filter((app) => app.status === "pending_review").length}
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
              {(phdApplications.reduce((sum, app) => sum + app.daysWaiting, 0) / phdApplications.length).toFixed(1)} 天
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
              {phdApplications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.id}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{app.studentName}</p>
                      <p className="text-sm text-muted-foreground">{app.studentId}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <NationalityFlag countryCode={app.nationality} locale={locale} showLabel={false} />
                  </TableCell>
                  <TableCell>{app.department}</TableCell>
                  <TableCell>{app.advisor}</TableCell>
                  <TableCell>{app.researchArea}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(app.status) as any}>{app.statusName}</Badge>
                  </TableCell>
                  <TableCell>{app.daysWaiting} 天</TableCell>
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
              {directPhdApplications.filter((app) => app.status === "pending_review").length}
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
              {(
                directPhdApplications.reduce((sum, app) => sum + app.daysWaiting, 0) / directPhdApplications.length
              ).toFixed(1)}{" "}
              天
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
                  <TableCell className="font-medium">{app.id}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{app.studentName}</p>
                      <p className="text-sm text-muted-foreground">{app.studentId}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <NationalityFlag countryCode={app.nationality} locale={locale} showLabel={false} />
                  </TableCell>
                  <TableCell>{app.department}</TableCell>
                  <TableCell>{app.advisor}</TableCell>
                  <TableCell>{app.researchArea}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(app.status) as any}>{app.statusName}</Badge>
                  </TableCell>
                  <TableCell>{app.daysWaiting} 天</TableCell>
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

      {/* 文件要求管理 - 逕博專用 */}
      <DocumentRequirementsManagement />
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="undergraduate" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            學士班新生獎學金
          </TabsTrigger>
          <TabsTrigger value="phd" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            博士班研究獎學金
          </TabsTrigger>
          <TabsTrigger value="direct-phd" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            逕博獎學金
          </TabsTrigger>
        </TabsList>

        <TabsContent value="undergraduate" className="space-y-4">
          {renderUndergraduateTab()}
        </TabsContent>

        <TabsContent value="phd" className="space-y-4">
          {renderPhdTab()}
        </TabsContent>

        <TabsContent value="direct-phd" className="space-y-4">
          {renderDirectPhdTab()}
        </TabsContent>
      </Tabs>
    </div>
  )
}
