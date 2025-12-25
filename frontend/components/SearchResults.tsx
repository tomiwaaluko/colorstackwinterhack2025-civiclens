import type { Politician } from '@/lib/types';
import PoliticianCard from './PoliticianCard';
import LoadingSpinner from './LoadingSpinner';
import InsufficientData from './InsufficientData';

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
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (!hasSearched) {
    return (
      <div className="text-center text-gray-500">
        <p>Enter a name or ZIP code to search for politicians.</p>
      </div>
    );
  }

  if (politicians.length === 0) {
    return (
      <InsufficientData
        title="No politicians found"
        message="Try adjusting your search criteria."
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Found {politicians.length} result{politicians.length !== 1 ? 's' : ''}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {politicians.map((politician) => (
          <PoliticianCard key={politician.id} politician={politician} />
        ))}
      </div>
    </div>
  );
}

