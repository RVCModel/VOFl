-- 增加模型浏览次数
CREATE OR REPLACE FUNCTION increment_view_count(model_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE models 
  SET view_count = COALESCE(view_count, 0) + 1 
  WHERE id = model_id;
END;
$$ LANGUAGE plpgsql;

-- 增加用户粉丝数
CREATE OR REPLACE FUNCTION increment_followers_count(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET followers_count = COALESCE(followers_count, 0) + 1 
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- 减少用户粉丝数
CREATE OR REPLACE FUNCTION decrement_followers_count(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET followers_count = GREATEST(COALESCE(followers_count, 0) - 1, 0) 
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- 扣除用户余额
CREATE OR REPLACE FUNCTION deduct_balance(user_id UUID, amount DECIMAL)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET balance = GREATEST(COALESCE(balance, 0) - amount, 0) 
  WHERE id = user_id AND COALESCE(balance, 0) >= amount;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION '余额不足';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 创建下载记录表（如果不存在）
CREATE TABLE IF NOT EXISTS downloads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  model_id UUID REFERENCES models(id) ON DELETE CASCADE,
  price DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建关注表（如果不存在）
CREATE TABLE IF NOT EXISTS follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_downloads_user_id ON downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_model_id ON downloads(model_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);