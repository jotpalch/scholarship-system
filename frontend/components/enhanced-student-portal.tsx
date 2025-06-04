"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { ProgressTimeline } from "@/components/progress-timeline"
import { FileUpload } from "@/components/file-upload"
import { FormField } from "@/components/form-validation"
import { SimplifiedNationalitySelector } from "@/components/simplified-nationality-selector"
import { FormValidator } from "@/lib/validation"
import { Edit, Eye, Trash2, Save, AlertTriangle, Info, FileText, Calendar, User, CheckCircle, Loader2 } from "lucide-react"
import { getTranslation } from "@/lib/i18n"
import { useApplications } from "@/hooks/use-applications"
import { useAuth } from "@/hooks/use-auth"
import { ApplicationCreate, User as ApiUser } from "@/lib/api"

interface EnhancedStudentPortalProps {
  user: ApiUser
  locale: "zh" | "en"
}

export function EnhancedStudentPortal({ user, locale }: EnhancedStudentPortalProps) {
  const t = (key: string) => getTranslation(locale, key)
  const validator = useMemo(() => new FormValidator(locale), [locale])
  
  // Use real application data from API
  const { 
    applications, 
    isLoading: applicationsLoading, 
    error: applicationsError,
    createApplication,
    submitApplication: submitApplicationApi,
    withdrawApplication,
    uploadDocument
  } = useApplications()

  // Form state for new application
  const [newApplicationData, setNewApplicationData] = useState({
    scholarship_type: '',
    personal_statement: '',
    expected_graduation_date: '',
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formProgress, setFormProgress] = useState(0)

  // Calculate form completion progress
  useEffect(() => {
    const requiredFields = ['scholarship_type', 'personal_statement', 'expected_graduation_date']
    const completedFields = requiredFields.filter(field => 
      newApplicationData[field as keyof typeof newApplicationData]?.trim()
    )
    setFormProgress(Math.round((completedFields.length / requiredFields.length) * 100))
  }, [newApplicationData])

  // Get scholarship info based on user role (simplified)
  const getScholarshipInfo = () => {
    // This would normally come from the backend
    return {
      type: "academic_excellence",
      name: t("scholarships.academic_excellence") || "學術優秀獎學金",
      description: locale === "zh" 
        ? "獎勵學術表現優秀之學生" 
        : "Rewarding academically excellent students",
      eligibility: locale === "zh" 
        ? "GPA ≥ 3.5，在學學生" 
        : "GPA ≥ 3.5, enrolled students",
      amount: "NT$ 50,000",
    }
  }

  const scholarshipInfo = getScholarshipInfo()

  const handleSubmitApplication = async () => {
    if (!newApplicationData.scholarship_type || !newApplicationData.personal_statement || !newApplicationData.expected_graduation_date) {
      return
    }

    try {
      setIsSubmitting(true)
      await createApplication(newApplicationData)
      
      // Reset form
      setNewApplicationData({
        scholarship_type: '',
        personal_statement: '',
        expected_graduation_date: '',
      })
      
      // Switch to applications tab
      const tabsTrigger = document.querySelector('[value="applications"]') as HTMLElement
      tabsTrigger?.click()
      
    } catch (error) {
      console.error('Failed to submit application:', error)
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

  const getStatusColor = (status: string) => {
    const statusMap = {
      draft: "secondary",
      submitted: "default", 
      under_review: "outline",
      approved: "default",
      rejected: "destructive",
      withdrawn: "secondary",
    }
    return statusMap[status as keyof typeof statusMap] || "secondary"
  }

  const getStatusName = (status: string) => {
    const statusNames = {
      zh: {
        draft: "草稿",
        submitted: "已提交",
        under_review: "審核中",
        approved: "已核准", 
        rejected: "已拒絕",
        withdrawn: "已撤回",
      },
      en: {
        draft: "Draft",
        submitted: "Submitted",
        under_review: "Under Review",
        approved: "Approved",
        rejected: "Rejected", 
        withdrawn: "Withdrawn",
      }
    }
    return statusNames[locale][status as keyof typeof statusNames[typeof locale]] || status
  }

  const getTimelineSteps = (status: string): Array<{
    id: string;
    title: string;
    status: "completed" | "current" | "pending" | "rejected";
    date: string;
  }> => {
    let step2Status: "completed" | "current" | "pending" | "rejected" = "pending"
    if (["submitted", "under_review", "approved"].includes(status)) {
      step2Status = "completed"
    } else if (status === "rejected") {
      step2Status = "rejected"
    }

    let step3Status: "completed" | "current" | "pending" | "rejected" = "pending"
    if (status === "approved") {
      step3Status = "completed"
    } else if (status === "under_review") {
      step3Status = "current"
    } else if (status === "rejected") {
      step3Status = "rejected"
    }

    let step4Status: "completed" | "current" | "pending" | "rejected" = "pending"
    if (status === "approved") {
      step4Status = "completed"
    } else if (status === "rejected") {
      step4Status = "rejected"
    }

    const baseSteps = [
      {
        id: "1",
        title: locale === "zh" ? "提交申請" : "Submit Application",
        status: "completed" as const,
        date: "2025-06-01",
      },
      {
        id: "2", 
        title: locale === "zh" ? "初步審核" : "Initial Review",
        status: step2Status,
        date: (status === "under_review" || status === "approved") ? "2025-06-05" : "",
      },
      {
        id: "3",
        title: locale === "zh" ? "委員會審核" : "Committee Review", 
        status: step3Status,
        date: status === "approved" ? "2025-06-10" : "",
      },
      {
        id: "4",
        title: locale === "zh" ? "核定結果" : "Final Decision",
        status: step4Status,
        date: status === "approved" ? "2025-06-15" : "",
      },
    ]
    return baseSteps
  }

  if (!scholarshipInfo) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-orange-500" />
          <h3 className="text-lg font-semibold mb-2">
            {locale === "zh" ? "無法識別學生身分" : "Unable to identify student status"}
          </h3>
          <p className="text-muted-foreground">
            {locale === "zh"
              ? "請聯繫系統管理員確認您的學生身分設定"
              : "Please contact system administrator to verify your student status"}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Scholarship Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{scholarshipInfo.name}</CardTitle>
              <CardDescription className="mt-1">{scholarshipInfo.description}</CardDescription>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {scholarshipInfo.amount}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium">{locale === "zh" ? "申請資格" : "Eligibility"}</p>
              <p className="text-sm text-muted-foreground">{scholarshipInfo.eligibility}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="applications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="applications">{locale === "zh" ? "我的申請" : "My Applications"}</TabsTrigger>
          <TabsTrigger value="new-application">{locale === "zh" ? "新增申請" : "New Application"}</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{locale === "zh" ? "申請記錄" : "Application Records"}</CardTitle>
              <CardDescription>
                {locale === "zh"
                  ? `查看您的${scholarshipInfo.name}申請狀態與進度`
                  : `View your ${scholarshipInfo.name} application status and progress`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {applicationsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" data-testid="loading-spinner" />
                </div>
              ) : applicationsError ? (
                <div className="text-center py-8 text-red-600">
                  <p>{applicationsError}</p>
                </div>
              ) : applications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{locale === "zh" ? "尚無申請記錄" : "No application records yet"}</p>
                  <p className="text-sm">
                    {locale === "zh"
                      ? "點擊「新增申請」開始申請獎學金"
                      : "Click 'New Application' to start applying for scholarship"}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {applications.map((app) => (
                    <div key={app.id} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{app.scholarship_type}</h3>
                          <p className="text-sm text-muted-foreground">
                            {locale === "zh" ? "申請編號" : "Application ID"}: {app.id}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={getStatusColor(app.status) as any} className="mb-2">
                            {getStatusName(app.status)}
                          </Badge>
                          <p className="text-sm text-muted-foreground">
                            {locale === "zh" ? "提交日期" : "Submission Date"}: {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : "N/A"}
                          </p>
                        </div>
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
                          <ProgressTimeline steps={getTimelineSteps(app.status)} />
                        </CardContent>
                      </Card>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          {locale === "zh" ? "查看詳情" : "View Details"}
                        </Button>
                        {app.status === "submitted" && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleWithdrawApplication(app.id)}
                          >
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
                {locale === "zh" ? `申請 ${scholarshipInfo.name}` : `Apply for ${scholarshipInfo.name}`}
              </CardTitle>
              <CardDescription>
                {locale === "zh"
                  ? "請填寫完整資料並上傳相關文件"
                  : "Please complete all information and upload required documents"}
              </CardDescription>

              {/* Form completion progress */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{locale === "zh" ? "表單完成度" : "Form Completion"}</span>
                  <span className="text-sm text-muted-foreground">{formProgress}%</span>
                </div>
                <Progress value={formProgress} className="h-2" />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="scholarship_type">{locale === "zh" ? "獎學金類型" : "Scholarship Type"} *</Label>
                  <Select 
                    value={newApplicationData.scholarship_type} 
                    onValueChange={(value) => setNewApplicationData(prev => ({ ...prev, scholarship_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={locale === "zh" ? "選擇獎學金類型" : "Select scholarship type"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="academic_excellence">{locale === "zh" ? "學術優秀獎學金" : "Academic Excellence"}</SelectItem>
                      <SelectItem value="need_based">{locale === "zh" ? "助學金" : "Need-based Aid"}</SelectItem>
                      <SelectItem value="research_grant">{locale === "zh" ? "研究獎助金" : "Research Grant"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="expected_graduation_date">{locale === "zh" ? "預計畢業日期" : "Expected Graduation Date"} *</Label>
                  <Input
                    id="expected_graduation_date"
                    type="date"
                    value={newApplicationData.expected_graduation_date}
                    onChange={(e) => setNewApplicationData(prev => ({ ...prev, expected_graduation_date: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="personal_statement">{locale === "zh" ? "個人陳述" : "Personal Statement"} *</Label>
                  <Textarea
                    id="personal_statement"
                    placeholder={locale === "zh" 
                      ? "請描述您的學術成就、未來規劃等..." 
                      : "Please describe your academic achievements, future plans, etc..."}
                    value={newApplicationData.personal_statement}
                    onChange={(e) => setNewApplicationData(prev => ({ ...prev, personal_statement: e.target.value }))}
                    rows={6}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={handleSubmitApplication}
                  disabled={isSubmitting || formProgress < 100}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {locale === "zh" ? "提交中..." : "Submitting..."}
                    </>
                  ) : (
                    locale === "zh" ? "提交申請" : "Submit Application"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
