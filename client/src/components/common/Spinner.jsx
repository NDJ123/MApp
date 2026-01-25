// =============================================================================
// SPINNER COMPONENT
// =============================================================================
// A simple loading spinner for async operations.
// Uses CSS animation for smooth performance.
// =============================================================================

function Spinner({ size = 'medium', className = '' }) {
  // Size classes
  const sizeClasses = {
    small: 'h-4 w-4 border-2',
    medium: 'h-8 w-8 border-2',
    large: 'h-12 w-12 border-3',
  };

  return (
    <div
      className={`
        animate-spin rounded-full
        border-[var(--color-border)]
        border-t-[var(--color-primary)]
        ${sizeClasses[size] || sizeClasses.medium}
        ${className}
      `}
      role="status"
      aria-label="Loading"
    >
      {/* Screen reader text */}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export default Spinner;
