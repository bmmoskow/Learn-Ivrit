/*
  # Add function to activate ad config

  1. New Functions
    - `activate_ad_config(config_id uuid)` - Atomically deactivates all configs and activates the specified one
    
  2. Changes
    - Ensures only one config is active at a time
    - Handles the activation process in a single transaction
    
  3. Security
    - Function executes with caller's permissions (SECURITY INVOKER)
    - Respects existing RLS policies on ad_config table
*/

-- Function to activate a specific ad config (deactivating all others)
CREATE OR REPLACE FUNCTION activate_ad_config(config_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  -- Deactivate all configs
  UPDATE ad_config SET is_active = false WHERE is_active = true;
  
  -- Activate the specified config
  UPDATE ad_config SET is_active = true WHERE id = config_id;
END;
$$;

-- Function to insert a new config and make it active
CREATE OR REPLACE FUNCTION insert_active_ad_config(config_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  new_id uuid;
  new_version integer;
BEGIN
  -- Get the next version number
  SELECT COALESCE(MAX(version), 0) + 1 INTO new_version FROM ad_config;
  
  -- Deactivate all existing configs
  UPDATE ad_config SET is_active = false WHERE is_active = true;
  
  -- Insert new config as active
  INSERT INTO ad_config (config, version, is_active)
  VALUES (config_data, new_version, true)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;
