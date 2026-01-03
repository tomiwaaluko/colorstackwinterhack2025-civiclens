import type { Citation } from "@/lib/types";
import SourceLink from "./SourceLink";

interface CitationsProps {
  citations: Citation[];
  onCitationClick?: (citation: Citation) => void;
}

export default function Citations({
  citations,
  onCitationClick,
}: CitationsProps) {
  if (citations.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-6 shadow-sm">
      <h3 className="headline-sm mb-4 text-ink-900">
        Citations ({citations.length})
      </h3>
      <div className="space-y-4">
        {citations.map((citation, idx) => (
          <div
            key={citation.source_id || idx}
            className="flex items-start justify-between border-b border-ink-50 pb-4 last:border-0 last:pb-0"
          >
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-ink-900 mb-1">
                {citation.title}
              </h4>
              <p className="text-xs text-ink-500 mb-2">{citation.publisher}</p>
              {citation.snippet && (
                <p className="text-xs text-ink-600 italic line-clamp-2 border-l-2 border-amber-200 pl-2">
                  &quot;{citation.snippet}&quot;
                </p>
              )}
            </div>
            <div className="ml-4 flex gap-2">
              {onCitationClick ? (
                <button
                  onClick={() => onCitationClick(citation)}
                  className="text-xs font-medium text-amber-600 hover:text-amber-700 hover:underline whitespace-nowrap"
                >
                  View Details
                </button>
              ) : (
                <SourceLink citation={citation} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
