"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DonationAggregate, Citation } from "@/lib/types";
import { ViewSourcesButton } from "./SourceLink";
import InsufficientData from "./InsufficientData";

interface DonorChartProps {
  donations: DonationAggregate[];
  onCitationClick?: (citation: Citation) => void;
}

export default function DonorChart({
  donations,
  onCitationClick,
}: DonorChartProps) {
  if (donations.length === 0) {
    return (
      <InsufficientData
        title="No donation data available"
        message="Donation records for this politician are not available at this time."
      />
    );
  }

  // Format data for chart
  const chartData = donations.map((donation) => ({
    category: donation.category || "Other",
    amount: donation.total_amount,
    citationCount: donation.citation_count,
  }));

  // Format currency for display
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Collect all citations
  const allCitations = donations.flatMap(
    (donation) => donation.citations || []
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="headline-md text-ink-900">Donor Breakdown</h2>
        {allCitations.length > 0 && (
          <ViewSourcesButton
            citations={allCitations}
            onCitationClick={onCitationClick}
          />
        )}
      </div>

      <div className="bg-card border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="#e2e8f0"
              />
              <XAxis
                type="number"
                tickFormatter={formatCurrency}
                tick={{ fontSize: 12, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                dataKey="category"
                type="category"
                width={120}
                tick={{ fontSize: 12, fill: "#0f172a", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: number | undefined) => [
                  formatCurrency(value || 0),
                  "Amount",
                ]}
                contentStyle={{
                  backgroundColor: "#fff",
                  borderColor: "#e2e8f0",
                  borderRadius: "0.5rem",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                cursor={{ fill: "#f8fafc" }}
              />
              <Bar
                dataKey="amount"
                fill="#0f172a" // ink-900
                radius={[0, 4, 4, 0]}
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 bg-ink-50 border-2 border-black p-4 text-sm text-ink-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="font-medium mb-1">Note on Influence</p>
          <p>
            Donation records are aggregated by industry or organization.
            Financial contributions do not necessarily imply direct influence
            over policy decisions.
            {allCitations.length > 0 &&
              ` Sourced from ${allCitations.length} public records.`}
          </p>
        </div>
      </div>
    </div>
  );
}
