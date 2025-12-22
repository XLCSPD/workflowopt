-- ============================================
-- WORKFLOW CONTEXT - Database Migration
-- ============================================
-- Adds workflow-level context capture for AI agent prompts:
-- - Workflow Context (core descriptors, operational context)
-- - Workflow Stakeholders
-- - Workflow Systems
-- - Workflow Metrics

-- ============================================
-- 1) WORKFLOW CONTEXTS (Main table)
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_contexts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES processes(id) ON DELETE CASCADE UNIQUE,
    -- Core descriptors
    purpose TEXT,
    business_value TEXT,
    trigger_events TEXT[] DEFAULT '{}',
    end_outcomes TEXT[] DEFAULT '{}',
    -- Operational context
    volume_frequency TEXT,
    sla_targets TEXT,
    constraints TEXT[] DEFAULT '{}',
    assumptions TEXT[] DEFAULT '{}',
    -- Audit fields
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2) WORKFLOW STAKEHOLDERS (one-to-many)
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_stakeholders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    context_id UUID REFERENCES workflow_contexts(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    responsibilities TEXT,
    pain_points TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3) WORKFLOW SYSTEMS (one-to-many)
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_systems (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    context_id UUID REFERENCES workflow_contexts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT,
    integration_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4) WORKFLOW METRICS (one-to-many)
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    context_id UUID REFERENCES workflow_contexts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    current_value TEXT,
    target_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_workflow_contexts_workflow ON workflow_contexts(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_stakeholders_context ON workflow_stakeholders(context_id);
CREATE INDEX IF NOT EXISTS idx_workflow_systems_context ON workflow_systems(context_id);
CREATE INDEX IF NOT EXISTS idx_workflow_metrics_context ON workflow_metrics(context_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE workflow_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_metrics ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: Workflow Contexts
-- ============================================

CREATE POLICY "Users can view workflow contexts for accessible processes" ON workflow_contexts
    FOR SELECT USING (
        workflow_id IN (
            SELECT id FROM processes 
            WHERE org_id IS NULL OR org_id = get_user_org_id()
        )
    );

CREATE POLICY "Users can create workflow contexts" ON workflow_contexts
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update workflow contexts" ON workflow_contexts
    FOR UPDATE USING (
        workflow_id IN (
            SELECT id FROM processes 
            WHERE created_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator')
        )
    );

CREATE POLICY "Users can delete workflow contexts" ON workflow_contexts
    FOR DELETE USING (
        workflow_id IN (
            SELECT id FROM processes 
            WHERE created_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator')
        )
    );

-- ============================================
-- RLS POLICIES: Workflow Stakeholders
-- ============================================

CREATE POLICY "Users can view workflow stakeholders" ON workflow_stakeholders
    FOR SELECT USING (
        context_id IN (
            SELECT id FROM workflow_contexts 
            WHERE workflow_id IN (
                SELECT id FROM processes 
                WHERE org_id IS NULL OR org_id = get_user_org_id()
            )
        )
    );

CREATE POLICY "Users can manage workflow stakeholders" ON workflow_stakeholders
    FOR ALL USING (
        context_id IN (
            SELECT id FROM workflow_contexts 
            WHERE workflow_id IN (
                SELECT id FROM processes 
                WHERE created_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator')
            )
        )
    );

-- ============================================
-- RLS POLICIES: Workflow Systems
-- ============================================

CREATE POLICY "Users can view workflow systems" ON workflow_systems
    FOR SELECT USING (
        context_id IN (
            SELECT id FROM workflow_contexts 
            WHERE workflow_id IN (
                SELECT id FROM processes 
                WHERE org_id IS NULL OR org_id = get_user_org_id()
            )
        )
    );

CREATE POLICY "Users can manage workflow systems" ON workflow_systems
    FOR ALL USING (
        context_id IN (
            SELECT id FROM workflow_contexts 
            WHERE workflow_id IN (
                SELECT id FROM processes 
                WHERE created_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator')
            )
        )
    );

-- ============================================
-- RLS POLICIES: Workflow Metrics
-- ============================================

CREATE POLICY "Users can view workflow metrics" ON workflow_metrics
    FOR SELECT USING (
        context_id IN (
            SELECT id FROM workflow_contexts 
            WHERE workflow_id IN (
                SELECT id FROM processes 
                WHERE org_id IS NULL OR org_id = get_user_org_id()
            )
        )
    );

CREATE POLICY "Users can manage workflow metrics" ON workflow_metrics
    FOR ALL USING (
        context_id IN (
            SELECT id FROM workflow_contexts 
            WHERE workflow_id IN (
                SELECT id FROM processes 
                WHERE created_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator')
            )
        )
    );

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_workflow_contexts_updated_at
    BEFORE UPDATE ON workflow_contexts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE workflow_contexts IS 'Workflow-level context capture for AI agent prompts';
COMMENT ON TABLE workflow_stakeholders IS 'Key stakeholders involved in the workflow';
COMMENT ON TABLE workflow_systems IS 'Systems and tools used in the workflow';
COMMENT ON TABLE workflow_metrics IS 'Performance metrics tracked for the workflow';

