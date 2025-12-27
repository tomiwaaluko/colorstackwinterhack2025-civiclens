"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface DonorBreakdownNewProps {
  data: {
    name: string;
    value: number;
    color: string;
  }[];
  totalDonations: string;
}

export function DonorBreakdownNew({
  data,
  totalDonations,
}: DonorBreakdownNewProps) {
  return (
    <div className="bg-card border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <h3 className="font-serif text-lg font-semibold text-foreground mb-6">
        Donor Breakdown by Industry
      </h3>
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="h-48 w-48 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0px",
                }}
                formatter={(value) => [
                  `$${(value as number).toLocaleString()}`,
                  "",
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs text-muted-foreground">Total</span>
            <span className="font-serif text-lg font-bold text-foreground">
              {totalDonations}
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-none"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-foreground">{item.name}</span>
              </div>
              <span className="text-sm font-medium text-foreground">
                ${item.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
