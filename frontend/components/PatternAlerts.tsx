"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  BellRing,
  X,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import type { VisualizationType } from "@/lib/visualization-ai";

export interface PatternAlert {
  id: string;
  type: "spike" | "drop" | "trend" | "anomaly" | "correlation";
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  dataPoints?: string[];
  timestamp: Date;
  dismissed?: boolean;
}

interface PatternAlertsProps {
  visualizationType: VisualizationType;
  dataSummary: Record<string, unknown>;
  className?: string;
  onAlertClick?: (alert: PatternAlert) => void;
  maxAlerts?: number;
}

const ALERT_ICONS: Record<PatternAlert["type"], React.ReactNode> = {
  spike: <TrendingUp className="h-4 w-4" />,
  drop: <TrendingDown className="h-4 w-4" />,
  trend: <ArrowUpRight className="h-4 w-4" />,
  anomaly: <AlertTriangle className="h-4 w-4" />,
  correlation: <Sparkles className="h-4 w-4" />,
};

const ALERT_COLORS: Record<PatternAlert["type"], string> = {
  spike: "border-green-500 bg-green-50",
  drop: "border-red-500 bg-red-50",
  trend: "border-blue-500 bg-blue-50",
  anomaly: "border-amber-500 bg-amber-50",
  correlation: "border-purple-500 bg-purple-50",
};

const SEVERITY_COLORS: Record<PatternAlert["severity"], string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-red-100 text-red-700",
};

// Demo alerts based on visualization type
function generateDemoAlerts(
  visualizationType: VisualizationType,
  dataSummary: Record<string, unknown>
): PatternAlert[] {
  const now = new Date();

  const baseAlerts: PatternAlert[] = [
    {
      id: "alert-1",
      type: "spike",
      severity: "high",
      title: "Donation Spike Detected",
      description:
        "Healthcare donations increased 45% in Q4 2023, coinciding with the ACA amendment vote.",
      dataPoints: ["Q4 2023: $1.2M", "Q3 2023: $820K", "+45% change"],
      timestamp: new Date(now.getTime() - 3600000),
    },
    {
      id: "alert-2",
      type: "correlation",
      severity: "medium",
      title: "Potential Correlation Found",
      description:
        "Energy sector donations show 78% correlation with pro-fossil fuel voting patterns.",
      dataPoints: ["Correlation: 0.78", "Sample size: 24 votes"],
      timestamp: new Date(now.getTime() - 7200000),
    },
    {
      id: "alert-3",
      type: "trend",
      severity: "low",
      title: "Upward Trend",
      description:
        "Technology sector donations growing steadily at 12% quarterly since 2022.",
      dataPoints: ["2022 Q1: $450K", "2024 Q1: $780K"],
      timestamp: new Date(now.getTime() - 86400000),
    },
  ];

  // Filter alerts based on visualization type
  switch (visualizationType) {
    case "donations_map":
      return baseAlerts;
    case "timeline":
      return baseAlerts.filter((a) => a.type === "spike" || a.type === "trend");
    case "network_graph":
      return baseAlerts.filter(
        (a) => a.type === "correlation" || a.type === "anomaly"
      );
    case "radial_chart":
      return baseAlerts.filter((a) => a.type === "spike" || a.type === "drop");
    default:
      return baseAlerts.slice(0, 2);
  }
}

export default function PatternAlerts({
  visualizationType,
  dataSummary,
  className = "",
  onAlertClick,
  maxAlerts = 5,
}: PatternAlertsProps) {
  const [alerts, setAlerts] = useState<PatternAlert[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Generate alerts based on visualization state
  useEffect(() => {
    const newAlerts = generateDemoAlerts(visualizationType, dataSummary);
    setAlerts(newAlerts);
  }, [visualizationType, dataSummary]);

  const visibleAlerts = alerts
    .filter((a) => !dismissedIds.has(a.id))
    .slice(0, maxAlerts);

  const highSeverityCount = visibleAlerts.filter(
    (a) => a.severity === "high"
  ).length;

  const dismissAlert = useCallback((alertId: string) => {
    setDismissedIds((prev) => new Set([...prev, alertId]));
  }, []);

  const dismissAll = useCallback(() => {
    setDismissedIds(new Set(alerts.map((a) => a.id)));
  }, [alerts]);

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`relative ${className}`}
        >
          {highSeverityCount > 0 ? (
            <BellRing className="h-4 w-4 text-amber-500 animate-pulse" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          <span className="ml-1">Alerts</span>
          {visibleAlerts.length > 0 && (
            <Badge
              variant={highSeverityCount > 0 ? "destructive" : "secondary"}
              className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {visibleAlerts.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="font-semibold text-sm">Pattern Alerts</span>
          </div>
          <Button variant="ghost" size="sm" onClick={dismissAll}>
            Clear all
          </Button>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {visibleAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer ${ALERT_COLORS[alert.type]}`}
              onClick={() => {
                onAlertClick?.(alert);
                setIsOpen(false);
              }}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{ALERT_ICONS[alert.type]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{alert.title}</span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${SEVERITY_COLORS[alert.severity]}`}
                    >
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {alert.description}
                  </p>
                  {alert.dataPoints && alert.dataPoints.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {alert.dataPoints.map((point, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-xs"
                        >
                          {point}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <span className="text-xs text-gray-400 mt-1 block">
                    {alert.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissAlert(alert.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {visibleAlerts.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No active alerts</p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Export alert badge component for inline use
export function AlertBadge({
  count,
  severity = "medium",
  onClick,
}: {
  count: number;
  severity?: PatternAlert["severity"];
  onClick?: () => void;
}) {
  if (count === 0) return null;

  return (
    <Badge
      variant={severity === "high" ? "destructive" : "secondary"}
      className="cursor-pointer animate-pulse"
      onClick={onClick}
    >
      <AlertTriangle className="h-3 w-3 mr-1" />
      {count} {count === 1 ? "alert" : "alerts"}
    </Badge>
  );
}
