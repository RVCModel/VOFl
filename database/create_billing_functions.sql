-- 创建充值完成函数
CREATE OR REPLACE FUNCTION complete_recharge(
  p_recharge_id UUID,
  p_user_id UUID,
  p_amount NUMERIC
)
RETURNS VOID AS $$
BEGIN
  -- 更新充值记录状态为已完成
  UPDATE recharge_records
  SET status = 'completed',
      updated_at = NOW()
  WHERE id = p_recharge_id;

  -- 更新用户余额
  UPDATE profiles
  SET credits = credits + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 创建提现完成函数
CREATE OR REPLACE FUNCTION complete_withdrawal(
  p_withdrawal_id UUID,
  p_user_id UUID,
  p_amount NUMERIC
)
RETURNS VOID AS $$
BEGIN
  -- 更新提现记录状态为已完成
  UPDATE withdrawal_records
  SET status = 'completed',
      updated_at = NOW()
  WHERE id = p_withdrawal_id;

  -- 更新用户余额
  UPDATE profiles
  SET credits = credits - p_amount,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 创建消费记录函数
CREATE OR REPLACE FUNCTION create_consumption(
  p_user_id UUID,
  p_amount NUMERIC,
  p_product_type VARCHAR,
  p_product_id UUID,
  p_description TEXT
)
RETURNS VOID AS $$
BEGIN
  -- 创建消费记录
  INSERT INTO consumption_records (
    user_id, 
    amount, 
    product_type, 
    product_id, 
    description
  )
  VALUES (
    p_user_id,
    p_amount,
    p_product_type,
    p_product_id,
    p_description
  );

  -- 更新用户余额
  UPDATE profiles
  SET credits = credits - p_amount,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;