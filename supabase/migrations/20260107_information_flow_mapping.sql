-- ============================================
-- INFORMATION FLOW MAPPING - Database Migration
-- ============================================
-- Adds tables for tracking information flows:
-- - Information flows as first-class entities
-- - SIPOC-style inputs/outputs per step
-- - Waste tagging on flows
-- - Quality/reliability scoring
-- - Current state and future state support

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE flow_type AS ENUM (
    'data',
    'document',
    'approval',
    'system',
    'notification'
);

CREATE TYPE flow_state_type AS ENUM (
    'current',
    'future'
);

CREATE TYPE flow_status AS ENUM (
    'active',
    'deprecated',
    'proposed'
);

-- ============================================
-- 1) INFORMATION FLOWS (Core Entity)
-- ============================================
-- First-class entity representing a flow of information
-- between two steps (or external sources/destinations)

CREATE TABLE information_flows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Context: belongs to workflow (current) OR future_state (future)
    process_id UUID REFERENCES processes(id) ON DELETE CASCADE,
    future_state_id UUID REFERENCES future_states(id) ON DELETE CASCADE,
    state_type flow_state_type NOT NULL DEFAULT 'current',

    -- Flow endpoints (step IDs or node IDs depending on state_type)
    source_step_id UUID REFERENCES process_steps(id) ON DELETE SET NULL,
    target_step_id UUID REFERENCES process_steps(id) ON DELETE SET NULL,
    source_node_id UUID REFERENCES future_state_nodes(id) ON DELETE SET NULL,
    target_node_id UUID REFERENCES future_state_nodes(id) ON DELETE SET NULL,

    -- Core properties
    name TEXT NOT NULL,
    description TEXT,
    flow_type flow_type NOT NULL DEFAULT 'data',
    status flow_status NOT NULL DEFAULT 'active',

    -- Volume/frequency
    volume_per_day INTEGER,
    frequency TEXT, -- 'real-time', 'hourly', 'daily', 'weekly', 'on-demand', 'batch'
    is_automated BOOLEAN DEFAULT false,
    is_real_time BOOLEAN DEFAULT false,

    -- Quality scoring (1-5 scale)
    completeness_score INTEGER CHECK (completeness_score >= 1 AND completeness_score <= 5),
    accuracy_score INTEGER CHECK (accuracy_score >= 1 AND accuracy_score <= 5),
    timeliness_score INTEGER CHECK (timeliness_score >= 1 AND timeliness_score <= 5),
    quality_score INTEGER GENERATED ALWAYS AS (
        COALESCE(completeness_score, 3) +
        COALESCE(accuracy_score, 3) +
        COALESCE(timeliness_score, 3)
    ) STORED,

    -- Metadata (flexible additional properties including style overrides)
    metadata JSONB DEFAULT '{}',

    -- Audit
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    revision INTEGER DEFAULT 1 NOT NULL,

    -- Constraints
    CONSTRAINT valid_context CHECK (
        (state_type = 'current' AND process_id IS NOT NULL)
        OR (state_type = 'future' AND future_state_id IS NOT NULL)
    )
);

-- ============================================
-- 2) FLOW WASTE LINKS (Many-to-Many)
-- ============================================
-- Link flows to waste types for direct waste tagging

CREATE TABLE flow_waste_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flow_id UUID NOT NULL REFERENCES information_flows(id) ON DELETE CASCADE,
    waste_type_id UUID NOT NULL REFERENCES waste_types(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(flow_id, waste_type_id)
);

-- ============================================
-- 3) FLOW OBSERVATION LINKS (Many-to-Many)
-- ============================================
-- Link flows to observations for evidence connection

CREATE TABLE flow_observation_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flow_id UUID NOT NULL REFERENCES information_flows(id) ON DELETE CASCADE,
    observation_id UUID NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(flow_id, observation_id)
);

-- ============================================
-- 4) STEP INPUTS/OUTPUTS (SIPOC-Style)
-- ============================================
-- Structured inputs and outputs per step

CREATE TABLE step_io (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Context
    step_id UUID REFERENCES process_steps(id) ON DELETE CASCADE,
    node_id UUID REFERENCES future_state_nodes(id) ON DELETE CASCADE,

    -- I/O properties
    io_type TEXT NOT NULL CHECK (io_type IN ('input', 'output')),
    name TEXT NOT NULL,
    description TEXT,
    data_type TEXT,  -- e.g., 'form', 'email', 'report', 'system_data', 'approval'
    source_destination TEXT,  -- Who/what provides or receives
    is_required BOOLEAN DEFAULT true,

    -- Link to flow if applicable
    linked_flow_id UUID REFERENCES information_flows(id) ON DELETE SET NULL,

    -- Order
    order_index INTEGER DEFAULT 0,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_step_context CHECK (
        (step_id IS NOT NULL AND node_id IS NULL)
        OR (node_id IS NOT NULL AND step_id IS NULL)
    )
);

-- ============================================
-- 5) FLOW COMPARISON SNAPSHOTS
-- ============================================
-- Store comparison data between current and future flows

CREATE TABLE flow_comparison_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    future_state_id UUID NOT NULL REFERENCES future_states(id) ON DELETE CASCADE,

    -- Snapshot data
    current_flows_count INTEGER NOT NULL DEFAULT 0,
    future_flows_count INTEGER NOT NULL DEFAULT 0,
    eliminated_flows INTEGER NOT NULL DEFAULT 0,
    added_flows INTEGER NOT NULL DEFAULT 0,
    modified_flows INTEGER NOT NULL DEFAULT 0,

    -- Quality improvement metrics
    avg_quality_improvement REAL,
    waste_reduction_count INTEGER,

    -- Detailed comparison data
    comparison_data JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Information flows
CREATE INDEX idx_information_flows_process ON information_flows(process_id);
CREATE INDEX idx_information_flows_future_state ON information_flows(future_state_id);
CREATE INDEX idx_information_flows_source_step ON information_flows(source_step_id);
CREATE INDEX idx_information_flows_target_step ON information_flows(target_step_id);
CREATE INDEX idx_information_flows_source_node ON information_flows(source_node_id);
CREATE INDEX idx_information_flows_target_node ON information_flows(target_node_id);
CREATE INDEX idx_information_flows_type ON information_flows(flow_type);
CREATE INDEX idx_information_flows_state_type ON information_flows(state_type);
CREATE INDEX idx_information_flows_status ON information_flows(status);

-- Flow links
CREATE INDEX idx_flow_waste_links_flow ON flow_waste_links(flow_id);
CREATE INDEX idx_flow_waste_links_waste ON flow_waste_links(waste_type_id);
CREATE INDEX idx_flow_observation_links_flow ON flow_observation_links(flow_id);
CREATE INDEX idx_flow_observation_links_observation ON flow_observation_links(observation_id);

-- Step I/O
CREATE INDEX idx_step_io_step ON step_io(step_id);
CREATE INDEX idx_step_io_node ON step_io(node_id);
CREATE INDEX idx_step_io_type ON step_io(io_type);
CREATE INDEX idx_step_io_flow ON step_io(linked_flow_id);

-- Comparison
CREATE INDEX idx_flow_comparison_session ON flow_comparison_snapshots(session_id);
CREATE INDEX idx_flow_comparison_future_state ON flow_comparison_snapshots(future_state_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE information_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_waste_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_observation_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_io ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_comparison_snapshots ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Information Flows - View
CREATE POLICY "Users can view flows for accessible processes" ON information_flows
    FOR SELECT USING (
        (state_type = 'current' AND process_id IN (
            SELECT id FROM processes WHERE org_id IS NULL OR org_id = get_user_org_id()
        ))
        OR (state_type = 'future' AND future_state_id IN (
            SELECT fs.id FROM future_states fs
            JOIN sessions s ON s.id = fs.session_id
            WHERE s.facilitator_id = auth.uid()
            OR s.id IN (SELECT session_id FROM session_participants WHERE user_id = auth.uid())
            OR s.process_id IN (SELECT id FROM processes WHERE org_id IS NULL OR org_id = get_user_org_id())
        ))
    );

-- Information Flows - Insert
CREATE POLICY "Users can create flows" ON information_flows
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Information Flows - Update
CREATE POLICY "Users can update flows" ON information_flows
    FOR UPDATE USING (
        created_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator')
    );

-- Information Flows - Delete
CREATE POLICY "Users can delete flows" ON information_flows
    FOR DELETE USING (
        created_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator')
    );

-- Flow waste links - View
CREATE POLICY "View flow waste links" ON flow_waste_links
    FOR SELECT USING (true);

-- Flow waste links - Manage
CREATE POLICY "Manage flow waste links" ON flow_waste_links
    FOR ALL USING (
        flow_id IN (
            SELECT id FROM information_flows
            WHERE created_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator')
        )
    );

-- Flow observation links - View
CREATE POLICY "View flow observation links" ON flow_observation_links
    FOR SELECT USING (true);

-- Flow observation links - Manage
CREATE POLICY "Manage flow observation links" ON flow_observation_links
    FOR ALL USING (
        flow_id IN (
            SELECT id FROM information_flows
            WHERE created_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator')
        )
    );

-- Step I/O - View
CREATE POLICY "View step I/O" ON step_io
    FOR SELECT USING (true);

-- Step I/O - Manage
CREATE POLICY "Manage step I/O" ON step_io
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Comparison snapshots - View
CREATE POLICY "View comparison snapshots" ON flow_comparison_snapshots
    FOR SELECT USING (
        session_id IN (
            SELECT id FROM sessions
            WHERE facilitator_id = auth.uid()
            OR id IN (SELECT session_id FROM session_participants WHERE user_id = auth.uid())
            OR process_id IN (SELECT id FROM processes WHERE org_id IS NULL OR org_id = get_user_org_id())
        )
    );

-- Comparison snapshots - Manage
CREATE POLICY "Manage comparison snapshots" ON flow_comparison_snapshots
    FOR ALL USING (
        session_id IN (
            SELECT id FROM sessions
            WHERE facilitator_id = auth.uid() OR get_user_role() IN ('admin', 'facilitator')
        )
    );

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamp trigger for information_flows
CREATE TRIGGER update_information_flows_updated_at
    BEFORE UPDATE ON information_flows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update timestamp trigger for step_io
CREATE TRIGGER update_step_io_updated_at
    BEFORE UPDATE ON step_io
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ENABLE REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE information_flows;
ALTER PUBLICATION supabase_realtime ADD TABLE step_io;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE information_flows IS 'First-class information flow entities between process steps with quality scoring';
COMMENT ON TABLE flow_waste_links IS 'Links information flows to waste types for direct waste tagging';
COMMENT ON TABLE flow_observation_links IS 'Links information flows to observations for evidence connection';
COMMENT ON TABLE step_io IS 'SIPOC-style inputs and outputs per process step';
COMMENT ON TABLE flow_comparison_snapshots IS 'Comparison metrics between current and future state information flows';

COMMENT ON COLUMN information_flows.metadata IS 'Flexible metadata including style overrides: { style: { color, lineStyle, thickness } }';
COMMENT ON COLUMN information_flows.quality_score IS 'Computed as sum of completeness + accuracy + timeliness (3-15 range)';
