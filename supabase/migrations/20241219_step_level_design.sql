-- ============================================
-- STEP-LEVEL DESIGN EXTENSION - Database Migration
-- ============================================
-- Adds step-level design capability to Future State Studio:
-- - Step Context (Q&A capture)
-- - Step Design Versions with Options
-- - Design Assumptions
-- - Implementation Items (sub-solution sequencing)
-- - Extended node/solution status tracking

-- ============================================
-- NEW ENUMS
-- ============================================

CREATE TYPE step_design_status AS ENUM ('strategy_only', 'needs_step_design', 'step_design_complete');
CREATE TYPE step_design_version_status AS ENUM ('draft', 'accepted', 'archived');
CREATE TYPE implementation_item_type AS ENUM ('solution', 'step_design_option');

-- Add step_design to agent_type enum
ALTER TYPE agent_type ADD VALUE IF NOT EXISTS 'step_design';

-- ============================================
-- EXTEND EXISTING TABLES
-- ============================================

-- Add step_design_status to solution_cards
ALTER TABLE solution_cards 
ADD COLUMN IF NOT EXISTS step_design_status step_design_status DEFAULT 'strategy_only';

-- Add step design tracking to future_state_nodes (will add FK after step_design_versions exists)
ALTER TABLE future_state_nodes 
ADD COLUMN IF NOT EXISTS step_design_status step_design_status DEFAULT 'strategy_only';

-- ============================================
-- 1) STEP CONTEXT (Inline Q&A + Context Capture)
-- ============================================

CREATE TABLE step_context (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    future_state_id UUID NOT NULL REFERENCES future_states(id) ON DELETE CASCADE,
    node_id UUID NOT NULL REFERENCES future_state_nodes(id) ON DELETE CASCADE,
    context_json JSONB DEFAULT '{}',
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    revision INTEGER DEFAULT 1 NOT NULL,
    UNIQUE(node_id)
);

-- ============================================
-- 2) STEP DESIGN VERSIONS
-- ============================================

CREATE TABLE step_design_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    future_state_id UUID NOT NULL REFERENCES future_states(id) ON DELETE CASCADE,
    node_id UUID NOT NULL REFERENCES future_state_nodes(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    status step_design_version_status DEFAULT 'draft',
    selected_option_id UUID, -- FK added after step_design_options table
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    revision INTEGER DEFAULT 1 NOT NULL,
    UNIQUE(node_id, version)
);

-- ============================================
-- 3) STEP DESIGN OPTIONS (2-3 AI-generated alternatives)
-- ============================================

CREATE TABLE step_design_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_id UUID NOT NULL REFERENCES step_design_versions(id) ON DELETE CASCADE,
    option_key TEXT NOT NULL CHECK (option_key IN ('A', 'B', 'C')),
    title TEXT NOT NULL,
    summary TEXT,
    changes TEXT,
    waste_addressed TEXT[] DEFAULT '{}',
    risks TEXT[] DEFAULT '{}',
    dependencies TEXT[] DEFAULT '{}',
    confidence REAL CHECK (confidence >= 0 AND confidence <= 1),
    research_mode_used BOOLEAN DEFAULT FALSE,
    pattern_labels TEXT[] DEFAULT '{}',
    design_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(version_id, option_key)
);

-- Add FK from step_design_versions to step_design_options
ALTER TABLE step_design_versions
ADD CONSTRAINT fk_selected_option 
FOREIGN KEY (selected_option_id) 
REFERENCES step_design_options(id) 
ON DELETE SET NULL;

-- Add FK from future_state_nodes to step_design_versions
ALTER TABLE future_state_nodes 
ADD COLUMN IF NOT EXISTS active_step_design_version_id UUID REFERENCES step_design_versions(id) ON DELETE SET NULL;

-- ============================================
-- 4) DESIGN ASSUMPTIONS
-- ============================================

CREATE TABLE design_assumptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    option_id UUID NOT NULL REFERENCES step_design_options(id) ON DELETE CASCADE,
    assumption TEXT NOT NULL,
    risk_if_wrong TEXT,
    validation_method TEXT,
    validated BOOLEAN DEFAULT FALSE,
    validated_at TIMESTAMPTZ,
    validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5) IMPLEMENTATION ITEMS (Sub-solution sequencing)
-- ============================================

CREATE TABLE implementation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    type implementation_item_type NOT NULL,
    solution_id UUID REFERENCES solution_cards(id) ON DELETE CASCADE,
    step_design_option_id UUID REFERENCES step_design_options(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Exactly one of solution_id or step_design_option_id must be non-null
    CONSTRAINT exactly_one_reference CHECK (
        (solution_id IS NOT NULL AND step_design_option_id IS NULL) OR
        (solution_id IS NULL AND step_design_option_id IS NOT NULL)
    )
);

-- ============================================
-- 6) WAVE ITEMS (Link items to waves)
-- ============================================

CREATE TABLE wave_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wave_id UUID NOT NULL REFERENCES implementation_waves(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES implementation_items(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(wave_id, item_id)
);

-- ============================================
-- 7) IMPLEMENTATION DEPENDENCIES (Item-level)
-- ============================================

CREATE TABLE implementation_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES implementation_items(id) ON DELETE CASCADE,
    depends_on_item_id UUID NOT NULL REFERENCES implementation_items(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(item_id, depends_on_item_id),
    CHECK (item_id != depends_on_item_id)
);

-- ============================================
-- INDEXES
-- ============================================

-- Step Context
CREATE INDEX idx_step_context_session ON step_context(session_id);
CREATE INDEX idx_step_context_future_state ON step_context(future_state_id);
CREATE INDEX idx_step_context_node ON step_context(node_id);

-- Step Design Versions
CREATE INDEX idx_step_design_versions_session ON step_design_versions(session_id);
CREATE INDEX idx_step_design_versions_future_state ON step_design_versions(future_state_id);
CREATE INDEX idx_step_design_versions_node ON step_design_versions(node_id);
CREATE INDEX idx_step_design_versions_status ON step_design_versions(status);

-- Step Design Options
CREATE INDEX idx_step_design_options_version ON step_design_options(version_id);
CREATE INDEX idx_step_design_options_research ON step_design_options(research_mode_used);

-- Design Assumptions
CREATE INDEX idx_design_assumptions_option ON design_assumptions(option_id);
CREATE INDEX idx_design_assumptions_validated ON design_assumptions(validated);

-- Implementation Items
CREATE INDEX idx_implementation_items_session ON implementation_items(session_id);
CREATE INDEX idx_implementation_items_type ON implementation_items(type);
CREATE INDEX idx_implementation_items_solution ON implementation_items(solution_id);
CREATE INDEX idx_implementation_items_step_design ON implementation_items(step_design_option_id);

-- Wave Items
CREATE INDEX idx_wave_items_wave ON wave_items(wave_id);
CREATE INDEX idx_wave_items_item ON wave_items(item_id);

-- Implementation Dependencies
CREATE INDEX idx_implementation_dependencies_item ON implementation_dependencies(item_id);
CREATE INDEX idx_implementation_dependencies_depends ON implementation_dependencies(depends_on_item_id);

-- Future State Nodes (new columns)
CREATE INDEX idx_future_state_nodes_step_design_status ON future_state_nodes(step_design_status);
CREATE INDEX idx_future_state_nodes_active_version ON future_state_nodes(active_step_design_version_id);

-- Solution Cards (new column)
CREATE INDEX idx_solution_cards_step_design_status ON solution_cards(step_design_status);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE step_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_design_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_design_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE implementation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wave_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE implementation_dependencies ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: Step Context
-- ============================================

CREATE POLICY "Users can view step context for accessible sessions" ON step_context
    FOR SELECT USING (can_access_session(session_id));

CREATE POLICY "Users can create step context for accessible sessions" ON step_context
    FOR INSERT WITH CHECK (can_access_session(session_id) AND created_by = auth.uid());

CREATE POLICY "Users can update own step context or as facilitator" ON step_context
    FOR UPDATE USING (
        can_access_session(session_id)
        AND (created_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator'))
    );

CREATE POLICY "Users can delete own step context or as facilitator" ON step_context
    FOR DELETE USING (
        can_access_session(session_id)
        AND (created_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator'))
    );

-- ============================================
-- RLS POLICIES: Step Design Versions
-- ============================================

CREATE POLICY "Users can view step design versions for accessible sessions" ON step_design_versions
    FOR SELECT USING (can_access_session(session_id));

CREATE POLICY "Users can create step design versions for accessible sessions" ON step_design_versions
    FOR INSERT WITH CHECK (can_access_session(session_id) AND created_by = auth.uid());

CREATE POLICY "Users can update own step design versions or as facilitator" ON step_design_versions
    FOR UPDATE USING (
        can_access_session(session_id)
        AND (created_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator'))
    );

CREATE POLICY "Users can delete own step design versions or as facilitator" ON step_design_versions
    FOR DELETE USING (
        can_access_session(session_id)
        AND (created_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator'))
    );

-- ============================================
-- RLS POLICIES: Step Design Options
-- ============================================

CREATE POLICY "Users can view step design options" ON step_design_options
    FOR SELECT USING (
        version_id IN (
            SELECT id FROM step_design_versions WHERE can_access_session(session_id)
        )
    );

CREATE POLICY "Users can create step design options for own versions" ON step_design_options
    FOR INSERT WITH CHECK (
        version_id IN (
            SELECT id FROM step_design_versions 
            WHERE can_access_session(session_id) AND created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update step design options for accessible versions" ON step_design_options
    FOR UPDATE USING (
        version_id IN (
            SELECT id FROM step_design_versions 
            WHERE can_access_session(session_id)
            AND (created_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator'))
        )
    );

CREATE POLICY "Users can delete step design options for accessible versions" ON step_design_options
    FOR DELETE USING (
        version_id IN (
            SELECT id FROM step_design_versions 
            WHERE can_access_session(session_id)
            AND (created_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator'))
        )
    );

-- ============================================
-- RLS POLICIES: Design Assumptions
-- ============================================

CREATE POLICY "Users can view design assumptions" ON design_assumptions
    FOR SELECT USING (
        option_id IN (
            SELECT o.id FROM step_design_options o
            JOIN step_design_versions v ON v.id = o.version_id
            WHERE can_access_session(v.session_id)
        )
    );

CREATE POLICY "Users can create design assumptions" ON design_assumptions
    FOR INSERT WITH CHECK (
        option_id IN (
            SELECT o.id FROM step_design_options o
            JOIN step_design_versions v ON v.id = o.version_id
            WHERE can_access_session(v.session_id)
        )
    );

CREATE POLICY "Users can update design assumptions" ON design_assumptions
    FOR UPDATE USING (
        option_id IN (
            SELECT o.id FROM step_design_options o
            JOIN step_design_versions v ON v.id = o.version_id
            WHERE can_access_session(v.session_id)
            AND (v.created_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator'))
        )
    );

CREATE POLICY "Users can delete design assumptions" ON design_assumptions
    FOR DELETE USING (
        option_id IN (
            SELECT o.id FROM step_design_options o
            JOIN step_design_versions v ON v.id = o.version_id
            WHERE can_access_session(v.session_id)
            AND (v.created_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator'))
        )
    );

-- ============================================
-- RLS POLICIES: Implementation Items
-- ============================================

CREATE POLICY "Users can view implementation items for accessible sessions" ON implementation_items
    FOR SELECT USING (can_access_session(session_id));

CREATE POLICY "Users can create implementation items for accessible sessions" ON implementation_items
    FOR INSERT WITH CHECK (can_access_session(session_id) AND created_by = auth.uid());

CREATE POLICY "Users can update own implementation items or as facilitator" ON implementation_items
    FOR UPDATE USING (
        can_access_session(session_id)
        AND (created_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator'))
    );

CREATE POLICY "Users can delete own implementation items or as facilitator" ON implementation_items
    FOR DELETE USING (
        can_access_session(session_id)
        AND (created_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator'))
    );

-- ============================================
-- RLS POLICIES: Wave Items
-- ============================================

CREATE POLICY "Users can view wave items" ON wave_items
    FOR SELECT USING (
        wave_id IN (SELECT id FROM implementation_waves WHERE can_access_session(session_id))
    );

CREATE POLICY "Users can create wave items for accessible waves" ON wave_items
    FOR INSERT WITH CHECK (
        wave_id IN (
            SELECT id FROM implementation_waves 
            WHERE can_access_session(session_id)
        )
    );

CREATE POLICY "Users can update wave items for accessible waves" ON wave_items
    FOR UPDATE USING (
        wave_id IN (
            SELECT id FROM implementation_waves 
            WHERE can_access_session(session_id)
            AND get_user_role() IN ('admin', 'facilitator')
        )
    );

CREATE POLICY "Users can delete wave items for accessible waves" ON wave_items
    FOR DELETE USING (
        wave_id IN (
            SELECT id FROM implementation_waves 
            WHERE can_access_session(session_id)
            AND get_user_role() IN ('admin', 'facilitator')
        )
    );

-- ============================================
-- RLS POLICIES: Implementation Dependencies
-- ============================================

CREATE POLICY "Users can view implementation dependencies" ON implementation_dependencies
    FOR SELECT USING (
        item_id IN (SELECT id FROM implementation_items WHERE can_access_session(session_id))
    );

CREATE POLICY "Users can create implementation dependencies" ON implementation_dependencies
    FOR INSERT WITH CHECK (
        item_id IN (
            SELECT id FROM implementation_items 
            WHERE can_access_session(session_id)
        )
    );

CREATE POLICY "Users can update implementation dependencies" ON implementation_dependencies
    FOR UPDATE USING (
        item_id IN (
            SELECT id FROM implementation_items 
            WHERE can_access_session(session_id)
            AND (created_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator'))
        )
    );

CREATE POLICY "Users can delete implementation dependencies" ON implementation_dependencies
    FOR DELETE USING (
        item_id IN (
            SELECT id FROM implementation_items 
            WHERE can_access_session(session_id)
            AND (created_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator'))
        )
    );

-- ============================================
-- TRIGGERS: updated_at + revision
-- ============================================

CREATE TRIGGER update_step_context_updated_at
    BEFORE UPDATE ON step_context
    FOR EACH ROW EXECUTE FUNCTION bump_revision();

CREATE TRIGGER update_step_design_versions_updated_at
    BEFORE UPDATE ON step_design_versions
    FOR EACH ROW EXECUTE FUNCTION bump_revision();

-- ============================================
-- ENABLE REALTIME for new tables
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE step_context;
ALTER PUBLICATION supabase_realtime ADD TABLE step_design_versions;
ALTER PUBLICATION supabase_realtime ADD TABLE step_design_options;
ALTER PUBLICATION supabase_realtime ADD TABLE design_assumptions;
ALTER PUBLICATION supabase_realtime ADD TABLE implementation_items;
ALTER PUBLICATION supabase_realtime ADD TABLE wave_items;
ALTER PUBLICATION supabase_realtime ADD TABLE implementation_dependencies;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE step_context IS 'Inline context capture and Q&A for step-level design';
COMMENT ON TABLE step_design_versions IS 'Versioned step design canvas per future state node';
COMMENT ON TABLE step_design_options IS 'AI-generated design options (2-3 alternatives per version)';
COMMENT ON TABLE design_assumptions IS 'Explicit assumptions tied to a design option';
COMMENT ON TABLE implementation_items IS 'Implementation items for sub-solution sequencing';
COMMENT ON TABLE wave_items IS 'Links implementation items to waves with ordering';
COMMENT ON TABLE implementation_dependencies IS 'Dependencies between implementation items';

COMMENT ON COLUMN step_design_options.design_json IS 'Structured sections: purpose, inputs, actions, decisions, outputs, controls';
COMMENT ON COLUMN step_design_options.confidence IS 'AI confidence score 0-1';
COMMENT ON COLUMN step_design_options.pattern_labels IS 'Labels for pattern-based suggestions when research_mode_used=true';

