import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Navigation } from "./components/Navigation";
import { Dashboard } from "./components/Dashboard/Dashboard";
import { TranslationPanel } from "./components/TranslationPanel/TranslationPanel";
import { VocabularyList } from "./components/VocabularyList/VocabularyList";
import { TestPanel } from "./components/TestPanel/TestPanel";
import { ResetPassword } from "./components/ResetPassword/ResetPassword";
import { supabase } from "../supabase/client";

function AppContent() {
  const { isGuest, loading } = useAuth();
  const [currentView, setCurrentView] = useState("dashboard");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  useEffect(() => {
    if (isGuest) {
      setCurrentView("translate");
    }
  }, [isGuest]);

  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash;
      if (hash === "#reset-password" || hash.includes("type=recovery")) {
        setIsResettingPassword(true);
      }
    };

    checkHash();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsResettingPassword(true);
      }
    });

    window.addEventListener("hashchange", checkHash);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("hashchange", checkHash);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isResettingPassword) {
    return (
      <ResetPassword
        onComplete={() => {
          setIsResettingPassword(false);
          window.location.hash = "";
        }}
      />
    );
  }

  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return <Dashboard />;
      case "translate":
        return <TranslationPanel />;
      case "vocabulary":
        return <VocabularyList />;
      case "test":
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
