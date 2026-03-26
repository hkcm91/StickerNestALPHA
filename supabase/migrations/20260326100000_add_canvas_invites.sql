-- Canvas Invites — link-based invite tokens for canvas collaboration
-- Each invite has a unique token, role, and expiry.

CREATE TABLE IF NOT EXISTS canvas_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id uuid NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('editor', 'viewer', 'commenter')),
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_by uuid REFERENCES auth.users(id),
  accepted_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_canvas_invites_token ON canvas_invites(token);

-- RLS
ALTER TABLE canvas_invites ENABLE ROW LEVEL SECURITY;

-- Anyone can read an invite by token (needed for the /invite/:token page)
CREATE POLICY "Invite readable by token" ON canvas_invites
  FOR SELECT USING (true);

-- Creator can manage their own invites
CREATE POLICY "Creator manages invites" ON canvas_invites
  FOR ALL USING (invited_by = auth.uid());

-- Authenticated users can accept invites (update accepted_by/status)
CREATE POLICY "User can accept invite" ON canvas_invites
  FOR UPDATE USING (auth.uid() IS NOT NULL)
  WITH CHECK (accepted_by = auth.uid() AND status = 'accepted');
