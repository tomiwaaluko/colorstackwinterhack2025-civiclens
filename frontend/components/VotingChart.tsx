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

interface VotingChartProps {
  data: {
    category: string;
    yes: number;
    no: number;
    abstain: number;
  }[];
}

export function VotingChart({ data }: VotingChartProps) {
  return (
    <div className="bg-card border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <h3 className="font-serif text-lg font-semibold text-foreground mb-6">
        Voting Record by Category
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              type="number"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="category"
              tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
              width={100}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0px",
              }}
            />
            <Bar
              dataKey="yes"
              name="Yes"
              fill="hsl(var(--chart-3))"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="no"
              name="No"
              fill="hsl(var(--chart-2))"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="abstain"
              name="Abstain"
              fill="hsl(var(--chart-4))"
              radius={[0, 0, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-none bg-[hsl(var(--chart-3))]" />
          <span className="text-sm text-muted-foreground">Yes</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-none bg-[hsl(var(--chart-2))]" />
          <span className="text-sm text-muted-foreground">No</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-none bg-[hsl(var(--chart-4))]" />
          <span className="text-sm text-muted-foreground">Abstain</span>
        </div>
      </div>
    </div>
  );
}
