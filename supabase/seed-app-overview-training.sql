-- =====================================================
-- App Overview Training Modules Seed
-- =====================================================
-- This script creates two new training modules:
-- 1. ProcessOpt App Overview (Video) - Introduction video
-- 2. ProcessOpt App Overview (Guided Walkthrough) - PDF-based slides with lab
--
-- Prerequisites:
-- 1. Upload the following files to Supabase Storage:
--    - training-videos/Process_Optimization_Guide.mp4
--    - training-docs/Process_Optimization_Tool_User_Guide.pdf
--    - training-docs/ProcessOpt_Operational_Excellence_Guide.pdf
--
-- Run this script after uploading the assets.
-- =====================================================

-- Get the max order_index to insert at the beginning
DO $$
DECLARE
  max_order INTEGER;
  storage_base TEXT := 'https://rnmgqwsujxqvsdlfdscw.supabase.co/storage/v1/object/public';
BEGIN
  -- Find current max order to insert at position 1 and 2
  SELECT COALESCE(MAX(order_index), 0) INTO max_order FROM training_content;
  
  -- Shift existing content down to make room at the top
  UPDATE training_content SET order_index = order_index + 2 WHERE order_index >= 1;
  
  -- Insert Video Module (order_index = 1)
  INSERT INTO training_content (
    title,
    description,
    type,
    duration_minutes,
    order_index,
    content
  ) VALUES (
    'ProcessOpt App Overview (Video)',
    'A quick video introduction to the Process Optimization Tool. Learn what the app does, the end-to-end workflow, and what you''ll produce by the end of your journey.',
    'video',
    5,
    1,
    jsonb_build_object(
      'videoUrl', storage_base || '/training-videos/Process_Optimization_Guide.mp4',
      'transcript', 'This video provides an overview of the Process Optimization Tool. You''ll learn about the methodology: Training, Workflows, Sessions, Future State Studio, and Export/Analytics. By the end, you''ll understand how to capture observations, run AI synthesis, and produce actionable improvement roadmaps.'
    )
  )
  ON CONFLICT DO NOTHING;
  
  -- Insert PDF Slides Module with Lab (order_index = 2)
  INSERT INTO training_content (
    title,
    description,
    type,
    duration_minutes,
    order_index,
    content
  ) VALUES (
    'ProcessOpt App Overview (Guided Walkthrough)',
    'A guided walkthrough of the app with hands-on lab exercises. Build a demo workflow, conduct a mini waste walk, and run your first AI synthesis.',
    'slides',
    20,
    2,
    jsonb_build_object(
      'deckType', 'pdf',
      'pdfUrls', jsonb_build_array(
        storage_base || '/training-docs/Process_Optimization_Tool_User_Guide.pdf',
        storage_base || '/training-docs/ProcessOpt_Operational_Excellence_Guide.pdf'
      ),
      'title', 'App Overview: From Workflow to Future State',
      'lab', jsonb_build_object(
        'workflowName', 'Demo: Request to Fulfillment',
        'swimlanes', jsonb_build_array('Requester', 'Operations', 'Approver'),
        'steps', jsonb_build_array(
          'Submit Request',
          'Validate Request Completeness',
          'Clarify Missing Info',
          'Log / Route Request',
          'Review for Policy/Thresholds',
          'Approve / Reject',
          'Notify Requester',
          'Fulfill Request',
          'Confirm Completion',
          'Close Request'
        ),
        'observations', jsonb_build_array(
          jsonb_build_object(
            'stepHint', 'Review for Policy/Thresholds',
            'wasteHint', 'Waiting/Delays',
            'priorityHint', 'high',
            'text', 'Approvals sit in queue 2–3 days; no SLA or routing by threshold.'
          ),
          jsonb_build_object(
            'stepHint', 'Validate Request Completeness',
            'wasteHint', 'Defects/Rework',
            'priorityHint', 'high',
            'text', '~40% of requests missing required fields; Ops sends multiple follow-ups.'
          ),
          jsonb_build_object(
            'stepHint', 'Log / Route Request',
            'wasteHint', 'Overprocessing/Handoffs',
            'priorityHint', 'medium',
            'text', 'Same request details re-entered into two trackers; causes mismatches.'
          )
        ),
        'deepLinks', jsonb_build_array(
          jsonb_build_object('label', 'Create Workflow', 'href', '/workflows'),
          jsonb_build_object('label', 'Start Session', 'href', '/sessions'),
          jsonb_build_object('label', 'Future State Studio', 'href', '/future-state')
        )
      )
    )
  )
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'App Overview training modules created successfully!';
END $$;

-- Verify the insertions
SELECT id, title, type, order_index, duration_minutes 
FROM training_content 
ORDER BY order_index 
LIMIT 10;

