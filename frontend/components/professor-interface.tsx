"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Search, Eye, Edit, CheckCircle, Users, FileText } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface ProfessorInterfaceProps {
  user: User
}

export function ProfessorInterface({ user }: ProfessorInterfaceProps) {
  const [selectedStudent, setSelectedStudent] = useState<any>(null)

  // 指導學生的獎學金申請
  const [studentApplications] = useState([
    {
      id: "APP-2025-000199",
      studentName: "李小華",
      studentId: "D10901002",
      type: "phd_research",
      typeName: "博士班研究獎學金",
      status: "pending_recommendation",
      statusName: "待推薦",
      submittedAt: "2025-06-02",
      gpa: 3.75,
      amount: 120000,
      researchTopic: "深度學習在自然語言處理的應用研究",
      needsRecommendation: true,
    },
    {
      id: "APP-2025-000200",
      studentName: "王小美",
      studentId: "D10901001",
      type: "direct_phd",
      typeName: "逕博獎學金",
      status: "recommended",
      statusName: "已推薦",
      submittedAt: "2025-05-28",
      gpa: 3.88,
      amount: 150000,
      researchTopic: "區塊鏈技術在供應鏈管理的創新應用",
      needsRecommendation: false,
    },
  ])

  const getStatusColor = (status: string) => {
    const statusMap = {
      pending_recommendation: "destructive",
      recommended: "default",
      under_review: "outline",
      approved: "default",
      rejected: "secondary",
    }
    return statusMap[status as keyof typeof statusMap] || "secondary"
  }

  const handleRecommend = (appId: string) => {
    console.log(`Recommending application ${appId}`)
    // API call to submit recommendation
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">指導學生管理</h2>
          <p className="text-muted-foreground">管理指導學生的獎學金申請與推薦</p>
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">指導學生</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">博士班學生</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待推薦申請</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {studentApplications.filter((app) => app.needsRecommendation).length}
            </div>
            <p className="text-xs text-muted-foreground">需要處理</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已推薦申請</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {studentApplications.filter((app) => !app.needsRecommendation).length}
            </div>
            <p className="text-xs text-muted-foreground">本月完成</p>
          </CardContent>
        </Card>
      </div>

      {/* 搜尋列 */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜尋學生姓名或學號..." className="pl-8" />
        </div>
      </div>

      {/* 學生申請列表 */}
      <Card>
        <CardHeader>
          <CardTitle>指導學生獎學金申請</CardTitle>
          <CardDescription>管理您指導學生的獎學金申請與推薦</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>學生</TableHead>
                <TableHead>獎學金類型</TableHead>
                <TableHead>研究主題</TableHead>
                <TableHead>GPA</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentApplications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{app.studentName}</p>
                      <p className="text-sm text-muted-foreground">{app.studentId}</p>
                    </div>
                  </TableCell>
                  <TableCell>{app.typeName}</TableCell>
                  <TableCell className="max-w-xs">
                    <p className="truncate" title={app.researchTopic}>
                      {app.researchTopic}
                    </p>
                  </TableCell>
                  <TableCell>{app.gpa}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(app.status) as any}>{app.statusName}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedStudent(app)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>學生申請詳情 - {selectedStudent?.id}</DialogTitle>
                            <DialogDescription>
                              {selectedStudent?.studentName} ({selectedStudent?.studentId})
                            </DialogDescription>
                          </DialogHeader>
                          {selectedStudent && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium">獎學金類型</label>
                                  <p>{selectedStudent.typeName}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">申請金額</label>
                                  <p>NT$ {selectedStudent.amount.toLocaleString()}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">GPA</label>
                                  <p>{selectedStudent.gpa}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">提交日期</label>
                                  <p>{selectedStudent.submittedAt}</p>
                                </div>
                              </div>

                              <div>
                                <label className="text-sm font-medium">研究主題</label>
                                <p className="mt-1">{selectedStudent.researchTopic}</p>
                              </div>

                              {selectedStudent.needsRecommendation && (
                                <div>
                                  <label className="text-sm font-medium">指導教授推薦意見</label>
                                  <Textarea placeholder="請輸入推薦意見與評語..." rows={4} className="mt-1" />
                                </div>
                              )}

                              {selectedStudent.needsRecommendation && (
                                <div className="flex gap-2">
                                  <Button onClick={() => handleRecommend(selectedStudent.id)}>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    提交推薦
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>

                      {app.needsRecommendation && (
                        <Button size="sm" onClick={() => handleRecommend(app.id)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
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
}
