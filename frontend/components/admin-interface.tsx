"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Settings, Users, FileText, Database, Upload, Download, Play, Pause, Edit, Plus } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface AdminInterfaceProps {
  user: User
}

export function AdminInterface({ user }: AdminInterfaceProps) {
  const [workflows] = useState([
    {
      id: "wf_001",
      name: "大學部新生獎學金審核流程",
      version: "v2.1",
      status: "active",
      lastModified: "2025-06-01",
      steps: 3,
    },
    {
      id: "wf_002",
      name: "博士班獎學金審核流程",
      version: "v1.8",
      status: "active",
      lastModified: "2025-05-28",
      steps: 5,
    },
    {
      id: "wf_003",
      name: "直升博士獎學金審核流程",
      version: "v1.2",
      status: "draft",
      lastModified: "2025-06-02",
      steps: 4,
    },
  ])

  const [scholarshipRules] = useState([
    {
      id: "rule_001",
      name: "大學部新生資格檢核",
      type: "undergraduate_freshman",
      criteria: { gpa_min: 3.38, rank_top_percent: 30 },
      active: true,
    },
    {
      id: "rule_002",
      name: "博士班基本資格",
      type: "phd_basic",
      criteria: { enrollment_status: "active", advisor_required: true },
      active: true,
    },
  ])

  const [systemStats] = useState({
    totalUsers: 2847,
    activeApplications: 156,
    completedReviews: 89,
    systemUptime: "99.8%",
    avgResponseTime: "245ms",
    storageUsed: "2.3TB",
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">系統管理</h2>
          <p className="text-muted-foreground">管理系統設定、工作流程與使用者權限</p>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">系統概覽</TabsTrigger>
          <TabsTrigger value="workflows">工作流程</TabsTrigger>
          <TabsTrigger value="rules">審核規則</TabsTrigger>
          <TabsTrigger value="users">使用者管理</TabsTrigger>
          <TabsTrigger value="settings">系統設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">總使用者數</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats.totalUsers}</div>
                <p className="text-xs text-muted-foreground">+5% 較上月</p>
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
          </div>
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
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">審核規則設定</h3>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              新增規則
            </Button>
          </div>

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
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">使用者管理</h3>
            <div className="flex gap-2">
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                新增使用者
              </Button>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-1" />
                批次匯入
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>使用者管理功能開發中...</p>
                <p className="text-sm">將包含角色權限設定、SSO整合等功能</p>
              </div>
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
      </Tabs>
    </div>
  )
}
