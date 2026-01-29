import { useAuth } from "../../contexts/AuthContext/AuthContext";
import { Home, Languages, BookOpen, GraduationCap, LogOut, User, Settings, HelpCircle } from "lucide-react";
import { APP_CONFIG } from "@/config/app";

type NavigationProps = {
  currentView: string;
  onViewChange: (view: string) => void;
};

export function Navigation({ currentView, onViewChange }: NavigationProps) {
  const { user, isGuest, signOut } = useAuth();

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Home, guestHidden: true },
    { id: "translate", label: "Translate", icon: Languages, guestHidden: false },
    { id: "vocabulary", label: "Vocabulary", icon: BookOpen, guestHidden: false },
    { id: "test", label: "Test", icon: GraduationCap, guestHidden: false },
    { id: "faq", label: "FAQ", icon: HelpCircle, guestHidden: false, guestOnly: true },
    { id: "settings", label: "Settings", icon: Settings, guestHidden: true },
  ].filter((item) => {
    if (isGuest) {
      return !item.guestHidden;
    } else {
      return !item.guestOnly;
    }
  });

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Desktop: Single row layout */}
        <div className="hidden lg:flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              {APP_CONFIG.appName}
            </div>
            <div className="flex items-center gap-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                    currentView === item.id
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span className="max-w-[220px] truncate">{isGuest ? "Guest" : user?.email}</span>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
              <span>{isGuest ? "Exit" : "Sign Out"}</span>
            </button>
          </div>
        </div>

        {/* Tablet (sm to lg): Two row layout */}
        <div className="hidden sm:block lg:hidden">
          {/* Row 1: App name (left) + Email (right) */}
          <div className="flex items-center justify-between h-14">
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              {APP_CONFIG.appName}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span className="max-w-[180px] truncate">{isGuest ? "Guest" : user?.email}</span>
            </div>
          </div>

          {/* Row 2: Nav items (left) + Sign Out (right) */}
          <div className="flex items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    currentView === item.id ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              <span>{isGuest ? "Exit" : "Sign Out"}</span>
            </button>
          </div>
        </div>

        {/* Phone (below sm): Two row layout, no email */}
        <div className="sm:hidden">
          {/* Row 1: App name (left) + Sign Out (right) */}
          <div className="flex items-center justify-between h-12">
            <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              {APP_CONFIG.appName}
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              <span>{isGuest ? "Exit" : "Sign Out"}</span>
            </button>
          </div>

          {/* Row 2: Nav items */}
          <div className="flex items-center justify-center gap-0 pb-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`flex items-center gap-0.5 px-1.5 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                  currentView === item.id ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <item.icon className="w-3.5 h-3.5 shrink-0" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
