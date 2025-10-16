import { useAuth } from '../contexts/AuthContext';
import { Home, Languages, BookOpen, GraduationCap, LogOut, User } from 'lucide-react';

type NavigationProps = {
  currentView: string;
  onViewChange: (view: string) => void;
};

export function Navigation({ currentView, onViewChange }: NavigationProps) {
  const { user, isGuest, signOut } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, guestHidden: true },
    { id: 'translate', label: 'Translate', icon: Languages, guestHidden: false },
    { id: 'vocabulary', label: 'Vocabulary', icon: BookOpen, guestHidden: false },
    { id: 'test', label: 'Test', icon: GraduationCap, guestHidden: false },
  ].filter(item => !isGuest || !item.guestHidden);

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                Hebrew Learner
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                    currentView === item.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
              <span className="hidden sm:inline">{isGuest ? 'Guest' : user?.email}</span>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">{isGuest ? 'Exit' : 'Sign Out'}</span>
            </button>
          </div>
        </div>

        <div className="md:hidden flex gap-2 pb-3 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                currentView === item.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
