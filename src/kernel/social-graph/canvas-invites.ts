/**
 * Canvas Invites — token-based invite links for canvas collaboration.
 *
 * @module kernel/social-graph
 * @layer L0
 */

import { SocialEvents } from '@sn/types';

import { bus } from '../bus';
import { supabase } from '../supabase/client';

import { addCanvasMember } from './canvases';

export interface CanvasInvite {
  id: string;
  canvasId: string;
  invitedBy: string;
  role: 'editor' | 'viewer' | 'commenter';
  token: string;
  expiresAt: string;
  acceptedBy: string | null;
  acceptedAt: string | null;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  createdAt: string;
  /** Joined canvas name for display */
  canvasName?: string;
  /** Joined inviter display name for display */
  inviterName?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/* canvas_invites table is not in the generated Supabase Database type,
   so we cast through `any` — same pattern as widget-invites.ts. */

const table = () => supabase.from('canvas_invites' as any) as any;

/**
 * Create a new canvas invite token.
 */
export async function createCanvasInvite(
  canvasId: string,
  role: 'editor' | 'viewer' | 'commenter',
  invitedBy: string,
): Promise<CanvasInvite> {
  const { data, error } = await table()
    .insert({ canvas_id: canvasId, invited_by: invitedBy, role })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create invite');
  }

  return mapRow(data);
}

/**
 * Look up an invite by its public token. Returns null if not found.
 * Includes canvas name for the invite page.
 */
export async function getInviteByToken(token: string): Promise<CanvasInvite | null> {
  const { data, error } = await table()
    .select('*, canvases(name)')
    .eq('token', token)
    .single();

  if (error || !data) return null;

  const invite = mapRow(data);

  // Try to extract joined canvas name
  if (data.canvases && typeof data.canvases.name === 'string') {
    invite.canvasName = data.canvases.name;
  }

  return invite;
}

/**
 * Accept a canvas invite. Adds the user as a canvas member with the invite's role.
 */
export async function acceptInvite(
  token: string,
  userId: string,
): Promise<{ canvasId: string }> {
  const invite = await getInviteByToken(token);
  if (!invite) {
    throw new Error('Invite not found');
  }

  if (invite.status !== 'pending') {
    throw new Error(`Invite is ${invite.status}`);
  }

  if (new Date(invite.expiresAt) < new Date()) {
    await table().update({ status: 'expired' }).eq('id', invite.id);
    throw new Error('Invite has expired');
  }

  // Add the user as a canvas member
  await addCanvasMember(invite.canvasId, userId, invite.role, invite.invitedBy);

  // Mark invite as accepted
  await table()
    .update({
      accepted_by: userId,
      accepted_at: new Date().toISOString(),
      status: 'accepted',
    })
    .eq('id', invite.id);

  bus.emit(SocialEvents.PRESENCE_JOINED, {
    userId,
    canvasId: invite.canvasId,
    role: invite.role,
    source: 'invite',
  });

  return { canvasId: invite.canvasId };
}

/**
 * Revoke an invite (only the creator can do this).
 */
export async function revokeInvite(inviteId: string, userId: string): Promise<void> {
  const { error } = await table()
    .update({ status: 'revoked' })
    .eq('id', inviteId)
    .eq('invited_by', userId);

  if (error) {
    throw new Error(error.message);
  }
}

/* eslint-enable @typescript-eslint/no-explicit-any */

function mapRow(row: Record<string, unknown>): CanvasInvite {
  return {
    id: row.id as string,
    canvasId: row.canvas_id as string,
    invitedBy: row.invited_by as string,
    role: row.role as CanvasInvite['role'],
    token: row.token as string,
    expiresAt: row.expires_at as string,
    acceptedBy: (row.accepted_by as string) ?? null,
    acceptedAt: (row.accepted_at as string) ?? null,
    status: row.status as CanvasInvite['status'],
    createdAt: row.created_at as string,
  };
}
