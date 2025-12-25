'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { DonationAggregate, Citation } from '@/lib/types';
import { ViewSourcesButton } from './SourceLink';
import InsufficientData from './InsufficientData';

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

  // Format data for chart - use neutral colors
  const chartData = donations.map((donation) => ({
    category: donation.category || 'Other',
    amount: donation.total_amount,
    citationCount: donation.citation_count,
  }));

  // Format currency for display
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Collect all citations
  const allCitations = donations.flatMap((donation) => donation.citations || []);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Donor Breakdown</h2>
        {allCitations.length > 0 && (
          <ViewSourcesButton
            citations={allCitations}
            onCitationClick={onCitationClick}
          />
        )}
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="category"
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelStyle={{ color: '#374151' }}
            />
            <Legend />
            <Bar
              dataKey="amount"
              fill="#4B5563"
              name="Total Donations"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-4 text-xs text-gray-500 text-center">
          Data sourced from public records. All amounts are aggregated by category.
          {allCitations.length > 0 && ` Sources: ${allCitations.length}`}
        </p>
      </div>
    </div>
  );
}

