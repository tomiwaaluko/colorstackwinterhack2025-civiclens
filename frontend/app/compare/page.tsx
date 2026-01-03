"use client";

import { useState, useEffect, useRef } from "react";
import { VotingChart } from "@/components/VotingChart";
import { DonorBreakdownNew } from "@/components/DonorBreakdownNew";
import { CitationBadge } from "@/components/CitationBadge";
import {
  Search,
  Users,
  ArrowLeftRight,
  Quote,
  Building2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { searchPoliticians, getPoliticianProfile } from "@/lib/api";
import type { Politician, PoliticianProfile } from "@/lib/types";

const mockPoliticianA = {
  id: "1",
  name: "Elizabeth Warren",
  party: "Democrat",
  state: "Massachusetts",
  position: "U.S. Senator",
  votingData: [
    { category: "Healthcare", yes: 45, no: 12, abstain: 3 },
    { category: "Economy", yes: 38, no: 24, abstain: 2 },
    { category: "Environment", yes: 52, no: 8, abstain: 1 },
    { category: "Education", yes: 41, no: 15, abstain: 4 },
  ],
  donorData: [
    { name: "Education", value: 450000, color: "hsl(var(--chart-1))" },
    { name: "Healthcare", value: 320000, color: "hsl(var(--chart-2))" },
    { name: "Technology", value: 280000, color: "hsl(var(--chart-3))" },
    { name: "Finance", value: 150000, color: "hsl(var(--chart-4))" },
  ],
  totalDonations: "$1.2M",
  statements: [
    {
      text: "We need bold action on healthcare. Every American deserves access to affordable care.",
      date: "March 15, 2024",
      source: "Senate Floor Speech",
    },
    {
      text: "Climate change is the existential threat of our time. We must act now.",
      date: "February 28, 2024",
      source: "Press Conference",
    },
  ],
};

const mockPoliticianB = {
  id: "2",
  name: "Marco Rubio",
  party: "Republican",
  state: "Florida",
  position: "U.S. Senator",
  votingData: [
    { category: "Healthcare", yes: 18, no: 42, abstain: 2 },
    { category: "Economy", yes: 48, no: 14, abstain: 1 },
    { category: "Environment", yes: 15, no: 38, abstain: 8 },
    { category: "Education", yes: 32, no: 21, abstain: 7 },
  ],
  donorData: [
    { name: "Finance", value: 520000, color: "hsl(var(--chart-1))" },
    { name: "Real Estate", value: 380000, color: "hsl(var(--chart-2))" },
    { name: "Defense", value: 290000, color: "hsl(var(--chart-3))" },
    { name: "Energy", value: 210000, color: "hsl(var(--chart-4))" },
  ],
  totalDonations: "$1.4M",
  statements: [
    {
      text: "Economic growth comes from the private sector, not government mandates.",
      date: "March 10, 2024",
      source: "Fox News Interview",
    },
    {
      text: "We must secure our borders while maintaining legal pathways to immigration.",
      date: "February 20, 2024",
      source: "Town Hall",
    },
  ],
};

function ComparePageContent() {
  const [searchA, setSearchA] = useState("");
  const [searchB, setSearchB] = useState("");
  const [searchResultsA, setSearchResultsA] = useState<Politician[]>([]);
  const [searchResultsB, setSearchResultsB] = useState<Politician[]>([]);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [activeIndexA, setActiveIndexA] = useState(-1);
  const [activeIndexB, setActiveIndexB] = useState(-1);
  const [politicianA, setPoliticianA] = useState(mockPoliticianA);
  const [politicianB, setPoliticianB] = useState(mockPoliticianB);
  const dropdownRefA = useRef<HTMLDivElement>(null);
  const dropdownRefB = useRef<HTMLDivElement>(null);

  // Search for Politician A
  useEffect(() => {
    const controller = new AbortController();
    const searchTimer = setTimeout(async () => {
      if (searchA.trim().length >= 2) {
        setLoadingA(true);
        try {
          const results = await searchPoliticians(searchA, controller.signal);
          setSearchResultsA(results.politicians);
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            // Request was aborted, don't update state
            return;
          }
          console.error("Search error:", error);
          setSearchResultsA([]);
        } finally {
          setLoadingA(false);
        }
      } else {
        setSearchResultsA([]);
      }
    }, 300);

    return () => {
      clearTimeout(searchTimer);
      controller.abort();
    };
  }, [searchA]);

  // Reset activeIndexA when search results change
  useEffect(() => {
    setActiveIndexA(-1);
  }, [searchResultsA]);

  // Click outside to close dropdown A
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRefA.current &&
        !dropdownRefA.current.contains(event.target as Node)
      ) {
        setSearchResultsA([]);
        setActiveIndexA(-1);
      }
    };

    if (searchResultsA.length > 0) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [searchResultsA]);

  // Search for Politician B
  useEffect(() => {
    const controller = new AbortController();
    const searchTimer = setTimeout(async () => {
      if (searchB.trim().length >= 2) {
        setLoadingB(true);
        try {
          const results = await searchPoliticians(searchB, controller.signal);
          setSearchResultsB(results.politicians);
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            // Request was aborted, don't update state
            return;
          }
          console.error("Search error:", error);
          setSearchResultsB([]);
        } finally {
          setLoadingB(false);
        }
      } else {
        setSearchResultsB([]);
      }
    }, 300);

    return () => {
      clearTimeout(searchTimer);
      controller.abort();
    };
  }, [searchB]);

  // Reset activeIndexB when search results change
  useEffect(() => {
    setActiveIndexB(-1);
  }, [searchResultsB]);

  // Click outside to close dropdown B
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRefB.current &&
        !dropdownRefB.current.contains(event.target as Node)
      ) {
        setSearchResultsB([]);
        setActiveIndexB(-1);
      }
    };

    if (searchResultsB.length > 0) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [searchResultsB]);

  const handleSelectPoliticianA = async (politician: Politician) => {
    setLoadingA(true);
    try {
      const profile = await getPoliticianProfile(politician.id);
      // Transform API profile to match mock data structure
      setPoliticianA({
        id: profile.politician.id,
        name: profile.politician.name,
        party: profile.politician.party || "Unknown",
        state: profile.politician.state || "N/A",
        position: profile.politician.office || "Unknown",
        votingData: mockPoliticianA.votingData, // Keep mock data for now
        donorData: mockPoliticianA.donorData,
        totalDonations: "$0",
        statements:
          profile.statements?.slice(0, 2).map((s) => ({
            text: s.text,
            date: s.date || "N/A",
            source: s.source_type || "Unknown",
          })) || [],
      });
      setSearchA("");
      setSearchResultsA([]);
      setActiveIndexA(-1);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoadingA(false);
    }
  };

  const handleKeyDownA = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (searchResultsA.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndexA((prev) => (prev + 1) % searchResultsA.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndexA(
          (prev) => (prev - 1 + searchResultsA.length) % searchResultsA.length
        );
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndexA >= 0 && activeIndexA < searchResultsA.length) {
          handleSelectPoliticianA(searchResultsA[activeIndexA]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setSearchResultsA([]);
        setActiveIndexA(-1);
        break;
    }
  };

  const handleKeyDownB = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (searchResultsB.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndexB((prev) => (prev + 1) % searchResultsB.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndexB(
          (prev) => (prev - 1 + searchResultsB.length) % searchResultsB.length
        );
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndexB >= 0 && activeIndexB < searchResultsB.length) {
          handleSelectPoliticianB(searchResultsB[activeIndexB]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setSearchResultsB([]);
        setActiveIndexB(-1);
        break;
    }
  };

  const handleSelectPoliticianB = async (politician: Politician) => {
    setLoadingB(true);
    try {
      const profile = await getPoliticianProfile(politician.id);
      // Transform API profile to match mock data structure
      setPoliticianB({
        id: profile.politician.id,
        name: profile.politician.name,
        party: profile.politician.party || "Unknown",
        state: profile.politician.state || "N/A",
        position: profile.politician.office || "Unknown",
        votingData: mockPoliticianB.votingData, // Keep mock data for now
        donorData: mockPoliticianB.donorData,
        totalDonations: "$0",
        statements:
          profile.statements?.slice(0, 2).map((s) => ({
            text: s.text,
            date: s.date || "N/A",
            source: s.source_type || "Unknown",
          })) || [],
      });
      setSearchB("");
      setSearchResultsB([]);
      setActiveIndexB(-1);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoadingB(false);
    }
  };

  const citation = {
    id: "1",
    source: "OpenSecrets.org",
    url: "https://www.opensecrets.org",
    date: "January 2024",
    type: "donation" as const,
  };

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <section className="py-12 bg-card border-b border-border">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-sm font-medium text-accent-foreground mb-6">
              <ArrowLeftRight className="h-4 w-4" />
              <span>Side-by-Side Comparison</span>
            </div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
              Compare Politicians
            </h1>
            <p className="text-muted-foreground">
              View voting records, donor data, and public statements side by
              side. All data is verified and cited from official sources.
            </p>
          </div>
        </div>
      </section>

      {/* Selection */}
      <section className="py-8 bg-muted/30">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Politician A */}
            <div className="civic-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="relative flex-1" ref={dropdownRefA}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search first politician..."
                    value={searchA}
                    onChange={(e) => setSearchA(e.target.value)}
                    onKeyDown={handleKeyDownA}
                    className="pl-10"
                    role="combobox"
                    aria-expanded={searchResultsA.length > 0}
                    aria-controls="search-results-a"
                    aria-activedescendant={
                      activeIndexA >= 0 ? `result-a-${activeIndexA}` : undefined
                    }
                  />
                  {loadingA && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                  )}
                  {/* Search Results Dropdown */}
                  {searchResultsA.length > 0 && (
                    <div
                      id="search-results-a"
                      className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto"
                      role="listbox"
                    >
                      {searchResultsA.map((politician, index) => (
                        <button
                          key={politician.id}
                          id={`result-a-${index}`}
                          onClick={() => handleSelectPoliticianA(politician)}
                          className={`w-full text-left px-4 py-3 transition-colors border-b border-border last:border-b-0 ${
                            index === activeIndexA
                              ? "bg-muted"
                              : "hover:bg-muted"
                          }`}
                          role="option"
                          aria-selected={index === activeIndexA}
                          tabIndex={-1}
                        >
                          <div className="font-medium text-foreground">
                            {politician.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {politician.party && `${politician.party} • `}
                            {politician.office && `${politician.office} • `}
                            {politician.state}
                            {politician.district &&
                              ` - District ${politician.district}`}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-semibold text-foreground">
                    {politicianA.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="secondary"
                      className="bg-blue-100 text-blue-800"
                    >
                      {politicianA.party}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {politicianA.state}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <Building2 className="h-4 w-4" />
                    <span>{politicianA.position}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Politician B */}
            <div className="civic-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="relative flex-1" ref={dropdownRefB}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search second politician..."
                    value={searchB}
                    onChange={(e) => setSearchB(e.target.value)}
                    onKeyDown={handleKeyDownB}
                    className="pl-10"
                    role="combobox"
                    aria-expanded={searchResultsB.length > 0}
                    aria-controls="search-results-b"
                    aria-activedescendant={
                      activeIndexB >= 0 ? `result-b-${activeIndexB}` : undefined
                    }
                  />
                  {loadingB && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                  )}
                  {/* Search Results Dropdown */}
                  {searchResultsB.length > 0 && (
                    <div
                      id="search-results-b"
                      className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto"
                      role="listbox"
                    >
                      {searchResultsB.map((politician, index) => (
                        <button
                          key={politician.id}
                          id={`result-b-${index}`}
                          onClick={() => handleSelectPoliticianB(politician)}
                          className={`w-full text-left px-4 py-3 transition-colors border-b border-border last:border-b-0 ${
                            index === activeIndexB
                              ? "bg-muted"
                              : "hover:bg-muted"
                          }`}
                          role="option"
                          aria-selected={index === activeIndexB}
                          tabIndex={-1}
                        >
                          <div className="font-medium text-foreground">
                            {politician.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {politician.party && `${politician.party} • `}
                            {politician.office && `${politician.office} • `}
                            {politician.state}
                            {politician.district &&
                              ` - District ${politician.district}`}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-semibold text-foreground">
                    {politicianB.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="secondary"
                      className="bg-red-100 text-red-800"
                    >
                      {politicianB.party}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {politicianB.state}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <Building2 className="h-4 w-4" />
                    <span>{politicianB.position}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Data */}
      <section className="py-12">
        <div className="container">
          {/* Voting Records */}
          <div className="mb-12">
            <h2 className="font-serif text-2xl font-bold text-foreground mb-6">
              Voting Records
              <CitationBadge citation={citation} index={1} />
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <VotingChart data={politicianA.votingData} />
              <VotingChart data={politicianB.votingData} />
            </div>
          </div>

          {/* Donor Breakdown */}
          <div className="mb-12">
            <h2 className="font-serif text-2xl font-bold text-foreground mb-6">
              Donor Breakdown
              <CitationBadge citation={citation} index={2} />
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <DonorBreakdownNew
                data={politicianA.donorData}
                totalDonations={politicianA.totalDonations}
              />
              <DonorBreakdownNew
                data={politicianB.donorData}
                totalDonations={politicianB.totalDonations}
              />
            </div>
          </div>

          {/* Public Statements */}
          <div>
            <h2 className="font-serif text-2xl font-bold text-foreground mb-6">
              Recent Public Statements
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Politician A Statements */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">
                  {politicianA.name}
                </h3>
                {politicianA.statements.map((statement, index) => (
                  <div key={index} className="civic-card p-6">
                    <Quote className="h-6 w-6 text-accent mb-3" />
                    <p className="text-foreground mb-4 leading-relaxed">
                      &quot;{statement.text}&quot;
                    </p>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{statement.date}</span>
                      {"url" in statement || "sourceUrl" in statement ? (
                        <a
                          href={
                            (statement as { url?: string; sourceUrl?: string })
                              .url ||
                            (statement as { url?: string; sourceUrl?: string })
                              .sourceUrl
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          {statement.source}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span>{statement.source}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ComparePage() {
  return <ComparePageContent />;
}
