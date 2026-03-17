import { useAdminRole } from "../../hooks/useAdminRole";
import { useLastTransaction } from "../Admin/useLastTransaction";
import { AdminCostFooterUI } from "./AdminCostFooterUI";

/**
 * A small footer banner visible only to admins showing the cost of the
 * most recent API transaction in real-time.
 */
export function AdminCostFooter() {
  const { isAdmin, loading } = useAdminRole();
  const { lastTx } = useLastTransaction();

  if (loading || !isAdmin) return null;

  return <AdminCostFooterUI lastTx={lastTx} />;
}
