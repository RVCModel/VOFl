import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

// 创建Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ProfileLayoutProps {
  children: React.ReactNode
  params: {
    id: string
  }
}

// 生成静态参数
export async function generateStaticParams() {
  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .limit(100) // 限制数量以避免构建时间过长

    return profiles?.map((profile) => ({
      id: profile.id,
    })) || []
  } catch (error) {
    console.error('Error generating static params:', error)
    return []
  }
}

// 生成元数据
export async function generateMetadata({ params }: ProfileLayoutProps): Promise<Metadata> {
  const { id } = params
  
  try {
    // 获取用户资料信息
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, display_name, bio')
      .eq('id', id)
      .single()

    if (!profile) {
      return {
        title: '用户未找到 - VOFL',
        description: '您查找的用户不存在或已被删除。',
      }
    }

    const displayName = profile.display_name || profile.username
    const bio = profile.bio || `查看 ${displayName} 在 VOFL 平台的个人主页，包括其发布的模型、数据集以及喜欢和收藏的内容。`

    return {
      title: `${displayName} - VOFL用户`,
      description: bio,
      keywords: [displayName, 'VOFL', '个人主页', '语音模型', '数据集'],
      openGraph: {
        title: `${displayName} - VOFL用户`,
        description: bio,
        type: 'profile',
        url: `https://vofl.com/profile/${id}`,
        images: [
          {
            url: profile.avatar_url || '/images/default-avatar.png',
            width: 1200,
            height: 630,
            alt: `${displayName}的头像`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${displayName} - VOFL用户`,
        description: bio,
        images: [profile.avatar_url || '/images/default-avatar.png'],
      },
      alternates: {
        canonical: `https://vofl.com/profile/${id}`,
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: '用户资料 - VOFL',
      description: '查看用户在 VOFL 平台的资料和作品。',
    }
  }
}

export default function ProfileLayout({ children }: ProfileLayoutProps) {
  return <>{children}</>
}