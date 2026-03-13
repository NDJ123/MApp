export default function Input({
  label,
  error,
  hint,
  icon: Icon,
  className = '',
  ...props
}) {
  return (
    <div>
      {label && (
        <label
          htmlFor={props.id}
          className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-tertiary)] pointer-events-none" />
        )}
        <input
          className={`
            w-full px-4 py-2.5 text-sm
            bg-[var(--color-surface)] text-[var(--color-text-primary)]
            border rounded-[var(--radius-md)]
            placeholder:text-[var(--color-text-tertiary)]
            focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent
            transition-shadow duration-[var(--duration-fast)]
            disabled:opacity-50 disabled:cursor-not-allowed
            ${Icon ? 'pl-10' : ''}
            ${error ? 'border-[var(--color-error)]' : 'border-[var(--color-border)]'}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-[var(--color-error)]">{error}</p>}
      {hint && !error && (
        <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">{hint}</p>
      )}
    </div>
  );
}
