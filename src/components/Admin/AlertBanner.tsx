import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface AdminAlert {
  id: string;
  alert_type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

interface AlertBannerProps {
  alerts: AdminAlert[];
  onDismiss: (alertId: string) => void;
}

export function AlertBanner({ alerts, onDismiss }: AlertBannerProps) {
  const unreadAlerts = alerts.filter(alert => !alert.read);

  if (unreadAlerts.length === 0) {
    return null;
  }

  const handleDismiss = async (alertId: string) => {
    await supabase
      .from('admin_alerts')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', alertId);

    onDismiss(alertId);
  };

  return (
    <div className="space-y-2 mb-6">
      {unreadAlerts.map((alert) => (
        <Alert
          key={alert.id}
          variant={
            alert.severity === "critical"
              ? "destructive"
              : alert.severity === "warning"
              ? "default"
              : "default"
          }
          className={
            alert.severity === "critical"
              ? "border-red-600 bg-red-50 dark:bg-red-950"
              : alert.severity === "warning"
              ? "border-orange-500 bg-orange-50 dark:bg-orange-950"
              : "border-blue-500 bg-blue-50 dark:bg-blue-950"
          }
        >
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 mt-0.5">
              {alert.severity === "critical" ? (
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              ) : alert.severity === "warning" ? (
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              ) : (
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <AlertTitle className={
                alert.severity === "critical"
                  ? "text-red-900 dark:text-red-100"
                  : alert.severity === "warning"
                  ? "text-orange-900 dark:text-orange-100"
                  : "text-blue-900 dark:text-blue-100"
              }>
                {alert.title}
              </AlertTitle>
              <AlertDescription className={
                alert.severity === "critical"
                  ? "text-red-800 dark:text-red-200"
                  : alert.severity === "warning"
                  ? "text-orange-800 dark:text-orange-200"
                  : "text-blue-800 dark:text-blue-200"
              }>
                {alert.message}
              </AlertDescription>
              <div className="mt-2 text-xs opacity-70">
                {new Date(alert.created_at).toLocaleString()}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 h-6 w-6"
              onClick={() => handleDismiss(alert.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Alert>
      ))}
    </div>
  );
}
