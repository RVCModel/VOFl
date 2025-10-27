-- 创建充值记录表
CREATE TABLE IF NOT EXISTS recharge_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'creem',
  payment_id VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, completed, failed, cancelled
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建提现记录表
CREATE TABLE IF NOT EXISTS withdrawal_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  withdrawal_method VARCHAR(50) NOT NULL,
  withdrawal_address VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed, cancelled
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建消费记录表
CREATE TABLE IF NOT EXISTS consumption_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  product_type VARCHAR(50) NOT NULL, -- model, dataset, etc.
  product_id UUID,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建用户余额表
CREATE TABLE IF NOT EXISTS user_balances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  frozen_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建函数，自动更新用户余额
CREATE OR REPLACE FUNCTION update_user_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 充值成功，增加余额
    IF TG_TABLE_NAME = 'recharge_records' AND NEW.status = 'completed' THEN
      INSERT INTO user_balances (user_id, balance)
      VALUES (NEW.user_id, NEW.amount)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        balance = user_balances.balance + NEW.amount,
        updated_at = NOW();
    
    -- 消费记录，减少余额
    ELSIF TG_TABLE_NAME = 'consumption_records' THEN
      INSERT INTO user_balances (user_id, balance)
      VALUES (NEW.user_id, -NEW.amount)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        balance = user_balances.balance - NEW.amount,
        updated_at = NOW();
    END IF;
    
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- 充值状态从非完成变为完成，增加余额
    IF TG_TABLE_NAME = 'recharge_records' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
      INSERT INTO user_balances (user_id, balance)
      VALUES (NEW.user_id, NEW.amount)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        balance = user_balances.balance + NEW.amount,
        updated_at = NOW();
    
    -- 充值状态从完成变为非完成，减少余额
    ELSIF TG_TABLE_NAME = 'recharge_records' AND OLD.status = 'completed' AND NEW.status != 'completed' THEN
      INSERT INTO user_balances (user_id, balance)
      VALUES (NEW.user_id, -NEW.amount)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        balance = user_balances.balance - NEW.amount,
        updated_at = NOW();
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER update_balance_on_recharge
AFTER INSERT OR UPDATE ON recharge_records
FOR EACH ROW EXECUTE FUNCTION update_user_balance();

CREATE TRIGGER update_balance_on_consumption
AFTER INSERT ON consumption_records
FOR EACH ROW EXECUTE FUNCTION update_user_balance();

-- 创建函数，当新用户注册时自动创建余额记录
CREATE OR REPLACE FUNCTION create_user_balance()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_balances (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器，当新用户注册时自动创建余额记录
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created_balance'
    ) THEN
        CREATE TRIGGER on_auth_user_created_balance
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.create_user_balance();
    END IF;
END $$;

-- 创建RLS策略
ALTER TABLE recharge_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumption_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_balances ENABLE ROW LEVEL SECURITY;

-- 充值记录表的RLS策略
CREATE POLICY "Users can view own recharge records" ON recharge_records
  FOR SELECT USING (auth.uid() = user_id);

-- 提现记录表的RLS策略
CREATE POLICY "Users can view own withdrawal records" ON withdrawal_records
  FOR SELECT USING (auth.uid() = user_id);

-- 消费记录表的RLS策略
CREATE POLICY "Users can view own consumption records" ON consumption_records
  FOR SELECT USING (auth.uid() = user_id);

-- 用户余额表的RLS策略
CREATE POLICY "Users can view own balance" ON user_balances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own balance" ON user_balances
  FOR UPDATE USING (auth.uid() = user_id);

-- 创建索引提高查询性能
CREATE INDEX IF NOT EXISTS idx_recharge_records_user_id ON recharge_records(user_id);
CREATE INDEX IF NOT EXISTS idx_recharge_records_status ON recharge_records(status);
CREATE INDEX IF NOT EXISTS idx_recharge_records_created_at ON recharge_records(created_at);

CREATE INDEX IF NOT EXISTS idx_withdrawal_records_user_id ON withdrawal_records(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_records_status ON withdrawal_records(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_records_created_at ON withdrawal_records(created_at);

CREATE INDEX IF NOT EXISTS idx_consumption_records_user_id ON consumption_records(user_id);
CREATE INDEX IF NOT EXISTS idx_consumption_records_product_type ON consumption_records(product_type);
CREATE INDEX IF NOT EXISTS idx_consumption_records_created_at ON consumption_records(created_at);

CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON user_balances(user_id);