/*
  # Add April 1, 2026 Pricing for Gemini 2.5 Flash

  1. Changes
    - Inserts new pricing row for gemini-2.5-flash effective April 1, 2026
    - New rates reflect 50% price reduction:
      - Prompt: $0.075 per million tokens (down from $0.15)
      - Candidates: $0.30 per million tokens (down from $0.60)
      - Thinking: $0.30 per million tokens (down from $0.60)
  
  2. Notes
    - Uses IF NOT EXISTS pattern to prevent duplicate insertions
    - Preserves existing pricing history
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM api_pricing 
    WHERE model = 'gemini-2.5-flash' 
    AND effective_from = '2026-04-01 00:00:00+00'
  ) THEN
    INSERT INTO api_pricing (
      model,
      prompt_cost_per_million,
      candidates_cost_per_million,
      thinking_cost_per_million,
      effective_from
    ) VALUES (
      'gemini-2.5-flash',
      0.075,
      0.30,
      0.30,
      '2026-04-01 00:00:00+00'
    );
  END IF;
END $$;
