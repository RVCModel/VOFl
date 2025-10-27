-- 创建一个数据库函数来完成充值操作
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

  -- 更新用户余额表
  INSERT INTO user_balances (user_id, balance)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    balance = user_balances.balance + p_amount,
    updated_at = NOW();

  -- 更新用户配置文件的积分字段
  UPDATE profiles
  SET credits = credits + CAST(p_amount AS INTEGER),
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;