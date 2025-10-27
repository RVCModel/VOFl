-- 为profiles表添加balance字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS balance DECIMAL DEFAULT 0;

-- 添加注释
COMMENT ON COLUMN profiles.balance IS '用户余额，用于付费模型下载';

-- 更新deduct_balance函数，确保它能正确处理balance字段
CREATE OR REPLACE FUNCTION deduct_balance(user_id UUID, amount DECIMAL)
RETURNS VOID AS $$
BEGIN
  -- 检查余额是否充足
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND COALESCE(balance, 0) >= amount) THEN
    RAISE EXCEPTION '余额不足';
  END IF;
  
  -- 扣除余额
  UPDATE profiles 
  SET balance = GREATEST(COALESCE(balance, 0) - amount, 0) 
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- 更新handle_new_user函数，确保新用户注册时balance字段初始化为0
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, balance)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器，当新用户注册时自动创建profiles记录并初始化balance为0
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created_profile'
    ) THEN
        CREATE TRIGGER on_auth_user_created_profile
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;