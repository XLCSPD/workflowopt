-- ============================================
-- FUTURE STATE STUDIO - Database Migration
-- ============================================
-- This migration adds all tables required for the Future State Studio module:
-- - Insight Themes (Synthesis)
-- - Solution Cards (Solutions)
-- - Implementation Waves (Sequencing)
-- - Future States with Nodes/Edges (Designer)
-- - Agent Runs (Audit)
-- - Studio Locks (Collaboration)

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE theme_status AS ENUM ('draft', 'confirmed', 'rejected');
CREATE TYPE solution_status AS ENUM ('draft', 'accepted', 'rejected');
CREATE TYPE solution_bucket AS ENUM ('eliminate', 'modify', 'create');
CREATE TYPE effort_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE future_state_status AS ENUM ('draft', 'published');
CREATE TYPE node_action AS ENUM ('keep', 'modify', 'remove', 'new');
CREATE TYPE agent_type AS ENUM ('synthesis', 'solutions', 'sequencing', 'design');
CREATE TYPE agent_run_status AS ENUM ('queued', 'running', 'succeeded', 'failed');

-- ============================================
-- 1) INSIGHT THEMES (Synthesis)
-- ============================================

CREATE TABLE insight_themes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    summary TEXT,
    confidence TEXT,
    root_cause_hypotheses TEXT[] DEFAULT '{}',
    status theme_status DEFAULT 'draft',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    revision INTEGER DEFAULT 1 NOT NULL
);

-- Link themes to observations (evidence)
CREATE TABLE insight_theme_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    theme_id UUID NOT NULL REFERENCES insight_themes(id) ON DELETE CASCADE,
    observation_id UUID NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(theme_id, observation_id)
);

-- Link themes to affected process steps
CREATE TABLE insight_theme_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    theme_id UUID NOT NULL REFERENCES insight_themes(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES process_steps(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(theme_id, step_id)
);

-- Link themes to waste types
CREATE TABLE insight_theme_waste_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    theme_id UUID NOT NULL REFERENCES insight_themes(id) ON DELETE CASCADE,
    waste_type_id UUID NOT NULL REFERENCES waste_types(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(theme_id, waste_type_id)
);

-- ============================================
-- 2) SOLUTION CARDS
-- ============================================

CREATE TABLE solution_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    bucket solution_bucket NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    expected_impact TEXT,
    effort_level effort_level,
    risks TEXT[] DEFAULT '{}',
    dependencies TEXT[] DEFAULT '{}',
    recommended_wave TEXT,
    status solution_status DEFAULT 'draft',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    revision INTEGER DEFAULT 1 NOT NULL
);

-- Link solutions to themes
CREATE TABLE solution_themes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solution_id UUID NOT NULL REFERENCES solution_cards(id) ON DELETE CASCADE,
    theme_id UUID NOT NULL REFERENCES insight_themes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(solution_id, theme_id)
);

-- Link solutions to steps
CREATE TABLE solution_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solution_id UUID NOT NULL REFERENCES solution_cards(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES process_steps(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(solution_id, step_id)
);

-- Link solutions to observations (direct evidence)
CREATE TABLE solution_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solution_id UUID NOT NULL REFERENCES solution_cards(id) ON DELETE CASCADE,
    observation_id UUID NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(solution_id, observation_id)
);

-- ============================================
-- 3) IMPLEMENTATION WAVES (Sequencing)
-- ============================================

CREATE TABLE implementation_waves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    start_estimate TEXT,
    end_estimate TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    revision INTEGER DEFAULT 1 NOT NULL
);

-- Wave-solution assignments
CREATE TABLE wave_solutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wave_id UUID NOT NULL REFERENCES implementation_waves(id) ON DELETE CASCADE,
    solution_id UUID NOT NULL REFERENCES solution_cards(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(wave_id, solution_id)
);

-- Solution dependencies (explicit edges)
CREATE TABLE solution_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solution_id UUID NOT NULL REFERENCES solution_cards(id) ON DELETE CASCADE,
    depends_on_solution_id UUID NOT NULL REFERENCES solution_cards(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(solution_id, depends_on_solution_id),
    CHECK (solution_id != depends_on_solution_id)
);

-- ============================================
-- 4) FUTURE STATES (Full Designer)
-- ============================================

CREATE TABLE future_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    version INTEGER DEFAULT 1 NOT NULL,
    status future_state_status DEFAULT 'draft',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Future state nodes (derived or new steps)
CREATE TABLE future_state_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    future_state_id UUID NOT NULL REFERENCES future_states(id) ON DELETE CASCADE,
    source_step_id UUID REFERENCES process_steps(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    lane TEXT NOT NULL,
    step_type step_type DEFAULT 'action',
    lead_time_minutes INTEGER,
    cycle_time_minutes INTEGER,
    position_x REAL DEFAULT 0,
    position_y REAL DEFAULT 0,
    action node_action NOT NULL DEFAULT 'keep',
    modified_fields JSONB DEFAULT '{}',
    linked_solution_id UUID REFERENCES solution_cards(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    revision INTEGER DEFAULT 1 NOT NULL
);

-- Future state edges (connections between nodes)
CREATE TABLE future_state_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    future_state_id UUID NOT NULL REFERENCES future_states(id) ON DELETE CASCADE,
    source_node_id UUID NOT NULL REFERENCES future_state_nodes(id) ON DELETE CASCADE,
    target_node_id UUID NOT NULL REFERENCES future_state_nodes(id) ON DELETE CASCADE,
    label TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5) AGENT RUNS (Audit/Replay)
-- ============================================

CREATE TABLE agent_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    agent_type agent_type NOT NULL,
    input_hash TEXT NOT NULL,
    inputs JSONB NOT NULL DEFAULT '{}',
    outputs JSONB,
    model TEXT,
    provider TEXT,
    status agent_run_status DEFAULT 'queued',
    error TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6) STUDIO LOCKS (Collaboration)
-- ============================================

CREATE TABLE studio_locks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    locked_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    locked_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    UNIQUE(session_id, entity_type, entity_id)
);

-- ============================================
-- INDEXES
-- ============================================

-- Insight Themes
CREATE INDEX idx_insight_themes_session ON insight_themes(session_id);
CREATE INDEX idx_insight_themes_status ON insight_themes(status);
CREATE INDEX idx_insight_theme_observations_theme ON insight_theme_observations(theme_id);
CREATE INDEX idx_insight_theme_observations_obs ON insight_theme_observations(observation_id);
CREATE INDEX idx_insight_theme_steps_theme ON insight_theme_steps(theme_id);
CREATE INDEX idx_insight_theme_waste_types_theme ON insight_theme_waste_types(theme_id);

-- Solution Cards
CREATE INDEX idx_solution_cards_session ON solution_cards(session_id);
CREATE INDEX idx_solution_cards_status ON solution_cards(status);
CREATE INDEX idx_solution_cards_bucket ON solution_cards(bucket);
CREATE INDEX idx_solution_themes_solution ON solution_themes(solution_id);
CREATE INDEX idx_solution_themes_theme ON solution_themes(theme_id);
CREATE INDEX idx_solution_steps_solution ON solution_steps(solution_id);
CREATE INDEX idx_solution_observations_solution ON solution_observations(solution_id);

-- Implementation Waves
CREATE INDEX idx_implementation_waves_session ON implementation_waves(session_id);
CREATE INDEX idx_wave_solutions_wave ON wave_solutions(wave_id);
CREATE INDEX idx_wave_solutions_solution ON wave_solutions(solution_id);
CREATE INDEX idx_solution_dependencies_solution ON solution_dependencies(solution_id);
CREATE INDEX idx_solution_dependencies_depends ON solution_dependencies(depends_on_solution_id);

-- Future States
CREATE INDEX idx_future_states_session ON future_states(session_id);
CREATE INDEX idx_future_states_process ON future_states(process_id);
CREATE INDEX idx_future_state_nodes_fs ON future_state_nodes(future_state_id);
CREATE INDEX idx_future_state_nodes_source ON future_state_nodes(source_step_id);
CREATE INDEX idx_future_state_nodes_action ON future_state_nodes(action);
CREATE INDEX idx_future_state_edges_fs ON future_state_edges(future_state_id);
CREATE INDEX idx_future_state_edges_source ON future_state_edges(source_node_id);
CREATE INDEX idx_future_state_edges_target ON future_state_edges(target_node_id);

-- Agent Runs
CREATE INDEX idx_agent_runs_session ON agent_runs(session_id);
CREATE INDEX idx_agent_runs_type ON agent_runs(agent_type);
CREATE INDEX idx_agent_runs_status ON agent_runs(status);
CREATE INDEX idx_agent_runs_hash ON agent_runs(input_hash);
CREATE INDEX idx_agent_runs_created ON agent_runs(created_at DESC);

-- Studio Locks
CREATE INDEX idx_studio_locks_session ON studio_locks(session_id);
CREATE INDEX idx_studio_locks_entity ON studio_locks(entity_type, entity_id);
CREATE INDEX idx_studio_locks_expires ON studio_locks(expires_at);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE insight_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_theme_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_theme_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_theme_waste_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE solution_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE solution_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE solution_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE solution_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE implementation_waves ENABLE ROW LEVEL SECURITY;
ALTER TABLE wave_solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE solution_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE future_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE future_state_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE future_state_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_locks ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTION: Check session access
-- ============================================

CREATE OR REPLACE FUNCTION can_access_session(p_session_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = p_session_id
    AND (
      s.facilitator_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM session_participants sp
        WHERE sp.session_id = s.id AND sp.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM processes p
        WHERE p.id = s.process_id
        AND (p.org_id IS NULL OR p.org_id = get_user_org_id())
      )
    )
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================
-- RLS POLICIES: Insight Themes
-- ============================================

CREATE POLICY "Users can view themes for accessible sessions" ON insight_themes
    FOR SELECT USING (can_access_session(session_id));

CREATE POLICY "Users can create themes for accessible sessions" ON insight_themes
    FOR INSERT WITH CHECK (can_access_session(session_id) AND created_by = auth.uid());

CREATE POLICY "Users can update own themes or as facilitator" ON insight_themes
    FOR UPDATE USING (
        can_access_session(session_id)
        AND (
            created_by = auth.uid()
            OR get_user_role() IN ('admin', 'facilitator')
        )
    );

CREATE POLICY "Users can delete own themes or as facilitator" ON insight_themes
    FOR DELETE USING (
        can_access_session(session_id)
        AND (
            created_by = auth.uid()
            OR get_user_role() IN ('admin', 'facilitator')
        )
    );

-- Theme link tables (inherit from theme access)
CREATE POLICY "View theme observations" ON insight_theme_observations
    FOR SELECT USING (
        theme_id IN (SELECT id FROM insight_themes WHERE can_access_session(session_id))
    );

CREATE POLICY "Manage theme observations" ON insight_theme_observations
    FOR ALL USING (
        theme_id IN (
            SELECT id FROM insight_themes
            WHERE can_access_session(session_id)
            AND (created_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator'))
        )
    );

CREATE POLICY "View theme steps" ON insight_theme_steps
    FOR SELECT USING (
        theme_id IN (SELECT id FROM insight_themes WHERE can_access_session(session_id))
    );

CREATE POLICY "Manage theme steps" ON insight_theme_steps
    FOR ALL USING (
        theme_id IN (
            SELECT id FROM insight_themes
            WHERE can_access_session(session_id)
            AND (created_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator'))
        )
    );

CREATE POLICY "View theme waste types" ON insight_theme_waste_types
    FOR SELECT USING (
        theme_id IN (SELECT id FROM insight_themes WHERE can_access_session(session_id))
    );

CREATE POLICY "Manage theme waste types" ON insight_theme_waste_types
    FOR ALL USING (
        theme_id IN (
            SELECT id FROM insight_themes
            WHERE can_access_session(session_id)
            AND (created_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator'))
        )
    );

-- ============================================
-- RLS POLICIES: Solution Cards
-- ============================================

CREATE POLICY "Users can view solutions for accessible sessions" ON solution_cards
    FOR SELECT USING (can_access_session(session_id));

CREATE POLICY "Users can create solutions for accessible sessions" ON solution_cards
    FOR INSERT WITH CHECK (can_access_session(session_id) AND created_by = auth.uid());

CREATE POLICY "Users can update own solutions or as facilitator" ON solution_cards
    FOR UPDATE USING (
        can_access_session(session_id)
        AND (
            created_by = auth.uid()
            OR get_user_role() IN ('admin', 'facilitator')
        )
    );

CREATE POLICY "Users can delete own solutions or as facilitator" ON solution_cards
    FOR DELETE USING (
        can_access_session(session_id)
        AND (
            created_by = auth.uid()
            OR get_user_role() IN ('admin', 'facilitator')
        )
    );

-- Solution link tables
CREATE POLICY "View solution themes" ON solution_themes
    FOR SELECT USING (
        solution_id IN (SELECT id FROM solution_cards WHERE can_access_session(session_id))
    );

CREATE POLICY "Manage solution themes" ON solution_themes
    FOR ALL USING (
        solution_id IN (
            SELECT id FROM solution_cards
            WHERE can_access_session(session_id)
            AND (created_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator'))
        )
    );

CREATE POLICY "View solution steps" ON solution_steps
    FOR SELECT USING (
        solution_id IN (SELECT id FROM solution_cards WHERE can_access_session(session_id))
    );

CREATE POLICY "Manage solution steps" ON solution_steps
    FOR ALL USING (
        solution_id IN (
            SELECT id FROM solution_cards
            WHERE can_access_session(session_id)
            AND (created_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator'))
        )
    );

CREATE POLICY "View solution observations" ON solution_observations
    FOR SELECT USING (
        solution_id IN (SELECT id FROM solution_cards WHERE can_access_session(session_id))
    );

CREATE POLICY "Manage solution observations" ON solution_observations
    FOR ALL USING (
        solution_id IN (
            SELECT id FROM solution_cards
            WHERE can_access_session(session_id)
            AND (created_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator'))
        )
    );

-- ============================================
-- RLS POLICIES: Implementation Waves
-- ============================================

CREATE POLICY "Users can view waves for accessible sessions" ON implementation_waves
    FOR SELECT USING (can_access_session(session_id));

CREATE POLICY "Facilitators can manage waves" ON implementation_waves
    FOR ALL USING (
        can_access_session(session_id)
        AND get_user_role() IN ('admin', 'facilitator')
    );

CREATE POLICY "View wave solutions" ON wave_solutions
    FOR SELECT USING (
        wave_id IN (SELECT id FROM implementation_waves WHERE can_access_session(session_id))
    );

CREATE POLICY "Manage wave solutions" ON wave_solutions
    FOR ALL USING (
        wave_id IN (
            SELECT id FROM implementation_waves
            WHERE can_access_session(session_id)
            AND get_user_role() IN ('admin', 'facilitator')
        )
    );

CREATE POLICY "View solution dependencies" ON solution_dependencies
    FOR SELECT USING (
        solution_id IN (SELECT id FROM solution_cards WHERE can_access_session(session_id))
    );

CREATE POLICY "Manage solution dependencies" ON solution_dependencies
    FOR ALL USING (
        solution_id IN (
            SELECT id FROM solution_cards
            WHERE can_access_session(session_id)
            AND get_user_role() IN ('admin', 'facilitator')
        )
    );

-- ============================================
-- RLS POLICIES: Future States
-- ============================================

CREATE POLICY "Users can view future states for accessible sessions" ON future_states
    FOR SELECT USING (can_access_session(session_id));

CREATE POLICY "Users can create future states for accessible sessions" ON future_states
    FOR INSERT WITH CHECK (can_access_session(session_id) AND created_by = auth.uid());

CREATE POLICY "Users can update own future states or as facilitator" ON future_states
    FOR UPDATE USING (
        can_access_session(session_id)
        AND (
            created_by = auth.uid()
            OR get_user_role() IN ('admin', 'facilitator')
        )
    );

CREATE POLICY "Users can delete own future states or as facilitator" ON future_states
    FOR DELETE USING (
        can_access_session(session_id)
        AND (
            created_by = auth.uid()
            OR get_user_role() IN ('admin', 'facilitator')
        )
    );

-- Future state nodes
CREATE POLICY "Users can view future state nodes" ON future_state_nodes
    FOR SELECT USING (
        future_state_id IN (SELECT id FROM future_states WHERE can_access_session(session_id))
    );

CREATE POLICY "Users can create future state nodes" ON future_state_nodes
    FOR INSERT WITH CHECK (
        future_state_id IN (SELECT id FROM future_states WHERE can_access_session(session_id))
        AND created_by = auth.uid()
    );

CREATE POLICY "Users can update own nodes or as facilitator" ON future_state_nodes
    FOR UPDATE USING (
        future_state_id IN (SELECT id FROM future_states WHERE can_access_session(session_id))
        AND (
            created_by = auth.uid()
            OR get_user_role() IN ('admin', 'facilitator')
        )
    );

CREATE POLICY "Users can delete own nodes or as facilitator" ON future_state_nodes
    FOR DELETE USING (
        future_state_id IN (SELECT id FROM future_states WHERE can_access_session(session_id))
        AND (
            created_by = auth.uid()
            OR get_user_role() IN ('admin', 'facilitator')
        )
    );

-- Future state edges
CREATE POLICY "Users can view future state edges" ON future_state_edges
    FOR SELECT USING (
        future_state_id IN (SELECT id FROM future_states WHERE can_access_session(session_id))
    );

CREATE POLICY "Users can manage edges for accessible future states" ON future_state_edges
    FOR ALL USING (
        future_state_id IN (
            SELECT id FROM future_states
            WHERE can_access_session(session_id)
            AND (created_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator'))
        )
    );

-- ============================================
-- RLS POLICIES: Agent Runs
-- ============================================

CREATE POLICY "Users can view agent runs for accessible sessions" ON agent_runs
    FOR SELECT USING (can_access_session(session_id));

CREATE POLICY "Users can create agent runs" ON agent_runs
    FOR INSERT WITH CHECK (can_access_session(session_id) AND created_by = auth.uid());

CREATE POLICY "System can update agent runs" ON agent_runs
    FOR UPDATE USING (can_access_session(session_id));

-- ============================================
-- RLS POLICIES: Studio Locks
-- ============================================

CREATE POLICY "Users can view locks for accessible sessions" ON studio_locks
    FOR SELECT USING (can_access_session(session_id));

CREATE POLICY "Users can acquire locks" ON studio_locks
    FOR INSERT WITH CHECK (can_access_session(session_id) AND locked_by = auth.uid());

CREATE POLICY "Users can release own locks" ON studio_locks
    FOR DELETE USING (locked_by = auth.uid() OR expires_at < NOW());

CREATE POLICY "Users can update own locks" ON studio_locks
    FOR UPDATE USING (locked_by = auth.uid());

-- ============================================
-- TRIGGERS: updated_at + revision
-- ============================================

-- Revision bump function
CREATE OR REPLACE FUNCTION bump_revision()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.revision = OLD.revision + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at + revision triggers
CREATE TRIGGER update_insight_themes_updated_at
    BEFORE UPDATE ON insight_themes
    FOR EACH ROW EXECUTE FUNCTION bump_revision();

CREATE TRIGGER update_solution_cards_updated_at
    BEFORE UPDATE ON solution_cards
    FOR EACH ROW EXECUTE FUNCTION bump_revision();

CREATE TRIGGER update_implementation_waves_updated_at
    BEFORE UPDATE ON implementation_waves
    FOR EACH ROW EXECUTE FUNCTION bump_revision();

CREATE TRIGGER update_future_state_nodes_updated_at
    BEFORE UPDATE ON future_state_nodes
    FOR EACH ROW EXECUTE FUNCTION bump_revision();

-- Standard updated_at for tables without revision
CREATE TRIGGER update_future_states_updated_at
    BEFORE UPDATE ON future_states
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_future_state_edges_updated_at
    BEFORE UPDATE ON future_state_edges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ENABLE REALTIME for Studio tables
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE insight_themes;
ALTER PUBLICATION supabase_realtime ADD TABLE solution_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE implementation_waves;
ALTER PUBLICATION supabase_realtime ADD TABLE wave_solutions;
ALTER PUBLICATION supabase_realtime ADD TABLE future_states;
ALTER PUBLICATION supabase_realtime ADD TABLE future_state_nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE future_state_edges;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE studio_locks;

-- ============================================
-- SEED DATA: Default Implementation Waves
-- ============================================
-- These will be created per-session when studio is initialized
-- This is just a reference for the expected wave structure:
-- 1. Immediate (Quick Wins)
-- 2. 0-30 Days (Short Term)
-- 3. 30-90 Days (Medium Term)
-- 4. 90+ Days (Long Term)

COMMENT ON TABLE insight_themes IS 'Clustered observation themes from synthesis agent';
COMMENT ON TABLE solution_cards IS 'Solution proposals in eliminate/modify/create buckets';
COMMENT ON TABLE implementation_waves IS 'Temporal implementation phases for sequencing';
COMMENT ON TABLE future_states IS 'Future state process versions';
COMMENT ON TABLE future_state_nodes IS 'Individual nodes in a future state design';
COMMENT ON TABLE future_state_edges IS 'Connections between future state nodes';
COMMENT ON TABLE agent_runs IS 'Audit log of all AI agent executions';
COMMENT ON TABLE studio_locks IS 'Soft locks for collaborative editing';

