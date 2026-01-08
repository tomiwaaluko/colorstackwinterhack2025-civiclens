"use client";

import { useEffect, useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { RadialResponse } from "@/lib/types";
import { getPoliticianRadial } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "./LoadingSpinner";

interface RadialChartProps {
  politicianId: number;
  startDate?: string;
  endDate?: string;
}

export default function RadialChart({
  politicianId,
  startDate,
  endDate,
}: RadialChartProps) {
  const [radialData, setRadialData] = useState<RadialResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const chartOption = useMemo(() => {
    if (!radialData || radialData.categories.length === 0) {
      return {
        title: {
          text: "No donation data available",
          left: "center",
          textStyle: { color: "#666" },
        },
      };
    }

    // Color palette
    const colors = [
      "#3b82f6", // Blue
      "#10b981", // Green
      "#f59e0b", // Amber
      "#ef4444", // Red
      "#8b5cf6", // Purple
      "#ec4899", // Pink
      "#06b6d4", // Cyan
      "#84cc16", // Lime
    ];

    const data = radialData.categories.map((cat, idx) => ({
      value: cat.total_amount,
      name: cat.category,
      itemStyle: { color: colors[idx % colors.length] },
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
          const category = radialData.categories.find((c) => c.category === params.name);
          return `
            ${params.name}<br/>
            Amount: $${params.value.toLocaleString()}<br/>
            Count: ${category?.donation_count || 0} donation(s)<br/>
            Avg: $${category?.avg_amount?.toLocaleString() || "N/A"}
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
          radius: ["40%", "70%"], // Donut chart
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
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
          labelLine: {
            show: true,
          },
          data,
        },
      ],
    };
  }, [radialData]);

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
        <CardTitle>Donations by Category</CardTitle>
        <CardDescription>Radial chart showing donation breakdown by category</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              ${radialData.total_amount.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Amount</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{radialData.total_count}</div>
            <div className="text-sm text-gray-600">Total Donations</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">
              {radialData.categories.length}
            </div>
            <div className="text-sm text-gray-600">Categories</div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[500px]">
          <ReactECharts option={chartOption} style={{ height: "100%", width: "100%" }} />
        </div>

        {/* Category Details */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Category Breakdown</h3>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {radialData.categories.map((category) => {
              const percentage = (category.total_amount / radialData.total_amount) * 100;
              return (
                <div
                  key={category.category}
                  className="p-3 border rounded hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="font-medium">
                      {category.category}
                    </Badge>
                    <span className="text-lg font-semibold">
                      ${category.total_amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Percentage:</span>
                      <span className="font-medium">{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Donations:</span>
                      <span className="font-medium">{category.donation_count}</span>
                    </div>
                    {category.avg_amount && (
                      <div className="flex justify-between">
                        <span>Average:</span>
                        <span className="font-medium">
                          ${category.avg_amount.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {category.citations.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <span className="text-xs text-gray-500">Sources:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {category.citations.map((citation, idx) => (
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
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

