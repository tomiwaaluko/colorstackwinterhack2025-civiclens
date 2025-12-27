"use client";

import { useState, FormEvent } from "react";
import type { AIResponse, Citation } from "@/lib/types";
import { askQuestion } from "@/lib/api";
import ClaimCard from "./ClaimCard";
import Citations from "./Citations";
import LoadingSpinner from "./LoadingSpinner";
import SourceDrawer from "./SourceDrawer";

interface AskPanelProps {
  politicianIds?: string[];
}

export default function AskPanel({ politicianIds }: AskPanelProps) {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(
    null
  );
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
      setError(err.message || "Failed to get answer");
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
    <div className="space-y-8">
      {/* Question Input */}
      <div className="rounded-xl bg-ink-900 p-6 text-white shadow-lg">
        <h2 className="headline-sm mb-4 text-white">Ask CivicLens AI</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="question" className="sr-only">
              Ask a Question
            </label>
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., What is this politician's stance on healthcare?"
              rows={3}
              className="w-full rounded-lg border-0 bg-white/10 px-4 py-3 text-white placeholder-white/50 ring-1 ring-white/20 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500"
              disabled={isLoading}
            />
            <p className="mt-2 text-xs text-white/60">
              Ask evidence-based questions. The system will only answer from
              available sources.
            </p>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              className="rounded-lg bg-amber-500 px-6 py-2.5 font-medium text-ink-900 transition-colors hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-ink-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Analyzing..." : "Ask Question"}
            </button>
          </div>
        </form>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Response */}
      {response && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Answer */}
          <div className="bg-card border-2 border-black p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="headline-sm mb-4 text-ink-900">Analysis</h2>
            <div className="prose prose-ink max-w-none">
              <p className="text-lg leading-relaxed text-ink-800">
                {response.answer}
              </p>
            </div>
          </div>

          {/* Claims */}
          {response.claims && response.claims.length > 0 && (
            <div>
              <h3 className="headline-sm mb-6 text-ink-900">
                Key Claims & Evidence
              </h3>
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

          {/* Limitations & Disclosure */}
          <div className="grid gap-4 sm:grid-cols-2">
            {response.limitations && (
              <div className="bg-amber-50 border-2 border-black p-4 text-sm text-amber-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="font-semibold mb-1">Limitations</h3>
                <p>{response.limitations}</p>
              </div>
            )}
            {response.disclosure && (
              <div className="bg-ink-50 border-2 border-black p-4 text-sm text-ink-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="font-semibold mb-1">Disclosure</h3>
                <p>{response.disclosure}</p>
              </div>
            )}
          </div>
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
