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