import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Navigation } from "./components/Navigation/Navigation";
import { Dashboard } from "./components/Dashboard/Dashboard";
import { TranslationPanel } from "./components/TranslationPanel/TranslationPanel";
import { VocabularyList } from "./components/VocabularyList/VocabularyList";
import { TestPanel } from "./components/TestPanel/TestPanel";
import { ResetPassword } from "./components/Login/ResetPassword/ResetPassword";
import Settings from "./pages/Settings";
import { Footer } from "./components/Footer/Footer";
import { FAQPage } from "./components/FAQ/FAQPage";
import { TermsOfService } from "./pages/TermsOfService";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { supabase } from "../supabase/client";

function AppContent() {
  const { isGuest, loading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentView, setCurrentView] = useState(() => {
    const saved = localStorage.getItem("currentView");
    return saved || "dashboard";
  });
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  useEffect(() => {
    if (isGuest) {
      setCurrentView("faq");
      if (location.pathname === "/") {
        navigate("/faq", { replace: true });
      }
    } else {
      const saved = localStorage.getItem("currentView");
      if (saved && saved !== "faq") {
        setCurrentView(saved);
      } else if (!saved) {
        setCurrentView("dashboard");
      }
    }
  }, [isGuest, user, navigate, location.pathname]);

  const handleViewChange = (view: string) => {
    setCurrentView(view);
    localStorage.setItem("currentView", view);
    navigate(`/${view === "dashboard" ? "" : view}`);
  };

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

  return (
    <Routes>
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/" element={
        <ProtectedRoute>
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navigation currentView={currentView} onViewChange={handleViewChange} />
            <Dashboard />
            <Footer />
          </div>
        </ProtectedRoute>
      } />
      <Route path="/translate" element={
        <ProtectedRoute>
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navigation currentView={currentView} onViewChange={handleViewChange} />
            <TranslationPanel />
            <Footer />
          </div>
        </ProtectedRoute>
      } />
      <Route path="/vocabulary" element={
        <ProtectedRoute>
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navigation currentView={currentView} onViewChange={handleViewChange} />
            <VocabularyList />
            <Footer />
          </div>
        </ProtectedRoute>
      } />
      <Route path="/test" element={
        <ProtectedRoute>
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navigation currentView={currentView} onViewChange={handleViewChange} />
            <TestPanel />
            <Footer />
          </div>
        </ProtectedRoute>
      } />
      <Route path="/faq" element={
        <ProtectedRoute>
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navigation currentView={currentView} onViewChange={handleViewChange} />
            <FAQPage />
            <Footer />
          </div>
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navigation currentView={currentView} onViewChange={handleViewChange} />
            <Settings />
            <Footer />
          </div>
        </ProtectedRoute>
      } />
    </Routes>
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
