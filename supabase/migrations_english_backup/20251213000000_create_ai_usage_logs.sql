CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  feature text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_feature ON ai_usage_logs(user_id, feature);

ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage" 
ON ai_usage_logs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert usage" 
ON ai_usage_logs FOR INSERT 
WITH CHECK (true);
