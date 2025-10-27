-- 创建模型点赞表
CREATE TABLE IF NOT EXISTS public.model_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID REFERENCES public.models(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(model_id, user_id)
);

-- 为models表添加点赞数字段
ALTER TABLE public.models 
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_model_likes_model_id ON public.model_likes(model_id);
CREATE INDEX IF NOT EXISTS idx_model_likes_user_id ON public.model_likes(user_id);

-- 启用RLS
ALTER TABLE public.model_likes ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
CREATE POLICY "用户可以查看自己的模型点赞记录" ON public.model_likes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可以插入自己的模型点赞记录" ON public.model_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的模型点赞记录" ON public.model_likes
  FOR DELETE USING (auth.uid() = user_id);

-- 创建函数：更新模型点赞数
CREATE OR REPLACE FUNCTION public.update_model_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.models 
    SET like_count = like_count + 1 
    WHERE id = NEW.model_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.models 
    SET like_count = GREATEST(like_count - 1, 0) 
    WHERE id = OLD.model_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS update_model_like_count_trigger ON public.model_likes;
CREATE TRIGGER update_model_like_count_trigger
AFTER INSERT OR DELETE ON public.model_likes
FOR EACH ROW EXECUTE FUNCTION public.update_model_like_count();