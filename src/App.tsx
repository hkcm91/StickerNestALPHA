import React from 'react';

const layers = [
  { id: 'L0', name: 'Kernel', status: 'complete' as const },
  { id: 'L1', name: 'Social + Sync', status: 'complete' as const },
  { id: 'L2', name: 'Widget Lab', status: 'complete' as const },
  { id: 'L3', name: 'Runtime', status: 'complete' as const },
  { id: 'L4A', name: 'Canvas 2D', status: 'complete' as const },
  { id: 'L4B', name: 'Spatial / VR', status: 'complete' as const },
  { id: 'L5', name: 'Marketplace', status: 'pending' as const },
  { id: 'L6', name: 'Shell', status: 'pending' as const },
];

export const App: React.FC = () => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#111827',
      color: '#f9fafb',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
        StickerNest V5
      </h1>
      <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>
        Spatial Operating System — Preview Build
      </p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        maxWidth: '800px',
        width: '100%',
      }}>
        {layers.map((layer) => (
          <div key={layer.id} style={{
            padding: '1rem',
            backgroundColor: '#1f2937',
            borderRadius: '8px',
            border: '1px solid #374151',
          }}>
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginBottom: '0.25rem',
            }}>
              {layer.id}
            </div>
            <div style={{ fontWeight: 500 }}>{layer.name}</div>
            <div style={{
              fontSize: '0.75rem',
              color: layer.status === 'complete' ? '#34d399' : '#fbbf24',
              marginTop: '0.25rem',
            }}>
              {layer.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
