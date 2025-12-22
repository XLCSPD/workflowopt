-- ============================================
-- FIX: Tighten Observations RLS Policy
-- ============================================
-- The previous policy allowed ANY user to read ANY observation.
-- This fix restricts visibility to:
-- 1. Observations in sessions the user participates in
-- 2. Admins and facilitators can see all observations

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view observations in their sessions" ON observations;

-- Create a properly scoped policy
CREATE POLICY "Users can view observations in their sessions" ON observations
    FOR SELECT USING (
        -- User is a participant in the session
        session_id IN (
            SELECT session_id FROM session_participants 
            WHERE user_id = auth.uid()
        )
        -- OR user is admin/facilitator
        OR get_user_role() IN ('admin', 'facilitator')
    );

-- Also fix the observation_waste_links table to match
DROP POLICY IF EXISTS "Users can view observation waste links" ON observation_waste_links;

CREATE POLICY "Users can view observation waste links" ON observation_waste_links
    FOR SELECT USING (
        observation_id IN (
            SELECT o.id FROM observations o
            WHERE o.session_id IN (
                SELECT session_id FROM session_participants 
                WHERE user_id = auth.uid()
            )
        )
        OR get_user_role() IN ('admin', 'facilitator')
    );

-- Add comment documenting the fix
COMMENT ON POLICY "Users can view observations in their sessions" ON observations IS
    'Fixed: Previously allowed all users to view all observations. Now scoped to session participants.';

