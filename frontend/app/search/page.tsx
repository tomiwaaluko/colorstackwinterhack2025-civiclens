"use client";

import { useState, useMemo, useCallback, useRef, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchBarNew } from "@/components/SearchBarNew";
import { PoliticianCardNew } from "@/components/PoliticianCardNew";
import { Filter, Grid, List, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { searchPoliticians } from "@/lib/api";
import type { Politician } from "@/lib/types";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialZip = searchParams.get("zip") || "";
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("relevance");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [politicians, setPoliticians] = useState<Politician[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSearchKeyRef = useRef("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const performSearch = useCallback(
    async (query: string, zip: string) => {
      const trimmedQuery = query.trim();
      const trimmedZip = zip.trim();
      const searchKey = `${trimmedQuery}::${trimmedZip}`;

      if (lastSearchKeyRef.current === searchKey) {
        return;
      }
      lastSearchKeyRef.current = searchKey;

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setHasSearched(true);
      setError(null);

      try {
        const results = await searchPoliticians(
          trimmedQuery || undefined,
          trimmedZip || undefined,
          controller.signal
        );
        setPoliticians(results.politicians);
      } catch (searchError) {
        if (searchError instanceof Error && searchError.name === "AbortError") {
          return;
        }
        const message =
          typeof searchError === "object" &&
          searchError !== null &&
          "message" in searchError
            ? String((searchError as { message?: string }).message)
            : "Unable to fetch search results.";
        setError(message);
        setPoliticians([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    performSearch(initialQuery, initialZip);
  }, [initialQuery, initialZip, performSearch]);

  const filteredPoliticians = useMemo(() => {
    if (activeFilters.length === 0) {
      return politicians;
    }

    // Separate filters into groups
    const selectedPartyFilters = activeFilters.filter((filter) =>
      ["Democrat", "Republican", "Independent"].includes(filter)
    );
    const selectedPositionFilters = activeFilters.filter((filter) =>
      ["Senate", "House"].includes(filter)
    );

    return politicians.filter((politician) => {
      // Check party filters (if any selected, must match one)
      if (selectedPartyFilters.length > 0) {
        const matchesParty = politician.party
          ? selectedPartyFilters.includes(politician.party)
          : false;
        if (!matchesParty) return false;
      }

      // Check position filters (if any selected, must match one)
      if (selectedPositionFilters.length > 0) {
        const positionValue = politician.position || politician.office || "";
        const matchesPosition = selectedPositionFilters.some((filter) => {
          if (filter === "Senate") {
            return positionValue.includes("Senator");
          }
          if (filter === "House") {
            return positionValue.includes("Representative");
          }
          return false;
        });
        if (!matchesPosition) return false;
      }

      // Politician matches all non-empty filter groups
      return true;
    });
  }, [activeFilters, politicians]);

  const sortedPoliticians = useMemo(() => {
    const sorted = [...filteredPoliticians];

    switch (sortBy) {
      case "name":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case "votes":
        return sorted.sort(
          (a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0)
        );
      case "statements":
        return sorted.sort(
          (a, b) => (b.statement_count ?? 0) - (a.statement_count ?? 0)
        );
      case "relevance":
      default:
        return sorted; // Keep original order for relevance
    }
  }, [filteredPoliticians, sortBy]);

  const handleSearch = (query: string, zip: string) => {
    const trimmedQuery = query.trim();
    const trimmedZip = zip.trim();
    const params = new URLSearchParams();

    if (trimmedQuery) params.set("q", trimmedQuery);
    if (trimmedZip) params.set("zip", trimmedZip);

    const nextPath = params.toString()
      ? `/search?${params.toString()}`
      : "/search";
    router.push(nextPath);
    performSearch(trimmedQuery, trimmedZip);
  };

  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter]
    );
  };

  return (
    <div className="min-h-screen">
      {/* Search Header */}
      <section className="py-8 bg-card border-b border-border">
        <div className="container">
          <h1 className="font-serif text-3xl font-bold text-foreground mb-6">
            Search Politicians
          </h1>
          <SearchBarNew
            variant="hero"
            onSearch={handleSearch}
            defaultQuery={initialQuery}
            defaultZip={initialZip}
          />
        </div>
      </section>

      {/* Filters & Results */}
      <section className="py-8">
        <div className="container">
          {/* Filter Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground mr-2">
                <Filter className="h-4 w-4 inline mr-1" />
                Filter by:
              </span>
              {["Senate", "House", "Democrat", "Republican", "Independent"].map(
                (filter) => (
                  <Badge
                    key={filter}
                    variant={
                      activeFilters.includes(filter) ? "default" : "outline"
                    }
                    className="cursor-pointer transition-colors"
                    onClick={() => toggleFilter(filter)}
                  >
                    {filter}
                  </Badge>
                )
              )}
            </div>

            <div className="flex items-center gap-4">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="votes">Most Votes</SelectItem>
                  <SelectItem value="statements">Most Statements</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex border border-border rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-none"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Results Count */}
          {hasSearched && (
            <p className="text-sm text-muted-foreground mb-6">
              Showing{" "}
              <span className="font-semibold text-foreground">
                {sortedPoliticians.length}
              </span>{" "}
              politicians
              {initialQuery && (
                <>
                  {" "}
                  for &quot;
                  <span className="font-semibold text-foreground">
                    {initialQuery}
                  </span>
                  &quot;
                </>
              )}
            </p>
          )}

          {/* Results Grid */}
          {isLoading && (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          )}
          {!isLoading && error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center text-red-800">
              {error}
            </div>
          )}
          {!isLoading && !error && hasSearched && sortedPoliticians.length === 0 && (
            <div className="bg-card border border-border rounded-lg p-6 text-center text-muted-foreground">
              No politicians found. Try a different name or ZIP code.
            </div>
          )}
          {!isLoading && !error && sortedPoliticians.length > 0 && (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "flex flex-col gap-4"
              }
            >
              {sortedPoliticians.map((politician) => (
                <PoliticianCardNew
                  key={politician.id}
                  id={politician.id}
                  name={politician.name}
                  party={politician.party || "Unknown"}
                  state={
                    politician.state ||
                    politician.state_code ||
                    politician.state_or_district ||
                    "N/A"
                  }
                  position={politician.position || politician.office || "Unknown"}
                  image={politician.image_url || politician.photo_url}
                  verifiedVotes={politician.vote_count ?? 0}
                  verifiedStatements={politician.statement_count ?? 0}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center">Loading...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}
