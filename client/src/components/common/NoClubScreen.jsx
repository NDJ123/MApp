// =============================================================================
// NO CLUB SCREEN
// =============================================================================
// Shown when an authenticated user has no club memberships.
// This prevents them from seeing a broken, empty app.
// =============================================================================

import { useAuth } from '../../context/AuthContext';

export default function NoClubScreen() {
  const { logout } = useAuth();

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>🏠</div>
        <h2 style={styles.title}>No Club Membership</h2>
        <p style={styles.message}>
          You are not currently a member of any club. Ask a club administrator
          to invite you, or contact your app administrator for help.
        </p>
        <button onClick={logout} style={styles.button}>
          Log Out
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
    background: 'var(--color-background, #f5f5f5)',
  },
  card: {
    textAlign: 'center',
    padding: '40px',
    maxWidth: '400px',
    background: 'var(--bg-primary, white)',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  icon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: 'var(--text-primary, #333)',
    marginBottom: '12px',
  },
  message: {
    fontSize: '14px',
    color: 'var(--text-secondary, #666)',
    lineHeight: '1.5',
    marginBottom: '24px',
  },
  button: {
    padding: '10px 24px',
    background: 'var(--primary-color, #4a90d9)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
};
