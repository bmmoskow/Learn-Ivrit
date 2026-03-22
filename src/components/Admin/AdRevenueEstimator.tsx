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
import { useAdRevenue, StrategyEstimate } from "./useAdRevenue";

function formatMoney(n: number): string {
  return n < 0.01 && n > 0 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`;
}

function StrategyTooltip({ strategy }: { strategy: StrategyEstimate }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="inline-flex items-center gap-1 hover:text-primary">
            <span className="text-sm">{strategy.strategyName.replace(/_/g, ' ')}</span>
            <Info className="w-3 h-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-md p-4 space-y-3">
          <div>
            <h4 className="font-semibold text-sm mb-1">
              Strategy: {strategy.strategyName.replace(/_/g, ' ')}
            </h4>
            <p className="text-xs text-muted-foreground">{strategy.strategyDescription}</p>
          </div>

          <div>
            <h5 className="font-medium text-xs mb-1">Formula:</h5>
            <code className="text-xs bg-muted p-1 rounded block break-all">
              {strategy.formula}
            </code>
          </div>

          <div>
            <h5 className="font-medium text-xs mb-1">Parameters:</h5>
            <ul className="text-xs space-y-1">
              <li>• Ad slots per page: 3</li>
              <li>• Fill rate: 85%</li>
              <li>• Viewability rate: 70%</li>
              <li>
                • CPM: ${strategy.cpm.toFixed(2)}
                {strategy.cpmSource && (
                  <a
                    href={strategy.cpmSource}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 text-primary hover:underline"
                  >
                    [source]
                  </a>
                )}
                {strategy.cpmConfidence && (
                  <span className="ml-1 text-muted-foreground">
                    ({strategy.cpmConfidence} confidence)
                  </span>
                )}
              </li>
              {strategy.revenueShare && (
                <li>
                  • Revenue share: {strategy.revenueShare}
                  {strategy.revenueShareSource && (
                    <a
                      href={strategy.revenueShareSource}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 text-primary hover:underline"
                    >
                      [source]
                    </a>
                  )}
                  {strategy.revenueShareConfidence && (
                    <span className="ml-1 text-muted-foreground">
                      ({strategy.revenueShareConfidence} confidence)
                    </span>
                  )}
                </li>
              )}
              <li>
                • Traffic req: {strategy.trafficRequirement}
                {strategy.trafficRequirementSource && (
                  <a
                    href={strategy.trafficRequirementSource}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 text-primary hover:underline"
                  >
                    [source]
                  </a>
                )}
                {strategy.trafficRequirementConfidence && (
                  <span className="ml-1 text-muted-foreground">
                    ({strategy.trafficRequirementConfidence} confidence)
                  </span>
                )}
              </li>
              <li>• Engagement factor: 1.0</li>
              <li>• Policy compliance: 1.0</li>
              {strategy.formula.includes("refresh") && (
                <li>• Refresh interval: 60s</li>
              )}
            </ul>
          </div>

          <div className="pt-2 border-t border-border">
            <p className="text-xs font-medium">Implementation:</p>
            <p className="text-xs text-muted-foreground mt-1">
              {strategy.strategyDescription}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function StrategyRow({ strategy }: { strategy: StrategyEstimate }) {
  return (
    <TableRow>
      <TableCell>
        <a
          href={strategy.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary hover:underline inline-flex items-center gap-1"
        >
          {strategy.programName}
          <ExternalLink className="w-3 h-3" />
        </a>
      </TableCell>
      <TableCell>
        <StrategyTooltip strategy={strategy} />
      </TableCell>
      <TableCell className="text-right text-sm">
        ${strategy.cpm.toFixed(2)}
      </TableCell>
      <TableCell className="text-right text-sm">
        {strategy.estimatedImpressions.toLocaleString()}
      </TableCell>
      <TableCell className="text-right text-sm">
        ${strategy.estimatedRpm.toFixed(2)}
      </TableCell>
      <TableCell className="text-right font-bold">
        {formatMoney(strategy.estimatedRevenue)}
      </TableCell>
      <TableCell className="text-center text-xs">
        {strategy.meetsRequirements ? (
          <span className="text-green-600 inline-flex items-center gap-1">
            <CheckCircle className="w-4 h-4" /> Yes
          </span>
        ) : (
          <span className="text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            {strategy.trafficRequirementSource ? (
              <a
                href={strategy.trafficRequirementSource}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {strategy.trafficRequirement}
              </a>
            ) : (
              strategy.trafficRequirement
            )}
          </span>
        )}
      </TableCell>
    </TableRow>
  );
}

export function AdRevenueEstimator() {
  const { data, loading, period, setPeriod, refetch } = useAdRevenue();

  const bestRevenue = data?.strategyEstimates && data.strategyEstimates.length > 0
    ? data.strategyEstimates.reduce((max, curr) =>
        curr.estimatedRevenue > max.estimatedRevenue ? curr : max
      , data.strategyEstimates[0])
    : null;

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
                <Clock className="w-5 h-5 text-green-600" />
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
                <span className="text-sm text-muted-foreground">Best Strategy</span>
              </div>
              <p className="text-2xl font-bold text-card-foreground">
                {bestRevenue ? formatMoney(bestRevenue.estimatedRevenue) : "$0.00"}
              </p>
              {bestRevenue && (
                <p className="text-xs text-muted-foreground mt-1">
                  {bestRevenue.programName}
                </p>
              )}
            </div>
          </div>

          <div className="bg-card rounded-xl shadow p-5">
            <h3 className="text-lg font-semibold text-card-foreground mb-1">Revenue by Ad Network</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Estimated revenue based on ground truth metrics and network-specific formulas. Hover over strategies for detailed parameters.
            </p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Network</TableHead>
                    <TableHead>Plan/Strategy</TableHead>
                    <TableHead className="text-right">CPM</TableHead>
                    <TableHead className="text-right">Est. Impressions</TableHead>
                    <TableHead className="text-right">Est. RPM</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-center">Meets Req.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.strategyEstimates.map((strategy, idx) => (
                    <StrategyRow key={`${strategy.programKey}-${strategy.strategyName}-${idx}`} strategy={strategy} />
                  ))}
                  {data.strategyEstimates.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No ad network configuration found. Upload a configuration to see revenue estimates.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
