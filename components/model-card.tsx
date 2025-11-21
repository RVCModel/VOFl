import React from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

interface ModelCardProps {
  id: string;
  name: string;
  coverImageUrl: string | null;
  type: string;
  downloadCount: number;
  viewCount: number;
  displayName?: string;
  avatarUrl?: string;
  isPaid?: boolean;
  recommended?: boolean;
  recommendedLabel?: string;
}

export const ModelCard: React.FC<ModelCardProps> = ({
  id,
  name,
  coverImageUrl,
  type,
  downloadCount,
  viewCount,
  displayName,
  avatarUrl,
  isPaid = false,
  recommended = false,
  recommendedLabel = '为你推荐',
}) => {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/models/${id}`);
  };

  return (
    <div className="overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer group rounded-xl max-w-xs" onClick={handleClick}>
      {/* 全封面图区域 - 竖长图片 */}
      <div className="relative aspect-[3/4] bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden">
        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">{name ? name.charAt(0) : 'M'}</span>
          </div>
        )}
        
        {/* 左上角：类型标签 */}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="bg-black/50 text-white hover:bg-black/60 backdrop-blur-sm text-xs">
            {type === 'gpt-sovits' ? 'GSV' : (type ? type.toUpperCase() : 'MODEL')}
          </Badge>
        </div>
        
        {/* 右上角：推荐/付费标签堆叠 */}
        {(recommended || isPaid) && (
          <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
            {recommended && (
              <Badge variant="secondary" className="bg-blue-500/80 text-white hover:bg-blue-600/80 backdrop-blur-sm text-xs">
                {recommendedLabel}
              </Badge>
            )}
            {isPaid && (
              <Badge variant="secondary" className="bg-amber-500/80 text-white hover:bg-amber-600/80 backdrop-blur-sm text-xs">
                付费
              </Badge>
            )}
          </div>
        )}
        
        {/* 左下角：作者头像和用户名 */}
        {displayName && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1">
            <Avatar className="w-5 h-5 border border-white/30">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={displayName} />
              ) : null}
              <AvatarFallback className="text-xs bg-black/50 text-white">{displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-white bg-black/50 px-1 py-0.5 rounded backdrop-blur-sm truncate max-w-20">{displayName}</span>
          </div>
        )}
        
        {/* 右下角：浏览次数和下载次数 */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1">
          <div className="flex items-center gap-0.5 text-xs text-white bg-black/50 px-1 py-0.5 rounded backdrop-blur-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            {viewCount}
          </div>
          <div className="flex items-center gap-0.5 text-xs text-white bg-black/50 px-1 py-0.5 rounded backdrop-blur-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {downloadCount}
          </div>
        </div>
      </div>
      
      {/* 模型名称 */}
      <div className="p-3 bg-white dark:bg-gray-900">
        <h3 className="font-medium text-sm line-clamp-2 text-gray-900 dark:text-gray-100">{name}</h3>
      </div>
    </div>
  );
};