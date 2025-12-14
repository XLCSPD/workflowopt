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

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'system',
    read BOOLEAN DEFAULT false,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session Insights (AI-generated)
CREATE TABLE session_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE UNIQUE,
    insights JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Notification Preferences
CREATE TABLE user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    session_updates BOOLEAN DEFAULT true,
    observation_updates BOOLEAN DEFAULT true,
    invitation_updates BOOLEAN DEFAULT true,
    browser_notifications BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
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
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_session_insights_session ON session_insights(session_id);
CREATE INDEX idx_user_notification_preferences_user ON user_notification_preferences(user_id);

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
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS (SECURITY DEFINER to avoid RLS recursion)
-- ============================================

CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Organizations
CREATE POLICY "Users can view own org" ON organizations
    FOR SELECT USING (id = get_user_org_id());

-- Users
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (id = auth.uid() OR org_id = get_user_org_id());

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (id = auth.uid());

-- Processes
CREATE POLICY "Users can view processes" ON processes
    FOR SELECT USING (org_id IS NULL OR org_id = get_user_org_id());

CREATE POLICY "Users can create processes" ON processes
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage own processes" ON processes
    FOR UPDATE USING (
        created_by = auth.uid() OR
        get_user_role() IN ('admin', 'facilitator')
    );

CREATE POLICY "Users can delete own processes" ON processes
    FOR DELETE USING (
        created_by = auth.uid() OR
        get_user_role() IN ('admin', 'facilitator')
    );

-- Process Steps
CREATE POLICY "Users can view process steps" ON process_steps
    FOR SELECT USING (
        process_id IN (
            SELECT id FROM processes 
            WHERE org_id IS NULL OR org_id = get_user_org_id()
        )
    );

CREATE POLICY "Users can create process steps" ON process_steps
    FOR INSERT WITH CHECK (true);

-- Step Connections
CREATE POLICY "Users can view step connections" ON step_connections
    FOR SELECT USING (
        process_id IN (
            SELECT id FROM processes 
            WHERE org_id IS NULL OR org_id = get_user_org_id()
        )
    );

CREATE POLICY "Users can create step connections" ON step_connections
    FOR INSERT WITH CHECK (true);

-- Waste Types
CREATE POLICY "Anyone can view waste types" ON waste_types
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage waste types" ON waste_types
    FOR ALL USING (get_user_role() = 'admin');

-- Sessions
CREATE POLICY "Users can view sessions" ON sessions
    FOR SELECT USING (
        facilitator_id = auth.uid()
        OR id IN (SELECT session_id FROM session_participants WHERE user_id = auth.uid())
        OR process_id IN (SELECT id FROM processes WHERE org_id IS NULL OR org_id = get_user_org_id())
    );

CREATE POLICY "Facilitators can manage sessions" ON sessions
    FOR ALL USING (
        facilitator_id = auth.uid()
        OR get_user_role() IN ('admin', 'facilitator')
    );

-- Session Participants
CREATE POLICY "Users can view session participants" ON session_participants
    FOR SELECT USING (true);

CREATE POLICY "Users can join sessions" ON session_participants
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own participation" ON session_participants
    FOR UPDATE USING (user_id = auth.uid());

-- Observations
CREATE POLICY "Users can view observations in their sessions" ON observations
    FOR SELECT USING (true);

CREATE POLICY "Users can create observations" ON observations
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own observations" ON observations
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own observations" ON observations
    FOR DELETE USING (user_id = auth.uid());

-- Observation Waste Links
CREATE POLICY "Users can view observation waste links" ON observation_waste_links
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own observation links" ON observation_waste_links
    FOR ALL USING (
        observation_id IN (SELECT id FROM observations WHERE user_id = auth.uid())
    );

-- Training Content
CREATE POLICY "Anyone can view training content" ON training_content
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage training content" ON training_content
    FOR ALL USING (get_user_role() = 'admin');

-- Training Progress
CREATE POLICY "Users can view own progress" ON training_progress
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own progress" ON training_progress
    FOR ALL USING (user_id = auth.uid());

-- Notifications
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications" ON notifications
    FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Session Insights
CREATE POLICY "Users can view insights for accessible sessions" ON session_insights
    FOR SELECT USING (
        session_id IN (
            SELECT id FROM sessions 
            WHERE facilitator_id = auth.uid()
            OR id IN (SELECT session_id FROM session_participants WHERE user_id = auth.uid())
            OR process_id IN (SELECT id FROM processes WHERE org_id IS NULL OR org_id = get_user_org_id())
        )
    );

CREATE POLICY "Facilitators can manage session insights" ON session_insights
    FOR ALL USING (
        get_user_role() IN ('admin', 'facilitator')
    );

-- User Notification Preferences
CREATE POLICY "Users can view own notification preferences" ON user_notification_preferences
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own notification preferences" ON user_notification_preferences
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

-- Function to handle new user signups (sync auth.users to public.users)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'participant')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signups
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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

CREATE TRIGGER update_user_notification_preferences_updated_at
    BEFORE UPDATE ON user_notification_preferences
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
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

