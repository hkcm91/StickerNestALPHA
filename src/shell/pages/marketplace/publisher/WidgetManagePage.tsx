/**
 * WidgetManagePage — manage a single published widget: versions, deprecate, delete.
 *
 * @module shell/pages/marketplace/publisher
 * @layer L6
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuthStore } from '../../../../kernel/stores/auth/auth.store';
import { createMarketplaceAPI } from '../../../../marketplace/api/marketplace-api';
import type { MarketplaceWidgetDetail, WidgetVersion } from '../../../../marketplace/api/types';
import { createPublisherDashboard } from '../../../../marketplace/publisher/publisher-dashboard';
import { themeVar } from '../../../theme/theme-vars';
import { LicenseBadge } from '../shared/LicenseBadge';
import { StarRating } from '../shared/StarRating';
import { btnDanger, btnPrimary, btnSecondary, pageStyle, sectionHeading } from '../styles';

export const WidgetManagePage: React.FC = () => {
  const { widgetId } = useParams<{ widgetId: string }>();
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id ?? null);

  const api = useMemo(() => createMarketplaceAPI(), []);
  const dashboard = useMemo(
    () => (userId ? createPublisherDashboard(userId) : null),
    [userId],
  );

  const [widget, setWidget] = useState<MarketplaceWidgetDetail | null>(null);
  const [versions, setVersions] = useState<WidgetVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!widgetId || !dashboard) return;
    let cancelled = false;
    Promise.all([
      api.getWidget(widgetId),
      dashboard.getVersionHistory(widgetId),
    ]).then(([detail, versionList]) => {
      if (!cancelled) {
        setWidget(detail);
        setVersions(versionList);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [api, dashboard, widgetId]);

  const handleDeprecate = useCallback(async () => {
    if (!dashboard || !widgetId) return;
    setActionLoading(true);
    try {
      await dashboard.deprecate(widgetId);
      setWidget((prev) => prev ? { ...prev, isDeprecated: true } : prev);
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  }, [dashboard, widgetId]);

  const handleDelete = useCallback(async () => {
    if (!dashboard || !widgetId) return;
    setActionLoading(true);
    try {
      await dashboard.deleteWidget(widgetId);
      navigate('/marketplace/publisher');
    } catch {
      setActionLoading(false);
    }
  }, [dashboard, widgetId, navigate]);

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ color: themeVar('--sn-text-muted'), padding: '40px', textAlign: 'center' }}>
          Loading widget...
        </div>
      </div>
    );
  }

  if (!widget) {
    return (
      <div style={pageStyle}>
        <button type="button" onClick={() => navigate('/marketplace/publisher')} style={{ ...btnSecondary, marginBottom: '16px' }}>
          Back to Dashboard
        </button>
        <div style={{ color: themeVar('--sn-text-muted'), padding: '40px', textAlign: 'center' }}>
          Widget not found.
        </div>
      </div>
    );
  }

  return (
    <div data-testid="page-marketplace-manage" style={pageStyle}>
      <button
        type="button"
        onClick={() => navigate('/marketplace/publisher')}
        style={{ ...btnSecondary, marginBottom: '16px' }}
      >
        Back to Dashboard
      </button>

      {/* Widget header */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '24px' }}>
        {widget.thumbnailUrl ? (
          <img
            src={widget.thumbnailUrl}
            alt={widget.name}
            style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 8,
              background: themeVar('--sn-surface'),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              color: themeVar('--sn-text-muted'),
            }}
          >
            W
          </div>
        )}
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {widget.name}
            {widget.isDeprecated && (
              <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '6px', background: '#6b7280', color: '#fff' }}>
                Deprecated
              </span>
            )}
          </h1>
          <div style={{ fontSize: '13px', color: themeVar('--sn-text-muted'), display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>v{widget.version}</span>
            <span>{widget.installCount.toLocaleString()} installs</span>
            {widget.ratingAverage !== null && (
              <>
                <StarRating value={widget.ratingAverage} size={14} />
                <span>({widget.ratingCount})</span>
              </>
            )}
            {widget.license && <LicenseBadge license={widget.license} />}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '32px',
          padding: '16px',
          borderRadius: '8px',
          border: `1px solid ${themeVar('--sn-border')}`,
          background: themeVar('--sn-surface'),
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/lab')}
          style={btnPrimary}
        >
          Update in Lab
        </button>
        <button
          type="button"
          onClick={() => navigate(`/marketplace/widget/${widgetId}`)}
          style={btnSecondary}
        >
          View Listing
        </button>
        {!widget.isDeprecated && (
          <button
            type="button"
            onClick={handleDeprecate}
            disabled={actionLoading}
            style={{ ...btnSecondary, color: '#f59e0b', borderColor: '#f59e0b', opacity: actionLoading ? 0.6 : 1 }}
          >
            Deprecate
          </button>
        )}
        {confirmDelete ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#ef4444' }}>Are you sure?</span>
            <button type="button" onClick={() => setConfirmDelete(false)} style={btnSecondary}>
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={actionLoading}
              style={{ ...btnDanger, opacity: actionLoading ? 0.6 : 1 }}
            >
              {actionLoading ? 'Deleting...' : 'Yes, Delete'}
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} style={btnDanger}>
            Delete
          </button>
        )}
      </div>

      {/* Version History */}
      <h2 style={sectionHeading}>Version History</h2>

      {versions.length === 0 ? (
        <div style={{ color: themeVar('--sn-text-muted'), fontSize: '14px' }}>
          No version history available.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {versions.map((version, index) => (
            <div
              key={version.id}
              data-testid="version-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '12px 16px',
                borderRadius: '8px',
                border: `1px solid ${themeVar('--sn-border')}`,
                background: index === 0 ? themeVar('--sn-surface') : 'transparent',
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: index === 0 ? themeVar('--sn-accent') : themeVar('--sn-text-muted'),
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: index === 0 ? 600 : 400, fontSize: '14px' }}>
                  v{version.version}
                  {index === 0 && (
                    <span style={{ fontSize: '11px', marginLeft: '6px', color: themeVar('--sn-accent') }}>
                      Latest
                    </span>
                  )}
                </div>
                {version.changelog && (
                  <div style={{ fontSize: '13px', color: themeVar('--sn-text-muted'), marginTop: '2px' }}>
                    {version.changelog}
                  </div>
                )}
              </div>
              <div style={{ fontSize: '12px', color: themeVar('--sn-text-muted'), flexShrink: 0 }}>
                {new Date(version.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
