import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface MonthlySpendTracking {
  month: string;
  total_spend: number;
  current_tier: string;
  spend_cap: number;
  api_enabled: boolean;
  circuit_breaker_activated_at: string | null;
}

interface SpendMonitorProps {
  spendTracking: MonthlySpendTracking | null;
  onRefresh: () => void;
}

export function SpendMonitor({ spendTracking, onRefresh }: SpendMonitorProps) {
  if (!spendTracking) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Spend Overview</CardTitle>
          <CardDescription>No spend tracking data available for current month</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const spendPercent = (spendTracking.total_spend / spendTracking.spend_cap) * 100;
  const remaining = spendTracking.spend_cap - spendTracking.total_spend;
  const daysInMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0
  ).getDate();
  const currentDay = new Date().getDate();
  const daysRemaining = daysInMonth - currentDay;

  const dailyAverage = spendTracking.total_spend / currentDay;
  const projectedEndOfMonth = dailyAverage * daysInMonth;

  const tierLabels: Record<string, string> = {
    tier1: 'Tier 1',
    tier2: 'Tier 2',
    tier3: 'Tier 3',
  };

  const getProgressColor = () => {
    if (spendPercent >= 95) return 'bg-red-600';
    if (spendPercent >= 80) return 'bg-orange-500';
    if (spendPercent >= 50) return 'bg-yellow-500';
    return 'bg-green-600';
  };

  const handleToggleCircuitBreaker = async () => {
    const newState = !spendTracking.api_enabled;

    if (newState) {
      const confirmed = window.confirm(
        "Are you sure you want to re-enable the API? This may incur overage charges if you're close to your spend cap. The 10-minute enforcement delay means additional charges could accrue after reaching the limit."
      );
      if (!confirmed) return;
    }

    try {
      const { error } = await supabase
        .from('monthly_spend_tracking')
        .update({
          api_enabled: newState,
          circuit_breaker_activated_at: newState ? null : new Date().toISOString()
        })
        .eq('month', spendTracking.month);

      if (error) throw error;

      toast.success(
        newState
          ? 'API re-enabled. Monitor spend closely to avoid overages.'
          : 'Circuit breaker activated. API calls are now blocked.'
      );
      onRefresh();
    } catch (error) {
      console.error('Error toggling circuit breaker:', error);
      toast.error('Failed to update circuit breaker status');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Monthly Spend Overview</CardTitle>
          <CardDescription>
            Current month: {new Date(spendTracking.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Current Spend</span>
              <span className="font-mono">
                ${spendTracking.total_spend.toFixed(2)} / ${spendTracking.spend_cap.toFixed(2)}
              </span>
            </div>
            <Progress value={spendPercent} className="h-3" />
            <div className={`text-xs mt-1 ${getProgressColor().replace('bg-', 'text-')}`}>
              {spendPercent.toFixed(1)}% used • ${remaining.toFixed(2)} remaining
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Current Tier</div>
              <div className="font-semibold">{tierLabels[spendTracking.current_tier] || spendTracking.current_tier}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Days Remaining</div>
              <div className="font-semibold">{daysRemaining} days</div>
            </div>
            <div>
              <div className="text-muted-foreground">Daily Average</div>
              <div className="font-semibold">${dailyAverage.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Projected Total</div>
              <div className={`font-semibold ${projectedEndOfMonth > spendTracking.spend_cap ? 'text-red-600' : ''}`}>
                ${projectedEndOfMonth.toFixed(2)}
              </div>
            </div>
          </div>

          {projectedEndOfMonth > spendTracking.spend_cap && (
            <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-md">
              <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-orange-900 dark:text-orange-100">
                <strong>Warning:</strong> Current pace will exceed your monthly cap. Consider optimizing API usage or the circuit breaker will activate at 95%.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Circuit Breaker Status</CardTitle>
          <CardDescription>
            Prevents service suspension by blocking API calls before reaching spend cap
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            {spendTracking.api_enabled ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <XCircle className="h-6 w-6 text-red-600" />
            )}
            <div>
              <div className="font-semibold">
                {spendTracking.api_enabled ? 'API Enabled' : 'API Disabled (Circuit Breaker Active)'}
              </div>
              <div className="text-xs text-muted-foreground">
                {spendTracking.api_enabled
                  ? 'Gemini API calls are processing normally'
                  : `Activated at ${spendTracking.circuit_breaker_activated_at ? new Date(spendTracking.circuit_breaker_activated_at).toLocaleString() : 'unknown'}`
                }
              </div>
            </div>
          </div>

          {!spendTracking.api_enabled && (
            <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
              <div className="text-sm text-red-900 dark:text-red-100">
                <strong>Circuit breaker is active.</strong> Users will see a graceful degradation message instead of API errors.
                Service will automatically resume on the 1st of next month.
              </div>
            </div>
          )}

          <Button
            onClick={handleToggleCircuitBreaker}
            variant={spendTracking.api_enabled ? "destructive" : "default"}
            className="w-full"
          >
            {spendTracking.api_enabled ? 'Emergency Stop (Disable API)' : 'Re-enable API (Use with Caution)'}
          </Button>

          <div className="text-xs text-muted-foreground">
            <strong>Note:</strong> The circuit breaker automatically activates at 95% of your spend cap to prevent
            hitting Google's 10-minute enforcement delay window, which could result in unexpected overage charges.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
