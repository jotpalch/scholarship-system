"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ClientSelect as Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/client-select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProgressTimeline } from "@/components/progress-timeline"
import { FileUpload } from "@/components/file-upload"
import { Edit, Eye, Trash2, Save, AlertTriangle, Info, FileText, Calendar, User } from "lucide-react"
import { getTranslation } from "@/lib/i18n"

interface UserType {
  id: string
  name: string
  email: string
  role: string
  studentId?: string
  studentType: "phd" | "master" | "undergraduate" | "other"
}

interface StudentPortalProps {
  user: UserType
  locale: "zh" | "en"
}

export function StudentPortal({ user, locale }: StudentPortalProps) {
  const t = (key: string) => getTranslation(locale, key)

  // 根據學生身分決定可申請的獎學金類型
  const getScholarshipInfo = () => {
    switch (user.studentType) {
      case "undergraduate":
        return {
          type: "undergraduate_freshman",
          name: t("scholarships.undergraduate_freshman"),
          description:
            locale === "zh"
              ? "適用於學士班新生，需符合 GPA ≥ 3.38 或前35%排名"
              : "For undergraduate freshmen, requires GPA ≥ 3.38 or top 35% ranking",
          eligibility:
            locale === "zh"
              ? "學士班新生，在學狀態1-3，修習學期數≤6"
              : "Undergraduate freshmen, enrollment status 1-3, semesters completed ≤6",
          amount: "NT$ 50,000",
        }
      case "phd":
        return {
          type: "phd",
          name: t("scholarships.phd"),
          description:
            locale === "zh" ? "適用於博士班在學學生，需提供研究計畫" : "For PhD students, requires research proposal",
          eligibility:
            locale === "zh"
              ? "博士班在學生，在學狀態1-3，修習學期數≤2"
              : "PhD students, enrollment status 1-3, semesters completed ≤2",
          amount: "NT$ 120,000",
        }
      case "direct_phd":
        return {
          type: "direct_phd",
          name: t("scholarships.direct_phd"),
          description:
            locale === "zh"
              ? "適用於逕升博士班學生，需完整研究計畫"
              : "For direct PhD students, requires complete research plan",
          eligibility: locale === "zh" ? "逕升博士生，入學管道8-11" : "Direct PhD students, enrollment channels 8-11",
          amount: "NT$ 150,000",
        }
      default:
        return null
    }
  }

  const scholarshipInfo = getScholarshipInfo()

  // 學生基本資料
  const [studentInfo, setStudentInfo] = useState({
    // 學籍資料
    std_stdno: "B10901001", // 學號代碼
    std_stdcode: "B10901001", // 學號
    std_pid: "", // 身份證字號
    std_cname: "張小明", // 中文姓名
    std_ename: "Chang, Xiao-Ming", // 英文姓名
    std_degree: user.studentType === "undergraduate" ? "3" : "1", // 攻讀學位
    std_studingstatus: "1", // 在學狀態
    std_nation1: "中華民國", // 國籍
    std_nation2: "", // 其他國籍
    std_schoolid: "1", // 在學身份
    std_identity: "1", // 身份
    std_termcount: "", // 在學學期數
    std_depno: "", // 系所代碼
    dep_depname: "", // 系所名稱
    std_academyno: "", // 學院代碼
    aca_cname: "", // 學院名稱
    std_enrolltype: "", // 入學管道
    std_highestschname: "", // 原就讀系所/畢業學校
    com_cellphone: "", // 連絡電話
    com_email: user.email, // 聯絡信箱
    com_commzip: "", // 通訊地址郵遞區號
    com_commadd: "", // 通訊地址
    std_sex: "1", // 性別
    std_enrollyear: "", // 入學學年度
    std_enrollterm: "", // 入學學期
    bank_account: "", // 匯款帳號

    // 學期資料
    trm_year: "113", // 學年度
    trm_term: "1", // 學期別
    trm_studystatus: "1", // 學期在學狀態
    trm_ascore: "", // 學期平均分數
    trm_termcount: "", // 修習學期數
    trm_ascore_gpa: "", // 學期GPA
    trm_stdascore: "", // 累積平均分數
    trm_placingsrate: "", // 班排名百分比
    trm_depplacingrate: "", // 系排名百分比

    // 申請相關
    research_proposal: "",
    budget_plan: "",
    milestone_plan: "",
    agree_terms: false,
  })

  // 根據獎學金類型生成對應的審核流程
  const getTimelineSteps = (type: string, status: string) => {
    const baseSteps = [
      {
        id: "submit",
        title: locale === "zh" ? "提交申請" : "Application Submitted",
        description: locale === "zh" ? "學生提交申請資料" : "Student submitted application",
        status: "completed" as const,
        date: "2025-06-01",
      },
      {
        id: "document_review",
        title: locale === "zh" ? "資料審核" : "Document Review",
        description: locale === "zh" ? "系統自動檢核與人工審查" : "System check and manual review",
        status: "completed" as const,
        date: "2025-06-02",
      },
    ]

    if (type === "undergraduate_freshman") {
      return [
        ...baseSteps,
        {
          id: "gpa_verification",
          title: locale === "zh" ? "成績驗證" : "GPA Verification",
          description: locale === "zh" ? "GPA與排名資格確認" : "GPA and ranking verification",
          status: "current" as const,
          date: "2025-06-03",
        },
        {
          id: "department_review",
          title: locale === "zh" ? "系所審核" : "Department Review",
          description: locale === "zh" ? "系所初步審核" : "Initial department review",
          status: "pending" as const,
          estimatedDate: "2025-06-05",
        },
        {
          id: "college_approval",
          title: locale === "zh" ? "學院核准" : "College Approval",
          description: locale === "zh" ? "學院最終核准" : "Final college approval",
          status: "pending" as const,
          estimatedDate: "2025-06-08",
        },
        {
          id: "disbursement",
          title: locale === "zh" ? "撥款作業" : "Disbursement",
          description: locale === "zh" ? "獎學金撥款至帳戶" : "Scholarship disbursement to account",
          status: "pending" as const,
          estimatedDate: "2025-06-12",
        },
      ]
    }

    if (type === "phd") {
      return [
        ...baseSteps,
        {
          id: "advisor_review",
          title: locale === "zh" ? "指導教授審核" : "Advisor Review",
          description: locale === "zh" ? "指導教授推薦與評估" : "Advisor recommendation and evaluation",
          status: "current" as const,
          date: "2025-06-03",
        },
        {
          id: "research_evaluation",
          title: locale === "zh" ? "研究計畫評估" : "Research Plan Evaluation",
          description: locale === "zh" ? "研究計畫內容審查" : "Research plan content review",
          status: "pending" as const,
          estimatedDate: "2025-06-06",
        },
        {
          id: "committee_review",
          title: locale === "zh" ? "委員會審議" : "Committee Review",
          description: locale === "zh" ? "獎學金委員會審議" : "Scholarship committee review",
          status: "pending" as const,
          estimatedDate: "2025-06-10",
        },
        {
          id: "final_approval",
          title: locale === "zh" ? "最終核准" : "Final Approval",
          description: locale === "zh" ? "教務處最終核准" : "Academic Affairs Office final approval",
          status: "pending" as const,
          estimatedDate: "2025-06-15",
        },
        {
          id: "disbursement",
          title: locale === "zh" ? "撥款作業" : "Disbursement",
          description: locale === "zh" ? "獎學金撥款至帳戶" : "Scholarship disbursement to account",
          status: "pending" as const,
          estimatedDate: "2025-06-20",
        },
      ]
    }

    if (type === "direct_phd") {
      return [
        ...baseSteps,
        {
          id: "proposal_review",
          title: locale === "zh" ? "研究計畫審查" : "Research Plan Review",
          description: locale === "zh" ? "研究計畫完整性檢核" : "Research plan completeness check",
          status: "current" as const,
          date: "2025-06-03",
        },
        {
          id: "budget_verification",
          title: locale === "zh" ? "預算審核" : "Budget Review",
          description: locale === "zh" ? "預算規劃合理性評估" : "Budget plan reasonability assessment",
          status: "pending" as const,
          estimatedDate: "2025-06-05",
        },
        {
          id: "academic_review",
          title: locale === "zh" ? "學術審查" : "Academic Review",
          description: locale === "zh" ? "學術委員會審查" : "Academic committee review",
          status: "pending" as const,
          estimatedDate: "2025-06-08",
        },
        {
          id: "final_approval",
          title: locale === "zh" ? "最終核准" : "Final Approval",
          description: locale === "zh" ? "校級最終核准" : "University-level final approval",
          status: "pending" as const,
          estimatedDate: "2025-06-12",
        },
        {
          id: "contract_signing",
          title: locale === "zh" ? "合約簽署" : "Contract Signing",
          description: locale === "zh" ? "獎學金合約簽署" : "Scholarship contract signing",
          status: "pending" as const,
          estimatedDate: "2025-06-15",
        },
        {
          id: "disbursement",
          title: locale === "zh" ? "撥款作業" : "Disbursement",
          description: locale === "zh" ? "獎學金撥款至帳戶" : "Scholarship disbursement to account",
          status: "pending" as const,
          estimatedDate: "2025-06-20",
        },
      ]
    }

    return baseSteps
  }

  const [applications, setApplications] = useState([
    {
      id: "APP-2025-000198",
      type: scholarshipInfo?.type || "",
      typeName: scholarshipInfo?.name || "",
      status: "under_review",
      statusName: locale === "zh" ? "審核中" : "Under Review",
      submittedAt: "2025-06-01",
      amount:
        scholarshipInfo?.type === "undergraduate_freshman"
          ? 50000
          : scholarshipInfo?.type === "phd"
            ? 120000
            : 150000,
      timeline: getTimelineSteps(scholarshipInfo?.type || "", "under_review"),
    },
  ])

  const getStatusColor = (status: string) => {
    const statusMap = {
      draft: "secondary",
      submitted: "default",
      under_review: "outline",
      approved: "default",
      rejected: "destructive",
    }
    return statusMap[status as keyof typeof statusMap] || "secondary"
  }

  // 驗證函數
  const validateGPA = () => {
    const gpa = Number.parseFloat(studentInfo.trm_ascore_gpa)
    if (user.studentType === "undergraduate" && gpa < 3.38) {
      return locale === "zh"
        ? "GPA低於標準3.38，建議提供排名證明"
        : "GPA below 3.38 standard, ranking proof recommended"
    }
    return null
  }

  const validateRanking = () => {
    const classRank = Number.parseFloat(studentInfo.trm_placingsrate)
    const deptRank = Number.parseFloat(studentInfo.trm_depplacingrate)
    if (user.studentType === "undergraduate" && (classRank > 35 || deptRank > 35)) {
      return locale === "zh" ? "排名需在前35%以內" : "Ranking must be within top 35%"
    }
    return null
  }

  const validateTermCount = () => {
    const termCount = Number.parseInt(studentInfo.trm_termcount)
    if (user.studentType === "undergraduate" && termCount > 6) {
      return locale === "zh"
        ? "學士班新生獎學金修習學期數不得超過6學期"
        : "Undergraduate scholarship semesters cannot exceed 6"
    }
    if (user.studentType === "phd" && termCount > 2) {
      return locale === "zh" ? "博士生研究獎學金修習學期數不得超過2學期" : "PhD scholarship semesters cannot exceed 2"
    }
    return null
  }

  const handleSubmitApplication = async () => {
    if (!scholarshipInfo) return

    // Mock API call
    const response = {
      code: 0,
      msg: "created",
      data: {
        app_id: `APP-2025-${String(Math.floor(Math.random() * 1000)).padStart(6, "0")}`,
      },
      trace_id: "trace_" + Date.now(),
    }

    if (response.code === 0) {
      const newApp = {
        id: response.data.app_id,
        type: scholarshipInfo.type,
        typeName: scholarshipInfo.name,
        status: "submitted",
        statusName: locale === "zh" ? "已提交" : "Submitted",
        submittedAt: new Date().toISOString().split("T")[0],
        amount: Number.parseInt(scholarshipInfo.amount.replace(/[^\d]/g, "")),
        timeline: getTimelineSteps(scholarshipInfo.type, "submitted"),
      }
      setApplications([newApp, ...applications])
    }
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
      {/* 獎學金資訊卡片 */}
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
          <TabsTrigger value="profile">{locale === "zh" ? "個人資料" : "Profile"}</TabsTrigger>
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
              <div className="space-y-6">
                {applications.length === 0 ? (
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
                  applications.map((app) => (
                    <div key={app.id} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{app.typeName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {locale === "zh" ? "申請編號" : "Application ID"}: {app.id}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={getStatusColor(app.status) as any} className="mb-2">
                            {app.statusName}
                          </Badge>
                          <p className="text-sm text-muted-foreground">
                            {locale === "zh" ? "提交日期" : "Submission Date"}: {app.submittedAt} |
                            {locale === "zh" ? "金額" : "Amount"}: NT$ {app.amount.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* 進度時間軸 */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {locale === "zh" ? "審核進度" : "Review Progress"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ProgressTimeline steps={app.timeline} />
                        </CardContent>
                      </Card>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          {locale === "zh" ? "查看詳情" : "View Details"}
                        </Button>
                        {app.status === "draft" && (
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-1" />
                            {locale === "zh" ? "編輯" : "Edit"}
                          </Button>
                        )}
                        {app.status === "submitted" && (
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4 mr-1" />
                            {locale === "zh" ? "撤回申請" : "Withdraw"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
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
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 學期成績資料 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {locale === "zh" ? "學期成績資料" : "Semester Academic Data"}
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="trm_year">{t("student.trm_year")} *</Label>
                    <Input
                      id="trm_year"
                      value={studentInfo.trm_year}
                      onChange={(e) => setStudentInfo({ ...studentInfo, trm_year: e.target.value })}
                      placeholder={locale === "zh" ? "例: 113" : "Ex: 113"}
                    />
                  </div>

                  <div>
                    <Label htmlFor="trm_term">{t("student.trm_term")} *</Label>
                    <Select
                      value={studentInfo.trm_term}
                      onValueChange={(value) => setStudentInfo({ ...studentInfo, trm_term: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={locale === "zh" ? "請選擇學期" : "Select semester"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">{locale === "zh" ? "第一學期" : "First Semester"}</SelectItem>
                        <SelectItem value="2">{locale === "zh" ? "第二學期" : "Second Semester"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="trm_ascore_gpa">{t("student.trm_ascore_gpa")} *</Label>
                    <Input
                      id="trm_ascore_gpa"
                      type="number"
                      step="0.01"
                      min="0"
                      max="4"
                      value={studentInfo.trm_ascore_gpa}
                      onChange={(e) => setStudentInfo({ ...studentInfo, trm_ascore_gpa: e.target.value })}
                      placeholder={locale === "zh" ? "例: 3.85" : "Ex: 3.85"}
                    />
                    {validateGPA() && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-orange-600">
                        <AlertTriangle className="h-4 w-4" />
                        {validateGPA()}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="trm_termcount">{t("student.trm_termcount")} *</Label>
                    <Input
                      id="trm_termcount"
                      type="number"
                      min="1"
                      value={studentInfo.trm_termcount}
                      onChange={(e) => setStudentInfo({ ...studentInfo, trm_termcount: e.target.value })}
                      placeholder={locale === "zh" ? "例: 2" : "Ex: 2"}
                    />
                    {validateTermCount() && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        {validateTermCount()}
                      </div>
                    )}
                  </div>

                  {user.studentType === "undergraduate" && (
                    <>
                      <div>
                        <Label htmlFor="trm_placingsrate">{t("student.trm_placingsrate")} *</Label>
                        <Input
                          id="trm_placingsrate"
                          type="number"
                          min="0"
                          max="100"
                          value={studentInfo.trm_placingsrate}
                          onChange={(e) => setStudentInfo({ ...studentInfo, trm_placingsrate: e.target.value })}
                          placeholder={locale === "zh" ? "例: 25 (前25%)" : "Ex: 25 (top 25%)"}
                        />
                        {validateRanking() && (
                          <div className="flex items-center gap-1 mt-1 text-sm text-orange-600">
                            <AlertTriangle className="h-4 w-4" />
                            {validateRanking()}
                          </div>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="trm_depplacingrate">{t("student.trm_depplacingrate")} *</Label>
                        <Input
                          id="trm_depplacingrate"
                          type="number"
                          min="0"
                          max="100"
                          value={studentInfo.trm_depplacingrate}
                          onChange={(e) => setStudentInfo({ ...studentInfo, trm_depplacingrate: e.target.value })}
                          placeholder={locale === "zh" ? "例: 30 (前30%)" : "Ex: 30 (top 30%)"}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* 聯絡資訊 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="com_cellphone">{t("student.com_cellphone")} *</Label>
                    <Input
                      id="com_cellphone"
                      value={studentInfo.com_cellphone}
                      onChange={(e) => setStudentInfo({ ...studentInfo, com_cellphone: e.target.value })}
                      placeholder={locale === "zh" ? "例: 0912345678" : "Ex: 0912345678"}
                    />
                  </div>

                  <div>
                    <Label htmlFor="bank_account">{t("student.bank_account")} *</Label>
                    <Input
                      id="bank_account"
                      value={studentInfo.bank_account}
                      onChange={(e) => setStudentInfo({ ...studentInfo, bank_account: e.target.value })}
                      placeholder={locale === "zh" ? "請輸入完整銀行帳號" : "Enter complete bank account number"}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="com_commadd">{t("student.com_commadd")} *</Label>
                  <Input
                    id="com_commadd"
                    value={studentInfo.com_commadd}
                    onChange={(e) => setStudentInfo({ ...studentInfo, com_commadd: e.target.value })}
                    placeholder={locale === "zh" ? "請輸入完整通訊地址" : "Enter complete mailing address"}
                  />
                </div>

                {/* 研究計畫 - 博士班相關 */}
                {(user.studentType === "phd" || user.studentType === "direct_phd") && (
                  <div>
                    <Label htmlFor="research_proposal">
                      {locale === "zh" ? "研究計畫摘要" : "Research Proposal Summary"} *
                    </Label>
                    <Textarea
                      id="research_proposal"
                      value={studentInfo.research_proposal}
                      onChange={(e) => setStudentInfo({ ...studentInfo, research_proposal: e.target.value })}
                      placeholder={
                        locale === "zh"
                          ? "請簡述研究計畫內容、目標與預期成果..."
                          : "Please briefly describe research plan content, objectives and expected outcomes..."
                      }
                      rows={4}
                    />
                  </div>
                )}

                {user.studentType === "direct_phd" && (
                  <>
                    <div>
                      <Label htmlFor="budget_plan">{locale === "zh" ? "預算規劃" : "Budget Plan"} *</Label>
                      <Textarea
                        id="budget_plan"
                        value={studentInfo.budget_plan}
                        onChange={(e) => setStudentInfo({ ...studentInfo, budget_plan: e.target.value })}
                        placeholder={
                          locale === "zh" ? "請詳述研究經費使用規劃..." : "Please detail research funding usage plan..."
                        }
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="milestone_plan">{locale === "zh" ? "里程碑規劃" : "Milestone Plan"} *</Label>
                      <Textarea
                        id="milestone_plan"
                        value={studentInfo.milestone_plan}
                        onChange={(e) => setStudentInfo({ ...studentInfo, milestone_plan: e.target.value })}
                        placeholder={
                          locale === "zh"
                            ? "請列出研究進度里程碑與時程規劃..."
                            : "Please list research progress milestones and timeline..."
                        }
                        rows={3}
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label>{locale === "zh" ? "相關文件上傳" : "Document Upload"} *</Label>
                  <FileUpload
                    onFilesChange={(files) => console.log("Files uploaded:", files)}
                    acceptedTypes={[".pdf", ".jpg", ".jpeg", ".png"]}
                    maxSize={10 * 1024 * 1024} // 10MB
                    locale={locale}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {locale === "zh"
                      ? "支援格式: PDF, JPG, PNG | 最大檔案大小: 10MB | 自動壓縮至300 DPI"
                      : "Supported formats: PDF, JPG, PNG | Max file size: 10MB | Auto-compressed to 300 DPI"}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="agree_terms"
                    checked={studentInfo.agree_terms}
                    onChange={(e) => setStudentInfo({ ...studentInfo, agree_terms: e.target.checked })}
                  />
                  <Label htmlFor="agree_terms" className="text-sm">
                    {locale === "zh"
                      ? `我已閱讀並同意${scholarshipInfo.name}申請相關條款與規定`
                      : `I have read and agree to the terms and conditions for ${scholarshipInfo.name}`}
                  </Label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSubmitApplication}
                  disabled={
                    !studentInfo.trm_ascore_gpa ||
                    !studentInfo.agree_terms ||
                    !studentInfo.com_cellphone ||
                    !studentInfo.bank_account
                  }
                >
                  <Save className="h-4 w-4 mr-1" />
                  {locale === "zh" ? "提交申請" : "Submit Application"}
                </Button>
                <Button variant="outline">{locale === "zh" ? "儲存草稿" : "Save Draft"}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{locale === "zh" ? "個人資料" : "Personal Information"}</CardTitle>
              <CardDescription>
                {locale === "zh"
                  ? "管理您的個人資訊與學籍資料"
                  : "Manage your personal information and academic records"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{locale === "zh" ? "學號" : "Student ID"}</Label>
                  <Input value={studentInfo.std_stdcode} disabled />
                </div>
                <div>
                  <Label>{locale === "zh" ? "中文姓名" : "Chinese Name"}</Label>
                  <Input value={studentInfo.std_cname} disabled />
                </div>
                <div>
                  <Label>{locale === "zh" ? "英文姓名" : "English Name"}</Label>
                  <Input value={studentInfo.std_ename} disabled />
                </div>
                <div>
                  <Label>{locale === "zh" ? "攻讀學位" : "Degree Program"}</Label>
                  <Input
                    value={
                      studentInfo.std_degree === "1"
                        ? locale === "zh"
                          ? "博士"
                          : "PhD"
                        : studentInfo.std_degree === "2"
                          ? locale === "zh"
                            ? "碩士"
                            : "Master"
                          : locale === "zh"
                            ? "學士"
                            : "Bachelor"
                    }
                    disabled
                  />
                </div>
                <div>
                  <Label>{locale === "zh" ? "電子郵件" : "Email"}</Label>
                  <Input value={studentInfo.com_email} disabled />
                </div>
                <div>
                  <Label>{locale === "zh" ? "國籍" : "Nationality"}</Label>
                  <Input value={studentInfo.std_nation1} disabled />
                </div>
              </div>

              <div className="pt-4">
                <Button variant="outline">{locale === "zh" ? "更新聯絡資訊" : "Update Contact Information"}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
