// =============================================================================
// NO CLUB SCREEN
// =============================================================================
// Shown when an authenticated user has no club memberships.
// This prevents them from seeing a broken, empty app.
// =============================================================================

import { useAuth } from '../../context/AuthContext';
import { Building2 } from 'lucide-react';
import Button from '../ui/Button';

export default function NoClubScreen() {
  const { logout } = useAuth();

  return (
    <div className="flex items-center justify-center min-h-screen p-5 bg-[var(--color-background)]">
      <div className="text-center p-10 max-w-md bg-[var(--color-surface)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] animate-slide-up">
        <div className="mb-4 flex justify-center">
          <Building2 className="w-12 h-12 text-[var(--color-primary)]" />
        </div>
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-3">
          No Club Membership
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-6">
          You are not currently a member of any club. Ask a club administrator
          to invite you, or contact your app administrator for help.
        </p>
        <Button onClick={logout} variant="primary" size="md">
          Log Out
        </Button>
      </div>
    </div>
  );
}
