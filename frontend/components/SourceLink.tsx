'use client';

import type { Citation } from '@/lib/types';

interface SourceLinkProps {
  citation: Citation;
  className?: string;
  onClick?: (citation: Citation) => void;
}

export default function SourceLink({
  citation,
  className = '',
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
      className={`inline-flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline ${className}`}
      title={`Source: ${citation.title} - ${citation.publisher}`}
    >
      <svg
        className="mr-1 h-4 w-4"
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
  label?: string;
  onCitationClick?: (citation: Citation) => void;
}

export function ViewSourcesButton({
  citations,
  label = 'View sources',
  onCitationClick,
}: ViewSourcesButtonProps) {
  if (citations.length === 0) {
    return null;
  }

  const handleClick = () => {
    if (onCitationClick && citations[0]) {
      onCitationClick(citations[0]);
    } else if (citations[0]?.url) {
      window.open(citations[0].url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="mt-4">
      <button
        className="text-sm font-medium text-blue-600 hover:text-blue-800"
        onClick={handleClick}
      >
        {label} ({citations.length})
      </button>
    </div>
  );
}

