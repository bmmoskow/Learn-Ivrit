import { Eye, Clock, Timer, TrendingUp, AlertTriangle, CheckCircle, ExternalLink, Info } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { useAdRevenue, NetworkRevenueEstimate } from "./useAdRevenue";


const NETWORK_LINKS: Record<string, { url: string; label: string }> = {
  "Google AdSense": { url: "https://adsense.google.com/start/", label: "AdSense" },
  "Ezoic": { url: "https://www.ezoic.com/monetization/", label: "Ezoic" },
  "Mediavine": { url: "https://www.mediavine.com/ad-management/", label: "Mediavine" },
  "Raptive": { url: "https://raptive.com/creators/", label: "Raptive" },
  "Google Ad Manager": { url: "https://admanager.google.com/", label: "Ad Manager" },
};

function formatMoney(n: number): string {
  return n < 0.01 && n > 0 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`;
}

function SourceLink({ url, children }: { url: string | null; children: React.ReactNode }) {
  if (!url) return <>{children}</>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary block">
      {children}
    </a>
  );
}

interface StrategyRowProps {
  est: NetworkRevenueEstimate;
  showNetworkInfo: boolean;
  totalPageViews: number;
}

function StrategyRow({ est, showNetworkInfo, totalPageViews }: StrategyRowProps) {
  const p = est.policy;
  const link = NETWORK_LINKS[p.network_name];

  return (
    <TableRow>
      {showNetworkInfo ? (
        <TableCell rowSpan={1}>
          {link ? (
            <a href={link.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline inline-flex items-center gap-1">
              {p.network_name}
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <div className="font-medium">{p.network_name}</div>
          )}
          <div className="text-xs text-muted-foreground">{p.tier_name}</div>
        </TableCell>
      ) : (
        <TableCell className="pl-8 text-muted-foreground">
          <div className="text-xs">└─</div>
        </TableCell>
      )}
      <TableCell>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex items-center gap-1.5 cursor-help">
                <span className="text-sm">{p.strategy_name}</span>
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm p-4" side="right">
              <div className="space-y-2">
                <div className="font-semibold text-sm">{p.strategy_name}</div>
                {p.strategy_description && (
                  <p className="text-xs text-muted-foreground">{p.strategy_description}</p>
                )}
                <div className="pt-2 border-t border-border">
                  <div className="text-xs font-medium mb-1">Formula:</div>
                  <div className="text-xs text-muted-foreground font-mono bg-muted p-1.5 rounded">
                    (pageviews × slots × fill × view × cpm / 1000) × engagement
                  </div>
                </div>
                <div className="pt-2 border-t border-border">
                  <div className="text-xs font-medium mb-1.5">Parameters:</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ad slots per page:</span>
                      <span className="font-medium">{p.ad_slots_per_page}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fill rate:</span>
                      <span className="font-medium">{(p.display_fill_rate * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Viewability rate:</span>
                      <span className="font-medium">{(p.viewability_rate * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Engagement factor:</span>
                      <span className="font-medium">{p.engagement_factor.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Policy compliance:</span>
                      <span className="font-medium">{(p.policy_compliance_factor * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell className="text-right text-xs">
        <SourceLink url={p.cpm_source_url}>
          ${p.display_cpm}
        </SourceLink>
      </TableCell>
      <TableCell className="text-right text-xs">
        {est.displayImpressions.toLocaleString()}
      </TableCell>
      <TableCell className="text-right text-xs">
        ${est.estimatedRPM.toFixed(2)}
      </TableCell>
      <TableCell className="text-right font-bold">{formatMoney(est.netTotalRevenue)}</TableCell>
      <TableCell className="text-center text-xs">
        {est.meetsMinimum ? (
          <span className="text-green-600 inline-flex items-center gap-1">
            <CheckCircle className="w-4 h-4" /> Yes
          </span>
        ) : (
          <span className="text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            Need {p.min_monthly_pageviews.toLocaleString()} pv/mo
          </span>
        )}
      </TableCell>
    </TableRow>
  );
}

export function AdRevenueEstimator() {
  const { data, loading, period, setPeriod, refetch } = useAdRevenue();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 text-sm bg-background"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
        <button
          onClick={refetch}
          className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition"
        >
          Refresh
        </button>
      </div>

      {loading && <p className="text-muted-foreground text-sm">Loading analytics...</p>}

      {data && (
        <>
          {/* Engagement summary cards */}
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-card rounded-xl shadow p-5">
              <div className="flex items-center gap-3 mb-2">
                <Eye className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-muted-foreground">Page Views</span>
              </div>
              <p className="text-2xl font-bold text-card-foreground">{data.engagement.totalViews.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">
                ~{Math.round((data.engagement.totalViews / (parseInt(period) || 30)) * 30).toLocaleString()}/mo projected
              </p>
            </div>
            <div className="bg-card rounded-xl shadow p-5">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-muted-foreground">Active Minutes</span>
              </div>
              <p className="text-2xl font-bold text-card-foreground">{data.engagement.totalActiveMinutes.toLocaleString()}</p>
            </div>
            <div className="bg-card rounded-xl shadow p-5">
              <div className="flex items-center gap-3 mb-2">
                <Timer className="w-5 h-5 text-orange-600" />
                <span className="text-sm text-muted-foreground">Avg Session</span>
              </div>
              <p className="text-2xl font-bold text-card-foreground">{data.engagement.avgSessionSeconds}s</p>
            </div>
            <div className="bg-card rounded-xl shadow p-5 border-l-4 border-green-500">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="text-sm text-muted-foreground">Best Net Revenue</span>
              </div>
              <p className="text-2xl font-bold text-card-foreground">
                {data.networkEstimates.length > 0
                  ? formatMoney(data.networkEstimates[0].netTotalRevenue)
                  : "$0.00"}
              </p>
              {data.networkEstimates.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {data.networkEstimates[0].policy.network_name} ({data.networkEstimates[0].policy.tier_name})
                </p>
              )}
            </div>
          </div>

          {/* Revenue by network */}
          <div className="bg-card rounded-xl shadow p-5">
            <h3 className="text-lg font-semibold text-card-foreground mb-1">Revenue by Ad Network</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Net revenue = (pageviews × slots × fill × viewability × CPM / 1000) × engagement × revenue share. Fill rate is estimated at 85%, a conservative industry standard. Video ads are possible but not included in this calculation.
            </p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Network</TableHead>
                    <TableHead>Plan / Strategy</TableHead>
                    <TableHead className="text-right">CPM</TableHead>
                    <TableHead className="text-right">Est Impr</TableHead>
                    <TableHead className="text-right">Est RPM</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-center">Eligible</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.networkEstimates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No ad network policies configured.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (() => {
                      const groups: { [key: string]: NetworkRevenueEstimate[] } = {};
                      data.networkEstimates.forEach((est) => {
                        const key = `${est.policy.network_name}|${est.policy.tier_name}`;
                        if (!groups[key]) groups[key] = [];
                        groups[key].push(est);
                      });

                      return Object.values(groups).flatMap((groupEstimates) =>
                        groupEstimates.map((est, idx) => (
                          <StrategyRow
                            key={est.policy.id}
                            est={est}
                            showNetworkInfo={idx === 0}
                            totalPageViews={data.engagement.totalViews}
                          />
                        ))
                      );
                    })()
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Fine print: minimum requirements */}
            {data.networkEstimates.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground mb-2">Minimum Requirements by Plan</p>
                <div className="grid gap-1">
                  {(() => {
                    const seen = new Set<string>();
                    return data.networkEstimates
                      .filter((est) => {
                        const key = `${est.policy.network_name}|${est.policy.tier_name}`;
                        if (seen.has(key) || !est.policy.min_requirements_notes) return false;
                        seen.add(key);
                        return true;
                      })
                      .map((est) => (
                        <p key={`${est.policy.network_name}-${est.policy.tier_name}`} className="text-xs text-muted-foreground">
                          <span className="font-medium">
                            {est.policy.network_name} {est.policy.tier_name}
                          </span>
                          {est.policy.min_monthly_pageviews > 0 && (
                            <span className="text-amber-600 dark:text-amber-400">
                              {" "}({est.policy.min_monthly_pageviews.toLocaleString()} pv/mo)
                            </span>
                          )}
                          : {est.policy.min_requirements_notes}
                        </p>
                      ));
                  })()}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
