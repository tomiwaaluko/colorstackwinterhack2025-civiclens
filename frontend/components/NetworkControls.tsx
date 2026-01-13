"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Expand,
  RotateCcw,
  Users,
  GitBranch,
  Info,
} from "lucide-react";

interface NetworkControlsProps {
  selectedPoliticianName: string | null;
  connectionDepth: number;
  maxDepth?: number;
  nodeCount: number;
  edgeCount: number;
  onDepthChange: (depth: number) => void;
  onExpand: () => void;
  onReset: () => void;
  isLoading?: boolean;
}

export default function NetworkControls({
  selectedPoliticianName,
  connectionDepth,
  maxDepth = 3,
  nodeCount,
  edgeCount,
  onDepthChange,
  onExpand,
  onReset,
  isLoading = false,
}: NetworkControlsProps) {
  const canExpand = connectionDepth < maxDepth;

  return (
    <div className="p-4 bg-gray-50 rounded-lg space-y-4">
      {/* Selected Politician Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          <span className="font-semibold">
            {selectedPoliticianName ? (
              <>Network for: <span className="text-blue-600">{selectedPoliticianName}</span></>
            ) : (
              <span className="text-gray-500">No politician selected</span>
            )}
          </span>
        </div>

        {/* Stats Badges */}
        {selectedPoliticianName && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <span className="font-mono">{nodeCount}</span> nodes
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <span className="font-mono">{edgeCount}</span> edges
            </Badge>
          </div>
        )}
      </div>

      {/* Controls - Only show when politician selected */}
      {selectedPoliticianName && (
        <>
          {/* Connection Depth Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-gray-500" />
                <Label className="text-sm font-medium">Connection Depth</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3.5 w-3.5 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p>
                        Controls how many hops from the selected politician to show.
                        1 = immediate connections, 2 = connections of connections, etc.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <span className="text-sm text-gray-600">
                Showing up to <span className="font-semibold">{connectionDepth}</span> degree{connectionDepth > 1 ? 's' : ''} away
              </span>
            </div>

            <div className="flex items-center gap-4">
              <Slider
                value={[connectionDepth]}
                onValueChange={([value]) => onDepthChange(value)}
                min={1}
                max={maxDepth}
                step={1}
                className="flex-1"
                disabled={isLoading}
              />
              <div className="flex gap-1 text-xs text-gray-500 min-w-[60px]">
                {Array.from({ length: maxDepth }, (_, i) => i + 1).map((d) => (
                  <button
                    key={d}
                    onClick={() => onDepthChange(d)}
                    disabled={isLoading}
                    className={`px-2 py-1 rounded transition-colors ${
                      connectionDepth === d
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={onExpand}
              disabled={!canExpand || isLoading}
              className="flex items-center gap-1"
            >
              <Expand className="h-4 w-4" />
              Expand Network
              {canExpand && (
                <span className="text-xs text-gray-500 ml-1">
                  (+1 degree)
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              disabled={connectionDepth === 1 || isLoading}
              className="flex items-center gap-1"
            >
              <RotateCcw className="h-4 w-4" />
              Reset to Immediate
            </Button>

            {isLoading && (
              <span className="text-sm text-gray-500 ml-auto">
                Updating graph...
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
