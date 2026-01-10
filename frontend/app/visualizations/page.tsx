"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// Dynamic imports to avoid SSR issues with browser-only libraries
const DonationsMap = dynamic(() => import("@/components/DonationsMap"), {
  ssr: false,
  loading: () => <div className="h-[500px] flex items-center justify-center">Loading map...</div>,
});

const TimelineChart = dynamic(() => import("@/components/TimelineChart"), {
  ssr: false,
  loading: () => <div className="h-[400px] flex items-center justify-center">Loading timeline...</div>,
});

const NetworkGraph = dynamic(() => import("@/components/NetworkGraph"), {
  ssr: false,
  loading: () => <div className="h-[600px] flex items-center justify-center">Loading network graph...</div>,
});

const RadialChart = dynamic(() => import("@/components/RadialChart"), {
  ssr: false,
  loading: () => <div className="h-[500px] flex items-center justify-center">Loading chart...</div>,
});
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function VisualizationsPage() {
  const [donationsFilters, setDonationsFilters] = useState({
    politicianIds: [] as number[],
    category: "",
    startDate: "",
    endDate: "",
  });

  const [timelineFilters, setTimelineFilters] = useState({
    politicianId: "",
    startDate: "",
    endDate: "",
    eventTypes: [] as string[],
  });

  const [networkFilters, setNetworkFilters] = useState({
    politicianIds: [] as number[],
    includeIndirect: false,
  });

  const [radialFilters, setRadialFilters] = useState({
    politicianId: "",
    startDate: "",
    endDate: "",
  });

  const parsePoliticianIds = (value: string): number[] => {
    if (!value.trim()) return [];
    return value
      .split(",")
      .map((id) => parseInt(id.trim()))
      .filter((id) => !isNaN(id));
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Interactive Visualizations</h1>
        <p className="text-gray-600">
          Explore donation data, timelines, networks, and relationships through interactive visualizations
        </p>
      </div>

      <Tabs defaultValue="map" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="map">Donations Map</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="network">Network Graph</TabsTrigger>
          <TabsTrigger value="radial">Radial Chart</TabsTrigger>
        </TabsList>

        {/* Donations Map Tab */}
        <TabsContent value="map" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Filter donations map data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="map-politician-ids">Politician IDs (comma-separated)</Label>
                  <Input
                    id="map-politician-ids"
                    placeholder="1, 2, 3"
                    value={donationsFilters.politicianIds.join(", ")}
                    onChange={(e) =>
                      setDonationsFilters({
                        ...donationsFilters,
                        politicianIds: parsePoliticianIds(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="map-category">Category</Label>
                  <Input
                    id="map-category"
                    placeholder="Technology, Healthcare, etc."
                    value={donationsFilters.category}
                    onChange={(e) =>
                      setDonationsFilters({ ...donationsFilters, category: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="map-start-date">Start Date</Label>
                  <Input
                    id="map-start-date"
                    type="date"
                    value={donationsFilters.startDate}
                    onChange={(e) =>
                      setDonationsFilters({ ...donationsFilters, startDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="map-end-date">End Date</Label>
                  <Input
                    id="map-end-date"
                    type="date"
                    value={donationsFilters.endDate}
                    onChange={(e) =>
                      setDonationsFilters({ ...donationsFilters, endDate: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <DonationsMap
            politicianIds={
              donationsFilters.politicianIds.length > 0 ? donationsFilters.politicianIds : undefined
            }
            category={donationsFilters.category || undefined}
            startDate={donationsFilters.startDate || undefined}
            endDate={donationsFilters.endDate || undefined}
          />
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Filter timeline data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="timeline-politician-id">Politician ID</Label>
                  <Input
                    id="timeline-politician-id"
                    type="number"
                    placeholder="1"
                    value={timelineFilters.politicianId}
                    onChange={(e) =>
                      setTimelineFilters({ ...timelineFilters, politicianId: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="timeline-start-date">Start Date</Label>
                  <Input
                    id="timeline-start-date"
                    type="date"
                    value={timelineFilters.startDate}
                    onChange={(e) =>
                      setTimelineFilters({ ...timelineFilters, startDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="timeline-end-date">End Date</Label>
                  <Input
                    id="timeline-end-date"
                    type="date"
                    value={timelineFilters.endDate}
                    onChange={(e) =>
                      setTimelineFilters({ ...timelineFilters, endDate: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {timelineFilters.politicianId && (
            <TimelineChart
              politicianId={parseInt(timelineFilters.politicianId)}
              startDate={timelineFilters.startDate || undefined}
              endDate={timelineFilters.endDate || undefined}
            />
          )}
          {!timelineFilters.politicianId && (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                Please enter a Politician ID to view the timeline
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Network Graph Tab */}
        <TabsContent value="network" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Filter network graph data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="network-politician-ids">Politician IDs (comma-separated)</Label>
                  <Input
                    id="network-politician-ids"
                    placeholder="1, 2, 3"
                    value={networkFilters.politicianIds.join(", ")}
                    onChange={(e) =>
                      setNetworkFilters({
                        ...networkFilters,
                        politicianIds: parsePoliticianIds(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="network-include-indirect">Include Indirect Relationships</Label>
                  <Select
                    value={networkFilters.includeIndirect ? "yes" : "no"}
                    onValueChange={(value) =>
                      setNetworkFilters({
                        ...networkFilters,
                        includeIndirect: value === "yes",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <NetworkGraph
            politicianIds={
              networkFilters.politicianIds.length > 0 ? networkFilters.politicianIds : undefined
            }
            includeIndirect={networkFilters.includeIndirect}
          />
        </TabsContent>

        {/* Radial Chart Tab */}
        <TabsContent value="radial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Filter radial chart data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="radial-politician-id">Politician ID</Label>
                  <Input
                    id="radial-politician-id"
                    type="number"
                    placeholder="1"
                    value={radialFilters.politicianId}
                    onChange={(e) =>
                      setRadialFilters({ ...radialFilters, politicianId: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="radial-start-date">Start Date</Label>
                  <Input
                    id="radial-start-date"
                    type="date"
                    value={radialFilters.startDate}
                    onChange={(e) =>
                      setRadialFilters({ ...radialFilters, startDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="radial-end-date">End Date</Label>
                  <Input
                    id="radial-end-date"
                    type="date"
                    value={radialFilters.endDate}
                    onChange={(e) =>
                      setRadialFilters({ ...radialFilters, endDate: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {radialFilters.politicianId && (
            <RadialChart
              politicianId={parseInt(radialFilters.politicianId)}
              startDate={radialFilters.startDate || undefined}
              endDate={radialFilters.endDate || undefined}
            />
          )}
          {!radialFilters.politicianId && (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                Please enter a Politician ID to view the radial chart
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

