/**
 * PublisherPage — lists creator's published widgets with stats.
 *
 * @module shell/pages/marketplace/publisher
 * @layer L6
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '../../../../kernel/stores/auth/auth.store';
import type { MarketplaceWidgetListing } from '../../../../marketplace/api/types';
import { createPublisherDashboard } from '../../../../marketplace/publisher/publisher-dashboard';
import { themeVar } from '../../../theme/theme-vars';
import { StarRating } from '../shared/StarRating';
import { btnPrimary, btnSecondary, pageStyle, sectionHeading } from '../styles';

export const PublisherPage: React.FC = () => {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const dashboard = useMemo(
    () => (userId ? createPublisherDashboard(userId) : null),
    [userId],
  );

  const [widgets, setWidgets] = useState<MarketplaceWidgetListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dashboard) return;
    let cancelled = false;
    dashboard.getMyWidgets().then((items) => {
      if (!cancelled) {
        setWidgets(items);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [dashboard]);

  const handleManage = useCallback(
    (widgetId: string) => navigate(`/marketplace/publisher/${widgetId}`),
    [navigate],
  );

  const totalInstalls = useMemo(
    () => widgets.reduce((sum, w) => sum + w.installCount, 0),
    [widgets],
  );

  const avgRating = useMemo(() => {
    const rated = widgets.filter((w) => w.ratingAverage !== null);
    if (rated.length === 0) return null;
    return rated.reduce((sum, w) => sum + (w.ratingAverage ?? 0), 0) / rated.length;
  }, [widgets]);

  if (!userId) {
    return (
      <div style={pageStyle}>
        <div style={{ color: themeVar('--sn-text-muted'), padding: '40px', textAlign: 'center' }}>
          Please sign in to access the Publisher Dashboard.
        </div>
      </div>
    );
  }

  return (
    <div data-testid="page-marketplace-publisher" style={pageStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>Publisher Dashboard</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" onClick={() => navigate('/marketplace')} style={btnSecondary}>
            Marketplace
          </button>
          <button type="button" onClick={() => navigate('/lab')} style={btnPrimary}>
            Open Lab
          </button>
        </div>
      </div>

      {/* Stats summary */}
      {!loading && widgets.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '24px',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              flex: '1 1 150px',
              padding: '16px',
              borderRadius: '8px',
              border: `1px solid ${themeVar('--sn-border')}`,
              background: themeVar('--sn-surface'),
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '28px', fontWeight: 700 }}>{widgets.length}</div>
            <div style={{ fontSize: '13px', color: themeVar('--sn-text-muted') }}>
              Published Widgets
            </div>
          </div>
          <div
            style={{
              flex: '1 1 150px',
              padding: '16px',
              borderRadius: '8px',
              border: `1px solid ${themeVar('--sn-border')}`,
              background: themeVar('--sn-surface'),
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '28px', fontWeight: 700 }}>
              {totalInstalls.toLocaleString()}
            </div>
            <div style={{ fontSize: '13px', color: themeVar('--sn-text-muted') }}>
              Total Installs
            </div>
          </div>
          <div
            style={{
              flex: '1 1 150px',
              padding: '16px',
              borderRadius: '8px',
              border: `1px solid ${themeVar('--sn-border')}`,
              background: themeVar('--sn-surface'),
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '28px', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}>
              {avgRating !== null ? (
                <>
                  {avgRating.toFixed(1)}
                  <StarRating value={avgRating} size={18} />
                </>
              ) : (
                '—'
              )}
            </div>
            <div style={{ fontSize: '13px', color: themeVar('--sn-text-muted') }}>
              Avg Rating
            </div>
          </div>
        </div>
      )}

      {/* Widget list */}
      <h2 style={sectionHeading}>My Widgets</h2>

      {loading ? (
        <div style={{ color: themeVar('--sn-text-muted'), padding: '40px', textAlign: 'center' }}>
          Loading your widgets...
        </div>
      ) : widgets.length === 0 ? (
        <div style={{ color: themeVar('--sn-text-muted'), padding: '40px', textAlign: 'center' }}>
          You haven't published any widgets yet. Open the Lab to create and publish your first widget.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {widgets.map((widget) => (
            <div
              key={widget.id}
              data-testid="publisher-widget-row"
              onClick={() => handleManage(widget.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '12px 16px',
                borderRadius: '8px',
                border: `1px solid ${themeVar('--sn-border')}`,
                background: themeVar('--sn-surface'),
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
            >
              {/* Thumbnail */}
              {widget.thumbnailUrl ? (
                <img
                  src={widget.thumbnailUrl}
                  alt={widget.name}
                  style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 6,
                    background: themeVar('--sn-bg'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    color: themeVar('--sn-text-muted'),
                  }}
                >
                  W
                </div>
              )}

              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {widget.name}
                  {widget.isDeprecated && (
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: '6px',
                        background: '#6b7280',
                        color: '#fff',
                      }}
                    >
                      Deprecated
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: themeVar('--sn-text-muted') }}>
                  v{widget.version} · {widget.installCount.toLocaleString()} installs
                  {widget.ratingAverage !== null && ` · ${widget.ratingAverage.toFixed(1)} rating`}
                </div>
              </div>

              {/* Manage link */}
              <span style={{ fontSize: '13px', color: themeVar('--sn-accent') }}>
                Manage →
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
