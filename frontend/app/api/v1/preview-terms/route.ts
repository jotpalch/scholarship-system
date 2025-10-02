import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scholarshipType = searchParams.get("scholarshipType");
    const token = searchParams.get("token");

    if (!scholarshipType) {
      return NextResponse.json(
        { error: "Scholarship type is required" },
        { status: 400 }
      );
    }

    if (!token) {
      return NextResponse.json(
        { error: "Access token is required" },
        { status: 400 }
      );
    }

    // 使用內部 Docker 網路地址訪問後端
    const backendUrl = `${process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL}/api/v1/scholarships/${scholarshipType}/terms`;

    console.log("Terms preview API called:", {
      scholarshipType,
      backendUrl,
    });

    // 從後端獲取文件
    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error(
        "Backend response error:",
        response.status,
        response.statusText
      );
      return NextResponse.json(
        { error: "Failed to fetch terms document" },
        { status: response.status }
      );
    }

    // 獲取文件數據
    const fileBuffer = await response.arrayBuffer();
    const contentType =
      response.headers.get("content-type") || "application/pdf";

    // 返回文件給用戶
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=3600", // 1小時緩存
      },
    });
  } catch (error) {
    console.error("Terms preview error:", error);
    return NextResponse.json(
      { error: "Failed to preview terms document" },
      { status: 500 }
    );
  }
}
