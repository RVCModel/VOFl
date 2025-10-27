-- 创建一个函数来增加模型的下载次数
CREATE OR REPLACE FUNCTION increment_model_download_count(model_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE models 
  SET download_count = download_count + 1 
  WHERE id = model_id;
END;
$$ LANGUAGE plpgsql;