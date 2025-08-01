'use client'

import ScholarshipListing from '@/components/scholarship-listing'

export default function ScholarshipsPage() {
  const handleScholarshipSelect = (scholarship: any) => {
    console.log('Selected scholarship:', scholarship)
    // TODO: Navigate to scholarship detail page or open application form
    // router.push(`/scholarships/${scholarship.id}`)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">獎學金申請</h1>
        <p className="text-gray-600">
          瀏覽所有可申請的獎學金項目，篩選適合您的獎學金並立即申請
        </p>
      </div>

      <ScholarshipListing 
        onScholarshipSelect={handleScholarshipSelect}
        className="mb-8"
      />
      
      <div className="mt-12 p-6 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">申請注意事項</h2>
        <ul className="text-blue-800 space-y-1">
          <li>• 每學期每位學生僅能申請一個獎學金項目</li>
          <li>• 續領申請優先於一般申請處理</li>
          <li>• 請於申請期限內完成所有必要文件上傳</li>
          <li>• 部分獎學金需要指導教授推薦信</li>
        </ul>
      </div>
    </div>
  )
}