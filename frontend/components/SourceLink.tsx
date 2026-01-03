"use client";

import type { Citation } from "@/lib/types";

interface SourceLinkProps {
  citation: Citation;
  className?: string;
  onClick?: (citation: Citation) => void;
}

export default function SourceLink({
  citation,
  className = "",
  onClick,
}: SourceLinkProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick(citation);
    }
  };

  return (
    <a
      href={citation.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={`inline-flex items-center gap-1 rounded-full bg-ink-50 px-3 py-1 text-xs font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 ${className}`}
      title={`Source: ${citation.title} - ${citation.publisher}`}
    >
      <svg
        className="h-3 w-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
        />
      </svg>
      <span>Source</span>
    </a>
  );
}

interface ViewSourcesButtonProps {
  citations: Citation[];
  onCitationClick?: (citation: Citation) => void;
}

export function ViewSourcesButton({
  citations,
  onCitationClick,
}: ViewSourcesButtonProps) {
  const hasCitations = citations && citations.length > 0;
  const citationCount = citations?.length ?? 0;

  const handleClick = () => {
    if (hasCitations && onCitationClick && citations[0]) {
      onCitationClick(citations[0]);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={!hasCitations}
      aria-disabled={!hasCitations}
      className={`text-sm font-medium transition-colors ${
        hasCitations
          ? "text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
          : "text-muted-foreground cursor-not-allowed opacity-50"
      }`}
      aria-label={
        hasCitations
          ? `View ${citationCount} citation${citationCount !== 1 ? "s" : ""}`
          : "No citations available"
      }
    >
      View {citationCount} Source{citationCount !== 1 ? "s" : ""}
    </button>
  );
}
