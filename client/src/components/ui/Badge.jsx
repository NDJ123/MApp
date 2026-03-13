const variants = {
  primary: 'bg-[var(--color-primary-muted)] text-[var(--color-primary)]',
  success: 'bg-green-100 text-green-700 [data-theme=dark]:bg-green-900/30 [data-theme=dark]:text-green-400',
  error: 'bg-red-100 text-red-700 [data-theme=dark]:bg-red-900/30 [data-theme=dark]:text-red-400',
  warning: 'bg-amber-100 text-amber-700 [data-theme=dark]:bg-amber-900/30 [data-theme=dark]:text-amber-400',
  neutral: 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]',
};

export default function Badge({ children, variant = 'primary', pulse = false, className = '' }) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5
        text-xs font-medium rounded-full
        ${variants[variant] || variants.neutral}
        ${className}
      `}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}
