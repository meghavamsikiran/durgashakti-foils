import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Download, Upload, CheckCircle2, X, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';

/**
 * ProgressToast — A premium, non-blocking floating progress indicator.
 * 
 * Inspired by Google Drive / Slack / Notion file operation indicators.
 * Sits in bottom-right corner, never blocks background content.
 * Shows real-time progress with smooth animations.
 */

// ─── Context for global access ───
const ProgressContext = createContext(null);

export const useProgress = () => {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider');
  return ctx;
};

// ─── Single Toast Item ───
const ProgressToastItem = ({ item, onDismiss }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (item.status === 'done' || item.status === 'error') {
      const timer = setTimeout(() => {
        setExiting(true);
        setTimeout(() => onDismiss(item.id), 400);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [item.status, item.id, onDismiss]);

  const isDownload = item.type === 'download' || item.type === 'export';
  const isUpload = item.type === 'upload' || item.type === 'import';
  const isDone = item.status === 'done';
  const isError = item.status === 'error';
  const isActive = item.status === 'active';

  const Icon = isDone ? CheckCircle2
    : isError ? X
    : isUpload ? Upload
    : Download;

  const FileIcon = item.fileType === 'spreadsheet' ? FileSpreadsheet : FileText;

  const accentColor = isDone ? '#10b981' : isError ? '#ef4444' : '#6366f1';

  return (
    <div
      style={{
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateX(120%)' : 'translateX(0)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        marginBottom: '10px',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '14px 18px',
        minWidth: '320px',
        maxWidth: '400px',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04)',
      }}>
        {/* Icon Container */}
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: isDone ? '#ecfdf5' : isError ? '#fef2f2' : '#eef2ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          position: 'relative',
        }}>
          {isActive && (
            <div style={{
              position: 'absolute',
              inset: '-2px',
              borderRadius: '14px',
              border: '2px solid transparent',
              borderTopColor: accentColor,
              animation: 'dsf-toast-spin 0.8s linear infinite',
            }} />
          )}
          <Icon style={{ width: '18px', height: '18px', color: accentColor }} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <FileIcon style={{ width: '12px', height: '12px', color: '#94a3b8' }} />
            <span style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#1e293b',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {item.label}
            </span>
          </div>

          {/* Progress Bar */}
          {isActive && (
            <div style={{
              width: '100%',
              height: '4px',
              background: '#f1f5f9',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '4px',
            }}>
              {item.progress != null ? (
                <div style={{
                  height: '100%',
                  width: `${item.progress}%`,
                  background: `linear-gradient(90deg, ${accentColor}, #a5b4fc)`,
                  borderRadius: '4px',
                  transition: 'width 0.3s ease',
                }} />
              ) : (
                <div style={{
                  height: '100%',
                  width: '40%',
                  background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
                  borderRadius: '4px',
                  animation: 'dsf-bar-indeterminate 1.5s ease-in-out infinite',
                }} />
              )}
            </div>
          )}

          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            color: isDone ? '#10b981' : isError ? '#ef4444' : '#64748b',
          }}>
            {item.message || (isDone ? 'Completed!' : isError ? 'Failed' : 'Processing...')}
          </span>
        </div>

        {/* Dismiss */}
        <button
          onClick={() => { setExiting(true); setTimeout(() => onDismiss(item.id), 400); }}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            flexShrink: 0,
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.color = '#475569'}
          onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
        >
          <X style={{ width: '14px', height: '14px' }} />
        </button>
      </div>
    </div>
  );
};

// ─── Toast Container ───
const ProgressToastContainer = ({ items, dismiss }) => {
  if (items.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes dsf-toast-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes dsf-bar-indeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
        @keyframes dsf-slide-in {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <div style={{
        position: 'fixed',
        bottom: '80px',
        right: '24px',
        zIndex: 9998,
        display: 'flex',
        flexDirection: 'column-reverse',
        pointerEvents: 'auto',
      }}>
        {items.map((item) => (
          <div key={item.id} style={{ animation: 'dsf-slide-in 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
            <ProgressToastItem item={item} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </>
  );
};

// ─── Provider ───
let nextId = 0;

export const ProgressProvider = ({ children }) => {
  const [items, setItems] = useState([]);

  const dismiss = useCallback((id) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const startProgress = useCallback(({ label, type = 'download', fileType = 'file', message }) => {
    const id = `progress_${++nextId}_${Date.now()}`;
    setItems(prev => [...prev, { id, label, type, fileType, status: 'active', progress: null, message }]);
    return id;
  }, []);

  const updateProgress = useCallback((id, { progress, message }) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, progress, message: message || i.message } : i));
  }, []);

  const finishProgress = useCallback((id, { message, isError = false } = {}) => {
    setItems(prev => prev.map(i => i.id === id ? {
      ...i,
      status: isError ? 'error' : 'done',
      progress: isError ? i.progress : 100,
      message: message || (isError ? 'Operation failed' : 'Completed successfully!'),
    } : i));
  }, []);

  return (
    <ProgressContext.Provider value={{ startProgress, updateProgress, finishProgress, dismiss }}>
      {children}
      <ProgressToastContainer items={items} dismiss={dismiss} />
    </ProgressContext.Provider>
  );
};
