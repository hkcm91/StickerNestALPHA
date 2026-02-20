/**
 * Minimal page stubs for each route.
 * These are bare scaffolds — styling and layout come later.
 *
 * @module shell/router
 * @layer L6
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { useUIStore } from '../../kernel/stores/ui/ui.store';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const DashboardPage: React.FC = () => (
  <div data-testid="page-dashboard"><h1>Dashboard</h1></div>
);

export const LoginPage: React.FC = () => (
  <div data-testid="page-login"><h1>Login</h1></div>
);

export const CanvasPage: React.FC = () => {
  const { canvasParam } = useParams<{ canvasParam: string }>();
  const setMode = useUIStore((s) => s.setCanvasInteractionMode);
  const isUUID = canvasParam ? UUID_RE.test(canvasParam) : false;

  useEffect(() => {
    setMode(isUUID ? 'edit' : 'preview');
  }, [isUUID, setMode]);

  return (
    <div data-testid="page-canvas" data-mode={isUUID ? 'edit' : 'preview'}>
      <h1>Canvas</h1>
      <p>{isUUID ? `Editing: ${canvasParam}` : `Viewing: ${canvasParam}`}</p>
    </div>
  );
};

export const MarketplacePage: React.FC = () => (
  <div data-testid="page-marketplace"><h1>Marketplace</h1></div>
);

export const SettingsPage: React.FC = () => (
  <div data-testid="page-settings"><h1>Settings</h1></div>
);

export const InvitePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  return (
    <div data-testid="page-invite"><h1>Accept Invite</h1><p>Token: {token}</p></div>
  );
};

export const NotFoundPage: React.FC = () => (
  <div data-testid="page-not-found"><h1>404 — Not Found</h1></div>
);
