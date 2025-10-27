-- 修复数据集表中的计数字段，确保它们不为空
-- 执行时间: 2024-01-01

-- 1. 更新所有现有的NULL值为0
UPDATE public.datasets 
SET download_count = 0 
WHERE download_count IS NULL;

UPDATE public.datasets 
SET view_count = 0 
WHERE view_count IS NULL;

UPDATE public.datasets 
SET like_count = 0 
WHERE like_count IS NULL;

UPDATE public.datasets 
SET collection_count = 0 
WHERE collection_count IS NULL;

-- 2. 修改列定义，设置NOT NULL约束
ALTER TABLE public.datasets 
ALTER COLUMN download_count SET NOT NULL;

ALTER TABLE public.datasets 
ALTER COLUMN view_count SET NOT NULL;

ALTER TABLE public.datasets 
ALTER COLUMN like_count SET NOT NULL;

ALTER TABLE public.datasets 
ALTER COLUMN collection_count SET NOT NULL;

-- 3. 确保默认值为0
ALTER TABLE public.datasets 
ALTER COLUMN download_count SET DEFAULT 0;

ALTER TABLE public.datasets 
ALTER COLUMN view_count SET DEFAULT 0;

ALTER TABLE public.datasets 
ALTER COLUMN like_count SET DEFAULT 0;

ALTER TABLE public.datasets 
ALTER COLUMN collection_count SET DEFAULT 0;