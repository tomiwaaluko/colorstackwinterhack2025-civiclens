import type { Statement, Citation } from '@/lib/types';
import SourceLink from './SourceLink';
import { ViewSourcesButton } from './SourceLink';
import InsufficientData from './InsufficientData';

interface StatementsListProps {
  statements: Statement[];
  onCitationClick?: (citation: Citation) => void;
}

export default function StatementsList({
  statements,
  onCitationClick,
}: StatementsListProps) {
  if (statements.length === 0) {
    return (
      <InsufficientData
        title="No statements available"
        message="Public statements for this politician are not available at this time."
      />
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Collect all citations
  const allCitations = statements.flatMap((statement) => statement.citations || []);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Statements & Quotes</h2>
        {allCitations.length > 0 && (
          <ViewSourcesButton
            citations={allCitations}
            onCitationClick={onCitationClick}
          />
        )}
      </div>
      <div className="space-y-4">
        {statements.map((statement) => (
          <div
            key={statement.id}
            className="rounded-lg border border-gray-200 bg-white p-6"
          >
            <blockquote className="text-gray-700 italic">
              "{statement.text}"
            </blockquote>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
              {statement.date && (
                <span>{formatDate(statement.date)}</span>
              )}
              {statement.source_type && (
                <span className="rounded-full bg-gray-100 px-3 py-1">
                  {statement.source_type}
                </span>
              )}
            </div>
            {statement.citations && statement.citations.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {statement.citations.map((citation, idx) => (
                  <SourceLink
                    key={idx}
                    citation={citation}
                    onClick={onCitationClick}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

