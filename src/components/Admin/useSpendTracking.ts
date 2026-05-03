import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface MonthlySpendTracking {
  month: string;
  total_spend: number;
  current_tier: string;
  spend_cap: number;
  api_enabled: boolean;
  circuit_breaker_activated_at: string | null;
  last_updated: string;
}

export function useSpendTracking() {
  const [spendTracking, setSpendTracking] = useState<MonthlySpendTracking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSpendTracking();

    const subscription = supabase
      .channel('spend_tracking_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'monthly_spend_tracking',
        },
        () => {
          fetchSpendTracking();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchSpendTracking = async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7) + '-01';

      const { data, error } = await supabase
        .from('monthly_spend_tracking')
        .select('*')
        .eq('month', currentMonth)
        .maybeSingle();

      if (error) throw error;

      setSpendTracking(data);
    } catch (error) {
      console.error('Error fetching spend tracking:', error);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    fetchSpendTracking();
  };

  return {
    spendTracking,
    loading,
    refresh,
  };
}
