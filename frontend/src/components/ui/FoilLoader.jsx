import React from 'react';

/**
 * Premium non-blocking loader for Durga Shakti Foils.
 * 
 * Design philosophy:
 * - NEVER blocks or overlays the screen
 * - Takes normal document flow (no fixed/absolute positioning over content)
 * - Uses a slim animated top progress bar (YouTube/Amazon style) 
 * - Shows beautiful skeleton shimmer placeholders mimicking real page layout
 * - Themed with metallic silver gradients matching aluminum foil products
 */
const FoilLoader = ({ message = "Loading..." }) => {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* ─── Top Progress Bar (YouTube / Amazon style) ─── */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        zIndex: 9999,
        background: 'linear-gradient(90deg, #818cf8, #c7d2fe, #e0e7ff, #818cf8)',
        backgroundSize: '300% 100%',
        animation: 'dsf-bar-slide 1.5s linear infinite',
      }} />

      {/* ─── Keyframes (scoped inline) ─── */}
      <style>{`
        @keyframes dsf-bar-slide {
          0% { background-position: 0% 50%; }
          100% { background-position: 300% 50%; }
        }
        @keyframes dsf-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .dsf-skeleton {
          position: relative;
          overflow: hidden;
          background: #e8ecf1;
          border-radius: 8px;
        }
        .dsf-skeleton::after {
          content: "";
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%);
          animation: dsf-shimmer 1.8s ease-in-out infinite;
        }
      `}</style>

      {/* ─── Skeleton Content Area ─── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px' }}>

        {/* Page title skeleton */}
        <div className="dsf-skeleton" style={{ width: '280px', height: '32px', marginBottom: '8px' }} />
        <div className="dsf-skeleton" style={{ width: '180px', height: '16px', marginBottom: '40px' }} />

        {/* Stats cards row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              background: '#fff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}>
              <div className="dsf-skeleton" style={{ width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="dsf-skeleton" style={{ width: '60%', height: '10px', marginBottom: '8px' }} />
                <div className="dsf-skeleton" style={{ width: '40%', height: '22px' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Main content table skeleton */}
        <div style={{
          background: '#fff',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr 100px',
            gap: '16px',
            padding: '20px 28px',
            borderBottom: '1px solid #f1f5f9',
            background: '#fafbfc',
          }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="dsf-skeleton" style={{ height: '12px', borderRadius: '4px' }} />
            ))}
          </div>

          {/* Table rows */}
          {[1, 2, 3, 4, 5, 6].map(row => (
            <div key={row} style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr 100px',
              gap: '16px',
              padding: '18px 28px',
              borderBottom: '1px solid #f8fafc',
              alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="dsf-skeleton" style={{ width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="dsf-skeleton" style={{ width: '75%', height: '12px', marginBottom: '6px' }} />
                  <div className="dsf-skeleton" style={{ width: '50%', height: '10px' }} />
                </div>
              </div>
              <div className="dsf-skeleton" style={{ height: '12px', width: '70%' }} />
              <div className="dsf-skeleton" style={{ height: '12px', width: '60%' }} />
              <div className="dsf-skeleton" style={{ height: '24px', width: '80px', borderRadius: '20px' }} />
              <div className="dsf-skeleton" style={{ height: '12px', width: '50%' }} />
            </div>
          ))}
        </div>

        {/* Subtle branded message at bottom */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '32px',
          gap: '8px',
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid #818cf8',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'dsf-bar-slide 0.8s linear infinite',
          }} />
          <span style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#94a3b8',
            letterSpacing: '0.05em',
          }}>
            {message}
          </span>
        </div>
      </div>
    </div>
  );
};

export default FoilLoader;
