import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')
    const filename = searchParams.get('filename')
    const type = searchParams.get('type')
    const applicationId = searchParams.get('applicationId')
    const token = searchParams.get('token')
    
    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      )
    }
    
    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      )
    }
    
    if (!token) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      )
    }
    
    // 預設使用內部 Docker 網路地址來訪問後端，如果沒有設定則使用 NEXT_PUBLIC_API_URL
    const backendUrl = `${process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL}/api/v1/files/applications/${applicationId}/files/${fileId}?token=${token}`
    
    console.log('Preview API called:', {
      fileId,
      applicationId,
      backendUrl
    })
    
    // 從後端獲取文件
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    
    if (!response.ok) {
      console.error('Backend response error:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Failed to fetch file from backend' },
        { status: response.status }
      )
    }
    
    // 獲取文件數據
    const fileBuffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    
    // 根據文件類型設置適當的 Content-Type
    let finalContentType = contentType
    if (type === 'pdf') {
      finalContentType = 'application/pdf'
    } else if (type === 'image') {
      finalContentType = contentType.startsWith('image/') ? contentType : 'image/jpeg'
    }
    
    // 返回文件給用戶
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': finalContentType,
        'Content-Disposition': filename ? `inline; filename="${filename}"` : 'inline',
        'Cache-Control': 'private, max-age=3600', // 1小時緩存
      },
    })
  } catch (error) {
    console.error('File preview error:', error)
    return NextResponse.json(
      { error: 'Failed to preview file' },
      { status: 500 }
    )
  }
} 