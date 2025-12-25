"use client";

import { useState } from "react";
import SearchBar from "@/components/SearchBar";
import SearchResults from "@/components/SearchResults";
import { searchPoliticians } from "@/lib/api";
import type { Politician, ApiError } from "@/lib/types";

export default function Home() {
  const [politicians, setPoliticians] = useState<Politician[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleSearch = async (name: string, zip?: string) => {
    setIsLoading(true);
    setError(undefined);
    setHasSearched(true);

    try {
      const result = await searchPoliticians(name, zip);
      setPoliticians(result.politicians || []);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || "An error occurred while searching");
      setPoliticians([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col">
      {/* Hero Section */}
      <section
        className={`relative transition-all duration-500 ${
          hasSearched ? "py-12" : "py-32 flex-grow flex flex-col justify-center"
        }`}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-[radial-gradient(circle_at_center,var(--ink-50)_0%,transparent_70%)]" />
          <div className="absolute top-20 right-20 w-64 h-64 bg-[var(--amber-100)] rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-[var(--ink-100)] rounded-full blur-3xl opacity-50" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center z-10">
          {!hasSearched && (
            <div className="mb-12 animate-fade-in-up">
              <span className="label mb-4 block text-[var(--amber-600)]">
                Transparency First
              </span>
              <h1 className="headline-xl mb-6 text-[var(--ink-900)]">
                Evidence-Based <br />
                <span className="italic text-[var(--ink-600)]">
                  Political Insight
                </span>
              </h1>
              <p className="body-lg text-[var(--ink-600)] max-w-2xl mx-auto">
                Search for politicians to view verified voting records, donor
                history, and public statements. No rankings, no opinions—just
                the facts.
              </p>
            </div>
          )}

          <div
            className={`transition-all duration-500 ${
              hasSearched ? "scale-95" : "scale-100"
            }`}
          >
            <SearchBar onSearch={handleSearch} isLoading={isLoading} />
          </div>

          {!hasSearched && (
            <div
              className="mt-12 grid grid-cols-3 gap-8 max-w-2xl mx-auto text-center animate-fade-in-up"
              style={{ animationDelay: "0.2s" }}
            >
              <div>
                <div className="text-2xl mb-2">🏛️</div>
                <div className="font-serif font-semibold text-[var(--ink-900)]">
                  Official Records
                </div>
                <div className="text-sm text-[var(--ink-500)]">
                  Voting & Legislation
                </div>
              </div>
              <div>
                <div className="text-2xl mb-2">💰</div>
                <div className="font-serif font-semibold text-[var(--ink-900)]">
                  Donor Data
                </div>
                <div className="text-sm text-[var(--ink-500)]">
                  Campaign Finance
                </div>
              </div>
              <div>
                <div className="text-2xl mb-2">📝</div>
                <div className="font-serif font-semibold text-[var(--ink-900)]">
                  Citations
                </div>
                <div className="text-sm text-[var(--ink-500)]">
                  Always Verified
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Results Section */}
      {(hasSearched || isLoading) && (
        <section className="flex-grow bg-[var(--surface-highlight)] border-t border-[var(--ink-100)]">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <SearchResults
              politicians={politicians}
              isLoading={isLoading}
              hasSearched={hasSearched}
              error={error}
            />
          </div>
        </section>
      )}
    </div>
  );
}
