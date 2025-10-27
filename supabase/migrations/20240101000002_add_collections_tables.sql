-- 创建模型收藏表
CREATE TABLE IF NOT EXISTS public.model_collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID REFERENCES public.models(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(model_id, user_id)
);

-- 创建数据集收藏表
CREATE TABLE IF NOT EXISTS public.dataset_collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(dataset_id, user_id)
);

-- 为models表添加收藏数字段
ALTER TABLE public.models 
ADD COLUMN IF NOT EXISTS collection_count INTEGER DEFAULT 0;

-- 为datasets表添加收藏数字段
ALTER TABLE public.datasets 
ADD COLUMN IF NOT EXISTS collection_count INTEGER DEFAULT 0;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_model_collections_model_id ON public.model_collections(model_id);
CREATE INDEX IF NOT EXISTS idx_model_collections_user_id ON public.model_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_dataset_collections_dataset_id ON public.dataset_collections(dataset_id);
CREATE INDEX IF NOT EXISTS idx_dataset_collections_user_id ON public.dataset_collections(user_id);

-- 启用RLS
ALTER TABLE public.model_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_collections ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
CREATE POLICY "用户可以查看自己的模型收藏记录" ON public.model_collections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可以插入自己的模型收藏记录" ON public.model_collections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的模型收藏记录" ON public.model_collections
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "用户可以查看自己的数据集收藏记录" ON public.dataset_collections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可以插入自己的数据集收藏记录" ON public.dataset_collections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的数据集收藏记录" ON public.dataset_collections
  FOR DELETE USING (auth.uid() = user_id);

-- 创建函数：更新模型收藏数
CREATE OR REPLACE FUNCTION public.update_model_collection_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.models 
    SET collection_count = collection_count + 1 
    WHERE id = NEW.model_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.models 
    SET collection_count = GREATEST(collection_count - 1, 0) 
    WHERE id = OLD.model_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：更新数据集收藏数
CREATE OR REPLACE FUNCTION public.update_dataset_collection_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.datasets 
    SET collection_count = collection_count + 1 
    WHERE id = NEW.dataset_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.datasets 
    SET collection_count = GREATEST(collection_count - 1, 0) 
    WHERE id = OLD.dataset_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS update_model_collection_count_trigger ON public.model_collections;
CREATE TRIGGER update_model_collection_count_trigger
AFTER INSERT OR DELETE ON public.model_collections
FOR EACH ROW EXECUTE FUNCTION public.update_model_collection_count();

DROP TRIGGER IF EXISTS update_dataset_collection_count_trigger ON public.dataset_collections;
CREATE TRIGGER update_dataset_collection_count_trigger
AFTER INSERT OR DELETE ON public.dataset_collections
FOR EACH ROW EXECUTE FUNCTION public.update_dataset_collection_count();