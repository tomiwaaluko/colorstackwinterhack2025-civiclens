import type { Claim, Citation } from "@/lib/types";

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
    <div className="group rounded-lg border border-ink-100 bg-white p-5 transition-all hover:border-ink-300 hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-800">
          {index + 1}
        </div>
        <div className="flex-1">
          <p className="text-lg font-medium text-ink-900 mb-3">{claim.text}</p>

          {claim.confidence !== undefined && (
            <div className="mb-4 flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Confidence
              </span>
              <div className="h-1.5 w-24 rounded-full bg-ink-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-ink-900"
                  style={{ width: `${claim.confidence * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-ink-600">
                {Math.round(claim.confidence * 100)}%
              </span>
            </div>
          )}

          {claimCitations.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {claimCitations.map((citation, idx) => (
                <button
                  key={idx}
                  onClick={() => onCitationClick?.(citation)}
                  className="inline-flex items-center rounded border border-ink-200 bg-ink-50 px-2 py-1 text-xs font-medium text-ink-600 transition-colors hover:bg-white hover:text-amber-700 hover:border-amber-300"
                >
                  Source {idx + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
