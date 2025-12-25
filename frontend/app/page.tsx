'use client';

import { useState } from 'react';
import SearchBar from '@/components/SearchBar';
import SearchResults from '@/components/SearchResults';
import { searchPoliticians } from '@/lib/api';
import type { Politician, ApiError } from '@/lib/types';

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
      setError(apiError.message || 'An error occurred while searching');
      setPoliticians([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          CivicLens
        </h1>
        <p className="text-lg text-gray-600">
          Search for politicians and explore evidence-based information
        </p>
      </div>

      <div className="mb-8 flex justify-center">
        <SearchBar onSearch={handleSearch} isLoading={isLoading} />
      </div>

      <SearchResults
        politicians={politicians}
        isLoading={isLoading}
        hasSearched={hasSearched}
        error={error}
      />
    </div>
  );
}
