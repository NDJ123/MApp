import { Routes, Route, Navigate } from 'react-router-dom';

import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { ClubProvider } from './context/ClubContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { ContactProvider } from './context/ContactContext';

import LandingPage from './components/common/LandingPage';
import LoginPage from './components/auth/LoginPage';
import SignupPage from './components/auth/SignupPage';
import ChatLayout from './components/chat/ChatLayout';
import PrivateRoute from './components/auth/PrivateRoute';

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <ClubProvider>
            <SocketProvider>
              <ContactProvider>
                <NotificationProvider>
                  <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)]">
                    <Routes>
                      <Route path="/" element={<LandingPage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/signup" element={<SignupPage />} />

                      <Route
                        path="/chat/*"
                        element={
                          <PrivateRoute>
                            <ChatLayout />
                          </PrivateRoute>
                        }
                      />

                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </div>
                </NotificationProvider>
              </ContactProvider>
            </SocketProvider>
          </ClubProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
