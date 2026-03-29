-- Rooms table for persistent multi-user rooms
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  creator_user_id UUID NOT NULL REFERENCES auth.users(id),
  creator_widget_id TEXT NOT NULL,
  join_policy TEXT NOT NULL CHECK (join_policy IN ('invite', 'proximity', 'canvas-auto', 'open')),
  max_members INT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  destroyed_at TIMESTAMPTZ  -- NULL = active, non-NULL = destroyed
);

-- Room members
CREATE TABLE room_members (
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  instance_id TEXT NOT NULL,
  display_name TEXT,
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (room_id, user_id, instance_id)
);

-- Indexes
CREATE INDEX rooms_canvas_idx ON rooms (canvas_id) WHERE destroyed_at IS NULL;
CREATE INDEX room_members_user_idx ON room_members (user_id);

-- RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;

-- Users can see rooms on canvases they have access to
CREATE POLICY rooms_select ON rooms FOR SELECT USING (
  EXISTS (SELECT 1 FROM canvases WHERE canvases.id = rooms.canvas_id)
);

CREATE POLICY rooms_insert ON rooms FOR INSERT WITH CHECK (
  creator_user_id = auth.uid()
);

CREATE POLICY rooms_update ON rooms FOR UPDATE USING (
  creator_user_id = auth.uid()
);

-- Room members: users can see members of rooms they can see
CREATE POLICY room_members_select ON room_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM rooms WHERE rooms.id = room_members.room_id)
);

CREATE POLICY room_members_insert ON room_members FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY room_members_delete ON room_members FOR DELETE USING (
  user_id = auth.uid()
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_members;
