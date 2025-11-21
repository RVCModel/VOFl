import { createServiceClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createServiceClient()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action } = body as { action: 'follow' | 'unfollow' }

    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }
    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: '用户认证失败' }, { status: 401 })
    }
    const userId = user.id

    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('user_id')
      .eq('id', id)
      .single()
    if (datasetError || !dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 })
    }
    const authorId = dataset.user_id

    if (userId === authorId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
    }

    if (action === 'follow') {
      const { data: existingFollow } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', userId)
        .eq('following_id', authorId)
        .single()
      if (existingFollow) {
        return NextResponse.json({ error: 'Already following' }, { status: 400 })
      }
      const { error: followError } = await supabase
        .from('user_follows')
        .insert({ follower_id: userId, following_id: authorId })
      if (followError) {
        return NextResponse.json({ error: 'Failed to follow user' }, { status: 500 })
      }
      await supabase.rpc('increment_followers_count', { user_uuid: authorId })
      return NextResponse.json({ success: true, following: true })
    } else if (action === 'unfollow') {
      const { data: existingFollow } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', userId)
        .eq('following_id', authorId)
        .single()
      if (!existingFollow) {
        return NextResponse.json({ error: 'Not following yet' }, { status: 400 })
      }
      const { error: unfollowError } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', userId)
        .eq('following_id', authorId)
      if (unfollowError) {
        return NextResponse.json({ error: 'Failed to unfollow user' }, { status: 500 })
      }
      await supabase.rpc('decrement_followers_count', { user_uuid: authorId })
      return NextResponse.json({ success: true, following: false })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in dataset follow API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }
    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: '用户认证失败' }, { status: 401 })
    }
    const userId = user.id

    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('user_id')
      .eq('id', id)
      .single()
    if (datasetError || !dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 })
    }
    const authorId = dataset.user_id

    const { data: followData } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', userId)
      .eq('following_id', authorId)
      .single()

    return NextResponse.json({ following: !!followData })
  } catch (error) {
    console.error('Error in dataset follow API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}