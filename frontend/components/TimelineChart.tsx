"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import ReactECharts from "echarts-for-react";
import type { 
  TimelineResponse, 
  TimelineEvent, 
  EventType, 
  TimelineCluster,
  VisualizationCitation 
} from "@/lib/types";
import { getPoliticianTimeline } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import LoadingSpinner from "./LoadingSpinner";
import { 
  ChevronDown, 
  ChevronRight, 
  AlertTriangle, 
  Link2, 
  ExternalLink,
  Users,
  Eye,
  EyeOff
} from "lucide-react";

// Event type colors
const TYPE_COLORS: Record<EventType, string> = {
  vote: "#3b82f6",
  donation: "#10b981",
  statement: "#f59e0b",
  bill_sponsor: "#8b5cf6",
};

const TYPE_LABELS: Record<EventType, string> = {
  vote: "Votes",
  donation: "Donations",
  statement: "Statements",
  bill_sponsor: "Bills",
};

// Topic colors for clustering
const TOPIC_COLORS: Record<string, string> = {
  Healthcare: "#ef4444",
  Energy: "#f59e0b",
  Technology: "#3b82f6",
  Finance: "#10b981",
  Defense: "#6b7280",
  Education: "#8b5cf6",
  Environment: "#22c55e",
  Immigration: "#ec4899",
  Other: "#9ca3af",
};

// Politician colors for comparative mode
const POLITICIAN_COLORS = [
  "#3b82f6", // Blue
  "#ef4444", // Red
  "#10b981", // Green
  "#f59e0b", // Amber
  "#8b5cf6", // Purple
];

interface TimelineChartProps {
  politicianId: number;
  startDate?: string;
  endDate?: string;
  eventTypes?: EventType[];
  // New props for enhanced features
  showClustering?: boolean;
  showCrossReference?: boolean;
  comparativePoliticians?: Array<{ id: number; name: string; party: string }>;
  onEventClick?: (event: TimelineEvent) => void;
  onCitationClick?: (citations: VisualizationCitation[]) => void;
}

export default function TimelineChart({
  politicianId,
  startDate,
  endDate,
  eventTypes,
  showClustering = true,
  showCrossReference = true,
  comparativePoliticians = [],
  onEventClick,
  onCitationClick,
}: TimelineChartProps) {
  const [timelineData, setTimelineData] = useState<TimelineResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Enhanced state
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [highlightedEvents, setHighlightedEvents] = useState<Set<string>>(new Set());
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"single" | "comparative">("single");
  const [comparativeData, setComparativeData] = useState<Record<number, TimelineResponse>>({});
  const [visibleTypes, setVisibleTypes] = useState<Set<EventType>>(
    new Set(["vote", "donation", "statement", "bill_sponsor"])
  );
  const [showRelatedWarning, setShowRelatedWarning] = useState(false);
  
  const chartRef = useRef<any>(null);

  // Load primary politician timeline
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    getPoliticianTimeline(politicianId, {
      start_date: startDate,
      end_date: endDate,
      event_types: eventTypes,
    })
      .then((data) => {
        // Generate clusters if not provided
        const enrichedData = enrichTimelineData(data);
        setTimelineData(enrichedData);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load timeline:", err);
        setError(err.message || "Failed to load timeline data");
        setIsLoading(false);
      });
  }, [politicianId, startDate, endDate, eventTypes]);

  // Load comparative data for multiple politicians
  useEffect(() => {
    if (viewMode !== "comparative" || comparativePoliticians.length === 0) return;

    Promise.all(
      comparativePoliticians.map((pol) =>
        getPoliticianTimeline(pol.id, {
          start_date: startDate,
          end_date: endDate,
          event_types: eventTypes,
        }).then((data) => ({ id: pol.id, data: enrichTimelineData(data) }))
      )
    ).then((results) => {
      const newData: Record<number, TimelineResponse> = {};
      results.forEach(({ id, data }) => {
        newData[id] = data;
      });
      setComparativeData(newData);
    });
  }, [viewMode, comparativePoliticians, startDate, endDate, eventTypes]);

  // Enrich timeline data with generated clusters
  const enrichTimelineData = (data: TimelineResponse): TimelineResponse => {
    if (data.clusters && data.clusters.length > 0) return data;
    
    // Generate clusters based on topic and date proximity
    const clusters: TimelineCluster[] = [];
    const eventsByTopic: Record<string, TimelineEvent[]> = {};
    
    data.events.forEach((event) => {
      const topic = event.topic || "Other";
      if (!eventsByTopic[topic]) eventsByTopic[topic] = [];
      eventsByTopic[topic].push(event);
    });
    
    Object.entries(eventsByTopic).forEach(([topic, events]) => {
      if (events.length >= 2) {
        const sortedEvents = [...events].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        // Group events within 30 days of each other
        let currentCluster: TimelineEvent[] = [sortedEvents[0]];
        
        for (let i = 1; i < sortedEvents.length; i++) {
          const prevDate = new Date(sortedEvents[i - 1].date);
          const currDate = new Date(sortedEvents[i].date);
          const daysDiff = Math.abs(currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
          
          if (daysDiff <= 30) {
            currentCluster.push(sortedEvents[i]);
          } else {
            if (currentCluster.length >= 2) {
              clusters.push({
                id: `cluster-${topic}-${clusters.length}`,
                name: `${topic} (${currentCluster.length} events)`,
                topic,
                start_date: currentCluster[0].date,
                end_date: currentCluster[currentCluster.length - 1].date,
                event_ids: currentCluster.map((e) => e.id),
                event_count: currentCluster.length,
              });
            }
            currentCluster = [sortedEvents[i]];
          }
        }
        
        if (currentCluster.length >= 2) {
          clusters.push({
            id: `cluster-${topic}-${clusters.length}`,
            name: `${topic} (${currentCluster.length} events)`,
            topic,
            start_date: currentCluster[0].date,
            end_date: currentCluster[currentCluster.length - 1].date,
            event_ids: currentCluster.map((e) => e.id),
            event_count: currentCluster.length,
          });
        }
      }
    });
    
    return { ...data, clusters };
  };

  // Find related events (within 14 days, different type)
  const findRelatedEvents = useCallback((event: TimelineEvent): TimelineEvent[] => {
    if (!timelineData) return [];
    
    const eventDate = new Date(event.date);
    const related: TimelineEvent[] = [];
    
    timelineData.events.forEach((e) => {
      if (e.id === event.id) return;
      
      const eDate = new Date(e.date);
      const daysDiff = Math.abs(eventDate.getTime() - eDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // Related if within 14 days and different type
      if (daysDiff <= 14 && e.type !== event.type) {
        related.push(e);
      }
    });
    
    return related;
  }, [timelineData]);

  // Handle event click - highlight related events
  const handleEventClick = useCallback((event: TimelineEvent) => {
    setSelectedEvent(event);
    onEventClick?.(event);
    
    if (showCrossReference) {
      const related = findRelatedEvents(event);
      setHighlightedEvents(new Set([event.id, ...related.map((e) => e.id)]));
      
      // Show correlation warning when highlighting donations + votes
      if (
        (event.type === "vote" && related.some((e) => e.type === "donation")) ||
        (event.type === "donation" && related.some((e) => e.type === "vote"))
      ) {
        setShowRelatedWarning(true);
      }
    }
  }, [showCrossReference, findRelatedEvents, onEventClick]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedEvent(null);
    setHighlightedEvents(new Set());
    setShowRelatedWarning(false);
  }, []);

  // Toggle cluster expansion
  const toggleCluster = useCallback((clusterId: string) => {
    setExpandedClusters((prev) => {
      const next = new Set(prev);
      if (next.has(clusterId)) {
        next.delete(clusterId);
      } else {
        next.add(clusterId);
      }
      return next;
    });
  }, []);

  // Toggle event type visibility
  const toggleEventType = useCallback((type: EventType) => {
    setVisibleTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  // Calculate event counts
  const eventCounts = useMemo((): Record<EventType, number> => {
    if (!timelineData) return {} as Record<EventType, number>;
    return timelineData.events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<EventType, number>);
  }, [timelineData]);

  // Chart options for single politician view
  const chartOption = useMemo(() => {
    if (!timelineData || timelineData.events.length === 0) {
      return {
        title: {
          text: "No timeline data available",
          left: "center",
          textStyle: { color: "#666" },
        },
      };
    }

    // Filter events by visible types
    const filteredEvents = timelineData.events.filter((e) => visibleTypes.has(e.type));
    
    // Group events by date and type
    const eventsByDate = filteredEvents.reduce((acc, event) => {
      const date = event.date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(event);
      return acc;
    }, {} as Record<string, TimelineEvent[]>);

    const dates = Object.keys(eventsByDate).sort();

    const series = (["vote", "donation", "statement", "bill_sponsor"] as EventType[])
      .filter((type) => visibleTypes.has(type))
      .map((type) => ({
        name: TYPE_LABELS[type],
        type: "scatter",
        symbolSize: (value: number[]) => {
          const eventId = String(value[4]);
          const isHighlighted = highlightedEvents.has(eventId);
          const count = value[2] as number;
          const baseSize = Math.max(12, Math.min(35, count * 6));
          return isHighlighted ? baseSize * 1.5 : baseSize;
        },
        itemStyle: {
          color: (params: any) => {
            const eventId = params.value[4] as string;
            const isHighlighted = highlightedEvents.has(eventId);
            const baseColor = TYPE_COLORS[type];
            return isHighlighted ? baseColor : baseColor + "CC";
          },
          borderWidth: (params: any) => {
            const eventId = params.value[4] as string;
            return highlightedEvents.has(eventId) ? 3 : 0;
          },
          borderColor: "#000",
        },
        emphasis: {
          itemStyle: {
            borderWidth: 2,
            borderColor: "#000",
          },
        },
        data: dates.flatMap((date) => {
          const events = eventsByDate[date];
          const typeEvents = events.filter((e) => e.type === type);
          if (typeEvents.length === 0) return [];
          
          return typeEvents.map((event, idx) => [
            date,
            idx + 1 + (type === "vote" ? 0 : type === "donation" ? 0.3 : type === "statement" ? 0.6 : 0.9),
            typeEvents.length,
            event.title,
            event.id,
            event.outcome || "",
            event.citation_count,
          ]);
        }),
      }));

    // Add cluster markers if clustering is enabled
    if (showClustering && timelineData.clusters && timelineData.clusters.length > 0) {
      const clusterSeries = {
        name: "Clusters",
        type: "scatter",
        symbol: "rect",
        symbolSize: [80, 20],
        itemStyle: {
          color: (params: any) => {
            const topic = params.value[3] as string;
            return TOPIC_COLORS[topic] || TOPIC_COLORS.Other;
          },
          opacity: 0.3,
        },
        data: timelineData.clusters.map((cluster) => [
          cluster.start_date,
          0,
          cluster.event_count,
          cluster.topic,
          cluster.id,
        ]),
        z: 0,
      };
      series.push(clusterSeries as any);
    }

    return {
      title: {
        text: "Timeline of Events",
        left: "center",
        textStyle: { fontSize: 16 },
      },
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          if (params.seriesName === "Clusters") {
            const [date, , count, topic] = params.value;
            return `<strong>${topic} Cluster</strong><br/>
              ${count} events starting ${date}`;
          }
          const [date, , count, title, , outcome, citationCount] = params.value;
          return `<strong>${date}</strong><br/>
            ${params.seriesName}: ${title}<br/>
            ${outcome ? `Outcome: ${outcome}<br/>` : ""}
            ${citationCount > 0 ? `Citations: ${citationCount}` : ""}`;
        },
      },
      legend: {
        data: [...Object.values(TYPE_LABELS).filter((_, i) => 
          visibleTypes.has(Object.keys(TYPE_LABELS)[i] as EventType)
        ), ...(showClustering ? ["Clusters"] : [])],
        bottom: 10,
        selected: Object.fromEntries(
          Object.entries(TYPE_LABELS).map(([type, label]) => [
            label, visibleTypes.has(type as EventType)
          ])
        ),
      },
      grid: {
        left: "8%",
        right: "8%",
        top: "15%",
        bottom: "20%",
      },
      xAxis: {
        type: "time",
        name: "Date",
        nameLocation: "middle",
        nameGap: 35,
        axisLabel: {
          formatter: (value: string) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getFullYear()}`;
          },
        },
      },
      yAxis: {
        type: "value",
        name: "Events",
        nameLocation: "middle",
        nameGap: 40,
        min: 0,
        max: 5,
        axisLabel: { show: false },
        splitLine: { show: false },
      },
      series,
      dataZoom: [
        {
          type: "slider",
          xAxisIndex: 0,
          start: 0,
          end: 100,
          height: 25,
          bottom: 35,
        },
        {
          type: "inside",
          xAxisIndex: 0,
        },
      ],
    };
  }, [timelineData, visibleTypes, highlightedEvents, showClustering]);

  // Chart options for comparative view
  const comparativeChartOption = useMemo(() => {
    if (viewMode !== "comparative" || comparativePoliticians.length === 0) return null;
    
    const allPoliticians = [
      { id: politicianId, name: "Primary", events: timelineData?.events || [] },
      ...comparativePoliticians.map((pol) => ({
        id: pol.id,
        name: pol.name,
        events: comparativeData[pol.id]?.events || [],
      })),
    ];
    
    const series = allPoliticians.map((pol, idx) => ({
      name: pol.name,
      type: "scatter",
      symbolSize: 12,
      itemStyle: {
        color: POLITICIAN_COLORS[idx % POLITICIAN_COLORS.length],
      },
      data: pol.events
        .filter((e) => visibleTypes.has(e.type))
        .map((event) => [
          event.date,
          idx + 1,
          event.title,
          event.type,
          event.outcome || "",
        ]),
    }));
    
    return {
      title: {
        text: "Comparative Timeline",
        left: "center",
      },
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          const [date, , title, type, outcome] = params.value;
          return `<strong>${params.seriesName}</strong><br/>
            ${date}<br/>
            ${TYPE_LABELS[type as EventType]}: ${title}<br/>
            ${outcome ? `Outcome: ${outcome}` : ""}`;
        },
      },
      legend: {
        data: allPoliticians.map((p) => p.name),
        bottom: 10,
      },
      grid: {
        left: "15%",
        right: "8%",
        top: "15%",
        bottom: "20%",
      },
      xAxis: {
        type: "time",
        name: "Date",
        nameLocation: "middle",
        nameGap: 35,
      },
      yAxis: {
        type: "category",
        data: allPoliticians.map((p) => p.name),
        axisLabel: {
          formatter: (value: string) => value.length > 15 ? value.slice(0, 15) + "..." : value,
        },
      },
      series,
      dataZoom: [
        { type: "slider", xAxisIndex: 0, start: 0, end: 100, bottom: 35 },
        { type: "inside", xAxisIndex: 0 },
      ],
    };
  }, [viewMode, comparativePoliticians, politicianId, timelineData, comparativeData, visibleTypes]);

  // Handle chart click
  const handleChartClick = useCallback((params: any) => {
    if (params.seriesName === "Clusters") return;
    
    const eventId = params.value[4];
    const event = timelineData?.events.find((e) => e.id === eventId);
    if (event) {
      handleEventClick(event);
    }
  }, [timelineData, handleEventClick]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>Chronological view of votes, donations, and statements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>Chronological view of votes, donations, and statements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-red-600">
            Error: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>
              Chronological view of votes, donations, and statements
              {showCrossReference && " • Click events to see related activity"}
            </CardDescription>
          </div>
          {comparativePoliticians.length > 0 && (
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "single" | "comparative")}>
              <TabsList>
                <TabsTrigger value="single">Single</TabsTrigger>
                <TabsTrigger value="comparative">
                  <Users className="h-4 w-4 mr-1" />
                  Compare
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Event Type Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-600 mr-2">Show:</span>
          {(Object.entries(TYPE_LABELS) as [EventType, string][]).map(([type, label]) => (
            <Button
              key={type}
              variant={visibleTypes.has(type) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleEventType(type)}
              className="gap-1"
              style={{
                backgroundColor: visibleTypes.has(type) ? TYPE_COLORS[type] : undefined,
                borderColor: TYPE_COLORS[type],
              }}
            >
              {visibleTypes.has(type) ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              {label}
              {eventCounts[type] && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {eventCounts[type]}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Correlation Warning */}
        {showRelatedWarning && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <span className="text-amber-800">
              <strong>Note:</strong> Correlation does not imply causation. Related events are shown 
              based on timing proximity only.
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRelatedWarning(false)}
              className="ml-auto"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Chart */}
        <div className="h-[400px] border rounded-lg">
          <ReactECharts
            ref={chartRef}
            option={viewMode === "comparative" && comparativeChartOption ? comparativeChartOption : chartOption}
            style={{ height: "100%", width: "100%" }}
            onEvents={{
              click: handleChartClick,
            }}
          />
        </div>

        {/* Clusters Section */}
        {showClustering && timelineData?.clusters && timelineData.clusters.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Event Clusters
            </h3>
            <div className="space-y-2">
              {timelineData.clusters.map((cluster) => (
                <div key={cluster.id} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleCluster(cluster.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {expandedClusters.has(cluster.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: TOPIC_COLORS[cluster.topic] || TOPIC_COLORS.Other }}
                      />
                      <span className="font-medium">{cluster.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{cluster.start_date} - {cluster.end_date}</span>
                      <Badge variant="outline">{cluster.event_count} events</Badge>
                    </div>
                  </button>
                  
                  {expandedClusters.has(cluster.id) && (
                    <div className="border-t p-3 bg-gray-50 space-y-2">
                      {timelineData.events
                        .filter((e) => cluster.event_ids.includes(e.id))
                        .map((event) => (
                          <div
                            key={event.id}
                            onClick={() => handleEventClick(event)}
                            className={`p-2 bg-white border rounded cursor-pointer hover:border-gray-400 transition-colors ${
                              selectedEvent?.id === event.id ? "ring-2 ring-blue-500" : ""
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: TYPE_COLORS[event.type] }}
                                />
                                <span className="text-sm font-medium">{event.title}</span>
                              </div>
                              <span className="text-xs text-gray-500">{event.date}</span>
                            </div>
                            {event.outcome && (
                              <Badge
                                variant={event.outcome === "yes" ? "default" : "secondary"}
                                className="mt-1 text-xs"
                              >
                                {event.outcome}
                              </Badge>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Event Detail */}
        {selectedEvent && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: TYPE_COLORS[selectedEvent.type] }}
                  />
                  <h4 className="font-semibold">{selectedEvent.title}</h4>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {TYPE_LABELS[selectedEvent.type]} • {selectedEvent.date}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Clear
              </Button>
            </div>
            
            {selectedEvent.outcome && (
              <Badge variant={selectedEvent.outcome === "yes" ? "default" : "secondary"}>
                Outcome: {selectedEvent.outcome}
              </Badge>
            )}
            
            {/* Related Events */}
            {showCrossReference && highlightedEvents.size > 1 && (
              <div className="pt-2 border-t border-blue-200">
                <p className="text-sm font-medium mb-2">
                  Related Events (within 14 days):
                </p>
                <div className="flex flex-wrap gap-2">
                  {timelineData?.events
                    .filter((e) => highlightedEvents.has(e.id) && e.id !== selectedEvent.id)
                    .slice(0, 5)
                    .map((event) => (
                      <Badge
                        key={event.id}
                        variant="outline"
                        className="cursor-pointer hover:bg-gray-100"
                        style={{ borderColor: TYPE_COLORS[event.type] }}
                        onClick={() => handleEventClick(event)}
                      >
                        {TYPE_LABELS[event.type]}: {event.title.slice(0, 30)}...
                      </Badge>
                    ))}
                </div>
              </div>
            )}
            
            {/* Citations */}
            {selectedEvent.citations.length > 0 && (
              <div className="pt-2 border-t border-blue-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Sources ({selectedEvent.citation_count})
                  </p>
                  {onCitationClick && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onCitationClick(selectedEvent.citations)}
                      className="text-xs"
                    >
                      View all evidence
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedEvent.citations.slice(0, 3).map((citation, idx) => (
                    <a
                      key={idx}
                      href={citation.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {citation.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Event List */}
        {!selectedEvent && timelineData && timelineData.events.length > 0 && (
          <div className="space-y-2 max-h-[250px] overflow-y-auto">
            <h3 className="font-semibold text-sm">Recent Events</h3>
            {timelineData.events
              .filter((e) => visibleTypes.has(e.type))
              .slice(0, 10)
              .map((event) => (
                <div
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  className={`p-2 border rounded text-sm hover:bg-gray-50 transition-colors cursor-pointer ${
                    highlightedEvents.has(event.id) ? "ring-2 ring-blue-300 bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: TYPE_COLORS[event.type] }}
                      />
                      <Badge variant="outline" className="text-xs">
                        {event.type}
                      </Badge>
                      <span className="font-medium">{event.title}</span>
                    </div>
                    <span className="text-gray-500 text-xs">{event.date}</span>
                  </div>
                  {event.outcome && (
                    <div className="mt-1">
                      <Badge variant={event.outcome === "yes" ? "default" : "secondary"}>
                        {event.outcome}
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {(!timelineData || timelineData.events.length === 0) && (
          <div className="text-center text-gray-500 py-8">
            No timeline events found for this politician.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
