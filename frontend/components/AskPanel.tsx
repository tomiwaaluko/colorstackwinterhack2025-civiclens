'use client';

import { useState, FormEvent } from 'react';
import type { AIResponse, Citation } from '@/lib/types';
import { askQuestion } from '@/lib/api';
import ClaimCard from './ClaimCard';
import Citations from './Citations';
import LoadingSpinner from './LoadingSpinner';
import InsufficientData from './InsufficientData';
import SourceDrawer from './SourceDrawer';

interface AskPanelProps {
  politicianIds?: string[];
}

export default function AskPanel({ politicianIds }: AskPanelProps) {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await askQuestion({
        question: question.trim(),
        politician_ids: politicianIds,
      });
      setResponse(result);
    } catch (err: any) {
      setError(err.message || 'Failed to get answer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCitationClick = (citation: Citation) => {
    setSelectedCitation(citation);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedCitation(null);
  };

  return (
    <div className="space-y-6">
      {/* Question Input */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="question"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Ask a Question
          </label>
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., What is this politician's stance on healthcare?"
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <p className="mt-2 text-xs text-gray-500">
            Ask evidence-based questions. The system will only answer from available sources.
          </p>
        </div>
        <button
          type="submit"
          disabled={isLoading || !question.trim()}
          className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Asking...' : 'Ask Question'}
        </button>
      </form>

      {/* Loading State */}
      {isLoading && <LoadingSpinner />}

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Response */}
      {response && (
        <div className="space-y-6">
          {/* Answer */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Answer
            </h2>
            <p className="text-gray-700 leading-relaxed">{response.answer}</p>
          </div>

          {/* Claims */}
          {response.claims && response.claims.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Supporting Evidence
              </h2>
              <div className="space-y-4">
                {response.claims.map((claim, idx) => (
                  <ClaimCard
                    key={idx}
                    claim={claim}
                    citations={response.citations}
                    index={idx}
                    onCitationClick={handleCitationClick}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Citations */}
          {response.citations && response.citations.length > 0 && (
            <Citations
              citations={response.citations}
              onCitationClick={handleCitationClick}
            />
          )}

          {/* Limitations */}
          {response.limitations && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h3 className="text-sm font-semibold text-amber-900 mb-2">
                Limitations
              </h3>
              <p className="text-sm text-amber-800">{response.limitations}</p>
            </div>
          )}

          {/* Disclosure */}
          {response.disclosure && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">
                Disclosure
              </h3>
              <p className="text-sm text-blue-800">{response.disclosure}</p>
            </div>
          )}
        </div>
      )}

      {/* Source Drawer */}
      <SourceDrawer
        citation={selectedCitation}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}

