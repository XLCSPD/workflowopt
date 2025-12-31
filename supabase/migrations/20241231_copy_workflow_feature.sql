-- ============================================
-- COPY WORKFLOW FEATURE
-- Adds lineage tracking, process_lanes table, and copy_workflow RPC
-- PRD: PRD_Copy_Workflow_Feature.md
-- ============================================

-- ============================================
-- 0) HELPER FUNCTION FOR updated_at TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1) LINEAGE METADATA COLUMNS ON PROCESSES
-- Tracks copy source for AC-4.1 (Source Tracking)
-- ============================================

ALTER TABLE processes 
ADD COLUMN IF NOT EXISTS copied_from_process_id UUID REFERENCES processes(id) ON DELETE SET NULL;

ALTER TABLE processes 
ADD COLUMN IF NOT EXISTS copied_from_future_state_id UUID REFERENCES future_states(id) ON DELETE SET NULL;

ALTER TABLE processes 
ADD COLUMN IF NOT EXISTS copy_source_type TEXT DEFAULT 'original' CHECK (copy_source_type IN ('original', 'current', 'future_state'));

ALTER TABLE processes 
ADD COLUMN IF NOT EXISTS copied_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE processes 
ADD COLUMN IF NOT EXISTS copied_at TIMESTAMPTZ;

-- Index for lineage queries
CREATE INDEX IF NOT EXISTS idx_processes_copied_from_process_id ON processes(copied_from_process_id) WHERE copied_from_process_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_processes_copied_at ON processes(copied_at) WHERE copied_at IS NOT NULL;

-- ============================================
-- 2) PROCESS_LANES TABLE (Idempotent)
-- Supports AC-3.1 (Structural Duplication) for swimlanes
-- ============================================

CREATE TABLE IF NOT EXISTS process_lanes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    bg_color TEXT,
    border_color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(process_id, name)
);

-- Enable RLS on process_lanes
ALTER TABLE process_lanes ENABLE ROW LEVEL SECURITY;

-- Index for fetching lanes by process
CREATE INDEX IF NOT EXISTS idx_process_lanes_process_id ON process_lanes(process_id);

-- RLS Policies for process_lanes
-- SELECT: Users can view lanes for processes in their org or that they own
DROP POLICY IF EXISTS "Users can view process lanes" ON process_lanes;
CREATE POLICY "Users can view process lanes" ON process_lanes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM processes p
            LEFT JOIN users u ON u.id = auth.uid()
            WHERE p.id = process_lanes.process_id
            AND (
                p.org_id IS NULL
                OR p.org_id = u.org_id
                OR p.created_by = auth.uid()
            )
        )
    );

-- INSERT: Users can create lanes for processes they can edit
DROP POLICY IF EXISTS "Users can insert process lanes" ON process_lanes;
CREATE POLICY "Users can insert process lanes" ON process_lanes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM processes p
            WHERE p.id = process_lanes.process_id
            AND (
                p.created_by = auth.uid()
                OR get_user_role() IN ('admin', 'facilitator')
            )
        )
    );

-- UPDATE: Users can update lanes for processes they can edit
DROP POLICY IF EXISTS "Users can update process lanes" ON process_lanes;
CREATE POLICY "Users can update process lanes" ON process_lanes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM processes p
            WHERE p.id = process_lanes.process_id
            AND (
                p.created_by = auth.uid()
                OR get_user_role() IN ('admin', 'facilitator')
            )
        )
    );

-- DELETE: Users can delete lanes for processes they can edit
DROP POLICY IF EXISTS "Users can delete process lanes" ON process_lanes;
CREATE POLICY "Users can delete process lanes" ON process_lanes
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM processes p
            WHERE p.id = process_lanes.process_id
            AND (
                p.created_by = auth.uid()
                OR get_user_role() IN ('admin', 'facilitator')
            )
        )
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_process_lanes_updated_at ON process_lanes;
CREATE TRIGGER update_process_lanes_updated_at
    BEFORE UPDATE ON process_lanes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3) COPY_WORKFLOW RPC FUNCTION
-- Implements AC-3.1/3.2/3.3, AC-4.1, AC-1.3
-- SECURITY DEFINER to bypass RLS during copy
-- ============================================

CREATE OR REPLACE FUNCTION copy_workflow(
    p_source_process_id UUID,
    p_new_name TEXT,
    p_source_type TEXT DEFAULT 'current',
    p_future_state_id UUID DEFAULT NULL,
    p_options JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_process_id UUID;
    v_user_id UUID := auth.uid();
    v_source processes%ROWTYPE;
    v_user_org_id UUID;
    v_step_id_map JSONB := '{}'::jsonb;
    v_old_step_id UUID;
    v_new_step_id UUID;
    v_step RECORD;
    v_edge RECORD;
    v_lane RECORD;
    v_order_idx INTEGER := 0;
    v_lane_color_map JSONB := '{
        "blue": {"bg": "#dbeafe", "border": "#3b82f6"},
        "emerald": {"bg": "#d1fae5", "border": "#10b981"},
        "amber": {"bg": "#fef3c7", "border": "#f59e0b"},
        "purple": {"bg": "#ede9fe", "border": "#8b5cf6"},
        "rose": {"bg": "#ffe4e6", "border": "#f43f5e"},
        "slate": {"bg": "#f1f5f9", "border": "#64748b"},
        "cyan": {"bg": "#cffafe", "border": "#06b6d4"},
        "orange": {"bg": "#fed7aa", "border": "#f97316"}
    }'::jsonb;
BEGIN
    -- Validate authentication
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get user's org_id
    SELECT org_id INTO v_user_org_id FROM users WHERE id = v_user_id;

    -- Fetch source process
    SELECT * INTO v_source FROM processes WHERE id = p_source_process_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Source workflow not found';
    END IF;

    -- Permission check: Users can copy any workflow they can VIEW (same org or no org)
    -- This allows broader copying while maintaining org-level isolation
    IF v_source.org_id IS NOT NULL AND v_source.org_id != v_user_org_id THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    -- Validate source_type
    IF p_source_type NOT IN ('current', 'future_state') THEN
        RAISE EXCEPTION 'Invalid source type: must be "current" or "future_state"';
    END IF;

    -- If future_state, validate the future_state_id exists and belongs to source process
    IF p_source_type = 'future_state' THEN
        IF p_future_state_id IS NULL THEN
            RAISE EXCEPTION 'future_state_id is required when source_type is "future_state"';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM future_states WHERE id = p_future_state_id AND process_id = p_source_process_id) THEN
            RAISE EXCEPTION 'Future state not found or does not belong to source workflow';
        END IF;
    END IF;

    -- Create new process with lineage metadata (AC-4.1)
    INSERT INTO processes(
        id, 
        org_id, 
        name, 
        description, 
        created_by,
        copied_from_process_id, 
        copied_from_future_state_id, 
        copy_source_type,
        copied_by, 
        copied_at
    )
    VALUES (
        gen_random_uuid(), 
        v_source.org_id, 
        p_new_name, 
        v_source.description, 
        v_user_id,
        p_source_process_id,
        CASE WHEN p_source_type = 'future_state' THEN p_future_state_id ELSE NULL END,
        p_source_type,
        v_user_id, 
        NOW()
    )
    RETURNING id INTO v_new_process_id;

    -- ============================================
    -- COPY FROM CURRENT STATE
    -- ============================================
    IF p_source_type = 'current' THEN
        -- Copy lanes from process_lanes (if any exist)
        FOR v_lane IN 
            SELECT * FROM process_lanes 
            WHERE process_id = p_source_process_id 
            ORDER BY order_index
        LOOP
            INSERT INTO process_lanes(process_id, name, order_index, bg_color, border_color)
            VALUES (v_new_process_id, v_lane.name, v_lane.order_index, v_lane.bg_color, v_lane.border_color);
        END LOOP;

        -- Copy steps with new IDs (AC-3.3)
        FOR v_step IN 
            SELECT * FROM process_steps 
            WHERE process_id = p_source_process_id 
            ORDER BY order_index
        LOOP
            v_new_step_id := gen_random_uuid();
            v_step_id_map := v_step_id_map || jsonb_build_object(v_step.id::text, v_new_step_id::text);
            
            INSERT INTO process_steps(
                id,
                process_id,
                step_name,
                description,
                lane,
                step_type,
                order_index,
                lead_time_minutes,
                cycle_time_minutes,
                position_x,
                position_y
            )
            VALUES (
                v_new_step_id,
                v_new_process_id,
                v_step.step_name,
                v_step.description,
                v_step.lane,
                v_step.step_type,
                v_step.order_index,
                v_step.lead_time_minutes,
                v_step.cycle_time_minutes,
                v_step.position_x,
                v_step.position_y
            );
        END LOOP;

        -- Copy connections with mapped step IDs
        FOR v_edge IN 
            SELECT * FROM step_connections 
            WHERE process_id = p_source_process_id
        LOOP
            INSERT INTO step_connections(
                process_id,
                source_step_id,
                target_step_id,
                label
            )
            VALUES (
                v_new_process_id,
                (v_step_id_map->>v_edge.source_step_id::text)::uuid,
                (v_step_id_map->>v_edge.target_step_id::text)::uuid,
                v_edge.label
            );
        END LOOP;

    -- ============================================
    -- COPY FROM FUTURE STATE
    -- ============================================
    ELSE
        -- Copy lanes from future_state_lanes
        FOR v_lane IN 
            SELECT * FROM future_state_lanes 
            WHERE future_state_id = p_future_state_id 
            ORDER BY order_index
        LOOP
            INSERT INTO process_lanes(process_id, name, order_index, bg_color, border_color)
            VALUES (
                v_new_process_id, 
                v_lane.name, 
                v_lane.order_index, 
                COALESCE(v_lane_color_map->v_lane.color->>'bg', '#f1f5f9'),
                COALESCE(v_lane_color_map->v_lane.color->>'border', '#64748b')
            );
        END LOOP;

        -- Copy nodes as steps with new IDs
        v_order_idx := 0;
        FOR v_step IN 
            SELECT * FROM future_state_nodes 
            WHERE future_state_id = p_future_state_id 
            ORDER BY position_x, position_y, created_at
        LOOP
            v_new_step_id := gen_random_uuid();
            v_step_id_map := v_step_id_map || jsonb_build_object(v_step.id::text, v_new_step_id::text);
            
            INSERT INTO process_steps(
                id,
                process_id,
                step_name,
                description,
                lane,
                step_type,
                order_index,
                lead_time_minutes,
                cycle_time_minutes,
                position_x,
                position_y
            )
            VALUES (
                v_new_step_id,
                v_new_process_id,
                v_step.name,
                v_step.description,
                v_step.lane,
                v_step.step_type,
                v_order_idx,
                v_step.lead_time_minutes,
                v_step.cycle_time_minutes,
                v_step.position_x,
                v_step.position_y
            );
            
            v_order_idx := v_order_idx + 1;
        END LOOP;

        -- Copy edges as connections with mapped IDs
        FOR v_edge IN 
            SELECT * FROM future_state_edges 
            WHERE future_state_id = p_future_state_id
        LOOP
            INSERT INTO step_connections(
                process_id,
                source_step_id,
                target_step_id,
                label
            )
            VALUES (
                v_new_process_id,
                (v_step_id_map->>v_edge.source_node_id::text)::uuid,
                (v_step_id_map->>v_edge.target_node_id::text)::uuid,
                v_edge.label
            );
        END LOOP;
    END IF;

    -- Note: Sessions and observations are NOT copied (AC-3.2 Data Isolation)

    RETURN v_new_process_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION copy_workflow TO authenticated;

-- ============================================
-- 4) HELPER FUNCTION: Get future states for a workflow
-- Used by the copy modal to populate source selection (AC-2.3)
-- ============================================

CREATE OR REPLACE FUNCTION get_workflow_future_states(p_process_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    version INTEGER,
    status future_state_status,
    created_at TIMESTAMPTZ,
    node_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fs.id,
        fs.name,
        fs.version,
        fs.status,
        fs.created_at,
        (SELECT COUNT(*) FROM future_state_nodes WHERE future_state_id = fs.id) as node_count
    FROM future_states fs
    WHERE fs.process_id = p_process_id
    ORDER BY fs.version DESC, fs.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_workflow_future_states TO authenticated;

