-- ============================================
-- DESIGN STUDIO ENHANCEMENTS
-- Adds annotations, lanes, and versioning support
-- ============================================

-- ============================================
-- 1) ANNOTATION TYPE ENUM
-- ============================================

CREATE TYPE annotation_type AS ENUM ('note', 'guardrail', 'assumption', 'risk', 'instruction');

-- ============================================
-- 2) ANNOTATIONS TABLE
-- Floating or attached to nodes
-- ============================================

CREATE TABLE future_state_annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    future_state_id UUID NOT NULL REFERENCES future_states(id) ON DELETE CASCADE,
    node_id UUID REFERENCES future_state_nodes(id) ON DELETE CASCADE,
    type annotation_type NOT NULL DEFAULT 'note',
    title TEXT NOT NULL,
    content TEXT,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    resolved BOOLEAN DEFAULT false,
    position_x REAL,
    position_y REAL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fetching annotations by future state
CREATE INDEX idx_annotations_future_state ON future_state_annotations(future_state_id);

-- Index for fetching annotations attached to a node
CREATE INDEX idx_annotations_node ON future_state_annotations(node_id) WHERE node_id IS NOT NULL;

-- ============================================
-- 3) LANES TABLE
-- Explicit lane management with ordering and styling
-- ============================================

CREATE TABLE future_state_lanes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    future_state_id UUID NOT NULL REFERENCES future_states(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    color TEXT DEFAULT 'blue' CHECK (color IN ('blue', 'emerald', 'amber', 'purple', 'rose', 'slate', 'cyan', 'orange')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(future_state_id, name)
);

-- Index for fetching lanes by future state
CREATE INDEX idx_lanes_future_state ON future_state_lanes(future_state_id);

-- ============================================
-- 4) FUTURE STATES TABLE ENHANCEMENTS
-- Add versioning support columns
-- ============================================

-- Add description for version notes
ALTER TABLE future_states ADD COLUMN IF NOT EXISTS description TEXT;

-- Add parent version reference for version lineage
ALTER TABLE future_states ADD COLUMN IF NOT EXISTS parent_version_id UUID REFERENCES future_states(id) ON DELETE SET NULL;

-- Add lock flag to prevent edits on published versions
ALTER TABLE future_states ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;

-- Index for version lineage queries
CREATE INDEX idx_future_states_parent ON future_states(parent_version_id) WHERE parent_version_id IS NOT NULL;

-- ============================================
-- 5) ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE future_state_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE future_state_lanes ENABLE ROW LEVEL SECURITY;

-- Annotations policies (same org access)
CREATE POLICY "Users can view annotations in their org sessions"
ON future_state_annotations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM future_states fs
        JOIN sessions s ON fs.session_id = s.id
        JOIN processes p ON s.process_id = p.id
        JOIN users u ON p.org_id = u.org_id
        WHERE fs.id = future_state_annotations.future_state_id
        AND u.id = auth.uid()
    )
);

CREATE POLICY "Users can insert annotations in their org sessions"
ON future_state_annotations FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM future_states fs
        JOIN sessions s ON fs.session_id = s.id
        JOIN processes p ON s.process_id = p.id
        JOIN users u ON p.org_id = u.org_id
        WHERE fs.id = future_state_annotations.future_state_id
        AND u.id = auth.uid()
    )
);

CREATE POLICY "Users can update annotations in their org sessions"
ON future_state_annotations FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM future_states fs
        JOIN sessions s ON fs.session_id = s.id
        JOIN processes p ON s.process_id = p.id
        JOIN users u ON p.org_id = u.org_id
        WHERE fs.id = future_state_annotations.future_state_id
        AND u.id = auth.uid()
    )
);

CREATE POLICY "Users can delete annotations in their org sessions"
ON future_state_annotations FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM future_states fs
        JOIN sessions s ON fs.session_id = s.id
        JOIN processes p ON s.process_id = p.id
        JOIN users u ON p.org_id = u.org_id
        WHERE fs.id = future_state_annotations.future_state_id
        AND u.id = auth.uid()
    )
);

-- Lanes policies (same org access)
CREATE POLICY "Users can view lanes in their org sessions"
ON future_state_lanes FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM future_states fs
        JOIN sessions s ON fs.session_id = s.id
        JOIN processes p ON s.process_id = p.id
        JOIN users u ON p.org_id = u.org_id
        WHERE fs.id = future_state_lanes.future_state_id
        AND u.id = auth.uid()
    )
);

CREATE POLICY "Users can insert lanes in their org sessions"
ON future_state_lanes FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM future_states fs
        JOIN sessions s ON fs.session_id = s.id
        JOIN processes p ON s.process_id = p.id
        JOIN users u ON p.org_id = u.org_id
        WHERE fs.id = future_state_lanes.future_state_id
        AND u.id = auth.uid()
    )
);

CREATE POLICY "Users can update lanes in their org sessions"
ON future_state_lanes FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM future_states fs
        JOIN sessions s ON fs.session_id = s.id
        JOIN processes p ON s.process_id = p.id
        JOIN users u ON p.org_id = u.org_id
        WHERE fs.id = future_state_lanes.future_state_id
        AND u.id = auth.uid()
    )
);

CREATE POLICY "Users can delete lanes in their org sessions"
ON future_state_lanes FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM future_states fs
        JOIN sessions s ON fs.session_id = s.id
        JOIN processes p ON s.process_id = p.id
        JOIN users u ON p.org_id = u.org_id
        WHERE fs.id = future_state_lanes.future_state_id
        AND u.id = auth.uid()
    )
);

-- ============================================
-- 6) UPDATE TRIGGERS
-- ============================================

-- Annotation updated_at trigger
CREATE TRIGGER update_annotations_updated_at
    BEFORE UPDATE ON future_state_annotations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Lanes updated_at trigger
CREATE TRIGGER update_lanes_updated_at
    BEFORE UPDATE ON future_state_lanes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

