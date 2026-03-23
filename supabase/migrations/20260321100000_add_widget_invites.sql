-- Widget Connection Invites
-- Stores stateful invite records for widget sharing and pipeline connection proposals.
-- Notifications table is used as the delivery mechanism (targetType: 'widget_invite').

CREATE TABLE IF NOT EXISTS widget_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('share', 'pipeline')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  is_broadcast boolean NOT NULL DEFAULT false,
  broadcast_id uuid,
  widget_id text NOT NULL,
  widget_manifest_snapshot jsonb,
  widget_html text,
  source_port_id text,
  target_port_id text,
  source_canvas_id uuid,
  source_widget_instance_id text,
  target_canvas_id uuid,
  target_widget_instance_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

-- Fast lookup: pending invites for a recipient
CREATE INDEX idx_widget_invites_recipient_status
  ON widget_invites(recipient_id, status);

-- Fast lookup: broadcast grouping by sender
CREATE INDEX idx_widget_invites_sender_broadcast
  ON widget_invites(sender_id, broadcast_id);

-- Prevent duplicate pending invites for the same sender/recipient/widget
CREATE UNIQUE INDEX idx_widget_invites_no_dup_pending
  ON widget_invites(sender_id, recipient_id, widget_id)
  WHERE status = 'pending';

-- Auto-update updated_at on row modification
CREATE TRIGGER set_widget_invites_updated_at
  BEFORE UPDATE ON widget_invites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE widget_invites ENABLE ROW LEVEL SECURITY;

-- Recipients can read their own invites
CREATE POLICY widget_invites_recipient_select
  ON widget_invites FOR SELECT
  USING (auth.uid() = recipient_id);

-- Senders can read invites they sent
CREATE POLICY widget_invites_sender_select
  ON widget_invites FOR SELECT
  USING (auth.uid() = sender_id);

-- Authenticated users can create invites (validation in application layer)
CREATE POLICY widget_invites_insert
  ON widget_invites FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Recipients can update invite status (accept/decline)
CREATE POLICY widget_invites_recipient_update
  ON widget_invites FOR UPDATE
  USING (auth.uid() = recipient_id);
