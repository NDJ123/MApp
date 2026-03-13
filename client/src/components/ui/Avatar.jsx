const sizes = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-24 h-24 text-3xl',
};

export default function Avatar({
  src,
  name = '',
  size = 'md',
  isOnline = false,
  className = '',
}) {
  const initial = (name || '?')[0].toUpperCase();
  const sizeClass = sizes[size] || sizes.md;

  // Ignore ui-avatars.com URLs — use our own gradient instead
  const hasRealImage = src && !src.includes('ui-avatars.com');

  const avatarContent = hasRealImage ? (
    <img
      src={src}
      alt={name}
      className="w-full h-full rounded-full object-cover"
    />
  ) : (
    <span className="font-semibold text-white drop-shadow-sm">{initial}</span>
  );

  const onlineDotSize =
    size === 'xs' || size === 'sm'
      ? 'w-2 h-2 border'
      : size === 'lg' || size === 'xl' || size === '2xl'
      ? 'w-3.5 h-3.5 border-2'
      : 'w-2.5 h-2.5 border-2';

  // Orange-to-amber gradient for initials avatars
  const bgClass = hasRealImage
    ? 'bg-[var(--color-surface-hover)]'
    : 'bg-gradient-to-br from-[#F97316] to-[#F59E0B]';

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      {isOnline ? (
        <div className="avatar-ring-online">
          <div
            className={`${sizeClass} rounded-full ${bgClass} flex items-center justify-center overflow-hidden`}
          >
            {avatarContent}
          </div>
        </div>
      ) : (
        <div
          className={`${sizeClass} rounded-full ${bgClass} flex items-center justify-center overflow-hidden`}
        >
          {avatarContent}
        </div>
      )}
      {isOnline && (
        <div
          className={`absolute bottom-0 right-0 ${onlineDotSize} bg-[var(--color-success)] rounded-full border-[var(--color-surface)]`}
        />
      )}
    </div>
  );
}
