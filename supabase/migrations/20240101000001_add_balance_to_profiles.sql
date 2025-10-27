-- 为profiles表添加balance字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS balance DECIMAL DEFAULT 0;

-- 添加注释
COMMENT ON COLUMN profiles.balance IS '用户余额，用于付费模型下载';