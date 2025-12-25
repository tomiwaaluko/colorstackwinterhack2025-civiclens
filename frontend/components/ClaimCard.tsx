import type { Claim, Citation } from '@/lib/types';
import SourceLink from './SourceLink';

interface ClaimCardProps {
  claim: Claim;
  citations: Citation[];
  index: number;
  onCitationClick?: (citation: Citation) => void;
}

export default function ClaimCard({
  claim,
  citations,
  index,
  onCitationClick,
}: ClaimCardProps) {
  // Get citations for this claim by matching IDs
  const claimCitations = citations.filter((c) =>
    claim.citations.includes(c.source_id)
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
          {index + 1}
        </div>
        <div className="flex-1">
          <p className="text-gray-900 mb-3">{claim.text}</p>
          {claim.confidence !== undefined && (
            <div className="mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600">
                  Confidence:
                </span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${claim.confidence * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-600">
                  {Math.round(claim.confidence * 100)}%
                </span>
              </div>
            </div>
          )}
          {claimCitations.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-medium text-gray-600">Sources:</span>
              {claimCitations.map((citation, idx) => (
                <button
                  key={idx}
                  onClick={() => onCitationClick?.(citation)}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {citation.title || `Source ${idx + 1}`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

