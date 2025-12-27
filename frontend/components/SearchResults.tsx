import type { Politician } from "@/lib/types";
import PoliticianCard from "./PoliticianCard";
import LoadingSpinner from "./LoadingSpinner";
import InsufficientData from "./InsufficientData";

interface SearchResultsProps {
  politicians: Politician[];
  isLoading: boolean;
  hasSearched: boolean;
  error?: string;
}

export default function SearchResults({
  politicians,
  isLoading,
  hasSearched,
  error,
}: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-black p-6 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <p className="text-red-800 font-medium">{error}</p>
      </div>
    );
  }

  if (!hasSearched) {
    return null;
  }

  if (politicians.length === 0) {
    return (
      <div className="max-w-md mx-auto">
        <InsufficientData
          title="No politicians found"
          message="We couldn't find any politicians matching your search. Try checking the spelling or using a different ZIP code."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--ink-200)] pb-4">
        <h2 className="headline-sm text-[var(--ink-900)]">Search Results</h2>
        <span className="label text-[var(--ink-500)]">
          {politicians.length} Found
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {politicians.map((politician, index) => (
          <div
            key={politician.id}
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <PoliticianCard politician={politician} />
          </div>
        ))}
      </div>
    </div>
  );
}
