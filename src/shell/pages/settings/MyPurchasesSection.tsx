/**
 * My Purchases Section — shows a user's active canvas subscriptions and order history.
 *
 * @module shell/pages/settings
 * @layer L6
 */

import React, { useEffect, useState } from 'react';

import { supabase } from '../../../kernel/supabase';
import { useAuthStore } from '../../../kernel/stores/auth';

// ── Types ────────────────────────────────────────────────────────────────

interface CanvasSubscription {
  id: string;
  canvas_id: string;
  tier_id: string;
  status: string;
  current_period_end: string | null;
  created_at: string;
  canvas_subscription_tiers?: {
    name: string;
    price_cents: number;
    currency: string;
    interval: string;
  };
}

interface Order {
  id: string;
  item_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  shop_items?: {
    name: string;
    item_type: string;
  };
}

// ── Styles ───────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  border: '1px solid var(--sn-border, #e5e7eb)',
  borderRadius: 'var(--sn-radius, 12px)',
  padding: 20,
  marginBottom: 20,
  background: 'var(--sn-surface, #fff)',
};

const statusColors: Record<string, string> = {
  active: '#22c55e',
  paid: '#22c55e',
  fulfilled: '#3b82f6',
  canceled: '#6b7280',
  refunded: '#ef4444',
  disputed: '#f59e0b',
  pending: '#f59e0b',
};

// ── Component ────────────────────────────────────────────────────────────

export const MyPurchasesSection: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [subscriptions, setSubscriptions] = useState<CanvasSubscription[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      const [subsRes, ordersRes] = await Promise.all([
        supabase
          .from('canvas_subscriptions')
          .select('*, canvas_subscription_tiers(name, price_cents, currency, interval)')
          .eq('buyer_id', user!.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('orders')
          .select('*, shop_items(name, item_type)')
          .eq('buyer_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      setSubscriptions((subsRes.data as CanvasSubscription[]) ?? []);
      setOrders((ordersRes.data as Order[]) ?? []);
      setLoading(false);
    }
    load();
  }, [user]);

  if (loading) {
    return <div data-testid="purchases-loading">Loading purchases...</div>;
  }

  const activeSubscriptions = subscriptions.filter((s) => s.status === 'active');

  return (
    <div data-testid="purchases-section" style={{ maxWidth: 560 }}>
      <h2 style={{ marginBottom: 16 }}>My Purchases</h2>

      {/* Active Subscriptions */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Canvas Subscriptions</h3>
        {activeSubscriptions.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--sn-text-muted, #6b7280)', margin: 0 }}>
            No active subscriptions. Browse canvases to find creators to support.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeSubscriptions.map((sub) => {
              const tier = sub.canvas_subscription_tiers;
              return (
                <div
                  key={sub.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    border: '1px solid var(--sn-border, #e5e7eb)',
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                >
                  <div>
                    <strong>{tier?.name ?? 'Subscription'}</strong>
                    {tier && (
                      <span style={{ marginLeft: 8, color: 'var(--sn-text-muted, #6b7280)' }}>
                        {(tier.price_cents / 100).toLocaleString(undefined, {
                          style: 'currency',
                          currency: tier.currency || 'usd',
                        })}/{tier.interval || 'month'}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {sub.current_period_end && (
                      <span style={{ fontSize: 11, color: 'var(--sn-text-muted, #6b7280)' }}>
                        Renews {new Date(sub.current_period_end).toLocaleDateString()}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: statusColors[sub.status] ?? '#6b7280',
                      }}
                    >
                      {sub.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Order History */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Order History</h3>
        {orders.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--sn-text-muted, #6b7280)', margin: 0 }}>
            No orders yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {orders.map((order) => {
              const item = order.shop_items;
              return (
                <div
                  key={order.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    border: '1px solid var(--sn-border, #e5e7eb)',
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                >
                  <div>
                    <strong>{item?.name ?? 'Item'}</strong>
                    {item && (
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: 11,
                          color: 'var(--sn-text-muted, #6b7280)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {item.item_type}
                      </span>
                    )}
                    <span style={{ marginLeft: 8, fontWeight: 600 }}>
                      {(order.amount_cents / 100).toLocaleString(undefined, {
                        style: 'currency',
                        currency: order.currency || 'usd',
                      })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--sn-text-muted, #6b7280)' }}>
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: statusColors[order.status] ?? '#6b7280',
                      }}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
