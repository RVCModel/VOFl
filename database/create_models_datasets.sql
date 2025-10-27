-- 创建模型表
CREATE TABLE IF NOT EXISTS public.models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('gpt-sovits', 'other')),
  content_category TEXT NOT NULL CHECK (content_category IN ('ip_anime', 'explanation', 'character', 'game', 'other')),
  tags TEXT[] DEFAULT '{}',
  is_original BOOLEAN NOT NULL DEFAULT true,
  original_author TEXT, -- 如果是转载，记录原作者
  cover_image_url TEXT,
  description TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  is_paid BOOLEAN NOT NULL DEFAULT false,
  price DECIMAL(10, 2) CHECK (price >= 0),
  reference_audio_url TEXT,
  demo_audio_url TEXT,
  model_file_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'under_review', 'rejected')),
  download_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 创建数据集表
CREATE TABLE IF NOT EXISTS public.datasets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('voice', 'text', 'image', 'other')),
  content_category TEXT NOT NULL CHECK (content_category IN ('ip_anime', 'explanation', 'character', 'game', 'other')),
  tags TEXT[] DEFAULT '{}',
  is_original BOOLEAN NOT NULL DEFAULT true,
  original_author TEXT, -- 如果是转载，记录原作者
  cover_image_url TEXT,
  description TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  is_paid BOOLEAN NOT NULL DEFAULT false,
  price DECIMAL(10, 2) CHECK (price >= 0),
  file_url TEXT,
  file_size BIGINT, -- 文件大小（字节）
  file_type TEXT, -- 文件类型
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'under_review', 'rejected')),
  download_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 创建模型下载记录表
CREATE TABLE IF NOT EXISTS public.model_downloads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID REFERENCES public.models(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(model_id, user_id)
);

-- 创建数据集下载记录表
CREATE TABLE IF NOT EXISTS public.dataset_downloads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(dataset_id, user_id)
);

-- 创建模型点赞表
CREATE TABLE IF NOT EXISTS public.model_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID REFERENCES public.models(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(model_id, user_id)
);

-- 创建数据集点赞表
CREATE TABLE IF NOT EXISTS public.dataset_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(dataset_id, user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_models_user_id ON public.models(user_id);
CREATE INDEX IF NOT EXISTS idx_models_type ON public.models(type);
CREATE INDEX IF NOT EXISTS idx_models_content_category ON public.models(content_category);
CREATE INDEX IF NOT EXISTS idx_models_visibility ON public.models(visibility);
CREATE INDEX IF NOT EXISTS idx_models_status ON public.models(status);
CREATE INDEX IF NOT EXISTS idx_models_created_at ON public.models(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_datasets_user_id ON public.datasets(user_id);
CREATE INDEX IF NOT EXISTS idx_datasets_type ON public.datasets(type);
CREATE INDEX IF NOT EXISTS idx_datasets_content_category ON public.datasets(content_category);
CREATE INDEX IF NOT EXISTS idx_datasets_visibility ON public.datasets(visibility);
CREATE INDEX IF NOT EXISTS idx_datasets_status ON public.datasets(status);
CREATE INDEX IF NOT EXISTS idx_datasets_created_at ON public.datasets(created_at DESC);

-- 创建更新时间戳的函数
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建更新模型时间戳的触发器
DROP TRIGGER IF EXISTS handle_models_updated_at ON public.models;
CREATE TRIGGER handle_models_updated_at
BEFORE UPDATE ON public.models
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 创建更新数据集时间戳的触发器
DROP TRIGGER IF EXISTS handle_datasets_updated_at ON public.datasets;
CREATE TRIGGER handle_datasets_updated_at
BEFORE UPDATE ON public.datasets
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 创建RLS策略
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_likes ENABLE ROW LEVEL SECURITY;

-- 模型表的RLS策略
CREATE POLICY "用户可以查看所有公开的模型" ON public.models
  FOR SELECT USING (visibility = 'public' OR auth.uid() = user_id);

CREATE POLICY "用户可以插入自己的模型" ON public.models
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的模型" ON public.models
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的模型" ON public.models
  FOR DELETE USING (auth.uid() = user_id);

-- 数据集表的RLS策略
CREATE POLICY "用户可以查看所有公开的数据集" ON public.datasets
  FOR SELECT USING (visibility = 'public' OR auth.uid() = user_id);

CREATE POLICY "用户可以插入自己的数据集" ON public.datasets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的数据集" ON public.datasets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的数据集" ON public.datasets
  FOR DELETE USING (auth.uid() = user_id);

-- 下载记录表的RLS策略
CREATE POLICY "用户可以查看自己的模型下载记录" ON public.model_downloads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可以插入模型下载记录" ON public.model_downloads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以查看自己的数据集下载记录" ON public.dataset_downloads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可以插入数据集下载记录" ON public.dataset_downloads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 点赞记录表的RLS策略
CREATE POLICY "用户可以查看自己的模型点赞记录" ON public.model_likes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可以插入自己的模型点赞记录" ON public.model_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的模型点赞记录" ON public.model_likes
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "用户可以查看自己的数据集点赞记录" ON public.dataset_likes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可以插入自己的数据集点赞记录" ON public.dataset_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的数据集点赞记录" ON public.dataset_likes
  FOR DELETE USING (auth.uid() = user_id);