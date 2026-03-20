ALTER TABLE api_usage_logs RENAME COLUMN input_tokens_estimate TO prompt_tokens;
ALTER TABLE api_usage_logs RENAME COLUMN output_tokens_estimate TO candidates_tokens;