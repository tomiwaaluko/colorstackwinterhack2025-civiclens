"use client";

import { useState, useEffect, useCallback } from "react";
import type { ComparisonResult, Politician, Citation } from "@/lib/types";
import { comparePoliticians, searchPoliticians } from "@/lib/api";
import ProfileHeader from "./ProfileHeader";
import KeyVotes from "./KeyVotes";
import DonorChart from "./DonorChart";
import StatementsList from "./StatementsList";
import LoadingSpinner from "./LoadingSpinner";
import SourceDrawer from "./SourceDrawer";

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
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedA, setSelectedA] = useState<string>(politicianAId || "");
  const [selectedB, setSelectedB] = useState<string>(politicianBId || "");
  const [politicians, setPoliticians] = useState<Politician[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(
    null
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

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
        console.error("Failed to load politicians:", err);
      }
    };
    loadPoliticians();
  }, []);

  const handleCompare = useCallback(async () => {
    if (!selectedA || !selectedB) {
      setError("Please select both politicians to compare");
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
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load comparison";
      setError(errorMessage);
      setComparison(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedA, selectedB, topic]);

  // Load comparison if both IDs are provided
  useEffect(() => {
    if (selectedA && selectedB) {
      handleCompare();
    }
  }, [selectedA, selectedB, topic, handleCompare]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const result = await searchPoliticians(searchQuery);
      setPoliticians(result.politicians || []);
    } catch (err) {
      console.error("Search failed:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Error Banner */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Selection UI */}
      {(!selectedA || !selectedB) && (
        <div className="rounded-xl border border-ink-200 bg-white p-8 shadow-sm">
          <h2 className="headline-sm mb-6 text-ink-900">
            Select Politicians to Compare
          </h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-2">
                Search for Politicians
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search by name..."
                  className="flex-1 rounded-lg border border-ink-300 px-4 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  onClick={handleSearch}
                  className="rounded-lg bg-ink-900 px-6 py-2 font-medium text-white hover:bg-ink-800 transition-colors"
                >
                  Search
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-2">
                  Politician A
                </label>
                <select
                  value={selectedA}
                  onChange={(e) => setSelectedA(e.target.value)}
                  className="w-full rounded-lg border border-ink-300 px-4 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                <label className="block text-sm font-medium text-ink-700 mb-2">
                  Politician B
                </label>
                <select
                  value={selectedB}
                  onChange={(e) => setSelectedB(e.target.value)}
                  className="w-full rounded-lg border border-ink-300 px-4 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                className="w-full rounded-lg bg-amber-500 px-4 py-3 font-medium text-ink-900 hover:bg-amber-400 transition-colors"
              >
                Compare
              </button>
            )}
          </div>
        </div>
      )}

      {/* Collapsible Selection Panel when comparison exists */}
      {selectedA && selectedB && comparison && (
        <div className="rounded-xl border border-ink-200 bg-white shadow-sm overflow-hidden">
          <button
            onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
            className="w-full flex items-center justify-between p-4 hover:bg-ink-50 transition-colors"
          >
            <h3 className="text-sm font-medium text-ink-900">
              Change Selection
            </h3>
            <svg
              className={`h-5 w-5 text-ink-600 transition-transform ${
                isPanelCollapsed ? "" : "rotate-180"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {!isPanelCollapsed && (
            <div className="p-6 pt-0 border-t border-ink-100">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-2">
                    Search for Politicians
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      placeholder="Search by name..."
                      className="flex-1 rounded-lg border border-ink-300 px-4 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      onClick={handleSearch}
                      className="rounded-lg bg-ink-900 px-6 py-2 font-medium text-white hover:bg-ink-800 transition-colors"
                    >
                      Search
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-2">
                      Politician A
                    </label>
                    <select
                      value={selectedA}
                      onChange={(e) => setSelectedA(e.target.value)}
                      className="w-full rounded-lg border border-ink-300 px-4 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                    <label className="block text-sm font-medium text-ink-700 mb-2">
                      Politician B
                    </label>
                    <select
                      value={selectedB}
                      onChange={(e) => setSelectedB(e.target.value)}
                      className="w-full rounded-lg border border-ink-300 px-4 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                <button
                  onClick={handleCompare}
                  className="w-full rounded-lg bg-amber-500 px-4 py-3 font-medium text-ink-900 hover:bg-amber-400 transition-colors"
                >
                  Update Comparison
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comparison Results */}
      {comparison && (
        <div className="space-y-8">
          {topic && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <p className="text-sm font-medium text-amber-900">
                Comparing on topic: <span className="font-bold">{topic}</span>
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Politician A */}
            <div className="space-y-6">
              <div className="rounded-xl bg-white border border-ink-200 p-6 shadow-sm">
                <div className="mb-6 pb-6 border-b border-ink-100">
                  <h3 className="headline-sm text-ink-900 mb-4">
                    Politician A
                  </h3>
                  <ProfileHeader
                    politician={comparison.politician_a.politician}
                  />
                </div>
                <div className="space-y-8">
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

            {/* Politician B */}
            <div className="space-y-6">
              <div className="rounded-xl bg-white border border-ink-200 p-6 shadow-sm">
                <div className="mb-6 pb-6 border-b border-ink-100">
                  <h3 className="headline-sm text-ink-900 mb-4">
                    Politician B
                  </h3>
                  <ProfileHeader
                    politician={comparison.politician_b.politician}
                  />
                </div>
                <div className="space-y-8">
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
      )}

      <SourceDrawer
        citation={selectedCitation}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}
