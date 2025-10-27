-- 创建模型评论表
CREATE TABLE IF NOT EXISTS public.model_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID REFERENCES public.models(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES public.model_comments(id) ON DELETE CASCADE, -- 用于回复评论
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_model_comments_model_id ON public.model_comments(model_id);
CREATE INDEX IF NOT EXISTS idx_model_comments_user_id ON public.model_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_model_comments_parent_id ON public.model_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_model_comments_created_at ON public.model_comments(created_at DESC);

-- 创建更新评论时间戳的触发器
DROP TRIGGER IF EXISTS handle_model_comments_updated_at ON public.model_comments;
CREATE TRIGGER handle_model_comments_updated_at
BEFORE UPDATE ON public.model_comments
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 启用RLS
ALTER TABLE public.model_comments ENABLE ROW LEVEL SECURITY;

-- 评论表的RLS策略
CREATE POLICY "任何人都可以查看评论" ON public.model_comments
  FOR SELECT USING (true);

CREATE POLICY "登录用户可以插入评论" ON public.model_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的评论" ON public.model_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的评论" ON public.model_comments
  FOR DELETE USING (auth.uid() = user_id);