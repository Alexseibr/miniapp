import { useToast } from '@/hooks/use-toast';
import { X } from 'lucide-react';

export function Toaster() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top) + 16px)',
        left: 16,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            background: toast.variant === 'destructive' ? '#FEE2E2' : '#ECFDF5',
            border: `1px solid ${toast.variant === 'destructive' ? '#FECACA' : '#A7F3D0'}`,
            borderRadius: 12,
            padding: '12px 16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            pointerEvents: 'auto',
            animation: 'slideIn 0.2s ease-out',
          }}
          data-testid={`toast-${toast.id}`}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {toast.title && (
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: toast.variant === 'destructive' ? '#DC2626' : '#059669',
                  marginBottom: toast.description ? 4 : 0,
                }}
              >
                {toast.title}
              </div>
            )}
            {toast.description && (
              <div
                style={{
                  fontSize: 13,
                  color: toast.variant === 'destructive' ? '#991B1B' : '#047857',
                }}
              >
                {toast.description}
              </div>
            )}
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            style={{
              background: 'none',
              border: 'none',
              padding: 4,
              cursor: 'pointer',
              opacity: 0.6,
              flexShrink: 0,
            }}
            data-testid={`button-dismiss-toast-${toast.id}`}
          >
            <X size={16} color={toast.variant === 'destructive' ? '#DC2626' : '#059669'} />
          </button>
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
