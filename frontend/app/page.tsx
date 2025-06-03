"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  BookOpen,
  Users,
  Settings,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Award,
  GraduationCap,
  Loader2,
} from "lucide-react"
import { EnhancedStudentPortal } from "@/components/enhanced-student-portal"
import { ScholarshipSpecificDashboard } from "@/components/scholarship-specific-dashboard"
import { AdminInterface } from "@/components/admin-interface"
import { ProfessorInterface } from "@/components/professor-interface"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useLanguagePreference } from "@/hooks/use-language-preference"
import { getTranslation } from "@/lib/i18n"
import { useAuth } from "@/hooks/use-auth"
import { useAdminDashboard } from "@/hooks/use-admin"

export default function ScholarshipManagementSystem() {
  const { user, isLoading, isAuthenticated, login, error } = useAuth()
  const { stats } = useAdminDashboard()
  const [activeTab, setActiveTab] = useState("main")
  const [loginForm, setLoginForm] = useState({ username: "", password: "" })
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // 使用語言偏好 Hook
  const { locale, changeLocale, isLanguageSwitchEnabled } = useLanguagePreference(user?.role || "student", "zh")
  const t = (key: string) => getTranslation(locale, key)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsLoggingIn(true)
      await login(loginForm.username, loginForm.password)
    } catch (err) {
      // Error is handled by the auth hook
    } finally {
      setIsLoggingIn(false)
    }
  }

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-nycu-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-nycu-blue-600" />
          <p className="text-nycu-navy-600">載入中...</p>
        </div>
      </div>
    )
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-nycu-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="nycu-gradient h-16 w-16 rounded-xl flex items-center justify-center nycu-shadow mx-auto mb-4">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-nycu-navy-800">登入系統</CardTitle>
            <CardDescription>獎學金申請與簽核作業管理系統</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">使用者名稱</Label>
                <Input
                  id="username"
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密碼</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    登入中...
                  </>
                ) : (
                  "登入"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Set initial active tab based on user role
  if (activeTab === "main" && (user.role === "admin" || user.role === "faculty")) {
    setActiveTab("dashboard")
  }

  // 儀表板 - 只有教務處和學院端需要
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="nycu-gradient rounded-xl p-6 text-white nycu-shadow">
        <div className="flex items-center gap-4">
          <Award className="h-12 w-12 text-white/90" />
          <div>
            <h2 className="text-2xl font-bold mb-2">獎學金管理系統儀表板</h2>
            <p className="text-white/90">
              歡迎使用陽明交通大學獎學金申請與簽核作業管理系統，提升獎學金作業效率與透明度
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="academic-card border-nycu-blue-200 hover:shadow-lg transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-nycu-navy-700">總申請案件</CardTitle>
            <FileText className="h-5 w-5 text-nycu-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-nycu-navy-800">{stats?.total_applications || 0}</div>
            <p className="text-xs text-nycu-blue-600 font-medium">總申請案件</p>
          </CardContent>
        </Card>

        <Card className="academic-card border-nycu-orange-200 hover:shadow-lg transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-nycu-navy-700">待審核</CardTitle>
            <Clock className="h-5 w-5 text-nycu-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-nycu-navy-800">{stats?.pending_review || 0}</div>
            <p className="text-xs text-nycu-orange-600 font-medium">需要處理</p>
          </CardContent>
        </Card>

        <Card className="academic-card border-green-200 hover:shadow-lg transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-nycu-navy-700">已核准</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-nycu-navy-800">{stats?.approved || 0}</div>
            <p className="text-xs text-green-600 font-medium">本月核准</p>
          </CardContent>
        </Card>

        <Card className="academic-card border-nycu-blue-200 hover:shadow-lg transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-nycu-navy-700">平均處理時間</CardTitle>
            <TrendingUp className="h-5 w-5 text-nycu-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-nycu-navy-800">{stats?.avg_processing_time || "N/A"}</div>
            <p className="text-xs text-nycu-blue-600 font-medium">處理時間</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="academic-card border-nycu-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-nycu-navy-800">
              <FileText className="h-5 w-5 text-nycu-blue-600" />
              最近申請
            </CardTitle>
            <CardDescription>最新的獎學金申請狀態</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-nycu-blue-50 rounded-lg">
                <div>
                  <p className="font-medium text-nycu-navy-800">學士班新生獎學金</p>
                  <p className="text-sm text-nycu-navy-600">APP-2025-000198</p>
                </div>
                <Badge variant="outline" className="border-nycu-orange-300 text-nycu-orange-700">
                  審核中
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="font-medium text-nycu-navy-800">博士班研究獎學金</p>
                  <p className="text-sm text-nycu-navy-600">APP-2025-000156</p>
                </div>
                <Badge variant="default" className="bg-green-600">
                  已核准
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="academic-card border-nycu-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-nycu-navy-800">
              <AlertCircle className="h-5 w-5 text-nycu-orange-600" />
              系統公告
            </CardTitle>
            <CardDescription>重要通知與更新</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-3 bg-nycu-orange-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-nycu-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-nycu-navy-800">系統維護通知</p>
                  <p className="text-xs text-nycu-navy-600">2025/06/15 02:00-04:00 系統維護</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-nycu-navy-800">新功能上線</p>
                  <p className="text-xs text-nycu-navy-600">OCR 自動辨識功能已啟用</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  // 根據角色決定顯示的標籤頁
  const getTabsList = () => {
    if (user.role === "student") {
      return (
        <TabsList className="grid w-full grid-cols-1 bg-nycu-blue-50 border border-nycu-blue-200">
          <TabsTrigger
            value="main"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-nycu-blue-700"
          >
            <BookOpen className="h-4 w-4" />
            {t("nav.applications")}
          </TabsTrigger>
        </TabsList>
      )
    }

    if (user.role === "professor") {
      return (
        <TabsList className="grid w-full grid-cols-1 bg-nycu-blue-50 border border-nycu-blue-200">
          <TabsTrigger
            value="main"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-nycu-blue-700"
          >
            <Users className="h-4 w-4" />
            指導學生管理
          </TabsTrigger>
        </TabsList>
      )
    }

    if (user.role === "reviewer") {
      return (
        <TabsList className="grid w-full grid-cols-2 bg-nycu-blue-50 border border-nycu-blue-200">
          <TabsTrigger
            value="dashboard"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-nycu-blue-700"
          >
            <TrendingUp className="h-4 w-4" />
            儀表板
          </TabsTrigger>
          <TabsTrigger
            value="main"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-nycu-blue-700"
          >
            <Users className="h-4 w-4" />
            審核管理
          </TabsTrigger>
        </TabsList>
      )
    }

    if (user.role === "admin") {
      return (
        <TabsList className="grid w-full grid-cols-3 bg-nycu-blue-50 border border-nycu-blue-200">
          <TabsTrigger
            value="dashboard"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-nycu-blue-700"
          >
            <TrendingUp className="h-4 w-4" />
            儀表板
          </TabsTrigger>
          <TabsTrigger
            value="main"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-nycu-blue-700"
          >
            <Users className="h-4 w-4" />
            審核管理
          </TabsTrigger>
          <TabsTrigger
            value="admin"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-nycu-blue-700"
          >
            <Settings className="h-4 w-4" />
            系統管理
          </TabsTrigger>
        </TabsList>
      )
    }

    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-nycu-blue-50 flex flex-col">
      <Header
        user={user}
        locale={locale}
        onLocaleChange={changeLocale}
        showLanguageSwitcher={isLanguageSwitchEnabled}
      />

      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="nycu-gradient h-16 w-16 rounded-xl flex items-center justify-center nycu-shadow">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-nycu-navy-800">
                {user.role === "student" ? t("system.title") : "獎學金申請與簽核作業管理系統"}
              </h1>
              <p className="text-lg text-nycu-navy-600 mt-1">
                {user.role === "student"
                  ? t("system.subtitle")
                  : "Scholarship Application and Approval Management System"}
              </p>
              <p className="text-sm text-nycu-blue-600 font-medium mt-1">
                國立陽明交通大學教務處 | NYCU Office of Academic Affairs
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {getTabsList()}

          {/* 儀表板 - 只有 admin 和 reviewer 可見 */}
          {(user.role === "admin" || user.role === "reviewer") && (
            <TabsContent value="dashboard" className="space-y-4">
              {renderDashboard()}
            </TabsContent>
          )}

          {/* 主要功能頁面 */}
          <TabsContent value="main" className="space-y-4">
            {user.role === "student" && <EnhancedStudentPortal user={user} locale={locale} />}
            {user.role === "professor" && <ProfessorInterface user={user} />}
            {(user.role === "reviewer" || user.role === "admin") && <ScholarshipSpecificDashboard user={user} />}
          </TabsContent>

          {/* 系統管理 - 只有 admin 可見 */}
          {user.role === "admin" && (
            <TabsContent value="admin" className="space-y-4">
              <AdminInterface user={user} />
            </TabsContent>
          )}
        </Tabs>
      </main>

      <Footer locale={locale} />
    </div>
  )
}
