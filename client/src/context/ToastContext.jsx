import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

let toastId = 0;

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: 'text-[var(--color-success)]',
  error: 'text-[var(--color-error)]',
  warning: 'text-[var(--color-warning)]',
  info: 'text-[var(--color-primary)]',
};

function Toast({ toast, onRemove }) {
  const Icon = ICONS[toast.type] || Info;
  const colorClass = COLORS[toast.type] || COLORS.info;

  return (
    <div
      className={`
        flex items-start gap-3 px-4 py-3 rounded-xl
        bg-[var(--color-surface-elevated)] border border-[var(--color-border)]
        shadow-[var(--shadow-lg)]
        ${toast.removing ? 'animate-toast-out' : 'animate-toast-in'}
      `}
      style={{ maxWidth: '380px' }}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${colorClass}`} />
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            {toast.title}
          </p>
        )}
        <p className="text-sm text-[var(--color-text-secondary)]">{toast.message}</p>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 p-1 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, removing: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 150);
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const addToast = useCallback(
    ({ type = 'info', title, message, duration = 4000 }) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, type, title, message, removing: false }]);
      if (duration > 0) {
        timersRef.current[id] = setTimeout(() => removeToast(id), duration);
      }
      return id;
    },
    [removeToast]
  );

  const toast = useCallback(
    (message, type = 'info') => addToast({ message, type }),
    [addToast]
  );

  toast.success = (message, title) => addToast({ message, title, type: 'success' });
  toast.error = (message, title) => addToast({ message, title, type: 'error' });
  toast.warning = (message, title) => addToast({ message, title, type: 'warning' });
  toast.info = (message, title) => addToast({ message, title, type: 'info' });

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast toast={t} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
