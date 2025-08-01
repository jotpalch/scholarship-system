'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarIcon, DollarSignIcon, FilterIcon, SearchIcon, UsersIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScholarshipType {
  id: number
  code: string
  name: string
  name_en?: string
  description?: string
  description_en?: string
  category: string
  sub_type_list: string[]
  sub_type_selection_mode: string
  academic_year: number
  semester: string
  application_cycle: string
  amount: number
  currency?: string
  whitelist_enabled: boolean
  whitelist_student_ids: number[]
  renewal_application_start_date?: string
  renewal_application_end_date?: string
  application_start_date?: string
  application_end_date?: string
  status: string
  created_at?: string
}

interface ScholarshipListingProps {
  className?: string
  onScholarshipSelect?: (scholarship: ScholarshipType) => void
  showEligibleOnly?: boolean
}

export default function ScholarshipListing({ 
  className, 
  onScholarshipSelect,
  showEligibleOnly = false 
}: ScholarshipListingProps) {
  const [scholarships, setScholarships] = useState<ScholarshipType[]>([])
  const [filteredScholarships, setFilteredScholarships] = useState<ScholarshipType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [applicationPeriodFilter, setApplicationPeriodFilter] = useState<string>('all')

  useEffect(() => {
    fetchScholarships()
  }, [showEligibleOnly])

  const fetchScholarships = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const endpoint = showEligibleOnly 
        ? '/api/v1/scholarships/eligible'
        : '/api/v1/scholarships/'
      
      const response = await fetch(endpoint)
      if (!response.ok) {
        throw new Error(`Failed to fetch scholarships: ${response.statusText}`)
      }
      
      const data = await response.json()
      const scholarshipData = showEligibleOnly ? data : data.data
      
      setScholarships(scholarshipData || [])
      setFilteredScholarships(scholarshipData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scholarships')
      setScholarships([])
      setFilteredScholarships([])
    } finally {
      setLoading(false)
    }
  }

  // Apply filters whenever filter values change
  useEffect(() => {
    let filtered = [...scholarships]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(scholarship =>
        scholarship.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scholarship.name_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scholarship.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scholarship.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(scholarship => scholarship.category === categoryFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(scholarship => scholarship.status === statusFilter)
    }

    // Application period filter
    if (applicationPeriodFilter !== 'all') {
      const now = new Date()
      filtered = filtered.filter(scholarship => {
        const appStart = scholarship.application_start_date ? new Date(scholarship.application_start_date) : null
        const appEnd = scholarship.application_end_date ? new Date(scholarship.application_end_date) : null
        const renewalStart = scholarship.renewal_application_start_date ? new Date(scholarship.renewal_application_start_date) : null
        const renewalEnd = scholarship.renewal_application_end_date ? new Date(scholarship.renewal_application_end_date) : null

        switch (applicationPeriodFilter) {
          case 'open':
            return (appStart && appEnd && appStart <= now && now <= appEnd) ||
                   (renewalStart && renewalEnd && renewalStart <= now && now <= renewalEnd)
          case 'upcoming':
            return (appStart && appStart > now) || (renewalStart && renewalStart > now)
          case 'closed':
            return (appEnd && appEnd < now) && (!renewalEnd || renewalEnd < now)
          default:
            return true
        }
      })
    }

    setFilteredScholarships(filtered)
  }, [scholarships, searchTerm, categoryFilter, statusFilter, applicationPeriodFilter])

  const getApplicationPeriodStatus = (scholarship: ScholarshipType) => {
    const now = new Date()
    const appStart = scholarship.application_start_date ? new Date(scholarship.application_start_date) : null
    const appEnd = scholarship.application_end_date ? new Date(scholarship.application_end_date) : null
    const renewalStart = scholarship.renewal_application_start_date ? new Date(scholarship.renewal_application_start_date) : null
    const renewalEnd = scholarship.renewal_application_end_date ? new Date(scholarship.renewal_application_end_date) : null

    // Check renewal period first (higher priority)
    if (renewalStart && renewalEnd) {
      if (renewalStart <= now && now <= renewalEnd) {
        return { status: 'renewal-open', label: '續領申請中', variant: 'default' as const }
      }
      if (renewalStart > now) {
        return { status: 'renewal-upcoming', label: '續領即將開放', variant: 'secondary' as const }
      }
    }

    // Check general application period
    if (appStart && appEnd) {
      if (appStart <= now && now <= appEnd) {
        return { status: 'open', label: '申請中', variant: 'default' as const }
      }
      if (appStart > now) {
        return { status: 'upcoming', label: '即將開放', variant: 'secondary' as const }
      }
      if (appEnd < now) {
        return { status: 'closed', label: '已截止', variant: 'destructive' as const }
      }
    }

    return { status: 'unknown', label: '未設定', variant: 'outline' as const }
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'undergraduate_freshman': '學士班新生獎學金',
      'phd': '博士生獎學金',
      'direct_phd': '逕讀博士獎學金'
    }
    return labels[category] || category
  }

  const formatAmount = (amount: number, currency = 'TWD') => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '未設定'
    return new Date(dateString).toLocaleDateString('zh-TW')
  }

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="text-center text-red-500 bg-red-50 p-4 rounded-lg">
          <p>載入獎學金資料時發生錯誤</p>
          <p className="text-sm mt-1">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => fetchScholarships()}
          >
            重新載入
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Filters Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FilterIcon className="h-5 w-5" />
          <h3 className="text-lg font-semibold">篩選獎學金</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜尋獎學金名稱或代碼..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger data-testid="category-filter">
              <SelectValue placeholder="選擇類別" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有類別</SelectItem>
              <SelectItem value="undergraduate_freshman">學士班新生</SelectItem>
              <SelectItem value="phd">博士生</SelectItem>
              <SelectItem value="direct_phd">逕讀博士</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="選擇狀態" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有狀態</SelectItem>
              <SelectItem value="active">啟用</SelectItem>
              <SelectItem value="inactive">停用</SelectItem>
            </SelectContent>
          </Select>

          {/* Application Period Filter */}
          <Select value={applicationPeriodFilter} onValueChange={setApplicationPeriodFilter}>
            <SelectTrigger>
              <SelectValue placeholder="申請狀態" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有狀態</SelectItem>
              <SelectItem value="open">申請中</SelectItem>
              <SelectItem value="upcoming">即將開放</SelectItem>
              <SelectItem value="closed">已截止</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          顯示 {filteredScholarships.length} 個獎學金 (共 {scholarships.length} 個)
        </p>
        {showEligibleOnly && (
          <Badge variant="outline" className="text-green-600 border-green-600">
            僅顯示符合資格
          </Badge>
        )}
      </div>

      {/* Scholarship Cards Grid */}
      {filteredScholarships.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">沒有找到符合條件的獎學金</p>
          <Button 
            variant="outline" 
            onClick={() => {
              setSearchTerm('')
              setCategoryFilter('all')
              setStatusFilter('all')
              setApplicationPeriodFilter('all')
            }}
          >
            清除篩選條件
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScholarships.map((scholarship) => {
            const periodStatus = getApplicationPeriodStatus(scholarship)
            
            return (
              <Card key={scholarship.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-lg line-clamp-2 leading-tight">
                      {scholarship.name}
                    </CardTitle>
                    <Badge variant={periodStatus.variant} className="ml-2 whitespace-nowrap">
                      {periodStatus.label}
                    </Badge>
                  </div>
                  <CardDescription className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">{scholarship.code}</Badge>
                      <Badge variant="secondary">{getCategoryLabel(scholarship.category)}</Badge>
                    </div>
                    {scholarship.name_en && (
                      <p className="text-sm text-gray-500 line-clamp-1">{scholarship.name_en}</p>
                    )}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Amount */}
                  <div className="flex items-center gap-2">
                    <DollarSignIcon className="h-4 w-4 text-gray-400" />
                    <span className="font-semibold text-green-600">
                      {formatAmount(scholarship.amount, scholarship.currency)}
                    </span>
                  </div>

                  {/* Academic Year & Semester */}
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">
                      {scholarship.academic_year}學年度 {scholarship.semester === 'first' ? '第一學期' : '第二學期'}
                    </span>
                  </div>

                  {/* Application Dates */}
                  {scholarship.application_start_date && scholarship.application_end_date && (
                    <div className="text-sm">
                      <p className="font-medium">申請期間:</p>
                      <p className="text-gray-600">
                        {formatDate(scholarship.application_start_date)} ~ {formatDate(scholarship.application_end_date)}
                      </p>
                    </div>
                  )}

                  {/* Renewal Dates */}
                  {scholarship.renewal_application_start_date && scholarship.renewal_application_end_date && (
                    <div className="text-sm">
                      <p className="font-medium">續領期間:</p>
                      <p className="text-gray-600">
                        {formatDate(scholarship.renewal_application_start_date)} ~ {formatDate(scholarship.renewal_application_end_date)}
                      </p>
                    </div>
                  )}

                  {/* Sub-types */}
                  {scholarship.sub_type_list.length > 1 && (
                    <div className="text-sm">
                      <p className="font-medium mb-1">子類型:</p>
                      <div className="flex flex-wrap gap-1">
                        {scholarship.sub_type_list.map((subType) => (
                          <Badge key={subType} variant="outline" className="text-xs">
                            {subType}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Whitelist info */}
                  {scholarship.whitelist_enabled && (
                    <div className="flex items-center gap-2 text-sm text-orange-600">
                      <UsersIcon className="h-4 w-4" />
                      <span>限制申請名單 ({scholarship.whitelist_student_ids.length} 人)</span>
                    </div>
                  )}

                  {/* Description */}
                  {scholarship.description && (
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {scholarship.description}
                    </p>
                  )}
                </CardContent>

                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={() => onScholarshipSelect?.(scholarship)}
                    variant={periodStatus.status === 'open' || periodStatus.status === 'renewal-open' ? 'default' : 'outline'}
                  >
                    {periodStatus.status === 'open' || periodStatus.status === 'renewal-open' 
                      ? '立即申請' 
                      : '查看詳情'}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}