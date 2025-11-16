import { createServiceClient } from "@/lib/supabase"
import { NextRequest, NextResponse } from "next/server"

const supabase = createServiceClient()

// 简单的基于种子的伪随机数生成器（mulberry32）
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleWithSeed<T>(arr: T[], seedStr: string): T[] {
  const seed =
    seedStr.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) || 1
  const rng = mulberry32(seed)
  const res = [...arr]
  for (let i = res.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[res[i], res[j]] = [res[j], res[i]]
  }
  return res
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const limit = parseInt(searchParams.get("limit") || "20", 10)
    const page = parseInt(searchParams.get("page") || "0", 10)
    const category = searchParams.get("category") || "all"
    const typeParam = searchParams.get("type") || "all"
    const sortBy = searchParams.get("sortBy") || "recommended"
    const searchQuery = searchParams.get("searchQuery") || ""
    const seed = searchParams.get("seed") || "default"

    // 解析 Authorization 中的 Bearer token 获取用户（用于推荐算法）
    let authUserId: string | null = null
    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("Authorization")
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      const {
        data: { user },
      } = await supabase.auth.getUser(token)
      authUserId = user?.id || null
    }

    // 是否有额外筛选
    const hasExtraFilter =
      category !== "all" || typeParam !== "all" || !!searchQuery

    // 推荐模式且无筛选：调用 SQL 推荐函数 + 稳定随机 + 分页
    if (sortBy === "recommended" && !hasExtraFilter) {
      const effectiveLimit = 200

      const { data, error } = await supabase.rpc(
        "get_home_recommendations",
        {
          p_user_id: authUserId,
          p_limit: effectiveLimit,
        },
      )

      if (error) {
        console.error("调用推荐函数失败:", error)
        return NextResponse.json(
          { error: "获取推荐列表失败，请稍后重试" },
          { status: 500 },
        )
      }

      const allRows = (data || []) as any[]
      const shuffled = shuffleWithSeed(allRows, seed)

      const start = page * limit
      const end = start + limit
      const pageRows = shuffled.slice(start, end)

      const userIds = Array.from(
        new Set(pageRows.map((row: any) => row.user_id).filter(Boolean)),
      )

      let profiles: any[] = []
      if (userIds.length > 0) {
        const { data: profileRows } = await supabase
          .from("profiles")
          .select("id,username,display_name,avatar_url")
          .in("id", userIds)
        profiles = profileRows || []
      }

      const items = pageRows.map((row: any) => {
        const profile = profiles.find((p) => p.id === row.user_id)
        return {
          item_type: row.kind as "model" | "dataset",
          id: row.item_id,
          user_id: row.user_id,
          name: row.name,
          cover_image_url: row.cover_image_url,
          content_category: row.content_category,
          type: row.type,
          like_count: row.like_count,
          view_count: row.view_count,
          download_count: row.download_count,
          created_at: row.created_at,
          profiles: profile
            ? {
                username: profile.username,
                display_name: profile.display_name,
                avatar_url: profile.avatar_url,
              }
            : null,
        }
      })

      const hasMore = shuffled.length > end

      return NextResponse.json({
        items,
        hasMore,
        total: shuffled.length,
      })
    }

    // 其他排序或有筛选时：从 models / datasets 合并并在服务端排序 + 分页
    const normalizedDatasetType = (() => {
      if (typeParam === "all") return null
      if (typeParam === "audio") return "voice"
      return typeParam
    })()

    let modelsQuery = supabase
      .from("models")
      .select("*")
      .eq("visibility", "public")
      .eq("status", "published")

    let datasetsQuery = supabase
      .from("datasets")
      .select("*")
      .eq("visibility", "public")
      .eq("status", "published")

    if (category !== "all") {
      modelsQuery = modelsQuery.eq("content_category", category)
      datasetsQuery = datasetsQuery.eq("content_category", category)
    }

    if (normalizedDatasetType) {
      datasetsQuery = datasetsQuery.eq("type", normalizedDatasetType)
    }

    if (searchQuery) {
      const like = `%${searchQuery}%`
      modelsQuery = modelsQuery.or(
        `name.ilike.${like},description.ilike.${like}`,
      )
      datasetsQuery = datasetsQuery.or(
        `name.ilike.${like},description.ilike.${like}`,
      )
    }

    const [{ data: modelsData, error: modelsError }, { data: datasetsData, error: datasetsError }] =
      await Promise.all([modelsQuery, datasetsQuery])

    if (modelsError || datasetsError) {
      console.error("获取模型/数据集列表失败:", { modelsError, datasetsError })
      return NextResponse.json(
        { error: "获取内容列表失败，请稍后重试" },
        { status: 500 },
      )
    }

    const models = (modelsData || []).map((m: any) => ({
      item_type: "model" as const,
      id: m.id,
      user_id: m.user_id,
      name: m.name,
      cover_image_url: m.cover_image_url,
      content_category: m.content_category,
      type: m.type,
      like_count: m.like_count || 0,
      view_count: m.view_count || 0,
      download_count: m.download_count || 0,
      created_at: m.created_at,
    }))

    const datasets = (datasetsData || []).map((d: any) => ({
      item_type: "dataset" as const,
      id: d.id,
      user_id: d.user_id,
      name: d.name,
      cover_image_url: d.cover_image_url,
      content_category: d.content_category,
      type: d.type,
      like_count: d.like_count || 0,
      view_count: d.view_count || 0,
      download_count: d.download_count || 0,
      created_at: d.created_at,
    }))

    let allItems = [...models, ...datasets]

    const calcPopularity = (item: any) => {
      const v = item.view_count || 0
      const d = item.download_count || 0
      const l = item.like_count || 0
      return Math.log(1 + v * 0.2 + d * 0.5 + l * 1.0)
    }

    const calcRecency = (item: any) => {
      const created = new Date(item.created_at).getTime()
      const diffDays = (Date.now() - created) / (1000 * 60 * 60 * 24)
      return Math.max(0, 1 - diffDays / 30)
    }

    allItems.sort((a, b) => {
      switch (sortBy) {
        case "latest":
          return (
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
          )
        case "popular": {
          return calcPopularity(b) - calcPopularity(a)
        }
        case "mostRun":
          return (b.view_count || 0) - (a.view_count || 0)
        case "mostDownload":
          return (b.download_count || 0) - (a.download_count || 0)
        case "mostDiscuss":
          return (b.like_count || 0) - (a.like_count || 0)
        case "recommended":
        default: {
          const scoreA = calcPopularity(a) * 0.4 + calcRecency(a) * 0.6
          const scoreB = calcPopularity(b) * 0.4 + calcRecency(b) * 0.6
          return scoreB - scoreA
        }
      }
    })

    const total = allItems.length
    const start = page * limit
    const end = start + limit
    const pagedItems = allItems.slice(start, end)
    const hasMore = total > end

    const userIds = Array.from(
      new Set(pagedItems.map((item) => item.user_id).filter(Boolean)),
    )

    let profiles: any[] = []
    if (userIds.length > 0) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id,username,display_name,avatar_url")
        .in("id", userIds)
      profiles = profileRows || []
    }

    const items = pagedItems.map((item) => {
      const profile = profiles.find((p) => p.id === item.user_id)
      return {
        ...item,
        profiles: profile
          ? {
              username: profile.username,
              display_name: profile.display_name,
              avatar_url: profile.avatar_url,
            }
          : null,
      }
    })

    return NextResponse.json({
      items,
      hasMore,
      total,
    })
  } catch (error) {
    console.error("获取推荐/内容列表失败:", error)
    return NextResponse.json(
      { error: "获取内容列表失败，请稍后重试" },
      { status: 500 },
    )
  }
}

