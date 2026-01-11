"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Lightbulb,
  TrendingUp,
  BarChart2,
  Target,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
} from "lucide-react";
import {
  getVisualizationInsights,
  type InsightsResponse,
  type Insight,
  type InsightType,
  type VisualizationType,
  type ConfidenceLevel,
} from "@/lib/visualization-ai";

interface VisualizationInsightsProps {
  visualizationType: VisualizationType;
  filters: Record<string, unknown>;
  dataSummary: Record<string, unknown>;
  selectedItems?: string[];
  onSuggestedAction?: (action: string) => void;
  className?: string;
  autoRefresh?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const INSIGHT_ICONS: Record<InsightType, React.ReactNode> = {
  key_finding: <Target className="h-4 w-4" />,
  comparison: <BarChart2 className="h-4 w-4" />,
  trend: <TrendingUp className="h-4 w-4" />,
  concentration: <Lightbulb className="h-4 w-4" />,
  pattern_alert: <AlertTriangle className="h-4 w-4" />,
};

const INSIGHT_COLORS: Record<InsightType, string> = {
  key_finding: "bg-blue-100 text-blue-800 border-blue-200",
  comparison: "bg-purple-100 text-purple-800 border-purple-200",
  trend: "bg-green-100 text-green-800 border-green-200",
  concentration: "bg-amber-100 text-amber-800 border-amber-200",
  pattern_alert: "bg-red-100 text-red-800 border-red-200",
};

const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  high: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-gray-100 text-gray-700",
};

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div
      className={`p-3 rounded-lg border ${INSIGHT_COLORS[insight.type]} transition-all hover:shadow-sm`}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5">{INSIGHT_ICONS[insight.type]}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-sm">{insight.title}</h4>
            <Badge
              variant="outline"
              className={`text-xs ${CONFIDENCE_COLORS[insight.confidence]}`}
            >
              {insight.confidence}
            </Badge>
          </div>
          <p className="text-sm mt-1 opacity-90">{insight.description}</p>
          {insight.data_points.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {insight.data_points.map((point, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {point}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VisualizationInsights({
  visualizationType,
  filters,
  dataSummary,
  selectedItems = [],
  onSuggestedAction,
  className = "",
  autoRefresh = true,
  collapsed: controlledCollapsed,
  onToggleCollapse,
}: VisualizationInsightsProps) {
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  // Use controlled or internal collapsed state
  const collapsed = controlledCollapsed ?? internalCollapsed;
  const handleToggle = onToggleCollapse ?? (() => setInternalCollapsed(!internalCollapsed));

  const fetchInsights = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getVisualizationInsights({
        visualization_type: visualizationType,
        filters,
        data_summary: dataSummary,
        selected_items: selectedItems,
      });
      setInsights(result);
    } catch (err) {
      setError("Failed to generate insights");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [visualizationType, filters, dataSummary, selectedItems]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoRefresh) {
      fetchInsights();
    }
  }, [fetchInsights, autoRefresh]);

  return (
    <Card className={`${className} overflow-hidden`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base">AI Insights</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchInsights}
              disabled={isLoading}
              className="h-8 w-8 p-0"
              title="Refresh insights"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggle}
              className="h-8 w-8 p-0"
              title={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        {!collapsed && (
          <CardDescription className="text-xs">
            AI-generated analysis of your current visualization
          </CardDescription>
        )}
      </CardHeader>

      {!collapsed && (
        <CardContent className="pt-2 space-y-3">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">
                Analyzing visualization...
              </span>
            </div>
          )}

          {error && !isLoading && (
            <div className="flex items-center justify-center py-6 text-red-500">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <span className="text-sm">{error}</span>
              <Button
                variant="link"
                size="sm"
                onClick={fetchInsights}
                className="ml-2"
              >
                Retry
              </Button>
            </div>
          )}

          {insights && !isLoading && (
            <>
              {/* Summary */}
              <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-100">
                <p className="text-sm text-amber-900">{insights.summary}</p>
              </div>

              {/* Insights */}
              <div className="space-y-2">
                {insights.insights.map((insight, idx) => (
                  <InsightCard key={idx} insight={insight} />
                ))}
              </div>

              {/* Suggested Action */}
              {insights.suggested_action && (
                <div className="pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left h-auto py-2"
                    onClick={() => onSuggestedAction?.(insights.suggested_action!)}
                  >
                    <Lightbulb className="h-4 w-4 mr-2 text-amber-500 flex-shrink-0" />
                    <span className="text-xs text-gray-600">
                      {insights.suggested_action}
                    </span>
                  </Button>
                </div>
              )}
            </>
          )}

          {!insights && !isLoading && !error && (
            <div className="flex flex-col items-center justify-center py-6 text-gray-400">
              <Sparkles className="h-8 w-8 mb-2" />
              <p className="text-sm">Click refresh to generate insights</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
