"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";

// react-force-graph needs to be imported dynamically for Next.js
const ForceGraph2D = dynamic(
  () => import("react-force-graph").then((mod) => mod.ForceGraph2D),
  { ssr: false }
);
import type {
  NetworkGraphResponse,
  NetworkNode,
  NetworkEdge,
} from "@/lib/types";
import { getNetworkGraph } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "./LoadingSpinner";

interface NetworkGraphProps {
  politicianIds?: number[];
  includeIndirect?: boolean;
}

export default function NetworkGraph({
  politicianIds,
  includeIndirect = false,
}: NetworkGraphProps) {
  const [graphData, setGraphData] = useState<NetworkGraphResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<NetworkEdge | null>(null);
  const graphRef = useRef<any>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    getNetworkGraph({
      politician_ids: politicianIds,
      include_indirect: includeIndirect,
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
  }, [politicianIds, includeIndirect]);

  // Color nodes by type
  const getNodeColor = (node: NetworkNode): string => {
    switch (node.type) {
      case "politician":
        return "#3b82f6"; // Blue
      case "donor":
        return "#10b981"; // Green
      case "bill":
        return "#f59e0b"; // Amber
      default:
        return "#6b7280"; // Gray
    }
  };

  // Color edges by type
  const getEdgeColor = (edge: NetworkEdge): string => {
    switch (edge.type) {
      case "donation":
        return "#10b981"; // Green
      case "vote":
        return "#3b82f6"; // Blue
      case "indirect":
        return "#f59e0b"; // Amber (dashed)
      default:
        return "#6b7280"; // Gray
    }
  };

  if (isLoading) {
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

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Network Graph</CardTitle>
          <CardDescription>
            Relationships between politicians, donors, and bills
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] flex items-center justify-center text-gray-500">
            No network data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Network Graph</CardTitle>
        <CardDescription>
          Relationships between politicians, donors, and bills
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Legend */}
        <div className="flex gap-4 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500" />
            <span>Politicians</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500" />
            <span>Donors</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-amber-500" />
            <span>Bills</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-green-500" />
            <span>Donations</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-blue-500" />
            <span>Votes</span>
          </div>
          {includeIndirect && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-amber-500 border-dashed border-t-2" />
              <span>Indirect</span>
            </div>
          )}
        </div>

        {/* Graph */}
        <div className="h-[600px] rounded-lg overflow-hidden border">
          <ForceGraph2D
            ref={graphRef}
            graphData={{
              nodes: graphData.nodes,
              links: graphData.edges,
            }}
            nodeLabel={(node: any) => {
              const networkNode = graphData.nodes.find((n) => n.id === node.id);
              return networkNode
                ? `${networkNode.label} (${networkNode.type})`
                : node.id;
            }}
            nodeColor={(node: any) => {
              const networkNode = graphData.nodes.find((n) => n.id === node.id);
              return networkNode ? getNodeColor(networkNode) : "#6b7280";
            }}
            nodeVal={(node: any) => {
              // Size nodes based on connections
              const connections = graphData.edges.filter(
                (e) => e.source === node.id || e.target === node.id
              ).length;
              return Math.max(5, Math.min(20, connections * 2));
            }}
            linkLabel={(link: any) => {
              const edge = graphData.edges.find(
                (e) =>
                  e.source === (link.source?.id || link.source) &&
                  e.target === (link.target?.id || link.target)
              );
              if (!edge) return "";
              const sourceNode = graphData.nodes.find(
                (n) => n.id === (link.source?.id || link.source)
              );
              const targetNode = graphData.nodes.find(
                (n) => n.id === (link.target?.id || link.target)
              );
              return `${sourceNode?.label || link.source} → ${
                targetNode?.label || link.target
              } (${edge.type})`;
            }}
            linkColor={(link: any) => {
              const edge = graphData.edges.find(
                (e) =>
                  (e.source === link.source?.id || e.source === link.source) &&
                  (e.target === link.target?.id || e.target === link.target)
              );
              return edge ? getEdgeColor(edge) : "#6b7280";
            }}
            linkWidth={(link: any) => {
              const edge = graphData.edges.find(
                (e) =>
                  (e.source === link.source?.id || e.source === link.source) &&
                  (e.target === link.target?.id || e.target === link.target)
              );
              return edge ? Math.max(1, Math.min(5, edge.weight / 1000)) : 1;
            }}
            linkDirectionalArrowLength={6}
            linkDirectionalArrowRelPos={1}
            onNodeClick={(node: any) => {
              const networkNode = graphData.nodes.find((n) => n.id === node.id);
              if (networkNode) {
                setSelectedNode(networkNode);
                setSelectedEdge(null);
              }
            }}
            onLinkClick={(link: any) => {
              const edge = graphData.edges.find(
                (e) =>
                  (e.source === link.source?.id || e.source === link.source) &&
                  (e.target === link.target?.id || e.target === link.target)
              );
              if (edge) {
                setSelectedEdge(edge);
                setSelectedNode(null);
              }
            }}
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
              <h3 className="font-semibold text-lg">{selectedNode.label}</h3>
              <Badge variant="outline">{selectedNode.type}</Badge>
            </div>
            {selectedNode.metadata &&
              Object.keys(selectedNode.metadata).length > 0 && (
                <div className="text-sm text-gray-600 space-y-1">
                  {Object.entries(selectedNode.metadata).map(([key, value]) => (
                    <div key={key}>
                      <span className="font-medium">{key}:</span>{" "}
                      {String(value)}
                    </div>
                  ))}
                </div>
              )}
            <div className="text-sm text-gray-500">
              Connections:{" "}
              {
                graphData.edges.filter(
                  (e) =>
                    e.source === selectedNode.id || e.target === selectedNode.id
                ).length
              }
            </div>
          </div>
        )}

        {selectedEdge && (
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">
                {
                  graphData.nodes.find((n) => n.id === selectedEdge.source)
                    ?.label
                }{" "}
                →{" "}
                {
                  graphData.nodes.find((n) => n.id === selectedEdge.target)
                    ?.label
                }
              </h3>
              <Badge variant="outline">{selectedEdge.type}</Badge>
            </div>
            <div className="text-sm space-y-1">
              <div>
                <span className="font-medium">Weight:</span>{" "}
                {selectedEdge.weight.toLocaleString()}
              </div>
              {selectedEdge.metadata &&
                Object.keys(selectedEdge.metadata).length > 0 && (
                  <div className="text-gray-600">
                    {Object.entries(selectedEdge.metadata).map(
                      ([key, value]) => (
                        <div key={key}>
                          <span className="font-medium">{key}:</span>{" "}
                          {String(value)}
                        </div>
                      )
                    )}
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="font-semibold text-lg">
              {graphData.nodes.length}
            </div>
            <div className="text-gray-600">Nodes</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-lg">
              {graphData.edges.length}
            </div>
            <div className="text-gray-600">Edges</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-lg">
              {new Set(graphData.edges.map((e) => e.type)).size}
            </div>
            <div className="text-gray-600">Edge Types</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
