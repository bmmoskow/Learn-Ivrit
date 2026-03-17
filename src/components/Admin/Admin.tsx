import { useAdminRole } from "../../hooks/useAdminRole";
import { useAuth } from "../../contexts/AuthContext/AuthContext";
import { AdminDashboard } from "./AdminDashboard";

export default function Admin() {
  const { isAdmin, loading: roleLoading } = useAdminRole();
  const { loading: authLoading } = useAuth();

  if (authLoading || roleLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500 text-lg">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return <AdminDashboard />;
}
