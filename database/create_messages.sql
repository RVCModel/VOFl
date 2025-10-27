-- 创建消息表
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('system', 'activity', 'reply', 'like', 'follow')),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  related_user_id UUID REFERENCES auth.users(id), -- 相关用户ID（如点赞者、关注者等）
  related_item_type VARCHAR(50), -- 相关项目类型（如 'post', 'comment' 等）
  related_item_id UUID, -- 相关项目ID
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- 创建函数，当新用户注册时自动创建欢迎系统消息
CREATE OR REPLACE FUNCTION public.create_welcome_message()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.messages (user_id, type, title, content)
  VALUES (
    NEW.id,
    'system',
    '欢迎加入平台',
    '欢迎您加入我们的平台！在这里您可以分享您的创意作品，与其他用户互动交流。'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器，当新用户注册时自动创建欢迎消息
-- 检查触发器是否已存在，避免重复创建
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created_welcome'
    ) THEN
        CREATE TRIGGER on_auth_user_created_welcome
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.create_welcome_message();
    END IF;
END $$;

-- 创建函数，当用户被关注时创建关注消息
CREATE OR REPLACE FUNCTION public.create_follow_message()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.messages (user_id, type, title, content, related_user_id)
  VALUES (
    NEW.following_id,
    'follow',
    '您有新的关注者',
    '用户关注了您',
    NEW.follower_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器，当用户被关注时自动创建关注消息
-- 检查触发器是否已存在，避免重复创建
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_follow_created_message'
    ) THEN
        CREATE TRIGGER on_follow_created_message
        AFTER INSERT ON follows
        FOR EACH ROW EXECUTE FUNCTION public.create_follow_message();
    END IF;
END $$;

-- 创建RLS策略
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Messages表的RLS策略
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages" ON messages
  FOR DELETE USING (auth.uid() = user_id);

-- 创建函数，获取用户未读消息数量
CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM messages
    WHERE user_id = p_user_id AND is_read = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建函数，标记所有消息为已读
CREATE OR REPLACE FUNCTION mark_all_messages_read(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  UPDATE messages
  SET is_read = TRUE, updated_at = NOW()
  WHERE user_id = p_user_id AND is_read = FALSE;
  
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM messages
    WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建函数，标记单条消息为已读
CREATE OR REPLACE FUNCTION mark_message_read(p_message_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE messages
  SET is_read = TRUE, updated_at = NOW()
  WHERE id = p_message_id AND user_id = p_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;