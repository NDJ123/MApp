export default function Skeleton({ className = '', variant = 'rect' }) {
  const base = 'animate-shimmer rounded-[var(--radius-md)]';

  if (variant === 'circle') {
    return <div className={`${base} rounded-full ${className}`} />;
  }

  if (variant === 'text') {
    return <div className={`${base} h-4 ${className}`} />;
  }

  return <div className={`${base} ${className}`} />;
}

// Pre-built skeleton patterns
export function ContactSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <Skeleton variant="circle" className="w-8 h-8" />
      <Skeleton variant="text" className="w-24 h-3" />
    </div>
  );
}

export function MessageSkeleton() {
  return (
    <div className="flex gap-3 px-4 py-2">
      <Skeleton variant="circle" className="w-8 h-8" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="w-20 h-3" />
        <Skeleton variant="text" className="w-48 h-4" />
        <Skeleton variant="text" className="w-32 h-4" />
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="p-4 border border-[var(--color-border)] rounded-[var(--radius-lg)]">
      <div className="flex items-center gap-4">
        <Skeleton variant="circle" className="w-12 h-12" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-32 h-4" />
          <Skeleton variant="text" className="w-20 h-3" />
        </div>
      </div>
    </div>
  );
}
