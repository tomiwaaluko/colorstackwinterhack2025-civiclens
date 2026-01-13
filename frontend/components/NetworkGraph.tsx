"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";

// Import THREE.js - required peer dependency for react-force-graph
import * as THREE from "three";

// Expose THREE globally for react-force-graph compatibility
// Create an extensible copy since ES modules are frozen and react-force-graph needs to add loaders
if (typeof window !== "undefined") {
  (window as any).THREE = Object.assign({}, THREE);
}

// Dynamically load ForceGraph2D only on client-side
const ForceGraph2D = dynamic(
  () => import("react-force-graph").then((mod) => mod.ForceGraph2D),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] flex items-center justify-center text-gray-500">
        Loading network visualization...
      </div>
    ),
  }
);

import type {
  NetworkGraphResponse,
  NetworkNode,
  NetworkEdge,
  NetworkCluster,
  ExplorationMode,
  NetworkPath,
} from "@/lib/types";
import { getNetworkGraph } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import LoadingSpinner from "./LoadingSpinner";
import NetworkControls from "./NetworkControls";
import {
  Search,
  Filter,
  Route,
  Network,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Eye,
  EyeOff,
  Info,
  ChevronRight,
  Users,
} from "lucide-react";

// Node type colors
const NODE_COLORS = {
  politician: "#3b82f6", // Blue
  donor: "#10b981", // Green
  bill: "#f59e0b", // Amber
};

// Category colors for clustering
const CATEGORY_COLORS: Record<string, string> = {
  Healthcare: "#ef4444",
  Energy: "#f59e0b",
  Technology: "#3b82f6",
  Finance: "#10b981",
  Defense: "#6b7280",
};

// Edge type colors
const EDGE_COLORS = {
  donation: "#10b981",
  vote: "#3b82f6",
  sponsor: "#8b5cf6",
  indirect: "#f59e0b",
};

interface NetworkGraphProps {
  selectedPoliticianId?: string;
  selectedPoliticianName?: string;
  includeIndirect?: boolean;
  initialMinAmount?: number;
  initialCategory?: string;
}

export default function NetworkGraph({
  selectedPoliticianId,
  selectedPoliticianName,
  includeIndirect = false,
  initialMinAmount = 0,
  initialCategory,
}: NetworkGraphProps) {
  const [graphData, setGraphData] = useState<NetworkGraphResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component only renders ForceGraph on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Selection state
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<NetworkEdge | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NetworkNode[]>([]);
  const [minAmount, setMinAmount] = useState(initialMinAmount);
  const [categoryFilter, setCategoryFilter] = useState<string>(
    initialCategory || "all"
  );
  const [showFilters, setShowFilters] = useState(false);

  // Exploration mode state
  const [explorationMode, setExplorationMode] =
    useState<ExplorationMode>("default");
  const [highlightedPath, setHighlightedPath] = useState<NetworkPath | null>(
    null
  );
  const [pathSteps, setPathSteps] = useState<string[]>([]);

  // Clustering state
  const [showClusters, setShowClusters] = useState(true);
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(
    new Set()
  );

  // Visual state
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(
    new Set()
  );
  const [highlightedEdges, setHighlightedEdges] = useState<Set<string>>(
    new Set()
  );
  const [visibleNodeTypes, setVisibleNodeTypes] = useState<Set<string>>(
    new Set(["politician", "donor", "bill"])
  );

  // Connection depth for progressive disclosure (1 = immediate connections only)
  const [connectionDepth, setConnectionDepth] = useState(1);
  const MAX_DEPTH = 3;

  const graphRef = useRef<any>(null);

  // Load graph data - only fetch when we have all the data we need
  useEffect(() => {
    // Don't fetch if no politician is selected - we'll show empty state
    if (!selectedPoliticianId) {
      setGraphData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Convert string ID to number array for the API
    const politicianIdNum = parseInt(selectedPoliticianId, 10);
    const politicianIds = !isNaN(politicianIdNum) ? [politicianIdNum] : undefined;

    getNetworkGraph({
      politician_ids: politicianIds,
      include_indirect: includeIndirect,
      min_amount: minAmount > 0 ? minAmount : undefined,
      category: categoryFilter !== "all" ? categoryFilter : undefined,
    })
      .then((data) => {
        setGraphData(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load network graph:", err);
        setError(err.message || "Failed to load network graph data");
        setIsLoading(false);
      });
  }, [selectedPoliticianId, includeIndirect, minAmount, categoryFilter]);

  // Search functionality
  useEffect(() => {
    if (!graphData || !searchQuery.trim()) {
      setSearchResults([]);
      setHighlightedNodes(new Set());
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = graphData.nodes.filter(
      (node) =>
        node.label.toLowerCase().includes(query) ||
        node.type.toLowerCase().includes(query) ||
        node.category?.toLowerCase().includes(query)
    );
    setSearchResults(results);
    setHighlightedNodes(new Set(results.map((n) => n.id)));
  }, [searchQuery, graphData]);

  // BFS to find all nodes within a given depth from start nodes
  const getNodesWithinDepth = useCallback(
    (startNodeIds: string[], depth: number, edges: NetworkEdge[]): Set<string> => {
      const visited = new Set<string>(startNodeIds);
      let frontier = new Set<string>(startNodeIds);

      for (let d = 0; d < depth; d++) {
        const nextFrontier = new Set<string>();

        for (const nodeId of frontier) {
          // Find all edges connected to this node (both directions)
          for (const edge of edges) {
            if (edge.source === nodeId && !visited.has(edge.target)) {
              nextFrontier.add(edge.target);
              visited.add(edge.target);
            }
            if (edge.target === nodeId && !visited.has(edge.source)) {
              nextFrontier.add(edge.source);
              visited.add(edge.source);
            }
          }
        }

        frontier = nextFrontier;

        // Stop if no new nodes found
        if (frontier.size === 0) break;
      }

      return visited;
    },
    []
  );

  // Find the politician node ID in the graph data
  const selectedPoliticianNodeId = useMemo(() => {
    if (!graphData || !selectedPoliticianId) return null;

    // Try to find the politician node by matching the ID
    // The node ID might be formatted differently (e.g., "politician-1" or just "1")
    const politicianNode = graphData.nodes.find((n) => {
      if (n.type !== "politician") return false;
      // Check various ID formats
      const nodeIdStr = String(n.id);
      const selectedIdStr = String(selectedPoliticianId);
      return (
        nodeIdStr === selectedIdStr ||
        nodeIdStr === `politician-${selectedIdStr}` ||
        nodeIdStr.endsWith(`-${selectedIdStr}`) ||
        (n.metadata?.id && String(n.metadata.id) === selectedIdStr)
      );
    });

    return politicianNode?.id || null;
  }, [graphData, selectedPoliticianId]);

  // Filter visible nodes based on types AND connection depth
  const filteredGraphData = useMemo(() => {
    // If no politician selected, return empty graph
    if (!selectedPoliticianId) {
      return { nodes: [], edges: [], clusters: [] };
    }

    if (!graphData) return null;

    let visibleNodeIds: Set<string>;

    // If we found the politician node, filter by depth
    if (selectedPoliticianNodeId) {
      visibleNodeIds = getNodesWithinDepth(
        [selectedPoliticianNodeId],
        connectionDepth,
        graphData.edges
      );
    } else {
      // Fallback: show all nodes of type politician as potential matches
      // This handles cases where the ID format doesn't match
      const politicianNodes = graphData.nodes.filter((n) => n.type === "politician");
      if (politicianNodes.length > 0) {
        // Use the first politician as the center
        visibleNodeIds = getNodesWithinDepth(
          [politicianNodes[0].id],
          connectionDepth,
          graphData.edges
        );
      } else {
        visibleNodeIds = new Set(graphData.nodes.map((n) => n.id));
      }
    }

    // Also filter by node type visibility
    const visibleNodes = graphData.nodes.filter(
      (n) => visibleNodeIds.has(n.id) && visibleNodeTypes.has(n.type)
    );

    const filteredNodeIds = new Set(visibleNodes.map((n) => n.id));
    const visibleEdges = graphData.edges.filter(
      (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
    );

    return {
      nodes: visibleNodes,
      edges: visibleEdges,
      clusters: graphData.clusters?.filter((c) =>
        c.node_ids.some((id) => filteredNodeIds.has(id))
      ) || [],
    };
  }, [graphData, visibleNodeTypes, selectedPoliticianId, selectedPoliticianNodeId, connectionDepth, getNodesWithinDepth]);

  // Get node color with highlighting
  const getNodeColor = useCallback(
    (node: NetworkNode): string => {
      const isHighlighted = highlightedNodes.has(node.id);
      const isInPath = highlightedPath?.nodes.includes(node.id);

      if (isHighlighted || isInPath) {
        return "#ec4899"; // Pink for highlighted
      }

      if (showClusters && node.category) {
        return (
          CATEGORY_COLORS[node.category] ||
          NODE_COLORS[node.type as keyof typeof NODE_COLORS] ||
          "#6b7280"
        );
      }

      return NODE_COLORS[node.type as keyof typeof NODE_COLORS] || "#6b7280";
    },
    [highlightedNodes, highlightedPath, showClusters]
  );

  // Get edge color with highlighting
  const getEdgeColor = useCallback(
    (edge: NetworkEdge): string => {
      const edgeId = `${edge.source}-${edge.target}`;
      const isHighlighted = highlightedEdges.has(edgeId);
      const isInPath = highlightedPath?.edges.some(
        (e) => e.source === edge.source && e.target === edge.target
      );

      if (isHighlighted || isInPath) {
        return "#ec4899"; // Pink for highlighted
      }

      return EDGE_COLORS[edge.type as keyof typeof EDGE_COLORS] || "#6b7280";
    },
    [highlightedEdges, highlightedPath]
  );

  // Find influence path: donor → politicians → bills
  const findInfluencePath = useCallback(
    (donorId: string): NetworkPath | null => {
      if (!graphData) return null;

      const pathNodes: string[] = [donorId];
      const pathEdges: Array<{ source: string; target: string }> = [];
      const descriptions: string[] = [];

      // Find politicians who received donations from this donor
      const donationEdges = graphData.edges.filter(
        (e) => e.source === donorId && e.type === "donation"
      );

      if (donationEdges.length === 0) return null;

      const politicianIds = donationEdges.map((e) => e.target);
      pathNodes.push(...politicianIds);
      pathEdges.push(
        ...donationEdges.map((e) => ({ source: e.source, target: e.target }))
      );
      descriptions.push(`Donated to ${politicianIds.length} politician(s)`);

      // Find bills those politicians sponsored or voted on
      const billIds = new Set<string>();
      politicianIds.forEach((polId) => {
        const voteEdges = graphData.edges.filter(
          (e) =>
            e.source === polId && (e.type === "vote" || e.type === "sponsor")
        );
        voteEdges.forEach((e) => {
          billIds.add(e.target);
          pathEdges.push({ source: e.source, target: e.target });
        });
      });

      pathNodes.push(...Array.from(billIds));
      descriptions.push(`Connected to ${billIds.size} bill(s)`);

      return {
        nodes: pathNodes,
        edges: pathEdges,
        description: descriptions.join(" → "),
      };
    },
    [graphData]
  );

  // Find legislative web: bill → sponsors → their donors
  const findLegislativeWeb = useCallback(
    (billId: string): NetworkPath | null => {
      if (!graphData) return null;

      const pathNodes: string[] = [billId];
      const pathEdges: Array<{ source: string; target: string }> = [];
      const descriptions: string[] = [];

      // Find politicians who sponsored/voted on this bill
      const sponsorEdges = graphData.edges.filter(
        (e) =>
          e.target === billId && (e.type === "vote" || e.type === "sponsor")
      );

      if (sponsorEdges.length === 0) return null;

      const politicianIds = sponsorEdges.map((e) => e.source);
      pathNodes.push(...politicianIds);
      pathEdges.push(
        ...sponsorEdges.map((e) => ({ source: e.source, target: e.target }))
      );
      descriptions.push(`${politicianIds.length} politician(s) involved`);

      // Find donors to those politicians
      const donorIds = new Set<string>();
      politicianIds.forEach((polId) => {
        const donationEdges = graphData.edges.filter(
          (e) => e.target === polId && e.type === "donation"
        );
        donationEdges.forEach((e) => {
          donorIds.add(e.source);
          pathEdges.push({ source: e.source, target: e.target });
        });
      });

      pathNodes.push(...Array.from(donorIds));
      descriptions.push(`Funded by ${donorIds.size} donor(s)`);

      return {
        nodes: pathNodes,
        edges: pathEdges,
        description: descriptions.join(" ← "),
      };
    },
    [graphData]
  );

  // Handle node click based on exploration mode
  const handleNodeClick = useCallback(
    (node: any) => {
      const networkNode = graphData?.nodes.find((n) => n.id === node.id);
      if (!networkNode) return;

      setSelectedNode(networkNode);
      setSelectedEdge(null);

      if (
        explorationMode === "influence_path" &&
        networkNode.type === "donor"
      ) {
        const path = findInfluencePath(networkNode.id);
        setHighlightedPath(path);
        if (path) {
          setPathSteps([`Donor: ${networkNode.label}`, path.description]);
        }
      } else if (
        explorationMode === "legislative_web" &&
        networkNode.type === "bill"
      ) {
        const path = findLegislativeWeb(networkNode.id);
        setHighlightedPath(path);
        if (path) {
          setPathSteps([`Bill: ${networkNode.label}`, path.description]);
        }
      } else if (explorationMode === "default") {
        // Highlight connected nodes and edges
        const connectedEdges =
          filteredGraphData?.edges.filter(
            (e) => e.source === networkNode.id || e.target === networkNode.id
          ) || [];
        const connectedNodeIds = new Set<string>();
        connectedEdges.forEach((e) => {
          connectedNodeIds.add(e.source);
          connectedNodeIds.add(e.target);
        });

        setHighlightedNodes(connectedNodeIds);
        setHighlightedEdges(
          new Set(connectedEdges.map((e) => `${e.source}-${e.target}`))
        );
      }
    },
    [graphData, explorationMode, findInfluencePath, findLegislativeWeb]
  );

  // Handle edge click
  const handleEdgeClick = useCallback(
    (link: any) => {
      const edge = graphData?.edges.find(
        (e) =>
          (e.source === link.source?.id || e.source === link.source) &&
          (e.target === link.target?.id || e.target === link.target)
      );
      if (edge) {
        setSelectedEdge(edge);
        setSelectedNode(null);
      }
    },
    [graphData]
  );

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
    setHighlightedNodes(new Set());
    setHighlightedEdges(new Set());
    setHighlightedPath(null);
    setPathSteps([]);
  }, []);

  // Auto zoom-to-fit when filtered data changes
  useEffect(() => {
    if (graphRef.current && filteredGraphData && filteredGraphData.nodes.length > 0) {
      // Small delay to allow the graph to stabilize
      const timeoutId = setTimeout(() => {
        graphRef.current?.zoomToFit(400, 50);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [filteredGraphData?.nodes.length, selectedPoliticianId, connectionDepth]);

  // Reset depth when politician changes
  useEffect(() => {
    setConnectionDepth(1);
  }, [selectedPoliticianId]);

  // Depth control handlers
  const handleDepthChange = useCallback((depth: number) => {
    setConnectionDepth(Math.max(1, Math.min(MAX_DEPTH, depth)));
  }, []);

  const handleExpandNetwork = useCallback(() => {
    if (connectionDepth < MAX_DEPTH) {
      setConnectionDepth((prev) => prev + 1);
    }
  }, [connectionDepth]);

  const handleResetToImmediate = useCallback(() => {
    setConnectionDepth(1);
  }, []);

  // Focus on search result
  const focusOnNode = useCallback(
    (nodeId: string) => {
      if (graphRef.current) {
        // react-force-graph adds x and y properties at runtime
        const node = filteredGraphData?.nodes.find(
          (n) => n.id === nodeId
        ) as any;
        if (node && typeof node.x === "number" && typeof node.y === "number") {
          graphRef.current.centerAt(node.x, node.y, 500);
          graphRef.current.zoom(2, 500);
          setHighlightedNodes(new Set([nodeId]));
        } else {
          // Fallback: just highlight the node
          setHighlightedNodes(new Set([nodeId]));
        }
      }
    },
    [filteredGraphData]
  );

  // Toggle node type visibility
  const toggleNodeType = useCallback((type: string) => {
    setVisibleNodeTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  // Get available categories from data
  const availableCategories = useMemo(() => {
    if (!graphData) return [];
    const categories = new Set<string>();
    graphData.nodes.forEach((n) => {
      if (n.category) categories.add(n.category);
    });
    return Array.from(categories);
  }, [graphData]);

  if (!isMounted || isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Network Graph</CardTitle>
          <CardDescription>
            Relationships between politicians, donors, and bills
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] flex items-center justify-center">
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
          <CardTitle>Network Graph</CardTitle>
          <CardDescription>
            Relationships between politicians, donors, and bills
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] flex items-center justify-center text-red-600">
            Error: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state when no politician selected
  if (!selectedPoliticianId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Network Graph</CardTitle>
          <CardDescription>
            Relationships between politicians, donors, and bills
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <Users className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              Select a Politician to Explore
            </h3>
            <p className="text-sm text-gray-500 text-center max-w-md">
              Use the dropdown above to select a politician and explore their network
              of donors, bills, and connections. You can adjust the connection depth
              to see more or fewer relationships.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!filteredGraphData || filteredGraphData.nodes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Network Graph</CardTitle>
          <CardDescription>
            Relationships between politicians, donors, and bills
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Network Controls */}
          <NetworkControls
            selectedPoliticianName={selectedPoliticianName || null}
            connectionDepth={connectionDepth}
            maxDepth={MAX_DEPTH}
            nodeCount={0}
            edgeCount={0}
            onDepthChange={handleDepthChange}
            onExpand={handleExpandNetwork}
            onReset={handleResetToImmediate}
            isLoading={isLoading}
          />
          <div className="h-[500px] flex items-center justify-center text-gray-500 mt-4">
            No network data available for this politician. Try adjusting filters or selecting a different politician.
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
            <CardTitle>Network Graph</CardTitle>
            <CardDescription>
              Relationships between politicians, donors, and bills
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
            </Button>
            <Button
              variant={showClusters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowClusters(!showClusters)}
            >
              <Layers className="h-4 w-4 mr-1" />
              Clusters
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Network Controls - Depth and Stats */}
        <NetworkControls
          selectedPoliticianName={selectedPoliticianName || null}
          connectionDepth={connectionDepth}
          maxDepth={MAX_DEPTH}
          nodeCount={filteredGraphData.nodes.length}
          edgeCount={filteredGraphData.edges.length}
          onDepthChange={handleDepthChange}
          onExpand={handleExpandNetwork}
          onReset={handleResetToImmediate}
          isLoading={isLoading}
        />

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search within network..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {searchResults.length > 0 && searchQuery && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {searchResults.slice(0, 10).map((node) => (
                <button
                  key={node.id}
                  onClick={() => {
                    focusOnNode(node.id);
                    setSearchQuery("");
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor:
                        NODE_COLORS[node.type as keyof typeof NODE_COLORS],
                    }}
                  />
                  <span className="font-medium">{node.label}</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {node.type}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="p-4 bg-gray-50 rounded-lg space-y-4">
            <h4 className="font-semibold text-sm">Filters</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min-amount" className="text-xs">
                  Minimum Donation Amount: ${minAmount.toLocaleString()}
                </Label>
                <Slider
                  id="min-amount"
                  min={0}
                  max={200000}
                  step={10000}
                  value={[minAmount]}
                  onValueChange={([val]) => setMinAmount(val)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="category-filter" className="text-xs">
                  Category
                </Label>
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger id="category-filter" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Node Type Visibility */}
            <div>
              <Label className="text-xs mb-2 block">Show Node Types</Label>
              <div className="flex gap-2">
                {(["politician", "donor", "bill"] as const).map((type) => (
                  <Button
                    key={type}
                    variant={visibleNodeTypes.has(type) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleNodeType(type)}
                    style={{
                      backgroundColor: visibleNodeTypes.has(type)
                        ? NODE_COLORS[type]
                        : undefined,
                    }}
                  >
                    {visibleNodeTypes.has(type) ? (
                      <Eye className="h-3 w-3 mr-1" />
                    ) : (
                      <EyeOff className="h-3 w-3 mr-1" />
                    )}
                    {type.charAt(0).toUpperCase() + type.slice(1)}s
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Exploration Mode Selector */}
        <div className="flex items-center gap-4">
          <Label className="text-sm font-medium">Exploration Mode:</Label>
          <Tabs
            value={explorationMode}
            onValueChange={(v) => {
              setExplorationMode(v as ExplorationMode);
              clearSelection();
            }}
          >
            <TabsList>
              <TabsTrigger value="default">
                <Network className="h-4 w-4 mr-1" />
                Default
              </TabsTrigger>
              <TabsTrigger value="influence_path">
                <Route className="h-4 w-4 mr-1" />
                Influence Path
              </TabsTrigger>
              <TabsTrigger value="legislative_web">
                <Layers className="h-4 w-4 mr-1" />
                Legislative Web
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {explorationMode !== "default" && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent>
                  {explorationMode === "influence_path"
                    ? "Click a DONOR node to trace their influence to politicians and bills"
                    : "Click a BILL node to see sponsors and their funding sources"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Path Steps Indicator */}
        {pathSteps.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-pink-50 border border-pink-200 rounded-lg">
            <Route className="h-4 w-4 text-pink-600" />
            <div className="flex items-center gap-1 text-sm">
              {pathSteps.map((step, idx) => (
                <span key={idx} className="flex items-center gap-1">
                  {idx > 0 && (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                  <span
                    className={idx === 0 ? "font-semibold" : "text-gray-600"}
                  >
                    {step}
                  </span>
                </span>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="ml-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Legend */}
        <div className="flex gap-4 text-sm flex-wrap items-center">
          <span className="font-medium">Nodes:</span>
          <div className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: NODE_COLORS.politician }}
            />
            <span>Politicians</span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: NODE_COLORS.donor }}
            />
            <span>Donors</span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: NODE_COLORS.bill }}
            />
            <span>Bills</span>
          </div>
          <span className="ml-4 font-medium">Edges:</span>
          <div className="flex items-center gap-1">
            <div
              className="w-4 h-0.5"
              style={{ backgroundColor: EDGE_COLORS.donation }}
            />
            <span>Donation</span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-4 h-0.5"
              style={{ backgroundColor: EDGE_COLORS.vote }}
            />
            <span>Vote</span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-4 h-0.5"
              style={{ backgroundColor: EDGE_COLORS.sponsor }}
            />
            <span>Sponsor</span>
          </div>
          {includeIndirect && (
            <div className="flex items-center gap-1">
              <div
                className="w-4 h-0.5 border-t-2 border-dashed"
                style={{ borderColor: EDGE_COLORS.indirect }}
              />
              <span>Indirect</span>
            </div>
          )}
        </div>

        {/* Cluster Legend */}
        {showClusters &&
          graphData?.clusters &&
          graphData.clusters.length > 0 && (
            <div className="flex gap-4 text-sm flex-wrap items-center border-t pt-2">
              <span className="font-medium">Categories:</span>
              {graphData.clusters.map((cluster) => (
                <div key={cluster.id} className="flex items-center gap-1">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: cluster.color }}
                  />
                  <span>{cluster.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {cluster.node_ids.length}
                  </Badge>
                </div>
              ))}
            </div>
          )}

        {/* Graph */}
        <div className="h-[600px] rounded-lg overflow-hidden border relative">
          {/* Zoom controls */}
          <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                graphRef.current?.zoom(graphRef.current.zoom() * 1.5, 300)
              }
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                graphRef.current?.zoom(graphRef.current.zoom() / 1.5, 300)
              }
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => graphRef.current?.zoomToFit(400, 20)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>

          <ForceGraph2D
            ref={graphRef}
            graphData={{
              nodes: filteredGraphData.nodes.map((n) => ({ ...n })),
              links: filteredGraphData.edges.map((e) => ({
                ...e,
                source: e.source,
                target: e.target,
              })),
            }}
            nodeLabel={(node: any) => {
              const networkNode = filteredGraphData.nodes.find(
                (n) => n.id === node.id
              );
              if (!networkNode) return node.id;
              let label = `${networkNode.label} (${networkNode.type})`;
              if (networkNode.category)
                label += `\nCategory: ${networkNode.category}`;
              if (networkNode.amount)
                label += `\nTotal: $${networkNode.amount.toLocaleString()}`;
              return label;
            }}
            nodeColor={(node: any) => {
              const networkNode = filteredGraphData.nodes.find(
                (n) => n.id === node.id
              );
              return networkNode ? getNodeColor(networkNode) : "#6b7280";
            }}
            nodeVal={(node: any) => {
              const networkNode = filteredGraphData.nodes.find(
                (n) => n.id === node.id
              );
              const isHighlighted =
                highlightedNodes.has(node.id) ||
                highlightedPath?.nodes.includes(node.id);

              // Size based on connections
              const connections = filteredGraphData.edges.filter(
                (e) => e.source === node.id || e.target === node.id
              ).length;

              let size = Math.max(5, Math.min(20, connections * 2));
              if (isHighlighted) size *= 1.5;
              if (networkNode?.type === "politician") size *= 1.2;

              return size;
            }}
            linkLabel={(link: any) => {
              const edge = filteredGraphData.edges.find(
                (e) =>
                  e.source === (link.source?.id || link.source) &&
                  e.target === (link.target?.id || link.target)
              );
              if (!edge) return "";
              const sourceNode = filteredGraphData.nodes.find(
                (n) => n.id === (link.source?.id || link.source)
              );
              const targetNode = filteredGraphData.nodes.find(
                (n) => n.id === (link.target?.id || link.target)
              );
              let label = `${sourceNode?.label || link.source} → ${
                targetNode?.label || link.target
              }`;
              label += `\nType: ${edge.type}`;
              if (edge.weight > 1)
                label += `\nAmount: $${edge.weight.toLocaleString()}`;
              return label;
            }}
            linkColor={(link: any) => {
              const edge = filteredGraphData.edges.find(
                (e) =>
                  (e.source === link.source?.id || e.source === link.source) &&
                  (e.target === link.target?.id || e.target === link.target)
              );
              return edge ? getEdgeColor(edge) : "#6b7280";
            }}
            linkWidth={(link: any) => {
              const edge = filteredGraphData.edges.find(
                (e) =>
                  (e.source === link.source?.id || e.source === link.source) &&
                  (e.target === link.target?.id || e.target === link.target)
              );
              const isInPath = highlightedPath?.edges.some(
                (pe) =>
                  pe.source === (link.source?.id || link.source) &&
                  pe.target === (link.target?.id || link.target)
              );

              let width = edge
                ? Math.max(1, Math.min(5, edge.weight / 10000))
                : 1;
              if (isInPath) width *= 2;

              return width;
            }}
            linkDirectionalArrowLength={6}
            linkDirectionalArrowRelPos={1}
            linkLineDash={(link: any) => {
              const edge = filteredGraphData.edges.find(
                (e) =>
                  (e.source === link.source?.id || e.source === link.source) &&
                  (e.target === link.target?.id || e.target === link.target)
              );
              return edge?.type === "indirect" ? [5, 5] : null;
            }}
            onNodeClick={handleNodeClick}
            onLinkClick={handleEdgeClick}
            onBackgroundClick={clearSelection}
            cooldownTicks={100}
            onEngineStop={() => {
              if (graphRef.current) {
                graphRef.current.zoomToFit(400, 20);
              }
            }}
          />
        </div>

        {/* Selected Node/Edge Info */}
        {selectedNode && (
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{
                    backgroundColor:
                      NODE_COLORS[
                        selectedNode.type as keyof typeof NODE_COLORS
                      ],
                  }}
                />
                <h3 className="font-semibold text-lg">{selectedNode.label}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{selectedNode.type}</Badge>
                {selectedNode.category && (
                  <Badge
                    style={{
                      backgroundColor: CATEGORY_COLORS[selectedNode.category],
                      color: "white",
                    }}
                  >
                    {selectedNode.category}
                  </Badge>
                )}
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {selectedNode.metadata &&
              Object.keys(selectedNode.metadata).length > 0 && (
                <div className="text-sm text-gray-600 space-y-1">
                  {Object.entries(selectedNode.metadata).map(([key, value]) => (
                    <div key={key}>
                      <span className="font-medium capitalize">
                        {key.replace(/_/g, " ")}:
                      </span>{" "}
                      {typeof value === "number"
                        ? value.toLocaleString()
                        : String(value)}
                    </div>
                  ))}
                </div>
              )}

            <div className="flex gap-4 text-sm text-gray-500 pt-2 border-t">
              <span>
                Connections:{" "}
                {
                  filteredGraphData.edges.filter(
                    (e) =>
                      e.source === selectedNode.id ||
                      e.target === selectedNode.id
                  ).length
                }
              </span>
              {selectedNode.type === "donor" &&
                explorationMode !== "influence_path" && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => {
                      setExplorationMode("influence_path");
                      // Use setTimeout to ensure state updates before handling click
                      setTimeout(
                        () => handleNodeClick({ id: selectedNode.id }),
                        0
                      );
                    }}
                  >
                    Trace Influence Path →
                  </Button>
                )}
              {selectedNode.type === "bill" &&
                explorationMode !== "legislative_web" && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => {
                      setExplorationMode("legislative_web");
                      // Use setTimeout to ensure state updates before handling click
                      setTimeout(
                        () => handleNodeClick({ id: selectedNode.id }),
                        0
                      );
                    }}
                  >
                    Show Legislative Web →
                  </Button>
                )}
            </div>
          </div>
        )}

        {selectedEdge && (
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">
                {
                  filteredGraphData.nodes.find(
                    (n) => n.id === selectedEdge.source
                  )?.label
                }{" "}
                →{" "}
                {
                  filteredGraphData.nodes.find(
                    (n) => n.id === selectedEdge.target
                  )?.label
                }
              </h3>
              <div className="flex items-center gap-2">
                <Badge
                  style={{
                    backgroundColor:
                      EDGE_COLORS[
                        selectedEdge.type as keyof typeof EDGE_COLORS
                      ],
                    color: "white",
                  }}
                >
                  {selectedEdge.type}
                </Badge>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="text-sm space-y-1">
              {selectedEdge.weight > 1 && (
                <div>
                  <span className="font-medium">
                    {selectedEdge.type === "donation" ? "Amount" : "Weight"}:
                  </span>{" "}
                  ${selectedEdge.weight.toLocaleString()}
                </div>
              )}
              {selectedEdge.category && (
                <div>
                  <span className="font-medium">Category:</span>{" "}
                  {selectedEdge.category}
                </div>
              )}
              {selectedEdge.metadata &&
                Object.keys(selectedEdge.metadata).length > 0 && (
                  <div className="text-gray-600">
                    {Object.entries(selectedEdge.metadata).map(
                      ([key, value]) => (
                        <div key={key}>
                          <span className="font-medium capitalize">
                            {key.replace(/_/g, " ")}:
                          </span>{" "}
                          {typeof value === "number"
                            ? value.toLocaleString()
                            : String(value)}
                        </div>
                      )
                    )}
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="font-semibold text-lg">
              {filteredGraphData.nodes.length}
            </div>
            <div className="text-gray-600">Nodes</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="font-semibold text-lg">
              {filteredGraphData.edges.length}
            </div>
            <div className="text-gray-600">Edges</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="font-semibold text-lg">
              {
                filteredGraphData.nodes.filter((n) => n.type === "politician")
                  .length
              }
            </div>
            <div className="text-gray-600">Politicians</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="font-semibold text-lg">
              $
              {filteredGraphData.edges
                .filter((e) => e.type === "donation")
                .reduce((sum, e) => sum + e.weight, 0)
                .toLocaleString()}
            </div>
            <div className="text-gray-600">Total Donations</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
