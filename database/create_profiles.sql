-- 创建用户配置文件表
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  balance DECIMAL DEFAULT 0,
  credits INTEGER DEFAULT 0,
  is_admin BOOLEAN DEFAULT false
);

-- 创建更新时间戳的函数
CREATE OR REPLACE FUNCTION public.handle_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建更新profiles时间戳的触发器
DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
CREATE TRIGGER handle_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_profiles_updated_at();

-- 创建RLS策略
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- profiles表的RLS策略
CREATE POLICY "用户可以查看所有公开的配置文件" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "用户可以插入自己的配置文件" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "用户可以更新自己的配置文件" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "管理员可以更新所有配置文件" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin);