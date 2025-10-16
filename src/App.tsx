import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { TranslationPanel } from './components/TranslationPanel';
import { VocabularyList } from './components/VocabularyList';
import { TestPanel } from './components/TestPanel';
import { ResetPassword } from './components/ResetPassword';
import { supabase } from './lib/supabase';

function AppContent() {
  const { isGuest } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  useEffect(() => {
    if (isGuest) {
      setCurrentView('translate');
    }
  }, [isGuest]);

  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash;
      if (hash === '#reset-password' || hash.includes('type=recovery')) {
        setIsResettingPassword(true);
      }
    };

    checkHash();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsResettingPassword(true);
      }
    });

    window.addEventListener('hashchange', checkHash);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('hashchange', checkHash);
    };
  }, []);

  if (isResettingPassword) {
    return <ResetPassword onComplete={() => setIsResettingPassword(false)} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'translate':
        return <TranslationPanel />;
      case 'vocabulary':
        return <VocabularyList />;
      case 'test':
        return <TestPanel />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navigation currentView={currentView} onViewChange={setCurrentView} />
        {renderView()}
      </div>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
