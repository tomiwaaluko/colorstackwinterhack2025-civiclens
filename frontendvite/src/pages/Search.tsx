import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SearchBar } from "@/components/SearchBar";
import { PoliticianCard } from "@/components/PoliticianCard";
import { Filter, Grid, List, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const mockPoliticians = [
  {
    id: "1",
    name: "Alexandria Ocasio-Cortez",
    party: "Democrat",
    state: "NY-14",
    position: "U.S. Representative",
    verifiedVotes: 1247,
    verifiedStatements: 892,
    featured: true,
  },
  {
    id: "2",
    name: "Marco Rubio",
    party: "Republican",
    state: "Florida",
    position: "U.S. Senator",
    verifiedVotes: 2156,
    verifiedStatements: 1423,
  },
  {
    id: "3",
    name: "Elizabeth Warren",
    party: "Democrat",
    state: "Massachusetts",
    position: "U.S. Senator",
    verifiedVotes: 2847,
    verifiedStatements: 1876,
  },
  {
    id: "4",
    name: "Ted Cruz",
    party: "Republican",
    state: "Texas",
    position: "U.S. Senator",
    verifiedVotes: 2534,
    verifiedStatements: 1654,
  },
  {
    id: "5",
    name: "Bernie Sanders",
    party: "Independent",
    state: "Vermont",
    position: "U.S. Senator",
    verifiedVotes: 3421,
    verifiedStatements: 2145,
  },
  {
    id: "6",
    name: "Mitt Romney",
    party: "Republican",
    state: "Utah",
    position: "U.S. Senator",
    verifiedVotes: 1876,
    verifiedStatements: 987,
  },
];

export default function Search() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("relevance");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const handleSearch = (query: string, zip: string) => {
    console.log("Searching:", query, zip);
  };

  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter]
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Search Header */}
        <section className="py-8 bg-card border-b border-border">
          <div className="container">
            <h1 className="font-serif text-3xl font-bold text-foreground mb-6">
              Search Politicians
            </h1>
            <SearchBar variant="hero" onSearch={handleSearch} />
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
                      variant={activeFilters.includes(filter) ? "default" : "outline"}
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
            <p className="text-sm text-muted-foreground mb-6">
              Showing <span className="font-semibold text-foreground">6</span> politicians
              {initialQuery && (
                <>
                  {" "}for "<span className="font-semibold text-foreground">{initialQuery}</span>"
                </>
              )}
            </p>

            {/* Results Grid */}
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "flex flex-col gap-4"
              }
            >
              {mockPoliticians.map((politician) => (
                <PoliticianCard key={politician.id} {...politician} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
