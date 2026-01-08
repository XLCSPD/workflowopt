-- ============================================
-- STEP ATTACHMENTS - Database Migration
-- ============================================
-- Adds file attachment support for process steps:
-- - Store attachment metadata in database
-- - Files stored in Supabase Storage (step-attachments bucket)
-- - Support for images, documents, and other files

-- ============================================
-- 1) STEP ATTACHMENTS TABLE
-- ============================================
-- Tracks file attachments linked to process steps

CREATE TABLE step_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Link to step (current state) or node (future state)
    step_id UUID REFERENCES process_steps(id) ON DELETE CASCADE,
    node_id UUID REFERENCES future_state_nodes(id) ON DELETE CASCADE,

    -- File metadata
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_path TEXT NOT NULL,  -- Path in Supabase Storage
    file_size INTEGER NOT NULL,
    mime_type TEXT,

    -- Optional description
    description TEXT,

    -- Categorization
    category TEXT CHECK (category IN ('documentation', 'screenshot', 'diagram', 'template', 'reference', 'other')) DEFAULT 'other',

    -- Audit fields
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- At least one context must be set
    CONSTRAINT valid_attachment_context CHECK (
        (step_id IS NOT NULL AND node_id IS NULL)
        OR (node_id IS NOT NULL AND step_id IS NULL)
    )
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_step_attachments_step ON step_attachments(step_id);
CREATE INDEX idx_step_attachments_node ON step_attachments(node_id);
CREATE INDEX idx_step_attachments_category ON step_attachments(category);
CREATE INDEX idx_step_attachments_uploaded_by ON step_attachments(uploaded_by);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE step_attachments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- View attachments - anyone can view attachments for accessible steps
CREATE POLICY "View step attachments" ON step_attachments
    FOR SELECT USING (
        -- Current state steps
        (step_id IS NOT NULL AND step_id IN (
            SELECT ps.id FROM process_steps ps
            JOIN processes p ON p.id = ps.process_id
            WHERE p.org_id IS NULL OR p.org_id = get_user_org_id()
        ))
        OR
        -- Future state nodes
        (node_id IS NOT NULL AND node_id IN (
            SELECT fsn.id FROM future_state_nodes fsn
            JOIN future_states fs ON fs.id = fsn.future_state_id
            JOIN sessions s ON s.id = fs.session_id
            WHERE s.facilitator_id = auth.uid()
            OR s.id IN (SELECT session_id FROM session_participants WHERE user_id = auth.uid())
            OR s.process_id IN (SELECT id FROM processes WHERE org_id IS NULL OR org_id = get_user_org_id())
        ))
    );

-- Create attachments - authenticated users
CREATE POLICY "Create step attachments" ON step_attachments
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Update attachments - creator or admin/facilitator
CREATE POLICY "Update step attachments" ON step_attachments
    FOR UPDATE USING (
        uploaded_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator')
    );

-- Delete attachments - creator or admin/facilitator
CREATE POLICY "Delete step attachments" ON step_attachments
    FOR DELETE USING (
        uploaded_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator')
    );

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamp trigger
CREATE TRIGGER update_step_attachments_updated_at
    BEFORE UPDATE ON step_attachments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE step_attachments IS 'File attachments linked to process steps or future state nodes';
COMMENT ON COLUMN step_attachments.file_path IS 'Path to file in Supabase Storage step-attachments bucket';
COMMENT ON COLUMN step_attachments.category IS 'Type of attachment: documentation, screenshot, diagram, template, reference, or other';

-- ============================================
-- STORAGE BUCKET SETUP
-- ============================================
-- Create the step-attachments bucket if it doesn't exist

INSERT INTO storage.buckets (id, name, public)
VALUES ('step-attachments', 'step-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for step-attachments bucket

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload step attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'step-attachments');

-- Allow public read access (for viewing/downloading)
CREATE POLICY "Public read access for step attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'step-attachments');

-- Allow users to update their own uploads
CREATE POLICY "Users can update own step attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'step-attachments' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'step-attachments');

-- Allow users to delete their own uploads or admins/facilitators
CREATE POLICY "Users can delete step attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'step-attachments');
