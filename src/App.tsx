import { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Navigation } from "./components/Navigation/Navigation";
import { Footer } from "./components/Footer/Footer";
import { supabase } from "../supabase/client";

// Lazy load route components for code-splitting
const Dashboard = lazy(() => import("./components/Dashboard/Dashboard").then(m => ({ default: m.Dashboard })));
const TranslationPanel = lazy(() => import("./components/TranslationPanel/TranslationPanel").then(m => ({ default: m.TranslationPanel })));
const VocabularyList = lazy(() => import("./components/VocabularyList/VocabularyList").then(m => ({ default: m.VocabularyList })));
const TestPanel = lazy(() => import("./components/TestPanel/TestPanel").then(m => ({ default: m.TestPanel })));
const FAQ = lazy(() => import("./pages/FAQ").then(m => ({ default: m.FAQ })));
const Settings = lazy(() => import("./pages/Settings"));
const TermsOfService = lazy(() => import("./pages/TermsOfService").then(m => ({ default: m.TermsOfService })));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy").then(m => ({ default: m.PrivacyPolicy })));
const ResetPassword = lazy(() => import("./components/Login/ResetPassword/ResetPassword").then(m => ({ default: m.ResetPassword })));

// Loading fallback for lazy-loaded routes
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

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
      <Suspense fallback={<PageLoader />}>
        <ResetPassword
          onComplete={() => {
            setIsResettingPassword(false);
            window.location.hash = "";
          }}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50 flex flex-col">
                <Navigation currentView={currentView} onViewChange={handleViewChange} />
                <Dashboard />
                <Footer />
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/translate"
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50 flex flex-col">
                <Navigation currentView={currentView} onViewChange={handleViewChange} />
                <TranslationPanel />
                <Footer />
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vocabulary"
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50 flex flex-col">
                <Navigation currentView={currentView} onViewChange={handleViewChange} />
                <VocabularyList />
                <Footer />
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/test"
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50 flex flex-col">
                <Navigation currentView={currentView} onViewChange={handleViewChange} />
                <TestPanel />
                <Footer />
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/faq"
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50 flex flex-col">
                <Navigation currentView={currentView} onViewChange={handleViewChange} />
                <FAQ />
                <Footer />
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50 flex flex-col">
                <Navigation currentView={currentView} onViewChange={handleViewChange} />
                <Settings />
                <Footer />
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
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
