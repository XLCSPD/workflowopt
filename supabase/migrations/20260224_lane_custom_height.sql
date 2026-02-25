-- Add custom_height column to process_lanes for manual swim lane height adjustment
-- NULL means auto-compute from content; a positive integer is the user's manual override
ALTER TABLE process_lanes ADD COLUMN IF NOT EXISTS custom_height INTEGER DEFAULT NULL;
