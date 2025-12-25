import type { Citation } from '@/lib/types';
import SourceLink from './SourceLink';

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
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Citations ({citations.length})
      </h3>
      <div className="space-y-3">
        {citations.map((citation, idx) => (
          <div
            key={citation.source_id || idx}
            className="flex items-start justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0"
          >
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900 mb-1">
                {citation.title}
              </h4>
              <p className="text-xs text-gray-600 mb-2">{citation.publisher}</p>
              {citation.snippet && (
                <p className="text-xs text-gray-500 italic line-clamp-2">
                  "{citation.snippet}"
                </p>
              )}
            </div>
            <div className="ml-4 flex gap-2">
              {onCitationClick ? (
                <button
                  onClick={() => onCitationClick(citation)}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap"
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

