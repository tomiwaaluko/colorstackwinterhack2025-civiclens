"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import ReactECharts from "echarts-for-react";
import type { RadialResponse, CategoryValue, RelatedBill, ComparativeRadialData } from "@/lib/types";
import { getPoliticianRadial } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import LoadingSpinner from "./LoadingSpinner";
import {
  Play,
  Pause,
  RotateCcw,
  Layers,
  Users,
  ChevronRight,
  Info,
  X,
  ZoomIn,
  ExternalLink,
  Check,
  XIcon,
  Minus,
} from "lucide-react";

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  Healthcare: "#ef4444",
  Energy: "#f59e0b",
  Technology: "#3b82f6",
  Finance: "#10b981",
  Defense: "#6b7280",
  Labor: "#8b5cf6",
  Education: "#ec4899",
  Environment: "#22c55e",
};

// Vote outcome colors
const VOTE_COLORS = {
  yes: "#22c55e",
  no: "#ef4444",
  abstain: "#9ca3af",
};

interface RadialChartProps {
  politicianId: number | string;
  startDate?: string;
  endDate?: string;
  // Comparative mode
  comparativePoliticians?: Array<{ id: number | string; name: string; party: string }>;
  onCitationClick?: (citations: any[]) => void;
}

export default function RadialChart({
  politicianId,
  startDate,
  endDate,
  comparativePoliticians = [],
  onCitationClick,
}: RadialChartProps) {
  const [radialData, setRadialData] = useState<RadialResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // View mode
  const [viewMode, setViewMode] = useState<"single" | "multi-ring" | "comparative">("multi-ring");
  
  // Interactive state
  const [selectedCategory, setSelectedCategory] = useState<CategoryValue | null>(null);
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);
  const [showBillsRing, setShowBillsRing] = useState(true);
  const [showVotesRing, setShowVotesRing] = useState(true);
  
  // Animation state
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);
  const [animationCategory, setAnimationCategory] = useState<string | null>(null);
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  
  // Comparative data
  const [comparativeData, setComparativeData] = useState<Record<string | number, RadialResponse>>({});
  
  const chartRef = useRef<any>(null);

  // Load primary data
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    getPoliticianRadial(politicianId, {
      start_date: startDate,
      end_date: endDate,
    })
      .then((data) => {
        setRadialData(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load radial chart:", err);
        setError(err.message || "Failed to load donation data");
        setIsLoading(false);
      });
  }, [politicianId, startDate, endDate]);

  // Load comparative data
  useEffect(() => {
    if (viewMode !== "comparative" || comparativePoliticians.length === 0) return;

    Promise.all(
      comparativePoliticians.map((pol) =>
        getPoliticianRadial(pol.id, { start_date: startDate, end_date: endDate })
          .then((data) => ({ id: pol.id, data }))
      )
    ).then((results) => {
      const newData: Record<number, RadialResponse> = {};
      results.forEach(({ id, data }) => {
        newData[id] = data;
      });
      setComparativeData(newData);
    });
  }, [viewMode, comparativePoliticians, startDate, endDate]);

  // Start influence pathway animation
  const startPathwayAnimation = useCallback((categoryName: string) => {
    setAnimationCategory(categoryName);
    setAnimationStep(0);
    setIsAnimating(true);
    
    // Clear any existing animation
    if (animationRef.current) {
      clearInterval(animationRef.current);
    }
    
    // Run animation steps
    let step = 0;
    animationRef.current = setInterval(() => {
      step++;
      setAnimationStep(step);
      
      if (step >= 3) {
        clearInterval(animationRef.current!);
        animationRef.current = null;
      }
    }, 1000);
  }, []);

  // Stop animation
  const stopAnimation = useCallback(() => {
    setIsAnimating(false);
    setAnimationStep(0);
    setAnimationCategory(null);
    if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, []);

  // Get category by name
  const getCategoryByName = useCallback((name: string): CategoryValue | undefined => {
    return radialData?.categories.find((c) => c.category === name);
  }, [radialData]);

  // Handle category click
  const handleCategoryClick = useCallback((categoryName: string) => {
    const category = getCategoryByName(categoryName);
    if (category) {
      setSelectedCategory(category);
      setHighlightedCategory(categoryName);
    }
  }, [getCategoryByName]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedCategory(null);
    setHighlightedCategory(null);
    stopAnimation();
  }, [stopAnimation]);

  // Multi-ring chart option
  const multiRingChartOption = useMemo(() => {
    if (!radialData || radialData.categories.length === 0) {
      return {
        title: {
          text: "No donation data available",
          left: "center",
          textStyle: { color: "#666" },
        },
      };
    }

    const categories = radialData.categories;
    
    // Inner ring - Donor categories (pie)
    const innerData = categories.map((cat) => ({
      value: cat.total_amount,
      name: cat.category,
      itemStyle: {
        color: highlightedCategory === cat.category
          ? CATEGORY_COLORS[cat.category]
          : highlightedCategory
            ? CATEGORY_COLORS[cat.category] + "40"
            : CATEGORY_COLORS[cat.category] || "#6b7280",
      },
    }));

    // Middle ring - Related bills
    const billsData: Array<{ value: number; name: string; itemStyle: any; category: string }> = [];
    if (showBillsRing) {
      categories.forEach((cat) => {
        const bills = cat.related_bills || [];
        bills.forEach((bill) => {
          const isHighlighted = highlightedCategory === cat.category;
          const isAnimationTarget = animationCategory === cat.category && animationStep >= 1;
          billsData.push({
            value: cat.total_amount / bills.length,
            name: bill.title.length > 25 ? bill.title.slice(0, 25) + "..." : bill.title,
            category: cat.category,
            itemStyle: {
              color: isHighlighted || isAnimationTarget
                ? CATEGORY_COLORS[cat.category]
                : CATEGORY_COLORS[cat.category] + "60",
              borderColor: isAnimationTarget ? "#fff" : undefined,
              borderWidth: isAnimationTarget ? 3 : 0,
            },
          });
        });
      });
    }

    // Outer ring - Vote outcomes
    const votesData: Array<{ value: number; name: string; itemStyle: any; category: string }> = [];
    if (showVotesRing) {
      categories.forEach((cat) => {
        const bills = cat.related_bills || [];
        bills.forEach((bill) => {
          const isHighlighted = highlightedCategory === cat.category;
          const isAnimationTarget = animationCategory === cat.category && animationStep >= 2;
          const voteColor = bill.vote_outcome ? VOTE_COLORS[bill.vote_outcome] : "#9ca3af";
          votesData.push({
            value: cat.total_amount / bills.length,
            name: `${bill.vote_outcome === "yes" ? "✓" : bill.vote_outcome === "no" ? "✗" : "—"} ${bill.title.slice(0, 15)}...`,
            category: cat.category,
            itemStyle: {
              color: isHighlighted || isAnimationTarget ? voteColor : voteColor + "60",
              borderColor: isAnimationTarget ? "#000" : undefined,
              borderWidth: isAnimationTarget ? 2 : 0,
            },
          });
        });
      });
    }

    const series: any[] = [
      // Inner ring - Categories
      {
        name: "Categories",
        type: "pie",
        radius: ["25%", "40%"],
        center: ["50%", "50%"],
        label: {
          show: true,
          position: "inside",
          formatter: "{b}",
          fontSize: 10,
          color: "#fff",
        },
        labelLine: { show: false },
        data: innerData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: "rgba(0, 0, 0, 0.3)",
          },
        },
      },
    ];

    // Middle ring - Bills
    if (showBillsRing && billsData.length > 0) {
      series.push({
        name: "Bills",
        type: "pie",
        radius: ["45%", "60%"],
        center: ["50%", "50%"],
        label: {
          show: false,
        },
        data: billsData,
        emphasis: {
          label: {
            show: true,
            fontSize: 11,
          },
        },
      });
    }

    // Outer ring - Votes
    if (showVotesRing && votesData.length > 0) {
      series.push({
        name: "Votes",
        type: "pie",
        radius: ["65%", "75%"],
        center: ["50%", "50%"],
        label: {
          show: true,
          position: "outside",
          formatter: (params: any) => {
            if (params.name.startsWith("✓")) return "✓";
            if (params.name.startsWith("✗")) return "✗";
            return "—";
          },
          fontSize: 12,
          color: (params: any) => {
            if (params.name?.startsWith("✓")) return VOTE_COLORS.yes;
            if (params.name?.startsWith("✗")) return VOTE_COLORS.no;
            return VOTE_COLORS.abstain;
          },
        },
        labelLine: {
          show: true,
          length: 5,
          length2: 5,
        },
        data: votesData,
      });
    }

    return {
      title: {
        text: "Donations → Bills → Votes",
        subtext: `Total: $${radialData.total_amount.toLocaleString()}`,
        left: "center",
        textStyle: { fontSize: 16 },
        subtextStyle: { fontSize: 12, color: "#666" },
      },
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          if (params.seriesName === "Categories") {
            const category = getCategoryByName(params.name);
            return `
              <strong>${params.name}</strong><br/>
              Amount: $${params.value.toLocaleString()}<br/>
              ${category?.donation_count || 0} donations<br/>
              ${category?.related_bills?.length || 0} related bills
            `;
          }
          if (params.seriesName === "Bills") {
            return `<strong>${params.data.category}</strong><br/>Bill: ${params.name}`;
          }
          if (params.seriesName === "Votes") {
            const outcome = params.name.startsWith("✓") ? "Yes" : params.name.startsWith("✗") ? "No" : "Abstain";
            return `<strong>Vote: ${outcome}</strong><br/>${params.name.slice(2)}`;
          }
          return params.name;
        },
      },
      legend: {
        orient: "vertical",
        left: "left",
        top: "middle",
        data: categories.map((c) => c.category),
      },
      series,
    };
  }, [radialData, highlightedCategory, showBillsRing, showVotesRing, animationCategory, animationStep, getCategoryByName]);

  // Simple donut chart option (original view)
  const simpleChartOption = useMemo(() => {
    if (!radialData || radialData.categories.length === 0) {
      return {
        title: {
          text: "No donation data available",
          left: "center",
          textStyle: { color: "#666" },
        },
      };
    }

    const data = radialData.categories.map((cat) => ({
      value: cat.total_amount,
      name: cat.category,
      itemStyle: { color: CATEGORY_COLORS[cat.category] || "#6b7280" },
    }));

    return {
      title: {
        text: "Donations by Category",
        left: "center",
        subtext: `Total: $${radialData.total_amount.toLocaleString()}`,
        subtextStyle: { fontSize: 14, color: "#666" },
      },
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          const category = getCategoryByName(params.name);
          return `
            ${params.name}<br/>
            Amount: $${params.value.toLocaleString()}<br/>
            Count: ${category?.donation_count || 0} donation(s)
          `;
        },
      },
      legend: {
        orient: "vertical",
        left: "left",
        top: "middle",
      },
      series: [
        {
          name: "Donations",
          type: "pie",
          radius: ["40%", "70%"],
          center: ["60%", "50%"],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: "#fff",
            borderWidth: 2,
          },
          label: {
            show: true,
            formatter: (params: any) => {
              const percent = ((params.value / radialData.total_amount) * 100).toFixed(1);
              return `${params.name}\n${percent}%`;
            },
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: "bold",
            },
            itemStyle: {
              shadowBlur: 10,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
          data,
        },
      ],
    };
  }, [radialData, getCategoryByName]);

  // Comparative chart options
  const comparativeChartOptions = useMemo(() => {
    if (viewMode !== "comparative" || comparativePoliticians.length === 0) return [];
    
    const allPoliticians = [
      { id: politicianId, name: "Primary", data: radialData },
      ...comparativePoliticians.map((pol) => ({
        id: pol.id,
        name: pol.name,
        data: comparativeData[pol.id],
      })),
    ].filter((p) => p.data);
    
    // Normalize categories across all politicians
    const allCategories = new Set<string>();
    allPoliticians.forEach((pol) => {
      pol.data?.categories.forEach((c) => allCategories.add(c.category));
    });
    const sortedCategories = Array.from(allCategories).sort();
    
    return allPoliticians.map((pol) => {
      const categoryMap = new Map(pol.data?.categories.map((c) => [c.category, c]));
      
      const data = sortedCategories.map((cat) => {
        const catData = categoryMap.get(cat);
        return {
          value: catData?.total_amount || 0,
          name: cat,
          itemStyle: { color: CATEGORY_COLORS[cat] || "#6b7280" },
        };
      });
      
      return {
        title: {
          text: pol.name,
          subtext: `$${(pol.data?.total_amount || 0).toLocaleString()}`,
          left: "center",
          textStyle: { fontSize: 14 },
          subtextStyle: { fontSize: 11, color: "#666" },
        },
        tooltip: {
          trigger: "item",
          formatter: (params: any) => `${params.name}: $${params.value.toLocaleString()}`,
        },
        series: [
          {
            type: "pie",
            radius: ["30%", "60%"],
            center: ["50%", "55%"],
            label: { show: false },
            data,
          },
        ],
      };
    });
  }, [viewMode, politicianId, radialData, comparativePoliticians, comparativeData]);

  // Handle chart click
  const handleChartClick = useCallback((params: any) => {
    if (params.seriesName === "Categories" || params.seriesName === "Donations") {
      handleCategoryClick(params.name);
    }
  }, [handleCategoryClick]);

  // Handle chart mouse over
  const handleChartMouseOver = useCallback((params: any) => {
    if (params.seriesName === "Categories" || params.seriesName === "Donations") {
      setHighlightedCategory(params.name);
    } else if (params.data?.category) {
      setHighlightedCategory(params.data.category);
    }
  }, []);

  // Handle chart mouse out
  const handleChartMouseOut = useCallback(() => {
    if (!selectedCategory) {
      setHighlightedCategory(null);
    }
  }, [selectedCategory]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Donations by Category</CardTitle>
          <CardDescription>Radial chart showing donation breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] flex items-center justify-center">
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
          <CardTitle>Donations by Category</CardTitle>
          <CardDescription>Radial chart showing donation breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] flex items-center justify-center text-red-600">
            Error: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!radialData || radialData.categories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Donations by Category</CardTitle>
          <CardDescription>Radial chart showing donation breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] flex items-center justify-center text-gray-500">
            No donation data available for this politician
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
            <CardTitle>Donations by Category</CardTitle>
            <CardDescription>
              {viewMode === "multi-ring"
                ? "Multi-ring view: Categories → Bills → Vote Outcomes"
                : viewMode === "comparative"
                  ? "Compare donation patterns across politicians"
                  : "Radial chart showing donation breakdown"}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
              <TabsList>
                <TabsTrigger value="single">Simple</TabsTrigger>
                <TabsTrigger value="multi-ring">
                  <Layers className="h-4 w-4 mr-1" />
                  Multi-Ring
                </TabsTrigger>
                {comparativePoliticians.length > 0 && (
                  <TabsTrigger value="comparative">
                    <Users className="h-4 w-4 mr-1" />
                    Compare
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              ${radialData.total_amount.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Amount</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{radialData.total_count}</div>
            <div className="text-sm text-gray-600">Total Donations</div>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <div className="text-2xl font-bold text-amber-600">
              {radialData.categories.length}
            </div>
            <div className="text-sm text-gray-600">Categories</div>
          </div>
        </div>

        {/* Multi-ring controls */}
        {viewMode === "multi-ring" && (
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium">Show Rings:</span>
            <Button
              variant={showBillsRing ? "default" : "outline"}
              size="sm"
              onClick={() => setShowBillsRing(!showBillsRing)}
            >
              Bills
            </Button>
            <Button
              variant={showVotesRing ? "default" : "outline"}
              size="sm"
              onClick={() => setShowVotesRing(!showVotesRing)}
            >
              Vote Outcomes
            </Button>
            
            <div className="ml-auto flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Click a category to see the influence pathway animation
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        )}

        {/* Animation controls */}
        {isAnimating && animationCategory && (
          <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2 flex-1">
              <span className="font-semibold text-purple-700">Influence Pathway:</span>
              <div className="flex items-center gap-1">
                <Badge
                  variant={animationStep >= 0 ? "default" : "outline"}
                  className={animationStep >= 0 ? "bg-purple-600" : ""}
                >
                  1. Donation
                </Badge>
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <Badge
                  variant={animationStep >= 1 ? "default" : "outline"}
                  className={animationStep >= 1 ? "bg-purple-600" : ""}
                >
                  2. Bills
                </Badge>
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <Badge
                  variant={animationStep >= 2 ? "default" : "outline"}
                  className={animationStep >= 2 ? "bg-purple-600" : ""}
                >
                  3. Vote
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={stopAnimation}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Vote Legend */}
        {viewMode === "multi-ring" && showVotesRing && (
          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium">Vote Outcomes:</span>
            <div className="flex items-center gap-1">
              <Check className="h-4 w-4 text-green-500" />
              <span>Yes</span>
            </div>
            <div className="flex items-center gap-1">
              <XIcon className="h-4 w-4 text-red-500" />
              <span>No</span>
            </div>
            <div className="flex items-center gap-1">
              <Minus className="h-4 w-4 text-gray-500" />
              <span>Abstain</span>
            </div>
          </div>
        )}

        {/* Chart */}
        {viewMode === "comparative" ? (
          <div className={`grid gap-4 ${comparativeChartOptions.length <= 2 ? "grid-cols-2" : "grid-cols-3"}`}>
            {comparativeChartOptions.map((option, idx) => (
              <div key={idx} className="h-[350px] border rounded-lg p-2">
                <ReactECharts
                  option={option}
                  style={{ height: "100%", width: "100%" }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="h-[500px]">
            <ReactECharts
              ref={chartRef}
              option={viewMode === "multi-ring" ? multiRingChartOption : simpleChartOption}
              style={{ height: "100%", width: "100%" }}
              onEvents={{
                click: handleChartClick,
                mouseover: handleChartMouseOver,
                mouseout: handleChartMouseOut,
              }}
            />
          </div>
        )}

        {/* Selected Category Detail */}
        {selectedCategory && (
          <div className="p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: CATEGORY_COLORS[selectedCategory.category] }}
                />
                <h3 className="font-semibold text-lg">{selectedCategory.category}</h3>
              </div>
              <div className="flex items-center gap-2">
                {!isAnimating && viewMode === "multi-ring" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startPathwayAnimation(selectedCategory.category)}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Show Pathway
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Total Amount:</span>
                <div className="font-semibold">${selectedCategory.total_amount.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-gray-500">Donations:</span>
                <div className="font-semibold">{selectedCategory.donation_count}</div>
              </div>
              <div>
                <span className="text-gray-500">Average:</span>
                <div className="font-semibold">${selectedCategory.avg_amount?.toLocaleString() || "N/A"}</div>
              </div>
            </div>

            {/* Top Donors */}
            {selectedCategory.top_donors && selectedCategory.top_donors.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Top Donors</h4>
                <div className="space-y-1">
                  {selectedCategory.top_donors.map((donor, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{donor.name}</span>
                      <span className="font-medium">${donor.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related Bills */}
            {selectedCategory.related_bills && selectedCategory.related_bills.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Related Bills</h4>
                <div className="space-y-2">
                  {selectedCategory.related_bills.map((bill, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center gap-2">
                        {bill.sponsorship && (
                          <Badge variant="outline" className="text-xs">
                            {bill.sponsorship === "primary" ? "Sponsor" : "Co-sponsor"}
                          </Badge>
                        )}
                        <span className="text-sm">{bill.title}</span>
                      </div>
                      {bill.vote_outcome && (
                        <Badge
                          variant={bill.vote_outcome === "yes" ? "default" : "destructive"}
                          className={bill.vote_outcome === "yes" ? "bg-green-500" : ""}
                        >
                          {bill.vote_outcome === "yes" ? (
                            <Check className="h-3 w-3 mr-1" />
                          ) : (
                            <XIcon className="h-3 w-3 mr-1" />
                          )}
                          {bill.vote_outcome.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Citations */}
            {selectedCategory.citations.length > 0 && (
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sources</span>
                  {onCitationClick && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onCitationClick(selectedCategory.citations)}
                      className="text-xs"
                    >
                      View all
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedCategory.citations.slice(0, 3).map((citation, idx) => (
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

        {/* Category Breakdown (when nothing selected) */}
        {!selectedCategory && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Category Breakdown</h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {radialData.categories.map((category) => {
                const percentage = (category.total_amount / radialData.total_amount) * 100;
                return (
                  <div
                    key={category.category}
                    onClick={() => handleCategoryClick(category.category)}
                    className={`p-3 border rounded hover:bg-gray-50 transition-colors cursor-pointer ${
                      highlightedCategory === category.category ? "ring-2 ring-blue-500 bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: CATEGORY_COLORS[category.category] }}
                        />
                        <Badge variant="outline" className="font-medium">
                          {category.category}
                        </Badge>
                        {category.related_bills && category.related_bills.length > 0 && (
                          <span className="text-xs text-gray-500">
                            {category.related_bills.length} bills
                          </span>
                        )}
                      </div>
                      <span className="text-lg font-semibold">
                        ${category.total_amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: CATEGORY_COLORS[category.category],
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {percentage.toFixed(1)}% • {category.donation_count} donations
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
