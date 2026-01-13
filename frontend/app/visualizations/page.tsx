"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";

// Define THREE and AFRAME stubs at the earliest possible point to prevent "not defined" errors
// This is needed because react-force-graph has peer dependencies on three.js and aframe
if (typeof window !== "undefined") {
  // THREE.js stub - required by react-force-graph
  if (typeof (window as any).THREE === "undefined") {
    (window as any).THREE = {
      // Minimal stub to prevent initialization errors
      REVISION: "stub",
      Vector3: class Vector3 {
        constructor() {}
      },
      Vector2: class Vector2 {
        constructor() {}
      },
      Color: class Color {
        constructor() {}
      },
      Object3D: class Object3D {
        constructor() {}
      },
      Scene: class Scene {
        constructor() {}
      },
      Camera: class Camera {
        constructor() {}
      },
      WebGLRenderer: class WebGLRenderer {
        constructor() {}
      },
    };
  }

  // AFRAME stub - required by react-force-graph 3D features
  if (typeof (window as any).AFRAME === "undefined") {
    (window as any).AFRAME = {
      registerComponent: () => {},
      registerSystem: () => {},
      registerShader: () => {},
      registerPrimitive: () => {},
      registerGeometry: () => {},
      registerState: () => {},
      components: {},
      geometries: {},
      primitives: {},
      shaders: {},
      systems: {},
      utils: {
        device: {
          isMobile: () => false,
          isBrowserEnvironment: true,
        },
      },
      version: "1.0.0-stub",
    };
  }
}

// Dynamic imports to avoid SSR issues with browser-only libraries
const DonationsMap = dynamic(() => import("@/components/DonationsMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] flex items-center justify-center">
      Loading map...
    </div>
  ),
});

const TimelineChart = dynamic(() => import("@/components/TimelineChart"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] flex items-center justify-center">
      Loading timeline...
    </div>
  ),
});

const NetworkGraph = dynamic(() => import("@/components/NetworkGraph"), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] flex items-center justify-center">
      Loading network graph...
    </div>
  ),
});

const RadialChart = dynamic(() => import("@/components/RadialChart"), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] flex items-center justify-center">
      Loading chart...
    </div>
  ),
});

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  Plus,
  Accessibility,
  MessageCircle,
  Sparkles,
  PanelRightOpen,
  PanelRightClose,
  Search,
  List,
} from "lucide-react";

// AI Components
import VisualizationInsights from "@/components/VisualizationInsights";
import VisualizationChat from "@/components/VisualizationChat";
import AISmartSuggestions from "@/components/AISmartSuggestions";
import PatternAlerts, { type PatternAlert } from "@/components/PatternAlerts";
import type { VisualizationType, AISuggestion } from "@/lib/visualization-ai";
import EvidenceDrawer, {
  toUnifiedCitation,
  type UnifiedCitation,
} from "@/components/EvidenceDrawer";
import DataTableExport, {
  generateMapTableData,
  generateTimelineTableData,
  generateRadialTableData,
  generateNetworkTableData,
} from "@/components/DataTableExport";
import {
  AccessibilityProvider,
  AccessibilityToolbar,
  SkipToContent,
  VisualizationDescription,
} from "@/components/AccessibilityWrapper";
import DiscoveryTour, {
  VISUALIZATION_TOUR_STEPS,
  useDiscoveryTour,
} from "@/components/DiscoveryTour";
import SuggestedExplorations, {
  getDefaultExplorations,
  type Exploration,
} from "@/components/SuggestedExplorations";
import StorySequence, {
  SAMPLE_STORIES,
  StorySelector,
  type Story,
} from "@/components/StorySequence";
import { searchPoliticians } from "@/lib/api";
import { useEffect } from "react";

// Fallback politicians list for when API is unavailable
const FALLBACK_POLITICIANS = [
  { id: "1", name: "Alexandria Ocasio-Cortez", party: "Democrat" },
  { id: "2", name: "Bernie Sanders", party: "Independent" },
  { id: "3", name: "Chuck Schumer", party: "Democrat" },
  { id: "4", name: "Elizabeth Warren", party: "Democrat" },
  { id: "5", name: "John Cornyn", party: "Republican" },
  { id: "6", name: "Marco Rubio", party: "Republican" },
  { id: "7", name: "Mitch McConnell", party: "Republican" },
  { id: "8", name: "Nancy Pelosi", party: "Democrat" },
  { id: "9", name: "Ted Cruz", party: "Republican" },
  { id: "10", name: "Tim Scott", party: "Republican" },
];

// Available donation categories
const DONATION_CATEGORIES = [
  "Agriculture",
  "Communications/Electronics",
  "Construction",
  "Defense",
  "Energy/Natural Resources",
  "Finance/Insurance/Real Estate",
  "Health",
  "Lawyers & Lobbyists",
  "Transportation",
  "Labor",
  "Ideology/Single-Issue",
  "Other",
];

export default function VisualizationsPage() {
  // State for all politicians from API
  const [allPoliticians, setAllPoliticians] = useState<
    Array<{ id: string; name: string; party: string }>
  >([]);
  const [loadingPoliticians, setLoadingPoliticians] = useState(true);

  // Fetch all politicians from Supabase on mount
  useEffect(() => {
    const fetchPoliticians = async () => {
      try {
        const { fetchAllPoliticians } = await import("@/lib/supabase");
        const politicians = await fetchAllPoliticians();
        if (politicians && politicians.length > 0) {
          setAllPoliticians(politicians);
        } else {
          // Use fallback if database returns empty
          console.log("Database returned no politicians, using fallback list");
          setAllPoliticians(FALLBACK_POLITICIANS);
        }
      } catch (error) {
        console.error(
          "Failed to fetch politicians from database, using fallback:",
          error
        );
        // Use fallback list when database query fails
        setAllPoliticians(FALLBACK_POLITICIANS);
      } finally {
        setLoadingPoliticians(false);
      }
    };
    fetchPoliticians();
  }, []);

  const [donationsFilters, setDonationsFilters] = useState({
    category: "",
    startDate: "2022-01-01",
    endDate: "2024-12-31",
  });

  // Comparative mode state for map
  const [comparativePoliticians, setComparativePoliticians] = useState<
    Array<{ id: string; name: string; party: string }>
  >([]);
  const [showPoliticianBrowser, setShowPoliticianBrowser] = useState(false);
  const [browserSearchQuery, setBrowserSearchQuery] = useState("");

  const [timelineFilters, setTimelineFilters] = useState({
    politicianId: "",
    startDate: "",
    endDate: "",
    eventTypes: [] as string[],
  });

  // Timeline comparative mode state
  const [timelineComparePoliticians, setTimelineComparePoliticians] = useState<
    Array<{ id: string; name: string; party: string }>
  >([]);
  const [timelineComparePolitician, setTimelineComparePolitician] =
    useState<string>("");

  // Active tab state
  const [activeTab, setActiveTab] = useState("map");

  // Discovery Tour state
  const { showTour, startTour, closeTour, completeTour, hasSeenTour } =
    useDiscoveryTour();

  // Story state
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [showStorySelector, setShowStorySelector] = useState(false);

  const [networkFilters, setNetworkFilters] = useState({
    includeIndirect: false,
    selectedPoliticianId: "" as string,
  });

  const [radialFilters, setRadialFilters] = useState({
    politicianId: "",
    startDate: "",
    endDate: "",
  });

  // AI Features state
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiUserHistory, setAIUserHistory] = useState<string[]>([]);

  // Get current visualization type for AI
  const currentVisualizationType: VisualizationType = useMemo(() => {
    switch (activeTab) {
      case "map":
        return "donations_map";
      case "timeline":
        return "timeline";
      case "network":
        return "network_graph";
      case "radial":
        return "radial_chart";
      default:
        return "donations_map";
    }
  }, [activeTab]);

  // Build data summary for AI based on current tab and filters
  const currentDataSummary = useMemo(() => {
    switch (activeTab) {
      case "map":
        return {
          filters: donationsFilters,
          comparativePoliticians: comparativePoliticians.map((p) => p.name),
          tab: "donations_map",
        };
      case "timeline":
        return {
          filters: timelineFilters,
          comparePoliticians: timelineComparePoliticians.map((p) => p.name),
          tab: "timeline",
        };
      case "network":
        return {
          filters: networkFilters,
          selectedPolitician: allPoliticians.find(
            (p) => p.id === networkFilters.selectedPoliticianId
          )?.name,
          tab: "network_graph",
        };
      case "radial":
        return {
          filters: radialFilters,
          tab: "radial_chart",
        };
      default:
        return {};
    }
  }, [
    activeTab,
    donationsFilters,
    timelineFilters,
    networkFilters,
    radialFilters,
    comparativePoliticians,
    timelineComparePoliticians,
    allPoliticians,
  ]);

  // Handle AI suggestion click
  const handleAISuggestionClick = useCallback(
    (suggestion: AISuggestion) => {
      // Track in user history
      setAIUserHistory((prev) => [...prev.slice(-9), suggestion.title]);

      // Execute the suggestion action
      switch (suggestion.action.type) {
        case "filter":
          if (suggestion.action.params.category && activeTab === "map") {
            setDonationsFilters((prev) => ({
              ...prev,
              category: suggestion.action.params.category as string,
            }));
          }
          if (suggestion.action.params.viewMode && activeTab === "map") {
            // The map handles view mode internally
          }
          break;
        case "switch_view":
          if (suggestion.action.params.tab) {
            setActiveTab(suggestion.action.params.tab as string);
          }
          break;
        case "compare":
          // Handle comparison suggestions
          break;
        case "timerange":
          // Handle time range suggestions
          break;
        case "drill_down":
          // Handle drill-down suggestions
          break;
      }
    },
    [activeTab]
  );

  // Filtered politicians for browser modal
  const browserFilteredPoliticians = useMemo(() => {
    const available = allPoliticians.filter(
      (p) => !comparativePoliticians.some((cp) => cp.id === p.id)
    );
    if (!browserSearchQuery.trim()) {
      return available;
    }
    const query = browserSearchQuery.toLowerCase();
    return available.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.party.toLowerCase().includes(query)
    );
  }, [allPoliticians, comparativePoliticians, browserSearchQuery]);

  // Add politician to comparison
  const addPoliticianToCompare = (politicianId?: string) => {
    const idToAdd = politicianId;
    if (!idToAdd) return;
    const politician = allPoliticians.find((p) => p.id === idToAdd);
    if (
      politician &&
      !comparativePoliticians.some((p) => p.id === politician.id)
    ) {
      if (comparativePoliticians.length < 5) {
        setComparativePoliticians([...comparativePoliticians, politician]);
      }
    }
  };

  // Remove politician from comparison
  const removePoliticianFromCompare = (id: string) => {
    setComparativePoliticians(
      comparativePoliticians.filter((p) => p.id !== id)
    );
  };

  // Timeline comparison helpers
  const addTimelineComparePolitician = () => {
    if (!timelineComparePolitician) return;
    const politician = allPoliticians.find(
      (p) => p.id === timelineComparePolitician
    );
    if (
      politician &&
      !timelineComparePoliticians.some((p) => p.id === politician.id)
    ) {
      if (timelineComparePoliticians.length < 4) {
        setTimelineComparePoliticians([
          ...timelineComparePoliticians,
          politician,
        ]);
      }
    }
    setTimelineComparePolitician("");
  };

  const removeTimelineComparePolitician = (id: string) => {
    setTimelineComparePoliticians(
      timelineComparePoliticians.filter((p) => p.id !== id)
    );
  };

  // Evidence Drawer state
  const [evidenceDrawerOpen, setEvidenceDrawerOpen] = useState(false);
  const [evidenceCitations, setEvidenceCitations] = useState<UnifiedCitation[]>(
    []
  );
  const [evidenceTitle, setEvidenceTitle] = useState("Source Evidence");
  const [evidenceSubtitle, setEvidenceSubtitle] = useState<
    string | undefined
  >();

  // Open evidence drawer with citations
  const openEvidenceDrawer = useCallback(
    (citations: any[], title?: string, subtitle?: string) => {
      const unified = citations.map((c) => toUnifiedCitation(c));
      setEvidenceCitations(unified);
      setEvidenceTitle(title || "Source Evidence");
      setEvidenceSubtitle(subtitle);
      setEvidenceDrawerOpen(true);
    },
    []
  );

  // Close evidence drawer
  const closeEvidenceDrawer = useCallback(() => {
    setEvidenceDrawerOpen(false);
  }, []);

  // Timeline event handlers
  const handleTimelineEventClick = (event: any) => {
    console.log("Timeline event clicked:", event);
    if (event.citations && event.citations.length > 0) {
      openEvidenceDrawer(event.citations, "Event Sources", event.title);
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
    openEvidenceDrawer(citations, "Network Evidence", nodeName);
  };

  // Radial citation handler
  const handleRadialCitationClick = (
    citations: any[],
    categoryName?: string
  ) => {
    openEvidenceDrawer(
      citations,
      "Category Sources",
      categoryName ? `${categoryName} donations` : undefined
    );
  };

  // Exploration handlers
  const switchToTab = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const setPoliticianIdForExploration = useCallback((id: string) => {
    setTimelineFilters((prev) => ({ ...prev, politicianId: id }));
    setRadialFilters((prev) => ({ ...prev, politicianId: id }));
  }, []);

  const handleExplore = useCallback((exploration: Exploration) => {
    console.log("Starting exploration:", exploration.title);
  }, []);

  // Story handlers
  const handleSelectStory = useCallback((story: Story) => {
    setActiveStory(story);
    setShowStorySelector(false);
  }, []);

  const handleCloseStory = useCallback(() => {
    setActiveStory(null);
  }, []);

  // Get explorations with handlers bound
  const explorations = getDefaultExplorations(
    switchToTab,
    setPoliticianIdForExploration
  );

  return (
    <AccessibilityProvider>
      <SkipToContent targetId="visualization-content" />
      <div className="container mx-auto py-8 px-4 space-y-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Interactive Visualizations
            </h1>
            <p className="text-gray-600">
              Explore donation data, timelines, networks, and relationships
              through interactive visualizations
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {!hasSeenTour && (
              <Badge variant="secondary" className="animate-pulse">
                New user? Try the tour!
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={startTour}>
              Start Tour
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStorySelector(!showStorySelector)}
            >
              Guided Stories
            </Button>
            <Button
              variant={showAIPanel ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAIPanel(!showAIPanel)}
              className="gap-1"
            >
              <Sparkles className="h-4 w-4" />
              AI Insights
            </Button>
          </div>
        </div>

        {/* AI Smart Suggestions */}
        <AISmartSuggestions
          visualizationType={currentVisualizationType}
          currentState={currentDataSummary}
          userHistory={aiUserHistory}
          onSuggestionClick={handleAISuggestionClick}
          variant="inline"
          maxVisible={3}
        />

        {/* Suggested Explorations */}
        <SuggestedExplorations
          explorations={explorations}
          onExplore={handleExplore}
          maxVisible={3}
          variant="inline"
        />

        {/* Story Selector Panel */}
        {showStorySelector && (
          <StorySelector
            stories={SAMPLE_STORIES}
            onSelectStory={handleSelectStory}
          />
        )}

        <main
          id="visualization-content"
          role="main"
          aria-label="Visualization content"
        >
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
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
                  <CardDescription>
                    Configure map filters and comparison mode
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Basic Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="map-category">Donation Category</Label>
                      <Select
                        value={donationsFilters.category}
                        onValueChange={(value) =>
                          setDonationsFilters({
                            ...donationsFilters,
                            category: value === "all" ? "" : value,
                          })
                        }
                      >
                        <SelectTrigger id="map-category">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {DONATION_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="map-start-date">Start Date</Label>
                      <Input
                        id="map-start-date"
                        type="date"
                        min="2022-01-01"
                        max="2024-12-31"
                        value={donationsFilters.startDate}
                        onChange={(e) =>
                          setDonationsFilters({
                            ...donationsFilters,
                            startDate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="map-end-date">End Date</Label>
                      <Input
                        id="map-end-date"
                        type="date"
                        min="2022-01-01"
                        max="2024-12-31"
                        value={donationsFilters.endDate}
                        onChange={(e) =>
                          setDonationsFilters({
                            ...donationsFilters,
                            endDate: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Comparative Mode Section */}
                  <div className="border-t pt-4">
                    <Label className="text-base font-semibold mb-3 block">
                      Compare Politicians (max 5)
                    </Label>
                    <p className="text-sm text-gray-600 mb-3">
                      Add politicians to enable comparative view in the map
                    </p>

                    {/* Browse All Button - Primary CTA */}
                    <Dialog
                      open={showPoliticianBrowser}
                      onOpenChange={setShowPoliticianBrowser}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="default"
                          size="lg"
                          disabled={
                            loadingPoliticians ||
                            comparativePoliticians.length >= 5
                          }
                          className="w-full mb-4"
                        >
                          <List className="h-5 w-5 mr-2" />
                          {loadingPoliticians
                            ? "Loading Politicians..."
                            : comparativePoliticians.length >= 5
                            ? "Maximum Politicians Selected"
                            : "Browse All Politicians"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                        <DialogHeader>
                          <DialogTitle>Browse All Politicians</DialogTitle>
                          <DialogDescription>
                            Search and select politicians to add to your
                            comparison (max 5)
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex-1 overflow-hidden flex flex-col gap-4">
                          {/* Search within modal */}
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              type="text"
                              placeholder="Search by name or party..."
                              value={browserSearchQuery}
                              onChange={(e) =>
                                setBrowserSearchQuery(e.target.value)
                              }
                              className="pl-10"
                            />
                          </div>
                          {/* Politicians list */}
                          <div className="flex-1 overflow-y-auto border rounded-md">
                            {browserFilteredPoliticians.length === 0 && (
                              <div className="p-8 text-center text-gray-500">
                                {browserSearchQuery
                                  ? `No politicians found matching "${browserSearchQuery}"`
                                  : "No more politicians available to add"}
                              </div>
                            )}
                            {browserFilteredPoliticians.map((pol) => (
                              <button
                                key={pol.id}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex justify-between items-center border-b last:border-b-0 transition-colors"
                                onClick={() => {
                                  addPoliticianToCompare(pol.id);
                                  if (comparativePoliticians.length >= 4) {
                                    setShowPoliticianBrowser(false);
                                    setBrowserSearchQuery("");
                                  }
                                }}
                                disabled={comparativePoliticians.length >= 5}
                              >
                                <div className="flex-1">
                                  <div className="font-medium">{pol.name}</div>
                                  <div className="text-xs text-gray-500">
                                    {pol.party}
                                  </div>
                                </div>
                                <Plus className="h-4 w-4 text-gray-400" />
                              </button>
                            ))}
                          </div>
                          <div className="text-sm text-gray-500 text-center">
                            {allPoliticians.length} total politicians •{" "}
                            {comparativePoliticians.length}/5 selected
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

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
                            <span className="text-xs text-gray-500">
                              ({pol.party.charAt(0)})
                            </span>
                            <button
                              onClick={() =>
                                removePoliticianFromCompare(pol.id)
                              }
                              className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                              aria-label={`Remove ${pol.name}`}
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
                        Add politicians above to enable comparative view in the
                        map
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <DonationsMap
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
                    View chronological events with clustering and
                    cross-referencing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="timeline-politician">
                        Primary Politician
                      </Label>
                      <Select
                        value={timelineFilters.politicianId}
                        onValueChange={(value) =>
                          setTimelineFilters({
                            ...timelineFilters,
                            politicianId: value,
                          })
                        }
                        disabled={loadingPoliticians}
                      >
                        <SelectTrigger id="timeline-politician">
                          <SelectValue
                            placeholder={
                              loadingPoliticians
                                ? "Loading politicians..."
                                : "Select a politician..."
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {allPoliticians.map((pol) => (
                            <SelectItem key={pol.id} value={pol.id}>
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
                        min="2022-01-01"
                        max="2024-12-31"
                        value={timelineFilters.startDate}
                        onChange={(e) =>
                          setTimelineFilters({
                            ...timelineFilters,
                            startDate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="timeline-end-date">End Date</Label>
                      <Input
                        id="timeline-end-date"
                        type="date"
                        min="2022-01-01"
                        max="2024-12-31"
                        value={timelineFilters.endDate}
                        onChange={(e) =>
                          setTimelineFilters({
                            ...timelineFilters,
                            endDate: e.target.value,
                          })
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
                          disabled={loadingPoliticians}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                loadingPoliticians
                                  ? "Loading politicians..."
                                  : "Select a politician to compare..."
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {allPoliticians
                              .filter(
                                (p) =>
                                  p.id !== timelineFilters.politicianId &&
                                  !timelineComparePoliticians.some(
                                    (cp) => cp.id === p.id
                                  )
                              )
                              .map((pol) => (
                                <SelectItem key={pol.id} value={pol.id}>
                                  {pol.name} ({pol.party})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={addTimelineComparePolitician}
                        disabled={
                          !timelineComparePolitician ||
                          timelineComparePoliticians.length >= 4 ||
                          loadingPoliticians
                        }
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
                            <span className="text-xs text-gray-500">
                              ({pol.party.charAt(0)})
                            </span>
                            <button
                              onClick={() =>
                                removeTimelineComparePolitician(pol.id)
                              }
                              className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                              aria-label={`Remove ${pol.name}`}
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
                  politicianId={parseInt(timelineFilters.politicianId, 10)}
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
                  <CardTitle>Network Filters</CardTitle>
                  <CardDescription>
                    Select a politician to explore their network of donors, bills, and connections
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="network-politician">
                        Select Politician
                      </Label>
                      <Select
                        value={networkFilters.selectedPoliticianId}
                        onValueChange={(value) =>
                          setNetworkFilters({
                            ...networkFilters,
                            selectedPoliticianId: value,
                          })
                        }
                        disabled={loadingPoliticians}
                      >
                        <SelectTrigger id="network-politician">
                          <SelectValue
                            placeholder={
                              loadingPoliticians
                                ? "Loading politicians..."
                                : "Select a politician to explore..."
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {allPoliticians.map((pol) => (
                            <SelectItem key={pol.id} value={pol.id}>
                              {pol.name} ({pol.party})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="network-include-indirect">
                        Include Indirect Relationships
                      </Label>
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
                selectedPoliticianId={networkFilters.selectedPoliticianId || undefined}
                selectedPoliticianName={
                  allPoliticians.find((p) => p.id === networkFilters.selectedPoliticianId)?.name
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
                      <Label htmlFor="radial-politician">Politician</Label>
                      <Select
                        value={radialFilters.politicianId}
                        onValueChange={(value) =>
                          setRadialFilters({
                            ...radialFilters,
                            politicianId: value,
                          })
                        }
                        disabled={loadingPoliticians}
                      >
                        <SelectTrigger id="radial-politician">
                          <SelectValue
                            placeholder={
                              loadingPoliticians
                                ? "Loading politicians..."
                                : "Select a politician..."
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {allPoliticians.map((pol) => (
                            <SelectItem key={pol.id} value={pol.id}>
                              {pol.name} ({pol.party})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="radial-start-date">Start Date</Label>
                      <Input
                        id="radial-start-date"
                        type="date"
                        min="2022-01-01"
                        max="2024-12-31"
                        value={radialFilters.startDate}
                        onChange={(e) =>
                          setRadialFilters({
                            ...radialFilters,
                            startDate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="radial-end-date">End Date</Label>
                      <Input
                        id="radial-end-date"
                        type="date"
                        min="2022-01-01"
                        max="2024-12-31"
                        value={radialFilters.endDate}
                        onChange={(e) =>
                          setRadialFilters({
                            ...radialFilters,
                            endDate: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {radialFilters.politicianId && (
                <RadialChart
                  politicianId={parseInt(radialFilters.politicianId, 10)}
                  startDate={radialFilters.startDate || undefined}
                  endDate={radialFilters.endDate || undefined}
                  onCitationClick={(citations) =>
                    handleRadialCitationClick(citations)
                  }
                />
              )}
              {!radialFilters.politicianId && (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    Please select a politician to view the radial chart
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </main>

        {/* AI Insights Panel - Collapsible sidebar */}
        {showAIPanel && (
          <div className="fixed right-4 top-24 w-80 z-40 max-h-[calc(100vh-120px)] overflow-y-auto">
            <VisualizationInsights
              visualizationType={currentVisualizationType}
              filters={currentDataSummary}
              dataSummary={currentDataSummary}
              selectedItems={[]}
              onSuggestedAction={(action) => {
                console.log("AI suggested action:", action);
              }}
              autoRefresh={false}
            />
          </div>
        )}

        {/* AI Chat Interface - Collapsible drawer */}
        {showAIChat && (
          <div className="fixed right-4 bottom-4 w-96 h-[500px] z-50">
            <VisualizationChat
              visualizationType={currentVisualizationType}
              filters={currentDataSummary}
              dataSummary={currentDataSummary}
              selectedItems={[]}
              isOpen={showAIChat}
              onClose={() => setShowAIChat(false)}
              onFollowUp={(question) => {
                setAIUserHistory((prev) => [
                  ...prev.slice(-9),
                  `Asked: ${question}`,
                ]);
              }}
            />
          </div>
        )}

        {/* Evidence Drawer - shared across all visualizations */}
        <EvidenceDrawer
          citations={evidenceCitations}
          isOpen={evidenceDrawerOpen}
          onClose={closeEvidenceDrawer}
          title={evidenceTitle}
          subtitle={evidenceSubtitle}
        />

        {/* Discovery Tour for first-time users */}
        <DiscoveryTour
          steps={VISUALIZATION_TOUR_STEPS}
          isOpen={showTour}
          onClose={closeTour}
          onComplete={completeTour}
        />

        {/* Story Sequence for guided narratives */}
        {activeStory && (
          <StorySequence
            story={activeStory}
            isOpen={!!activeStory}
            onClose={handleCloseStory}
            onStepChange={(step, index) => {
              // Handle visualization highlighting based on step
              if (step.dataHighlight) {
                setActiveTab(step.dataHighlight.type);
              }
            }}
          />
        )}
      </div>
    </AccessibilityProvider>
  );
}
