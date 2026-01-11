"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sparkles,
  Lightbulb,
  TrendingUp,
  Users,
  DollarSign,
  Scale,
  ArrowRight,
  Loader2,
  RefreshCw,
  Clock,
  Filter,
  GitCompare,
  Layers,
  MousePointer,
} from "lucide-react";
import {
  getVisualizationSuggestions,
  type AISuggestion,
  type SuggestionsResponse,
  type VisualizationType,
  type SuggestionCategory,
  type SuggestionActionType,
} from "@/lib/visualization-ai";

interface AISmartSuggestionsProps {
  visualizationType: VisualizationType;
  currentState: Record<string, unknown>;
  userHistory?: string[];
  onSuggestionClick?: (suggestion: AISuggestion) => void;
  className?: string;
  maxVisible?: number;
  variant?: "cards" | "compact" | "inline";
  showRefresh?: boolean;
}

const CATEGORY_ICONS: Record<SuggestionCategory, React.ReactNode> = {
  trending: <TrendingUp className="h-4 w-4" />,
  comparison: <Users className="h-4 w-4" />,
  money: <DollarSign className="h-4 w-4" />,
  voting: <Scale className="h-4 w-4" />,
  discovery: <Sparkles className="h-4 w-4" />,
};

const CATEGORY_COLORS: Record<SuggestionCategory, string> = {
  trending: "bg-orange-100 text-orange-800 border-orange-200",
  comparison: "bg-blue-100 text-blue-800 border-blue-200",
  money: "bg-green-100 text-green-800 border-green-200",
  voting: "bg-purple-100 text-purple-800 border-purple-200",
  discovery: "bg-pink-100 text-pink-800 border-pink-200",
};

const ACTION_ICONS: Record<SuggestionActionType, React.ReactNode> = {
  filter: <Filter className="h-3 w-3" />,
  compare: <GitCompare className="h-3 w-3" />,
  timerange: <Clock className="h-3 w-3" />,
  switch_view: <Layers className="h-3 w-3" />,
  drill_down: <MousePointer className="h-3 w-3" />,
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  advanced: "bg-red-100 text-red-700",
};

function SuggestionCard({
  suggestion,
  onClick,
}: {
  suggestion: AISuggestion;
  onClick?: () => void;
}) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] ${
        CATEGORY_COLORS[suggestion.category]
      }`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{CATEGORY_ICONS[suggestion.category]}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-sm">{suggestion.title}</h4>
              <Badge
                variant="outline"
                className={`text-xs ${DIFFICULTY_COLORS[suggestion.difficulty]}`}
              >
                {suggestion.difficulty}
              </Badge>
            </div>
            <p className="text-xs mt-1 opacity-80">{suggestion.description}</p>
            <div className="flex items-center gap-2 mt-2 text-xs opacity-70">
              {ACTION_ICONS[suggestion.action.type]}
              <span>{suggestion.estimated_time}</span>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 opacity-50" />
        </div>
      </CardContent>
    </Card>
  );
}

function CompactSuggestion({
  suggestion,
  onClick,
}: {
  suggestion: AISuggestion;
  onClick?: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={`justify-start text-left h-auto py-2 px-3 ${
        CATEGORY_COLORS[suggestion.category]
      }`}
    >
      <div className="flex items-center gap-2">
        {CATEGORY_ICONS[suggestion.category]}
        <span className="text-xs">{suggestion.title}</span>
        <Badge
          variant="outline"
          className={`text-xs ml-auto ${DIFFICULTY_COLORS[suggestion.difficulty]}`}
        >
          {suggestion.difficulty}
        </Badge>
      </div>
    </Button>
  );
}

function InlineSuggestion({
  suggestion,
  onClick,
}: {
  suggestion: AISuggestion;
  onClick?: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="text-xs h-auto py-1 px-2"
    >
      {CATEGORY_ICONS[suggestion.category]}
      <span className="ml-1">{suggestion.title}</span>
    </Button>
  );
}

export default function AISmartSuggestions({
  visualizationType,
  currentState,
  userHistory = [],
  onSuggestionClick,
  className = "",
  maxVisible = 3,
  variant = "cards",
  showRefresh = true,
}: AISmartSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getVisualizationSuggestions({
        visualization_type: visualizationType,
        current_state: currentState,
        user_history: userHistory,
      });
      setSuggestions(result.suggestions);
    } catch (err) {
      setError("Failed to load suggestions");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [visualizationType, currentState, userHistory]);

  // Fetch suggestions on mount
  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const visibleSuggestions = showAll
    ? suggestions
    : suggestions.slice(0, maxVisible);
  const hasMore = suggestions.length > maxVisible;

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
        <span className="text-sm text-gray-500">Loading AI suggestions...</span>
      </div>
    );
  }

  if (error || suggestions.length === 0) {
    return null; // Silently fail - suggestions are optional
  }

  if (variant === "inline") {
    return (
      <div className={`flex items-center gap-2 flex-wrap ${className}`}>
        <div className="flex items-center gap-1 text-amber-500">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-medium">AI suggests:</span>
        </div>
        {visibleSuggestions.map((suggestion) => (
          <InlineSuggestion
            key={suggestion.id}
            suggestion={suggestion}
            onClick={() => onSuggestionClick?.(suggestion)}
          />
        ))}
        {hasMore && !showAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(true)}
            className="text-xs"
          >
            +{suggestions.length - maxVisible} more
          </Button>
        )}
        {showRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchSuggestions}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">AI Suggestions</span>
          </div>
          {showRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchSuggestions}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div className="space-y-1">
          {visibleSuggestions.map((suggestion) => (
            <CompactSuggestion
              key={suggestion.id}
              suggestion={suggestion}
              onClick={() => onSuggestionClick?.(suggestion)}
            />
          ))}
        </div>
        {hasMore && !showAll && (
          <Button
            variant="link"
            size="sm"
            onClick={() => setShowAll(true)}
            className="text-xs p-0 h-auto"
          >
            Show {suggestions.length - maxVisible} more suggestions
          </Button>
        )}
      </div>
    );
  }

  // Default: cards variant
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base">AI Suggestions</CardTitle>
          </div>
          {showRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchSuggestions}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {visibleSuggestions.map((suggestion) => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            onClick={() => onSuggestionClick?.(suggestion)}
          />
        ))}
        {hasMore && !showAll && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll(true)}
            className="w-full"
          >
            Show {suggestions.length - maxVisible} more suggestions
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
