-- Process Optimization Platform Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('admin', 'facilitator', 'participant');
CREATE TYPE session_status AS ENUM ('draft', 'active', 'completed', 'archived');
CREATE TYPE training_content_type AS ENUM ('video', 'slides', 'article', 'quiz');
CREATE TYPE step_type AS ENUM ('action', 'decision', 'start', 'end', 'subprocess');
CREATE TYPE waste_category AS ENUM ('core_lean', 'digital');

-- ============================================
-- TABLES
-- ============================================

-- Organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (extends Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role user_role DEFAULT 'participant',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Processes (Workflows)
CREATE TABLE processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Process Steps
CREATE TABLE process_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_id UUID REFERENCES processes(id) ON DELETE CASCADE,
    step_name TEXT NOT NULL,
    description TEXT,
    lane TEXT NOT NULL,
    step_type step_type DEFAULT 'action',
    order_index INTEGER NOT NULL,
    lead_time_minutes INTEGER,
    cycle_time_minutes INTEGER,
    position_x REAL DEFAULT 0,
    position_y REAL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step Connections (for flow arrows)
CREATE TABLE step_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_id UUID REFERENCES processes(id) ON DELETE CASCADE,
    source_step_id UUID REFERENCES process_steps(id) ON DELETE CASCADE,
    target_step_id UUID REFERENCES process_steps(id) ON DELETE CASCADE,
    label TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Waste Types
CREATE TABLE waste_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category waste_category NOT NULL,
    digital_examples TEXT[] DEFAULT '{}',
    icon TEXT,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions (Waste Walk Sessions)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    process_id UUID REFERENCES processes(id) ON DELETE CASCADE,
    facilitator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status session_status DEFAULT 'draft',
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session Participants
CREATE TABLE session_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, user_id)
);

-- Observations
CREATE TABLE observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    step_id UUID REFERENCES process_steps(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    is_digital BOOLEAN DEFAULT false,
    is_physical BOOLEAN DEFAULT false,
    frequency_score INTEGER CHECK (frequency_score >= 1 AND frequency_score <= 5),
    impact_score INTEGER CHECK (impact_score >= 1 AND impact_score <= 5),
    ease_score INTEGER CHECK (ease_score >= 1 AND ease_score <= 5),
    priority_score INTEGER GENERATED ALWAYS AS (frequency_score * impact_score * (6 - ease_score)) STORED,
    attachments TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Observation Waste Links (many-to-many)
CREATE TABLE observation_waste_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    observation_id UUID REFERENCES observations(id) ON DELETE CASCADE,
    waste_type_id UUID REFERENCES waste_types(id) ON DELETE CASCADE,
    UNIQUE(observation_id, waste_type_id)
);

-- Training Content
CREATE TABLE training_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    type training_content_type NOT NULL,
    file_url TEXT,
    content JSONB,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    duration_minutes INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training Progress
CREATE TABLE training_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content_id UUID REFERENCES training_content(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT false,
    quiz_score INTEGER,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, content_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_processes_org ON processes(org_id);
CREATE INDEX idx_process_steps_process ON process_steps(process_id);
CREATE INDEX idx_process_steps_lane ON process_steps(lane);
CREATE INDEX idx_sessions_process ON sessions(process_id);
CREATE INDEX idx_sessions_facilitator ON sessions(facilitator_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_observations_session ON observations(session_id);
CREATE INDEX idx_observations_step ON observations(step_id);
CREATE INDEX idx_observations_user ON observations(user_id);
CREATE INDEX idx_observation_waste_links_observation ON observation_waste_links(observation_id);
CREATE INDEX idx_observation_waste_links_waste_type ON observation_waste_links(waste_type_id);
CREATE INDEX idx_training_progress_user ON training_progress(user_id);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE observation_waste_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_progress ENABLE ROW LEVEL SECURITY;

-- Users can read their own organization
CREATE POLICY "Users can view own org" ON organizations
    FOR SELECT USING (
        id IN (SELECT org_id FROM users WHERE id = auth.uid())
    );

-- Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (id = auth.uid() OR org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (id = auth.uid());

-- Users can view processes in their org
CREATE POLICY "Users can view org processes" ON processes
    FOR SELECT USING (
        org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    );

-- Facilitators and admins can create/update processes
CREATE POLICY "Facilitators can manage processes" ON processes
    FOR ALL USING (
        org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'facilitator')
        )
    );

-- Users can view process steps
CREATE POLICY "Users can view process steps" ON process_steps
    FOR SELECT USING (
        process_id IN (
            SELECT id FROM processes 
            WHERE org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
        )
    );

-- Step connections follow process permissions
CREATE POLICY "Users can view step connections" ON step_connections
    FOR SELECT USING (
        process_id IN (
            SELECT id FROM processes 
            WHERE org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
        )
    );

-- Everyone can view waste types
CREATE POLICY "Anyone can view waste types" ON waste_types
    FOR SELECT USING (true);

-- Only admins can modify waste types
CREATE POLICY "Admins can manage waste types" ON waste_types
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Users can view sessions they participate in
CREATE POLICY "Users can view sessions" ON sessions
    FOR SELECT USING (
        facilitator_id = auth.uid()
        OR id IN (SELECT session_id FROM session_participants WHERE user_id = auth.uid())
        OR process_id IN (
            SELECT id FROM processes 
            WHERE org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
        )
    );

-- Facilitators can create/manage sessions
CREATE POLICY "Facilitators can manage sessions" ON sessions
    FOR ALL USING (
        facilitator_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'facilitator')
        )
    );

-- Session participants
CREATE POLICY "Users can view session participants" ON session_participants
    FOR SELECT USING (
        session_id IN (SELECT id FROM sessions WHERE facilitator_id = auth.uid())
        OR user_id = auth.uid()
    );

CREATE POLICY "Users can join sessions" ON session_participants
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Observations
CREATE POLICY "Users can view observations in their sessions" ON observations
    FOR SELECT USING (
        session_id IN (
            SELECT id FROM sessions 
            WHERE facilitator_id = auth.uid()
            OR id IN (SELECT session_id FROM session_participants WHERE user_id = auth.uid())
        )
    );

CREATE POLICY "Users can create observations" ON observations
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own observations" ON observations
    FOR UPDATE USING (user_id = auth.uid());

-- Observation waste links
CREATE POLICY "Users can view observation waste links" ON observation_waste_links
    FOR SELECT USING (
        observation_id IN (SELECT id FROM observations WHERE user_id = auth.uid())
        OR observation_id IN (
            SELECT id FROM observations 
            WHERE session_id IN (
                SELECT id FROM sessions WHERE facilitator_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage own observation links" ON observation_waste_links
    FOR ALL USING (
        observation_id IN (SELECT id FROM observations WHERE user_id = auth.uid())
    );

-- Training content is public
CREATE POLICY "Anyone can view training content" ON training_content
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage training content" ON training_content
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Training progress
CREATE POLICY "Users can view own progress" ON training_progress
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own progress" ON training_progress
    FOR ALL USING (user_id = auth.uid());

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_processes_updated_at
    BEFORE UPDATE ON processes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_process_steps_updated_at
    BEFORE UPDATE ON process_steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_waste_types_updated_at
    BEFORE UPDATE ON waste_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_observations_updated_at
    BEFORE UPDATE ON observations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_training_content_updated_at
    BEFORE UPDATE ON training_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_training_progress_updated_at
    BEFORE UPDATE ON training_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SEED DATA: WASTE TYPES
-- ============================================

INSERT INTO waste_types (code, name, description, category, digital_examples, icon, color) VALUES
-- Core Lean DOWNTIME Wastes
('D', 'Defects', 'Errors, rework, mistakes that require correction', 'core_lean', 
 ARRAY['Data entry errors', 'System bugs', 'Incorrect file formats', 'Wrong data in reports'], 
 'AlertCircle', '#EF4444'),

('O', 'Overproduction', 'Producing more than needed or before needed', 'core_lean',
 ARRAY['Excessive email chains', 'Unnecessary reports', 'Duplicate data entry', 'Creating documents nobody uses'],
 'Copy', '#F97316'),

('W', 'Waiting', 'Idle time waiting for the next step', 'core_lean',
 ARRAY['System load times', 'Waiting for approvals', 'Queue delays', 'Slow application response'],
 'Clock', '#EAB308'),

('N', 'Non-utilized Talent', 'Underutilizing people skills and knowledge', 'core_lean',
 ARRAY['Manual data entry by skilled workers', 'Underused automation capabilities', 'Knowledge silos'],
 'UserMinus', '#8B5CF6'),

('T', 'Transportation', 'Unnecessary movement of materials or information', 'core_lean',
 ARRAY['Multiple system handoffs', 'Email forwarding chains', 'Data migration between systems'],
 'Truck', '#3B82F6'),

('I', 'Inventory', 'Excess stock or backlog', 'core_lean',
 ARRAY['Email backlogs', 'Unprocessed tickets', 'Pending approvals queue', 'Outdated files'],
 'Package', '#06B6D4'),

('M', 'Motion', 'Unnecessary movement of people', 'core_lean',
 ARRAY['Switching between applications', 'Multiple clicks for simple tasks', 'Searching for files'],
 'Move', '#10B981'),

('E', 'Extra Processing', 'Processing beyond what customer requires', 'core_lean',
 ARRAY['Multiple approval layers', 'Redundant data validation', 'Over-formatting documents'],
 'Layers', '#EC4899'),

-- Digital-Specific Wastes
('IW', 'Integration Waste', 'Friction from disconnected systems requiring manual bridges', 'digital',
 ARRAY['Manual data transfer between systems', 'Re-keying information', 'Export/import processes'],
 'Unlink', '#7C3AED'),

('DO', 'Digital Overproduction', 'Creating digital artifacts nobody uses', 'digital',
 ARRAY['Unused dashboards', 'Reports nobody reads', 'Features nobody uses'],
 'FileWarning', '#DC2626'),

('UF', 'Unused Features', 'Software capabilities that go unutilized', 'digital',
 ARRAY['Disabled automation', 'Unused integrations', 'Ignored alerts'],
 'ToggleLeft', '#0891B2'),

('ED', 'Excess Data', 'Storing or processing more data than needed', 'digital',
 ARRAY['Redundant fields', 'Duplicate records', 'Obsolete data retention'],
 'Database', '#4F46E5'),

('FW', 'Fragmented Workflows', 'Broken processes across multiple tools', 'digital',
 ARRAY['Process steps in different systems', 'Information scattered across platforms'],
 'Split', '#9333EA'),

('DW', 'Digital Waiting', 'Technology-induced delays', 'digital',
 ARRAY['System synchronization delays', 'Batch processing wait times', 'API timeout issues'],
 'Hourglass', '#CA8A04');

-- ============================================
-- SEED DATA: SAMPLE TRAINING CONTENT
-- ============================================

INSERT INTO training_content (title, type, description, order_index, duration_minutes, content) VALUES
('Introduction to Lean Waste', 'video', 'Learn the fundamentals of Lean methodology and waste identification', 1, 15, 
 '{"videoUrl": "/videos/intro-to-lean.mp4", "transcript": "Welcome to Lean waste identification..."}'::jsonb),

('DOWNTIME Wastes Explained', 'slides', 'Deep dive into the 8 traditional Lean wastes', 2, 20,
 '{"slides": [{"title": "What is DOWNTIME?", "content": "DOWNTIME is an acronym..."}, {"title": "Defects", "content": "..."}]}'::jsonb),

('Digital Waste in Modern Workflows', 'article', 'Understanding waste unique to digital environments', 3, 10,
 '{"body": "In digital workflows, waste takes new forms..."}'::jsonb),

('Waste Identification Quiz', 'quiz', 'Test your knowledge of Lean waste types', 4, 15,
 '{"questions": [{"id": "q1", "text": "Which waste type involves waiting for approvals?", "options": ["Defects", "Waiting", "Motion"], "correct": "Waiting"}]}'::jsonb);

-- ============================================
-- ENABLE REALTIME
-- ============================================

-- Enable realtime for collaborative features
ALTER PUBLICATION supabase_realtime ADD TABLE observations;
ALTER PUBLICATION supabase_realtime ADD TABLE session_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;

