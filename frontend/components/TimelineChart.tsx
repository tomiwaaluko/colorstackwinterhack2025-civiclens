"use client";

import { useEffect, useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { TimelineResponse, TimelineEvent, EventType } from "@/lib/types";
import { getPoliticianTimeline } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LoadingSpinner from "./LoadingSpinner";
import { Badge } from "@/components/ui/badge";

interface TimelineChartProps {
  politicianId: number;
  startDate?: string;
  endDate?: string;
  eventTypes?: EventType[];
}

export default function TimelineChart({
  politicianId,
  startDate,
  endDate,
  eventTypes,
}: TimelineChartProps) {
  const [timelineData, setTimelineData] = useState<TimelineResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    getPoliticianTimeline(politicianId, {
      start_date: startDate,
      end_date: endDate,
      event_types: eventTypes,
    })
      .then((data) => {
        setTimelineData(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load timeline:", err);
        setError(err.message || "Failed to load timeline data");
        setIsLoading(false);
      });
  }, [politicianId, startDate, endDate, eventTypes]);

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

    // Group events by date and type
    const eventsByDate = timelineData.events.reduce((acc, event) => {
      const date = event.date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(event);
      return acc;
    }, {} as Record<string, TimelineEvent[]>);

    const dates = Object.keys(eventsByDate).sort();

    // Prepare data series for each event type
    const typeColors: Record<EventType, string> = {
      vote: "#3b82f6",
      donation: "#10b981",
      statement: "#f59e0b",
      bill_sponsor: "#8b5cf6",
    };

    const typeLabels: Record<EventType, string> = {
      vote: "Votes",
      donation: "Donations",
      statement: "Statements",
      bill_sponsor: "Bills",
    };

    const series = (["vote", "donation", "statement", "bill_sponsor"] as EventType[]).map(
      (type) => ({
        name: typeLabels[type],
        type: "scatter",
        symbolSize: (value: number[]) => {
          const count = value[2] as number;
          return Math.max(10, Math.min(30, count * 5));
        },
        itemStyle: {
          color: typeColors[type],
        },
        data: dates.flatMap((date) => {
          const events = eventsByDate[date];
          const typeEvents = events.filter((e) => e.type === type);
          if (typeEvents.length === 0) return [];
          
          return [
            [
              date,
              typeEvents.length,
              typeEvents.length,
              typeEvents.map((e) => e.title).join(", "),
            ],
          ];
        }),
      })
    );

    return {
      title: {
        text: "Timeline of Events",
        left: "center",
      },
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          const [date, count, , titles] = params.value;
          return `${date}<br/>${params.seriesName}: ${count} event(s)<br/>${titles}`;
        },
      },
      legend: {
        data: ["Votes", "Donations", "Statements", "Bills"],
        bottom: 10,
      },
      grid: {
        left: "10%",
        right: "10%",
        top: "15%",
        bottom: "15%",
      },
      xAxis: {
        type: "time",
        name: "Date",
        nameLocation: "middle",
        nameGap: 30,
        axisLabel: {
          formatter: (value: string) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getFullYear()}`;
          },
        },
      },
      yAxis: {
        type: "value",
        name: "Event Count",
        nameLocation: "middle",
        nameGap: 50,
      },
      series,
      dataZoom: [
        {
          type: "slider",
          xAxisIndex: 0,
          start: 0,
          end: 100,
        },
        {
          type: "inside",
          xAxisIndex: 0,
        },
      ],
    };
  }, [timelineData]);

  const eventCounts = useMemo(() => {
    if (!timelineData) return {};
    return timelineData.events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<EventType, number>);
  }, [timelineData]);

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
        <CardTitle>Timeline</CardTitle>
        <CardDescription>Chronological view of votes, donations, and statements</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Event counts */}
        {Object.keys(eventCounts).length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {Object.entries(eventCounts).map(([type, count]) => (
              <Badge key={type} variant="secondary">
                {type}: {String(count)}
              </Badge>
            ))}
          </div>
        )}

        {/* Chart */}
        <div className="h-[400px]">
          <ReactECharts option={chartOption} style={{ height: "100%", width: "100%" }} />
        </div>

        {/* Event list */}
        {timelineData && timelineData.events.length > 0 && (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            <h3 className="font-semibold text-sm">Recent Events</h3>
            {timelineData.events.slice(0, 10).map((event) => (
              <div
                key={event.id}
                className="p-2 border rounded text-sm hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
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

