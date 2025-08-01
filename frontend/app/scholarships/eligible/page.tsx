'use client'

import ScholarshipListing from '@/components/scholarship-listing'

export default function EligibleScholarshipsPage() {
  const handleScholarshipSelect = (scholarship: any) => {
    console.log('Selected eligible scholarship:', scholarship)
    // TODO: Navigate to application form
    // router.push(`/applications/new?scholarship=${scholarship.id}`)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">符合資格的獎學金</h1>
        <p className="text-gray-600">
          根據您的學生資料和學術條件，以下是您可以申請的獎學金項目
        </p>
      </div>

      <ScholarshipListing 
        showEligibleOnly={true}
        onScholarshipSelect={handleScholarshipSelect}
        className="mb-8"
      />
      
      <div className="mt-12 space-y-6">
        <div className="p-6 bg-green-50 rounded-lg">
          <h2 className="text-lg font-semibold text-green-900 mb-2">資格確認說明</h2>
          <p className="text-green-800">
            系統已根據您的學生類型、學術成績、在學狀況等條件篩選出符合資格的獎學金。
            若您認為應該符合某項獎學金資格但未顯示，請聯繫承辦人員確認。
          </p>
        </div>
        
        <div className="p-6 bg-amber-50 rounded-lg">
          <h2 className="text-lg font-semibold text-amber-900 mb-2">申請優先順序</h2>
          <ul className="text-amber-800 space-y-1">
            <li>• <strong>續領申請</strong>：已獲得獎學金的同學優先處理續領申請</li>
            <li>• <strong>一般申請</strong>：新申請者將在續領處理完畢後依序審核</li>
            <li>• <strong>名額限制</strong>：各獎學金依學院分配名額，額滿為止</li>
          </ul>
        </div>
      </div>
    </div>
  )
}