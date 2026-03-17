import { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Navigation } from "./components/Navigation/Navigation";
import { Footer } from "./components/Footer/Footer";
import { AdminCostFooter } from "./components/AdminCostFooter";

// Lazy load route components for code-splitting
const Dashboard = lazy(() => import("./components/Dashboard/Dashboard").then(m => ({ default: m.Dashboard })));
const TranslationPanel = lazy(() => import("./components/TranslationPanel/TranslationPanel").then(m => ({ default: m.TranslationPanel })));
const VocabularyList = lazy(() => import("./components/VocabularyList/VocabularyList").then(m => ({ default: m.VocabularyList })));
const TestPanel = lazy(() => import("./components/TestPanel/TestPanel").then(m => ({ default: m.TestPanel })));
const FAQ = lazy(() => import("./pages/FAQ").then(m => ({ default: m.FAQ })));
const Settings = lazy(() => import("./pages/Settings"));
const Admin = lazy(() => import("./components/Admin/Admin"));
const TermsOfService = lazy(() => import("./pages/TermsOfService").then(m => ({ default: m.TermsOfService })));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy").then(m => ({ default: m.PrivacyPolicy })));
const Contact = lazy(() => import("./pages/Contact"));
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

  const protectedLayout = (children: React.ReactNode) => (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navigation currentView={currentView} onViewChange={handleViewChange} />
        {children}
        <Footer />
        <AdminCostFooter />
      </div>
    </ProtectedRoute>
  );

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/contact" element={<Contact />} />

        {/* Protected routes */}
        <Route path="/" element={protectedLayout(<Dashboard />)} />
        <Route path="/translate" element={protectedLayout(<TranslationPanel />)} />
        <Route path="/vocabulary" element={protectedLayout(<VocabularyList />)} />
        <Route path="/test" element={protectedLayout(<TestPanel />)} />
        <Route path="/faq" element={protectedLayout(<FAQ />)} />
        <Route path="/settings" element={protectedLayout(<Settings />)} />
        <Route path="/admin" element={protectedLayout(<Admin />)} />
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
