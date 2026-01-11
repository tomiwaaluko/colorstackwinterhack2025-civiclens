"use client";

import { useState, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus } from "lucide-react";
import EvidenceDrawer, { toUnifiedCitation, type UnifiedCitation } from "@/components/EvidenceDrawer";

// Demo politicians for comparison - in production this would come from API
const DEMO_POLITICIANS = [
  { id: 1, name: "Alexandria Ocasio-Cortez", party: "Democrat" },
  { id: 2, name: "Ted Cruz", party: "Republican" },
  { id: 3, name: "Bernie Sanders", party: "Independent" },
  { id: 4, name: "Marco Rubio", party: "Republican" },
  { id: 5, name: "Elizabeth Warren", party: "Democrat" },
  { id: 6, name: "Mitch McConnell", party: "Republican" },
];

export default function VisualizationsPage() {
  const [donationsFilters, setDonationsFilters] = useState({
    politicianIds: [] as number[],
    category: "",
    startDate: "",
    endDate: "",
  });

  // Comparative mode state for map
  const [comparativePoliticians, setComparativePoliticians] = useState<
    Array<{ id: number; name: string; party: string }>
  >([]);
  const [selectedPoliticianToAdd, setSelectedPoliticianToAdd] = useState<string>("");

  const [timelineFilters, setTimelineFilters] = useState({
    politicianId: "",
    startDate: "",
    endDate: "",
    eventTypes: [] as string[],
  });
  
  // Timeline comparative mode state
  const [timelineComparePoliticians, setTimelineComparePoliticians] = useState<
    Array<{ id: number; name: string; party: string }>
  >([]);
  const [timelineComparePolitician, setTimelineComparePolitician] = useState<string>("");

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

  // Add politician to comparison
  const addPoliticianToCompare = () => {
    if (!selectedPoliticianToAdd) return;
    const politician = DEMO_POLITICIANS.find((p) => p.id.toString() === selectedPoliticianToAdd);
    if (politician && !comparativePoliticians.some((p) => p.id === politician.id)) {
      if (comparativePoliticians.length < 5) {
        setComparativePoliticians([...comparativePoliticians, politician]);
      }
    }
    setSelectedPoliticianToAdd("");
  };

  // Remove politician from comparison
  const removePoliticianFromCompare = (id: number) => {
    setComparativePoliticians(comparativePoliticians.filter((p) => p.id !== id));
  };
  
  // Timeline comparison helpers
  const addTimelineComparePolitician = () => {
    if (!timelineComparePolitician) return;
    const politician = DEMO_POLITICIANS.find((p) => p.id.toString() === timelineComparePolitician);
    if (politician && !timelineComparePoliticians.some((p) => p.id === politician.id)) {
      if (timelineComparePoliticians.length < 4) {
        setTimelineComparePoliticians([...timelineComparePoliticians, politician]);
      }
    }
    setTimelineComparePolitician("");
  };
  
  const removeTimelineComparePolitician = (id: number) => {
    setTimelineComparePoliticians(timelineComparePoliticians.filter((p) => p.id !== id));
  };
  
  // Evidence Drawer state
  const [evidenceDrawerOpen, setEvidenceDrawerOpen] = useState(false);
  const [evidenceCitations, setEvidenceCitations] = useState<UnifiedCitation[]>([]);
  const [evidenceTitle, setEvidenceTitle] = useState("Source Evidence");
  const [evidenceSubtitle, setEvidenceSubtitle] = useState<string | undefined>();

  // Open evidence drawer with citations
  const openEvidenceDrawer = useCallback((
    citations: any[],
    title?: string,
    subtitle?: string
  ) => {
    const unified = citations.map(c => toUnifiedCitation(c));
    setEvidenceCitations(unified);
    setEvidenceTitle(title || "Source Evidence");
    setEvidenceSubtitle(subtitle);
    setEvidenceDrawerOpen(true);
  }, []);

  // Close evidence drawer
  const closeEvidenceDrawer = useCallback(() => {
    setEvidenceDrawerOpen(false);
  }, []);

  // Timeline event handlers
  const handleTimelineEventClick = (event: any) => {
    console.log("Timeline event clicked:", event);
    if (event.citations && event.citations.length > 0) {
      openEvidenceDrawer(
        event.citations,
        "Event Sources",
        event.title
      );
    }
  };
  
  const handleTimelineCitationClick = (citations: any[]) => {
    openEvidenceDrawer(citations, "Timeline Evidence");
  };

  // Map citation handler
  const handleMapCitationClick = (citations: any[], stateName?: string) => {
    openEvidenceDrawer(
      citations,
      "Donation Sources",
      stateName ? `${stateName} donations` : undefined
    );
  };

  // Network citation handler
  const handleNetworkCitationClick = (citations: any[], nodeName?: string) => {
    openEvidenceDrawer(
      citations,
      "Network Evidence",
      nodeName
    );
  };

  // Radial citation handler
  const handleRadialCitationClick = (citations: any[], categoryName?: string) => {
    openEvidenceDrawer(
      citations,
      "Category Sources",
      categoryName ? `${categoryName} donations` : undefined
    );
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
              <CardTitle>Filters & Options</CardTitle>
              <CardDescription>Configure map filters and comparison mode</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Filters */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

              {/* Comparative Mode Section */}
              <div className="border-t pt-4">
                <Label className="text-base font-semibold mb-3 block">
                  Compare Politicians (max 5)
                </Label>
                <div className="flex gap-2 items-end mb-3">
                  <div className="flex-1">
                    <Select
                      value={selectedPoliticianToAdd}
                      onValueChange={setSelectedPoliticianToAdd}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a politician to compare..." />
                      </SelectTrigger>
                      <SelectContent>
                        {DEMO_POLITICIANS.filter(
                          (p) => !comparativePoliticians.some((cp) => cp.id === p.id)
                        ).map((pol) => (
                          <SelectItem key={pol.id} value={pol.id.toString()}>
                            {pol.name} ({pol.party})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={addPoliticianToCompare}
                    disabled={!selectedPoliticianToAdd || comparativePoliticians.length >= 5}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                
                {/* Selected Politicians */}
                {comparativePoliticians.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {comparativePoliticians.map((pol) => (
                      <Badge
                        key={pol.id}
                        variant="secondary"
                        className="flex items-center gap-1 py-1 px-2"
                      >
                        {pol.name}
                        <span className="text-xs text-gray-500">({pol.party.charAt(0)})</span>
                        <button
                          onClick={() => removePoliticianFromCompare(pol.id)}
                          className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {comparativePoliticians.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setComparativePoliticians([])}
                        className="text-xs"
                      >
                        Clear all
                      </Button>
                    )}
                  </div>
                )}
                
                {comparativePoliticians.length === 0 && (
                  <p className="text-sm text-gray-500">
                    Add politicians above to enable comparative view in the map
                  </p>
                )}
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
            showTimeSlider={true}
            showViewModeToggle={true}
            comparativePoliticians={comparativePoliticians}
            onCitationClick={handleMapCitationClick}
          />
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Timeline Filters</CardTitle>
              <CardDescription>
                View chronological events with clustering and cross-referencing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="timeline-politician">Primary Politician</Label>
                  <Select
                    value={timelineFilters.politicianId}
                    onValueChange={(value) =>
                      setTimelineFilters({ ...timelineFilters, politicianId: value })
                    }
                  >
                    <SelectTrigger id="timeline-politician">
                      <SelectValue placeholder="Select a politician..." />
                    </SelectTrigger>
                    <SelectContent>
                      {DEMO_POLITICIANS.map((pol) => (
                        <SelectItem key={pol.id} value={pol.id.toString()}>
                          {pol.name} ({pol.party})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              
              {/* Comparative Timeline Section */}
              <div className="border-t pt-4">
                <Label className="text-base font-semibold mb-3 block">
                  Compare with Other Politicians (max 4)
                </Label>
                <div className="flex gap-2 items-end mb-3">
                  <div className="flex-1">
                    <Select
                      value={timelineComparePolitician}
                      onValueChange={setTimelineComparePolitician}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Add politician to compare..." />
                      </SelectTrigger>
                      <SelectContent>
                        {DEMO_POLITICIANS.filter(
                          (p) =>
                            p.id.toString() !== timelineFilters.politicianId &&
                            !timelineComparePoliticians.some((cp) => cp.id === p.id)
                        ).map((pol) => (
                          <SelectItem key={pol.id} value={pol.id.toString()}>
                            {pol.name} ({pol.party})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={addTimelineComparePolitician}
                    disabled={!timelineComparePolitician || timelineComparePoliticians.length >= 4}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                
                {/* Selected Politicians for Comparison */}
                {timelineComparePoliticians.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {timelineComparePoliticians.map((pol) => (
                      <Badge
                        key={pol.id}
                        variant="secondary"
                        className="flex items-center gap-1 py-1 px-2"
                      >
                        {pol.name}
                        <span className="text-xs text-gray-500">({pol.party.charAt(0)})</span>
                        <button
                          onClick={() => removeTimelineComparePolitician(pol.id)}
                          className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTimelineComparePoliticians([])}
                      className="text-xs"
                    >
                      Clear all
                    </Button>
                  </div>
                )}
                
                {timelineComparePoliticians.length === 0 && (
                  <p className="text-sm text-gray-500">
                    Add politicians to enable comparative timeline view
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {timelineFilters.politicianId && (
            <TimelineChart
              politicianId={parseInt(timelineFilters.politicianId)}
              startDate={timelineFilters.startDate || undefined}
              endDate={timelineFilters.endDate || undefined}
              showClustering={true}
              showCrossReference={true}
              comparativePoliticians={timelineComparePoliticians}
              onEventClick={handleTimelineEventClick}
              onCitationClick={handleTimelineCitationClick}
            />
          )}
          {!timelineFilters.politicianId && (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                Please select a politician to view the timeline
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
              onCitationClick={(citations) => handleRadialCitationClick(citations)}
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

      {/* Evidence Drawer - shared across all visualizations */}
      <EvidenceDrawer
        citations={evidenceCitations}
        isOpen={evidenceDrawerOpen}
        onClose={closeEvidenceDrawer}
        title={evidenceTitle}
        subtitle={evidenceSubtitle}
      />
    </div>
  );
}
