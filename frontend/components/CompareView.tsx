'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ComparisonResult, Politician, Citation } from '@/lib/types';
import { comparePoliticians, searchPoliticians } from '@/lib/api';
import ProfileHeader from './ProfileHeader';
import KeyVotes from './KeyVotes';
import DonorChart from './DonorChart';
import StatementsList from './StatementsList';
import LoadingSpinner from './LoadingSpinner';
import InsufficientData from './InsufficientData';
import SourceDrawer from './SourceDrawer';

interface CompareViewProps {
  politicianAId?: string;
  politicianBId?: string;
  topic?: string;
}

export default function CompareView({
  politicianAId,
  politicianBId,
  topic,
}: CompareViewProps) {
  const router = useRouter();
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedA, setSelectedA] = useState<string>(politicianAId || '');
  const [selectedB, setSelectedB] = useState<string>(politicianBId || '');
  const [politicians, setPoliticians] = useState<Politician[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleCitationClick = (citation: Citation) => {
    setSelectedCitation(citation);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedCitation(null);
  };

  // Load politicians for selection
  useEffect(() => {
    const loadPoliticians = async () => {
      try {
        const result = await searchPoliticians();
        setPoliticians(result.politicians || []);
      } catch (err) {
        console.error('Failed to load politicians:', err);
      }
    };
    loadPoliticians();
  }, []);

  // Load comparison if both IDs are provided
  useEffect(() => {
    if (selectedA && selectedB) {
      handleCompare();
    }
  }, [selectedA, selectedB, topic]);

  const handleCompare = async () => {
    if (!selectedA || !selectedB) {
      setError('Please select both politicians to compare');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await comparePoliticians({
        politician_a_id: selectedA,
        politician_b_id: selectedB,
        topic,
      });
      setComparison(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load comparison');
      setComparison(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const result = await searchPoliticians(searchQuery);
      setPoliticians(result.politicians || []);
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error && !comparison) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Selection UI */}
      {(!selectedA || !selectedB || !comparison) && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Select Politicians to Compare
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search for Politicians
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by name..."
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSearch}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  Search
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Politician A
                </label>
                <select
                  value={selectedA}
                  onChange={(e) => setSelectedA(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  {politicians.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.office && `(${p.office})`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Politician B
                </label>
                <select
                  value={selectedB}
                  onChange={(e) => setSelectedB(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  {politicians.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.office && `(${p.office})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {selectedA && selectedB && (
              <button
                onClick={handleCompare}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
              >
                Compare
              </button>
            )}
          </div>
        </div>
      )}

      {/* Comparison Results */}
      {comparison && (
        <div className="space-y-8">
          {topic && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <p className="text-sm font-medium text-blue-900">
                Comparing on topic: <span className="font-semibold">{topic}</span>
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Politician A */}
            <div className="space-y-6">
              <div className="sticky top-4">
                <div className="rounded-lg bg-white border border-gray-200 p-6 shadow-sm">
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Politician A
                    </h3>
                    <ProfileHeader politician={comparison.politician_a.politician} />
                  </div>
                  <div className="space-y-6">
                    <section>
                      <KeyVotes
                        votes={comparison.politician_a.votes || []}
                        onCitationClick={handleCitationClick}
                      />
                    </section>
                    <section>
                      <DonorChart
                        donations={comparison.politician_a.donations || []}
                        onCitationClick={handleCitationClick}
                      />
                    </section>
                    <section>
                      <StatementsList
                        statements={comparison.politician_a.statements || []}
                        onCitationClick={handleCitationClick}
                      />
                    </section>
                  </div>
                </div>
              </div>
            </div>

            {/* Politician B */}
            <div className="space-y-6">
              <div className="sticky top-4">
                <div className="rounded-lg bg-white border border-gray-200 p-6 shadow-sm">
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Politician B
                    </h3>
                    <ProfileHeader politician={comparison.politician_b.politician} />
                  </div>
                  <div className="space-y-6">
                    <section>
                      <KeyVotes
                        votes={comparison.politician_b.votes || []}
                        onCitationClick={handleCitationClick}
                      />
                    </section>
                    <section>
                      <DonorChart
                        donations={comparison.politician_b.donations || []}
                        onCitationClick={handleCitationClick}
                      />
                    </section>
                    <section>
                      <StatementsList
                        statements={comparison.politician_b.statements || []}
                        onCitationClick={handleCitationClick}
                      />
                    </section>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <SourceDrawer
        citation={selectedCitation}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}

