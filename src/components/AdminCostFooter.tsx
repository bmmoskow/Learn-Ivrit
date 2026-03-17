import { useAdminRole } from "../hooks/useAdminRole";

/**
 * A small footer banner visible only to admins showing cost context.
 * In the future this could subscribe to real-time usage events.
 * For now it shows a static reminder with a link to the admin dashboard.
 */
export function AdminCostFooter() {
  const { isAdmin, loading } = useAdminRole();

  if (loading || !isAdmin) return null;

  return (
    <div className="bg-amber-50 border-t border-amber-200 px-4 py-2 text-xs text-amber-800 flex items-center justify-between">
      <span>
        💰 Admin: API costs are being tracked.{" "}
        <a href="/admin" className="underline font-medium hover:text-amber-900">
          View usage dashboard →
        </a>
      </span>
    </div>
  );
}
