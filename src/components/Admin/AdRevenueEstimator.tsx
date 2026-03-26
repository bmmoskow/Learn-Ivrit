import { Eye, Clock, Timer, TrendingUp, Info, Upload, FileText, ExternalLink } from "lucide-react";
import { useState } from "react";
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
import { supabase } from "../../../supabase/client";
import { useToast } from "../../hooks/use-toast";

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

          {strategy.programCpm && (
            <div className="pt-2 border-t border-border">
              <h5 className="font-medium text-xs mb-1">Program CPM Range:</h5>
              <p className="text-xs">{strategy.programCpm.value}</p>
              {strategy.programCpm.source && strategy.programCpm.source !== 'None' && (
                <a
                  href={strategy.programCpm.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  Source <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {strategy.programCpm.confidence && (
                <span className="text-xs text-muted-foreground ml-2">
                  ({strategy.programCpm.confidence} confidence)
                </span>
              )}
            </div>
          )}

          {strategy.revenueShare && (
            <div className="pt-2 border-t border-border">
              <h5 className="font-medium text-xs mb-1">Revenue Share:</h5>
              <p className="text-xs">{strategy.revenueShare.value}</p>
              {strategy.revenueShare.source && strategy.revenueShare.source !== 'None' && (
                <a
                  href={strategy.revenueShare.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  Source <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {strategy.revenueShare.confidence && (
                <span className="text-xs text-muted-foreground ml-2">
                  ({strategy.revenueShare.confidence} confidence)
                </span>
              )}
            </div>
          )}

          {strategy.trafficRequirement && (
            <div className="pt-2 border-t border-border">
              <h5 className="font-medium text-xs mb-1">Traffic Requirement:</h5>
              <p className="text-xs">{strategy.trafficRequirement.value}</p>
              {strategy.trafficRequirement.source && strategy.trafficRequirement.source !== 'None' && (
                <a
                  href={strategy.trafficRequirement.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  Source <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {strategy.trafficRequirement.confidence && (
                <span className="text-xs text-muted-foreground ml-2">
                  ({strategy.trafficRequirement.confidence} confidence)
                </span>
              )}
            </div>
          )}

          <div className="pt-2 border-t border-border">
            <h5 className="font-medium text-xs mb-1">Formula:</h5>
            <code className="text-xs bg-muted p-1 rounded block break-all">
              {strategy.formula}
            </code>
          </div>

          <div>
            <h5 className="font-medium text-xs mb-1">Inputs:</h5>
            <ul className="text-xs space-y-1">
              {strategy.inputs && Object.entries(strategy.inputs).map(([key, value]) => (
                <li key={key}>
                  • {key.replace(/_/g, ' ')}: {typeof value === 'number'
                    ? value.toLocaleString()
                    : value}
                </li>
              ))}
              {(!strategy.inputs || Object.keys(strategy.inputs).length === 0) && (
                <li className="text-muted-foreground italic">No inputs available</li>
              )}
            </ul>
          </div>

          <div>
            <h5 className="font-medium text-xs mb-1">Parameters:</h5>
            <ul className="text-xs space-y-1">
              {Object.entries(strategy.parameters).map(([key, param]) => (
                <li key={key}>
                  • {key.replace(/_/g, ' ')}: {typeof param.value === 'number' ? param.value : param.value}
                  {param.source && param.source !== 'None' && (
                    <a
                      href={param.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 text-primary hover:underline"
                    >
                      [source]
                    </a>
                  )}
                  {param.confidence && (
                    <span className="ml-1 text-muted-foreground">
                      ({param.confidence} confidence)
                    </span>
                  )}
                </li>
              ))}
            </ul>
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
        <div className="flex flex-col gap-1">
          {strategy.company && (
            <span className="text-xs text-muted-foreground">{strategy.company}</span>
          )}
          <span className="font-medium">
            {strategy.programName}
          </span>
          {strategy.officialUrl && (
            <a
              href={strategy.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              Learn more <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
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
    </TableRow>
  );
}

interface ConfigHistory {
  id: string;
  created_at: string;
  version: number;
  is_active: boolean;
  config: unknown;
}

export function AdRevenueEstimator() {
  const { data, loading, period, setPeriod, refetch } = useAdRevenue();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [configs, setConfigs] = useState<ConfigHistory[]>([]);
  const [showConfigs, setShowConfigs] = useState(false);

  const bestRevenue = data?.strategyEstimates && data.strategyEstimates.length > 0
    ? data.strategyEstimates.reduce((max, curr) =>
        curr.estimatedRevenue > max.estimatedRevenue ? curr : max
      , data.strategyEstimates[0])
    : null;

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      const config = JSON.parse(text);

      // Validate config structure
      if (!config.programs || typeof config.programs !== 'object') {
        throw new Error('Invalid config: missing "programs" object');
      }

      // Validate each program
      for (const [key, program] of Object.entries(config.programs)) {
        const p = program as any;
        if (!Array.isArray(p.strategies)) {
          throw new Error(`Invalid config: program "${key}" missing strategies array`);
        }
        for (const strategy of p.strategies) {
          if (!strategy.parameters || typeof strategy.parameters !== 'object') {
            throw new Error(`Invalid config: strategy "${strategy.name}" in "${key}" missing parameters object`);
          }
        }
      }

      // Get the next version number
      const { data: versionData } = await supabase
        .from('ad_config')
        .select('version')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      const newVersion = (versionData?.version || 0) + 1;

      // Deactivate all existing configs
      const { error: deactivateError } = await supabase
        .from('ad_config')
        .update({ is_active: false })
        .eq('is_active', true);

      if (deactivateError) throw deactivateError;

      // Insert new config as active
      const { error: insertError } = await supabase
        .from('ad_config')
        .insert({
          config,
          version: newVersion,
          is_active: true
        });

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "Ad configuration uploaded and activated successfully",
      });

      await fetchConfigs();
      refetch();
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload configuration",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const fetchConfigs = async () => {
    const { data: configData, error } = await supabase
      .from('ad_config')
      .select('id, created_at, version, is_active, config')
      .order('version', { ascending: false });

    if (!error && configData) {
      setConfigs(configData);
    }
  };

  const activateConfig = async (configId: string) => {
    try {
      // Deactivate all configs
      const { error: deactivateError } = await supabase
        .from('ad_config')
        .update({ is_active: false })
        .eq('is_active', true);

      if (deactivateError) throw deactivateError;

      // Activate the selected config
      const { error: activateError } = await supabase
        .from('ad_config')
        .update({ is_active: true })
        .eq('id', configId);

      if (activateError) throw activateError;

      toast({
        title: "Success",
        description: "Configuration activated successfully",
      });

      await fetchConfigs();
      refetch();
    } catch (error) {
      console.error("Activate error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to activate configuration",
        variant: "destructive",
      });
    }
  };

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
        <label className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition cursor-pointer inline-flex items-center gap-2">
          <Upload className="w-4 h-4" />
          {uploading ? "Uploading..." : "Upload Config"}
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
        <button
          onClick={async () => {
            await fetchConfigs();
            setShowConfigs(!showConfigs);
          }}
          className="px-3 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition inline-flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          {showConfigs ? "Hide" : "Show"} Config History
        </button>
      </div>

      {showConfigs && (
        <div className="bg-card rounded-xl shadow p-5">
          <h3 className="text-lg font-semibold text-card-foreground mb-3">Configuration History</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Programs</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => {
                  const programCount = config.config && typeof config.config === 'object' && 'programs' in config.config
                    ? Object.keys(config.config.programs as object).length
                    : 0;

                  return (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">v{config.version}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(config.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {config.is_active ? (
                          <span className="text-green-600 font-medium">Active</span>
                        ) : (
                          <span className="text-gray-400">Inactive</span>
                        )}
                      </TableCell>
                      <TableCell>{programCount} programs</TableCell>
                      <TableCell>
                        {!config.is_active && (
                          <button
                            onClick={() => activateConfig(config.id)}
                            className="text-blue-600 hover:underline text-sm"
                          >
                            Activate
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {configs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No configurations found. Upload a JSON config to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.strategyEstimates.map((strategy, idx) => (
                    <StrategyRow key={`${strategy.programKey}-${strategy.strategyName}-${idx}`} strategy={strategy} />
                  ))}
                  {data.strategyEstimates.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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
