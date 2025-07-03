"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  BookOpen,
  Users,
  Cog,
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
import { CollegeDashboard } from "@/components/college-dashboard"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useLanguagePreference } from "@/hooks/use-language-preference"
import { getTranslation } from "@/lib/i18n"
import { useAuth } from "@/hooks/use-auth"
import { DevLoginPage } from "@/components/dev-login-page"
import { SSOLoginPage } from "@/components/sso-login-page"
import { useAdminDashboard } from "@/hooks/use-admin"
import { apiClient } from "@/lib/api"

// Update User interface to include studentType
interface User {
  id: string
  name: string
  email: string
  role: "student" | "professor" | "college" | "admin" | "super_admin"
  studentType?: "undergraduate" | "phd" | "direct_phd"
}

export default function ScholarshipManagementSystem() {
  const [locale, setLocale] = useState<"zh" | "en">("zh")
  const [activeTab, setActiveTab] = useState("main")
  
  // 使用認證 hook
  const { user, isAuthenticated, isLoading: authLoading, error: authError, login, logout } = useAuth()
  
  // 使用 admin dashboard hook
  const { 
    stats, 
    recentApplications, 
    systemAnnouncements, 
    allApplications,
    isStatsLoading, 
    isRecentLoading, 
    isAnnouncementsLoading,
    error,
    fetchRecentApplications,
    fetchDashboardStats 
  } = useAdminDashboard()

  // 調試信息
  useEffect(() => {
    console.log('ScholarshipManagementSystem mounted')
    console.log('User:', user)
    console.log('Is Authenticated:', isAuthenticated)
    console.log('Auth Loading:', authLoading)
    console.log('Auth Error:', authError)
    console.log('Recent Applications:', recentApplications)
    console.log('Error:', error)
    
    // 檢查 localStorage 中的認證信息
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token')
      const userJson = localStorage.getItem('user')
      console.log('LocalStorage token exists:', !!token)
      console.log('LocalStorage user exists:', !!userJson)
      try {
        console.log('API client has token:', !!(apiClient as any).token)
      } catch (e) {
        console.log('Could not access apiClient token')
      }
      
      if (token) {
        console.log('Token preview:', token.substring(0, 20) + '...')
      }
    }
  }, [user, isAuthenticated, authLoading, authError, recentApplications, error])

  const t = (key: string) => getTranslation(locale, key)

  // 使用語言偏好 Hook
  const { changeLocale, isLanguageSwitchEnabled } = useLanguagePreference(user?.role || "student", "zh")

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-nycu-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-nycu-blue-600" />
          <p className="text-nycu-navy-600">載入中...</p>
        </div>
      </div>
    )
  }

  // Show login interface if not authenticated
  if (!isAuthenticated) {
    // Development mode: use DevLoginPage
    if (process.env.NODE_ENV === 'development') {
      return <DevLoginPage />
    }
    
    // Production mode: use SSO login
    return <SSOLoginPage />
  }

  // Set initial active tab based on user role
  if (activeTab === "main" && user && (user.role === "admin" || user.role === "professor" || user.role === "college")) {
    setActiveTab("dashboard")
  }

  // 儀表板 - 只有教務處和學院端需要
  const renderDashboard = () => {
    // 狀態中文化映射
    const getStatusText = (status: string) => {
      const statusMap = {
        'draft': '草稿',
        'submitted': '已提交',
        'under_review': '審核中',
        'pending_recommendation': '待推薦',
        'recommended': '已推薦',
        'approved': '已核准',
        'rejected': '已拒絕',
        'returned': '已退回',
        'withdrawn': '已撤回',
        'cancelled': '已取消'
      }
      return statusMap[status as keyof typeof statusMap] || status
    }

    // 獎學金類型中文化映射
    const getScholarshipTypeName = (type: string, typeZh?: string) => {
      if (typeZh) return typeZh
      
      const typeMap = {
        'undergraduate_freshman': '學士班新生獎學金',
        'phd_nstc': '國科會博士生獎學金',
        'phd_moe': '教育部博士生獎學金',
        'direct_phd': '逕博獎學金'
      }
      return typeMap[type as keyof typeof typeMap] || type
    }

    // 格式化日期
    const formatDate = (dateString: string) => {
      const date = new Date(dateString)
      return date.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    }

    return (
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

        {/* 開發者調試工具欄 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <h3 className="font-medium text-gray-800 mb-2">開發者調試信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
                  <div>
                    <strong>認證狀態:</strong> {isAuthenticated ? '✅ 已認證' : '❌ 未認證'}<br/>
                    <strong>用戶:</strong> {user?.full_name || '未知'} ({user?.role || '未知'})<br/>
                    <strong>用戶ID:</strong> {user?.id || '未知'}
                  </div>
                  <div>
                    <strong>最近申請數量:</strong> {recentApplications.length}<br/>
                    <strong>載入狀態:</strong> {isRecentLoading ? '載入中...' : '完成'}<br/>
                    <strong>錯誤:</strong> {error || '無'}
                  </div>
                  <div>
                    <strong>Token:</strong> {typeof window !== 'undefined' && localStorage.getItem('auth_token') ? '存在' : '不存在'}<br/>
                    <strong>API端點:</strong> {apiClient.constructor.name}<br/>
                    <strong>統計數據:</strong> {stats ? `${stats.total_applications} 總申請` : '未載入'}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    console.log('Testing super_admin login...')
                    try {
                      const response = await apiClient.auth.mockSSOLogin('super_admin')
                      console.log('Mock login response:', response)
                      
                      if (response.success && response.data) {
                        const { access_token, user: userData } = response.data
                        login(access_token, userData)
                        console.log('Super admin login successful')
                        
                        // 手動觸發數據刷新
                        setTimeout(() => {
                          fetchRecentApplications()
                          fetchDashboardStats()
                        }, 1000)
                      }
                    } catch (e) {
                      console.error('Test login failed:', e)
                    }
                  }}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  登錄為 Super Admin
                </button>
                <button
                  onClick={() => {
                    console.log('Refreshing all data...')
                    fetchRecentApplications()
                    fetchDashboardStats()
                  }}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  刷新數據
                </button>
                <button
                  onClick={() => {
                    logout()
                  }}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  登出
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-red-700 font-medium">載入資料時發生錯誤</p>
                  <p className="text-red-600 text-sm">{error}</p>
                  <div className="text-xs text-red-500 mt-1">
                    <p>認證狀態: {isAuthenticated ? '已認證' : '未認證'}</p>
                    <p>用戶角色: {user?.role || '未知'}</p>
                    <p>用戶ID: {user?.id || '未知'}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    console.log('Manual retry triggered')
                    fetchRecentApplications()
                  }}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  重試
                </button>
                {/* 測試登錄按鈕 */}
                <button
                  onClick={async () => {
                    try {
                      console.log('Testing super_admin login...')
                      const response = await apiClient.auth.mockSSOLogin('super_admin')
                      console.log('Mock login response:', response)
                      
                      if (response.success && response.data) {
                        const { access_token, user: userData } = response.data
                        login(access_token, userData)
                        console.log('Super admin login successful')
                      }
                    } catch (e) {
                      console.error('Test login failed:', e)
                    }
                  }}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  測試登錄
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="academic-card border-nycu-blue-200 hover:shadow-lg transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-nycu-navy-700">總申請案件</CardTitle>
              <FileText className="h-5 w-5 text-nycu-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-nycu-navy-800">
                {isStatsLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  stats?.total_applications || 0
                )}
              </div>
              <p className="text-xs text-nycu-blue-600 font-medium">總申請案件</p>
            </CardContent>
          </Card>

          <Card className="academic-card border-nycu-orange-200 hover:shadow-lg transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-nycu-navy-700">待審核</CardTitle>
              <Clock className="h-5 w-5 text-nycu-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-nycu-navy-800">
                {isStatsLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  stats?.pending_review || 0
                )}
              </div>
              <p className="text-xs text-nycu-orange-600 font-medium">需要處理</p>
            </CardContent>
          </Card>

          <Card className="academic-card border-green-200 hover:shadow-lg transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-nycu-navy-700">已核准</CardTitle>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-nycu-navy-800">
                {isStatsLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  stats?.approved || 0
                )}
              </div>
              <p className="text-xs text-green-600 font-medium">本月核准</p>
            </CardContent>
          </Card>

          <Card className="academic-card border-nycu-blue-200 hover:shadow-lg transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-nycu-navy-700">平均處理時間</CardTitle>
              <TrendingUp className="h-5 w-5 text-nycu-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-nycu-navy-800">
                {isStatsLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  stats?.avg_processing_time || "N/A"
                )}
              </div>
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
              {isRecentLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-nycu-blue-600" />
                  <span className="ml-2 text-nycu-navy-600">載入中...</span>
                </div>
              ) : recentApplications.length > 0 ? (
                <div className="space-y-4">
                  {recentApplications.map((app) => (
                    <div key={app.id} className="flex items-center justify-between p-4 bg-nycu-blue-50 rounded-lg hover:bg-nycu-blue-100 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-nycu-navy-800">
                            {getScholarshipTypeName(app.scholarship_type, app.scholarship_type_zh)}
                          </p>
                          <Badge 
                            variant={
                              app.status === 'approved' ? 'default' : 
                              app.status === 'rejected' ? 'destructive' : 
                              'outline'
                            }
                            className={
                              app.status === 'approved' ? 'bg-green-600' :
                              app.status === 'rejected' ? 'bg-red-600' :
                              'border-nycu-orange-300 text-nycu-orange-700'
                            }
                          >
                            {getStatusText(app.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm text-nycu-navy-600">
                          <span>{app.app_id || `APP-${app.id}`}</span>
                          <div className="flex gap-4">
                            {app.submitted_at && (
                              <span>提交：{formatDate(app.submitted_at)}</span>
                            )}
                            <span>創建：{formatDate(app.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-nycu-navy-600">
                  <FileText className="h-12 w-12 mx-auto mb-2 text-nycu-blue-300" />
                  <p>暫無申請資料</p>
                </div>
              )}
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
              {isAnnouncementsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-nycu-blue-600" />
                  <span className="ml-2 text-nycu-navy-600">載入中...</span>
                </div>
              ) : systemAnnouncements.length > 0 ? (
                <div className="space-y-4">
                  {systemAnnouncements.map((announcement) => (
                    <div key={announcement.id} className="flex items-start space-x-3 p-3 bg-nycu-orange-50 rounded-lg">
                      <AlertCircle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                        announcement.notification_type === 'error' ? 'text-red-600' :
                        announcement.notification_type === 'warning' ? 'text-nycu-orange-600' :
                        announcement.notification_type === 'success' ? 'text-green-600' :
                        'text-nycu-blue-600'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-nycu-navy-800">{announcement.title}</p>
                        <p className="text-xs text-nycu-navy-600">{announcement.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-nycu-navy-600">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 text-nycu-blue-300" />
                  <p>暫無系統公告</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // 根據角色決定顯示的標籤頁
  const getTabsList = () => {
    if (!user) return null;
    
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

    if (user.role === "college") {
      return (
        <TabsList className="grid w-full grid-cols-1 bg-nycu-blue-50 border border-nycu-blue-200">
          <TabsTrigger
            value="main"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-nycu-blue-700"
          >
            <GraduationCap className="h-4 w-4" />
            學院審核管理
          </TabsTrigger>
        </TabsList>
      )
    }

    if (user.role === "super_admin") {
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
            <Cog className="h-4 w-4" />
            系統管理
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
            <Cog className="h-4 w-4" />
            系統管理
          </TabsTrigger>
        </TabsList>
      )
    }

    return null
  }

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-nycu-blue-50 flex flex-col">
      <Header
        user={user}
        locale={locale}
        onLocaleChange={changeLocale}
        showLanguageSwitcher={isLanguageSwitchEnabled}
        onLogout={logout}
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

          {/* 儀表板 - 只有 admin、professor 和 college 可見 */}
          {(user.role === "admin" || user.role === "professor" || user.role === "college" || user.role === "super_admin") && (
            <TabsContent value="dashboard" className="space-y-4">
              {renderDashboard()}
            </TabsContent>
          )}

          {/* 主要功能頁面 */}
          <TabsContent value="main" className="space-y-4">
            {user.role === "student" && <EnhancedStudentPortal user={{...user, studentType: "undergraduate"} as any} locale={locale} />}
            {user.role === "professor" && <ProfessorInterface user={user} />}
            {user.role === "college" && <CollegeDashboard user={user} />}
            {(user.role === "professor" || user.role === "college" || user.role === "admin" || user.role === "super_admin") && <ScholarshipSpecificDashboard user={user} />}
          </TabsContent>

          {/* 系統管理 - 只有 admin 和 super_admin 可見 */}
          {(user.role === "admin" || user.role === "super_admin") && (
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
