import { createServiceClient } from "@/lib/supabase"
import { NextRequest, NextResponse } from "next/server"

const supabase = createServiceClient()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const body = await request.json()
    const { action } = body

    let userId: string | null = null
    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("Authorization")

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      const {
        data: { user },
      } = await supabase.auth.getUser(token)
      userId = user?.id || null
    }

    if (!userId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { data: dataset, error: datasetError } = await supabase
      .from("datasets")
      .select("id, like_count")
      .eq("id", id)
      .single()

    if (datasetError || !dataset) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 })
    }

    if (action === "like") {
      const { data: existingLike } = await supabase
        .from("dataset_likes")
        .select("id")
        .eq("dataset_id", id)
        .eq("user_id", userId)
        .single()

      if (existingLike) {
        return NextResponse.json({ error: "Already liked" }, { status: 400 })
      }

      const { error: likeError } = await supabase
        .from("dataset_likes")
        .insert({
          dataset_id: id,
          user_id: userId,
        })

      if (likeError) {
        console.error("Error adding like:", likeError)
        return NextResponse.json(
          { error: "Failed to like dataset" },
          { status: 500 }
        )
      }

      const { error: updateError } = await supabase
        .from("datasets")
        .update({ like_count: dataset.like_count + 1 })
        .eq("id", id)

      if (updateError) {
        console.error("Error updating like count:", updateError)
      }

      return NextResponse.json({
        success: true,
        liked: true,
        likeCount: dataset.like_count + 1,
      })
    }

    if (action === "unlike") {
      const { data: existingLike } = await supabase
        .from("dataset_likes")
        .select("id")
        .eq("dataset_id", id)
        .eq("user_id", userId)
        .single()

      if (!existingLike) {
        return NextResponse.json({ error: "Not liked yet" }, { status: 400 })
      }

      const { error: unlikeError } = await supabase
        .from("dataset_likes")
        .delete()
        .eq("dataset_id", id)
        .eq("user_id", userId)

      if (unlikeError) {
        console.error("Error removing like:", unlikeError)
        return NextResponse.json(
          { error: "Failed to unlike dataset" },
          { status: 500 }
        )
      }

      const newLikeCount = Math.max(0, dataset.like_count - 1)
      const { error: updateError } = await supabase
        .from("datasets")
        .update({ like_count: newLikeCount })
        .eq("id", id)

      if (updateError) {
        console.error("Error updating like count:", updateError)
      }

      return NextResponse.json({
        success: true,
        liked: false,
        likeCount: newLikeCount,
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error in dataset like API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

