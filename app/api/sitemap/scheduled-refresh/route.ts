import { NextResponse } from "next/server"

export async function GET() {
  try {
    // 使用环境变量中的站点地址，避免使用 headers() 触发动态路由限制
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000"

    console.log(
      `Attempting to refresh sitemap at: ${baseUrl}/api/sitemap/refresh`,
    )

    const response = await fetch(`${baseUrl}/api/sitemap/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "scheduled",
        id: "all",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(
        `Sitemap refresh failed with status ${response.status}: ${errorText}`,
      )
      throw new Error(`Failed to refresh sitemap: ${response.statusText}`)
    }

    const result = await response.json()

    return NextResponse.json({
      success: true,
      message: "Scheduled sitemap refresh completed",
      result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error in scheduled sitemap refresh:", error)
    return NextResponse.json(
      { error: "Failed to refresh sitemap" },
      { status: 500 },
    )
  }
}

