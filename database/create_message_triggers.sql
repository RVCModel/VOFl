-- 创建点赞消息函数
CREATE OR REPLACE FUNCTION public.create_like_message()
RETURNS TRIGGER AS $$
BEGIN
  -- 检查是否是自己点赞自己，如果是则不创建消息
  IF NEW.user_id = NEW.target_user_id THEN
    RETURN NEW;
  END IF;
  
  -- 检查是否已经点赞过，避免重复创建消息
  IF EXISTS (
    SELECT 1 FROM likes 
    WHERE user_id = NEW.user_id AND target_user_id = NEW.target_user_id AND item_id = NEW.item_id
    LIMIT 1
  ) THEN
    -- 如果是取消点赞，则不创建消息
    IF NOT NEW.is_active THEN
      RETURN NEW;
    END IF;
    
    -- 如果是新的点赞记录，创建消息
    INSERT INTO public.messages (user_id, type, title, content, related_user_id, related_item_type, related_item_id)
    VALUES (
      NEW.target_user_id,
      'like',
      '您收到了新的赞',
      '用户点赞了您的作品',
      NEW.user_id,
      NEW.item_type,
      NEW.item_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建点赞触发器
-- 检查触发器是否已存在，避免重复创建
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_like_created_message'
    ) THEN
        CREATE TRIGGER on_like_created_message
        AFTER INSERT ON likes
        FOR EACH ROW EXECUTE FUNCTION public.create_like_message();
    END IF;
END $$;

-- 创建评论消息函数
CREATE OR REPLACE FUNCTION public.create_reply_message()
RETURNS TRIGGER AS $$
BEGIN
  -- 检查是否是自己评论自己，如果是则不创建消息
  IF NEW.user_id = NEW.target_user_id THEN
    RETURN NEW;
  END IF;
  
  -- 创建评论消息
  INSERT INTO public.messages (user_id, type, title, content, related_user_id, related_item_type, related_item_id)
  VALUES (
    NEW.target_user_id,
    'reply',
    '您收到了新的评论',
    '用户评论了您的作品',
    NEW.user_id,
    NEW.item_type,
    NEW.item_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建评论触发器
-- 检查触发器是否已存在，避免重复创建
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_reply_created_message'
    ) THEN
        CREATE TRIGGER on_reply_created_message
        AFTER INSERT ON replies
        FOR EACH ROW EXECUTE FUNCTION public.create_reply_message();
    END IF;
END $$;

-- 创建活动消息函数
CREATE OR REPLACE FUNCTION public.create_activity_message()
RETURNS TRIGGER AS $$
BEGIN
  -- 创建活动消息（当用户发布新作品时）
  INSERT INTO public.messages (user_id, type, title, content, related_user_id, related_item_type, related_item_id)
  VALUES (
    NEW.user_id,
    'activity',
    '您的作品发布成功',
    '您的作品已成功发布，其他用户现在可以看到您的作品了',
    NEW.user_id,
    'work',
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建活动触发器
-- 检查触发器是否已存在，避免重复创建
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_activity_created_message'
    ) THEN
        CREATE TRIGGER on_activity_created_message
        AFTER INSERT ON works
        FOR EACH ROW EXECUTE FUNCTION public.create_activity_message();
    END IF;
END $$;