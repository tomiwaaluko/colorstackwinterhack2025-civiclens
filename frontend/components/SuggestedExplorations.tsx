"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Lightbulb,
  TrendingUp,
  Users,
  DollarSign,
  Scale,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  Network,
  PieChart,
} from "lucide-react";

export interface Exploration {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: "trending" | "comparison" | "money" | "voting" | "discovery";
  action: () => void;
  difficulty?: "easy" | "medium" | "advanced";
  estimatedTime?: string;
  tags?: string[];
}

interface SuggestedExplorationsProps {
  explorations: Exploration[];
  onExplore: (exploration: Exploration) => void;
  title?: string;
  showCategories?: boolean;
  maxVisible?: number;
  variant?: "cards" | "compact" | "inline";
}

const CATEGORY_COLORS: Record<string, string> = {
  trending: "bg-orange-100 text-orange-800",
  comparison: "bg-blue-100 text-blue-800",
  money: "bg-green-100 text-green-800",
  voting: "bg-purple-100 text-purple-800",
  discovery: "bg-pink-100 text-pink-800",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  trending: <TrendingUp className="h-4 w-4" />,
  comparison: <Users className="h-4 w-4" />,
  money: <DollarSign className="h-4 w-4" />,
  voting: <Scale className="h-4 w-4" />,
  discovery: <Sparkles className="h-4 w-4" />,
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  advanced: "bg-red-100 text-red-800",
};

export default function SuggestedExplorations({
  explorations,
  onExplore,
  title = "Suggested Explorations",
  showCategories = true,
  maxVisible = 3,
  variant = "cards",
}: SuggestedExplorationsProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const cats = new Set(explorations.map((e) => e.category));
    return Array.from(cats);
  }, [explorations]);

  const filteredExplorations = useMemo(() => {
    if (!selectedCategory) return explorations;
    return explorations.filter((e) => e.category === selectedCategory);
  }, [explorations, selectedCategory]);

  const visibleExplorations = expanded
    ? filteredExplorations
    : filteredExplorations.slice(0, maxVisible);

  const hasMore = filteredExplorations.length > maxVisible;

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-medium text-gray-600">Try:</span>
        {visibleExplorations.map((exploration) => (
          <Button
            key={exploration.id}
            variant="outline"
            size="sm"
            onClick={() => {
              onExplore(exploration);
              exploration.action();
            }}
            className="text-xs"
          >
            {exploration.title}
          </Button>
        ))}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <div className="space-y-1">
          {visibleExplorations.map((exploration) => (
            <button
              key={exploration.id}
              onClick={() => {
                onExplore(exploration);
                exploration.action();
              }}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <div className="text-gray-400">{exploration.icon}</div>
                <span className="text-sm">{exploration.title}</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </button>
          ))}
        </div>
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-full text-xs"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Show {filteredExplorations.length - maxVisible} more
              </>
            )}
          </Button>
        )}
      </div>
    );
  }

  // Cards variant (default)
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            {title}
          </CardTitle>
          {showCategories && categories.length > 1 && (
            <div className="flex gap-1">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className="text-xs"
              >
                All
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className="text-xs gap-1"
                >
                  {CATEGORY_ICONS[cat]}
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleExplorations.map((exploration) => (
          <div
            key={exploration.id}
            className="p-3 border rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-colors cursor-pointer group"
            onClick={() => {
              onExplore(exploration);
              exploration.action();
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                onExplore(exploration);
                exploration.action();
              }
            }}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-blue-100 transition-colors">
                {exploration.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-medium text-gray-900">
                    {exploration.title}
                  </h4>
                  <Badge className={CATEGORY_COLORS[exploration.category]} variant="secondary">
                    {exploration.category}
                  </Badge>
                  {exploration.difficulty && (
                    <Badge className={DIFFICULTY_COLORS[exploration.difficulty]} variant="outline">
                      {exploration.difficulty}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {exploration.description}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  {exploration.estimatedTime && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {exploration.estimatedTime}
                    </span>
                  )}
                  {exploration.tags && exploration.tags.length > 0 && (
                    <div className="flex gap-1">
                      {exploration.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        ))}

        {hasMore && (
          <Button
            variant="ghost"
            onClick={() => setExpanded(!expanded)}
            className="w-full"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Show {filteredExplorations.length - maxVisible} more explorations
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Pre-built explorations for the visualizations page
export function getDefaultExplorations(
  switchToTab: (tab: string) => void,
  setPoliticianId: (id: string) => void
): Exploration[] {
  return [
    {
      id: "top-donor-states",
      title: "Top Donor States",
      description: "Discover which states contribute the most to political campaigns and how the money flows.",
      icon: <MapPin className="h-5 w-5 text-blue-500" />,
      category: "money",
      difficulty: "easy",
      estimatedTime: "2 min",
      tags: ["donations", "geography"],
      action: () => switchToTab("map"),
    },
    {
      id: "vote-donation-correlation",
      title: "Votes & Donations Timeline",
      description: "See how donations and votes align over time. Remember: correlation doesn't imply causation!",
      icon: <Clock className="h-5 w-5 text-purple-500" />,
      category: "discovery",
      difficulty: "medium",
      estimatedTime: "5 min",
      tags: ["timeline", "correlation"],
      action: () => {
        switchToTab("timeline");
        setPoliticianId("1");
      },
    },
    {
      id: "influence-network",
      title: "Map the Influence Network",
      description: "Trace connections from donors through politicians to the bills they sponsor.",
      icon: <Network className="h-5 w-5 text-green-500" />,
      category: "discovery",
      difficulty: "advanced",
      estimatedTime: "10 min",
      tags: ["network", "influence"],
      action: () => switchToTab("network"),
    },
    {
      id: "category-breakdown",
      title: "Who Funds What?",
      description: "Explore donation categories and see which industries support which legislation.",
      icon: <PieChart className="h-5 w-5 text-orange-500" />,
      category: "money",
      difficulty: "easy",
      estimatedTime: "3 min",
      tags: ["categories", "donations"],
      action: () => {
        switchToTab("radial");
        setPoliticianId("1");
      },
    },
    {
      id: "compare-politicians",
      title: "Compare Two Politicians",
      description: "See how donation patterns differ between politicians from different parties.",
      icon: <Users className="h-5 w-5 text-blue-500" />,
      category: "comparison",
      difficulty: "medium",
      estimatedTime: "5 min",
      tags: ["comparison", "parties"],
      action: () => switchToTab("map"),
    },
    {
      id: "healthcare-money",
      title: "Follow the Healthcare Money",
      description: "Track healthcare industry donations and related voting patterns.",
      icon: <TrendingUp className="h-5 w-5 text-red-500" />,
      category: "trending",
      difficulty: "medium",
      estimatedTime: "7 min",
      tags: ["healthcare", "industry"],
      action: () => switchToTab("network"),
    },
  ];
}
