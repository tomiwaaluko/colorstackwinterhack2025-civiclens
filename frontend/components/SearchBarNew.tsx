"use client";

import { Search, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface SearchBarNewProps {
  variant?: "hero" | "compact";
  onSearch?: (query: string, zip: string) => void;
}

export function SearchBarNew({
  variant = "hero",
  onSearch,
}: SearchBarNewProps) {
  const [query, setQuery] = useState("");
  const [zip, setZip] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(query, zip);
  };

  if (variant === "compact") {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <label htmlFor="compact-search-input" className="sr-only">
            Search for politician
          </label>
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="compact-search-input"
            type="text"
            placeholder="Search politician..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="bg-card rounded-xl shadow-lg border border-border p-2">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <label htmlFor="hero-search-input" className="sr-only">
              Search for politician by name
            </label>
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="hero-search-input"
              type="text"
              placeholder="Search by politician name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-12 h-12 text-base border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <div className="hidden md:block w-px bg-border" />
          <div className="relative md:w-40">
            <label htmlFor="hero-zip-input" className="sr-only">
              ZIP Code
            </label>
            <MapPin
              className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="hero-zip-input"
              type="text"
              placeholder="ZIP Code"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={5}
              className="pl-12 h-12 text-base border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <Button type="submit" size="lg" className="h-12 px-8 text-base">
            <Search className="h-5 w-5 mr-2" aria-hidden="true" />
            Search
          </Button>
        </div>
      </div>
    </form>
  );
}
