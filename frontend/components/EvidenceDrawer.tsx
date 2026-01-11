"use client";

import { useEffect, useRef, useState } from "react";
import type { Citation, VisualizationCitation } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ExternalLink, 
  X, 
  FileText, 
  Calendar, 
  Quote,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from "lucide-react";

// Unified citation type that works with both Citation and VisualizationCitation
export interface UnifiedCitation {
  source_id: string | number;
  url: string;
  title: string;
  publisher: string;
  retrieved_at?: string;
  snippet?: string;
  source_type?: string;
}

// Convert VisualizationCitation to UnifiedCitation
export function toUnifiedCitation(citation: VisualizationCitation | Citation): UnifiedCitation {
  if ("source_url" in citation) {
    // VisualizationCitation
    return {
      source_id: citation.source_id,
      url: citation.source_url,
      title: citation.title,
      publisher: citation.publisher,
      retrieved_at: citation.retrieved_at,
      source_type: (citation as any).source_type,
    };
  }
  // Citation
  return {
    source_id: citation.source_id,
    url: citation.url,
    title: citation.title,
    publisher: citation.publisher,
    retrieved_at: citation.retrieved_at,
    snippet: citation.snippet,
  };
}

interface EvidenceDrawerProps {
  citations: UnifiedCitation[];
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

export default function EvidenceDrawer({
  citations,
  isOpen,
  onClose,
  title = "Source Evidence",
  subtitle,
}: EvidenceDrawerProps) {
  const previousOverflowRef = useRef<string>("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset selected index when citations change
  useEffect(() => {
    setSelectedIndex(0);
  }, [citations]);

  useEffect(() => {
    if (isOpen) {
      previousOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = previousOverflowRef.current;
    }
    return () => {
      document.body.style.overflow = previousOverflowRef.current;
    };
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && selectedIndex > 0) {
        setSelectedIndex(selectedIndex - 1);
      } else if (e.key === "ArrowRight" && selectedIndex < citations.length - 1) {
        setSelectedIndex(selectedIndex + 1);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, citations.length, onClose]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown date";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Unknown date";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isValidUrl = (urlString?: string): boolean => {
    if (!urlString) return false;
    try {
      const url = new URL(urlString);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  };

  const getSourceTypeLabel = (sourceType?: string): string => {
    const labels: Record<string, string> = {
      congressional_record: "Congressional Record",
      fec_filing: "FEC Filing",
      news_article: "News Article",
      press_release: "Press Release",
      official_statement: "Official Statement",
    };
    return labels[sourceType || ""] || "Document";
  };

  const getSourceTypeColor = (sourceType?: string): string => {
    const colors: Record<string, string> = {
      congressional_record: "bg-blue-100 text-blue-800",
      fec_filing: "bg-green-100 text-green-800",
      news_article: "bg-amber-100 text-amber-800",
      press_release: "bg-purple-100 text-purple-800",
      official_statement: "bg-pink-100 text-pink-800",
    };
    return colors[sourceType || ""] || "bg-gray-100 text-gray-800";
  };

  const selectedCitation = citations[selectedIndex];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen && citations.length > 0 ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-lg transform bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen && citations.length > 0 ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4 bg-gray-50">
            <div>
              <h2 id="drawer-title" className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {title}
              </h2>
              {subtitle && (
                <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
              aria-label="Close drawer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Citation Count & Navigation */}
          {citations.length > 1 && (
            <div className="flex items-center justify-between px-6 py-3 bg-blue-50 border-b">
              <span className="text-sm font-medium text-blue-800">
                {citations.length} sources found
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
                  disabled={selectedIndex === 0}
                  aria-label="Previous source"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[60px] text-center">
                  {selectedIndex + 1} of {citations.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIndex(Math.min(citations.length - 1, selectedIndex + 1))}
                  disabled={selectedIndex === citations.length - 1}
                  aria-label="Next source"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Content */}
          {selectedCitation && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Source Type Badge */}
                {selectedCitation.source_type && (
                  <Badge className={getSourceTypeColor(selectedCitation.source_type)}>
                    {getSourceTypeLabel(selectedCitation.source_type)}
                  </Badge>
                )}

                {/* Title */}
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Title
                  </h3>
                  <p className="mt-2 text-lg font-medium text-gray-900">
                    {selectedCitation.title}
                  </p>
                </div>

                {/* Publisher */}
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                    Publisher
                  </h3>
                  <p className="mt-1 text-gray-900">{selectedCitation.publisher}</p>
                </div>

                {/* Date */}
                {selectedCitation.retrieved_at && (
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Retrieved Date
                    </h3>
                    <p className="mt-1 text-gray-900">
                      {formatDate(selectedCitation.retrieved_at)}
                    </p>
                  </div>
                )}

                {/* Snippet/Excerpt */}
                {selectedCitation.snippet && (
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                      <Quote className="h-4 w-4" />
                      Relevant Excerpt
                    </h3>
                    <blockquote className="mt-2 border-l-4 border-amber-500 bg-amber-50 p-4 italic text-gray-700 rounded-r">
                      &quot;{selectedCitation.snippet}&quot;
                    </blockquote>
                  </div>
                )}

                {/* Source ID */}
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                    Source ID
                  </h3>
                  <p className="mt-1 text-gray-600 font-mono text-sm">
                    {selectedCitation.source_id}
                  </p>
                </div>

                {/* Visit Source Button */}
                <div className="pt-4">
                  {isValidUrl(selectedCitation.url) ? (
                    <a
                      href={selectedCitation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 bg-gray-900 text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                    >
                      Visit Original Source
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : (
                    <button
                      disabled
                      className="flex w-full items-center justify-center gap-2 bg-gray-200 text-gray-500 px-4 py-3 rounded-lg font-medium cursor-not-allowed"
                    >
                      Source URL Unavailable
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Citation List (for multiple citations) */}
          {citations.length > 1 && (
            <div className="border-t bg-gray-50 px-6 py-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">All Sources</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {citations.map((citation, idx) => (
                  <button
                    key={`${citation.source_id}-${idx}`}
                    onClick={() => setSelectedIndex(idx)}
                    className={`w-full text-left p-2 rounded text-sm transition-colors ${
                      idx === selectedIndex
                        ? "bg-blue-100 border border-blue-300"
                        : "hover:bg-gray-100 border border-transparent"
                    }`}
                  >
                    <div className="font-medium truncate">{citation.title}</div>
                    <div className="text-gray-500 text-xs">{citation.publisher}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
