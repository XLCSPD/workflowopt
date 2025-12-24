-- ============================================
-- FIX: Future State Edges RLS Policy for INSERT
-- ============================================
-- The original policy used FOR ALL USING which doesn't work for INSERT.
-- INSERT requires WITH CHECK clause.

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can manage edges for accessible future states" ON future_state_edges;

-- Create separate policies for each operation

-- SELECT: Users can view edges for future states they can access
CREATE POLICY "Users can view future state edges" ON future_state_edges
    FOR SELECT USING (
        future_state_id IN (SELECT id FROM future_states WHERE can_access_session(session_id))
    );

-- INSERT: Users can create edges for future states they can access
CREATE POLICY "Users can create future state edges" ON future_state_edges
    FOR INSERT WITH CHECK (
        future_state_id IN (SELECT id FROM future_states WHERE can_access_session(session_id))
    );

-- UPDATE: Users can update edges if they created the future state or are facilitator
CREATE POLICY "Users can update future state edges" ON future_state_edges
    FOR UPDATE USING (
        future_state_id IN (
            SELECT id FROM future_states
            WHERE can_access_session(session_id)
            AND (created_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator'))
        )
    );

-- DELETE: Users can delete edges if they created the future state or are facilitator
CREATE POLICY "Users can delete future state edges" ON future_state_edges
    FOR DELETE USING (
        future_state_id IN (
            SELECT id FROM future_states
            WHERE can_access_session(session_id)
            AND (created_by = auth.uid() OR get_user_role() IN ('admin', 'facilitator'))
        )
    );

-- Also fix future_state_nodes INSERT policy which has the same issue
DROP POLICY IF EXISTS "Users can create future state nodes" ON future_state_nodes;

-- Recreate with proper WITH CHECK for INSERT
CREATE POLICY "Users can create future state nodes" ON future_state_nodes
    FOR INSERT WITH CHECK (
        future_state_id IN (SELECT id FROM future_states WHERE can_access_session(session_id))
    );

-- Also ensure delete policy allows deleting nodes in accessible future states
DROP POLICY IF EXISTS "Users can delete own nodes or as facilitator" ON future_state_nodes;

CREATE POLICY "Users can delete future state nodes" ON future_state_nodes
    FOR DELETE USING (
        future_state_id IN (
            SELECT id FROM future_states
            WHERE can_access_session(session_id)
        )
    );

-- Also ensure update policy allows updating nodes in accessible future states  
DROP POLICY IF EXISTS "Users can update own nodes or as facilitator" ON future_state_nodes;

CREATE POLICY "Users can update future state nodes" ON future_state_nodes
    FOR UPDATE USING (
        future_state_id IN (
            SELECT id FROM future_states
            WHERE can_access_session(session_id)
        )
    );

